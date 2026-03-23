// api/grade.js
// ============================================
//  ULTIMATE FREE AI ROUTER — Gemini + Gemma + Groq
//  Total Capacity: ~72,500+ requests/day
// ============================================

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const { prompt, type } = req.body;

    const GEMINI_KEY = process.env.GEMINI_KEY;
    const GROQ_KEY = process.env.GROQ_KEY;

    if (!GEMINI_KEY) {
        return res.status(500).json({ error: 'Gemini API Key nicht gefunden. Prüfe die Vercel Env Vars.' });
    }

    // ===================================================
    //  1. BILD-LOGIK (unchanged)
    // ===================================================
    if (type === 'image') {
        try {
            const imageUrl = `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt + " professional medical illustration")}`;
            const imageResponse = await fetch(imageUrl);
            if (!imageResponse.ok) throw new Error('Bild-API Fehler');
            const buffer = await imageResponse.arrayBuffer();
            const base64Image = Buffer.from(buffer).toString('base64');
            return res.status(200).json({ imageUrl: `data:image/png;base64,${base64Image}` });
        } catch (error) {
            return res.status(500).json({ error: 'Bild-Generierung fehlgeschlagen.' });
        }
    }

    // ===================================================
    //  2. TEXT-LOGIK — MULTI-MODEL SMART ROTATION
    // ===================================================

    // All available providers in priority order:
    // Tier 1: Best quality first
    // Tier 2: High-volume fallbacks (Gemma = 14,400/day EACH)
    // Tier 3: Groq backup

    const providers = [
        // ---- TIER 1: Best Quality ----
        { name: 'Gemini 2.5 Flash',      type: 'google', model: 'gemini-2.5-flash-preview-04-17' },
        { name: 'Gemini 3 Flash',         type: 'google', model: 'gemini-3-flash' },
        { name: 'Gemini 3.1 Flash Lite',  type: 'google', model: 'gemini-3.1-flash-lite' },
        { name: 'Gemini 2.5 Flash Lite',  type: 'google', model: 'gemini-2.5-flash-lite-preview-06-17' },

        // ---- TIER 2: Groq (14,400/day) ----
        { name: 'Groq LLaMA 3.3 70B',    type: 'groq', model: 'llama-3.3-70b-versatile' },
        { name: 'Groq LLaMA 3.1 8B',     type: 'groq', model: 'llama-3.1-8b-instant' },

        // ---- TIER 3: Gemma Massive Pool (14,400/day EACH) ----
        { name: 'Gemma 3 27B',           type: 'google', model: 'gemma-3-27b-it' },
        { name: 'Gemma 3 12B',           type: 'google', model: 'gemma-3-12b-it' },
        { name: 'Gemma 3 4B',            type: 'google', model: 'gemma-3-4b-it' },
    ];

    // ---- Helper: Call Google (Gemini/Gemma) ----
    async function callGoogle(model, promptText) {
        const response = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${GEMINI_KEY}`,
            {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    contents: [{ parts: [{ text: promptText }] }],
                    generationConfig: {
                        temperature: 0.7,
                        maxOutputTokens: 8192,
                    }
                })
            }
        );

        if (!response.ok) {
            const status = response.status;
            const errorBody = await response.text().catch(() => '');
            throw new Error(`Google_${status}|${errorBody}`);
        }

        const data = await response.json();

        // Handle empty/blocked responses
        if (!data.candidates || !data.candidates[0]?.content?.parts?.[0]?.text) {
            throw new Error('Google_Empty_Response');
        }

        return data.candidates[0].content.parts[0].text;
    }

    // ---- Helper: Call Groq ----
    async function callGroq(model, promptText) {
        if (!GROQ_KEY) throw new Error('Groq_No_Key');

        const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${GROQ_KEY}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                model: model,
                messages: [{ role: 'user', content: promptText }],
                temperature: 0.7,
                max_tokens: 8192,
            })
        });

        if (!response.ok) {
            const status = response.status;
            throw new Error(`Groq_${status}`);
        }

        const data = await response.json();
        return data.choices[0].message.content;
    }

    // ===================================================
    //  MAIN LOOP: Try each provider until one works
    // ===================================================
    const errors = [];

    for (const provider of providers) {
        try {
            let resultText;

            if (provider.type === 'google') {
                resultText = await callGoogle(provider.model, prompt);
            } else if (provider.type === 'groq') {
                resultText = await callGroq(provider.model, prompt);
            }

            // ✅ SUCCESS — Return immediately
            console.log(`✅ ${provider.name} responded successfully.`);
            return res.status(200).json({
                text: resultText,
                source: provider.name,
                model: provider.model
            });

        } catch (error) {
            // ❌ FAILED — Log and try next provider
            console.warn(`⚠️ ${provider.name} failed: ${error.message}`);
            errors.push(`${provider.name}: ${error.message}`);
            continue;
        }
    }

    // ===================================================
    //  ALL PROVIDERS EXHAUSTED
    // ===================================================
    console.error('🚨 All providers failed:', errors);
    return res.status(503).json({
        error: 'Alle KI-Dienste sind derzeit überlastet. Bitte versuche es in einer Minute erneut.',
        details: errors,
    });
}
