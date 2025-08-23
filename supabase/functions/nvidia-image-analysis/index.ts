// NVIDIA Görüntü Analizi Edge Function
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
        // Request'den görüntü URL'ini al
        const { imageUrl, analysisType = 'general' } = await req.json();

        if (!imageUrl) {
            throw new Error('Image URL is required');
        }

        // NVIDIA API anahtarını veritabanından al
        const { createClient } = await import('https://esm.sh/@supabase/supabase-js@2');
        const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
        const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
        const supabase = createClient(supabaseUrl, supabaseKey);

        const { data: apiKeyData, error: keyError } = await supabase
            .from('api_keys')
            .select('key_value')
            .eq('key_name', 'NVIDIA_API_KEY')
            .eq('is_active', true)
            .single();

        if (keyError || !apiKeyData) {
            throw new Error('NVIDIA API key not found');
        }

        // NVIDIA NIM API çağrısı - Vision Language Model (doğru endpoint)
        const nvidiaResponse = await fetch('https://ai.api.nvidia.com/v1/vlm/nvidia/neva-22b', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${apiKeyData.key_value}`,
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            body: JSON.stringify({
                messages: [
                    {
                        role: 'user',
                        content: `Bu görüntüyü analiz et ve şu bilgileri ver: ${analysisType === 'general' 
                            ? 'Görüntüde neler var, renk paleti, kalite, uygunluk düzeyi'
                            : 'PDF ise metin içeriği, görüntü ise OCR sonucu, dosya türü analizi'
                        }. Görüntü URL: ${imageUrl}`
                    }
                ],
                max_tokens: 500,
                temperature: 0.3
            })
        });

        if (!nvidiaResponse.ok) {
            const errorText = await nvidiaResponse.text();
            console.error('NVIDIA API Error:', errorText);
            throw new Error(`NVIDIA API error: ${nvidiaResponse.statusText}`);
        }

        const nvidiaResult = await nvidiaResponse.json();
        
        // Sonucu yapılandır
        const analysis = {
            success: true,
            analysisType,
            imageUrl,
            analysis: nvidiaResult.choices?.[0]?.message?.content || 'Analysis not available',
            confidence: 0.85, // Statik güven skoru
            timestamp: new Date().toISOString(),
            provider: 'NVIDIA-NIM'
        };

        return new Response(JSON.stringify(analysis), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
        
    } catch (error) {
        console.error('Image analysis error:', error);
        
        const errorResponse = {
            success: false,
            error: {
                code: 'IMAGE_ANALYSIS_ERROR',
                message: error.message || 'Failed to analyze image'
            }
        };

        return new Response(JSON.stringify(errorResponse), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
    }
});
