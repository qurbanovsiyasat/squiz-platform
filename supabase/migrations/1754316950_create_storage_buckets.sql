-- Migration: create_storage_buckets
-- Created at: 1754316950
-- Create storage buckets for file uploads

-- Create form-attachments bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('form-attachments', 'form-attachments', true)
ON CONFLICT (id) DO NOTHING;

-- Create storage policies for form-attachments bucket
CREATE POLICY "Anyone can view form attachments"
    ON storage.objects FOR SELECT
    USING (bucket_id = 'form-attachments');

CREATE POLICY "Authenticated users can upload form attachments"
    ON storage.objects FOR INSERT
    WITH CHECK (bucket_id = 'form-attachments' AND auth.role() = 'authenticated');

CREATE POLICY "Users can update their own form attachments"
    ON storage.objects FOR UPDATE
    USING (bucket_id = 'form-attachments' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete their own form attachments"
    ON storage.objects FOR DELETE
    USING (bucket_id = 'form-attachments' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Ensure images bucket exists with proper policies
INSERT INTO storage.buckets (id, name, public)
VALUES ('images', 'images', true)
ON CONFLICT (id) DO NOTHING;

-- Create storage policies for images bucket if they don't exist
DO $$
BEGIN
    -- Check if policy exists before creating
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'objects' 
        AND policyname = 'Anyone can view images'
    ) THEN
        CREATE POLICY "Anyone can view images"
            ON storage.objects FOR SELECT
            USING (bucket_id = 'images');
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'objects' 
        AND policyname = 'Authenticated users can upload images'
    ) THEN
        CREATE POLICY "Authenticated users can upload images"
            ON storage.objects FOR INSERT
            WITH CHECK (bucket_id = 'images' AND auth.role() = 'authenticated');
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'objects' 
        AND policyname = 'Users can update their own images'
    ) THEN
        CREATE POLICY "Users can update their own images"
            ON storage.objects FOR UPDATE
            USING (bucket_id = 'images' AND auth.uid()::text = (storage.foldername(name))[1]);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'objects' 
        AND policyname = 'Users can delete their own images'
    ) THEN
        CREATE POLICY "Users can delete their own images"
            ON storage.objects FOR DELETE
            USING (bucket_id = 'images' AND auth.uid()::text = (storage.foldername(name))[1]);
    END IF;
END $$;
