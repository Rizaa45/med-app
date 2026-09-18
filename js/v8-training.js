/* ════════════════════════════════════════════════════════════════
   V8 VIEW — TRAINING (Readiness-Hero · SRS-Loop · Quiz · Ergebnisse)
   Port der React-TrainingView: 3 Modi, Fragen-Renderer, Selbstbewertung
   ════════════════════════════════════════════════════════════════ */

const TrainingState = {
  phase: "home", // home | quiz | grading | result
  mode: "review", // review | targeted | exam
  moduleId: "0",
  questions: [],
  currentIdx: 0,
  answers: {},
  result: null,
  startTime: 0,
  revealed: {},
};

function renderTraining() {
  const root = document.getElementById("view-root");
  if (TrainingState.phase === "quiz") return renderQuiz(root);
  if (TrainingState.phase === "grading") return renderGrading(root);
  if (TrainingState.phase === "result") return renderResult(root);
  renderTrainingHome(root);
}

/* ═══ HOME ═══ */
async function renderTrainingHome(root) {
  root.innerHTML = `<div class="flex justify-center py-16"><div class="h-7 w-7 animate-spin rounded-full border-4 border-violet-500/20 border-t-violet-500"></div></div>`;
  const modules = await V8Data.modules();
  TrainingState.modules = modules;
  const stats = V8Store.stats();
  const rInfo = readinessLabel(stats.readiness);
  const dueToday = stats.dueToday || 0;
  const recent = V8Store.exams().slice(0, 5);

  root.innerHTML = `
  <div class="mx-auto max-w-5xl space-y-5 px-3 py-5 sm:px-5">
    <div class="anim-fade-up">
      <p class="text-[11px] font-bold uppercase tracking-widest text-violet-400/80">Training</p>
      <h1 class="mt-1 text-2xl font-black tracking-tight text-white sm:text-3xl">Bereit für heute?</h1>
    </div>

    <!-- Readiness-Hero -->
    <div class="glass-strong overflow-hidden rounded-2xl p-0 anim-fade-up" style="animation-delay:0.05s">
      <div class="grid gap-4 p-5 sm:grid-cols-[auto_1fr] sm:p-6">
        <div class="flex items-center justify-center">
          ${progressRing(stats.readiness, 140, 12, rInfo.color, `
            <div class="text-center">
              <div class="text-3xl font-black t-num text-white">${stats.readiness}%</div>
              <div class="text-[10px] font-bold uppercase tracking-wider" style="color:${rInfo.color}">${rInfo.emoji} ${rInfo.label}</div>
            </div>`)}
        </div>
        <div class="flex flex-col justify-center">
          <h2 class="text-base font-black text-white">Prüfungsbereitschaft</h2>
          <p class="mt-1 text-[13px] leading-relaxed text-slate-400">
            ${dueToday > 0 ? `${dueToday} Karten zur Wiederholung fällig.` : "Alles durchgearbeitet — schau morgen wieder rein!"} Tagesziel: ${stats.todayReviewed}/20.
          </p>
          <div class="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
            ${miniStat("zap", "Heute", `${stats.todayReviewed}/20`, "#8b5cf6")}
            ${miniStat("flame", "Serie", `${stats.streak}T`, "#f59e0b")}
            ${miniStat("brain", "Karten", stats.totalCards, "#6366f1")}
            ${miniStat("target", "Ø Examen", `${stats.avgExam}%`, "#14b8a6")}
          </div>
        </div>
      </div>
    </div>

    <!-- Modus-Karten -->
    <div class="grid grid-cols-1 gap-3 sm:grid-cols-3 anim-fade-up" style="animation-delay:0.1s">
      ${modeCard("review", "brain", "Tägliche Wiederholung", "SRS-Loop · fällige Karten", "#8b5cf6", dueToday > 0 ? `${dueToday} fällig` : null)}
      ${modeCard("targeted", "target", "Gezieltes Training", "Modul oder Schwächen", "#14b8a6", null)}
      ${modeCard("exam", "graduation-cap", "Prüfungssimulation", "1:1 Papier-Format · Modulklausur oder Zwischenprüfung", "#ef4444", null)}
    </div>

    <!-- Konfiguration -->
    ${(TrainingState.mode === "targeted" || TrainingState.mode === "exam") ? `
    <div class="glass-card space-y-3 rounded-2xl p-4 anim-fade-up">
      <label class="text-[11px] font-bold uppercase tracking-wider text-slate-400">${TrainingState.mode === "exam" ? "Klausur-Modul (in der Simulation wählbar)" : "Modul"}</label>
      <div class="flex gap-1.5 overflow-x-auto pb-1 no-scrollbar">
        ${TrainingState.mode === "targeted" ? modChip("0", "Alle", "#8b5cf6") : ""}
        ${modules.map((m) => modChip(`mod_${m.id}`, `M${m.id}`, m.accent)).join("")}
      </div>
      ${TrainingState.mode === "exam" ? `
      <p class="flex items-start gap-2 rounded-lg border border-red-500/20 bg-red-500/8 p-3 text-[11px] leading-relaxed text-red-200/80">
        <i data-lucide="file-text" class="mt-0.5 h-3.5 w-3.5 shrink-0 text-red-300"></i>
        Modulklausur (90 Min, 15 Aufgaben aus der Fragenbank) oder Zwischenprüfung (120 Min + 10 Min Lesezeit, PflAPrV) — als echter Klausurzettel mit Fallbeispiel, Arztbrief und Punktefeldern.
      </p>` : ""}
    </div>` : ""}

    <button id="start-btn" class="gradient-indigo flex w-full items-center justify-center gap-2 rounded-2xl py-3.5 text-sm font-black uppercase tracking-widest text-white shadow-lg shadow-violet-500/25 active:scale-95">
      <i data-lucide="sparkles" class="h-4 w-4"></i>
      ${TrainingState.mode === "review" ? "Wiederholung starten" : TrainingState.mode === "targeted" ? "Training starten" : "Klausur-Simulator öffnen"}
    </button>

    <!-- Letzte Ergebnisse -->
    ${recent.length > 0 ? `
    <div class="glass-card rounded-2xl p-5 anim-fade-up">
      <h3 class="mb-3 flex items-center gap-2 text-sm font-black text-white"><i data-lucide="trophy" class="h-4 w-4 text-amber-400"></i> Letzte Ergebnisse</h3>
      <div class="space-y-2">
        ${recent.map((e) => `
        <div class="flex items-center gap-3 rounded-xl border border-white/5 bg-white/3 p-2.5">
          <div class="flex h-9 w-9 items-center justify-center rounded-lg text-[10px] font-black bg-violet-500/15 text-violet-300">${e.mode === "klausur" || e.mode === "exam" ? "P" : e.mode === "review" ? "R" : "T"}</div>
          <div class="flex-1 text-xs text-slate-300">${esc(e.title || "Training")} · ${e.correct}/${e.total}</div>
          <div class="text-sm font-black t-num" style="color:${e.percentage >= 70 ? "#22c55e" : e.percentage >= 50 ? "#f59e0b" : "#ef4444"}">${e.percentage}%</div>
          <span class="text-[9px] font-bold text-slate-500">${e.note}</span>
        </div>`).join("")}
      </div>
    </div>` : ""}
  </div>`;

  root.querySelectorAll("[data-mode]").forEach((el) => {
    el.addEventListener("click", () => { TrainingState.mode = el.dataset.mode; renderTraining(); });
  });
  root.querySelectorAll("[data-modchip]").forEach((el) => {
    el.addEventListener("click", () => { TrainingState.moduleId = el.dataset.modchip; renderTraining(); });
  });
  document.getElementById("start-btn").addEventListener("click", startTrainingSession);
  refreshIcons();
}

