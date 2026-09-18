/* ════════════════════════════════════════════════════════════════
   V8 VIEW — PROFIL (Hero · Stats · Prüfungsverlauf · Alt-Tools)
   Port der React-ProfilView (XP, Level-Ring, StatCards, History)
   ════════════════════════════════════════════════════════════════ */

const LEGACY_TOOLS = [
  { href: "mundvglich.html", icon: "mic", label: "Mündliche Prüfung", desc: "KI-Prüfer · § 7 PflAPrV (benötigt Server)" },
  { href: "arena.html", icon: "swords", label: "Arena", desc: "Klausur-Duell (benötigt Server)" },
  { href: "schwerpunkt.html", icon: "crosshair", label: "Zwischenprüfung Schwerpunkte", desc: "Schwerpunkt-Analyse" },
  { href: "creator.html", icon: "wand-2", label: "Studio Creator", desc: "Eigene Klausuren erstellen" },
];

function renderProfil() {
  const root = document.getElementById("view-root");
  const session = V8Auth.get();
  const stats = V8Store.stats();
  const exams = V8Store.exams();

  const xp = (stats.todayXp || 0) + (stats.streak || 0) * 50;
  const level = Math.floor(xp / 500) + 1;

  root.innerHTML = `
  <div class="mx-auto max-w-4xl space-y-5 px-3 py-5 sm:px-5">
    <!-- Hero -->
    <div class="glass-strong overflow-hidden rounded-2xl p-0 anim-fade-up">
      <div class="relative p-5 sm:p-6">
        <div class="absolute -right-10 -top-10 h-40 w-40 rounded-full bg-violet-500/15 blur-3xl"></div>
        <div class="relative flex items-center gap-4">
          <div class="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-500 to-indigo-500 text-2xl font-black text-white">${esc((session?.name || "?")[0].toUpperCase())}</div>
          <div class="flex-1">
            <div class="flex items-center gap-2">
              <h1 class="text-xl font-black text-white">${esc(session?.name || "—")}</h1>
              ${V8Auth.isAdmin() ? `<span class="flex items-center gap-1 rounded-lg border border-amber-500/30 bg-amber-500/10 px-2 py-0.5 text-[9px] font-black uppercase tracking-wider text-amber-300"><i data-lucide="shield-check" class="h-3 w-3"></i> Admin</span>` : ""}
            </div>
            <div class="mt-2 flex flex-wrap items-center gap-3 text-[11px]">
              <span class="flex items-center gap-1 font-bold text-slate-300"><i data-lucide="zap" class="h-3 w-3 text-violet-400"></i><span class="t-num">${xp} XP</span></span>
              ${stats.streak > 0 ? `<span class="flex items-center gap-1 font-bold text-slate-300"><i data-lucide="flame" class="h-3 w-3 text-orange-400"></i><span class="t-num">${stats.streak}T</span></span>` : ""}
              <span class="flex items-center gap-1 font-bold text-slate-300"><i data-lucide="trophy" class="h-3 w-3 text-amber-400"></i><span class="t-num">${exams.length}</span></span>
            </div>
          </div>
          ${progressRing((xp % 500) / 5, 70, 6, "#8b5cf6", `
            <div class="text-center"><div class="text-base font-black t-num text-white">${level}</div><div class="text-[8px] font-bold uppercase text-violet-400">Level</div></div>`)}
        </div>
      </div>
    </div>

    <!-- Stats -->
    <div class="grid grid-cols-2 gap-3 sm:grid-cols-4">
      ${statCard("target", "Bereitschaft", `${stats.readiness}%`, "#8b5cf6")}
      ${statCard("sparkles", "Karten", stats.totalCards, "#6366f1")}
      ${statCard("flame", "Serie", `${stats.streak}T`, "#f59e0b")}
      ${statCard("trophy", "Ø Examen", `${stats.avgExam}%`, "#14b8a6")}
    </div>

    <!-- Prüfungsverlauf -->
    <div class="glass-card rounded-2xl p-5">
      <h3 class="mb-3 flex items-center gap-2 text-sm font-black text-white"><i data-lucide="trophy" class="h-4 w-4 text-amber-400"></i> Prüfungsverlauf</h3>
      ${exams.length === 0 ? `<p class="py-6 text-center text-xs text-slate-500">Noch keine Prüfungen.</p>` : `
      <div class="max-h-80 space-y-2 overflow-y-auto pr-1">
        ${exams.map((e) => `
        <div class="flex items-center gap-3 rounded-xl border border-white/5 bg-white/3 p-2.5">
          <div class="flex h-9 w-9 items-center justify-center rounded-lg text-[10px] font-black bg-violet-500/15 text-violet-300">${e.mode === "klausur" || e.mode === "exam" ? "P" : e.mode === "review" ? "R" : "T"}</div>
          <div class="flex-1">
            <div class="text-xs font-bold text-slate-200">${esc(e.title || (e.mode === "exam" ? "Prüfungssimulation" : e.mode === "review" ? "Wiederholung" : "Gezieltes Training"))} · ${e.correct}/${e.total}</div>
            <div class="text-[10px] text-slate-500">${new Date(e.createdAt).toLocaleDateString("de-DE")} · ${Math.floor((e.timeSpent || 0) / 60)} Min</div>
          </div>
          <div class="text-right"><div class="text-sm font-black t-num" style="color:${e.percentage >= 70 ? "#22c55e" : e.percentage >= 50 ? "#f59e0b" : "#ef4444"}">${e.percentage}%</div><div class="text-[9px] font-bold text-slate-500">${e.note}</div></div>
        </div>`).join("")}
      </div>`}
    </div>

    <!-- Alt-System Tools -->
    <div class="glass-card rounded-2xl p-5">
      <h3 class="mb-1 flex items-center gap-2 text-sm font-black text-white"><i data-lucide="archive" class="h-4 w-4 text-slate-400"></i> Weitere Tools <span class="ml-1 rounded-full bg-white/5 px-2 py-0.5 text-[9px] font-bold text-slate-500">Alt-System</span></h3>
      <p class="mb-3 text-[11px] text-slate-500">Diese Seiten stammen aus dem alten System. KI-Funktionen brauchen einen Server (z.B. Vercel) — lokal funktionieren sie nur eingeschränkt.</p>
      <div class="grid grid-cols-1 gap-2 sm:grid-cols-2">
        ${LEGACY_TOOLS.map((t) => `
        <a href="${t.href}" class="flex items-center gap-3 rounded-xl border border-white/5 bg-white/3 p-3 transition-all hover:bg-white/5 hover:border-white/10">
          <div class="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-slate-500/15 text-slate-400"><i data-lucide="${t.icon}" class="h-4 w-4"></i></div>
          <div class="min-w-0">
            <div class="text-xs font-bold text-slate-200">${t.label}</div>
            <div class="truncate text-[10px] text-slate-500">${t.desc}</div>
          </div>
          <i data-lucide="external-link" class="ml-auto h-3.5 w-3.5 shrink-0 text-slate-600"></i>
        </a>`).join("")}
      </div>
    </div>

    <button onclick="App.logout()" class="flex w-full items-center justify-center gap-2 rounded-2xl border border-red-500/20 bg-red-500/5 py-3 text-xs font-black uppercase tracking-wider text-red-300 active:scale-95">
      <i data-lucide="log-out" class="h-4 w-4"></i> Ausloggen
    </button>
  </div>`;
  refreshIcons();
}

function statCard(icon, label, value, color) {
  return `
  <div class="glass-card flex items-center gap-3 rounded-2xl p-3.5">
    <div class="flex h-10 w-10 items-center justify-center rounded-xl" style="background:color-mix(in srgb,${color} 18%,transparent);color:${color}"><i data-lucide="${icon}" class="h-5 w-5"></i></div>
    <div><div class="text-lg font-black t-num text-white">${value}</div><div class="text-[10px] font-bold uppercase tracking-wider text-slate-500">${label}</div></div>
  </div>`;
}
