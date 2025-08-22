-- Migration: create_form_attachments_table
-- Created at: 1754316910
-- Create table for storing form file attachments

-- Create form_attachments table
CREATE TABLE IF NOT EXISTS form_attachments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    form_id UUID REFERENCES forms(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    file_name VARCHAR(255) NOT NULL,
    original_name VARCHAR(255) NOT NULL,
    mime_type VARCHAR(100) NOT NULL,
    file_size INTEGER NOT NULL,
    file_path TEXT NOT NULL,
    storage_bucket VARCHAR(50) NOT NULL DEFAULT 'form-attachments',
    is_image BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_form_attachments_form_id ON form_attachments(form_id);
CREATE INDEX IF NOT EXISTS idx_form_attachments_user_id ON form_attachments(user_id);
CREATE INDEX IF NOT EXISTS idx_form_attachments_created_at ON form_attachments(created_at);

-- Enable RLS
ALTER TABLE form_attachments ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view all form attachments" ON form_attachments
    FOR SELECT
    USING (true);

CREATE POLICY "Users can insert attachments for their own forms" ON form_attachments
    FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own attachments" ON form_attachments
    FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own attachments" ON form_attachments
    FOR DELETE
    USING (auth.uid() = user_id);

CREATE POLICY "Admins can manage all attachments" ON form_attachments
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE id = auth.uid() 
            AND role IN ('admin', 'super_admin')
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM users 
            WHERE id = auth.uid() 
            AND role IN ('admin', 'super_admin')
        )
    );

-- Function to save file attachment
CREATE OR REPLACE FUNCTION save_form_attachment(
    p_form_id UUID,
    p_file_name VARCHAR(255),
    p_original_name VARCHAR(255),
    p_mime_type VARCHAR(100),
    p_file_size INTEGER,
    p_file_path TEXT,
    p_storage_bucket VARCHAR(50) DEFAULT 'form-attachments'
)
RETURNS UUID AS $$
DECLARE
    new_attachment_id UUID;
    is_image_file BOOLEAN;
BEGIN
    -- Check if user is authenticated
    IF auth.uid() IS NULL THEN
        RAISE EXCEPTION 'Authentication required';
    END IF;
    
    -- Determine if file is an image
    is_image_file := p_mime_type LIKE 'image/%';
    
    -- Insert attachment record
    INSERT INTO form_attachments (
        form_id,
        user_id,
        file_name,
        original_name,
        mime_type,
        file_size,
        file_path,
        storage_bucket,
        is_image
    ) VALUES (
        p_form_id,
        auth.uid(),
        p_file_name,
        p_original_name,
        p_mime_type,
        p_file_size,
        p_file_path,
        p_storage_bucket,
        is_image_file
    ) RETURNING id INTO new_attachment_id;
    
    RETURN new_attachment_id;
EXCEPTION
    WHEN OTHERS THEN
        RAISE EXCEPTION 'Failed to save attachment: %', SQLERRM;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to delete form attachment
CREATE OR REPLACE FUNCTION delete_form_attachment(p_attachment_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    -- Check if user owns the attachment or is admin
    IF NOT EXISTS (
        SELECT 1 FROM form_attachments 
        WHERE id = p_attachment_id 
        AND (
            user_id = auth.uid() 
            OR EXISTS (
                SELECT 1 FROM users 
                WHERE id = auth.uid() 
                AND role IN ('admin', 'super_admin')
            )
        )
    ) THEN
        RAISE EXCEPTION 'Access denied or attachment not found';
    END IF;
    
    -- Delete the attachment
    DELETE FROM form_attachments WHERE id = p_attachment_id;
    
    RETURN TRUE;
EXCEPTION
    WHEN OTHERS THEN
        RAISE EXCEPTION 'Failed to delete attachment: %', SQLERRM;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
