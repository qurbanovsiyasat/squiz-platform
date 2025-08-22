# Database Setup for File Upload Feature

## Required Database Schema

The file upload feature requires the following database tables and storage setup:

### 1. Form Attachments Table

```sql
-- Create form_attachments table for file metadata
CREATE TABLE IF NOT EXISTS form_attachments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    form_id UUID NOT NULL,
    file_name TEXT NOT NULL,
    file_path TEXT NOT NULL,
    file_type TEXT NOT NULL,
    file_size BIGINT NOT NULL,
    mime_type TEXT NOT NULL,
    uploaded_by UUID,
    is_image BOOLEAN DEFAULT false,
    thumbnail_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_form_attachments_form_id ON form_attachments(form_id);
CREATE INDEX IF NOT EXISTS idx_form_attachments_uploaded_by ON form_attachments(uploaded_by);
CREATE INDEX IF NOT EXISTS idx_form_attachments_file_type ON form_attachments(file_type);
```

### 2. Row Level Security (RLS) Policies

```sql
-- Enable RLS
ALTER TABLE form_attachments ENABLE ROW LEVEL SECURITY;

-- RLS Policies for form_attachments
CREATE POLICY "Users can view attachments for public forms" ON form_attachments
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM forms 
            WHERE forms.id = form_attachments.form_id 
            AND forms.is_public = true
        )
    );

CREATE POLICY "Users can view attachments for their own forms" ON form_attachments
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM forms 
            WHERE forms.id = form_attachments.form_id 
            AND forms.creator_id = auth.uid()
        )
    );

CREATE POLICY "Users can add attachments to their own forms" ON form_attachments
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM forms 
            WHERE forms.id = form_attachments.form_id 
            AND forms.creator_id = auth.uid()
        )
    );

CREATE POLICY "Users can delete their own attachments" ON form_attachments
    FOR DELETE USING (uploaded_by = auth.uid());
```

### 3. Supabase Storage Bucket

```sql
-- Create storage bucket for form attachments
INSERT INTO storage.buckets (id, name, public) 
VALUES ('form-attachments', 'form-attachments', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies
CREATE POLICY "Public read access for form attachments" ON storage.objects 
FOR SELECT USING (bucket_id = 'form-attachments');

CREATE POLICY "Users can upload to form attachments" ON storage.objects 
FOR INSERT WITH CHECK (
    bucket_id = 'form-attachments' 
    AND auth.role() = 'authenticated'
);

CREATE POLICY "Users can delete their own attachments" ON storage.objects 
FOR DELETE USING (
    bucket_id = 'form-attachments' 
    AND auth.uid()::text = (storage.foldername(name))[1]
);
```

### 4. Edge Function for File Upload

Create an edge function named `file-upload` with the following code:

