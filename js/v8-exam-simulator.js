/* ════════════════════════════════════════════════════════════════
   V8 PRÜFUNGS-SIMULATOR — Steuerung (Port des React-ExamSimulator)
   Phasen: Setup → Bogen erstellen → Klausur schreiben → Bewertung → Ergebnis
   Timer · Autosave (5 s) · Session-Restore · Aufgaben-Navigator
   ════════════════════════════════════════════════════════════════ */

const STORAGE_KEY = "slm_active_exam_v1";

const Sim = {
  phase: "setup", // setup | generating | paper | grading | result
  mode: "klausur", // klausur | zwp
  moduleId: "mod_1",
  name: "",
  kurs: "",
  paper: null,
  answers: {},
  result: null,
  timeLeft: 0,
  deadline: 0,
  submitted: false,
  timer: null,
  genProgress: 0,
  genMessage: "",
  gradingMsg: "Klausur wird ausgewertet…",

  // ── Init aus URL + Session-Restore ──
  async init() {
    const user = JSON.parse(localStorage.getItem("slm_user_v8") || "null");
    if (user?.name) this.name = user.name;

    // URL-Parameter (?module=6 oder ?module=mod_6)
    const params = new URLSearchParams(location.search);
    const modParam = params.get("module");
    if (modParam && /^\d$/.test(modParam)) this.moduleId = "mod_" + modParam;
    else if (modParam && /^mod_[1-9]$/.test(modParam)) this.moduleId = modParam;

    // Unterbrochene Prüfung wiederherstellen (v8-Logik)
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const s = JSON.parse(saved);
        if (s?.paper?.aufgaben && s.deadline > Date.now() + 5000) {
          if (confirm("Es läuft noch eine Klausur. Fortsetzen?")) {
            this.paper = s.paper;
            this.answers = s.answers || {};
            this.mode = s.paper.mode;
            this.deadline = s.deadline;
            this.timeLeft = Math.floor((s.deadline - Date.now()) / 1000);
            this.phase = "paper";
            this.startTimer();
          } else {
            localStorage.removeItem(STORAGE_KEY);
          }
        } else {
          localStorage.removeItem(STORAGE_KEY);
        }
      }
    } catch { /* ignore */ }

    this.render();
  },

  // ── RENDER-Dispatcher ──
  render() {
    const root = document.getElementById("sim-root");
    if (this.phase === "setup") return this.renderSetup(root);
    if (this.phase === "generating") return this.renderGenerating(root);
    if (this.phase === "grading") return this.renderGrading(root);
    if (this.phase === "result" && this.result) {
      return renderExamResult(root, this.result.result, this.paper, this.paper.timeMinutes * 60 - this.timeLeft, "Sim.retry()", "Sim.exit()");
    }
    if (this.phase === "paper" && this.paper) return this.renderPaper(root);
    root.innerHTML = "";
  },

  /* ═══ SETUP (v8 SetupScreen) ═══ */
  renderSetup(root) {
    const mod = getModule(this.moduleId.replace("mod_", ""));
    root.innerHTML = `
    <div class="flex min-h-screen items-center justify-center p-4 sm:p-6">
      <div class="w-full max-w-lg overflow-hidden rounded-3xl border border-white/10 bg-slate-900/60 shadow-2xl backdrop-blur anim-modal">
        <div class="bg-gradient-to-br from-violet-600 to-indigo-800 p-8 text-center text-white sm:p-10">
          <div class="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-white/20">
            <i data-lucide="file-text" class="h-8 w-8"></i>
          </div>
          <h1 class="text-2xl font-black tracking-tight sm:text-3xl">Prüfungs-Simulator</h1>
          <p class="mt-2 text-sm font-medium text-violet-200">Leistungsnachweis · 1:1 Papier-Format</p>
        </div>
        <div class="space-y-5 p-6 sm:p-8">
          <!-- Modus -->
          <div class="grid grid-cols-2 gap-2">
            <button data-setmode="klausur" class="rounded-xl border p-3 text-left transition-all ${this.mode === "klausur" ? "border-violet-500/50 bg-violet-500/15" : "border-white/10 bg-white/5 hover:bg-white/8"}">
              <div class="text-xs font-black text-white">Modulklausur</div>
              <div class="mt-1 text-[10px] leading-relaxed text-slate-400">90 Min · Fragenbank<br>15 Aufgaben · Punkte</div>
            </button>
            <button data-setmode="zwp" class="rounded-xl border p-3 text-left transition-all ${this.mode === "zwp" ? "border-orange-500/50 bg-orange-500/15" : "border-white/10 bg-white/5 hover:bg-white/8"}">
              <div class="text-xs font-black text-white">Zwischenprüfung</div>
              <div class="mt-1 text-[10px] leading-relaxed text-slate-400">120+10 Min · PflAPrV<br>KB I–V · 150 P.</div>
            </button>
          </div>

          <!-- Modul (nur Klausur) -->
          ${this.mode === "klausur" ? `
          <div>
            <label class="mb-2 block text-[11px] font-black uppercase tracking-widest text-slate-400">Modul</label>
            <select id="setup-module" class="w-full rounded-xl border-2 border-white/10 bg-white/5 p-3 text-sm font-bold text-slate-100 outline-none focus:border-violet-500 sm:p-4">
              ${MODULES.map((m) => `<option value="mod_${m.id}" class="bg-slate-900" ${this.moduleId === `mod_${m.id}` ? "selected" : ""}>Modul ${m.id}: ${esc(m.name)}</option>`).join("")}
            </select>
          </div>` : ""}

          <!-- Name + Kurs -->
          <div class="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label class="mb-2 block text-[11px] font-black uppercase tracking-widest text-slate-400">Dein Name</label>
              <input id="setup-name" value="${esc(this.name)}" placeholder="Vor- und Nachname" class="w-full rounded-xl border-2 border-white/10 bg-white/5 p-3 text-sm font-bold text-slate-100 outline-none focus:border-violet-500">
            </div>
            <div>
              <label class="mb-2 block text-[11px] font-black uppercase tracking-widest text-slate-400">Kurs</label>
              <input id="setup-kurs" value="${esc(this.kurs)}" placeholder="z.B. OK 24" class="w-full rounded-xl border-2 border-white/10 bg-white/5 p-3 text-sm font-bold text-slate-100 outline-none focus:border-violet-500">
            </div>
          </div>

          <!-- Prüfungshinweise -->
          <div class="rounded-xl border border-amber-500/20 bg-amber-500/10 p-4">
            <div class="flex items-start gap-3">
              <i data-lucide="info" class="mt-0.5 h-4 w-4 shrink-0 text-amber-400"></i>
              <div>
                <p class="text-sm font-bold text-amber-200">Prüfungshinweise</p>
                <ul class="mt-1 space-y-1 text-xs text-amber-300/80">
                  ${this.mode === "klausur" ? `
                  <li>• Bearbeitungszeit: 90 Minuten</li>
                  <li>• Alle Aufgaben bearbeiten — ${esc(mod ? mod.name : "")}</li>
                  <li>• Fallbeispiel genau lesen</li>
                  <li>• Fachbegriffe verwenden, ganze Sätze schreiben</li>` : `
                  <li>• 10 Minuten Lesezeit + 120 Minuten Bearbeitungszeit</li>
                  <li>• 9 Aufgaben über alle Kompetenzbereiche (KB I–V)</li>
                  <li>• Der Prüfungsbogen wird individuell zusammengestellt</li>
                  <li>• Antworten werden automatisch bewertet</li>`}
                </ul>
              </div>
            </div>
          </div>

          <button id="setup-start" class="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-700 py-4 text-sm font-black uppercase tracking-widest text-white shadow-lg shadow-violet-500/25 transition-all hover:from-violet-500 hover:to-indigo-600 active:scale-[0.98]">
            <i data-lucide="play" class="h-4 w-4"></i> ${this.mode === "klausur" ? "Klausur starten" : "Zwischenprüfung starten"}
          </button>
          <button id="setup-exit" class="w-full text-center text-xs font-bold text-slate-500 hover:text-slate-300">Zurück zum Training</button>
        </div>
      </div>
    </div>`;

    root.querySelectorAll("[data-setmode]").forEach((b) => {
      b.addEventListener("click", () => { this.mode = b.dataset.setmode; this.render(); });
    });
    root.querySelector("#setup-module")?.addEventListener("change", (e) => { this.moduleId = e.target.value; });
    root.querySelector("#setup-name")?.addEventListener("input", (e) => { this.name = e.target.value; });
    root.querySelector("#setup-kurs")?.addEventListener("input", (e) => { this.kurs = e.target.value; });
    root.querySelector("#setup-start").addEventListener("click", () => this.startExam());
    root.querySelector("#setup-exit").addEventListener("click", () => this.exit());
    refreshIcons();
  },

  /* ═══ GENERIERUNGS-SCREEN (v8 GeneratingScreen) ═══ */
  renderGenerating(root) {
    const steps = this.mode === "zwp"
      ? ["Lernmaterialien laden", "Fallbeispiel generieren", "Aufgaben 1–5 erstellen", "Aufgaben 6–9 erstellen", "Prüfungsbogen zusammenstellen"]
      : ["Fragenbank laden", "Aufgaben auswählen", "Prüfungsbogen zusammenstellen"];
    const step = this.genProgress >= 92 ? steps.length : Math.max(1, Math.min(steps.length, Math.ceil((Math.max(this.genProgress, 4) / 92) * steps.length)));
    const pct = Math.round(this.genProgress);
    root.innerHTML = `
    <div class="flex min-h-screen flex-col items-center justify-center gap-6 p-6">
      <div class="h-12 w-12 rounded-full border-4 border-violet-500/20 border-t-violet-500 animate-spin"></div>
      <div class="w-full max-w-xs">
        <div class="mb-2 flex items-center justify-between text-[11px] font-black">
          <span class="text-slate-300">${this.mode === "zwp" ? "Deine Zwischenprüfung wird erstellt…" : "Prüfungsbogen wird erstellt…"}</span>
          <span class="t-num text-violet-300">${pct}%</span>
        </div>
        <div class="h-1.5 w-full overflow-hidden rounded-full bg-white/10">
          <div class="h-full rounded-full bg-gradient-to-r from-violet-500 to-indigo-400 transition-all duration-700" style="width:${pct}%"></div>
        </div>
        ${this.genMessage ? `<p class="mt-2.5 text-center text-[11px] leading-relaxed text-violet-300/70">${esc(this.genMessage)}</p>` : ""}
        <div class="mt-4 space-y-2">
          ${steps.map((s, i) => {
            const n = i + 1;
            const state = n < step ? "done" : n === step ? "active" : "idle";
            return `
            <div class="flex items-center gap-3 rounded-lg px-3 py-2 text-xs transition-all ${state === "active" ? "bg-violet-500/10 text-violet-200" : state === "done" ? "text-emerald-300" : "text-slate-600"}">
              ${state === "done" ? `<i data-lucide="check-circle-2" class="h-3.5 w-3.5 shrink-0 text-emerald-400"></i>` :
                state === "active" ? `<div class="h-3.5 w-3.5 shrink-0 animate-spin rounded-full border-2 border-violet-500/20 border-t-violet-500"></div>` :
                `<div class="h-2 w-2 shrink-0 rounded-full bg-slate-700"></div>`}
              <span class="font-semibold">${s}</span>
            </div>`;
          }).join("")}
        </div>
      </div>
      <p class="max-w-xs text-center text-[11px] leading-relaxed text-slate-500">
        ${this.mode === "zwp"
          ? "Der Prüfungsbogen wird nach der PflAPrV-Struktur (Anlage 1) zusammengestellt — mit Fallbeispiel, KB I–V und 150 Punkten."
          : "Aufgaben werden nach dem echten Klausur-Mix ausgewählt"}
      </p>
    </div>`;
    refreshIcons();
  },

  /* ═══ PAPIER (v8 Paper-Phase) ═══ */
  renderPaper(root) {
    const answered = countAnswered(this.paper, this.answers);
    root.innerHTML = `
    <div class="min-h-screen pb-24">
      <!-- Sticky Timer-Leiste -->
      <div class="exam-shell-bar">
        <div class="mx-auto flex h-12 max-w-[880px] items-center justify-between gap-2 px-3 sm:h-14 sm:px-4">
          <button id="cancel-btn" class="flex items-center gap-1 text-xs font-bold text-slate-400 hover:text-white">
            <i data-lucide="arrow-left" class="h-3.5 w-3.5"></i><span class="hidden sm:inline">Abbrechen</span>
          </button>
          <div class="flex items-center gap-2 sm:gap-4">
            <span class="t-num text-[10px] font-bold text-slate-500 sm:text-xs">${answered}/${this.paper.aufgaben.length}</span>
            <div class="flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/5 px-2.5 py-1.5 sm:px-3 ${this.timeLeft <= 300 ? "timer-urgent bg-red-500/10" : ""}">
              <i data-lucide="clock" class="h-3.5 w-3.5 ${this.timeLeft <= 300 ? "text-red-400" : this.timeLeft <= 900 ? "text-amber-400" : "text-orange-400"}"></i>
              <span class="exam-timer-val text-sm font-black ${this.timeLeft <= 300 ? "text-red-400" : this.timeLeft <= 900 ? "text-amber-300" : "text-orange-300"}">${fmtTime(this.timeLeft)}</span>
            </div>
          </div>
          <button id="submit-top" class="rounded-lg bg-gradient-to-r from-orange-500 to-amber-500 px-3 py-1.5 text-[10px] font-black uppercase tracking-wider text-white transition-all hover:opacity-90 sm:px-4 sm:text-xs">Abgeben</button>
        </div>
        <div class="h-1 bg-white/5">
          <div class="h-full bg-gradient-to-r from-orange-500 to-amber-400 transition-all duration-1000" style="width:${Math.max(0, Math.min(100, (this.timeLeft / (this.paper.timeMinutes * 60)) * 100))}%"></div>
        </div>
        <!-- Aufgaben-Navigator -->
        <div class="border-t border-white/5 bg-[#050811]/70 py-1.5">
          <div class="mx-auto flex max-w-[860px] items-center gap-1.5 overflow-x-auto px-3 no-scrollbar sm:gap-2">
            <span class="hidden shrink-0 pr-1 text-[9px] font-black uppercase tracking-widest text-slate-600 sm:inline">Aufgaben</span>
            ${this.paper.aufgaben.map((a) => `
            <button class="exam-nav-chip ${hasTaskAnswer(a, this.answers[a.id]) ? "exam-nav-chip-done" : ""}" data-nav="${a.nr}" title="${esc(a.title || `Aufgabe ${a.nr}`)}">${a.nr}</button>`).join("")}
            <span class="ml-auto shrink-0 pl-2 text-[10px] font-bold text-slate-500 t-num">${answered}/${this.paper.aufgaben.length}</span>
          </div>
        </div>
      </div>

      <!-- Der Prüfungszettel -->
      <div class="px-1.5 pt-6 sm:px-4">
        <div class="exam-paper mx-auto max-w-[860px]" id="paper-container"></div>
      </div>

      <!-- Nach oben -->
      <button id="scroll-top" class="fixed bottom-24 right-4 z-40 flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-slate-900/90 text-slate-300 shadow-lg backdrop-blur hover:text-white sm:right-8">
        <i data-lucide="chevron-up" class="h-4 w-4"></i>
      </button>

      <!-- Sticky Abgeben-Footer -->
      <div class="exam-submit-footer p-3 sm:p-4">
        <div class="mx-auto flex max-w-[860px] items-center justify-between gap-3">
          <span class="text-xs font-bold text-slate-400 sm:text-sm">${answered} von ${this.paper.aufgaben.length} Aufgaben beantwortet</span>
          <button id="submit-main" class="flex items-center gap-2 rounded-xl bg-gradient-to-r from-green-600 to-emerald-600 px-5 py-2.5 text-[11px] font-black uppercase tracking-widest text-white shadow-lg shadow-green-500/20 transition-all hover:from-green-500 hover:to-emerald-500 active:scale-95 sm:px-8 sm:text-sm">
            <i data-lucide="check-circle-2" class="h-4 w-4"></i> ${this.paper.mode === "zwp" ? "Prüfung abgeben" : "Klausur abgeben"}
          </button>
        </div>
      </div>
    </div>`;

    // Papier rendern (Antworten werden via PaperState gepflegt)
    ExamRenderer.render(this.paper, document.getElementById("paper-container"), this.answers);
    this.answers = PaperState.answers; // Referenz übernehmen

    // Navigator: Sprungmarken
    root.querySelectorAll("[data-nav]").forEach((chip) => {
      chip.addEventListener("click", () => {
        document.getElementById(`aufgabe-${chip.dataset.nav}`)?.scrollIntoView({ behavior: "smooth", block: "start" });
      });
    });
    document.getElementById("cancel-btn").addEventListener("click", () => {
      if (confirm("Klausur abbrechen? Eingaben gehen verloren.")) {
        this.stopTimer();
        localStorage.removeItem(STORAGE_KEY);
        this.paper = null; this.answers = {}; this.result = null; this.phase = "setup";
        window.scrollTo({ top: 0 });
        this.render();
      }
    });
    document.getElementById("submit-top").addEventListener("click", () => this.confirmSubmit());
    document.getElementById("submit-main").addEventListener("click", () => this.confirmSubmit());
    document.getElementById("scroll-top").addEventListener("click", () => window.scrollTo({ top: 0, behavior: "smooth" }));
    refreshIcons();
  },

  // Navigator + Zähler live aktualisieren (bei jeder Antwort)
  updateNav() {
    if (this.phase !== "paper" || !this.paper) return;
    const answered = countAnswered(this.paper, this.answers);
    document.querySelectorAll("[data-nav]").forEach((chip) => {
      const a = this.paper.aufgaben.find((x) => String(x.nr) === chip.dataset.nav);
      if (a) chip.classList.toggle("exam-nav-chip-done", hasTaskAnswer(a, this.answers[a.id]));
    });
    document.querySelectorAll(".t-num.text-slate-500, .t-num.text-slate-500.t-num").forEach(() => {});
    const counters = document.querySelectorAll("#sim-root .t-num");
    // Zähler in der Timer-Leiste und im Footer aktualisieren
    const barCount = document.querySelector(".exam-shell-bar .t-num");
    if (barCount) barCount.textContent = `${answered}/${this.paper.aufgaben.length}`;
    const footCount = document.querySelector(".exam-submit-footer span");
    if (footCount) footCount.textContent = `${answered} von ${this.paper.aufgaben.length} Aufgaben beantwortet`;
  },

  /* ═══ BEWERTUNG ═══ */
  renderGrading(root) {
    root.innerHTML = `
    <div class="flex min-h-[80vh] flex-col items-center justify-center gap-5 px-4">
      <div class="relative">
        <div class="h-16 w-16 animate-spin rounded-full border-4 border-violet-500/20 border-t-violet-500"></div>
        <i data-lucide="sparkles" class="absolute inset-0 m-auto h-6 w-6 text-violet-400"></i>
      </div>
      <div class="text-center">
        <h2 class="text-lg font-black text-white">Deine Klausur wird bewertet…</h2>
        <p class="mt-1 text-sm text-slate-400">${esc(this.gradingMsg)}</p>
      </div>
    </div>`;
    refreshIcons();
  },

  /* ═══ FLOW ═══ */
  async startExam() {
    if (!this.name.trim()) { V8Toast.error("Bitte Name eingeben!"); return; }
    this.phase = "generating";
    this.genProgress = 0;
    this.genMessage = "";
    this.render();

    if (this.mode === "klausur") {
      // Fragenbank laden → Bogen generieren (mit sichtbaren Schritten)
      const modId = this.moduleId;
      const animate = this.animateProgress(1400);
      const bank = await V8Data.bank(modId);
      if (!bank || !bank.length) { V8Toast.error("Fragenbank nicht gefunden."); this.phase = "setup"; this.render(); return; }
      const paper = generateKlausur(bank, modId, this.name.trim(), this.kurs.trim());
      await animate;
      this.finishGeneration(paper);
    } else {
      // ZWP: simulierter Generierungs-Flow wie in der v8-App (~2,5 s)
      await generateZwischenpruefung(this.name.trim(), this.kurs.trim(), (p, m) => {
        this.genProgress = Math.max(this.genProgress, p);
        if (m) this.genMessage = m;
        if (this.phase === "generating") this.render();
      }).then(({ paper }) => this.finishGeneration(paper));
    }
  },

  // Sanfter Fortschritts-Creep für die Klausur-Generierung
  animateProgress(ms) {
    return new Promise((resolve) => {
      const t0 = Date.now();
      const iv = setInterval(() => {
        const elapsed = Date.now() - t0;
        const target = Math.min(92, (elapsed / ms) * 92);
        this.genProgress = Math.max(this.genProgress, target);
        this.genMessage = target < 35 ? "Fragenbank wird geladen…" : target < 70 ? "Aufgaben werden nach Klausur-Mix ausgewählt…" : "Prüfungsbogen wird zusammengestellt…";
        if (this.phase === "generating") this.render();
        if (elapsed >= ms) { clearInterval(iv); resolve(); }
      }, 250);
    });
  },

  finishGeneration(paper) {
    this.genProgress = 100;
    this.paper = paper;
    this.answers = {};
    this.result = null;
    this.submitted = false;
    this.deadline = Date.now() + paper.timeMinutes * 60 * 1000;
    this.timeLeft = paper.timeMinutes * 60;
    this.phase = "paper";
    window.scrollTo({ top: 0 });
    this.render();
    this.startTimer();
    V8Toast.success("Prüfungsbogen erstellt — viel Erfolg!");
  },

  startTimer() {
    this.stopTimer();
    this.timer = setInterval(() => {
      const left = Math.floor((this.deadline - Date.now()) / 1000);
      this.timeLeft = left;
      // Timer-Anzeige live aktualisieren (ohne Neu-Rendern des Papiers)
      const timerVal = document.querySelector(".exam-timer-val");
      if (timerVal) {
        timerVal.textContent = fmtTime(Math.max(0, left));
        const urgent = left <= 300;
        timerVal.className = `exam-timer-val text-sm font-black ${urgent ? "text-red-400" : left <= 900 ? "text-amber-300" : "text-orange-300"}`;
        const box = timerVal.closest("div");
        if (box) box.classList.toggle("timer-urgent", urgent), box.classList.toggle("bg-red-500/10", urgent);
        const clock = box?.querySelector("svg, i");
        if (clock) clock.style.color = urgent ? "#f87171" : left <= 900 ? "#fbbf24" : "#fb923c";
        // Progress-Bar der Zeit
        const bar = document.querySelector(".exam-shell-bar .h-1 > div");
        if (bar) bar.style.width = `${Math.max(0, Math.min(100, (left / (this.paper.timeMinutes * 60)) * 100))}%`;
      }
      if (left <= 0) {
        this.stopTimer();
        V8Toast.warning("Zeit abgelaufen — die Klausur wird automatisch abgegeben.");
        this.submitExam(true);
      }
    }, 1000);
  },
  stopTimer() { if (this.timer) { clearInterval(this.timer); this.timer = null; } },

  persist() {
    try {
      if (this.paper && this.phase === "paper") {
        localStorage.setItem(STORAGE_KEY, JSON.stringify({ paper: this.paper, answers: this.answers, deadline: this.deadline }));
      }
    } catch { /* ignore */ }
  },

  confirmSubmit() {
    if (!this.paper) return;
    const total = this.paper.aufgaben.length;
    const answered = countAnswered(this.paper, this.answers);
    const msg = answered < total
      ? `Nur ${answered} von ${total} Aufgaben beantwortet. Wirklich abgeben?`
      : "Klausur wirklich abgeben?";
    if (confirm(msg)) this.submitExam(false);
  },

  async submitExam(auto = false) {
    if (this.submitted || !this.paper) return;
    this.submitted = true;
    this.stopTimer();
    localStorage.removeItem(STORAGE_KEY);
    this.phase = "grading";
    this.gradingMsg = "Klausur wird ausgewertet…";
    this.render();
    window.scrollTo({ top: 0 });

    const timeSpent = Math.max(0, this.paper.timeMinutes * 60 - Math.floor((this.deadline - Date.now()) / 1000));

    // Bewertungs-Flow mit Live-Meldungen (wie der KI-Pass der v8-App)
    await new Promise((r) => setTimeout(r, 900));
    this.gradingMsg = "Richtig/Falsch- und Multiple-Choice-Aufgaben werden geprüft…";
    this.render();
    await new Promise((r) => setTimeout(r, 900));
    this.gradingMsg = "Freitext-Antworten werden bewertet (Antworttiefe, Fachsprache)…";
    this.render();
    await new Promise((r) => setTimeout(r, 1100));

    const result = gradeExam(this.paper, this.answers, timeSpent);

    // In den Prüfungsverlauf speichern (wie ExamRecord in v8)
    try {
      const exams = JSON.parse(localStorage.getItem("slm_exams_v8") || "[]");
      exams.unshift({
        id: "exam_" + Date.now(),
        mode: this.paper.mode,
        moduleId: this.paper.mode === "klausur" ? this.moduleId : null,
        title: this.paper.mode === "zwp" ? "Zwischenprüfung" : this.paper.subtitle,
        correct: result.totalEarned, total: result.totalPossible,
        percentage: result.percentage, note: result.note,
        timeSpent, weaknesses: result.weakTopics, createdAt: new Date().toISOString(),
      });
      localStorage.setItem("slm_exams_v8", JSON.stringify(exams.slice(0, 60)));
    } catch { /* ignore */ }

    this.result = { result, paper: this.paper };
    this.phase = "result";
    window.scrollTo({ top: 0 });
    this.render();
  },

  retry() {
    this.stopTimer();
    localStorage.removeItem(STORAGE_KEY);
    this.paper = null; this.answers = {}; this.result = null; this.phase = "setup";
    this.submitted = false;
    window.scrollTo({ top: 0 });
    this.render();
  },

  exit() {
    this.stopTimer();
    localStorage.removeItem(STORAGE_KEY);
    location.href = "index.html#/training";
  },
};

// ── Antwort-Änderungen: Autosave + Navigator-Update (v8-Logik) ──
window.__onAnswerChanged = function () {
  if (Sim.phase === "paper" && Sim.paper) {
    Sim.answers = PaperState.answers;
    Sim.persist();
    Sim.updateNav();
  }
};

// ── Autosave alle 5 s (v8: persist-Intervall) ──
setInterval(() => { if (Sim.phase === "paper") Sim.persist(); }, 5000);

// ── Vor dem Verlassen warnen (nur in der Papier-Phase) ──
window.addEventListener("beforeunload", (e) => {
  if (Sim.phase === "paper") { e.preventDefault(); e.returnValue = ""; }
});

// ── Start ──
document.addEventListener("DOMContentLoaded", () => Sim.init());
