// api/grade.js
export default async function handler(req, res) {
    // Nur POST-Anfragen erlauben
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const { prompt } = req.body;
    
    // Deinen API-Key holen wir sicher aus den Umgebungsvariablen von Vercel
    const API_KEY = process.env.AI_API_KEY; 

    if (!API_KEY) {
        return res.status(500).json({ error: 'API Key nicht konfiguriert.' });
    }

    try {
        // Wir nutzen die Google Gemini API (v1beta)
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${API_KEY}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                contents: [{
                    parts: [{ text: prompt }]
                }]
            })
        });

        const data = await response.json();

        // Extrahiere den Text aus der Gemini-Antwortstruktur
        if (data.candidates && data.candidates[0].content && data.candidates[0].content.parts) {
            const aiText = data.candidates[0].content.parts[0].text;
            return res.status(200).json({ text: aiText });
        } else {
            console.error("API Error Data:", data);
            return res.status(500).json({ error: 'Unerwartete Antwort von der KI-Schnittstelle.' });
        }

    } catch (error) {
        console.error("Fetch Error:", error);
        return res.status(500).json({ error: 'Verbindung zur KI fehlgeschlagen.' });
    }
}
