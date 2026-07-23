use std::{fs::File, path::Path, time::UNIX_EPOCH};

use ebur128::{EbuR128, Mode};
use symphonia::core::{
    audio::sample::Sample,
    codecs::audio::AudioDecoderOptions,
    errors::Error as SymphoniaError,
    formats::{probe::Hint, FormatOptions, TrackType},
    io::MediaSourceStream,
    meta::MetadataOptions,
};

use crate::{
    errors::{AppError, AppResult},
    models::AudioAnalysis,
    repositories::AudioAnalysisRepository,
    services::{audio_features::AudioFeatureCollector, ProjectFileService},
    state::AppState,
};

const ANALYSIS_VERSION: i64 = 2;
const WAVEFORM_POINTS: usize = 128;

pub struct AudioAnalysisService;

impl AudioAnalysisService {
    pub async fn analyze(
        state: &AppState,
        project_id: i64,
        file_id: i64,
    ) -> AppResult<AudioAnalysis> {
        let path = ProjectFileService::audio_path(state, project_id, file_id)?;
        let metadata = path.metadata().map_err(AppError::FileOperation)?;
        let source_size = i64::try_from(metadata.len()).unwrap_or(i64::MAX);
        let source_modified_ns = metadata
            .modified()
            .ok()
            .and_then(|value| value.duration_since(UNIX_EPOCH).ok())
            .map(|value| i64::try_from(value.as_nanos()).unwrap_or(i64::MAX))
            .unwrap_or_default();

        {
            let connection = state.database().connection()?;
            if let Some(cached) = AudioAnalysisRepository::get(&connection, file_id)? {
                if cached.source_size == source_size
                    && cached.source_modified_ns == source_modified_ns
                    && cached.analysis_version == ANALYSIS_VERSION
                {
                    AudioAnalysisRepository::assign_project_metadata(
                        &connection,
                        project_id,
                        &cached.analysis,
                    )?;
                    return Ok(cached.analysis);
                }
            }
        }

        let analysis = tauri::async_runtime::spawn_blocking(move || analyze_file(&path, file_id))
            .await
            .map_err(|error| AppError::AudioAnalysis(error.to_string()))??;
        let connection = state.database().connection()?;
        AudioAnalysisRepository::save(
            &connection,
            &analysis,
            source_size,
            source_modified_ns,
            ANALYSIS_VERSION,
        )?;
        AudioAnalysisRepository::assign_project_metadata(&connection, project_id, &analysis)?;
        Ok(analysis)
    }
}

fn analyze_file(path: &Path, file_id: i64) -> AppResult<AudioAnalysis> {
    let source = Box::new(File::open(path).map_err(AppError::FileOperation)?);
    let stream = MediaSourceStream::new(source, Default::default());
    let mut hint = Hint::new();
    if let Some(extension) = path.extension().and_then(|value| value.to_str()) {
        hint.with_extension(extension);
    }
    let mut format = symphonia::default::get_probe()
        .probe(
            &hint,
            stream,
            FormatOptions::default(),
            MetadataOptions::default(),
        )
        .map_err(audio_error)?;
    let track = format.default_track(TrackType::Audio).ok_or_else(|| {
        AppError::AudioAnalysis("el archivo no contiene una pista de audio".into())
    })?;
    let track_id = track.id;
    let parameters = track
        .codec_params
        .as_ref()
        .and_then(|value| value.audio())
        .ok_or_else(|| AppError::AudioAnalysis("parámetros de audio no disponibles".into()))?
        .clone();
    let sample_rate = parameters
        .sample_rate
        .ok_or_else(|| AppError::AudioAnalysis("sample rate no disponible".into()))?;
    let channels = parameters
        .channels
        .as_ref()
        .map(|value| value.count() as u32)
        .ok_or_else(|| AppError::AudioAnalysis("canales no disponibles".into()))?;
    let bit_depth = parameters.bits_per_sample;
    let mut decoder = symphonia::default::get_codecs()
        .make_audio_decoder(&parameters, &AudioDecoderOptions::default())
        .map_err(audio_error)?;
    let mut loudness = EbuR128::new(channels, sample_rate, Mode::I | Mode::LRA | Mode::TRUE_PEAK)
        .map_err(|error| AppError::AudioAnalysis(error.to_string()))?;
    let mut sample_count = 0_u64;
    let mut packet_peaks = Vec::new();
    let mut features = AudioFeatureCollector::new(sample_rate, channels as usize);

    loop {
        let packet = match format.next_packet() {
            Ok(Some(packet)) => packet,
            Ok(None) => break,
            Err(error) => return Err(audio_error(error)),
        };
        if packet.track_id != track_id {
            continue;
        }
        let decoded = match decoder.decode(&packet) {
            Ok(decoded) => decoded,
            Err(SymphoniaError::DecodeError(_)) => continue,
            Err(error) => return Err(audio_error(error)),
        };
        let mut samples = vec![f32::MID; decoded.samples_interleaved()];
        decoded.copy_to_slice_interleaved(&mut samples);
        loudness
            .add_frames_f32(&samples)
            .map_err(|error| AppError::AudioAnalysis(error.to_string()))?;
        features.append_interleaved(&samples);
        sample_count = sample_count.saturating_add((samples.len() / channels as usize) as u64);
        packet_peaks.push(
            samples
                .iter()
                .fold(0.0_f32, |peak, sample| peak.max(sample.abs())),
        );
    }

    if sample_count == 0 {
        return Err(AppError::AudioAnalysis(
            "no se pudieron decodificar muestras".into(),
        ));
    }

    let integrated_lufs = finite(loudness.loudness_global().ok());
    let loudness_range_lu = finite(loudness.loudness_range().ok());
    let true_peak = (0..channels)
        .filter_map(|channel| loudness.true_peak(channel).ok())
        .fold(0.0_f64, f64::max);
    let true_peak_dbfs = if true_peak > 0.0 {
        Some(20.0 * true_peak.log10())
    } else {
        None
    };

    Ok(AudioAnalysis {
        file_id,
        duration_seconds: sample_count as f64 / sample_rate as f64,
        sample_rate,
        bit_depth,
        channels,
        integrated_lufs,
        loudness_range_lu,
        true_peak_dbfs,
        bpm: features.bpm(),
        musical_key: features.musical_key(),
        waveform: compact_waveform(&packet_peaks),
        analyzed_at: String::new(),
        from_cache: false,
    })
}

