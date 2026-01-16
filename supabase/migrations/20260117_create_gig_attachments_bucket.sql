-- Create gig-attachments bucket
INSERT INTO storage.buckets (id, name, public) VALUES ('gig-attachments', 'gig-attachments', true) ON CONFLICT (id) DO NOTHING;

-- Enable RLS (Usually enabled by default, skipping to avoid permission errors)
-- ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Public View Gig Attachments" ON storage.objects FOR SELECT USING (bucket_id = 'gig-attachments');

CREATE POLICY "Auth Upload Gig Attachments" ON storage.objects FOR INSERT WITH CHECK (
    bucket_id = 'gig-attachments' 
    AND auth.role() = 'authenticated'
);

CREATE POLICY "Owner Delete Gig Attachments" ON storage.objects FOR DELETE USING (
    bucket_id = 'gig-attachments' 
    AND auth.uid() = owner
);
