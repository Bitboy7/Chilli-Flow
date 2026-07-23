use serde::Serialize;

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct AudioAnalysis {
    pub file_id: i64,
    pub duration_seconds: f64,
    pub sample_rate: u32,
    pub bit_depth: Option<u32>,
    pub channels: u32,
    pub integrated_lufs: Option<f64>,
    pub loudness_range_lu: Option<f64>,
    pub true_peak_dbfs: Option<f64>,
    pub bpm: Option<f64>,
    pub musical_key: Option<String>,
    pub waveform: Vec<f32>,
    pub analyzed_at: String,
    pub from_cache: bool,
}

pub struct CachedAudioAnalysis {
    pub analysis: AudioAnalysis,
    pub source_size: i64,
    pub source_modified_ns: i64,
    pub analysis_version: i64,
}
