/* ════════════════════════════════════════════════════════════════
   SLM SYSTEM v8 — CORE (Auth · Router · Toast · Icons · Helpers)
   Statischer Port der Next.js-App (localStorage statt NextAuth/DB)
   ════════════════════════════════════════════════════════════════ */

// ── Modul-Metadaten (Fallback, falls data/modules.json fehlt) ──
const MODULES = [
  { id: 1, name: "Kommunikation & Biografie", shortName: "Kommunikation", description: "Pflegeprozess, Anamnese, Kommunikationsmodelle, Biografiearbeit", accent: "#6366f1", competencyArea: "I · Pflegeprozess" },
  { id: 2, name: "Medizinisches Kernwissen", shortName: "Medizin", description: "Anatomie, Physiologie, Vitalzeichen, Hygienestandards", accent: "#6366f1", competencyArea: "I · Pflegeprozess" },
  { id: 3, name: "Krankheitslehre", shortName: "Krankheitslehre", description: "Pathologie, Pharmakologie, Prophylaxen", accent: "#6366f1", competencyArea: "I · Pflegeprozess" },
  { id: 4, name: "Schwangerschaft & Geburt", shortName: "Geburtshilfe", description: "Geburtshilfe, Neonatologie, pädiatrische Pflegegrundlagen", accent: "#14b8a6", competencyArea: "II · Kommunikation" },
  { id: 5, name: "Prä- & Postoperative Pflege", shortName: "Chirurgie", description: "Perioperative Pflege, Wundversorgung, Asepsis", accent: "#22c55e", competencyArea: "I · Pflegeprozess" },
  { id: 6, name: "Notfall & Reanimation", shortName: "Notfall", description: "ABCDE-Schema, Reanimation (BLS/ALS), Schockformen, Triage", accent: "#ef4444", competencyArea: "II · Kommunikation" },
  { id: 7, name: "Ambulante & Chronische Pflege", shortName: "Chronische Pflege", description: "Ambulante Pflege, SGB XI/V, Pflegegrade", accent: "#a855f7", competencyArea: "IV · Recht & Qualität" },
  { id: 8, name: "Innere Medizin & Niere", shortName: "Innere Medizin", description: "Nephrologie, Kardiologie, Gastroenterologie, Dialyse", accent: "#0ea5e9", competencyArea: "I · Pflegeprozess" },
  { id: 9, name: "Neurologische Rehabilitation", shortName: "Neurologie", description: "Apoplex, Bobath-Konzept, Dysphagie, Reha-Stadien", accent: "#f59e0b", competencyArea: "II · Kommunikation" },
];
function getModule(id) { return MODULES.find((m) => m.id === Number(id)); }

