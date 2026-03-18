// api/grade.js
export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const { prompt, type } = req.body; // 'type' ist neu, um zwischen Text und Bild zu unterscheiden
    const API_KEY = process.env.AI_API_KEY; 

    if (!API_KEY) {
        return res.status(500).json({ error: 'API Key nicht konfiguriert.' });
    }

    // --- NEU: Logik für Bild-Generierung ---
    if (type === 'image') {
        try {
            const imageUrl = `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt + " professional medical illustration")}`;
            const imageResponse = await fetch(imageUrl);

            if (!imageResponse.ok) {
                return res.status(500).json({ error: 'Bild-Generierung fehlgeschlagen.' });
            }

            // Wir wandeln das Bild in Base64 um, um es CORS-sicher zu machen
            const buffer = await imageResponse.arrayBuffer();
            const base64Image = Buffer.from(buffer).toString('base64');
            const dataUrl = `data:image/png;base64,${base64Image}`;

            return res.status(200).json({ imageUrl: dataUrl });
        } catch (error) {
            console.error("Image Fetch Error:", error);
            return res.status(500).json({ error: 'Verbindung zur Bild-API fehlgeschlagen.' });
        }
    }

    // --- BESTEHEND: Logik für Text-Generierung ---
    try {
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${API_KEY}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] })
        });

        const data = await response.json();

        if (data.candidates && data.candidates[0].content && data.candidates[0].content.parts) {
            const aiText = data.candidates[0].content.parts[0].text;
            return res.status(200).json({ text: aiText });
        } else {
            return res.status(500).json({ error: 'Unerwartete Antwort von der KI.' });
        }
    } catch (error) {
        return res.status(500).json({ error: 'Verbindung zur KI fehlgeschlagen.' });
    }
}
