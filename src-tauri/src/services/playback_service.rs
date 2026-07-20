use crate::{
    errors::{AppError, AppResult},
    models::{PlaybackSession, PlaybackSessionInput},
    repositories::PlaybackRepository,
    state::AppState,
};

const MAX_QUEUE_LENGTH: usize = 500;
const MAX_POSITION_SECONDS: f64 = 60.0 * 60.0 * 24.0;

pub struct PlaybackService;

impl PlaybackService {
    pub fn load(state: &AppState) -> AppResult<PlaybackSession> {
        let connection = state.database().connection()?;
        let stored = PlaybackRepository::load_raw(&connection)?
            .and_then(|value| serde_json::from_str::<PlaybackSessionInput>(&value).ok())
            .unwrap_or_default();
        let stored = validate(stored).unwrap_or_default();
        let current_ref = stored.current_index.and_then(|index| stored.queue.get(index).copied());
        let mut queue = Vec::with_capacity(stored.queue.len());
        let mut current_index = None;
        for reference in stored.queue {
            if let Some(track) = PlaybackRepository::resolve_track(&connection, reference)? {
                if Some(reference) == current_ref {
                    current_index = Some(queue.len());
                }
                queue.push(track);
            }
        }
        if current_index.is_none() && !queue.is_empty() {
            current_index = queue.iter().position(|track| !track.is_missing).or(Some(0));
        }
        Ok(PlaybackSession {
            queue,
            current_index,
            position_seconds: if current_index.is_some() { stored.position_seconds } else { 0.0 },
            volume: stored.volume,
            repeat_mode: stored.repeat_mode,
            shuffle: stored.shuffle,
        })
    }

    pub fn save(state: &AppState, input: PlaybackSessionInput) -> AppResult<()> {
        let input = validate(input)?;
        let connection = state.database().connection()?;
        for reference in &input.queue {
            if PlaybackRepository::resolve_track(&connection, *reference)?.is_none() {
                return Err(AppError::InvalidPlaybackSession(
                    "la cola contiene un archivo que ya no existe en la biblioteca".into(),
                ));
            }
        }
        PlaybackRepository::save_raw(&connection, &serde_json::to_string(&input)?)
    }
}

fn validate(input: PlaybackSessionInput) -> AppResult<PlaybackSessionInput> {
    if input.queue.len() > MAX_QUEUE_LENGTH {
        return Err(AppError::InvalidPlaybackSession("la cola supera 500 archivos".into()));
    }
    if input.current_index.is_some_and(|index| index >= input.queue.len()) {
        return Err(AppError::InvalidPlaybackSession("posición de cola no válida".into()));
    }
    if !input.position_seconds.is_finite()
        || !(0.0..=MAX_POSITION_SECONDS).contains(&input.position_seconds)
    {
        return Err(AppError::InvalidPlaybackSession("posición de audio no válida".into()));
    }
    if !input.volume.is_finite() || !(0.0..=1.0).contains(&input.volume) {
        return Err(AppError::InvalidPlaybackSession("volumen no válido".into()));
    }
    Ok(input)
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::models::PlaybackTrackRef;

    #[test]
    fn rejects_invalid_queue_state() {
        let result = validate(PlaybackSessionInput {
            queue: vec![PlaybackTrackRef { project_id: 1, file_id: 2 }],
            current_index: Some(2),
            position_seconds: 0.0,
            volume: 0.8,
            repeat_mode: Default::default(),
            shuffle: false,
        });
        assert!(result.is_err());
    }
}
