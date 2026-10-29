CREATE INDEX IF NOT EXISTS orthocare_clinic_enquiries_created_id
  ON orthocare_clinic_enquiries (created_at DESC, id DESC);

CREATE INDEX IF NOT EXISTS orthocare_clinic_enquiries_status_created_id
  ON orthocare_clinic_enquiries (status, created_at DESC, id DESC);

CREATE INDEX IF NOT EXISTS orthocare_clinic_sessions_expiry
  ON orthocare_clinic_sessions (expires_at);

CREATE INDEX IF NOT EXISTS orthocare_clinic_login_attempts_window
  ON orthocare_clinic_login_attempts (window_started_at);

CREATE INDEX IF NOT EXISTS orthocare_clinic_enquiry_attempts_window
  ON orthocare_clinic_enquiry_attempts (window_started_at);
