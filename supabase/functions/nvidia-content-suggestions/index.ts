// NVIDIA İçerik Önerisi Edge Function
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
        const { 
            formType = 'general', 
            existingContent = '', 
            targetAudience = 'general',
            contentType = 'form_fields' 
        } = await req.json();

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

        // İçerik tipine göre prompt hazırla
        let systemPrompt = '';
        switch (contentType) {
            case 'form_fields':
                systemPrompt = `${formType} türünde bir form için uygun alan önerileri ver. ${targetAudience} kitlesi için Türkçe alan isimleri, placeholder metinleri ve yardım açıklamaları öner.`;
                break;
            case 'validation_messages':
                systemPrompt = 'Form doğrulama mesajları için kullanıcı dostu Türkçe uyarı ve hata mesajları öner.';
                break;
            case 'help_text':
                systemPrompt = 'Form alanları için açıklayıcı yardım metinleri ve kullanım ipuçları öner.';
                break;
            case 'completion':
                systemPrompt = 'Verilen metin parçasını mantıklı şekilde tamamla ve alternatifler öner.';
                break;
            default:
                systemPrompt = 'Form içeriği için genel öneriler ver.';
        }

        const userContent = existingContent ? 
            `Mevcut içerik: "${existingContent}"\n\nBu içerik için öneriler ver.` :
            'Yeni içerik önerileri ver.';

        // NVIDIA NIM API çağrısı (doğru endpoint)
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
                        content: userContent
                    }
                ],
                max_tokens: 800,
                temperature: 0.7 // Yaratıcılık için biraz daha yüksek
            })
        });

        if (!nvidiaResponse.ok) {
            const errorText = await nvidiaResponse.text();
            console.error('NVIDIA API Error:', errorText);
            throw new Error(`NVIDIA API error: ${nvidiaResponse.statusText}`);
        }

        const nvidiaResult = await nvidiaResponse.json();
        
        const suggestions = {
            success: true,
            formType,
            contentType,
            targetAudience,
            existingContent,
            suggestions: nvidiaResult.choices?.[0]?.message?.content || 'No suggestions available',
            timestamp: new Date().toISOString(),
            provider: 'NVIDIA-NIM'
        };

        return new Response(JSON.stringify(suggestions), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
        
    } catch (error) {
        console.error('Content suggestions error:', error);
        
        const errorResponse = {
            success: false,
            error: {
                code: 'CONTENT_SUGGESTIONS_ERROR',
                message: error.message || 'Failed to generate content suggestions'
            }
        };

        return new Response(JSON.stringify(errorResponse), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
    }
});
