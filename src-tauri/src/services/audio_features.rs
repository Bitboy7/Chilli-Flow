const FEATURE_SAMPLE_RATE: u32 = 11_025;
const MAX_FEATURE_SECONDS: usize = 600;

pub struct AudioFeatureCollector {
    source_rate: u32,
    sample_rate: u32,
    channels: usize,
    phase: u64,
    samples: Vec<f32>,
}

impl AudioFeatureCollector {
    pub fn new(source_rate: u32, channels: usize) -> Self {
        Self {
            source_rate,
            sample_rate: source_rate.min(FEATURE_SAMPLE_RATE),
            channels,
            phase: 0,
            samples: Vec::new(),
        }
    }

    pub fn append_interleaved(&mut self, samples: &[f32]) {
        let maximum_samples = self.sample_rate as usize * MAX_FEATURE_SECONDS;
        for frame in samples.chunks_exact(self.channels) {
            if self.samples.len() >= maximum_samples {
                break;
            }
            self.phase += u64::from(self.sample_rate);
            if self.phase < u64::from(self.source_rate) {
                continue;
            }
            self.phase -= u64::from(self.source_rate);
            self.samples
                .push(frame.iter().copied().sum::<f32>() / self.channels as f32);
        }
    }

    pub fn bpm(&self) -> Option<f64> {
        detect_bpm(&self.samples, self.sample_rate)
    }

    pub fn musical_key(&self) -> Option<String> {
        detect_musical_key(&self.samples, self.sample_rate)
    }
}

fn detect_bpm(samples: &[f32], sample_rate: u32) -> Option<f64> {
    let frame_size = (sample_rate as usize / 100).max(1);
    let mut energy = samples
        .chunks(frame_size)
        .filter(|frame| frame.len() == frame_size)
        .map(|frame| frame.iter().map(|sample| sample.abs()).sum::<f32>() / frame.len() as f32)
        .collect::<Vec<_>>();
    if energy.len() < 300 {
        return None;
    }

    let mean = energy.iter().copied().sum::<f32>() / energy.len() as f32;
    if mean < 1e-5 {
        return None;
    }
    for index in (1..energy.len()).rev() {
        energy[index] = (energy[index] - energy[index - 1]).max(0.0);
    }
    energy[0] = 0.0;
    if energy.iter().copied().fold(0.0_f32, f32::max) < 1e-5 {
        return None;
    }

    let frames_per_second = sample_rate as f64 / frame_size as f64;
    let mut best = None;
    let minimum_lag = (60.0 * frames_per_second / 200.0).ceil() as usize;
    let maximum_lag = (60.0 * frames_per_second / 60.0).floor() as usize;
    for lag in minimum_lag..=maximum_lag {
        if lag == 0 || lag * 3 >= energy.len() {
            continue;
        }
        let bpm = 60.0 * frames_per_second / lag as f64;
        let score = normalized_autocorrelation(&energy, lag)
            + 0.45 * normalized_autocorrelation(&energy, lag * 2)
            + 0.2 * normalized_autocorrelation(&energy, lag * 3);
        let weighted_score = score * (1.0 + bpm as f32 / 2_000.0);
        if best.map_or(true, |(_, best_score)| weighted_score > best_score) {
            best = Some((bpm, weighted_score));
        }
    }
    best.filter(|(_, score)| *score > 0.08)
        .map(|(bpm, _)| (bpm * 10.0).round() / 10.0)
}

fn normalized_autocorrelation(values: &[f32], lag: usize) -> f32 {
    let mut cross = 0.0_f64;
    let mut left = 0.0_f64;
    let mut right = 0.0_f64;
    for index in lag..values.len() {
        let a = f64::from(values[index]);
        let b = f64::from(values[index - lag]);
        cross += a * b;
        left += a * a;
        right += b * b;
    }
    if left <= f64::EPSILON || right <= f64::EPSILON {
        0.0
    } else {
        (cross / (left * right).sqrt()) as f32
    }
}

