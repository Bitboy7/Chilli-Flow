CREATE TABLE audio_analysis (
    file_id INTEGER PRIMARY KEY REFERENCES project_files(id) ON DELETE CASCADE,
    source_size INTEGER NOT NULL,
    source_modified_ns INTEGER NOT NULL,
    analysis_version INTEGER NOT NULL,
    duration_seconds REAL NOT NULL,
    sample_rate INTEGER NOT NULL,
    bit_depth INTEGER,
    channels INTEGER NOT NULL,
    integrated_lufs REAL,
    loudness_range_lu REAL,
    true_peak_dbfs REAL,
    waveform_json TEXT NOT NULL,
    analyzed_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);
