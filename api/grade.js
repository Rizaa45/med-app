// api/grade.js
// ============================================
//  ULTIMATE FREE AI ROUTER v3.0
//  Gemini + Gemma + Groq — Multi-Mode Engine
//  Modes: text | image | grade | lernheft | generate
//  Total Capacity: ~72,500+ requests/day
// ============================================

export default async function handler(req, res) {

  // ── CORS ─────────────────────────────────────────────────────
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const {
    // Legacy fields (backward compat)
    prompt,
    type,
    // New structured fields
    mode,
    model: preferredModel,
    question,
    sampleAnswer,
    userAnswer,
    keywords   = [],
    maxPoints  = 10,
    topic,
    moduleId,
    moduleName,
    sessionType,
  } = req.body || {};

  const GEMINI_KEY = process.env.GEMINI_KEY || process.env.GEMINI_API_KEY;
  const GROQ_KEY   = process.env.GROQ_KEY   || process.env.GROQ_API_KEY;

  if (!GEMINI_KEY) {
    return res.status(500).json({
      error: 'GEMINI_KEY nicht gefunden. Prüfe die Vercel Environment Variables.'
    });
  }

  // ════════════════════════════════════════════════════════════
  //  PROVIDER REGISTRY
  //  Priority order — best quality first, massive fallback pool
  // ════════════════════════════════════════════════════════════
  const PROVIDERS = [
    // Tier 1 — Best quality
    { name: 'Gemini 2.5 Flash',         type: 'google', model: 'gemini-2.5-flash-preview-04-17', maxTokens: 8192  },
    { name: 'Gemini 2.5 Flash Latest',  type: 'google', model: 'gemini-2.5-flash',               maxTokens: 8192  },
    { name: 'Gemini 2.5 Flash Lite',    type: 'google', model: 'gemini-2.5-flash-lite-preview-06-17', maxTokens: 8192 },
    // Tier 2 — Groq (fast, 14 400/day)
    { name: 'Groq LLaMA 3.3 70B',       type: 'groq',   model: 'llama-3.3-70b-versatile',        maxTokens: 8192  },
    { name: 'Groq LLaMA 3.1 8B',        type: 'groq',   model: 'llama-3.1-8b-instant',           maxTokens: 8192  },
    { name: 'Groq Gemma2 9B',           type: 'groq',   model: 'gemma2-9b-it',                   maxTokens: 8192  },
    // Tier 3 — Gemma pool (14 400/day EACH)
    { name: 'Gemma 3 27B',              type: 'google', model: 'gemma-3-27b-it',                 maxTokens: 8192  },
    { name: 'Gemma 3 12B',              type: 'google', model: 'gemma-3-12b-it',                 maxTokens: 8192  },
    { name: 'Gemma 3 4B',               type: 'google', model: 'gemma-3-4b-it',                  maxTokens: 4096  },
    { name: 'Gemma 3 1B',               type: 'google', model: 'gemma-3-1b-it',                  maxTokens: 2048  },
  ];

  // If caller requested a specific model, bump it to front
  function getProviders(preferFirst) {
    if (!preferFirst) return PROVIDERS;
    const idx = PROVIDERS.findIndex(p => p.model === preferFirst || p.name === preferFirst);
    if (idx <= 0) return PROVIDERS;
    const list = [...PROVIDERS];
    list.unshift(list.splice(idx, 1)[0]);
    return list;
  }

  // ════════════════════════════════════════════════════════════
  //  LOW-LEVEL CALLERS
  // ════════════════════════════════════════════════════════════
  async function callGoogle(model, promptText, maxTokens = 8192) {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${GEMINI_KEY}`;
    const r = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: promptText }] }],
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: maxTokens,
          topP: 0.95,
          topK: 40,
        },
        safetySettings: [
          { category: 'HARM_CATEGORY_HARASSMENT',        threshold: 'BLOCK_NONE' },
          { category: 'HARM_CATEGORY_HATE_SPEECH',       threshold: 'BLOCK_NONE' },
          { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_NONE' },
          { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_NONE' },
        ],
      }),
    });

    if (!r.ok) {
      const body = await r.text().catch(() => '');
      throw new Error(`Google_${r.status}|${body.slice(0, 300)}`);
    }

    const data = await r.json();
    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text) throw new Error('Google_Empty_Response');
    return text;
  }

  async function callGroq(model, promptText, maxTokens = 8192, systemPrompt = null) {
    if (!GROQ_KEY) throw new Error('Groq_No_Key');

    const messages = [];
    if (systemPrompt) messages.push({ role: 'system', content: systemPrompt });
    messages.push({ role: 'user', content: promptText });

    const r = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${GROQ_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model,
        messages,
        temperature: 0.7,
        max_tokens: Math.min(maxTokens, 8192),
        top_p: 0.9,
      }),
    });

    if (!r.ok) {
      const body = await r.text().catch(() => '');
      throw new Error(`Groq_${r.status}|${body.slice(0, 300)}`);
    }

    const data = await r.json();
    const text = data?.choices?.[0]?.message?.content;
    if (!text) throw new Error('Groq_Empty_Response');
    return text;
  }

  // ════════════════════════════════════════════════════════════
  //  UNIVERSAL RUNNER — tries providers until one works
  // ════════════════════════════════════════════════════════════
  async function runWithFallback(promptText, options = {}) {
    const {
      preferModel  = null,
      systemPrompt = null,
      maxTokens    = 8192,
    } = options;

    const providers = getProviders(preferModel);
    const errors    = [];

    for (const p of providers) {
      try {
        let text;
        if (p.type === 'google') {
          text = await callGoogle(p.model, promptText, Math.min(maxTokens, p.maxTokens));
        } else {
          text = await callGroq(p.model, promptText, Math.min(maxTokens, p.maxTokens), systemPrompt);
        }
        console.log(`✅ [${p.name}] responded OK`);
        return { text, source: p.name, model: p.model };
      } catch (err) {
        console.warn(`⚠️  [${p.name}] failed: ${err.message}`);
        errors.push(`${p.name}: ${err.message}`);
      }
    }

    throw new Error('ALL_PROVIDERS_FAILED|' + errors.join(' || '));
  }

  // ════════════════════════════════════════════════════════════
  //  UTILITY — strip markdown code fences from LLM output
  // ════════════════════════════════════════════════════════════
  function stripFences(raw) {
    return raw
      .trim()
      .replace(/^```(?:json|html|js|javascript)?\s*/i, '')
      .replace(/```\s*$/i, '')
      .trim();
  }

  function safeParseJSON(raw) {
    const cleaned = stripFences(raw);
    try {
      return JSON.parse(cleaned);
    } catch {
      // Try to extract first JSON object/array
      const match = cleaned.match(/(\{[\s\S]*\}|\[[\s\S]*\])/);
      if (match) return JSON.parse(match[1]);
      throw new Error('JSON parse failed');
    }
  }

  // ════════════════════════════════════════════════════════════
  //  MODE ROUTER
  // ════════════════════════════════════════════════════════════

  // Resolve effective mode — supports legacy `type` field
  const effectiveMode = mode || type || 'text';

  // ── IMAGE ─────────────────────────────────────────────────────
  if (effectiveMode === 'image') {
    try {
      const imageUrl = `https://image.pollinations.ai/prompt/${encodeURIComponent(
        (prompt || '') + ' professional medical illustration, clean, educational'
      )}`;
      const imgRes = await fetch(imageUrl);
      if (!imgRes.ok) throw new Error('Pollinations API error');
      const buffer = await imgRes.arrayBuffer();
      const b64    = Buffer.from(buffer).toString('base64');
      return res.status(200).json({ imageUrl: `data:image/png;base64,${b64}` });
    } catch (err) {
      return res.status(500).json({ error: 'Bild-Generierung fehlgeschlagen.', details: err.message });
    }
  }

  // ── TEXT (legacy / generic pass-through) ─────────────────────
  if (effectiveMode === 'text') {
    if (!prompt) return res.status(400).json({ error: 'prompt required' });
    try {
      const result = await runWithFallback(prompt, { preferModel: preferredModel });
      return res.status(200).json({ text: result.text, source: result.source, model: result.model });
    } catch (err) {
      return res.status(503).json({
        error: 'Alle KI-Dienste sind derzeit überlastet. Bitte versuche es gleich erneut.',
        details: err.message,
      });
    }
  }

  // ── LERNHEFT (Active Recall / Probeklausur AI feedback) ───────
  if (effectiveMode === 'lernheft') {
    const finalPrompt = prompt || buildLernheftPrompt(req.body);
    if (!finalPrompt) return res.status(400).json({ error: 'prompt required for lernheft mode' });

    const SYSTEM = `Du bist ein professioneller Pflegetutor für Auszubildende zur Pflegefachkraft (Generalistik) in Deutschland am BZPG Würselen. Antworte AUSSCHLIESSLICH auf Deutsch. Wenn du HTML erstellst, gib NUR reines HTML zurück — keine Markdown-Blöcke, keine Backticks, kein Kommentar außerhalb des HTMLs.`;

    try {
      const result = await runWithFallback(finalPrompt, {
        preferModel:  preferredModel || 'gemini-2.5-flash',
        systemPrompt: SYSTEM,
        maxTokens:    6000,
      });

      // Clean any accidental markdown fences the model added
      const html = stripFences(result.text);
      return res.status(200).json({ html, source: result.source, model: result.model });
    } catch (err) {
      return res.status(503).json({
        error: 'KI-Feedback konnte nicht generiert werden.',
        details: err.message,
      });
    }
  }

  // ── GRADE (single-answer scoring) ─────────────────────────────
  if (effectiveMode === 'grade') {
    if (!question || !userAnswer) {
      return res.status(400).json({ error: 'question and userAnswer are required for grade mode' });
    }

    const gradePrompt = buildGradePrompt({ question, sampleAnswer, userAnswer, keywords, maxPoints });

    try {
      const result = await runWithFallback(gradePrompt, {
        preferModel: preferredModel || 'gemini-2.5-flash',
        maxTokens:   1024,
      });
      const parsed = parseGradeResponse(result.text, maxPoints);
      return res.status(200).json({ ...parsed, source: result.source, model: result.model });
    } catch (err) {
      // Graceful fallback score so UI doesn't break
      return res.status(200).json({
        points:           Math.round(maxPoints * 0.5),
        percentage:       50,
        feedback:         'Automatische Bewertung vorübergehend nicht verfügbar. Bitte manuell prüfen.',
        correct:          [],
        missing:          [],
        keywords_used:    [],
        keywords_missing: keywords,
        source:           'fallback',
        model:            'none',
        error:            err.message,
      });
    }
  }

  // ── GENERATE (gap-fill: create new question for missing topic) ─
  if (effectiveMode === 'generate') {
    if (!topic) return res.status(400).json({ error: 'topic required for generate mode' });

    const genPrompt = buildGeneratePrompt({ topic, moduleId, moduleName });

    try {
      const result = await runWithFallback(genPrompt, {
        preferModel: preferredModel || 'gemini-2.5-flash',
        maxTokens:   1024,
      });
      const parsed = parseGeneratedQuestion(result.text);
      return res.status(200).json({ question: parsed, source: result.source, model: result.model });
    } catch (err) {
      return res.status(500).json({ error: 'Fragen-Generierung fehlgeschlagen.', details: err.message });
    }
  }

  // ── PRESENTATION / STUDIO ─────────────────────────────────────
  if (effectiveMode === 'presentation' || effectiveMode === 'studio') {
    if (!prompt) return res.status(400).json({ error: 'prompt required' });

    const SYSTEM = `Du bist ein Experte für medizinische Bildung und erstellst professionelle Präsentationen für die Pflegeausbildung in Deutschland. Antworte ausschließlich auf Deutsch.`;

    try {
      const result = await runWithFallback(prompt, {
        preferModel:  preferredModel || 'gemini-2.5-flash',
        systemPrompt: SYSTEM,
        maxTokens:    8192,
      });
      return res.status(200).json({ text: result.text, source: result.source, model: result.model });
    } catch (err) {
      return res.status(503).json({ error: 'Präsentation konnte nicht generiert werden.', details: err.message });
    }
  }

  // ── SUMMARY (module summary generation) ───────────────────────
  if (effectiveMode === 'summary') {
    if (!prompt) return res.status(400).json({ error: 'prompt required' });

    const SYSTEM = `Du bist ein Pflegeexperte und erstellst präzise, lernfreundliche Zusammenfassungen für Pflegefachkraft-Auszubildende in Deutschland. Antworte auf Deutsch.`;

    try {
      const result = await runWithFallback(prompt, {
        preferModel:  preferredModel || 'gemini-2.5-flash',
        systemPrompt: SYSTEM,
        maxTokens:    4096,
      });
      return res.status(200).json({ text: result.text, source: result.source, model: result.model });
    } catch (err) {
      return res.status(503).json({ error: 'Zusammenfassung fehlgeschlagen.', details: err.message });
    }
  }

  // ── UNKNOWN MODE ──────────────────────────────────────────────
  return res.status(400).json({
    error:           `Unbekannter Modus: "${effectiveMode}"`,
    supported_modes: ['text', 'image', 'grade', 'lernheft', 'generate', 'presentation', 'summary'],
  });
}

// ══════════════════════════════════════════════════════════════════
//  PROMPT BUILDERS
// ══════════════════════════════════════════════════════════════════

function buildLernheftPrompt(body) {
  const { pairs, sessionType: sType } = body;
  if (!pairs || !Array.isArray(pairs) || pairs.length === 0) return null;

  return `Du bist ein professioneller Pflegetutor für Auszubildende zur Pflegefachkraft (Generalistik) in Deutschland am BZPG Würselen.