function miniStat(icon, label, value, color) {
  return `
  <div class="rounded-xl border border-white/5 bg-white/3 px-2.5 py-2">
    <div class="flex items-center gap-1 text-[9px] font-bold uppercase tracking-wider text-slate-500"><span style="color:${color}"><i data-lucide="${icon}" class="h-3 w-3"></i></span>${label}</div>
    <div class="mt-0.5 text-base font-black t-num text-white">${value}</div>
  </div>`;
}
function modeCard(mode, icon, title, desc, color, badge) {
  const active = TrainingState.mode === mode;
  return `
  <button data-mode="${mode}" class="glass-card group relative overflow-hidden rounded-2xl p-4 text-left transition-all hover:-translate-y-0.5 hover:border-white/15 active:scale-[0.98] ${active ? "ring-2 ring-violet-500/40" : ""}">
    <div class="absolute -right-4 -top-4 h-16 w-16 rounded-full opacity-15 blur-2xl transition-opacity group-hover:opacity-30" style="background:${color}"></div>
    <div class="relative">
      <div class="mb-2 flex items-center justify-between">
        <div class="flex h-10 w-10 items-center justify-center rounded-xl" style="background:color-mix(in srgb,${color} 18%,transparent);color:${color}"><i data-lucide="${icon}" class="h-5 w-5"></i></div>
        ${badge ? `<span class="rounded-full bg-red-500/20 px-2 py-0.5 text-[9px] font-black uppercase tracking-wider text-red-300 pulse-soft">${badge}</span>` : ""}
      </div>
      <div class="text-sm font-black text-white">${title}</div>
      <div class="text-[11px] text-slate-400">${desc}</div>
    </div>
  </button>`;
}
function modChip(id, label, color) {
  const active = TrainingState.moduleId === id;
  return `
  <button data-modchip="${id}" class="shrink-0 rounded-lg px-2.5 py-1 text-[11px] font-bold transition-all"
    style="${active ? `background:color-mix(in srgb,${color} 18%,transparent);color:${color};border:1px solid color-mix(in srgb,${color} 30%,transparent)` : "background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.08);color:#94a3b8"}">${label}</button>`;
}

/* ═══ SESSION STARTEN ═══ */
// Platzhalter-Ersatz für Trainingsfragen (siehe startTrainingSession)
async function substituteTrainingQuestions(questions) {
  const bankCache = {};
  const getFalls = async (moduleId) => {
    const key = String(moduleId || "0");
    if (!(key in bankCache)) {
      try {
        const bank = moduleId && moduleId !== "0" ? await V8Data.bank(moduleId) : null;
        bankCache[key] = (bank || []).filter((x) => x && x.fall_id && x.variables);
      } catch { bankCache[key] = []; }
    }
    return bankCache[key];
  };
  const out = [];
  for (const q of questions) {
    const raw = JSON.stringify(q);
    if (!/\[[A-ZÄÖÜ_]{3,}\]/.test(raw)) { out.push(q); continue; }
    let vars = null;
    if (q.fallabhaengig) {
      const falls = await getFalls(q.moduleId || TrainingState.moduleId);
      const compat = Array.isArray(q.compatible_falls) && falls.length
        ? falls.filter((f) => q.compatible_falls.includes(f.fall_id)) : [];
      const pool = compat.length ? compat : falls;
      if (pool.length) vars = pool[Math.floor(Math.random() * pool.length)].variables;
    }
    // substituteVariables (v8-exam-engine) bringt bereits Generic-Fallbacks mit
    out.push(substituteVariables(q, vars || {}));
  }
  return out;
}