fn audio_error(error: SymphoniaError) -> AppError {
    AppError::AudioAnalysis(error.to_string())
}

fn finite(value: Option<f64>) -> Option<f64> {
    value.filter(|number| number.is_finite())
}

fn compact_waveform(peaks: &[f32]) -> Vec<f32> {
    if peaks.is_empty() {
        return Vec::new();
    }
    (0..WAVEFORM_POINTS.min(peaks.len()))
        .map(|index| {
            let count = WAVEFORM_POINTS.min(peaks.len());
            let start = index * peaks.len() / count;
            let end = ((index + 1) * peaks.len() / count).max(start + 1);
            peaks[start..end].iter().copied().fold(0.0_f32, f32::max)
        })
        .collect()
}

#[cfg(test)]
mod tests {
    use std::io::Write;

    use super::*;

    #[test]
    fn waveform_is_bounded_and_preserves_peaks() {
        let source = (0..400)
            .map(|index| index as f32 / 400.0)
            .collect::<Vec<_>>();
        let waveform = compact_waveform(&source);
        assert_eq!(waveform.len(), WAVEFORM_POINTS);
        assert!(waveform.last().copied().unwrap_or_default() > 0.99);
    }

    #[test]
    fn analyzes_pcm_wav_metadata_and_duration() {
        let sample_rate = 8_000_u32;
        let channels = 2_u16;
        let frames = sample_rate;
        let data_size = frames * u32::from(channels) * 2;
        let mut bytes = Vec::with_capacity((44 + data_size) as usize);
        bytes.extend_from_slice(b"RIFF");
        bytes.extend_from_slice(&(36 + data_size).to_le_bytes());
        bytes.extend_from_slice(b"WAVEfmt ");
        bytes.extend_from_slice(&16_u32.to_le_bytes());
        bytes.extend_from_slice(&1_u16.to_le_bytes());
        bytes.extend_from_slice(&channels.to_le_bytes());
        bytes.extend_from_slice(&sample_rate.to_le_bytes());
        bytes.extend_from_slice(&(sample_rate * u32::from(channels) * 2).to_le_bytes());
        bytes.extend_from_slice(&(channels * 2).to_le_bytes());
        bytes.extend_from_slice(&16_u16.to_le_bytes());
        bytes.extend_from_slice(b"data");
        bytes.extend_from_slice(&data_size.to_le_bytes());
        bytes.resize((44 + data_size) as usize, 0);
        let mut file = tempfile::NamedTempFile::new().expect("temp wav");
        file.write_all(&bytes).expect("write wav");

        let analysis = analyze_file(file.path(), 7).expect("analyze wav");
        assert_eq!(analysis.file_id, 7);
        assert_eq!(analysis.sample_rate, sample_rate);
        assert_eq!(analysis.bit_depth, Some(16));
        assert_eq!(analysis.channels, 2);
        assert!((analysis.duration_seconds - 1.0).abs() < 0.01);
        assert!(!analysis.waveform.is_empty());
    }
}
