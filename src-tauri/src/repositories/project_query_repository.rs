use rusqlite::{
    params_from_iter,
    types::Value,
    Connection,
};

use crate::{
    errors::AppResult,
    models::{
        ProjectFacets, ProjectListItem, ProjectPage, ProjectQuery, ProjectSort,
        ProjectStatusFacet, ProjectTagFacet, SortDirection,
    },
};

pub struct ProjectQueryRepository;

impl ProjectQueryRepository {
    pub fn page(connection: &Connection, query: ProjectQuery) -> AppResult<ProjectPage> {
        let query = query.normalize();
        let (where_clause, filter_values) = filters(&query);
        let total = connection.query_row(
            &format!("SELECT COUNT(*) FROM projects p {where_clause}"),
            params_from_iter(filter_values.iter()),
            |row| row.get::<_, i64>(0),
        )?;
        let total_pages = if total == 0 {
            0
        } else {
            ((total as u64 + query.page_size as u64 - 1) / query.page_size as u64) as u32
        };
        let effective_page = if total_pages == 0 {
            1
        } else {
            query.page.min(total_pages)
        };
        let offset = (effective_page - 1) as u64 * query.page_size as u64;
        let order_by = order_by(query.sort_by, query.sort_direction);

        let sql = format!(
            "SELECT
                p.id,
                p.display_name,
                p.original_name,
                p.file_path,
                p.extension,
                p.daw,
                p.cover_path,
                p.bpm,
                p.musical_key,
                p.genre,
                p.status,
                ps.label,
                ps.color,
                p.rating,
                p.is_favorite,
                p.file_created_at,
                p.file_modified_at,
                p.indexed_at,
                p.is_missing,
                COALESCE((
                    SELECT group_concat(tag_name, char(31))
                    FROM (
                        SELECT t.name AS tag_name
                        FROM project_tags pt
                        JOIN tags t ON t.id = pt.tag_id
                        WHERE pt.project_id = p.id
                        ORDER BY t.name COLLATE NOCASE
                    )
                ), '')
             FROM projects p
             JOIN project_statuses ps ON ps.key = p.status
             {where_clause}
             ORDER BY p.is_missing ASC, {order_by}, p.id DESC
             LIMIT ? OFFSET ?"
        );
        let mut values = filter_values;
        values.push(Value::Integer(i64::from(query.page_size)));
        values.push(Value::Integer(i64::try_from(offset).unwrap_or(i64::MAX)));
        let mut statement = connection.prepare(&sql)?;
        let items = statement
            .query_map(params_from_iter(values.iter()), map_project)?
            .collect::<Result<Vec<_>, _>>()?;

        Ok(ProjectPage {
            items,
            total,
            page: effective_page,
            page_size: query.page_size,
            total_pages,
        })
    }

    pub fn facets(connection: &Connection) -> AppResult<ProjectFacets> {
        let daws = distinct_strings(
            connection,
            "SELECT DISTINCT daw FROM projects
             WHERE parent_project_id IS NULL AND version_kind = 'primary'
             ORDER BY daw COLLATE NOCASE",
        )?;
        let extensions = distinct_strings(
            connection,
            "SELECT DISTINCT extension FROM projects
             WHERE parent_project_id IS NULL AND version_kind = 'primary'
             ORDER BY extension COLLATE NOCASE",
        )?;
        let genres = distinct_strings(
            connection,
            "SELECT DISTINCT genre
             FROM projects
             WHERE parent_project_id IS NULL AND version_kind = 'primary'
               AND genre IS NOT NULL AND trim(genre) <> ''
             ORDER BY genre COLLATE NOCASE",
        )?;

        let statuses = {
            let mut statement = connection.prepare(
                "SELECT key, label, color
                 FROM project_statuses
                 ORDER BY sort_order, label COLLATE NOCASE",
            )?;
            let rows = statement
                .query_map([], |row| {
                    Ok(ProjectStatusFacet {
                        key: row.get(0)?,
                        label: row.get(1)?,
                        color: row.get(2)?,
                    })
                })?
                .collect::<Result<Vec<_>, _>>()?;
            rows
        };

        let tags = {
            let mut statement =
                connection.prepare("SELECT id, name FROM tags ORDER BY name COLLATE NOCASE")?;
            let rows = statement
                .query_map([], |row| {
                    Ok(ProjectTagFacet {
                        id: row.get(0)?,
                        name: row.get(1)?,
                    })
                })?
                .collect::<Result<Vec<_>, _>>()?;
            rows
        };

        Ok(ProjectFacets {
            daws,
            extensions,
            statuses,
            genres,
            tags,
        })
    }
}

