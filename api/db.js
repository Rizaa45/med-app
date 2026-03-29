// api/db.js
// Sichere Proxy-Route für JSONBin.io - Keys bleiben im Vercel Backend!

export default async function handler(req, res) {
    // Erlaubt CORS, falls deine Github Pages URL auf die Vercel API zugreift
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const { action, binId, data } = req.body;
    
    // Holt die sicheren Keys aus den Vercel Environment Variables
    const API_KEY = process.env.JSONBIN_KEY;
    const MASTER_BIN = process.env.JSONBIN_MASTER_ID;
    const BASE_URL = 'https://api.jsonbin.io/v3/b';

    if (!API_KEY || !MASTER_BIN) {
        return res.status(500).json({ error: 'Datenbank-Keys nicht in Vercel konfiguriert.' });
    }

    // Standard-Header für JSONBin, die bei jedem Request mitgeschickt werden
    const headers = {
        'Content-Type': 'application/json',
        'X-Master-Key': API_KEY
    };

    try {
        // 1. Master-Bin abrufen (Um zu prüfen, wem welcher PIN gehört)
        if (action === 'get_master') {
            const response = await fetch(`${BASE_URL}/${MASTER_BIN}/latest`, { headers });
            const json = await response.json();
            return res.status(200).json(json.record);
        }
        
        // 2. Master-Bin updaten (Wenn sich ein neuer User registriert)
        else if (action === 'update_master') {
            const response = await fetch(`${BASE_URL}/${MASTER_BIN}`, {
                method: 'PUT', headers, body: JSON.stringify(data)
            });
            const json = await response.json();
            return res.status(200).json(json);
        }
        
        // 3. Neuen User anlegen (Erstellt ein neues Bin für den User)
        else if (action === 'create_user') {
            headers['X-Bin-Private'] = 'false';
            const response = await fetch(BASE_URL, {
                method: 'POST', headers, body: JSON.stringify(data)
            });
            const json = await response.json();
            return res.status(200).json({ id: json.metadata.id });
        }
        
        // 4. User-Daten abrufen (Beim Login)
        else if (action === 'get_user') {
            const response = await fetch(`${BASE_URL}/${binId}/latest`, { headers });
            const json = await response.json();
            return res.status(200).json(json.record);
        }
        
        // 5. User-Daten speichern (Auto-Save Fortschritt)
        else if (action === 'update_user') {
            const response = await fetch(`${BASE_URL}/${binId}`, {
                method: 'PUT', headers, body: JSON.stringify(data)
            });
            const json = await response.json();
            return res.status(200).json(json);
        }
        
        else {
            return res.status(400).json({ error: 'Unbekannte Datenbank-Aktion' });
        }

    } catch (error) {
        console.error("DB Error:", error);
        return res.status(500).json({ error: 'Verbindungsfehler zur Datenbank.' });
    }
}
