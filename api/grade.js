// api/grade.js
// ============================================
//  ULTIMATE FREE AI ROUTER v3.1
//  Gemini + Gemma + Groq — Multi-Mode Engine
//  Modes: text | image | grade | lernheft | generate | presentation | summary
//  Data: data/question-banks/moduleX_questions.json
//        data/moduleXsummariesunitY.json
//  Total Capacity: ~72,500+ requests/day
// ============================================

export default async function handler(req, res) {

  // ── CORS ──────────────────────────────────────────────────────
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const {
    prompt,
    type,
    mode,
    model:       preferredModel,
    question,
    sampleAnswer,
    userAnswer,
    keywords     = [],
    maxPoints    = 10,
    topic,
    moduleId,
    moduleName,
    sessionType,
    pairs,
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
  // ════════════════════════════════════════════════════════════
  const PROVIDERS = [
    { name: 'Gemini 2.5 Flash',        type: 'google', model: 'gemini-2.5-flash-preview-04-17', maxTokens: 8192 },
    { name: 'Gemini 2.5 Flash Latest', type: 'google', model: 'gemini-2.5-flash',               maxTokens: 8192 },
    { name: 'Gemini 2.5 Flash Lite',   type: 'google', model: 'gemini-2.5-flash-lite-preview-06-17', maxTokens: 8192 },
    { name: 'Groq LLaMA 3.3 70B',      type: 'groq',   model: 'llama-3.3-70b-versatile',        maxTokens: 8192 },
    { name: 'Groq LLaMA 3.1 8B',       type: 'groq',   model: 'llama-3.1-8b-instant',           maxTokens: 8192 },
    { name: 'Groq Gemma2 9B',          type: 'groq',   model: 'gemma2-9b-it',                   maxTokens: 8192 },
    { name: 'Gemma 3 27B',             type: 'google', model: 'gemma-3-27b-it',                 maxTokens: 8192 },
    { name: 'Gemma 3 12B',             type: 'google', model: 'gemma-3-12b-it',                 maxTokens: 8192 },
    { name: 'Gemma 3 4B',              type: 'google', model: 'gemma-3-4b-it',                  maxTokens: 4096 },
    { name: 'Gemma 3 1B',              type: 'google', model: 'gemma-3-1b-it',                  maxTokens: 2048 },
  ];

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
  //  UNIVERSAL RUNNER
  // ════════════════════════════════════════════════════════════
  async function runWithFallback(promptText, options = {}) {
    const { preferModel = null, systemPrompt = null, maxTokens = 8192 } = options;
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
        console.log(`✅ [${p.name}] OK`);
        return { text, source: p.name, model: p.model };
      } catch (err) {
        console.warn(`⚠️  [${p.name}] failed: ${err.message}`);
        errors.push(`${p.name}: ${err.message}`);
      }
    }
    throw new Error('ALL_PROVIDERS_FAILED | ' + errors.join(' || '));
  }

  // ════════════════════════════════════════════════════════════
  //  UTILITIES
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
    try { return JSON.parse(cleaned); } catch { /* fall through */ }
    const match = cleaned.match(/(\{[\s\S]*\}|\[[\s\S]*\])/);
    if (match) return JSON.parse(match[1]);
    throw new Error('JSON parse failed on: ' + cleaned.slice(0, 200));
  }

  function clamp(val, min, max) { return Math.min(max, Math.max(min, val)); }
  function toArray(val) {
    if (Array.isArray(val)) return val.map(String);
    if (typeof val === 'string' && val.trim()) return [val];
    return [];
  }

  // ════════════════════════════════════════════════════════════
  //  QUESTION NORMALIZER
  //  Handles BOTH JSON formats:
  //
  //  Format A (question-banks):          Format B (old style):
  //  { q_id, type, statement, answer,    { question, sampleAnswer,
  //    explanation, topic, difficulty }     keywords, points }
  //
  // ════════════════════════════════════════════════════════════
  function normalizeQuestion(raw, modId, modName) {
    // Already in new format?
    if (raw.question && raw.sampleAnswer) {
      return {
        question:     String(raw.question),
        sampleAnswer: String(raw.sampleAnswer),
        keywords:     toArray(raw.keywords),
        points:       Number(raw.points)  || 10,
        difficulty:   String(raw.difficulty || 'mittel'),
        topic:        String(raw.topic    || ''),
        moduleId:     modId,
        moduleName:   modName,
        type:         raw.type || 'freitext',
      };
    }

    // Format A: richtig_falsch or multiple choice from question-banks
    if (raw.statement) {
      // Build a proper sampleAnswer from the explanation
      const isRF      = raw.type === 'richtig_falsch';
      const answerStr = raw.answer != null ? String(raw.answer) : '';
      let sampleAnswer = '';

      if (isRF) {
        const correct = answerStr.toLowerCase() === 'richtig' ? 'RICHTIG' : 'FALSCH';
        sampleAnswer  = `Die Aussage ist ${correct}. ${raw.explanation || ''}`.trim();
      } else if (raw.correct_answer != null) {
        sampleAnswer  = `Richtige Antwort: ${raw.correct_answer}. ${raw.explanation || ''}`.trim();
      } else {
        sampleAnswer  = raw.explanation || answerStr || 'Keine Musterlösung hinterlegt.';
      }

      // Extract keywords from topic and tags
      const kws = [];
      if (raw.topic)  kws.push(raw.topic.replace(/_/g, ' '));
      if (raw.tags)   kws.push(...toArray(raw.tags));

      return {
        question:     String(raw.statement),
        sampleAnswer: sampleAnswer,
        keywords:     kws.slice(0, 6),
        points:       raw.difficulty === 3 ? 15 : raw.difficulty === 2 ? 10 : 5,
        difficulty:   raw.difficulty === 3 ? 'schwer' : raw.difficulty === 2 ? 'mittel' : 'leicht',
        topic:        String(raw.topic || ''),
        moduleId:     modId,
        moduleName:   modName,
        type:         raw.type || 'richtig_falsch',
        source_hint:  raw.source_hint || '',
      };
    }

    // Fallback: return as-is with safe defaults
    return {
      question:     String(raw.question || raw.statement || raw.frage || 'Unbekannte Frage'),
      sampleAnswer: String(raw.sampleAnswer || raw.musterantwort || raw.explanation || raw.answer || ''),
      keywords:     toArray(raw.keywords || raw.tags || []),
      points:       Number(raw.points || raw.punkte) || 10,
      difficulty:   String(raw.difficulty || 'mittel'),
      topic:        String(raw.topic || ''),
      moduleId:     modId,
      moduleName:   modName,
      type:         raw.type || 'freitext',
    };
  }

  // ════════════════════════════════════════════════════════════
  //  DATA LOADING — correct paths: data/question-banks/
  // ════════════════════════════════════════════════════════════

  // Module metadata
  const MODULE_META = [
    { id: 1, name: 'Kommunikation & Biografie'    },
    { id: 2, name: 'Medizinisches Kernwissen'      },
    { id: 3, name: 'Krankheitslehre'               },
    { id: 4, name: 'Schwangerschaft & Geburt'      },
    { id: 5, name: 'Prä- & Postoperative Pflege'   },
    { id: 6, name: 'Notfall & Reanimation'          },
    { id: 7, name: 'Ambulante & Chronische Pflege'  },
    { id: 8, name: 'Innere Medizin & Niere'         },
    { id: 9, name: 'Neurologische Rehabilitation'   },
  ];

  // Load a single module's questions from data/question-banks/
  async function fetchModuleQuestions(modId) {
    const meta  = MODULE_META.find(m => m.id === modId);
    const mName = meta?.name || `Modul ${modId}`;

    // Try the correct path first, then fallbacks
    const paths = [
      `${process.env.VERCEL_URL ? 'https://' + process.env.VERCEL_URL : ''}/data/question-banks/module${modId}_questions.json`,
      `/data/question-banks/module${modId}_questions.json`,
      `./data/question-banks/module${modId}_questions.json`,
    ];

    for (const path of paths) {
      try {
        const r = await fetch(path);
        if (!r.ok) continue;
        const raw = await r.json();
        // The file is a plain array  [ {...}, {...} ]
        const arr = Array.isArray(raw) ? raw : (raw.questions || []);
        return arr.map(q => normalizeQuestion(q, modId, mName));
      } catch { /* try next */ }
    }

    console.warn(`⚠️  Could not load module${modId}_questions.json`);
    return [];
  }

  // Load all 9 modules in parallel
  async function fetchAllQuestions() {
    const results = await Promise.allSettled(
      MODULE_META.map(m => fetchModuleQuestions(m.id))
    );
    return results.flatMap(r => r.status === 'fulfilled' ? r.value : []);
  }

  // ── Endpoint: GET questions (for frontend fetch) ─────────────
  if (req.method === 'GET' || (req.body && req.body.mode === 'fetch_questions')) {
    const mid = parseInt(req.query?.moduleId || req.body?.moduleId, 10);
    if (!mid || mid < 1 || mid > 9) {
      return res.status(400).json({ error: 'moduleId 1–9 required' });
    }
    const qs = await fetchModuleQuestions(mid);
    return res.status(200).json({ questions: qs, count: qs.length });
  }

  // ════════════════════════════════════════════════════════════
  //  MODE ROUTER
  // ════════════════════════════════════════════════════════════
  const effectiveMode = mode || type || 'text';

  // ── IMAGE ────────────────────────────────────────────────────
  if (effectiveMode === 'image') {
    try {
      const imgUrl = `https://image.pollinations.ai/prompt/${encodeURIComponent(
        (prompt || '') + ' professional medical illustration, clean, educational'
      )}`;
      const imgRes = await fetch(imgUrl);
      if (!imgRes.ok) throw new Error('Pollinations API error');
      const buf = await imgRes.arrayBuffer();
      const b64 = Buffer.from(buf).toString('base64');
      return res.status(200).json({ imageUrl: `data:image/png;base64,${b64}` });
    } catch (err) {
      return res.status(500).json({ error: 'Bild-Generierung fehlgeschlagen.', details: err.message });
    }
  }

  // ── TEXT (generic pass-through) ───────────────────────────────
  if (effectiveMode === 'text') {
    if (!prompt) return res.status(400).json({ error: 'prompt required' });
    try {
      const result = await runWithFallback(prompt, { preferModel: preferredModel });
      return res.status(200).json({ text: result.text, source: result.source, model: result.model });
    } catch (err) {
      return res.status(503).json({
        error: 'Alle KI-Dienste sind überlastet. Bitte erneut versuchen.',
        details: err.message,
      });
    }
  }

  // ── LERNHEFT ──────────────────────────────────────────────────
  if (effectiveMode === 'lernheft') {
    // Accept either a pre-built prompt or a pairs[] array
    let finalPrompt = prompt;
    if (!finalPrompt && pairs && Array.isArray(pairs)) {
      finalPrompt = buildLernheftPrompt(pairs, sessionType);
    }
    if (!finalPrompt) {
      return res.status(400).json({ error: 'prompt or pairs[] required for lernheft mode' });
    }

    const SYSTEM = `Du bist ein professioneller Pflegetutor für Auszubildende zur Pflegefachkraft (Generalistik) in Deutschland am BZPG Würselen. Antworte AUSSCHLIESSLICH auf Deutsch. Gib NUR reines HTML zurück — keine Markdown-Blöcke, keine Backticks, kein Text außerhalb des HTMLs.`;

    try {
      const result = await runWithFallback(finalPrompt, {
        preferModel:  preferredModel || 'gemini-2.5-flash',
        systemPrompt: SYSTEM,
        maxTokens:    6000,
      });
      const html = stripFences(result.text);
      return res.status(200).json({ html, source: result.source, model: result.model });
    } catch (err) {
      return res.status(503).json({
        error: 'KI-Feedback konnte nicht generiert werden.',
        details: err.message,
      });
    }
  }

  // ── GRADE ─────────────────────────────────────────────────────
  if (effectiveMode === 'grade') {
    if (!question || !userAnswer) {
      return res.status(400).json({ error: 'question and userAnswer required' });
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
      // Always return a usable score so UI never breaks
      return res.status(200).json({
        points:           Math.round(maxPoints * 0.5),
        percentage:       50,
        feedback:         'Automatische Bewertung vorübergehend nicht verfügbar.',
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

  // ── GENERATE (gap-fill) ───────────────────────────────────────
  if (effectiveMode === 'generate') {
    if (!topic) return res.status(400).json({ error: 'topic required' });
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

  // ── LOAD_QUESTIONS (called by frontend JS) ────────────────────
  // POST { mode: 'load_questions', moduleId: 1 }
  // POST { mode: 'load_all_questions' }
  if (effectiveMode === 'load_questions') {
    const mid = parseInt(moduleId, 10);
    if (!mid || mid < 1 || mid > 9) {
      return res.status(400).json({ error: 'moduleId 1–9 required' });
    }
    const qs = await fetchModuleQuestions(mid);
    return res.status(200).json({ questions: qs, count: qs.length, moduleId: mid });
  }

  if (effectiveMode === 'load_all_questions') {
    const qs = await fetchAllQuestions();
    return res.status(200).json({ questions: qs, count: qs.length });
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
      return res.status(503).json({ error: 'Präsentation fehlgeschlagen.', details: err.message });
    }
  }

  // ── SUMMARY ───────────────────────────────────────────────────
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

  // ── UNKNOWN ───────────────────────────────────────────────────
  return res.status(400).json({
    error:           `Unbekannter Modus: "${effectiveMode}"`,
    supported_modes: ['text','image','grade','lernheft','generate','load_questions','load_all_questions','presentation','summary'],
  });
}

// ════════════════════════════════════════════════════════════════
//  PROMPT BUILDERS
// ════════════════════════════════════════════════════════════════

function buildLernheftPrompt(pairs, sessionType) {
  return `Du bist ein professioneller Pflegetutor für Auszubildende zur Pflegefachkraft (Generalistik) in Deutschland am BZPG Würselen.

Analysiere die folgenden Fragen und Antworten des Lernenden und erstelle ein detailliertes Lernheft als REINES HTML.

WICHTIG: Gib NUR HTML zurück. Keine Markdown-Blöcke, keine Backticks.

SESSION-TYP: ${sessionType || 'Lerneinheit'}

HTML-STRUKTUR:
- <div> als Container
- <h2> für Hauptabschnitte
- <h3> für einzelne Fragen
- <p>, <ul>, <li> für Inhalte
- Für korrekte Aspekte: <span style="color:#4ade80">✅ ...</span>
- Für Lücken: <span style="color:#f87171">❌ ...</span> mit Erklärung
- Abschnitt "📊 Zusammenfassung" ganz oben
- Abschnitt "💡 Lernempfehlungen" am Ende

FRAGEN & ANTWORTEN:
${pairs.map((p, i) => `
--- Frage ${i + 1} [${p.moduleName || 'Allgemein'}] ---
Typ:           ${p.type || 'freitext'}
Frage:         ${p.question}
Musterantwort: ${p.sampleAnswer || 'nicht angegeben'}
Nutzerantwort: ${p.userAnswer   || '(keine Antwort gegeben)'}
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

BEWERTUNGSKRITERIEN:
- Fachliche Korrektheit 50%
- Vollständigkeit       30%
- Fachbegriffe          20%

Antworte AUSSCHLIESSLICH mit einem JSON-Objekt. Kein Text davor/danach, keine Markdown-Blöcke.

{
  "points": <integer 0–${maxPoints}>,
  "percentage": <integer 0–100>,
  "feedback": "<2–3 Sätze konstruktives Feedback auf Deutsch>",
  "correct": ["<korrekt genannter Aspekt>"],
  "missing": ["<fehlender Aspekt>"],
  "keywords_used": ["<verwendeter Fachbegriff>"],
  "keywords_missing": ["<fehlender Fachbegriff>"]
}`;
}

function buildGeneratePrompt({ topic, moduleId, moduleName }) {
  return `Du bist ein Pflegeexperte und erstellst eine Prüfungsfrage für Auszubildende zur Pflegefachkraft (Generalistik) in Deutschland.

THEMA: ${topic}
MODUL: ${moduleName || `Modul ${moduleId || '?'}`}

Antworte AUSSCHLIESSLICH mit einem JSON-Objekt. Keine Markdown-Blöcke.

{
  "question": "<klare Prüfungsfrage>",
  "sampleAnswer": "<ausführliche Musterantwort, 3–5 Sätze>",
  "keywords": ["<kw1>","<kw2>","<kw3>","<kw4>","<kw5>"],
  "points": 10,
  "difficulty": "<leicht|mittel|schwer>",
  "topic": "${topic}",
  "generated": true
}`;
}

// ════════════════════════════════════════════════════════════════
//  RESPONSE PARSERS
// ════════════════════════════════════════════════════════════════

function parseGradeResponse(raw, maxPoints) {
  try {
    const p = safeParseJSON(raw);
    return {
      points:           clamp(Number(p.points)     || 0, 0, maxPoints),
      percentage:       clamp(Number(p.percentage) || 0, 0, 100),
      feedback:         String(p.feedback          || 'Keine Rückmeldung verfügbar.'),
      correct:          toArray(p.correct),
      missing:          toArray(p.missing),
      keywords_used:    toArray(p.keywords_used),
      keywords_missing: toArray(p.keywords_missing),
    };
  } catch (err) {
    console.error('parseGradeResponse failed:', err.message);
    return {
      points: Math.round(maxPoints * 0.5), percentage: 50,
      feedback: 'Bewertung konnte nicht verarbeitet werden.',
      correct: [], missing: [], keywords_used: [], keywords_missing: [],
    };
  }
}

function parseGeneratedQuestion(raw) {
  const p = safeParseJSON(raw);
  return {
    question:     String(p.question     || ''),
    sampleAnswer: String(p.sampleAnswer || ''),
    keywords:     toArray(p.keywords),
    points:       Number(p.points)      || 10,
    difficulty:   String(p.difficulty   || 'mittel'),
    topic:        String(p.topic        || ''),
    generated:    true,
  };
}

// ── Shared helpers (duplicated here so they're in scope for parsers) ──
function safeParseJSON(raw) {
  const c = raw.trim()
    .replace(/^```(?:json|js|javascript|html)?\s*/i, '')
    .replace(/```\s*$/i, '')
    .trim();
  try { return JSON.parse(c); } catch { /* fall through */ }
  const m = c.match(/(\{[\s\S]*\}|\[[\s\S]*\])/);
  if (m) return JSON.parse(m[1]);
  throw new Error('JSON parse failed: ' + c.slice(0, 200));
}

function clamp(val, min, max) { return Math.min(max, Math.max(min, val)); }

function toArray(val) {
  if (Array.isArray(val)) return val.map(String);
  if (typeof val === 'string' && val.trim()) return [val];
  return [];
}