Analysiere die folgenden Fragen und Antworten des Lernenden und erstelle ein detailliertes, strukturiertes Lernheft als REINES HTML.

WICHTIG: Gib NUR HTML zurück. Keine Markdown-Blöcke, keine Backticks, kein Text außerhalb des HTMLs.

SESSION-TYP: ${sType || 'Lerneinheit'}

HTML-ANFORDERUNGEN:
- Verwende: <div>, <h2>, <h3>, <p>, <ul>, <li>, <strong>, <span>, <hr>
- Für korrekte Aspekte: ✅ in <span style="color:#4ade80">
- Für Lücken: ❌ in <span style="color:#f87171"> mit Erklärung was fehlt
- Section "💡 Lernempfehlungen" am Ende mit konkreten Themen zum Wiederholen
- Section "📊 Zusammenfassung" ganz oben mit Gesamtbewertung in 2-3 Sätzen
- Ton: ermutigend, professionell, medizinisch präzise
- Sprache: Deutsch

FRAGEN & ANTWORTEN:
${pairs.map((p, i) => `
--- Frage ${i + 1} [${p.moduleName || 'Allgemein'}] ---
Frage:        ${p.question}
Musterantwort: ${p.sampleAnswer || 'nicht angegeben'}
Nutzerantwort: ${p.userAnswer || '(keine Antwort gegeben)'}
Keywords:      ${(p.keywords || []).join(', ') || 'keine'}
`).join('\n')}

