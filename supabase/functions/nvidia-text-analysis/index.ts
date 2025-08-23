// NVIDIA Metin Analizi ve Düzeltme Edge Function
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
        const { text, analysisType = 'general', language = 'tr' } = await req.json();

        if (!text) {
            throw new Error('Text is required');
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

        // Analiz tipine göre prompt hazırla
        let systemPrompt = '';
        switch (analysisType) {
            case 'grammar':
                systemPrompt = 'Bu metni Türkçe dilbilgisi kurallarına göre düzelt ve iyileştir. Hataları ve önerilerini listele.';
                break;
            case 'sentiment':
                systemPrompt = 'Bu metnin duygusal tonunu analiz et (pozitif, negatif, nötr). Genel duygu durumunu ve öne çıkan temaları belirt.';
                break;
            case 'summarize':
                systemPrompt = 'Bu metni özetleyerek ana noktalarını çıkar. Önemli bilgileri koruyarak kısa ve öz bir özet hazırla.';
                break;
            case 'suggest':
                systemPrompt = 'Bu metin için iyileştirme önerileri ver. Daha etkili ve akıcı hale nasıl getirilebilir?';
                break;
            default:
                systemPrompt = 'Bu metni genel olarak analiz et: dilbilgisi, anlam bütünlüğü, ton ve iyileştirme önerilerini ver.';
        }

        // NVIDIA NIM API çağrısı - LLM (doğru endpoint)
        const nvidiaResponse = await fetch('https://integrate.api.nvidia.com/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${apiKeyData.key_value}`,
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            body: JSON.stringify({
                model: 'meta/llama-3.1-8b-instruct',
                messages: [
                    {
                        role: 'system',
                        content: systemPrompt
                    },
                    {
                        role: 'user',
                        content: text
                    }
                ],
                max_tokens: 1000,
                temperature: 0.3
            })
        });

        if (!nvidiaResponse.ok) {
            const errorText = await nvidiaResponse.text();
            console.error('NVIDIA API Error:', errorText);
            throw new Error(`NVIDIA API error: ${nvidiaResponse.statusText}`);
        }

        const nvidiaResult = await nvidiaResponse.json();
        
        const analysis = {
            success: true,
            originalText: text,
            analysisType,
            language,
            result: nvidiaResult.choices?.[0]?.message?.content || 'Analysis not available',
            timestamp: new Date().toISOString(),
            provider: 'NVIDIA-NIM',
            tokenUsage: nvidiaResult.usage || null
        };

        return new Response(JSON.stringify(analysis), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
        
    } catch (error) {
        console.error('Text analysis error:', error);
        
        const errorResponse = {
            success: false,
            error: {
                code: 'TEXT_ANALYSIS_ERROR',
                message: error.message || 'Failed to analyze text'
            }
        };

        return new Response(JSON.stringify(errorResponse), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
    }
});