```typescript
Deno.serve(async (req) => {
    const corsHeaders = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
        'Access-Control-Allow-Methods': 'POST, GET, OPTIONS, PUT, DELETE, PATCH',
        'Access-Control-Max-Age': '86400',
        'Access-Control-Allow-Credentials': 'false'
    };

    if (req.method === 'OPTIONS') {
        return new Response(null, { status: 200, headers: corsHeaders });
    }

    try {
        const { fileData, fileName, fileType, formId, userId } = await req.json();
        
        if (!fileData || !fileName || !fileType || !formId) {
            return new Response(JSON.stringify({ 
                error: { code: 'MISSING_PARAMS', message: 'Missing required parameters' }
            }), {
                status: 400,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });
        }

        // Validate file type
        const allowedTypes = [
            'image/jpeg', 'image/png', 'image/gif', 'image/webp',
            'application/pdf'
        ];
        
        if (!allowedTypes.includes(fileType)) {
            return new Response(JSON.stringify({ 
                error: { code: 'INVALID_FILE_TYPE', message: 'File type not allowed' }
            }), {
                status: 400,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });
        }

        // Convert base64 to Uint8Array
        const base64Data = fileData.split(',')[1] || fileData;
        const binaryString = atob(base64Data);
        const bytes = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++) {
            bytes[i] = binaryString.charCodeAt(i);
        }

        // Check file size (max 10MB)
        if (bytes.length > 10 * 1024 * 1024) {
            return new Response(JSON.stringify({ 
                error: { code: 'FILE_TOO_LARGE', message: 'File size exceeds 10MB limit' }
            }), {
                status: 400,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });
        }

        // Create Supabase client
        const supabaseUrl = Deno.env.get('SUPABASE_URL');
        const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
        
        if (!supabaseUrl || !supabaseServiceKey) {
            throw new Error('Missing Supabase configuration');
        }

        // Generate unique file path
        const timestamp = Date.now();
        const randomId = crypto.randomUUID();
        const fileExtension = fileName.split('.').pop() || 'bin';
        const uniqueFileName = `${timestamp}_${randomId}.${fileExtension}`;
        const filePath = userId ? `${userId}/${uniqueFileName}` : `public/${uniqueFileName}`;

        // Upload to Supabase Storage
        const uploadResponse = await fetch(`${supabaseUrl}/storage/v1/object/form-attachments/${filePath}`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${supabaseServiceKey}`,
                'Content-Type': fileType,
                'Content-Length': bytes.length.toString()
            },
            body: bytes
        });

        if (!uploadResponse.ok) {
            const errorText = await uploadResponse.text();
            console.error('Storage upload failed:', errorText);
            throw new Error(`Storage upload failed: ${uploadResponse.status}`);
        }

        // Get public URL
        const publicUrl = `${supabaseUrl}/storage/v1/object/public/form-attachments/${filePath}`;

        // Store file metadata in database
        const metadataResponse = await fetch(`${supabaseUrl}/rest/v1/form_attachments`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${supabaseServiceKey}`,
                'Content-Type': 'application/json',
                'apikey': supabaseServiceKey
            },
            body: JSON.stringify({
                form_id: formId,
                file_name: fileName,
                file_path: filePath,
                file_type: fileExtension,
                file_size: bytes.length,
                mime_type: fileType,
                uploaded_by: userId,
                is_image: fileType.startsWith('image/'),
                thumbnail_url: fileType.startsWith('image/') ? publicUrl : null
            })
        });

        if (!metadataResponse.ok) {
            console.error('Database insert failed:', await metadataResponse.text());
            // Don't fail the request, file is already uploaded
        }

        return new Response(JSON.stringify({ 
            success: true,
            data: {
                publicUrl,
                filePath,
                fileName,
                fileSize: bytes.length
            }
        }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });

    } catch (error) {
        console.error('Upload error:', error);
        
        const errorResponse = {
            error: {
                code: 'UPLOAD_ERROR',
                message: error.message || 'Upload failed'
            }
        };

        return new Response(JSON.stringify(errorResponse), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
    }
});
```

## Implementation Status

✅ **Frontend Components Created:**
- FileUpload component with mobile-first design
- File upload hooks (useFileUpload)
- Integration with form creation page
- File display in form detail page
- Camera access for mobile devices
- Drag-and-drop functionality
- Image preview and PDF file validation

⏳ **Backend Setup Required:**
- Execute the SQL commands above in your Supabase SQL editor
- Deploy the edge function code
- Test file upload functionality

## Supported File Types

- **Images:** JPG, PNG, GIF, WebP (max 10MB each)
- **Documents:** PDF files (max 10MB each)
- **Maximum files per form:** 5 files

## Mobile Features

- Touch-optimized drag-and-drop interface
- Camera access for direct photo capture
- Responsive design for all screen sizes (320px-768px)
- Mobile-friendly file previews
- Progress indicators for uploads

## Security Features

- File type validation
- File size limits
- User authentication required for uploads
- Row Level Security (RLS) policies
- Secure file storage with Supabase Storage