fn filters(query: &ProjectQuery) -> (String, Vec<Value>) {
    let mut conditions = vec!["p.parent_project_id IS NULL AND p.version_kind = 'primary'"];
    let mut values = Vec::new();

    if let Some(search) = &query.search {
        conditions.push(
            "(instr(lower(p.display_name), lower(?)) > 0
              OR instr(lower(p.original_name), lower(?)) > 0)",
        );
        values.push(Value::Text(search.clone()));
        values.push(Value::Text(search.clone()));
    }
    add_text_filter(&mut conditions, &mut values, "p.daw", &query.daw);
    add_text_filter(
        &mut conditions,
        &mut values,
        "p.extension",
        &query.extension,
    );
    add_text_filter(&mut conditions, &mut values, "p.status", &query.status);
    add_text_filter(&mut conditions, &mut values, "p.genre", &query.genre);

    if let Some(tag_id) = query.tag_id {
        conditions.push(
            "EXISTS (
                SELECT 1 FROM project_tags filtered_tags
                WHERE filtered_tags.project_id = p.id
                  AND filtered_tags.tag_id = ?
             )",
        );
        values.push(Value::Integer(tag_id));
    }
    if query.favorite_only {
        conditions.push("p.is_favorite = 1");
    }

    if conditions.is_empty() {
        (String::new(), values)
    } else {
        (format!("WHERE {}", conditions.join(" AND ")), values)
    }
}

fn add_text_filter(
    conditions: &mut Vec<&'static str>,
    values: &mut Vec<Value>,
    column: &'static str,
    value: &Option<String>,
) {
    if let Some(value) = value {
        conditions.push(match column {
            "p.daw" => "p.daw = ? COLLATE NOCASE",
            "p.extension" => "p.extension = ? COLLATE NOCASE",
            "p.status" => "p.status = ? COLLATE NOCASE",
            "p.genre" => "p.genre = ? COLLATE NOCASE",
            _ => unreachable!("only allowlisted project columns are accepted"),
        });
        values.push(Value::Text(value.clone()));
    }
}

fn order_by(sort: ProjectSort, direction: SortDirection) -> String {
    let direction = match direction {
        SortDirection::Asc => "ASC",
        SortDirection::Desc => "DESC",
    };
    match sort {
        ProjectSort::Name => format!("p.display_name COLLATE NOCASE {direction}"),
        ProjectSort::Modified => {
            format!("p.file_modified_at IS NULL ASC, p.file_modified_at {direction}")
        }
        ProjectSort::Created => {
            format!("p.file_created_at IS NULL ASC, p.file_created_at {direction}")
        }
        ProjectSort::Bpm => format!("p.bpm IS NULL ASC, p.bpm {direction}"),
        ProjectSort::Imported => format!("p.indexed_at {direction}"),
    }
}

fn map_project(row: &rusqlite::Row<'_>) -> rusqlite::Result<ProjectListItem> {
    let tags: String = row.get(19)?;
    Ok(ProjectListItem {
        id: row.get(0)?,
        display_name: row.get(1)?,
        original_name: row.get(2)?,
        file_path: row.get(3)?,
        extension: row.get(4)?,
        daw: row.get(5)?,
        cover_path: row.get(6)?,
        bpm: row.get(7)?,
        musical_key: row.get(8)?,
        genre: row.get(9)?,
        status: row.get(10)?,
        status_label: row.get(11)?,
        status_color: row.get(12)?,
        rating: row.get(13)?,
        is_favorite: row.get::<_, i64>(14)? != 0,
        file_created_at: row.get(15)?,
        file_modified_at: row.get(16)?,
        indexed_at: row.get(17)?,
        is_missing: row.get::<_, i64>(18)? != 0,
        tags: if tags.is_empty() {
            Vec::new()
        } else {
            tags.split('').map(str::to_string).collect()
        },
    })
}

fn distinct_strings(connection: &Connection, sql: &str) -> AppResult<Vec<String>> {
    let mut statement = connection.prepare(sql)?;
    let values = statement
        .query_map([], |row| row.get(0))?
        .collect::<Result<Vec<_>, _>>()?;
    Ok(values)
}

#[cfg(test)]
mod tests {
    use rusqlite::{params, Connection};

    use crate::database::{configure_connection, migrations};

    use super::*;

