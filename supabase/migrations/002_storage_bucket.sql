-- Create a private storage bucket for session photos.
-- All reads go through signed URLs generated server-side.
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'snapitnow-photos',
  'snapitnow-photos',
  false,
  10485760,  -- 10 MB
  ARRAY['image/jpeg', 'image/png', 'image/webp']
);
