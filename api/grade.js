// api/grade.js
export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const { prompt, type } = req.body;
    const GEMINI_KEY = process.env.AI_API_KEY; 
    const GROQ_KEY = process.env.GROQ_API_KEY; 

    // --- 1. Bild-Logik (unverändert) ---
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

    // --- 2. Text-Logik mit Failover (Gemini -> Groq) ---
    
    // Versuch A: Google Gemini
    try {
        const geminiResponse = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_KEY}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] })
        });

        // Wenn Gemini Limit erreicht (429) oder Fehler hat, wirf Fehler für den Catch-Block
        if (!geminiResponse.ok) {
            console.warn(`Gemini fehlgeschlagen (Status ${geminiResponse.status}). Versuche Groq...`);
            throw new Error('Gemini_Limit');
        }

        const data = await geminiResponse.json();
        const aiText = data.candidates[0].content.parts[0].text;
        return res.status(200).json({ text: aiText, source: 'gemini' });

    } catch (error) {
        // VERSUCH B: Groq AI (als Backup)
        if (GROQ_KEY) {
            try {
                const groqResponse = await fetch('https://api.groq.com/openai/v1/chat/completions', {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${GROQ_KEY}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        model: "llama-3.3-70b-versatile", // Extrem schnelles Backup-Modell
                        messages: [{ role: "user", content: prompt }]
                    })
                });

                if (!groqResponse.ok) throw new Error('Groq_Limit');

                const groqData = await groqResponse.json();
                const groqText = groqData.choices[0].message.content;
                
                return res.status(200).json({ text: groqText, source: 'groq' });
            } catch (groqError) {
                return res.status(500).json({ error: 'Beide KI-Dienste sind derzeit überlastet.' });
            }
        }
        
        return res.status(500).json({ error: 'Gemini-Limit erreicht und kein Backup konfiguriert.' });
    }
}