    fn database() -> Connection {
        let mut connection = Connection::open_in_memory().expect("in-memory database");
        configure_connection(&connection).expect("configure database");
        migrations::run(&mut connection).expect("migrations");
        connection
    }

    fn seed(connection: &Connection) {
        connection
            .execute(
                "INSERT INTO projects (
                    display_name, original_name, file_path, extension, daw,
                    bpm, genre, status, is_favorite, file_modified_at
                 ) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10)",
                params![
                    "Midnight Drive",
                    "beat.flp",
                    "C:/Music/beat.flp",
                    ".flp",
                    "FL Studio",
                    128.0,
                    "House",
                    "mixing",
                    true,
                    "2026-07-01T00:00:00Z"
                ],
            )
            .expect("first project");
        connection
            .execute(
                "INSERT INTO projects (
                    display_name, original_name, file_path, extension, daw,
                    bpm, genre, status, is_favorite, file_modified_at
                 ) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10)",
                params![
                    "Ambient Sketch",
                    "sketch.als",
                    "C:/Music/sketch.als",
                    ".als",
                    "Ableton Live",
                    90.0,
                    "Ambient",
                    "idea",
                    false,
                    "2026-06-01T00:00:00Z"
                ],
            )
            .expect("second project");
        connection
            .execute("INSERT INTO tags (name) VALUES ('client')", [])
            .expect("tag");
        connection
            .execute(
                "INSERT INTO project_tags (project_id, tag_id) VALUES (1, 1)",
                [],
            )
            .expect("project tag");
    }

    #[test]
    fn filters_by_search_daw_favorite_and_tag() {
        let connection = database();
        seed(&connection);
        let page = ProjectQueryRepository::page(
            &connection,
            ProjectQuery {
                search: Some("midnight".to_string()),
                daw: Some("FL Studio".to_string()),
                tag_id: Some(1),
                favorite_only: true,
                ..ProjectQuery::default()
            },
        )
        .expect("filtered page");

        assert_eq!(page.total, 1);
        assert_eq!(page.items[0].display_name, "Midnight Drive");
        assert_eq!(page.items[0].tags, vec!["client"]);
    }

    #[test]
    fn paginates_and_sorts_without_loading_the_full_library() {
        let connection = database();
        seed(&connection);
        let page = ProjectQueryRepository::page(
            &connection,
            ProjectQuery {
                page: 2,
                page_size: 1,
                sort_by: ProjectSort::Name,
                sort_direction: SortDirection::Asc,
                ..ProjectQuery::default()
            },
        )
        .expect("second page");

        assert_eq!(page.total, 2);
        assert_eq!(page.total_pages, 2);
        assert_eq!(page.items.len(), 1);
        assert_eq!(page.items[0].display_name, "Midnight Drive");
    }

    #[test]
    fn excludes_backups_and_versions_from_the_library() {
        let connection = database();
        seed(&connection);
        connection
            .execute(
                "INSERT INTO projects
                 (display_name, original_name, file_path, extension, daw,
                  parent_project_id, version_kind, version_confidence)
                 VALUES ('Backup', 'beat backup.flp', 'C:/Music/beat backup.flp',
                         '.flp', 'FL Studio', 1, 'backup', 'high')",
                [],
            )
            .expect("linked backup");
        connection
            .execute(
                "INSERT INTO projects
                 (display_name, original_name, file_path, extension, daw,
                  version_kind, version_confidence)
                 VALUES ('Orphan', 'orphan autosaved.flp', 'C:/Music/orphan autosaved.flp',
                         '.flp', 'FL Studio', 'backup', 'high')",
                [],
            )
            .expect("orphan backup");

        let page = ProjectQueryRepository::page(&connection, ProjectQuery::default())
            .expect("library page");
        assert_eq!(page.total, 2);
        assert!(page.items.iter().all(|project| project.display_name != "Backup"));
        assert!(page.items.iter().all(|project| project.display_name != "Orphan"));
    }

    #[test]
    fn returns_filter_facets_from_indexed_data() {
        let connection = database();
        seed(&connection);
        let facets = ProjectQueryRepository::facets(&connection).expect("facets");

        assert_eq!(facets.daws, vec!["Ableton Live", "FL Studio"]);
        assert_eq!(facets.extensions, vec![".als", ".flp"]);
        assert_eq!(facets.genres, vec!["Ambient", "House"]);
        assert_eq!(facets.tags[0].name, "client");
        assert_eq!(facets.statuses.len(), 8);
    }
}
