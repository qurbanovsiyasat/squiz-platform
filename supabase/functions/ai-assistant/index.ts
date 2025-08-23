Deno.serve(async (req) => {
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, GET, OPTIONS, PUT, DELETE, PATCH',
    'Access-Control-Max-Age': '86400',
    'Access-Control-Allow-Credentials': 'false'
  }

  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 200, headers: corsHeaders })
  }

  try {
    // API anahtarını environment'dan al
    const geminiApiKey = Deno.env.get('GEMINI_API_KEY')
    if (!geminiApiKey) {
      throw new Error('GEMINI_API_KEY environment variable is not set')
    }

    // Request body'yi parse et
    const requestData = await req.json()
    const { message, messages, model = 'gemini-2.0-flash' } = requestData

    // Mesajları Google Gemini format'ına çevir
    let contents = []
    
    if (messages && Array.isArray(messages)) {
      // Çoklu mesaj desteği (chat history)
      contents = messages.map(msg => ({
        role: msg.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: msg.content }]
      }))
    } else if (message) {
      // Tek mesaj
      contents = [{
        role: 'user',
        parts: [{ text: message }]
      }]
    } else {
      throw new Error('Message or messages parameter is required')
    }

    // Google Gemini API'ye istek gönder
    const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${geminiApiKey}`
    
    const response = await fetch(geminiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        contents: contents,
        generationConfig: {
          temperature: 0.7,
          topK: 40,
          topP: 0.95,
          maxOutputTokens: 1024
        },
        safetySettings: [
          {
            category: 'HARM_CATEGORY_HARASSMENT',
            threshold: 'BLOCK_MEDIUM_AND_ABOVE'
          },
          {
            category: 'HARM_CATEGORY_HATE_SPEECH',
            threshold: 'BLOCK_MEDIUM_AND_ABOVE'
          },
          {
            category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT',
            threshold: 'BLOCK_MEDIUM_AND_ABOVE'
          },
          {
            category: 'HARM_CATEGORY_DANGEROUS_CONTENT',
            threshold: 'BLOCK_MEDIUM_AND_ABOVE'
          }
        ]
      })
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error('Gemini API Error:', errorText)
      throw new Error(`Gemini API error: ${response.status} - ${errorText}`)
    }

    const geminiResponse = await response.json()
    
    // Response'u kontrol et
    if (!geminiResponse.candidates || geminiResponse.candidates.length === 0) {
      throw new Error('No response candidates from Gemini API')
    }

    const candidate = geminiResponse.candidates[0]
    if (!candidate.content || !candidate.content.parts || candidate.content.parts.length === 0) {
      throw new Error('Invalid response structure from Gemini API')
    }

    const responseText = candidate.content.parts[0].text

    // OpenAI benzeri format'ta response döndür (uyumluluk için)
    const formattedResponse = {
      id: `gemini-${Date.now()}`,
      object: 'chat.completion',
      created: Math.floor(Date.now() / 1000),
      model: model,
      choices: [{
        index: 0,
        message: {
          role: 'assistant',
          content: responseText
        },
        finish_reason: candidate.finishReason || 'stop'
      }],
      usage: {
        prompt_tokens: geminiResponse.usageMetadata?.promptTokenCount || 0,
        completion_tokens: geminiResponse.usageMetadata?.candidatesTokenCount || 0,
        total_tokens: geminiResponse.usageMetadata?.totalTokenCount || 0
      },
      provider: 'google-gemini',
      timestamp: new Date().toISOString()
    }

    return new Response(JSON.stringify(formattedResponse), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })

  } catch (error) {
    console.error('AI Assistant Error:', error)
    
    const errorResponse = {
      error: {
        code: 'AI_ASSISTANT_ERROR',
        message: error.message || 'AI asistan çağrısı başarısız oldu',
        provider: 'google-gemini',
        timestamp: new Date().toISOString()
      }
    }

    return new Response(JSON.stringify(errorResponse), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})
