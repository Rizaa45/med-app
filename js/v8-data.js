/* ════════════════════════════════════════════════════════════════
   SLM SYSTEM v8 — DATA (Module · Lerneinheiten · Fragenbanken ·
   lokale Stores: SRS, Prüfungsverlauf, Notizen)
   Alle Daten liegen als JSON neben der App — kein Server nötig.
   ════════════════════════════════════════════════════════════════ */

const V8Data = {
  _modules: null,
  _summaries: null,
  _banks: {},

  // Pfad-Präfix auflösen (Root-Deploy UND /med-app/ Sub-Pfad wie GitHub Pages)
  _base() {
    // "<origin>/<base>/index.html" → JSON liegt relativ zur Startseite
    const path = location.pathname.replace(/[^/]*$/, ""); // bis letztem /
    return (path || "/").replace(/\/$/, "");
  },
  _url(rel) {
    const base = this._base();
    return (base ? base + "/" : "/") + rel;
  },

  // JSON laden (3 Pfad-Varianten für verschiedene Deploy-Szenarien)
  async fetchJson(rel) {
    const candidates = [
      this._url(rel),
      rel.replace(/^\//, ""),
      rel.replace(/^data\//, "data/"),
    ];
    for (const url of candidates) {
      try {
        const res = await fetch(url, { cache: "no-store" });
        if (res.ok) {
          const ct = res.headers.get("content-type") || "";
          if (ct.includes("json") || ct.includes("text/plain")) {
            try { return await res.json(); } catch { /* nächste Variante */ }
          }
        }
      } catch { /* nächste Variante */ }
    }
    return null;
  },

  // ── Module ──
  async modules() {
    if (this._modules) return this._modules;
    // 1) Lokale eingebettete Daten (js/data-local.js — funktioniert auch unter file://)
    const local = window.__SLM_DATA__;
    if (local && Array.isArray(local.modules) && local.modules.length) {
      this._modules = local.modules.map((m) => ({
        id: Number(String(m.id).replace("mod_", "")),
        name: m.name, shortName: m.shortName, description: m.description,
        accent: m.accent || "#8b5cf6", competencyArea: m.competencyArea || "",
      }));
      return this._modules;
    }
    // 2) Fallback: JSON nachladen (nur Server-Deploy)
    const fromJson = await this.fetchJson("data/modules.json");
    if (Array.isArray(fromJson) && fromJson.length) {
      this._modules = fromJson.map((m) => ({
        id: Number(String(m.id).replace("mod_", "")),
        name: m.name, shortName: m.shortName, description: m.description,
        accent: m.accent || "#8b5cf6", competencyArea: m.competencyArea || "",
      }));
    } else {
      this._modules = MODULES.map((m) => ({ ...m }));
    }
    return this._modules;
  },

  // ── Lerneinheiten (Bibliothek) ──
  async summaries() {
    if (this._summaries) return this._summaries;
    const local = window.__SLM_DATA__;
    if (local && local.summaries && typeof local.summaries === "object" && Object.keys(local.summaries).length) {
      const out = {};
      Object.entries(local.summaries).forEach(([modId, units]) => {
        const id = Number(String(modId).replace("mod_", ""));
        out[id] = units;
      });
      this._summaries = out;
      return this._summaries;
    }
    const fromJson = await this.fetchJson("data/summaries.json");
    if (fromJson && typeof fromJson === "object") {
      const out = {};
      Object.entries(fromJson).forEach(([modId, units]) => {
        const id = Number(String(modId).replace("mod_", ""));
        out[id] = units;
      });
      this._summaries = out;
    } else {
      this._summaries = {};
    }
    return this._summaries;
  },

  // ── Fragenbank eines Moduls (question-banks) ──
  async bank(moduleId) {
    const id = Number(String(moduleId).replace("mod_", ""));
    if (this._banks[id]) return this._banks[id];
    // 1) Lokale eingebettete Bank (js/data-local.js)
    const local = window.__SLM_DATA__;
    if (local && local.banks && local.banks[String(id)]) {
      const arr = local.banks[String(id)];
      this._banks[id] = Array.isArray(arr) ? arr : (arr && arr.questions) || [];
      return this._banks[id];
    }
    // 2) Fallback: fetch (Server-Deploy)
    const json = await this.fetchJson(`data/question-banks/module${id}_questions.json`);
    const arr = Array.isArray(json) ? json : json?.questions || [];
    this._banks[id] = arr;
    return arr;
  },

  // ── Alle Fragen (Training „Alle“ / ZWP-Kontext) ──
  async allQuestions() {
    const mods = await this.modules();
    const out = [];
    for (const m of mods) {
      const bank = await this.bank(m.id);
      (bank || []).forEach((q) => {
        if (q && (q.q_id || q.id) && q.type) out.push({ ...q, moduleId: m.id });
      });
    }
    return out;
  },
};

/* ════════════════════════════════════════════════════════════════
   LOKALE STORES (localStorage — ersetzen DB/NextAuth)
   ════════════════════════════════════════════════════════════════ */
const V8Store = {
  read(key, fallback) {
    try { return JSON.parse(localStorage.getItem(key) ?? "null") ?? fallback; } catch { return fallback; }
  },
  write(key, value) {
    try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* ignore */ }
  },

  // ── SRS-Karten (Tägliche Wiederholung) ──
  // slm_srs_v8: { [qId]: { lastGrade, dueAt, interval, repetitions, lapses } }
  srs() { return this.read("slm_srs_v8", {}); },
  saveSrs(cards) { this.write("slm_srs_v8", cards); },
  gradeCard(qId, grade) {
    const cards = this.srs();
    const now = Date.now();
    const c = cards[qId] || { interval: 0, repetitions: 0, lapses: 0, dueAt: now };
    // SM-2-light (wie v8 /api/srs/grade)
    if (grade === 0) { c.repetitions = 0; c.lapses += 1; c.interval = 0.35; }
    else if (grade === 1) { c.interval = Math.max(1, (c.interval || 0) * 1); }
    else if (grade === 2) { c.repetitions += 1; c.interval = c.repetitions === 1 ? 1 : Math.min(180, Math.round((c.interval || 1) * 2.5) || 2); }
    else { c.repetitions += 1; c.interval = c.repetitions === 1 ? 3 : Math.min(180, Math.round((c.interval || 3) * 2.8) || 4); }
    c.lastGrade = grade;
    c.lastReviewed = now;
    c.dueAt = now + c.interval * 86400000;
    cards[qId] = c;
    this.saveSrs(cards);
  },

  // ── Täglicher Fortschritt ──
  // slm_progress_v8: { [YYYY-MM-DD]: { reviewed, xp, goalMet } }
  progress() { return this.read("slm_progress_v8", {}); },
  addReview(xp = 5) {
    const today = new Date().toISOString().slice(0, 10);
    const p = this.progress();
    const t = p[today] || { reviewed: 0, xp: 0, goalMet: false };
    t.reviewed += 1;
    t.xp += xp;
    if (t.reviewed >= 20) t.goalMet = true;
    p[today] = t;
    this.write("slm_progress_v8", p);
  },

  // ── Stats (Port von /api/srs/stats) ──
  stats() {
    const cards = Object.values(this.srs());
    const totalCards = cards.length;
    const matureCards = cards.filter((c) => (c.interval || 0) >= 7).length;
    const dueToday = cards.filter((c) => (c.dueAt || 0) <= Date.now()).length;
    const exams = this.exams();
    const recentExams = exams.slice(0, 3);
    const avgExam = recentExams.length ? Math.round(recentExams.reduce((s, e) => s + e.percentage, 0) / recentExams.length) : 0;
    const progress = this.progress();
    const todayReviewed = progress[new Date().toISOString().slice(0, 10)]?.reviewed || 0;
    const todayXp = progress[new Date().toISOString().slice(0, 10)]?.xp || 0;
    // Serie: aufeinanderfolende Tage mit erreichtem Tagesziel (≥20 Karten)
    let streak = 0;
    const d = new Date();
    while (true) {
      const key = d.toISOString().slice(0, 10);
      if (progress[key]?.goalMet) { streak += 1; d.setDate(d.getDate() - 1); }
      else if (streak === 0 && key === new Date().toISOString().slice(0, 10)) { d.setDate(d.getDate() - 1); } // heute darf noch fehlen
      else break;
      if (streak > 365) break;
    }
    const matureRatio = totalCards ? matureCards / totalCards : 0;
    const readiness = Math.round(
      Math.min(100, matureRatio * 40 + (avgExam / 100) * 30 + (totalCards > 0 ? 20 : 0) + (Math.min(streak, 7) / 7) * 10)
    );
    return { totalCards, matureCards, dueToday, todayReviewed, todayXp, streak, readiness, avgExam };
  },

  // ── Prüfungsverlauf ──
  // slm_exams_v8: [{ id, mode, moduleId, title, percentage, note, correct, total, timeSpent, weaknesses, createdAt }]
  exams() { return this.read("slm_exams_v8", []); },
  addExam(entry) {
    const exams = this.exams();
    exams.unshift({ ...entry, createdAt: new Date().toISOString() });
    this.write("slm_exams_v8", exams.slice(0, 60));
  },

  // ── Notizen (Notizbuch) ──
  // slm_notes_v8: [{ id, moduleId, text, createdAt, updatedAt }]
  notes() { return this.read("slm_notes_v8", []); },
  saveNotes(notes) { this.write("slm_notes_v8", notes); },
  addNote(moduleId, text) {
    const notes = this.notes();
    const n = { id: "note_" + Date.now(), moduleId: Number(moduleId) || 0, text, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
    notes.unshift(n);
    this.saveNotes(notes);
    return n;
  },
  updateNote(id, text) {
    const notes = this.notes();
    const n = notes.find((x) => x.id === id);
    if (n) { n.text = text; n.updatedAt = new Date().toISOString(); this.saveNotes(notes); }
  },
  deleteNote(id) { this.saveNotes(this.notes().filter((n) => n.id !== id)); },
};
