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

        // Create Supabase client configuration
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

        // First, ensure the bucket exists or use existing one
        let bucketId = 'form-attachments';
        
        // Try creating bucket if it doesn't exist
        try {
            await fetch(`${supabaseUrl}/storage/v1/bucket`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${supabaseServiceKey}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    id: bucketId,
                    name: bucketId,
                    public: true,
                    file_size_limit: 10485760,
                    allowed_mime_types: ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'application/pdf']
                })
            });
        } catch (e) {
            // Bucket might already exist, continue
            console.log('Bucket creation skipped:', e.message);
        }

        // If form-attachments bucket doesn't exist, fallback to images bucket
        const buckets = await fetch(`${supabaseUrl}/storage/v1/bucket`, {
            headers: { 'Authorization': `Bearer ${supabaseServiceKey}` }
        });
        const bucketList = await buckets.json();
        const formBucketExists = bucketList.some(b => b.id === 'form-attachments');
        
        if (!formBucketExists) {
            bucketId = 'images'; // Fallback to existing bucket
        }

        // Upload to Supabase Storage
        const uploadResponse = await fetch(`${supabaseUrl}/storage/v1/object/${bucketId}/${filePath}`, {
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
        const publicUrl = `${supabaseUrl}/storage/v1/object/public/${bucketId}/${filePath}`;

        // Try to create the form_attachments table if it doesn't exist
        try {
            await fetch(`${supabaseUrl}/rest/v1/rpc/create_table_if_not_exists`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${supabaseServiceKey}`,
                    'Content-Type': 'application/json',
                    'apikey': supabaseServiceKey
                },
                body: JSON.stringify({
                    table_name: 'form_attachments',
                    schema: 'CREATE TABLE IF NOT EXISTS form_attachments (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), form_id UUID NOT NULL, file_name TEXT NOT NULL, file_path TEXT NOT NULL, file_type TEXT NOT NULL, file_size BIGINT NOT NULL, mime_type TEXT NOT NULL, uploaded_by UUID, is_image BOOLEAN DEFAULT false, thumbnail_url TEXT, created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(), updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW());'
                })
            });
        } catch (e) {
            console.log('Table creation attempted:', e.message);
        }

        // Try to store file metadata in database
        try {
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
        } catch (dbError) {
            console.error('Database operation failed:', dbError);
            // Continue anyway, file is uploaded successfully
        }

        return new Response(JSON.stringify({ 
            success: true,
            data: {
                publicUrl,
                filePath,
                fileName,
                fileSize: bytes.length,
                bucketUsed: bucketId
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