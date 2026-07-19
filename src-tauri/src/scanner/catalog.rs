use std::{collections::BTreeMap, path::Path};

#[derive(Debug, Clone, Copy)]
pub struct DawDefinition {
    pub extension: &'static str,
    pub daw_name: &'static str,
}

pub const KNOWN_DAWS: [DawDefinition; 9] = [
    DawDefinition {
        extension: ".flp",
        daw_name: "FL Studio",
    },
    DawDefinition {
        extension: ".als",
        daw_name: "Ableton Live",
    },
    DawDefinition {
        extension: ".rpp",
        daw_name: "REAPER",
    },
    DawDefinition {
        extension: ".cpr",
        daw_name: "Cubase",
    },
    DawDefinition {
        extension: ".song",
        daw_name: "Studio One",
    },
    DawDefinition {
        extension: ".ptx",
        daw_name: "Pro Tools",
    },
    DawDefinition {
        extension: ".logicx",
        daw_name: "Logic Pro",
    },
    DawDefinition {
        extension: ".band",
        daw_name: "GarageBand",
    },
    DawDefinition {
        extension: ".reason",
        daw_name: "Reason",
    },
];

#[derive(Debug, Clone)]
pub struct ProjectFormat {
    pub extension: String,
    pub daw_name: String,
}

#[derive(Debug, Clone)]
pub struct DawCatalog {
    formats: BTreeMap<String, String>,
}

impl DawCatalog {
    pub fn new(custom_extensions: impl IntoIterator<Item = (String, String)>) -> Self {
        let mut formats = KNOWN_DAWS
            .iter()
            .map(|definition| {
                (
                    definition.extension.to_string(),
                    definition.daw_name.to_string(),
                )
            })
            .collect::<BTreeMap<_, _>>();

        for (extension, daw_name) in custom_extensions {
            if let Some(extension) = normalize_extension(&extension) {
                formats.entry(extension).or_insert(daw_name);
            }
        }

        Self { formats }
    }

    pub fn detect(&self, path: &Path) -> Option<ProjectFormat> {
        let extension = path
            .extension()
            .and_then(|extension| extension.to_str())
            .and_then(normalize_extension)?;
        let daw_name = self.formats.get(&extension)?.clone();

        Some(ProjectFormat {
            extension,
            daw_name,
        })
    }
}

pub fn normalize_extension(value: &str) -> Option<String> {
    let trimmed = value.trim().trim_start_matches('.').to_lowercase();
    let is_valid = !trimmed.is_empty()
        && trimmed.len() <= 16
        && trimmed
            .chars()
            .all(|character| character.is_ascii_alphanumeric());

    is_valid.then(|| format!(".{trimmed}"))
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn detects_known_extensions_case_insensitively() {
        let catalog = DawCatalog::new([]);
        let format = catalog
            .detect(Path::new("D:/Music/Final Mix.FLP"))
            .expect("known extension");

        assert_eq!(format.extension, ".flp");
        assert_eq!(format.daw_name, "FL Studio");
    }

    #[test]
    fn adds_valid_custom_extensions_without_overriding_known_daws() {
        let catalog = DawCatalog::new([
            (".tracktionedit".to_string(), "Waveform".to_string()),
            (".flp".to_string(), "Other".to_string()),
        ]);

        assert_eq!(
            catalog
                .detect(Path::new("song.tracktionedit"))
                .expect("custom extension")
                .daw_name,
            "Waveform"
        );
        assert_eq!(
            catalog
                .detect(Path::new("song.flp"))
                .expect("known extension")
                .daw_name,
            "FL Studio"
        );
    }

    #[test]
    fn rejects_unsafe_extension_values() {
        assert_eq!(normalize_extension("../flp"), None);
        assert_eq!(normalize_extension(""), None);
        assert_eq!(normalize_extension(".my-format"), None);
        assert_eq!(normalize_extension(" ALS "), Some(".als".to_string()));
    }
}