async function startTrainingSession() {
  // Prüfungssimulation → 1:1 Papier-Klausur-Simulator (eigene Seite, Vollbild)
  if (TrainingState.mode === "exam") {
    const modParam = TrainingState.moduleId !== "0" ? `?module=${TrainingState.moduleId}` : "";
    location.href = `exam-simulator.html${modParam}`;
    return;
  }
  const root = document.getElementById("view-root");
  root.innerHTML = `<div class="flex justify-center py-16"><div class="h-7 w-7 animate-spin rounded-full border-4 border-violet-500/20 border-t-violet-500"></div></div>`;

  let questions = [];
  if (TrainingState.mode === "review") {
    // Fällige SRS-Karten (Port von /api/training/start · mode=review)
    const cards = V8Store.srs();
    const dueIds = Object.entries(cards).filter(([, c]) => (c.dueAt || 0) <= Date.now())
      .sort((a, b) => a[1].dueAt - b[1].dueAt).slice(0, 20).map(([id]) => id);
    if (dueIds.length === 0) {
      // Keine fällig → neue Karten aus allen Fragenbanken in den Lernkreislauf holen
      const all = (await V8Data.allQuestions()).map(normalizeQuestion);
      const seen = new Set(Object.keys(cards));
      const fresh = all.filter((q) => !seen.has(String(q.q_id || q.id)));
      if (fresh.length === 0) { V8Toast.error("Keine Fragen verfügbar."); renderTraining(); return; }
      questions = [...fresh].sort(() => Math.random() - 0.5).slice(0, 15);
    } else {
      const all = await V8Data.allQuestions();
      questions = all.filter((q) => dueIds.includes(String(q.q_id || q.id)));
    }
  } else {
    // targeted: 15 zufällige Fragen aus Modul (oder alle)
    let pool;
    if (TrainingState.moduleId !== "0") pool = await V8Data.bank(TrainingState.moduleId);
    else pool = await V8Data.allQuestions();
    pool = (pool || []).filter((q) => q && q.type && (q.q_id || q.id)).map(normalizeQuestion);
    questions = [...pool].sort(() => Math.random() - 0.5).slice(0, Math.min(15, pool.length));
  }
  if (!questions.length) { V8Toast.error("Keine Fragen verfügbar."); renderTraining(); return; }

  // Platzhalter ([PATIENT]/[PFLEGEKRAFT]) ersetzen — der v8-Server hat die
  // Fall-Variablen vor dem Versenden eingefügt; hier lokal nachgeholt.
  // Fallabhängige Fragen bekommen die Variablen eines passenden Falls,
  // alle anderen neutrale Namen. Nie wieder "[PATIENT]" im Quiz-Text.
  questions = await substituteTrainingQuestions(questions);

  TrainingState.questions = questions;
  TrainingState.answers = {};
  TrainingState.currentIdx = 0;
  TrainingState.result = null;
  TrainingState.revealed = {};
  TrainingState.startTime = Date.now();
  TrainingState.phase = "quiz";
  renderTraining();
}

/* ═══ QUIZ ═══ */
function currentQId() {
  const q = TrainingState.questions[TrainingState.currentIdx];
  return String(q?.q_id || q?.id || `q_${TrainingState.currentIdx}`);
}