fn detect_musical_key(samples: &[f32], sample_rate: u32) -> Option<String> {
    const FRAME_SIZE: usize = 4096;
    const MAX_FRAMES: usize = 96;
    const KEY_NAMES: [&str; 12] = [
        "C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B",
    ];
    const MAJOR_PROFILE: [f64; 12] = [
        6.35, 2.23, 3.48, 2.33, 4.38, 4.09, 2.52, 5.19, 2.39, 3.66, 2.29, 2.88,
    ];
    const MINOR_PROFILE: [f64; 12] = [
        6.33, 2.68, 3.52, 5.38, 2.60, 3.53, 2.54, 4.75, 3.98, 2.69, 3.34, 3.17,
    ];

    if samples.len() < FRAME_SIZE {
        return None;
    }
    let available_frames = samples.len() / FRAME_SIZE;
    let frame_count = available_frames.min(MAX_FRAMES);
    let mut chroma = [0.0_f64; 12];
    for frame_index in 0..frame_count {
        let source_index = frame_index * available_frames / frame_count;
        let start = source_index * FRAME_SIZE;
        let frame = &samples[start..start + FRAME_SIZE];
        for midi_note in 36..=95 {
            let frequency = 440.0 * 2.0_f64.powf((midi_note as f64 - 69.0) / 12.0);
            if frequency >= sample_rate as f64 / 2.0 {
                continue;
            }
            chroma[midi_note as usize % 12] += goertzel_power(frame, sample_rate, frequency).sqrt();
        }
    }
    let total = chroma.iter().sum::<f64>();
    if !total.is_finite() || total < 1e-4 {
        return None;
    }
    for value in &mut chroma {
        *value /= total;
    }

    let mut best_root = 0;
    let mut best_minor = false;
    let mut best_score = f64::NEG_INFINITY;
    for root in 0..12 {
        for (minor, profile) in [(false, &MAJOR_PROFILE), (true, &MINOR_PROFILE)] {
            let score = profile
                .iter()
                .enumerate()
                .map(|(index, weight)| chroma[(root + index) % 12] * weight)
                .sum::<f64>();
            if score > best_score {
                best_score = score;
                best_root = root;
                best_minor = minor;
            }
        }
    }
    Some(format!(
        "{}{}",
        KEY_NAMES[best_root],
        if best_minor { "m" } else { "" }
    ))
}

fn goertzel_power(samples: &[f32], sample_rate: u32, frequency: f64) -> f64 {
    let coefficient = 2.0 * (2.0 * std::f64::consts::PI * frequency / sample_rate as f64).cos();
    let denominator = (samples.len().saturating_sub(1)).max(1) as f64;
    let mut previous = 0.0_f64;
    let mut before_previous = 0.0_f64;
    for (index, sample) in samples.iter().enumerate() {
        let window = 0.5 - 0.5 * (2.0 * std::f64::consts::PI * index as f64 / denominator).cos();
        let current = f64::from(*sample) * window + coefficient * previous - before_previous;
        before_previous = previous;
        previous = current;
    }
    previous * previous + before_previous * before_previous
        - coefficient * previous * before_previous
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn detects_steady_120_bpm_pulses() {
        let mut samples = vec![0.0_f32; FEATURE_SAMPLE_RATE as usize * 12];
        for beat in 0..24 {
            let start = beat * FEATURE_SAMPLE_RATE as usize / 2;
            for offset in 0..(FEATURE_SAMPLE_RATE as usize / 100) {
                samples[start + offset] =
                    0.9 * (1.0 - offset as f32 / (FEATURE_SAMPLE_RATE as f32 / 100.0));
            }
        }
        let bpm = detect_bpm(&samples, FEATURE_SAMPLE_RATE).expect("detect bpm");
        assert!((bpm - 120.0).abs() <= 1.0, "detected {bpm}");
    }

    #[test]
    fn detects_c_major_chord() {
        let samples = (0..FEATURE_SAMPLE_RATE as usize * 8)
            .map(|index| {
                let time = index as f64 / FEATURE_SAMPLE_RATE as f64;
                [261.63_f64, 329.63, 392.0]
                    .iter()
                    .map(|frequency| (2.0 * std::f64::consts::PI * frequency * time).sin())
                    .sum::<f64>() as f32
                    / 3.0
            })
            .collect::<Vec<_>>();
        assert_eq!(
            detect_musical_key(&samples, FEATURE_SAMPLE_RATE).as_deref(),
            Some("C")
        );
    }
}
