use chrono::Local;

/// Characters illegal in filenames on Windows (and filtered for cross-platform safety).
const ILLEGAL: &[char] = &['<', '>', ':', '"', '/', '\\', '|', '?', '*'];

/// Max stem length before `.txt` (plan: ~50 chars).
pub const MAX_STEM_LEN: usize = 50;

/// Derive a note filename from content's first line.
/// Empty / whitespace-only first line → `Untitled-<timestamp>.txt`.
pub fn filename_from_content(content: &str, timestamp_fallback: Option<&str>) -> String {
    let first_line = content.lines().next().unwrap_or("").trim();
    if first_line.is_empty() {
        let ts = timestamp_fallback
            .map(str::to_string)
            .unwrap_or_else(|| Local::now().format("%Y%m%d-%H%M%S").to_string());
        return format!("Untitled-{ts}.txt");
    }
    let stem = sanitize_stem(first_line);
    if stem.is_empty() {
        let ts = timestamp_fallback
            .map(str::to_string)
            .unwrap_or_else(|| Local::now().format("%Y%m%d-%H%M%S").to_string());
        return format!("Untitled-{ts}.txt");
    }
    format!("{stem}.txt")
}

/// Sanitize a raw title into a safe filename stem (no extension).
pub fn sanitize_stem(raw: &str) -> String {
    let mut out = String::with_capacity(raw.len().min(MAX_STEM_LEN));
    for ch in raw.chars() {
        if out.chars().count() >= MAX_STEM_LEN {
            break;
        }
        if ILLEGAL.contains(&ch) || ch.is_control() {
            out.push(' ');
        } else {
            out.push(ch);
        }
    }
    // Collapse whitespace and trim dots/spaces (Windows forbids trailing dots/spaces).
    let collapsed: String = out
        .split_whitespace()
        .collect::<Vec<_>>()
        .join(" ")
        .trim_matches(|c: char| c == '.' || c.is_whitespace())
        .to_string();
    truncated_chars(&collapsed, MAX_STEM_LEN)
        .trim_matches(|c: char| c == '.' || c.is_whitespace())
        .to_string()
}

fn truncated_chars(s: &str, max: usize) -> String {
    s.chars().take(max).collect()
}

/// Title shown in the UI: first line, or "Untitled".
pub fn title_from_content(content: &str) -> String {
    let first = content.lines().next().unwrap_or("").trim();
    if first.is_empty() {
        "Untitled".into()
    } else {
        first.chars().take(80).collect()
    }
}

/// Short preview of body after the first line.
pub fn preview_from_content(content: &str) -> String {
    let body: String = content
        .lines()
        .skip(1)
        .map(str::trim)
        .filter(|l| !l.is_empty())
        .collect::<Vec<_>>()
        .join(" ");
    if body.is_empty() {
        // Fall back to rest of first line after title display length, or empty.
        let first = content.lines().next().unwrap_or("").trim();
        if first.chars().count() > 40 {
            first.chars().skip(40).take(80).collect()
        } else {
            String::new()
        }
    } else {
        body.chars().take(120).collect()
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn empty_content_uses_untitled_timestamp() {
        let name = filename_from_content("", Some("20260101-120000"));
        assert_eq!(name, "Untitled-20260101-120000.txt");
        let name2 = filename_from_content("   \nbody", Some("ts"));
        assert_eq!(name2, "Untitled-ts.txt");
    }

    #[test]
    fn first_line_becomes_filename() {
        assert_eq!(
            filename_from_content("Shopping list\nmilk", None),
            "Shopping list.txt"
        );
    }

    #[test]
    fn strips_illegal_chars() {
        let stem = sanitize_stem(r#"a/b:c*d?"#);
        assert!(!stem.contains('/'));
        assert!(!stem.contains(':'));
        assert!(!stem.contains('*'));
        assert!(!stem.contains('?'));
        assert_eq!(
            filename_from_content("hello:world", None),
            "hello world.txt"
        );
    }

    #[test]
    fn truncates_long_titles() {
        let long = "a".repeat(100);
        let name = filename_from_content(&long, None);
        let stem = name.trim_end_matches(".txt");
        assert!(stem.chars().count() <= MAX_STEM_LEN);
    }

    #[test]
    fn only_illegal_chars_falls_back() {
        let name = filename_from_content("???***", Some("fb"));
        assert_eq!(name, "Untitled-fb.txt");
    }

    #[test]
    fn title_and_preview() {
        assert_eq!(title_from_content(""), "Untitled");
        assert_eq!(title_from_content("Hi\nthere friend"), "Hi");
        assert_eq!(preview_from_content("Hi\nthere friend"), "there friend");
    }
}
