use std::time::{Duration, Instant};

/// Pure helper: should we flush a pending save given last-edit and last-flush times?
/// Frontend mirrors this policy with a timer; the function exists so the contract is unit-tested.
#[allow(dead_code)] // exercised by unit tests; UI debounce is client-side
pub fn should_flush(
    last_edit: Instant,
    last_flush: Option<Instant>,
    now: Instant,
    debounce: Duration,
) -> bool {
    if now.duration_since(last_edit) < debounce {
        return false;
    }
    match last_flush {
        None => true,
        Some(flushed) => last_edit > flushed,
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn not_ready_before_debounce_elapses() {
        let t0 = Instant::now();
        let edit = t0;
        let now = t0 + Duration::from_millis(200);
        assert!(!should_flush(edit, None, now, Duration::from_millis(700)));
    }

    #[test]
    fn ready_after_debounce_with_no_prior_flush() {
        let t0 = Instant::now();
        let edit = t0;
        let now = t0 + Duration::from_millis(800);
        assert!(should_flush(edit, None, now, Duration::from_millis(700)));
    }

    #[test]
    fn not_ready_if_already_flushed_after_edit() {
        let t0 = Instant::now();
        let edit = t0;
        let flushed = t0 + Duration::from_millis(750);
        let now = t0 + Duration::from_millis(900);
        assert!(!should_flush(
            edit,
            Some(flushed),
            now,
            Duration::from_millis(700)
        ));
    }

    #[test]
    fn ready_when_edit_is_newer_than_flush() {
        let t0 = Instant::now();
        let flushed = t0;
        let edit = t0 + Duration::from_millis(100);
        let now = t0 + Duration::from_millis(900);
        assert!(should_flush(
            edit,
            Some(flushed),
            now,
            Duration::from_millis(700)
        ));
    }
}
