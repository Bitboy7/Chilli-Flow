use rusqlite::{params, Connection, OptionalExtension};

use crate::{
    errors::AppResult,
    models::{AudioAnalysis, CachedAudioAnalysis},
};

pub struct AudioAnalysisRepository;

impl AudioAnalysisRepository {
    pub fn get(connection: &Connection, file_id: i64) -> AppResult<Option<CachedAudioAnalysis>> {
        connection
            .query_row(
                "SELECT source_size, source_modified_ns, analysis_version, duration_seconds,
                    sample_rate, bit_depth, channels, integrated_lufs, loudness_range_lu,
                    true_peak_dbfs, bpm, musical_key, waveform_json, analyzed_at
             FROM audio_analysis WHERE file_id = ?1",
                [file_id],
                |row| {
                    let waveform_json: String = row.get(12)?;
                    Ok(CachedAudioAnalysis {
                        analysis: AudioAnalysis {
                            file_id,
                            duration_seconds: row.get(3)?,
                            sample_rate: row.get(4)?,
                            bit_depth: row.get(5)?,
                            channels: row.get(6)?,
                            integrated_lufs: row.get(7)?,
                            loudness_range_lu: row.get(8)?,
                            true_peak_dbfs: row.get(9)?,
                            bpm: row.get(10)?,
                            musical_key: row.get(11)?,
                            waveform: serde_json::from_str(&waveform_json).unwrap_or_default(),
                            analyzed_at: row.get(13)?,
                            from_cache: true,
                        },
                        source_size: row.get(0)?,
                        source_modified_ns: row.get(1)?,
                        analysis_version: row.get(2)?,
                    })
                },
            )
            .optional()
            .map_err(Into::into)
    }

    pub fn save(
        connection: &Connection,
        analysis: &AudioAnalysis,
        source_size: i64,
        source_modified_ns: i64,
        analysis_version: i64,
    ) -> AppResult<()> {
        let waveform = serde_json::to_string(&analysis.waveform)?;
        connection.execute(
            "INSERT INTO audio_analysis
             (file_id, source_size, source_modified_ns, analysis_version, duration_seconds,
              sample_rate, bit_depth, channels, integrated_lufs, loudness_range_lu,
              true_peak_dbfs, bpm, musical_key, waveform_json)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13, ?14)
             ON CONFLICT(file_id) DO UPDATE SET
               source_size = excluded.source_size,
               source_modified_ns = excluded.source_modified_ns,
               analysis_version = excluded.analysis_version,
               duration_seconds = excluded.duration_seconds,
               sample_rate = excluded.sample_rate,
               bit_depth = excluded.bit_depth,
               channels = excluded.channels,
               integrated_lufs = excluded.integrated_lufs,
               loudness_range_lu = excluded.loudness_range_lu,
               true_peak_dbfs = excluded.true_peak_dbfs,
               bpm = excluded.bpm,
               musical_key = excluded.musical_key,
               waveform_json = excluded.waveform_json,
               analyzed_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')",
            params![
                analysis.file_id,
                source_size,
                source_modified_ns,
                analysis_version,
                analysis.duration_seconds,
                analysis.sample_rate,
                analysis.bit_depth,
                analysis.channels,
                analysis.integrated_lufs,
                analysis.loudness_range_lu,
                analysis.true_peak_dbfs,
                analysis.bpm,
                analysis.musical_key,
                waveform,
            ],
        )?;
        Ok(())
    }

    pub fn assign_project_metadata(
        connection: &Connection,
        project_id: i64,
        analysis: &AudioAnalysis,
    ) -> AppResult<()> {
        connection.execute(
            "UPDATE projects
             SET bpm = COALESCE(?1, bpm),
                 musical_key = COALESCE(?2, musical_key),
                 updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
             WHERE id = ?3",
            params![analysis.bpm, analysis.musical_key, project_id],
        )?;
        Ok(())
    }
}