function renderQuiz(root) {
  const q = TrainingState.questions[TrainingState.currentIdx];
  if (!q) { TrainingState.phase = "home"; renderTraining(); return; }
  const progress = ((TrainingState.currentIdx + 1) / TrainingState.questions.length) * 100;
  const isReview = TrainingState.mode === "review";
  const revealed = !!TrainingState.revealed[currentQId()];
  const a = TrainingState.answers[currentQId()] ?? null;

  root.innerHTML = `
  <div class="mx-auto max-w-3xl space-y-4 px-3 py-5 sm:px-5">
    <div class="flex items-center justify-between">
      <button onclick="trainingCancel()" class="inline-flex items-center gap-1.5 rounded-lg px-2 py-1 text-xs font-bold text-slate-400 hover:text-white">
        <i data-lucide="arrow-left" class="h-3.5 w-3.5"></i> Abbrechen
      </button>
      <span class="text-xs font-bold text-slate-400 t-num">${TrainingState.currentIdx + 1}/${TrainingState.questions.length}</span>
    </div>
    <div class="h-1.5 overflow-hidden rounded-full bg-white/8">
      <div class="h-full rounded-full bg-gradient-to-r from-violet-400 to-indigo-400 transition-all" style="width:${progress}%"></div>
    </div>

    <div class="glass-card rounded-2xl p-5 sm:p-6 anim-fade">
      <div class="mb-3 flex items-center gap-2">
        <span class="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold text-violet-300" style="background:rgba(139,92,246,0.18);border:1px solid rgba(139,92,246,0.35)">${humanType(q.type)}</span>
        ${q.difficulty ? `<span class="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold text-indigo-300" style="background:rgba(99,102,241,0.18);border:1px solid rgba(99,102,241,0.35)">Schw. ${q.difficulty}</span>` : ""}
        ${q.topic ? `<span class="text-[10px] font-semibold text-slate-500">#${esc(q.topic)}</span>` : ""}
      </div>
      ${trainingQuestionBody(q, revealed, a)}
    </div>

    ${isReview && !revealed ? `
    <button id="reveal-btn" class="flex w-full items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/5 py-3 text-xs font-black uppercase tracking-wider text-slate-200 active:scale-95">
      <i data-lucide="eye" class="h-4 w-4"></i> Antwort zeigen
    </button>` : ""}

    ${isReview && revealed ? `
    <p class="text-center text-[10px] font-bold uppercase tracking-widest text-slate-500">Wie gut konntest du das?</p>
    <div class="flex gap-2">
      <button data-grade="0" class="grade-btn flex-1 rounded-xl border py-3 text-xs font-black uppercase tracking-wider transition-all active:scale-95" style="background:rgba(239,68,68,0.12);color:#ef4444;border-color:rgba(239,68,68,0.3)">Wieder</button>
      <button data-grade="1" class="grade-btn flex-1 rounded-xl border py-3 text-xs font-black uppercase tracking-wider transition-all active:scale-95" style="background:rgba(245,158,11,0.12);color:#f59e0b;border-color:rgba(245,158,11,0.3)">Schwer</button>
      <button data-grade="2" class="grade-btn flex-1 rounded-xl border py-3 text-xs font-black uppercase tracking-wider transition-all active:scale-95" style="background:rgba(34,197,94,0.12);color:#22c55e;border-color:rgba(34,197,94,0.3)">Gut</button>
      <button data-grade="3" class="grade-btn flex-1 rounded-xl border py-3 text-xs font-black uppercase tracking-wider transition-all active:scale-95" style="background:rgba(14,165,233,0.12);color:#0ea5e9;border-color:rgba(14,165,233,0.3)">Einfach</button>
    </div>` : ""}

    ${!isReview ? `
    <button id="next-btn" class="gradient-indigo flex w-full items-center justify-center gap-2 rounded-2xl py-3 text-xs font-black uppercase tracking-wider text-white active:scale-95">
      ${TrainingState.currentIdx === TrainingState.questions.length - 1 ? "Fertig" : "Weiter"} <i data-lucide="chevron-right" class="h-4 w-4"></i>
    </button>` : ""}
  </div>`;

  if (isReview) {
    const rb = document.getElementById("reveal-btn");
    if (rb) rb.addEventListener("click", () => { TrainingState.revealed[currentQId()] = true; renderTraining(); });
    root.querySelectorAll(".grade-btn").forEach((b) => {
      b.addEventListener("click", () => gradeTrainingCard(q, Number(b.dataset.grade)));
    });
  } else {
    document.getElementById("next-btn").addEventListener("click", nextTrainingCard);
  }
  refreshIcons();
}

function trainingQuestionBody(q, revealed, a) {
  const d = q.data || {};
  const showSolution = revealed ? trainingSolution(q) : "";
  if (q.type === "richtig_falsch") {
    const statements = q.statements || d.statements || [{ text: q.statement, answer: q.answer }];
    const single = statements.length === 1;
    return `
    <div>
      ${single ? `<p class="text-base font-semibold text-slate-100">${esc(statements[0].text)}</p>` : `<p class="text-base font-semibold text-slate-100">${fmtMd(q.instruction || "Entscheide bei jeder Aussage: richtig oder falsch?")}</p>`}
      ${!single ? statements.map((s, i) => `
        <div class="mt-2 rounded-xl border border-white/8 bg-white/3 p-3">
          <p class="text-sm text-slate-200">${i + 1}. ${esc(s.text)}</p>
          <div class="mt-2 flex gap-2">
            ${["richtig", "falsch"].map((opt) => {
              const c = opt === "richtig" ? "#22c55e" : "#ef4444";
              const sel = a?.responses?.[i] === opt;
              return `<button data-rfrow="${i}" data-rf="${opt}" class="rf-row-pick flex items-center justify-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-black transition-all active:scale-95"
                style="${sel ? `background:color-mix(in srgb,${c} 18%,transparent);color:${c};border-color:color-mix(in srgb,${c} 35%,transparent)` : "background:rgba(255,255,255,0.03);color:#94a3b8;border-color:rgba(255,255,255,0.08)"}">
                <i data-lucide="${opt === "richtig" ? "check" : "x"}" class="h-3 w-3"></i>${opt === "richtig" ? "Richtig" : "Falsch"}</button>`;
            }).join("")}
          </div>
        </div>`).join("") : ""}
      ${single ? `
      <div class="mt-4 grid grid-cols-2 gap-3">
        ${["richtig", "falsch"].map((opt) => {
          const c = opt === "richtig" ? "#22c55e" : "#ef4444";
          const sel = a === opt;
          return `<button data-rfsingle="${opt}" class="flex items-center justify-center gap-2 rounded-2xl border py-4 text-sm font-black transition-all active:scale-95"
            style="${sel ? `background:color-mix(in srgb,${c} 18%,transparent);color:${c};border-color:color-mix(in srgb,${c} 35%,transparent)` : "background:rgba(255,255,255,0.03);color:#94a3b8;border-color:rgba(255,255,255,0.08)"}">
            <i data-lucide="${opt === "richtig" ? "check" : "x"}" class="h-4 w-4"></i>${opt === "richtig" ? "Richtig" : "Falsch"}</button>`;
        }).join("")}
      </div>` : ""}
      ${showSolution}
    </div>`;
  }
  if (q.type === "nennen_liste") {
    const count = q.count || d.count || 3;
    return `
    <div>
      <p class="text-base font-semibold text-slate-100">${fmtMd(q.instruction || d.instruction || "")}</p>
      <div class="mt-3 space-y-2">
        ${Array.from({ length: count }, (_, i) => `<input data-item="${i}" value="${esc(a?.items?.[i] || "")}" class="w-full rounded-xl border border-white/10 bg-white/5 px-3.5 py-2.5 text-sm text-slate-100 outline-none focus:border-violet-400/50" placeholder="Punkt ${i + 1}">`).join("")}
      </div>
      ${showSolution}
    </div>`;
  }
  if (q.type === "freitext_box") {
    return `
    <div>
      <p class="text-base font-semibold text-slate-100">${fmtMd(q.instruction || d.instruction || "")}</p>
      <textarea data-freetext rows="6" placeholder="Antwort in Pflegefachsprache…" class="mt-3 w-full resize-y rounded-xl border border-white/10 bg-white/5 px-3.5 py-3 text-sm text-slate-100 outline-none focus:border-violet-400/50">${esc(a?.text || "")}</textarea>
      ${showSolution}
    </div>`;
  }
  if (q.type === "zuordnung") {
    const legend = d.legend || {};
    const statements = d.statements || [];
    const keys = Object.keys(legend);
    return `
    <div>
      <p class="text-base font-semibold text-slate-100">${fmtMd(q.instruction || "")}</p>
      <div class="mt-3 flex flex-wrap gap-1.5">
        ${keys.map((k) => `<span class="rounded-lg bg-violet-500/10 px-2 py-1 text-[11px] font-bold text-violet-200 ring-1 ring-violet-500/20">${esc(k)} = ${esc(legend[k])}</span>`).join("")}
      </div>
      <div class="mt-3 space-y-2">
        ${statements.map((s, i) => `
        <div class="rounded-xl border border-white/8 bg-white/3 p-3">
          <p class="text-sm text-slate-200">${esc(s.text)}</p>
          <div class="mt-2 flex gap-1.5">
            ${keys.map((k) => `
            <button data-zu="${i}" data-key="${esc(k)}" class="zu-pick h-8 w-8 rounded-lg text-xs font-black transition-all"
              style="${a?.selections?.[i] === k ? "background:rgba(139,92,246,0.3);color:#c4b5fd;box-shadow:inset 0 0 0 1px rgba(139,92,246,0.4)" : "background:rgba(255,255,255,0.05);color:#94a3b8"}">${esc(k)}</button>`).join("")}
          </div>
        </div>`).join("")}
      </div>
      ${showSolution}
    </div>`;
  }
  if (q.type === "ergaenzen_liste") {
    const missing = d.missing_items || [];
    return `
    <div>
      <p class="text-base font-semibold text-slate-100">${fmtMd(q.instruction || "")}</p>
      ${d.given_items?.length ? `<div class="mt-2 flex flex-wrap gap-1.5">${d.given_items.map((g) => `<span class="rounded-lg bg-white/5 px-2 py-1 text-[11px] text-slate-300">${esc(g)}</span>`).join("")}</div>` : ""}
      <div class="mt-3 space-y-2">
        ${missing.map((_, i) => `<input data-item="${i}" value="${esc(a?.items?.[i] || "")}" class="w-full rounded-xl border border-white/10 bg-white/5 px-3.5 py-2.5 text-sm text-slate-100 outline-none focus:border-violet-400/50" placeholder="Ergänze ${i + 1}">`).join("")}
      </div>
      ${showSolution}
    </div>`;
  }
  if (q.type === "ankreuzen_begruenden") {
    const opts = d.options || [];
    return `
    <div>
      <p class="text-base font-semibold text-slate-100">${esc(q.instruction_select || q.instruction || "")}</p>
      <div class="mt-3 space-y-2">
        ${opts.map((o, i) => `
        <button data-check="${i}" class="cb-pick flex w-full items-center gap-3 rounded-xl border p-3 text-left transition-all" style="${a?.checked?.[i] ? "border-color:rgba(139,92,246,0.3);background:rgba(139,92,246,0.1)" : "border-color:rgba(255,255,255,0.08);background:rgba(255,255,255,0.03)"}">
          <div class="cb-box flex h-6 w-6 items-center justify-center rounded-md border-2" style="${a?.checked?.[i] ? "border-color:#a78bfa;background:rgba(139,92,246,0.3)" : "border-color:rgba(255,255,255,0.2)"}">${a?.checked?.[i] ? `<i data-lucide="check" class="h-3.5 w-3.5 text-white"></i>` : ""}</div>
          <span class="text-sm text-slate-200">${esc(o.label)}</span>
        </button>`).join("")}
      </div>
      ${q.instruction_justify ? `
      <textarea data-justify rows="3" placeholder="Begründe…" class="mt-3 w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-100 outline-none focus:border-violet-400/50">${esc(a?.justify || "")}</textarea>` : ""}
      ${showSolution}
    </div>`;
  }
  if (q.type === "tabelle_2spalten" || q.type === "tabelle_3spalten" || q.type === "tabelle_4spalten" || q.type === "tabelle_vergleich") {
    const table = d.table;
    if (!table) return `<div class="text-slate-400">Tabelle fehlt.</div>`;
    const cells = a?.cells || [];
    const getCell = (r, c) => (cells.find((x) => x.row === r && x.col === c) || {}).value || "";
    return `
    <div>
      <p class="text-base font-semibold text-slate-100">${fmtMd(q.instruction || "")}</p>
      <div class="mt-3 space-y-2" id="quiz-table-wrap" style="background:#fff;border-radius:6px;padding:8px;color:#1a1a1a;font-family:var(--font-jakarta),sans-serif">
        <table class="ep-table">
          <thead><tr>${table.headers.map((h) => `<th>${esc(h)}</th>`).join("")}</tr></thead>
          <tbody>
            ${table.rows.map((row, ri) => `
            <tr>
              ${row.cells.map((cell, ci) => {
                if (cell.type === "text" || cell.type === "static") return `<td>${esc(cell.content || cell.value || "")}</td>`;
                return `<td class="ep-td-input"><input class="ep-input" data-tcell data-r="${ri}" data-c="${ci}" value="${esc(getCell(ri, ci))}"></td>`;
              }).join("")}
            </tr>`).join("")}
          </tbody>
        </table>
      </div>
      ${showSolution}
    </div>`;
  }
  if (q.type === "definition_plus_beispiele") {
    const exCount = d.examples_count || 0;
    const examples = a?.examples || Array.from({ length: exCount }, () => "");
    return `
    <div>
      <p class="text-base font-semibold text-slate-100">${fmtMd(q.instruction || "")}</p>
      <div class="mt-3">
        <label class="mb-1 block text-[11px] font-bold uppercase tracking-wider text-slate-400">${esc(d.definition_label || "Definition")}</label>
        <textarea data-def rows="4" placeholder="Definition…" class="w-full resize-y rounded-xl border border-white/10 bg-white/5 px-3.5 py-3 text-sm text-slate-100 outline-none focus:border-violet-400/50">${esc(a?.definition || "")}</textarea>
      </div>
      ${exCount > 0 ? `
      <div class="mt-3">
        <label class="mb-1 block text-[11px] font-bold uppercase tracking-wider text-slate-400">${esc(d.examples_label || "Beispiele")}</label>
        <div class="space-y-2">
          ${examples.map((val, i) => `<input data-ex="${i}" value="${esc(val)}" class="w-full rounded-xl border border-white/10 bg-white/5 px-3.5 py-2.5 text-sm text-slate-100 outline-none focus:border-violet-400/50" placeholder="Beispiel ${i + 1}">`).join("")}
        </div>
      </div>` : ""}
      ${showSolution}
    </div>`;
  }
  return `<div class="text-slate-400">Unbekannter Fragetyp: ${esc(q.type)}</div>`;
}

function trainingSolution(q) {
  const d = q.data || {};
  if (q.type === "richtig_falsch") {
    const statements = q.statements || d.statements || [{ text: q.statement, answer: q.answer }];
    return `<div class="mt-4 space-y-1 rounded-xl bg-white/5 p-3 text-sm">${statements.map((s) => `
      <div class="flex gap-2"><span class="${s.answer === "richtig" ? "text-emerald-400" : "text-red-400"} font-bold">${s.answer === "richtig" ? "richtig" : "falsch"}</span><span class="text-slate-300">${esc(s.text)}</span></div>`).join("")}
      ${q.explanation || d.explanation ? `<div class="mt-2 rounded bg-sky-500/10 p-2 text-sky-200 text-xs">${esc(q.explanation || d.explanation)}</div>` : ""}</div>`;
  }
  if (q.type === "nennen_liste") {
    return `<div class="mt-4 rounded-xl bg-white/5 p-3"><p class="mb-1 text-[10px] font-black uppercase tracking-wider text-slate-500">Musterlösung</p><ul class="list-disc space-y-0.5 pl-5 text-sm text-emerald-400">${(q.correct_answers || d.correct_answers || []).map((x) => `<li>${esc(x)}</li>`).join("")}</ul></div>`;
  }
  if (q.type === "freitext_box") {
    return `<div class="mt-4 rounded-xl bg-white/5 p-3"><p class="mb-1 text-[10px] font-black uppercase tracking-wider text-slate-500">Musterlösung</p><p class="text-sm italic text-emerald-400">${esc(d.correct_answer || "—")}</p>${d.keywords?.length ? `<p class="mt-1 text-[11px] text-slate-500">Stichworte: <strong class="text-slate-300">${d.keywords.map(esc).join(", ")}</strong></p>` : ""}</div>`;
  }
  if (q.type === "zuordnung") {
    return `<div class="mt-4 rounded-xl bg-white/5 p-3"><p class="mb-1 text-[10px] font-black uppercase tracking-wider text-slate-500">Lösung</p><div class="space-y-0.5 text-sm">${(d.statements || []).map((s) => `<div class="text-slate-300">${esc(s.text)} → <strong class="text-violet-300">${esc(s.answer)}</strong></div>`).join("")}</div></div>`;
  }
  if (q.type === "ergaenzen_liste") {
    return `<div class="mt-4 rounded-xl bg-white/5 p-3"><p class="mb-1 text-[10px] font-black uppercase tracking-wider text-slate-500">Fehlende Begriffe</p><ul class="list-disc space-y-0.5 pl-5 text-sm text-emerald-400">${(d.missing_items || []).map((m) => `<li>${esc(m)}</li>`).join("")}</ul></div>`;
  }
  if (q.type === "ankreuzen_begruenden") {
    return `<div class="mt-4 rounded-xl bg-white/5 p-3"><p class="mb-1 text-[10px] font-black uppercase tracking-wider text-slate-500">Richtige Ankreuzungen</p><div class="space-y-0.5 text-sm">${(d.options || []).map((o) => `<div class="${o.correct ? "text-slate-200" : "text-slate-500"}">${o.correct ? "☑" : "☐"} ${esc(o.label)}</div>`).join("")}</div></div>`;
  }
  if (String(q.type).startsWith("tabelle")) {
    const table = d.table;
    if (!table) return "";
    return `<div class="mt-4 rounded-xl bg-white/5 p-3"><p class="mb-1 text-[10px] font-black uppercase tracking-wider text-slate-500">Lösung</p><ul class="list-disc pl-5 space-y-0.5 text-sm text-emerald-400">${table.rows.map((row) => row.cells.map((c) => c.type === "text" || c.type === "static" ? `` : `<li>${esc(c.correct_answer || "")}</li>`).join("")).join("")}</ul></div>`;
  }
  if (q.type === "definition_plus_beispiele") {
    return `<div class="mt-4 rounded-xl bg-white/5 p-3"><p class="mb-1 text-[10px] font-black uppercase tracking-wider text-slate-500">Musterlösung</p><p class="text-sm italic text-emerald-400">${esc(d.definition_correct || d.definition || "—")}</p>${d.correct_examples?.length ? `<ul class="mt-1 list-disc pl-5 space-y-0.5 text-sm text-emerald-400">${d.correct_examples.map((e) => `<li>${esc(e)}</li>`).join("")}</ul>` : ""}</div>`;
  }
  return "";
}

/* ═══ QUIZ-INTERAKTION (Delegation auf document) ═══ */
(function bindQuizEvents() {
  document.addEventListener("click", (e) => {
    if (TrainingState.phase !== "quiz") return;
    const root = document.getElementById("view-root");
    if (!root) return;
    const qid = currentQId();

    const single = e.target.closest("[data-rfsingle]");
    if (single) { TrainingState.answers[qid] = single.dataset.rfsingle; renderTraining(); return; }

    const rfRow = e.target.closest("[data-rfrow]");
    if (rfRow) {
      const row = Number(rfRow.dataset.rfrow);
      const val = rfRow.dataset.rf;
      const cur = { ...(TrainingState.answers[qid] || {}) };
      cur.responses = cur.responses || [];
      cur.responses[row] = cur.responses[row] === val ? "" : val;
      TrainingState.answers[qid] = cur;
      renderTraining(); return;
    }

    const zu = e.target.closest(".zu-pick");
    if (zu) {
      const row = Number(zu.dataset.zu);
      const key = zu.dataset.key;
      const cur = { ...(TrainingState.answers[qid] || {}) };
      cur.selections = cur.selections || [];
      cur.selections[row] = key;
      TrainingState.answers[qid] = cur;
      renderTraining(); return;
    }

    const cb = e.target.closest(".cb-pick");
    if (cb) {
      const idx = Number(cb.dataset.check);
      const cur = { ...(TrainingState.answers[qid] || {}) };
      cur.checked = cur.checked || [];
      cur.checked[idx] = !cur.checked[idx];
      TrainingState.answers[qid] = cur;
      renderTraining(); return;
    }
  });

  document.addEventListener("input", (e) => {
    if (TrainingState.phase !== "quiz") return;
    const t = e.target;
    const qid = currentQId();
    if (t.matches("[data-item]")) {
      const i = Number(t.dataset.item);
      const cur = { ...(TrainingState.answers[qid] || {}) };
      cur.items = cur.items || [];
      cur.items[i] = t.value;
      TrainingState.answers[qid] = cur;
    } else if (t.matches("[data-freetext]")) {
      TrainingState.answers[qid] = { ...(TrainingState.answers[qid] || {}), text: t.value };
    } else if (t.matches("[data-tcell]")) {
      const r = Number(t.dataset.r), c = Number(t.dataset.c);
      const cur = { ...(TrainingState.answers[qid] || {}) };
      const cells = (cur.cells || []).filter((x) => !(x.row === r && x.col === c));
      cells.push({ row: r, col: c, value: t.value });
      cur.cells = cells;
      TrainingState.answers[qid] = cur;
    } else if (t.matches("[data-def]")) {
      TrainingState.answers[qid] = { ...(TrainingState.answers[qid] || {}), definition: t.value };
    } else if (t.matches("[data-ex]")) {
      const i = Number(t.dataset.ex);
      const cur = { ...(TrainingState.answers[qid] || {}) };
      cur.examples = cur.examples || [];
      cur.examples[i] = t.value;
      TrainingState.answers[qid] = cur;
    } else if (t.matches("[data-justify]")) {
      TrainingState.answers[qid] = { ...(TrainingState.answers[qid] || {}), justify: t.value };
    }
  });
})();

function trainingCancel() {
  if (confirm("Abbrechen?")) { TrainingState.phase = "home"; TrainingState.answers = {}; renderTraining(); }
}
function gradeTrainingCard(q, grade) {
  V8Store.gradeCard(String(q.q_id || q.id), grade);
  V8Store.addReview(grade >= 2 ? 6 : 4);
  nextTrainingCard();
}
function nextTrainingCard() {
  if (TrainingState.currentIdx < TrainingState.questions.length - 1) {
    TrainingState.currentIdx++;
    renderTraining();
  } else {
    finishTraining();
  }
}

/* ═══ AUSWERTUNG (lokale Punkte-Logik wie /api/training/result) ═══ */
function matchKeyword(userText, keyword) {
  if (!userText || !keyword) return false;
  const u = String(userText).toLowerCase().trim();
  const k = String(keyword).toLowerCase().trim();
  if (u.includes(k)) return true;
  if (k.length >= 4 && u.includes(k.substring(0, Math.min(k.length, 5)))) return true;
  return false;
}

function gradeTrainingAnswer(q, a) {
  const d = q.data || {};
  if (a === null || a === undefined) return 0;
  switch (q.type) {
    case "richtig_falsch": {
      const statements = q.statements || d.statements || [{ answer: q.answer }];
      if (typeof a === "string") return a === String(statements[0].answer) ? 1 : 0;
      const responses = a.responses || [];
      let pts = 0;
      statements.forEach((s, i) => { if (responses[i] && String(responses[i]).toLowerCase().startsWith(String(s.answer).toLowerCase().charAt(0))) pts++; });
      return pts;
    }
    case "nennen_liste":
    case "ergaenzen_liste": {
      const valid = q.all_valid_answers || d.all_valid_answers || q.correct_answers || d.correct_answers || (q.type === "ergaenzen_liste" ? d.all_valid_missing || d.missing_items : []) || [];
      const items = (a && a.items) || [];
      let pts = 0; const used = new Set();
      items.forEach((item) => {
        if (!item) return;
        const mi = valid.findIndex((v, vi) => !used.has(vi) && matchKeyword(item, v));
        if (mi >= 0) { pts++; used.add(mi); }
      });
      return pts;
    }
    case "freitext_box": {
      const keywords = d.keywords || [];
      const text = (a && a.text) || "";
      if (!text) return 0;
      const matched = keywords.filter((k) => matchKeyword(text, k)).length;
      const ratio = keywords.length > 0 ? matched / keywords.length : 0;
      return Math.round(ratio * (q.points || 4)) > 0 ? 1 : 0;
    }
    case "zuordnung": {
      const stmts = d.statements || [];
      const sel = (a && a.selections) || [];
      let pts = 0;
      stmts.forEach((s, i) => { if (sel[i] && String(sel[i]).toUpperCase() === String(s.answer).toUpperCase()) pts++; });
      return stmts.length ? pts : 0;
    }
    case "ankreuzen_begruenden": {
      const opts = d.options || [];
      const checked = (a && a.checked) || [];
      let ok = true;
      opts.forEach((o, i) => { if ((checked[i] || false) !== !!o.correct) ok = false; });
      const just = (a && a.justify) || "";
      return (ok ? 1 : 0) + (just.length > 20 ? 1 : 0);
    }
    case "tabelle_2spalten":
    case "tabelle_3spalten":
    case "tabelle_4spalten":
    case "tabelle_vergleich": {
      const table = d.table;
      if (!table) return 0;
      const cells = (a && a.cells) || [];
      let pts = 0;
      table.rows.forEach((row, ri) => {
        row.cells.forEach((cell, ci) => {
          if (cell.type === "input" || cell.type === "textarea") {
            const uc = cells.find((c) => c.row === ri && c.col === ci);
            const keywords = cell.keywords || [];
            if (keywords.length > 0 && keywords.some((k) => matchKeyword(uc?.value || "", k))) pts++;
          }
        });
      });
      return pts;
    }
    case "definition_plus_beispiele": {
      let pts = 0;
      const defText = (a && a.definition) || "";
      const defKeywords = d.definition_keywords || [];
      const defMatched = defKeywords.filter((k) => matchKeyword(defText, k)).length;
      if (defText.length > 30) pts += 1;
      if (defKeywords.length && defMatched >= Math.ceil(defKeywords.length / 2)) pts += 1;
      const validEx = d.all_valid_examples || d.correct_examples || [];
      const userEx = (a && a.examples) || [];
      const used = new Set();
      userEx.forEach((ex) => {
        if (!ex) return;
        const mi = validEx.findIndex((v, vi) => !used.has(vi) && matchKeyword(ex, v));
        if (mi >= 0) { pts++; used.add(mi); }
      });
      return pts;
    }
    default: return 0;
  }
}

function trainingMaxPoints(q) {
  const d = q.data || {};
  switch (q.type) {
    case "richtig_falsch": return (q.statements || d.statements || [1]).length;
    case "nennen_liste": return Math.min(q.count || d.count || 3, (q.correct_answers || d.correct_answers || q.all_valid_answers || d.all_valid_answers || []).length || 3);
    case "ergaenzen_liste": return (d.missing_items || []).length || 1;
    case "freitext_box": return 1;
    case "zuordnung": return (d.statements || []).length || 1;
    case "ankreuzen_begruenden": return 2;
    case "tabelle_2spalten":
    case "tabelle_3spalten":
    case "tabelle_4spalten":
    case "tabelle_vergleich": {
      const table = d.table;
      if (!table) return 1;
      let n = 0;
      table.rows.forEach((row) => row.cells.forEach((cell) => { if (cell.type === "input" || cell.type === "textarea") n++; }));
      return n || 1;
    }
    case "definition_plus_beispiele": return 1 + (d.examples_count || 0);
    default: return 1;
  }
}

function finishTraining() {
  TrainingState.phase = "grading";
  renderTraining();
  setTimeout(() => {
    const isReview = TrainingState.mode === "review";
    const timeSpent = Math.round((Date.now() - TrainingState.startTime) / 1000);
    let correct = 0, total = 0;
    if (isReview) {
      // Review: Selbstbewertung — jede bearbeitete Karte zählt als gelernt
      correct = TrainingState.questions.length;
      total = TrainingState.questions.length;
    } else {
      TrainingState.questions.forEach((q) => {
        const qid = String(q.q_id || q.id);
        const a = TrainingState.answers[qid];
        total += trainingMaxPoints(q);
        correct += Math.min(gradeTrainingAnswer(q, a), trainingMaxPoints(q));
      });
    }
    const pct = total > 0 ? Math.round((correct / total) * 100) : 0;
    TrainingState.result = { total: TrainingState.questions.length, correctPts: correct, totalPts: total, percentage: pct, timeSpent };

    const mod = TrainingState.moduleId !== "0" ? getModule(TrainingState.moduleId.replace("mod_", "")) : null;
    V8Store.addExam({
      id: (isReview ? "rev_" : "trn_") + Date.now(),
      mode: isReview ? "review" : "targeted",
      title: isReview ? "Wiederholung" : mod ? `Training · ${mod.shortName}` : "Gezieltes Training",
      correct, total,
      percentage: pct,
      note: gradeFromPercentage(pct),
      timeSpent,
    });
    TrainingState.phase = "result";
    renderTraining();
  }, 1400);
}

function renderGrading(root) {
  root.innerHTML = `
  <div class="flex min-h-[70vh] flex-col items-center justify-center gap-4">
    ${progressRing(75, 130, 8, "#8b5cf6", `<i data-lucide="sparkles" class="h-7 w-7 text-violet-400"></i>`)}
    <div class="text-center"><h2 class="text-lg font-black text-white">Bewerte Antworten…</h2><p class="text-sm text-slate-400">Deine Session wird ausgewertet.</p></div>
  </div>`;
  refreshIcons();
}

function renderResult(root) {
  const r = TrainingState.result;
  const color = r.percentage >= 70 ? "#22c55e" : r.percentage >= 50 ? "#f59e0b" : "#ef4444";
  root.innerHTML = `
  <div class="mx-auto max-w-3xl space-y-5 px-3 py-5 sm:px-5">
    <div class="glass-strong overflow-hidden rounded-2xl p-0 anim-scale">
      <div class="relative p-6 text-center">
        <div class="absolute inset-0 opacity-20" style="background:radial-gradient(circle at 50% 0%,${color},transparent 60%)"></div>
        <div class="relative">
          ${progressRing(r.percentage, 140, 12, color, `
            <div><div class="text-3xl font-black t-num text-white">${r.percentage}%</div><div class="text-xs font-black" style="color:${color}">${gradeFromPercentage(r.percentage)}</div></div>`)}
          <h1 class="mt-4 text-xl font-black text-white">${r.percentage >= 50 ? "Bestanden! 🎉" : "Nicht bestanden"}</h1>
          <p class="mt-1 text-sm text-slate-400">${r.correctPts}/${r.totalPts} Punkte · ${Math.floor(r.timeSpent / 60)} Min</p>
        </div>
      </div>
    </div>
    <div class="flex gap-3">
      <button onclick="TrainingState.phase='home';TrainingState.questions=[];TrainingState.result=null;renderTraining()" class="flex flex-1 items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/5 py-3 text-xs font-black uppercase tracking-wider text-slate-200 active:scale-95">
        <i data-lucide="rotate-ccw" class="h-4 w-4"></i> Neue Session
      </button>
      <button onclick="V8Router.go('/bibliothek')" class="gradient-indigo flex flex-1 items-center justify-center gap-2 rounded-2xl py-3 text-xs font-black uppercase tracking-wider text-white active:scale-95">
        <i data-lucide="trophy" class="h-4 w-4"></i> Fertig
      </button>
    </div>
  </div>`;
  refreshIcons();
}

function humanType(t) {
  return ({ richtig_falsch: "Richtig/Falsch", nennen_liste: "Nennen", freitext_box: "Freitext", zuordnung: "Zuordnung", ergaenzen_liste: "Ergänzen", ankreuzen_begruenden: "Ankreuzen" })[t] || t;
}
