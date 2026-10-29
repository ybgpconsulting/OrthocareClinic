CREATE TABLE IF NOT EXISTS orthocare_clinic_documents (
  document_key TEXT PRIMARY KEY CHECK (document_key IN ('settings', 'content')),
  data TEXT NOT NULL CHECK (json_valid(data))
);

CREATE TABLE IF NOT EXISTS orthocare_clinic_records (
  record_type TEXT NOT NULL CHECK (record_type IN ('category', 'service', 'gallery', 'faq')),
  record_id TEXT NOT NULL,
  category_id TEXT,
  is_visible INTEGER NOT NULL DEFAULT 1 CHECK (is_visible IN (0, 1)),
  sort_order INTEGER NOT NULL DEFAULT 0,
  data TEXT NOT NULL CHECK (json_valid(data)),
  PRIMARY KEY (record_type, record_id)
);

CREATE INDEX IF NOT EXISTS orthocare_clinic_records_order
  ON orthocare_clinic_records (record_type, sort_order, record_id);

CREATE INDEX IF NOT EXISTS orthocare_clinic_services_category
  ON orthocare_clinic_records (category_id, sort_order)
  WHERE record_type = 'service';

CREATE TABLE IF NOT EXISTS orthocare_clinic_enquiries (
  id TEXT PRIMARY KEY,
  patient_name TEXT NOT NULL,
  phone_number TEXT NOT NULL,
  service_requested TEXT NOT NULL,
  preferred_date TEXT NOT NULL DEFAULT '',
  preferred_time_slot TEXT NOT NULL DEFAULT '',
  message TEXT NOT NULL DEFAULT '',
  is_home_visit_requested INTEGER NOT NULL DEFAULT 0 CHECK (is_home_visit_requested IN (0, 1)),
  status TEXT NOT NULL DEFAULT 'new'
    CHECK (status IN ('new', 'contacted', 'scheduled', 'completed', 'closed')),
  internal_notes TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS orthocare_clinic_enquiries_status_created
  ON orthocare_clinic_enquiries (status, created_at DESC);

CREATE INDEX IF NOT EXISTS orthocare_clinic_enquiries_phone_created
  ON orthocare_clinic_enquiries (phone_number, created_at DESC);

CREATE TABLE IF NOT EXISTS orthocare_clinic_admin (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  password_salt TEXT NOT NULL,
  password_hash TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS orthocare_clinic_data_meta (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  revision INTEGER NOT NULL DEFAULT 0,
  mutation_token TEXT NOT NULL DEFAULT ''
);

INSERT OR IGNORE INTO orthocare_clinic_data_meta (id, revision)
  SELECT id, revision FROM orthocare_clinic_state WHERE id = 1;

INSERT OR IGNORE INTO orthocare_clinic_data_meta (id, revision) VALUES (1, 0);

INSERT OR IGNORE INTO orthocare_clinic_admin (id, password_salt, password_hash)
  SELECT 1, json_extract(data, '$.adminSalt'), json_extract(data, '$.adminPasswordHash')
  FROM orthocare_clinic_state
  WHERE id = 1
    AND json_valid(data)
    AND json_type(data, '$.adminSalt') = 'text'
    AND json_type(data, '$.adminPasswordHash') = 'text';

INSERT OR IGNORE INTO orthocare_clinic_documents (document_key, data)
  SELECT 'settings', json(json_extract(data, '$.settings'))
  FROM orthocare_clinic_state
  WHERE id = 1 AND json_valid(data) AND json_type(data, '$.settings') = 'object';

INSERT OR IGNORE INTO orthocare_clinic_documents (document_key, data)
  SELECT 'content', json(json_extract(data, '$.content'))
  FROM orthocare_clinic_state
  WHERE id = 1 AND json_valid(data) AND json_type(data, '$.content') = 'object';

INSERT OR IGNORE INTO orthocare_clinic_records
  (record_type, record_id, category_id, is_visible, sort_order, data)
  SELECT 'category', json_extract(item.value, '$.id'), NULL, 1,
         COALESCE(CAST(json_extract(item.value, '$.order') AS INTEGER), 0), json(item.value)
  FROM orthocare_clinic_state AS legacy, json_each(
    CASE WHEN json_valid(legacy.data) AND json_type(legacy.data, '$.categories') = 'array'
      THEN json_extract(legacy.data, '$.categories') ELSE '[]' END
  )
    AS item
  WHERE legacy.id = 1 AND item.type = 'object'
    AND json_type(item.value, '$.id') = 'text';

INSERT OR IGNORE INTO orthocare_clinic_records
  (record_type, record_id, category_id, is_visible, sort_order, data)
  SELECT 'service', json_extract(item.value, '$.id'), json_extract(item.value, '$.categoryId'),
         CASE WHEN json_extract(item.value, '$.isVisible') = 0 THEN 0 ELSE 1 END,
         COALESCE(CAST(json_extract(item.value, '$.order') AS INTEGER), 0), json(item.value)
  FROM orthocare_clinic_state AS legacy, json_each(
    CASE WHEN json_valid(legacy.data) AND json_type(legacy.data, '$.services') = 'array'
      THEN json_extract(legacy.data, '$.services') ELSE '[]' END
  )
    AS item
  WHERE legacy.id = 1 AND item.type = 'object'
    AND json_type(item.value, '$.id') = 'text';

INSERT OR IGNORE INTO orthocare_clinic_records
  (record_type, record_id, category_id, is_visible, sort_order, data)
  SELECT 'gallery', json_extract(item.value, '$.id'), NULL,
         CASE WHEN json_extract(item.value, '$.isVisible') = 0 THEN 0 ELSE 1 END,
         COALESCE(CAST(json_extract(item.value, '$.order') AS INTEGER), 0), json(item.value)
  FROM orthocare_clinic_state AS legacy, json_each(
    CASE WHEN json_valid(legacy.data) AND json_type(legacy.data, '$.gallery') = 'array'
      THEN json_extract(legacy.data, '$.gallery') ELSE '[]' END
  )
    AS item
  WHERE legacy.id = 1 AND item.type = 'object'
    AND json_type(item.value, '$.id') = 'text';

INSERT OR IGNORE INTO orthocare_clinic_records
  (record_type, record_id, category_id, is_visible, sort_order, data)
  SELECT 'faq', json_extract(item.value, '$.id'), NULL,
         CASE WHEN json_extract(item.value, '$.isVisible') = 0 THEN 0 ELSE 1 END,
         COALESCE(CAST(json_extract(item.value, '$.order') AS INTEGER), 0), json(item.value)
  FROM orthocare_clinic_state AS legacy, json_each(
    CASE WHEN json_valid(legacy.data) AND json_type(legacy.data, '$.faqs') = 'array'
      THEN json_extract(legacy.data, '$.faqs') ELSE '[]' END
  )
    AS item
  WHERE legacy.id = 1 AND item.type = 'object'
    AND json_type(item.value, '$.id') = 'text';

INSERT OR IGNORE INTO orthocare_clinic_enquiries
  (id, patient_name, phone_number, service_requested, preferred_date,
   preferred_time_slot, message, is_home_visit_requested, status, internal_notes,
   created_at, updated_at)
  SELECT json_extract(item.value, '$.id'),
         json_extract(item.value, '$.patientName'),
         json_extract(item.value, '$.phoneNumber'),
         COALESCE(json_extract(item.value, '$.serviceRequested'), ''),
         COALESCE(json_extract(item.value, '$.preferredDate'), ''),
         COALESCE(json_extract(item.value, '$.preferredTimeSlot'), ''),
         COALESCE(json_extract(item.value, '$.message'), ''),
         CASE WHEN json_extract(item.value, '$.isHomeVisitRequested') THEN 1 ELSE 0 END,
         CASE WHEN json_extract(item.value, '$.status') IN ('new', 'contacted', 'scheduled', 'completed', 'closed')
           THEN json_extract(item.value, '$.status') ELSE 'new' END,
         json_extract(item.value, '$.internalNotes'),
         COALESCE(json_extract(item.value, '$.createdAt'), ''),
         COALESCE(json_extract(item.value, '$.updatedAt'), json_extract(item.value, '$.createdAt'), '')
  FROM orthocare_clinic_state AS legacy, json_each(
    CASE WHEN json_valid(legacy.data) AND json_type(legacy.data, '$.enquiries') = 'array'
      THEN json_extract(legacy.data, '$.enquiries') ELSE '[]' END
  )
    AS item
  WHERE legacy.id = 1 AND item.type = 'object'
    AND json_type(item.value, '$.id') = 'text'
    AND json_type(item.value, '$.patientName') = 'text'
    AND json_type(item.value, '$.phoneNumber') = 'text';
