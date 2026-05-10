// ═══════════════════════════════════════════════════════════════
// SLM SYSTEM – ZWISCHENPRÜFUNG ENGINE v1.0
// Drop-in Modul: <script src="js/zwischenpruefung.js"></script>
// Abhängigkeiten: Tailwind CSS, FontAwesome, cloud-sync.js
// ═══════════════════════════════════════════════════════════════

const ZP = (() => {

  // ─── KONFIGURATION ────────────────────────────────────────────
  const CFG = {
    STORAGE_KEY_BOOKS: 'slm_lernbuecher',
    STORAGE_KEY_SESSIONS: 'slm_zp_sessions',
    EXAM_DURATION_MS: 120 * 60 * 1000, // 120 Minuten
    RECALL_TIMER_SEC: 120,
    QUESTION_SETS: { schnell: 5, mittel: 10, intensiv: 15 },
    MODULES: [
      { id: 1, name: 'Kommunikation & Biografie',    file: 'module1_questions.json' },
      { id: 2, name: 'Medizinisches Kernwissen',      file: 'module2_questions.json' },
      { id: 3, name: 'Krankheitslehre',               file: 'module3_questions.json' },
      { id: 4, name: 'Schwangerschaft & Geburt',      file: 'module4_questions.json' },
      { id: 5, name: 'Prä- & Postoperative Pflege',   file: 'module5_questions.json' },
      { id: 6, name: 'Notfall & Reanimation',         file: 'module6_questions.json' },
      { id: 7, name: 'Ambulante & Chronische Pflege', file: 'module7_questions.json' },
      { id: 8, name: 'Innere Medizin & Niere',        file: 'module8_questions.json' },
      { id: 9, name: 'Neurologische Rehabilitation',  file: 'module9_questions.json' },
    ],
    // Schwerpunkte der Zwischenprüfung (Ende 2. Ausbildungsjahr)
    EXAM_FOCUS: [
      'Pflegeprozess', 'Kommunikation', 'Körperpflege', 'Vitalzeichen',
      'Medikamentengabe', 'Dokumentation', 'Rechtliche Grundlagen',
      'Wundversorgung', 'Mobilisation', 'Ernährung', 'Ausscheidung',
      'Prävention', 'Hygiene', 'Schmerzmanagement', 'Demenz'
    ]
  };

  // ─── STATE ────────────────────────────────────────────────────
  let state = {
    mode: null,           // 'recall' | 'probeklausur'
    questions: [],        // geladene Fragen
    currentIndex: 0,
    phase: 'spickzettel', // 'spickzettel' | 'abfrage'
    userAnswers: [],
    timer: null,
    timerSeconds: 0,
    examTimer: null,
    examSecondsLeft: 0,
    moduleCache: {}
  };

  // ─── UTILITY ──────────────────────────────────────────────────
  const $ = id => document.getElementById(id);
  const shuffle = arr => [...arr].sort(() => Math.random() - 0.5);

  function saveLernbuch(title, htmlContent) {
    const books = JSON.parse(localStorage.getItem(CFG.STORAGE_KEY_BOOKS) || '[]');
    books.unshift({
      id: Date.now(),
      date: new Date().toLocaleDateString('de-DE', {
        day: '2-digit', month: '2-digit', year: 'numeric',
        hour: '2-digit', minute: '2-digit'
      }),
      title,
      html: htmlContent
    });
    // Max 20 Hefte speichern
    if (books.length > 20) books.splice(20);
    localStorage.setItem(CFG.STORAGE_KEY_BOOKS, JSON.stringify(books));
    renderLernbuecher();
  }

  function getLernbuecher() {
    return JSON.parse(localStorage.getItem(CFG.STORAGE_KEY_BOOKS) || '[]');
  }

  // ─── DATEN LADEN ──────────────────────────────────────────────
  async function loadModuleQuestions(moduleId) {
    if (state.moduleCache[moduleId]) return state.moduleCache[moduleId];
    try {
      const res = await fetch(`question-banks/module${moduleId}_questions.json`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      state.moduleCache[moduleId] = data.questions || data;
      return state.moduleCache[moduleId];
    } catch (e) {
      console.warn(`Modul ${moduleId} nicht geladen:`, e);
      return [];
    }
  }

  async function loadAllQuestions() {
    const allQuestions = [];
    await Promise.all(
      CFG.MODULES.map(async m => {
        const qs = await loadModuleQuestions(m.id);
        qs.forEach(q => allQuestions.push({ ...q, moduleId: m.id, moduleName: m.name }));
      })
    );
    return allQuestions;
  }

  // Smart-Filter: Priorisiert Fragen nach Exam-Schwerpunkten
  function smartFilter(allQuestions, count) {
    const focused = allQuestions.filter(q => {
      const text = `${q.question || q.frage || ''} ${q.keywords?.join(' ') || ''}`.toLowerCase();
      return CFG.EXAM_FOCUS.some(topic => text.includes(topic.toLowerCase()));
    });
    const others = allQuestions.filter(q => !focused.includes(q));
    const pool = [...shuffle(focused), ...shuffle(others)];
    return pool.slice(0, count);
  }

  // ─── KI-INTEGRATION ───────────────────────────────────────────
  async function callGradeAPI(payload) {
    try {
      const res = await fetch('/api/grade', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (!res.ok) throw new Error(`API ${res.status}`);
      return await res.json();
    } catch (e) {
      console.error('KI-API Fehler:', e);
      return null;
    }
  }

  async function generateKIFeedback(questionsAndAnswers) {
    const prompt = buildFeedbackPrompt(questionsAndAnswers);
    const result = await callGradeAPI({
      mode: 'lernheft',
      prompt,
      model: 'gemini-2.5-flash'
    });
    return result?.html || result?.feedback || buildFallbackFeedback(questionsAndAnswers);
  }

  function buildFeedbackPrompt(data) {
    const pairs = data.map((item, i) =>
      `**Frage ${i + 1} (${item.moduleName}):**\n` +
      `Frage: ${item.question}\n` +
      `Musterantwort: ${item.sampleAnswer}\n` +
      `Nutzerantwort: ${item.userAnswer || '(keine Antwort)'}\n` +
      `Keywords: ${item.keywords?.join(', ') || 'n/a'}`
    ).join('\n\n---\n\n');

    return `Du bist ein professioneller Pflegetutor für Auszubildende zur Pflegefachkraft (Generalistik) in Deutschland.

Analysiere die folgenden Antworten des Lernenden und erstelle ein detailliertes Lernheft als reines HTML (NUR HTML, kein Markdown, kein \`\`\`).

ANFORDERUNGEN:
- Verwende <h2>, <h3>, <ul>, <li>, <p>, <strong>, <span> Tags
- Für jeden richtigen Aspekt: grüner Checkmark ✅
- Für Wissenslücken: rotes ❌ mit konkreter Erklärung was fehlt
- Am Ende: "Lernempfehlungen" mit konkreten Themen zum Wiederholen
- Tone: ermutigend aber klar und fachlich präzise
- Sprache: Deutsch
- Medizinische Fachbegriffe korrekt verwenden

NUTZERANTWORTEN:
${pairs}

Erstelle jetzt das HTML-Lernheft:`;
  }

  function buildFallbackFeedback(data) {
    const answered = data.filter(d => d.userAnswer?.trim().length > 0).length;
    return `
      <div style="font-family: 'Plus Jakarta Sans', sans-serif; color: #e2e8f0;">
        <h2 style="color: #818cf8; font-size: 1.4rem; font-weight: 900; margin-bottom: 1rem;">
          📋 Dein Lernheft
        </h2>
        <p style="color: #94a3b8; margin-bottom: 1.5rem;">
          ${answered} von ${data.length} Fragen beantwortet.
        </p>
        ${data.map((item, i) => `
          <div style="background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.08);
               border-radius: 12px; padding: 1rem; margin-bottom: 1rem;">
            <h3 style="color: #c4b5fd; font-size: 0.9rem; font-weight: 700; margin-bottom: 0.5rem;">
              Frage ${i + 1}: ${item.moduleName}
            </h3>
            <p style="color: #94a3b8; font-size: 0.8rem; margin-bottom: 0.5rem;">
              <strong style="color: #e2e8f0;">Frage:</strong> ${item.question}
            </p>
            <p style="color: #94a3b8; font-size: 0.8rem; margin-bottom: 0.5rem;">
              <strong style="color: #86efac;">✅ Musterantwort:</strong> ${item.sampleAnswer}
            </p>
            <p style="color: #94a3b8; font-size: 0.8rem;">
              <strong style="color: ${item.userAnswer ? '#fbbf24' : '#f87171'};">
                ${item.userAnswer ? '📝 Deine Antwort:' : '❌ Keine Antwort gegeben:'}
              </strong> 
              ${item.userAnswer || 'Du hast diese Frage nicht beantwortet.'}
            </p>
          </div>
        `).join('')}
        <div style="background: rgba(99,102,241,0.1); border: 1px solid rgba(99,102,241,0.2);
             border-radius: 12px; padding: 1rem; margin-top: 1.5rem;">
          <h3 style="color: #818cf8; font-weight: 700; margin-bottom: 0.5rem;">
            💡 Lernempfehlung
          </h3>
          <p style="color: #94a3b8; font-size: 0.85rem;">
            Wiederhole die Fragen, bei denen du unsicher warst. 
            Nutze die Modul-Zusammenfassungen als Referenz.
          </p>
        </div>
      </div>
    `;
  }

  // ═══════════════════════════════════════════════════════════════
  // MODUS 1: ACTIVE RECALL ENGINE
  // ═══════════════════════════════════════════════════════════════
  async function startRecallMode(size) {
    state.mode = 'recall';
    state.currentIndex = 0;
    state.userAnswers = [];
    state.phase = 'spickzettel';

    showRecallLoading();

    const allQ = await loadAllQuestions();
    state.questions = smartFilter(allQ, CFG.QUESTION_SETS[size] || 10);

    if (state.questions.length === 0) {
      showToast('Keine Fragen gefunden. Überprüfe die JSON-Dateien.', 'error');
      closeRecallModal();
      return;
    }

    renderRecallQuestion();
  }

  function showRecallLoading() {
    const modal = $('recall-modal');
    if (!modal) return;
    modal.querySelector('#recall-content').innerHTML = `
      <div class="flex flex-col items-center justify-center py-20 gap-4">
        <div class="w-12 h-12 border-4 border-indigo-500/30 border-t-indigo-500 
             rounded-full animate-spin"></div>
        <p class="text-slate-400 text-sm font-medium">Fragen werden geladen...</p>
      </div>
    `;
  }

  function renderRecallQuestion() {
    const q = state.questions[state.currentIndex];
    if (!q) { finishRecallSession(); return; }

    const total = state.questions.length;
    const current = state.currentIndex + 1;
    const progress = Math.round((state.currentIndex / total) * 100);

    const question = q.question || q.frage || 'Frage nicht verfügbar';
    const sampleAnswer = q.sampleAnswer || q.musterantwort || q.answer || '';
    const moduleName = q.moduleName || `Modul ${q.moduleId}`;

    const isSpickzettel = state.phase === 'spickzettel';

    $('recall-content').innerHTML = `
      <!-- Progress Bar -->
      <div class="mb-6">
        <div class="flex justify-between text-xs font-bold text-slate-500 mb-2">
          <span>Frage ${current} / ${total}</span>
          <span class="text-indigo-400">${moduleName}</span>
        </div>
        <div class="w-full bg-white/5 rounded-full h-2 overflow-hidden">
          <div class="h-full bg-gradient-to-r from-indigo-500 to-violet-500 rounded-full 
               transition-all duration-500" style="width: ${progress}%"></div>
        </div>
      </div>

      <!-- Phase Badge -->
      <div class="flex items-center gap-2 mb-4">
        <span class="text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-full
          ${isSpickzettel 
            ? 'bg-amber-500/15 text-amber-400 border border-amber-500/25' 
            : 'bg-violet-500/15 text-violet-400 border border-violet-500/25'}">
          ${isSpickzettel ? '📖 Phase 1: Einprägen' : '✍️ Phase 2: Abruf'}
        </span>
        ${isSpickzettel 
          ? `<span id="recall-timer" class="text-xs font-black text-slate-400 tabular-nums ml-auto">
               ${CFG.RECALL_TIMER_SEC}s
             </span>` 
          : ''}
      </div>

      <!-- Frage -->
      <div class="glass rounded-2xl p-6 mb-4 border border-white/8">
        <p class="text-white font-bold text-base leading-relaxed">${question}</p>
      </div>

      <!-- PHASE 1: Spickzettel -->
      ${isSpickzettel ? `
        <div id="sample-answer-box" class="glass rounded-2xl p-5 mb-5 
             border border-emerald-500/15 bg-emerald-500/5">
          <div class="flex items-center gap-2 mb-3">
            <span class="text-[9px] font-black uppercase tracking-widest text-emerald-400">
              Musterantwort
            </span>
          </div>
          <p class="text-slate-300 text-sm leading-relaxed">${sampleAnswer}</p>
          ${q.keywords?.length ? `
            <div class="flex flex-wrap gap-1.5 mt-3">
              ${q.keywords.map(k => 
                `<span class="text-[9px] bg-emerald-500/10 text-emerald-400 
                       border border-emerald-500/20 px-2 py-0.5 rounded-full font-bold">
                   ${k}
                 </span>`
              ).join('')}
            </div>` : ''}
        </div>

        <!-- Timer Controls -->
        <div class="flex gap-3">
          <button onclick="ZP.addTime(30)" 
            class="flex-1 glass rounded-xl py-3 text-xs font-bold text-slate-400 
                   hover:text-white hover:border-white/10 transition-all active:scale-95">
            <i class="fas fa-plus mr-1"></i>+30s
          </button>
          <button onclick="ZP.skipToAbfrage()" 
            class="flex-1 bg-indigo-600 hover:bg-indigo-500 rounded-xl py-3 
                   text-xs font-black text-white transition-all active:scale-95 uppercase tracking-wider">
            Ich hab's! <i class="fas fa-arrow-right ml-1"></i>
          </button>
        </div>
      ` : `
        <!-- PHASE 2: Abfrage -->
        <div class="mb-4">
          <textarea id="user-answer-input" 
            placeholder="Schreibe deine Antwort aus dem Gedächtnis..."
            class="w-full h-40 rounded-xl p-4 text-sm text-white leading-relaxed resize-none
                   bg-white/5 border border-white/10 outline-none focus:border-indigo-500/50
                   focus:bg-indigo-500/5 transition-all placeholder:text-slate-600"
            autofocus></textarea>
        </div>
        <div class="flex gap-3">
          <button onclick="ZP.skipAnswer()" 
            class="flex-1 glass rounded-xl py-3 text-xs font-bold text-slate-500 
                   hover:text-white transition-all active:scale-95">
            Überspringen
          </button>
          <button onclick="ZP.submitAnswer()" 
            class="flex-2 flex-grow bg-gradient-to-r from-indigo-600 to-violet-600 
                   hover:from-indigo-500 hover:to-violet-500 rounded-xl py-3 
                   text-sm font-black text-white transition-all active:scale-95 uppercase tracking-wider">
            <i class="fas fa-check mr-2"></i>Weiter
          </button>
        </div>
      `}
    `;

    // Timer starten für Phase 1
    if (isSpickzettel) {
      startRecallTimer();
    }
  }

  let recallTimerInterval = null;
  let recallTimerSeconds = CFG.RECALL_TIMER_SEC;

  function startRecallTimer() {
    clearInterval(recallTimerInterval);
    recallTimerSeconds = CFG.RECALL_TIMER_SEC;
    updateTimerDisplay();

    recallTimerInterval = setInterval(() => {
      recallTimerSeconds--;
      updateTimerDisplay();
      if (recallTimerSeconds <= 0) {
        clearInterval(recallTimerInterval);
        skipToAbfrage();
      }
    }, 1000);
  }

  function updateTimerDisplay() {
    const el = $('recall-timer');
    if (!el) return;
    const color = recallTimerSeconds <= 10 
      ? '#f87171' 
      : recallTimerSeconds <= 30 
        ? '#fbbf24' 
        : '#94a3b8';
    el.style.color = color;
    el.textContent = `${recallTimerSeconds}s`;
  }

  function addTime(seconds) {
    recallTimerSeconds += seconds;
    updateTimerDisplay();
  }

  function skipToAbfrage() {
    clearInterval(recallTimerInterval);
    state.phase = 'abfrage';
    renderRecallQuestion();
  }

  function submitAnswer() {
    const input = $('user-answer-input');
    const answer = input?.value?.trim() || '';
    const q = state.questions[state.currentIndex];

    state.userAnswers.push({
      question: q.question || q.frage,
      sampleAnswer: q.sampleAnswer || q.musterantwort || '',
      userAnswer: answer,
      keywords: q.keywords || [],
      moduleName: q.moduleName || `Modul ${q.moduleId}`,
      moduleId: q.moduleId
    });

    state.currentIndex++;
    state.phase = 'spickzettel';
    renderRecallQuestion();
  }

  function skipAnswer() {
    const q = state.questions[state.currentIndex];
    state.userAnswers.push({
      question: q.question || q.frage,
      sampleAnswer: q.sampleAnswer || q.musterantwort || '',
      userAnswer: '',
      keywords: q.keywords || [],
      moduleName: q.moduleName || `Modul ${q.moduleId}`,
      moduleId: q.moduleId
    });
    state.currentIndex++;
    state.phase = 'spickzettel';
    renderRecallQuestion();
  }

  async function finishRecallSession() {
    clearInterval(recallTimerInterval);

    // Lade-Screen
    $('recall-content').innerHTML = `
      <div class="flex flex-col items-center justify-center py-16 gap-5 text-center">
        <div class="w-16 h-16 bg-gradient-to-br from-indigo-500 to-violet-600 rounded-2xl 
             flex items-center justify-center shadow-lg shadow-indigo-500/30">
          <i class="fas fa-robot text-white text-2xl"></i>
        </div>
        <div>
          <h3 class="text-white font-black text-lg mb-1">KI erstellt dein Lernheft</h3>
          <p class="text-slate-500 text-sm">Das dauert einen Moment...</p>
        </div>
        <div class="flex gap-1.5">
          ${[0,1,2].map(i => 
            `<div class="w-2 h-2 bg-indigo-500 rounded-full animate-bounce" 
                  style="animation-delay: ${i * 0.15}s"></div>`
          ).join('')}
        </div>
      </div>
    `;

    const feedbackHTML = await generateKIFeedback(state.userAnswers);
    const answered = state.userAnswers.filter(a => a.userAnswer.length > 0).length;
    const title = `Recall-Session • ${answered}/${state.userAnswers.length} Antworten • ${new Date().toLocaleDateString('de-DE')}`;

    saveLernbuch(title, feedbackHTML);

    // Feedback anzeigen
    $('recall-content').innerHTML = `
      <div class="mb-4 p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-xl 
           flex items-center gap-3">
        <i class="fas fa-check-circle text-emerald-400 text-lg"></i>
        <div>
          <p class="text-emerald-400 font-bold text-sm">Lernheft gespeichert!</p>
          <p class="text-slate-500 text-xs">Unter "Meine Lernhefte" jederzeit abrufbar.</p>
        </div>
      </div>
      
      <div class="max-h-[50vh] overflow-y-auto pr-1 custom-scroll">
        <div class="glass rounded-2xl p-5">
          ${feedbackHTML}
        </div>
      </div>

      <div class="flex gap-3 mt-4">
        <button onclick="ZP.closeRecallModal()" 
          class="flex-1 glass rounded-xl py-3 text-sm font-bold text-slate-400 
                 hover:text-white transition-all active:scale-95">
          Schließen
        </button>
        <button onclick="ZP.openHub()" 
          class="flex-1 bg-indigo-600 hover:bg-indigo-500 rounded-xl py-3 
                 text-sm font-black text-white transition-all active:scale-95">
          <i class="fas fa-redo mr-2"></i>Neue Session
        </button>
      </div>
    `;
  }

  // ═══════════════════════════════════════════════════════════════
  // MODUS 2: PROBEKLAUSUR
  // ═══════════════════════════════════════════════════════════════
  async function startProbeklausur() {
    state.mode = 'probeklausur';
    closeHub();
    openProbeklausurModal();

    // Lade-State
    $('pk-content').innerHTML = `
      <div class="flex flex-col items-center justify-center py-20 gap-4">
        <div class="w-12 h-12 border-4 border-orange-500/30 border-t-orange-500 
             rounded-full animate-spin"></div>
        <p class="text-slate-400 text-sm font-medium">Klausur wird generiert...</p>
      </div>
    `;

    const allQ = await loadAllQuestions();
    // 15 Fragen für Probeklausur (balanciert über Module)
    state.questions = buildBalancedExam(allQ, 15);
    state.userAnswers = new Array(state.questions.length).fill('');
    state.examSecondsLeft = 120 * 60;

    renderProbeklausur();
    startExamTimer();
  }

  function buildBalancedExam(allQ, total) {
    const perModule = Math.ceil(total / CFG.MODULES.length);
    const selected = [];
    CFG.MODULES.forEach(m => {
      const mQ = shuffle(allQ.filter(q => q.moduleId === m.id));
      selected.push(...mQ.slice(0, perModule));
    });
    return shuffle(selected).slice(0, total);
  }

  function renderProbeklausur() {
    const questionsHTML = state.questions.map((q, i) => {
      const question = q.question || q.frage || '';
      const pts = q.points || q.punkte || 10;
      return `
        <div class="pk-question mb-8 pb-8 border-b border-white/5 last:border-0">
          <div class="flex justify-between items-start mb-3">
            <div class="flex items-center gap-2">
              <span class="w-7 h-7 bg-orange-500/15 text-orange-400 rounded-lg flex 
                           items-center justify-center text-xs font-black">${i + 1}</span>
              <span class="text-[9px] font-bold text-slate-600 uppercase tracking-widest">
                ${q.moduleName || `Modul ${q.moduleId}`}
              </span>
            </div>
            <span class="text-[10px] font-black text-slate-500 bg-white/5 px-2 py-0.5 rounded-lg">
              ${pts} Punkte
            </span>
          </div>
          <p class="text-white font-semibold text-sm leading-relaxed mb-3">${question}</p>
          <textarea 
            data-index="${i}"
            onchange="ZP.saveExamAnswer(${i}, this.value)"
            oninput="ZP.saveExamAnswer(${i}, this.value)"
            placeholder="Deine Antwort..."
            rows="4"
            class="w-full rounded-xl p-4 text-sm text-slate-300 leading-relaxed resize-y
                   bg-white/3 border border-white/8 outline-none focus:border-orange-500/40
                   focus:bg-orange-500/3 transition-all placeholder:text-slate-700
                   font-mono text-xs"
          ></textarea>
        </div>
      `;
    }).join('');

    $('pk-content').innerHTML = `
      <!-- Klausur-Header (Papier-Look) -->
      <div class="glass rounded-2xl p-5 mb-6 border-2 border-orange-500/15">
        <div class="flex justify-between items-start mb-2">
          <div>
            <h3 class="font-black text-white text-base">Zwischenprüfung – Schriftlicher Teil</h3>
            <p class="text-slate-500 text-xs mt-0.5">BZPG Würselen • Pflegefachkraft (Generalistik)</p>
          </div>
          <div class="text-right">
            <div id="pk-timer" class="text-2xl font-black text-orange-400 tabular-nums">120:00</div>
            <div class="text-[9px] text-slate-600 font-bold uppercase">Verbleibend</div>
          </div>
        </div>
        <div class="flex gap-4 text-[10px] text-slate-600 font-bold border-t border-white/5 pt-2 mt-2">
          <span>Name: _______________</span>
          <span>Datum: ${new Date().toLocaleDateString('de-DE')}</span>
          <span>Punkte: _____ / ${state.questions.reduce((s,q) => s + (q.points || q.punkte || 10), 0)}</span>
        </div>
      </div>

      <!-- Fragen -->
      <div class="max-h-[55vh] overflow-y-auto pr-2 custom-scroll" id="pk-questions">
        ${questionsHTML}
      </div>

      <!-- Submit -->
      <div class="flex gap-3 mt-4">
        <button onclick="ZP.closeProbeklausur()" 
          class="flex-1 glass rounded-xl py-3 text-sm font-bold text-slate-500 
                 hover:text-red-400 transition-all active:scale-95">
          <i class="fas fa-times mr-2"></i>Abbrechen
        </button>
        <button onclick="ZP.submitProbeklausur()" 
          class="flex-2 flex-grow bg-gradient-to-r from-orange-500 to-amber-500 
                 hover:from-orange-400 hover:to-amber-400 rounded-xl py-3 
                 text-sm font-black text-white transition-all active:scale-95 shadow-lg
                 shadow-orange-500/20">
          <i class="fas fa-paper-plane mr-2"></i>Klausur abgeben
        </button>
      </div>
    `;
  }

  function saveExamAnswer(index, value) {
    state.userAnswers[index] = value;
  }

  function startExamTimer() {
    clearInterval(state.examTimer);
    state.examTimer = setInterval(() => {
      state.examSecondsLeft--;
      updateExamTimerDisplay();
      if (state.examSecondsLeft <= 0) {
        clearInterval(state.examTimer);
        submitProbeklausur(true);
      }
    }, 1000);
  }

  function updateExamTimerDisplay() {
    const el = $('pk-timer');
    if (!el) return;
    const m = Math.floor(state.examSecondsLeft / 60);
    const s = state.examSecondsLeft % 60;
    el.textContent = `${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;
    if (state.examSecondsLeft <= 300) el.style.color = '#f87171';
    else if (state.examSecondsLeft <= 900) el.style.color = '#fbbf24';
  }

  async function submitProbeklausur(timeout = false) {
    clearInterval(state.examTimer);

    const pairs = state.questions.map((q, i) => ({
      question: q.question || q.frage,
      sampleAnswer: q.sampleAnswer || q.musterantwort || '',
      userAnswer: state.userAnswers[i] || '',
      keywords: q.keywords || [],
      moduleName: q.moduleName || `Modul ${q.moduleId}`,
      moduleId: q.moduleId,
      points: q.points || q.punkte || 10
    }));

    $('pk-content').innerHTML = `
      <div class="flex flex-col items-center justify-center py-16 gap-5 text-center">
        <div class="w-16 h-16 bg-gradient-to-br from-orange-500 to-amber-600 rounded-2xl 
             flex items-center justify-center">
          <i class="fas fa-robot text-white text-2xl"></i>
        </div>
        <div>
          <h3 class="text-white font-black text-lg mb-1">
            ${timeout ? 'Zeit abgelaufen! ' : ''}KI bewertet deine Klausur
          </h3>
          <p class="text-slate-500 text-sm">Bitte warten...</p>
        </div>
        <div class="flex gap-1.5">
          ${[0,1,2].map(i => 
            `<div class="w-2 h-2 bg-orange-500 rounded-full animate-bounce" 
                  style="animation-delay: ${i * 0.15}s"></div>`
          ).join('')}
        </div>
      </div>
    `;

    const feedbackHTML = await generateKIFeedback(pairs);
    const answered = pairs.filter(p => p.userAnswer.length > 0).length;
    const elapsed = 120 * 60 - state.examSecondsLeft;
    const elMin = Math.floor(elapsed / 60);
    const title = `Probeklausur • ${answered}/${pairs.length} Antworten • ${elMin} Min. • ${new Date().toLocaleDateString('de-DE')}`;

    saveLernbuch(title, feedbackHTML);

    $('pk-content').innerHTML = `
      <div class="mb-4 p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-xl 
           flex items-center gap-3">
        <i class="fas fa-check-circle text-emerald-400 text-lg"></i>
        <div>
          <p class="text-emerald-400 font-bold text-sm">Bewertung gespeichert!</p>
          <p class="text-slate-500 text-xs">${answered} von ${pairs.length} Fragen beantwortet.</p>
        </div>
      </div>

      <div class="max-h-[50vh] overflow-y-auto pr-1 custom-scroll">
        <div class="glass rounded-2xl p-5">
          ${feedbackHTML}
        </div>
      </div>

      <div class="flex gap-3 mt-4">
        <button onclick="ZP.closeProbeklausur()" 
          class="flex-1 glass rounded-xl py-3 text-sm font-bold text-slate-400 
                 hover:text-white transition-all">
          Schließen
        </button>
        <button onclick="ZP.openHub()" 
          class="flex-1 bg-orange-500 hover:bg-orange-400 rounded-xl py-3 
                 text-sm font-black text-white transition-all">
          <i class="fas fa-redo mr-2"></i>Neue Klausur
        </button>
      </div>
    `;
  }

  // ═══════════════════════════════════════════════════════════════
  // HUB MODAL (Einstieg)
  // ═══════════════════════════════════════════════════════════════
  function openHub() {
    ensureModalsExist();
    $('zp-hub-modal').classList.remove('hidden');
  }

  function closeHub() {
    const el = $('zp-hub-modal');
    if (el) el.classList.add('hidden');
  }

  function openRecallModal() {
    closeHub();
    ensureModalsExist();
    $('recall-modal').classList.remove('hidden');
  }

  function closeRecallModal() {
    clearInterval(recallTimerInterval);
    const el = $('recall-modal');
    if (el) el.classList.add('hidden');
    // Refresh Lernbücher-Widget
    renderLernbuecher();
  }

  function openProbeklausurModal() {
    ensureModalsExist();
    $('pk-modal').classList.remove('hidden');
  }

  function closeProbeklausur() {
    clearInterval(state.examTimer);
    const el = $('pk-modal');
    if (el) el.classList.add('hidden');
    renderLernbuecher();
  }

  // Lernbuch-Viewer
  function viewLernbuch(id) {
    const books = getLernbuecher();
    const book = books.find(b => b.id === id);
    if (!book) return;

    ensureModalsExist();
    $('lb-modal-title').textContent = book.title;
    $('lb-modal-content').innerHTML = book.html;
    $('lb-modal').classList.remove('hidden');
  }

  function deleteLernbuch(id) {
    if (!confirm('Dieses Lernheft löschen?')) return;
    const books = getLernbuecher().filter(b => b.id !== id);
    localStorage.setItem(CFG.STORAGE_KEY_BOOKS, JSON.stringify(books));
    renderLernbuecher();
  }

  // ─── LERNBÜCHER WIDGET ────────────────────────────────────────
  function renderLernbuecher() {
    const el = $('lernbuecher-widget');
    if (!el) return;

    const books = getLernbuecher();

    if (books.length === 0) {
      el.innerHTML = `
        <div class="text-center py-6">
          <i class="fas fa-book text-slate-700 text-3xl mb-3 block"></i>
          <p class="text-slate-600 text-xs font-bold">Noch keine Lernhefte</p>
          <p class="text-slate-700 text-[10px] mt-1">Starte eine Recall-Session</p>
        </div>
      `;
      return;
    }

    el.innerHTML = books.slice(0, 5).map(book => `
      <div class="flex items-center gap-3 p-3 glass rounded-xl mb-2 
           hover:border-white/10 transition-all group cursor-pointer"
           onclick="ZP.viewLernbuch(${book.id})">
        <div class="w-9 h-9 bg-indigo-500/10 text-indigo-400 rounded-lg flex 
             items-center justify-center shrink-0">
          <i class="fas fa-book-open text-xs"></i>
        </div>
        <div class="flex-1 min-w-0">
          <p class="text-white text-xs font-bold truncate">${book.title}</p>
          <p class="text-slate-600 text-[10px]">${book.date}</p>
        </div>
        <button onclick="event.stopPropagation(); ZP.deleteLernbuch(${book.id})"
          class="text-slate-700 hover:text-red-400 transition-colors opacity-0 
                 group-hover:opacity-100 text-xs p-1">
          <i class="fas fa-trash"></i>
        </button>
      </div>
    `).join('');

    if (books.length > 5) {
      el.innerHTML += `
        <p class="text-center text-[10px] text-slate-600 font-bold mt-2">
          +${books.length - 5} weitere
        </p>
      `;
    }
  }

  // ═══════════════════════════════════════════════════════════════
  // MODAL INJECTION (dynamisch erstellt, falls nicht vorhanden)
  // ═══════════════════════════════════════════════════════════════
  function ensureModalsExist() {
    if ($('zp-hub-modal')) return; // Bereits vorhanden
    document.body.insertAdjacentHTML('beforeend', buildModalsHTML());
  }

  function buildModalsHTML() {
    return `
    <!-- ── ZP HUB MODAL ───────────────────────────────────── -->
    <div id="zp-hub-modal" class="fixed inset-0 z-[200] flex items-center justify-center p-4 hidden"
         style="background:rgba(0,0,0,.75);backdrop-filter:blur(8px)">
      <div class="w-full max-w-md" style="animation:modalIn .4s cubic-bezier(.16,1,.3,1) both">
        <div class="glass rounded-3xl border border-white/10 overflow-hidden">
          
          <!-- Header -->
          <div class="p-7 border-b border-white/5">
            <div class="flex items-center justify-between mb-4">
              <div class="flex items-center gap-3">
                <div class="w-10 h-10 bg-gradient-to-br from-indigo-600 to-violet-700 
                     rounded-xl flex items-center justify-center shadow-lg">
                  <i class="fas fa-graduation-cap text-white text-sm"></i>
                </div>
                <div>
                  <h2 class="text-white font-black text-lg">Zwischenprüfung</h2>
                  <p class="text-slate-600 text-[10px] font-bold uppercase tracking-widest">
                    Trainings-Hub
                  </p>
                </div>
              </div>
              <button onclick="ZP.closeHub()" 
                class="text-slate-600 hover:text-white transition-colors w-8 h-8 
                       flex items-center justify-center rounded-lg hover:bg-white/5">
                <i class="fas fa-times text-sm"></i>
              </button>
            </div>
            <p class="text-slate-500 text-sm leading-relaxed">
              Wähle deinen Trainings-Modus. Alle Inhalte basieren auf den 
              Schwerpunkten des 1. und 2. Ausbildungsdrittels.
            </p>
          </div>

          <!-- Modi -->
          <div class="p-5 space-y-3">
            
            <!-- Active Recall -->
            <div class="glass rounded-2xl p-5 border border-white/8 
                 hover:border-indigo-500/25 transition-all">
              <div class="flex items-start gap-4 mb-4">
                <div class="w-11 h-11 bg-indigo-500/15 text-indigo-400 rounded-xl 
                     flex items-center justify-center shrink-0">
                  <i class="fas fa-brain text-lg"></i>
                </div>
                <div>
                  <h3 class="text-white font-black text-base">Geführtes Lernen</h3>
                  <p class="text-slate-500 text-xs leading-relaxed mt-0.5">
                    120s einprägen → aus dem Gedächtnis abrufen → KI-Feedback
                  </p>
                </div>
              </div>
              <div class="flex gap-2">
                ${['schnell', 'mittel', 'intensiv'].map((size, i) => {
                  const counts = [5, 10, 15];
                  const colors = ['bg-slate-700 hover:bg-slate-600', 
                                  'bg-indigo-600 hover:bg-indigo-500', 
                                  'bg-violet-600 hover:bg-violet-500'];
                  return `
                    <button onclick="ZP.startRecallMode('${size}')"
                      class="flex-1 ${colors[i]} text-white rounded-xl py-2.5 
                             text-xs font-black uppercase tracking-wider 
                             transition-all active:scale-95">
                      ${size}<br>
                      <span class="font-normal normal-case text-[10px] opacity-70">
                        ${counts[i]} Fragen
                      </span>
                    </button>
                  `;
                }).join('')}
              </div>
            </div>

            <!-- Probeklausur -->
            <button onclick="ZP.startProbeklausur()"
              class="w-full glass rounded-2xl p-5 border border-white/8 
                     hover:border-orange-500/25 transition-all text-left group">
              <div class="flex items-center gap-4">
                <div class="w-11 h-11 bg-orange-500/15 text-orange-400 rounded-xl 
                     flex items-center justify-center shrink-0 
                     group-hover:bg-orange-500/20 transition-all">
                  <i class="fas fa-file-contract text-lg"></i>
                </div>
                <div class="flex-1">
                  <h3 class="text-white font-black text-base">1:1 Probeklausur</h3>
                  <p class="text-slate-500 text-xs leading-relaxed mt-0.5">
                    15 Fragen • 120 Minuten • KI-Bewertung
                  </p>
                </div>
                <i class="fas fa-arrow-right text-slate-600 group-hover:text-orange-400 
                         transition-colors text-sm"></i>
              </div>
            </button>

            <!-- Lernhefte Button -->
            <button onclick="ZP.closeHub(); ZP.openLernbuecher()"
              class="w-full glass rounded-2xl p-4 border border-white/5 
                     hover:border-white/10 transition-all text-left group">
              <div class="flex items-center gap-3">
                <div class="w-9 h-9 bg-emerald-500/10 text-emerald-400 rounded-xl 
                     flex items-center justify-center shrink-0">
                  <i class="fas fa-book-open text-sm"></i>
                </div>
                <div class="flex-1">
                  <p class="text-white font-bold text-sm">Meine Lernhefte</p>
                  <p class="text-slate-600 text-[10px]">
                    ${getLernbuecher().length} gespeichert
                  </p>
                </div>
                <i class="fas fa-arrow-right text-slate-700 group-hover:text-emerald-400 
                         transition-colors text-xs"></i>
              </div>
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- ── RECALL MODAL ─────────────────────────────────────── -->
    <div id="recall-modal" class="fixed inset-0 z-[210] flex items-center justify-center p-4 hidden"
         style="background:rgba(0,0,0,.8);backdrop-filter:blur(10px)">
      <div class="w-full max-w-lg" style="animation:modalIn .4s cubic-bezier(.16,1,.3,1) both">
        <div class="glass rounded-3xl border border-white/10 overflow-hidden">
          <div class="flex items-center justify-between p-5 border-b border-white/5">
            <div class="flex items-center gap-2">
              <i class="fas fa-brain text-indigo-400 text-sm"></i>
              <span class="font-black text-white text-sm">Active Recall</span>
            </div>
            <button onclick="ZP.closeRecallModal()"
              class="text-slate-600 hover:text-white transition-colors w-8 h-8 
                     flex items-center justify-center rounded-lg hover:bg-white/5">
              <i class="fas fa-times text-sm"></i>
            </button>
          </div>
          <div id="recall-content" class="p-6">
            <!-- Dynamischer Inhalt -->
          </div>
        </div>
      </div>
    </div>

    <!-- ── PROBEKLAUSUR MODAL ────────────────────────────────── -->
    <div id="pk-modal" class="fixed inset-0 z-[210] flex items-center justify-center p-4 hidden"
         style="background:rgba(0,0,0,.85);backdrop-filter:blur(12px)">
      <div class="w-full max-w-2xl" style="animation:modalIn .4s cubic-bezier(.16,1,.3,1) both">
        <div class="glass rounded-3xl border border-orange-500/15 overflow-hidden">
          <div class="flex items-center justify-between p-5 border-b border-white/5
               bg-gradient-to-r from-orange-500/5 to-transparent">
            <div class="flex items-center gap-3">
              <div class="w-8 h-8 bg-orange-500/20 rounded-lg flex items-center justify-center">
                <i class="fas fa-file-contract text-orange-400 text-sm"></i>
              </div>
              <span class="font-black text-white text-sm uppercase tracking-wider">
                Probeklausur
              </span>
            </div>
            <button onclick="ZP.closeProbeklausur()"
              class="text-slate-600 hover:text-red-400 transition-colors w-8 h-8 
                     flex items-center justify-center rounded-lg hover:bg-red-500/5">
              <i class="fas fa-times text-sm"></i>
            </button>
          </div>
          <div id="pk-content" class="p-6">
            <!-- Dynamischer Inhalt -->
          </div>
        </div>
      </div>
    </div>

    <!-- ── LERNBUCH VIEWER ───────────────────────────────────── -->
    <div id="lb-modal" class="fixed inset-0 z-[220] flex items-center justify-center p-4 hidden"
         style="background:rgba(0,0,0,.85);backdrop-filter:blur(12px)">
      <div class="w-full max-w-2xl" style="animation:modalIn .4s cubic-bezier(.16,1,.3,1) both">
        <div class="glass rounded-3xl border border-white/10 overflow-hidden">
          <div class="flex items-center justify-between p-5 border-b border-white/5">
            <div class="flex items-center gap-2 min-w-0">
              <i class="fas fa-book-open text-indigo-400 shrink-0"></i>
              <span id="lb-modal-title" class="font-bold text-white text-sm truncate"></span>
            </div>
            <button onclick="$('lb-modal').classList.add('hidden')"
              class="text-slate-600 hover:text-white transition-colors w-8 h-8 shrink-0
                     flex items-center justify-center rounded-lg hover:bg-white/5">
              <i class="fas fa-times text-sm"></i>
            </button>
          </div>
          <div id="lb-modal-content" 
               class="p-6 max-h-[70vh] overflow-y-auto custom-scroll text-sm leading-relaxed">
          </div>
        </div>
      </div>
    </div>
    `;
  }

  // Lernbücher-Übersicht
  function openLernbuecher() {
    ensureModalsExist();
    const books = getLernbuecher();
    $('lb-modal-title').textContent = 'Meine Lernhefte';
    $('lb-modal-content').innerHTML = books.length === 0
      ? `<div class="text-center py-10">
           <i class="fas fa-book text-slate-700 text-4xl mb-4 block"></i>
           <p class="text-slate-500">Noch keine Lernhefte vorhanden.</p>
         </div>`
      : books.map(b => `
          <div class="flex items-center gap-3 p-3 glass rounded-xl mb-2 group cursor-pointer"
               onclick="ZP.viewLernbuch(${b.id})">
            <div class="w-9 h-9 bg-indigo-500/10 text-indigo-400 rounded-lg flex 
                 items-center justify-center shrink-0">
              <i class="fas fa-book-open text-xs"></i>
            </div>
            <div class="flex-1 min-w-0">
              <p class="text-white text-xs font-bold truncate">${b.title}</p>
              <p class="text-slate-600 text-[10px]">${b.date}</p>
            </div>
            <button onclick="event.stopPropagation(); ZP.deleteLernbuch(${b.id})"
              class="text-slate-700 hover:text-red-400 transition-colors opacity-0 
                     group-hover:opacity-100">
              <i class="fas fa-trash text-xs"></i>
            </button>
          </div>
        `).join('');
    $('lb-modal').classList.remove('hidden');
  }

  function showToast(message, type = 'info') {
    const colors = {
      info: 'bg-indigo-500/20 border-indigo-500/30 text-indigo-300',
      error: 'bg-red-500/20 border-red-500/30 text-red-300',
      success: 'bg-emerald-500/20 border-emerald-500/30 text-emerald-300'
    };
    const toast = document.createElement('div');
    toast.className = `fixed bottom-6 left-1/2 -translate-x-1/2 z-[300] 
      ${colors[type]} border rounded-2xl px-5 py-3 text-sm font-bold 
      shadow-xl backdrop-blur-sm`;
    toast.style.animation = 'fadeUp .3s ease both';
    toast.textContent = message;
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 3000);
  }

  // ─── PUBLIC API ───────────────────────────────────────────────
  return {
    init: () => {
      renderLernbuecher();
      console.log('✅ ZP Engine initialisiert');
    },
    openHub,
    closeHub,
    startRecallMode,
    startProbeklausur,
    skipToAbfrage,
    addTime,
    submitAnswer,
    skipAnswer,
    saveExamAnswer,
    submitProbeklausur,
    closeProbeklausur,
    closeRecallModal,
    viewLernbuch,
    deleteLernbuch,
    openLernbuecher,
    renderLernbuecher
  };

})();

// Auto-Init
document.addEventListener('DOMContentLoaded', () => ZP.init());