// ── Noten + Readiness (v8-Logik) ──
function gradeFromPercentage(pct) {
  if (pct >= 95) return "1,0";
  if (pct >= 90) return "1,3";
  if (pct >= 85) return "1,7";
  if (pct >= 80) return "2,0";
  if (pct >= 75) return "2,3";
  if (pct >= 70) return "2,7";
  if (pct >= 65) return "3,0";
  if (pct >= 60) return "3,3";
  if (pct >= 55) return "3,7";
  if (pct >= 50) return "4,0";
  return "5,0";
}
function readinessLabel(pct) {
  if (pct >= 80) return { label: "Bereit", emoji: "✅", color: "#22c55e" };
  if (pct >= 60) return { label: "Fast bereit", emoji: "💪", color: "#f59e0b" };
  if (pct >= 30) return { label: "In Arbeit", emoji: "📚", color: "#6366f1" };
  return { label: "Am Anfang", emoji: "🚀", color: "#8b5cf6" };
}
function fmtTime(s) {
  if (s < 0) s = 0;
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  return h > 0
    ? `${h}:${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`
    : `${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
}
function fmtMd(text) {
  if (!text) return "";
  return String(text).replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>");
}
function esc(text) {
  if (text === null || text === undefined) return "";
  return String(text)
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}

// ── Auth: lokales Profil (localStorage statt NextAuth) ──
const V8Auth = {
  KEY: "slm_user_v8",
  ADMIN_PIN_KEY: "slm_admin_pin_v8",
  get() {
    try { return JSON.parse(localStorage.getItem(this.KEY) || "null"); } catch { return null; }
  },
  login(name, role) {
    const user = { name: name.trim(), role: role || "schueler", loginAt: Date.now() };
    localStorage.setItem(this.KEY, JSON.stringify(user));
    return user;
  },
  logout() { localStorage.removeItem(this.KEY); },
  isAdmin() { return this.get()?.role === "admin"; },
  // Admin-PIN: beim ersten Login gesetzt, danach geprüft (rein lokal)
  checkAdminPin(pin) {
    const saved = localStorage.getItem(this.ADMIN_PIN_KEY);
    if (saved) return pin === saved;
    // Erste Nutzung: PIN wird übernommen
    localStorage.setItem(this.ADMIN_PIN_KEY, pin);
    return true;
  },
  hasAdminPin() { return !!localStorage.getItem(this.ADMIN_PIN_KEY); },
};

// ── Toast (Sonner-Optik: top-center, dark glass) ──
const V8Toast = {
  icons: { success: "✓", error: "✕", info: "ℹ", warning: "⚠" },
  colors: { success: "#4ade80", error: "#f87171", info: "#93c5fd", warning: "#fcd34d" },
  show(message, type = "info", ms = 3800) {
    const root = document.getElementById("toast-root");
    if (!root) return;
    const el = document.createElement("div");
    el.className = "toast";
    el.innerHTML = `<span class="t-ico" style="color:${this.colors[type]}">${this.icons[type]}</span><span style="flex:1">${esc(message)}</span>`;
    root.appendChild(el);
    setTimeout(() => {
      el.classList.add("leaving");
      setTimeout(() => el.remove(), 300);
    }, ms);
  },
  success(m) { this.show(m, "success"); },
  error(m) { this.show(m, "error"); },
  info(m) { this.show(m, "info"); },
  warning(m) { this.show(m, "warning"); },
};

// ── Lucide-Icons (CDN) ──
function refreshIcons() {
  if (window.lucide?.createIcons) { try { window.lucide.createIcons(); } catch { /* ignore */ } }
}

// ── Progress-Ring (SVG) ──
function progressRing(value, size = 120, strokeWidth = 10, color = "#8b5cf6", inner = "") {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const clamped = Math.max(0, Math.min(100, value));
  const offset = circumference - (clamped / 100) * circumference;
  return `
  <div class="progress-ring" style="width:${size}px;height:${size}px">
    <svg width="${size}" height="${size}" style="transform:rotate(-90deg)">
      <circle class="pr-track" cx="${size / 2}" cy="${size / 2}" r="${radius}" stroke-width="${strokeWidth}"></circle>
      <circle class="pr-val" cx="${size / 2}" cy="${size / 2}" r="${radius}" stroke="${color}" stroke-width="${strokeWidth}"
        stroke-dasharray="${circumference}" stroke-dashoffset="${offset}"></circle>
    </svg>
    <div class="pr-content">${inner}</div>
  </div>`;
}

// ── Hash-Router ──
const V8Router = {
  routes: {},
  register(path, handler) { this.routes[path] = handler; },
  current() { return (location.hash || "#/bibliothek").replace(/^#/, ""); },
  go(path) {
    if (("#" + path) === location.hash) { this.render(); }
    else { location.hash = path; }
  },
  render() {
    const path = this.current();
    const [route] = path.split("/").filter(Boolean);
    const handler = this.routes["/" + (route || "bibliothek")] || this.routes["/bibliothek"];
    handler(path);
    refreshIcons();
  },
  start() {
    window.addEventListener("hashchange", () => this.render());
    this.render();
  },
};