Erstelle jetzt das vollständige HTML-Lernheft:`;
}

function buildGradePrompt({ question, sampleAnswer, userAnswer, keywords, maxPoints }) {
  return `Du bist ein professioneller Pflegetutor und bewertest die Antwort eines Auszubildenden zur Pflegefachkraft (Generalistik) in Deutschland.

FRAGE:
${question}

MUSTERANTWORT:
${sampleAnswer || 'keine Musterantwort angegeben'}

SCHLÜSSELBEGRIFFE: ${keywords.length ? keywords.join(', ') : 'keine'}

ANTWORT DES LERNENDEN:
${userAnswer}

MAXIMALE PUNKTZAHL: ${maxPoints}

BEWERTUNGSANWEISUNG:
Bewerte objektiv nach diesen Kriterien:
  - Fachliche Korrektheit   50%
  - Vollständigkeit          30%
  - Fachbegriffe             20%

Antworte AUSSCHLIESSLICH mit einem JSON-Objekt. Kein Text davor oder danach, keine Markdown-Blöcke.

JSON-FORMAT:
{
  "points": <integer 0–${maxPoints}>,
  "percentage": <integer 0–100>,
  "feedback": "<2–3 Sätze konstruktives Feedback auf Deutsch>",
  "correct": ["<korrekt genannter Aspekt>", ...],
  "missing": ["<fehlender Aspekt>", ...],
  "keywords_used": ["<verwendeter Fachbegriff>", ...],
  "keywords_missing": ["<fehlender Fachbegriff>", ...]
}`;
}

function buildGeneratePrompt({ topic, moduleId, moduleName }) {
  return `Du bist ein Pflegeexperte und erstellst eine Prüfungsfrage für Auszubildende zur Pflegefachkraft (Generalistik) in Deutschland.

