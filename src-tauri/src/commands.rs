use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::fs;
use std::path::PathBuf;
use walkdir::WalkDir;

fn get_desk_json_path(desk_path: &str) -> PathBuf {
    PathBuf::from(desk_path).join("desk.json")
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Position {
    pub x: f64,
    pub y: f64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct NoteMeta {
    pub position: Position,
    pub scale: f64,
    #[serde(rename = "zIndex")]
    pub z_index: u32,
    pub deleted: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CanvasState {
    pub zoom: f64,
    pub pan: Position,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DeskData {
    pub version: u32,
    pub notes: HashMap<String, NoteMeta>,
    pub canvas: CanvasState,
}

impl Default for DeskData {
    fn default() -> Self {
        Self {
            version: 1,
            notes: HashMap::new(),
            canvas: CanvasState {
                zoom: 1.0,
                pan: Position { x: 0.0, y: 0.0 },
            },
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SearchResult {
    pub filename: String,
    #[serde(rename = "lineNumber")]
    pub line_number: usize,
    pub snippet: String,
    #[serde(rename = "matchStart")]
    pub match_start: usize,
    #[serde(rename = "matchLength")]
    pub match_length: usize,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct NoteFile {
    pub filename: String,
    pub content: String,
    pub meta: NoteMeta,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct OpenDeskResult {
    pub name: String,
    pub notes: Vec<NoteFile>,
    pub desk_data: DeskData,
}

fn get_templates_dir(desk_path: &str) -> PathBuf {
    PathBuf::from(desk_path).join(".templates")
}

const DEFAULT_TEMPLATES: &[(&str, &str)] = &[
    ("Blank.md", "# {title}\n\n"),
    (
        "Meeting.md",
        "# {title}\n\n## Attendees\n\n- \n\n## Agenda\n\n1. \n\n## Action Items\n\n- [ ] \n",
    ),
    (
        "Daily Log.md",
        "# {title}\n\n## Tasks\n\n- [ ] \n\n## Notes\n\n",
    ),
];

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct NoteTemplate {
    pub name: String,
    pub content: String,
}

fn create_default_templates(templates_dir: &PathBuf) -> Result<(), String> {
    fs::create_dir_all(templates_dir)
        .map_err(|e| format!("Failed to create templates directory: {}", e))?;

    for (filename, content) in DEFAULT_TEMPLATES {
        let template_path = templates_dir.join(filename);
        if !template_path.exists() {
            fs::write(&template_path, content)
                .map_err(|e| format!("Failed to write template {}: {}", filename, e))?;
        }
    }

    Ok(())
}

#[tauri::command]
pub fn get_templates(desk_path: String) -> Result<Vec<NoteTemplate>, String> {
    let templates_dir = get_templates_dir(&desk_path);

    // Create templates directory and default templates if they don't exist
    if !templates_dir.exists() {
        create_default_templates(&templates_dir)?;
    }

    let mut templates = Vec::new();

    for entry in fs::read_dir(&templates_dir)
        .map_err(|e| format!("Failed to read templates directory: {}", e))?
    {
        let entry = entry.map_err(|e| format!("Failed to read directory entry: {}", e))?;
        let path = entry.path();

        if path.extension().map(|ext| ext == "md").unwrap_or(false) {
            if let Some(filename) = path.file_stem() {
                let name = filename.to_string_lossy().to_string();
                let content = fs::read_to_string(&path)
                    .map_err(|e| format!("Failed to read template {}: {}", name, e))?;
                templates.push(NoteTemplate { name, content });
            }
        }
    }

    templates.sort_by(|a, b| a.name.cmp(&b.name));
    Ok(templates)
}

fn sanitize_filename(name: &str) -> String {
    let sanitized: String = name
        .chars()
        .map(|c| {
            if c.is_alphanumeric() || c == '-' || c == '_' || c == ' ' {
                c
            } else {
                '_'
            }
        })
        .collect();
    let trimmed = sanitized.trim();
    if trimmed.is_empty() {
        "untitled".to_string()
    } else {
        trimmed.to_string()
    }
}

#[tauri::command]
pub fn open_desk(path: String) -> Result<OpenDeskResult, String> {
    let desk_path = PathBuf::from(&path);

    if !desk_path.exists() {
        return Err("Desk folder does not exist".to_string());
    }

    let desk_json_path = get_desk_json_path(&path);
    let desk_data: DeskData = if desk_json_path.exists() {
        let content = fs::read_to_string(&desk_json_path)
            .map_err(|e| format!("Failed to read desk.json: {}", e))?;
        serde_json::from_str(&content).map_err(|e| format!("Failed to parse desk.json: {}", e))?
    } else {
        DeskData::default()
    };

    let mut notes = Vec::new();

    for entry in WalkDir::new(&desk_path)
        .min_depth(1)
        .max_depth(1)
        .into_iter()
        .filter_map(|e| e.ok())
    {
        let path = entry.path();
        if path.extension().map(|ext| ext == "md").unwrap_or(false) {
            if let Some(filename) = path.file_name() {
                let filename = filename.to_string_lossy().to_string();
                let content = fs::read_to_string(path)
                    .map_err(|e| format!("Failed to read {}: {}", filename, e))?;

                let meta = desk_data.notes.get(&filename).cloned().unwrap_or_else(|| {
                    let random_x = (rand_position()) as f64;
                    let random_y = (rand_position()) as f64;
                    NoteMeta {
                        position: Position {
                            x: random_x,
                            y: random_y,
                        },
                        scale: 1.0,
                        z_index: 1,
                        deleted: false,
                    }
                });

                // Include ALL notes, even deleted ones (filtering happens on the frontend)
                notes.push(NoteFile {
                    filename,
                    content,
                    meta,
                });
            }
        }
    }

    let name = desk_path
        .file_name()
        .map(|n| n.to_string_lossy().to_string())
        .unwrap_or_else(|| "Desk".to_string());

    Ok(OpenDeskResult {
        name,
        notes,
        desk_data,
    })
}

fn rand_position() -> i32 {
    use std::time::{SystemTime, UNIX_EPOCH};
    let seed = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap()
        .as_nanos() as u64;
    let x = (seed.wrapping_mul(1103515245).wrapping_add(12345) >> 16) as i32;
    (x % 400).abs() + 50
}

#[tauri::command]
pub fn create_desk(path: String) -> Result<String, String> {
    let desk_path = PathBuf::from(&path);

    fs::create_dir_all(&desk_path).map_err(|e| format!("Failed to create desk folder: {}", e))?;

    let desk_data = DeskData::default();
    let desk_json_path = get_desk_json_path(&path);
    let content = serde_json::to_string_pretty(&desk_data)
        .map_err(|e| format!("Failed to serialize desk.json: {}", e))?;

    fs::write(&desk_json_path, content).map_err(|e| format!("Failed to write desk.json: {}", e))?;

    let name = desk_path
        .file_name()
        .map(|n| n.to_string_lossy().to_string())
        .unwrap_or_else(|| "Desk".to_string());

    Ok(name)
}

#[tauri::command]
pub fn save_desk_json(path: String, desk_data: DeskData) -> Result<(), String> {
    let desk_json_path = get_desk_json_path(&path);
    let content = serde_json::to_string_pretty(&desk_data)
        .map_err(|e| format!("Failed to serialize desk.json: {}", e))?;

    fs::write(&desk_json_path, content).map_err(|e| format!("Failed to write desk.json: {}", e))?;

    Ok(())
}

#[tauri::command]
pub fn read_note(path: String, filename: String) -> Result<String, String> {
    let note_path = PathBuf::from(&path).join(&filename);

    fs::read_to_string(&note_path).map_err(|e| format!("Failed to read note: {}", e))
}

#[tauri::command]
pub fn write_note(path: String, filename: String, content: String) -> Result<(), String> {
    let note_path = PathBuf::from(&path).join(&filename);

    fs::write(&note_path, content).map_err(|e| format!("Failed to write note: {}", e))
}

#[tauri::command]
pub fn create_note(
    path: String,
    title: String,
    template_content: Option<String>,
) -> Result<String, String> {
    let sanitized = sanitize_filename(&title);
    let base_name = if sanitized.ends_with(".md") {
        sanitized.trim_end_matches(".md").to_string()
    } else {
        sanitized
    };

    let mut filename = format!("{}.md", base_name);
    let mut counter = 1;

    let desk_path = PathBuf::from(&path);
    while desk_path.join(&filename).exists() {
        filename = format!("{} {}.md", base_name, counter);
        counter += 1;
    }

    let note_path = desk_path.join(&filename);

    // Use template content if provided, otherwise use default
    let content = match template_content {
        Some(template) => template.replace("{title}", &title),
        None => format!("# {}\n\n", title),
    };

    fs::write(&note_path, content).map_err(|e| format!("Failed to create note: {}", e))?;

    Ok(filename)
}

#[tauri::command]
pub fn rename_note(path: String, old_name: String, new_name: String) -> Result<String, String> {
    let desk_path = PathBuf::from(&path);
    let old_path = desk_path.join(&old_name);

    if !old_path.exists() {
        return Err("Note does not exist".to_string());
    }

    let sanitized = sanitize_filename(&new_name);
    let base_name = if sanitized.ends_with(".md") {
        sanitized.trim_end_matches(".md").to_string()
    } else {
        sanitized
    };

    let mut filename = format!("{}.md", base_name);
    let mut counter = 1;

    while desk_path.join(&filename).exists() && filename != old_name {
        filename = format!("{} {}.md", base_name, counter);
        counter += 1;
    }

    let new_path = desk_path.join(&filename);

    fs::rename(&old_path, &new_path).map_err(|e| format!("Failed to rename note: {}", e))?;

    Ok(filename)
}

#[tauri::command]
pub fn delete_note_file(path: String, filename: String) -> Result<(), String> {
    let note_path = PathBuf::from(&path).join(&filename);

    if note_path.exists() {
        fs::remove_file(&note_path).map_err(|e| format!("Failed to delete note file: {}", e))?;
    }

    Ok(())
}

#[tauri::command]
pub fn export_desk_zip(desk_path: String, dest_path: String) -> Result<(), String> {
    use std::io::Write;
    use zip::write::SimpleFileOptions;
    use zip::ZipWriter;

    let file =
        fs::File::create(&dest_path).map_err(|e| format!("Failed to create zip file: {}", e))?;
    let mut zip = ZipWriter::new(file);
    let options = SimpleFileOptions::default().compression_method(zip::CompressionMethod::Deflated);

    let desk_dir = PathBuf::from(&desk_path);

    for entry in WalkDir::new(&desk_dir)
        .min_depth(1)
        .into_iter()
        .filter_map(|e| e.ok())
    {
        let path = entry.path();
        if path.is_file() {
            if let Some(name) = path.file_name() {
                let name = name.to_string_lossy();
                zip.start_file(&*name, options)
                    .map_err(|e| format!("Failed to add file to zip: {}", e))?;
                let content = fs::read(path).map_err(|e| format!("Failed to read file: {}", e))?;
                zip.write_all(&content)
                    .map_err(|e| format!("Failed to write to zip: {}", e))?;
            }
        }
    }

    zip.finish()
        .map_err(|e| format!("Failed to finalize zip: {}", e))?;

    Ok(())
}

#[tauri::command]
pub fn search_notes(path: String, query: String) -> Result<Vec<SearchResult>, String> {
    if query.len() < 2 {
        return Ok(Vec::new());
    }

    let desk_path = PathBuf::from(&path);
    let query_lower = query.to_lowercase();

    let desk_json_path = get_desk_json_path(&path);
    let deleted_files: std::collections::HashSet<String> = if desk_json_path.exists() {
        if let Ok(content) = fs::read_to_string(&desk_json_path) {
            if let Ok(desk_data) = serde_json::from_str::<DeskData>(&content) {
                desk_data
                    .notes
                    .into_iter()
                    .filter(|(_, meta)| meta.deleted)
                    .map(|(filename, _)| filename)
                    .collect()
            } else {
                std::collections::HashSet::new()
            }
        } else {
            std::collections::HashSet::new()
        }
    } else {
        std::collections::HashSet::new()
    };

    let mut results = Vec::new();
    const MAX_RESULTS: usize = 30;
    const SNIPPET_CONTEXT: usize = 30;

    for entry in WalkDir::new(&desk_path)
        .min_depth(1)
        .max_depth(1)
        .into_iter()
        .filter_map(|e| e.ok())
    {
        if results.len() >= MAX_RESULTS {
            break;
        }

        let entry_path = entry.path();
        if entry_path
            .extension()
            .map(|ext| ext == "md")
            .unwrap_or(false)
        {
            if let Some(filename) = entry_path.file_name() {
                let filename = filename.to_string_lossy().to_string();

                if deleted_files.contains(&filename) {
                    continue;
                }

                if let Ok(content) = fs::read_to_string(entry_path) {
                    for (line_idx, line) in content.lines().enumerate() {
                        if results.len() >= MAX_RESULTS {
                            break;
                        }

                        let line_lower = line.to_lowercase();
                        if let Some(match_pos) = line_lower.find(&query_lower) {
                            let snippet_start = match_pos.saturating_sub(SNIPPET_CONTEXT);
                            let snippet_end =
                                (match_pos + query.len() + SNIPPET_CONTEXT).min(line.len());

                            let snippet = line[snippet_start..snippet_end].to_string();
                            let match_start_in_snippet = match_pos - snippet_start;

                            results.push(SearchResult {
                                filename: filename.clone(),
                                line_number: line_idx + 1,
                                snippet,
                                match_start: match_start_in_snippet,
                                match_length: query.len(),
                            });
                        }
                    }
                }
            }
        }
    }

    results.sort_by(|a, b| {
        a.filename
            .cmp(&b.filename)
            .then(a.line_number.cmp(&b.line_number))
    });

    Ok(results)
}

#[tauri::command]
pub fn save_image(
    desk_path: String,
    image_data: String,
    extension: String,
) -> Result<String, String> {
    use base64::{engine::general_purpose, Engine as _};

    let attachments_dir = PathBuf::from(&desk_path).join(".attachments");

    if !attachments_dir.exists() {
        fs::create_dir_all(&attachments_dir)
            .map_err(|e| format!("Failed to create attachments folder: {}", e))?;
    }

    let timestamp = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .unwrap()
        .as_millis();
    let random: u32 = rand::random();
    let filename = format!("image-{}-{}.{}", timestamp, random, extension);

    let image_bytes = general_purpose::STANDARD
        .decode(&image_data)
        .map_err(|e| format!("Failed to decode base64 image: {}", e))?;

    let image_path = attachments_dir.join(&filename);
    fs::write(&image_path, &image_bytes)
        .map_err(|e| format!("Failed to write image file: {}", e))?;

    Ok(format!(".attachments/{}", filename))
}

#[tauri::command]
pub fn copy_image_to_desk(desk_path: String, source_path: String) -> Result<String, String> {
    let attachments_dir = PathBuf::from(&desk_path).join(".attachments");

    if !attachments_dir.exists() {
        fs::create_dir_all(&attachments_dir)
            .map_err(|e| format!("Failed to create attachments folder: {}", e))?;
    }

    let source = PathBuf::from(&source_path);
    let extension = source
        .extension()
        .map(|ext| ext.to_string_lossy().to_string())
        .unwrap_or_else(|| "png".to_string());

    let timestamp = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .unwrap()
        .as_millis();
    let random: u32 = rand::random();
    let filename = format!("image-{}-{}.{}", timestamp, random, extension);

    let dest_path = attachments_dir.join(&filename);

    fs::copy(&source, &dest_path).map_err(|e| format!("Failed to copy image: {}", e))?;

    Ok(format!(".attachments/{}", filename))
}

#[tauri::command]
pub fn read_image_file(desk_path: String, relative_path: String) -> Result<String, String> {
    use base64::{engine::general_purpose, Engine as _};

    let full_path = PathBuf::from(&desk_path).join(&relative_path);

    if !full_path.exists() {
        return Err(format!(
            "Image file does not exist: {}",
            full_path.display()
        ));
    }

    let image_bytes =
        fs::read(&full_path).map_err(|e| format!("Failed to read image file: {}", e))?;

    let base64_string = general_purpose::STANDARD.encode(&image_bytes);

    let extension = full_path
        .extension()
        .map(|ext| ext.to_string_lossy().to_string())
        .unwrap_or_else(|| "png".to_string());

    let mime_types = [
        ("jpg", "jpeg"),
        ("jpeg", "jpeg"),
        ("png", "png"),
        ("gif", "gif"),
        ("webp", "webp"),
        ("svg", "svg+xml"),
        ("bmp", "bmp"),
    ];

    let mime_type = mime_types
        .iter()
        .find(|(ext, _)| ext == &extension.as_str())
        .map(|(_, mime)| format!("image/{}", mime))
        .unwrap_or_else(|| format!("image/{}", extension));

    Ok(format!("data:{};base64,{}", mime_type, base64_string))
}
