export const config = {
  runtime: 'edge', // Macht die Antwort extrem schnell
};

export default async function handler(req) {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json',
  };

  if (req.method === 'OPTIONS') return new Response(null, { headers, status: 204 });

  try {
    const { prompt } = await req.json();
    const API_KEY = process.env.GEMINI_API_KEY;

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
        }),
      }
    );

    const data = await response.json();
    const aiText = data.candidates[0].content.parts[0].text;

    return new Response(JSON.stringify({ text: aiText }), { headers, status: 200 });
  } catch (error) {
    return new Response(JSON.stringify({ error: "KI-Fehler" }), { headers, status: 500 });
  }
}
