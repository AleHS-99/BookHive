-- 0002_add_metadata.sql

ALTER TABLE books ADD COLUMN language TEXT;
ALTER TABLE books ADD COLUMN description TEXT;
ALTER TABLE books ADD COLUMN publisher TEXT;
ALTER TABLE books ADD COLUMN published_date TEXT;
ALTER TABLE books ADD COLUMN metadata_status TEXT NOT NULL DEFAULT 'pending';