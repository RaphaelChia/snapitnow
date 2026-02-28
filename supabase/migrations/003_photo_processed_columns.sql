-- Add columns to track filter-processed outputs and thumbnails.
ALTER TABLE photos
  ADD COLUMN filtered_key  text,
  ADD COLUMN thumbnail_key text,
  ADD COLUMN processed_at  timestamptz;

-- Expand the status check to include 'processed'.
ALTER TABLE photos
  DROP CONSTRAINT photos_status_check,
  ADD CONSTRAINT photos_status_check
    CHECK (status IN ('pending_upload', 'uploaded', 'processed', 'failed'));
