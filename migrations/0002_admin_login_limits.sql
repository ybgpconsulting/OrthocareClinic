CREATE TABLE IF NOT EXISTS orthocare_clinic_login_attempts (
  ip_hash TEXT PRIMARY KEY,
  window_started_at INTEGER NOT NULL,
  attempts INTEGER NOT NULL,
  locked_until INTEGER NOT NULL DEFAULT 0
);
