use crate::error::{AppError, AppResult};
use crate::fs::filename::{filename_from_content, preview_from_content, title_from_content};
use serde::{Deserialize, Serialize};
use std::fs;
use std::path::{Path, PathBuf};
use std::time::SystemTime;

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct NoteMeta {
    /// Absolute path to the `.txt` file.
    pub path: String,
    /// Filename only (e.g. `Shopping list.txt`).
    pub filename: String,
    pub title: String,
    pub preview: String,
    /// Unix ms of last modified.
    pub modified_ms: u64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Note {
    pub path: String,
    pub filename: String,
    pub content: String,
    pub title: String,
    pub modified_ms: u64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SaveResult {
    pub path: String,
    pub filename: String,
    pub title: String,
    /// True when the file was renamed because the title changed.
    pub renamed: bool,
}

/// Bytes to read when building sidebar title/preview (full content only via `read_note`).
pub const META_READ_LIMIT: usize = 8 * 1024;

/// Serialize paths for the frontend without Windows `\\?\` extended prefixes.
///
/// `canonicalize()` returns `\\?\C:\...` on Windows; `read_dir` does not. Mixed
/// forms break pin matching (toggle always *adds*, prune immediately drops).
pub fn path_to_api(path: &Path) -> String {
    let raw = path.to_string_lossy();
    strip_extended_prefix(&raw).into_owned()
}

fn strip_extended_prefix(s: &str) -> std::borrow::Cow<'_, str> {
    // `\\?\C:\...` and `\\?\UNC\server\share\...`
    if let Some(rest) = s.strip_prefix(r"\\?\") {
        if let Some(unc) = rest.strip_prefix(r"UNC\") {
            return std::borrow::Cow::Owned(format!(r"\\{unc}"));
        }
        return std::borrow::Cow::Borrowed(rest);
    }
    std::borrow::Cow::Borrowed(s)
}

fn ensure_notes_dir(folder: &Path) -> AppResult<()> {
    if !folder.exists() {
        fs::create_dir_all(folder)?;
    }
    if !folder.is_dir() {
        return Err(AppError::InvalidPath(format!(
            "notes folder is not a directory: {}",
            folder.display()
        )));
    }
    Ok(())
}

fn modified_ms(meta: &fs::Metadata) -> u64 {
    meta.modified()
        .ok()
        .and_then(|t| t.duration_since(SystemTime::UNIX_EPOCH).ok())
        .map(|d| d.as_millis() as u64)
        .unwrap_or(0)
}

fn is_txt(path: &Path) -> bool {
    path.extension()
        .and_then(|e| e.to_str())
        .map(|e| e.eq_ignore_ascii_case("txt"))
        .unwrap_or(false)
}

/// Ensure `path` is a `.txt` file under `folder` (after canonicalize).
/// Rejects path traversal and absolute paths outside the notes directory.
pub fn assert_note_path(folder: &Path, path: &Path) -> AppResult<PathBuf> {
    ensure_notes_dir(folder)?;
    if !is_txt(path) {
        return Err(AppError::InvalidPath(format!(
            "not a .txt note: {}",
            path.display()
        )));
    }
    if !path.exists() {
        return Err(AppError::NoteNotFound(path.display().to_string()));
    }

    let folder_canon = folder.canonicalize().map_err(|e| {
        AppError::InvalidPath(format!(
            "cannot resolve notes folder {}: {e}",
            folder.display()
        ))
    })?;
    let path_canon = path.canonicalize().map_err(|e| {
        AppError::InvalidPath(format!("cannot resolve path {}: {e}", path.display()))
    })?;

    if !path_canon.starts_with(&folder_canon) {
        return Err(AppError::InvalidPath(format!(
            "path is outside notes folder: {}",
            path.display()
        )));
    }
    if !path_canon.is_file() {
        return Err(AppError::NoteNotFound(path.display().to_string()));
    }
    Ok(path_canon)
}

fn read_prefix(path: &Path, limit: usize) -> String {
    use std::io::Read;
    let Ok(mut file) = fs::File::open(path) else {
        return String::new();
    };
    let mut buf = vec![0u8; limit];
    let n = file.read(&mut buf).unwrap_or(0);
    String::from_utf8_lossy(&buf[..n]).into_owned()
}

/// List all `.txt` notes in `folder`, newest first.
pub fn list_notes(folder: &Path) -> AppResult<Vec<NoteMeta>> {
    ensure_notes_dir(folder)?;
    let mut notes = Vec::new();
    for entry in fs::read_dir(folder)? {
        let entry = entry?;
        let path = entry.path();
        if !path.is_file() || !is_txt(&path) {
            continue;
        }
        // Only prefix for list meta — avoids loading huge notes into the sidebar.
        let content = read_prefix(&path, META_READ_LIMIT);
        let meta = entry.metadata()?;
        let filename = path
            .file_name()
            .and_then(|n| n.to_str())
            .unwrap_or("note.txt")
            .to_string();
        notes.push(NoteMeta {
            path: path_to_api(&path),
            filename,
            title: title_from_content(&content),
            preview: preview_from_content(&content),
            modified_ms: modified_ms(&meta),
        });
    }
    notes.sort_by_key(|b| std::cmp::Reverse(b.modified_ms));
    Ok(notes)
}

pub fn read_note(path: &Path) -> AppResult<Note> {
    if !path.is_file() {
        return Err(AppError::NoteNotFound(path.display().to_string()));
    }
    let content = fs::read_to_string(path)?;
    let meta = fs::metadata(path)?;
    let filename = path
        .file_name()
        .and_then(|n| n.to_str())
        .unwrap_or("note.txt")
        .to_string();
    Ok(Note {
        path: path_to_api(path),
        filename,
        title: title_from_content(&content),
        content,
        modified_ms: modified_ms(&meta),
    })
}

/// Create a new empty note file. Returns the note.
pub fn create_note(folder: &Path) -> AppResult<Note> {
    ensure_notes_dir(folder)?;
    let filename = filename_from_content("", None);
    let path = unique_path(folder, &filename);
    fs::write(&path, "")?;
    read_note(&path)
}

/// Resolve a unique path in `folder` if `filename` already exists.
fn unique_path(folder: &Path, filename: &str) -> PathBuf {
    let candidate = folder.join(filename);
    if !candidate.exists() {
        return candidate;
    }
    let stem = Path::new(filename)
        .file_stem()
        .and_then(|s| s.to_str())
        .unwrap_or("note");
    for i in 2..10_000 {
        let name = format!("{stem} ({i}).txt");
        let p = folder.join(&name);
        if !p.exists() {
            return p;
        }
    }
    folder.join(format!(
        "{stem}-{}.txt",
        chrono::Local::now().format("%Y%m%d-%H%M%S-%3f")
    ))
}

/// Save note content. Optionally renames when the first-line-derived filename changes.
///
/// When `auto_rename` is false (manual name locked), only content is written.
pub fn save_note(
    folder: &Path,
    current_path: &Path,
    content: &str,
    auto_rename: bool,
) -> AppResult<SaveResult> {
    ensure_notes_dir(folder)?;

    if !current_path.exists() {
        return Err(AppError::NoteNotFound(current_path.display().to_string()));
    }

    // Prefer preserving Untitled timestamp from existing name when first line is empty.
    let fallback_ts = current_path
        .file_stem()
        .and_then(|s| s.to_str())
        .and_then(|stem| stem.strip_prefix("Untitled-"))
        .map(str::to_string);

    let desired_name = filename_from_content(content, fallback_ts.as_deref());
    let current_name = current_path
        .file_name()
        .and_then(|n| n.to_str())
        .unwrap_or("")
        .to_string();

    let mut target_path = current_path.to_path_buf();
    let mut renamed = false;

    if auto_rename && desired_name != current_name {
        let mut new_path = folder.join(&desired_name);
        // Avoid clobbering a different note that already uses that name.
        if new_path.exists() && new_path != current_path {
            new_path = unique_path(folder, &desired_name);
        }
        fs::rename(current_path, &new_path)?;
        target_path = new_path;
        renamed = true;
    }

    fs::write(&target_path, content)?;

    let filename = target_path
        .file_name()
        .and_then(|n| n.to_str())
        .unwrap_or(&desired_name)
        .to_string();

    Ok(SaveResult {
        path: path_to_api(&target_path),
        filename,
        title: title_from_content(content),
        renamed,
    })
}

/// Manually rename a note file (user-chosen stem). Does not change content.
pub fn rename_note(folder: &Path, current_path: &Path, new_stem: &str) -> AppResult<SaveResult> {
    ensure_notes_dir(folder)?;
    if !current_path.exists() {
        return Err(AppError::NoteNotFound(current_path.display().to_string()));
    }

    let stem = crate::fs::filename::sanitize_stem(new_stem);
    if stem.is_empty() {
        return Err(AppError::InvalidPath("name cannot be empty".into()));
    }
    let desired_name = format!("{stem}.txt");
    let current_name = current_path
        .file_name()
        .and_then(|n| n.to_str())
        .unwrap_or("")
        .to_string();

    let target_path = if desired_name == current_name {
        current_path.to_path_buf()
    } else {
        let mut new_path = folder.join(&desired_name);
        if new_path.exists() && new_path != current_path {
            new_path = unique_path(folder, &desired_name);
        }
        fs::rename(current_path, &new_path)?;
        new_path
    };

    let filename = target_path
        .file_name()
        .and_then(|n| n.to_str())
        .unwrap_or(&desired_name)
        .to_string();

    Ok(SaveResult {
        path: path_to_api(&target_path),
        filename,
        // UI uses this as the display title for locked (manually named) notes.
        title: stem,
        renamed: path_to_api(&target_path) != path_to_api(current_path),
    })
}

pub fn trash_note(path: &Path) -> AppResult<()> {
    if !path.exists() {
        return Err(AppError::NoteNotFound(path.display().to_string()));
    }
    trash::delete(path).map_err(|e| AppError::Trash(e.to_string()))?;
    Ok(())
}

/// Move all `.txt` notes from `from` into `to` (creating `to` if needed).
/// Returns count of files moved.
pub fn move_notes(from: &Path, to: &Path) -> AppResult<u32> {
    if from == to {
        return Ok(0);
    }
    ensure_notes_dir(to)?;
    if !from.is_dir() {
        return Ok(0);
    }
    let mut count = 0u32;
    for entry in fs::read_dir(from)? {
        let entry = entry?;
        let path = entry.path();
        if !path.is_file() {
            continue;
        }
        let is_txt = path
            .extension()
            .and_then(|e| e.to_str())
            .map(|e| e.eq_ignore_ascii_case("txt"))
            .unwrap_or(false);
        if !is_txt {
            continue;
        }
        let name = path
            .file_name()
            .map(|n| n.to_os_string())
            .unwrap_or_default();
        let dest = unique_path(to, &name.to_string_lossy());
        fs::rename(&path, &dest)?;
        count += 1;
    }
    Ok(count)
}

#[cfg(test)]
mod tests {
    use super::*;
    use tempfile::tempdir;

    #[test]
    fn create_list_read() {
        let dir = tempdir().unwrap();
        let note = create_note(dir.path()).unwrap();
        assert!(note.path.ends_with(".txt"));
        let list = list_notes(dir.path()).unwrap();
        assert_eq!(list.len(), 1);
        let read = read_note(Path::new(&note.path)).unwrap();
        assert_eq!(read.content, "");
    }

    #[test]
    fn save_renames_on_title_change() {
        let dir = tempdir().unwrap();
        let note = create_note(dir.path()).unwrap();
        let original = PathBuf::from(&note.path);

        let r1 = save_note(dir.path(), &original, "Hello world\nbody", true).unwrap();
        assert!(r1.renamed);
        assert_eq!(r1.filename, "Hello world.txt");
        assert!(!original.exists());
        assert!(Path::new(&r1.path).exists());

        // Same title → no rename
        let r2 = save_note(
            dir.path(),
            Path::new(&r1.path),
            "Hello world\nbody more",
            true,
        )
        .unwrap();
        assert!(!r2.renamed);
        assert_eq!(r2.filename, "Hello world.txt");

        // Title change → rename again, no duplicate of old name
        let r3 = save_note(dir.path(), Path::new(&r2.path), "Shopping\nmilk", true).unwrap();
        assert!(r3.renamed);
        assert_eq!(r3.filename, "Shopping.txt");
        assert!(!Path::new(&r2.path).exists());
        assert_eq!(list_notes(dir.path()).unwrap().len(), 1);
    }

    #[test]
    fn empty_title_keeps_untitled_stem() {
        let dir = tempdir().unwrap();
        let note = create_note(dir.path()).unwrap();
        let path = PathBuf::from(&note.path);
        let stem = path.file_stem().unwrap().to_string_lossy().to_string();
        assert!(stem.starts_with("Untitled-"));

        let r = save_note(dir.path(), &path, "\njust body", true).unwrap();
        // Should keep Untitled-* rather than invent a new timestamp when possible
        assert!(r.filename.starts_with("Untitled-"));
        assert_eq!(list_notes(dir.path()).unwrap().len(), 1);
    }

    #[test]
    fn move_notes_between_folders() {
        let from = tempdir().unwrap();
        let to = tempdir().unwrap();
        create_note(from.path()).unwrap();
        create_note(from.path()).unwrap();
        let n = move_notes(from.path(), to.path()).unwrap();
        assert_eq!(n, 2);
        assert_eq!(list_notes(to.path()).unwrap().len(), 2);
        assert_eq!(list_notes(from.path()).unwrap().len(), 0);
    }

    #[test]
    fn assert_note_path_rejects_outside_folder() {
        let folder = tempdir().unwrap();
        let outside = tempdir().unwrap();
        let note = create_note(outside.path()).unwrap();
        let err = assert_note_path(folder.path(), Path::new(&note.path)).unwrap_err();
        assert!(matches!(err, AppError::InvalidPath(_)));
    }

    #[test]
    fn assert_note_path_accepts_inside_folder() {
        let folder = tempdir().unwrap();
        let note = create_note(folder.path()).unwrap();
        let ok = assert_note_path(folder.path(), Path::new(&note.path)).unwrap();
        assert!(ok.exists());
    }

    #[test]
    fn rename_note_sets_filename_and_skips_content_change() {
        let dir = tempdir().unwrap();
        let note = create_note(dir.path()).unwrap();
        let path = PathBuf::from(&note.path);
        fs::write(&path, "First line from content\nbody").unwrap();
        let r = rename_note(dir.path(), &path, "My Custom Name").unwrap();
        assert!(r.filename.starts_with("My Custom Name"));
        assert!(r.filename.ends_with(".txt"));
        assert!(Path::new(&r.path).exists());
        // Content unchanged
        let body = fs::read_to_string(&r.path).unwrap();
        assert!(body.starts_with("First line from content"));
        // Auto-save with auto_rename=false keeps name
        let r2 = save_note(dir.path(), Path::new(&r.path), "Other title\nbody", false).unwrap();
        assert_eq!(r2.filename, r.filename);
        assert!(!r2.renamed);
    }

    #[test]
    fn path_to_api_strips_windows_extended_prefix() {
        assert_eq!(
            strip_extended_prefix(r"\\?\C:\Notes\a.txt"),
            r"C:\Notes\a.txt"
        );
        assert_eq!(
            strip_extended_prefix(r"\\?\UNC\server\share\a.txt"),
            r"\\server\share\a.txt"
        );
        assert_eq!(strip_extended_prefix(r"C:\Notes\a.txt"), r"C:\Notes\a.txt");
    }

    #[test]
    fn read_note_path_matches_list_path_style() {
        let dir = tempdir().unwrap();
        let created = create_note(dir.path()).unwrap();
        let listed = list_notes(dir.path()).unwrap();
        assert_eq!(listed.len(), 1);
        // After open (via assert_note_path + read), API path must compare equal to list.
        let safe = assert_note_path(dir.path(), Path::new(&created.path)).unwrap();
        let opened = read_note(&safe).unwrap();
        assert_eq!(opened.path, listed[0].path);
        assert!(!opened.path.contains(r"\\?\"));
    }
}