THEMA: ${topic}
MODUL: ${moduleName || `Modul ${moduleId || '?'}`}

Erstelle eine realistische Prüfungsfrage.
Antworte AUSSCHLIESSLICH mit einem JSON-Objekt. Kein Text davor oder danach, keine Markdown-Blöcke.

JSON-FORMAT:
{
  "question": "<klare, prüfungsreife Frage>",
  "sampleAnswer": "<ausführliche Musterantwort, 3–5 Sätze>",
  "keywords": ["<keyword1>", "<keyword2>", "<keyword3>", "<keyword4>", "<keyword5>"],
  "points": 10,
  "difficulty": "<leicht|mittel|schwer>",
  "topic": "${topic}",
  "generated": true
}`;
}

// ══════════════════════════════════════════════════════════════════
//  RESPONSE PARSERS
// ══════════════════════════════════════════════════════════════════

function parseGradeResponse(raw, maxPoints) {
  try {
    const parsed = safeParseJSON(raw);
    return {
      points:           clamp(Number(parsed.points)     || 0, 0, maxPoints),
      percentage:       clamp(Number(parsed.percentage) || 0, 0, 100),
      feedback:         String(parsed.feedback          || 'Keine Rückmeldung verfügbar.'),
      correct:          toArray(parsed.correct),
      missing:          toArray(parsed.missing),
      keywords_used:    toArray(parsed.keywords_used),
      keywords_missing: toArray(parsed.keywords_missing),
    };
  } catch (err) {
    console.error('parseGradeResponse failed:', err.message, '| raw:', raw.slice(0, 400));
    return {
      points:           Math.round(maxPoints * 0.5),
      percentage:       50,
      feedback:         'Bewertung konnte nicht verarbeitet werden.',
      correct:          [],
      missing:          [],
      keywords_used:    [],
      keywords_missing: [],
    };
  }
}

function parseGeneratedQuestion(raw) {
  try {
    const parsed = safeParseJSON(raw);
    return {
      question:     String(parsed.question     || ''),
      sampleAnswer: String(parsed.sampleAnswer || ''),
      keywords:     toArray(parsed.keywords),
      points:       Number(parsed.points)      || 10,
      difficulty:   String(parsed.difficulty   || 'mittel'),
      topic:        String(parsed.topic        || ''),
      generated:    true,
    };
  } catch (err) {
    throw new Error('Could not parse generated question: ' + err.message);
  }
}

// ── Helpers ───────────────────────────────────────────────────────
function safeParseJSON(raw) {
  const cleaned = raw
    .trim()
    .replace(/^```(?:json|js|javascript|html)?\s*/i, '')
    .replace(/```\s*$/i, '')
    .trim();
  try {
    return JSON.parse(cleaned);
  } catch {
    const match = cleaned.match(/(\{[\s\S]*\}|\[[\s\S]*\])/);
    if (match) return JSON.parse(match[1]);
    throw new Error('JSON parse failed on: ' + cleaned.slice(0, 200));
  }
}

function stripFences(raw) {
  return raw
    .trim()
    .replace(/^```(?:json|html|js|javascript)?\s*/i, '')
    .replace(/```\s*$/i, '')
    .trim();
}

function clamp(val, min, max) {
  return Math.min(max, Math.max(min, val));
}

function toArray(val) {
  if (Array.isArray(val)) return val.map(String);
  if (typeof val === 'string' && val.trim()) return [val];
  return [];
}
