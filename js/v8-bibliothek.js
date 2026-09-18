/* ════════════════════════════════════════════════════════════════
   V8 VIEW — BIBLIOTHEK (Modul-Grid + Modul-Detail mit Lerneinheiten)
   Port der React-BibliothekView (dark glass, Akzentfarben, Suche)
   ════════════════════════════════════════════════════════════════ */

const BibliothekState = { search: "", modules: [], counts: {}, loaded: false };

async function renderBibliothek(path) {
  const root = document.getElementById("view-root");
  const user = V8Auth.get();
  const [, , modArg] = path.split("/");
  const activeModuleId = modArg ? Number(modArg.replace("mod_", "")) : null;

  if (!BibliothekState.loaded) {
    root.innerHTML = `<div class="flex justify-center py-16"><div class="h-7 w-7 animate-spin rounded-full border-4 border-violet-500/20 border-t-violet-500"></div></div>`;
    const [modules, summaries] = await Promise.all([V8Data.modules(), V8Data.summaries()]);
    BibliothekState.modules = modules;
    for (const m of modules) {
      const bank = await V8Data.bank(m.id);
      BibliothekState.counts[m.id] = { summaries: (summaries[m.id] || []).length, questions: (bank || []).filter((q) => q.q_id || q.id).length };
    }
    BibliothekState.loaded = true;
  }

  if (activeModuleId) { renderModuleDetail(root, activeModuleId); return; }

  const filtered = BibliothekState.modules.filter((m) =>
    !BibliothekState.search ||
    m.name.toLowerCase().includes(BibliothekState.search.toLowerCase()) ||
    (m.shortName || "").toLowerCase().includes(BibliothekState.search.toLowerCase())
  );

  root.innerHTML = `
  <div class="mx-auto max-w-7xl space-y-5 px-3 py-5 sm:px-5">
    <div class="anim-fade-up">
      <p class="text-[11px] font-bold uppercase tracking-widest text-violet-400/80">Bibliothek</p>
      <div class="mt-1 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 class="text-2xl font-black tracking-tight text-white sm:text-3xl">
            Hallo, <span class="gradient-text">${esc((user?.name || "Schüler:in").split(" ")[0])}</span> 👋
          </h1>
          <p class="mt-1 text-sm text-slate-400">${BibliothekState.modules.length} Module · Leseinheiten, Zusammenfassungen & Fragepools</p>
        </div>
      </div>
    </div>

    <div class="relative anim-fade-up" style="animation-delay:0.05s">
      <i data-lucide="search" class="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500"></i>
      <input id="bib-search" value="${esc(BibliothekState.search)}" placeholder="Module durchsuchen…"
        class="w-full rounded-xl border border-white/10 bg-white/5 py-2.5 pl-10 pr-3 text-sm text-slate-100 outline-none focus:border-violet-400/50">
    </div>

    <div id="bib-grid" class="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
      ${filtered.map((m, i) => moduleCard(m, i)).join("")}
    </div>
    ${filtered.length === 0 ? `<div class="py-10 text-center text-sm text-slate-500">Keine Module gefunden.</div>` : ""}
  </div>`;

  document.getElementById("bib-search").addEventListener("input", (e) => {
    BibliothekState.search = e.target.value;
    const list = document.getElementById("bib-grid");
    const filtered2 = BibliothekState.modules.filter((m) =>
      !BibliothekState.search ||
      m.name.toLowerCase().includes(BibliothekState.search.toLowerCase()) ||
      (m.shortName || "").toLowerCase().includes(BibliothekState.search.toLowerCase())
    );
    list.innerHTML = filtered2.map((m, i) => moduleCard(m, i)).join("") || "";
    refreshIcons();
  });
  refreshIcons();
}

function moduleCard(m, i) {
  const accent = m.accent || "#8b5cf6";
  const c = BibliothekState.counts[m.id] || { summaries: 0, questions: 0 };
  return `
  <button onclick="V8Router.go('/bibliothek/mod_${m.id}')" class="glass-card group relative overflow-hidden rounded-2xl p-4 text-left transition-all hover:-translate-y-0.5 hover:border-white/15 active:scale-[0.98] anim-fade-up" style="animation-delay:${i * 0.04}s">
    <div class="absolute -right-8 -top-8 h-24 w-24 rounded-full opacity-10 blur-2xl transition-opacity group-hover:opacity-25" style="background:${accent}"></div>
    <div class="absolute left-0 top-0 h-1 w-0 rounded-r-full transition-all duration-500 group-hover:w-full" style="background:${accent}"></div>
    <div class="relative flex items-start gap-3">
      <div class="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-sm font-black" style="background:color-mix(in srgb,${accent} 18%,transparent);color:${accent};border:1px solid color-mix(in srgb,${accent} 30%,transparent)">
        ${esc((m.shortName || m.name).slice(0, 3))}
      </div>
      <div class="min-w-0 flex-1">
        <h3 class="truncate text-sm font-black text-white">${esc(m.shortName || m.name)}</h3>
        <p class="mt-0.5 line-clamp-2 text-[11px] leading-snug text-slate-400">${esc(m.description || "")}</p>
      </div>
      <i data-lucide="chevron-right" class="h-4 w-4 shrink-0 text-slate-500 transition-transform group-hover:translate-x-0.5"></i>
    </div>
    <div class="relative mt-3 flex items-center justify-between">
      <span class="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold" style="background:color-mix(in srgb,${accent} 18%,transparent);color:color-mix(in srgb,${accent} 75%,white);border:1px solid color-mix(in srgb,${accent} 35%,transparent)">${esc(m.competencyArea || "")}</span>
      <div class="flex items-center gap-2 text-[10px] font-bold text-slate-500">
        <span class="flex items-center gap-1"><i data-lucide="book-open" class="h-3 w-3"></i>${c.summaries}</span>
        <span class="flex items-center gap-1"><i data-lucide="file-text" class="h-3 w-3"></i>${c.questions}</span>
      </div>
    </div>
  </button>`;
}

/* ═══ MODUL-DETAIL (Lerneinheiten) ═══ */
async function renderModuleDetail(root, moduleId) {
  const m = BibliothekState.modules.find((x) => x.id === moduleId) || getModule(moduleId);
  if (!m) {
    root.innerHTML = `<div class="py-16 text-center text-slate-500">Modul nicht gefunden.</div>`;
    return;
  }
  root.innerHTML = `<div class="flex justify-center py-16"><div class="h-7 w-7 animate-spin rounded-full border-4 border-violet-500/20 border-t-violet-500"></div></div>`;

  const summaries = (await V8Data.summaries())[m.id] || [];
  const c = BibliothekState.counts[m.id] || { summaries: summaries.length, questions: 0 };
  const accent = m.accent || "#8b5cf6";
  const startUnit = summaries.length ? summaries[0].unit : null;
  const active = summaries.find((s) => s.unit === startUnit) || summaries[0];

  root.innerHTML = `
  <div class="mx-auto max-w-4xl space-y-5 px-3 py-5 sm:px-5">
    <button onclick="V8Router.go('/bibliothek')" class="inline-flex items-center gap-1.5 rounded-lg px-2 py-1 text-xs font-bold text-slate-400 hover:text-white">
      <i data-lucide="arrow-left" class="h-3.5 w-3.5"></i> Zur Bibliothek
    </button>

    <div class="glass-card overflow-hidden rounded-2xl p-0 anim-fade">
      <div class="relative p-5 sm:p-6">
        <div class="absolute -right-10 -top-10 h-40 w-40 rounded-full opacity-20 blur-3xl" style="background:${accent}"></div>
        <div class="relative flex items-start gap-4">
          <div class="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl text-lg font-black" style="background:color-mix(in srgb,${accent} 18%,transparent);color:${accent};border:1px solid color-mix(in srgb,${accent} 30%,transparent)">
            ${esc((m.shortName || m.name).slice(0, 3))}
          </div>
          <div class="min-w-0 flex-1">
            <div class="flex flex-wrap items-center gap-2">
              <h1 class="text-xl font-black tracking-tight text-white sm:text-2xl">${esc(m.name)}</h1>
              <span class="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold" style="background:color-mix(in srgb,${accent} 18%,transparent);color:color-mix(in srgb,${accent} 75%,white);border:1px solid color-mix(in srgb,${accent} 35%,transparent)">${esc(m.competencyArea || "")}</span>
            </div>
            <p class="mt-1 text-sm text-slate-400">${esc(m.description || "")}</p>
            <div class="mt-3 flex items-center gap-4 text-[11px] font-bold text-slate-500">
              <span class="flex items-center gap-1"><i data-lucide="book-open" class="h-3.5 w-3.5"></i>${summaries.length} Lerneinheiten</span>
              <span class="flex items-center gap-1"><i data-lucide="file-text" class="h-3.5 w-3.5"></i>${c.questions} Fragen</span>
            </div>
          </div>
        </div>
      </div>
    </div>

    ${summaries.length > 0 ? `
    <div class="flex gap-1.5 overflow-x-auto pb-1 no-scrollbar">
      ${summaries.map((s) => `
        <button data-unit="${s.unit}" class="unit-chip flex h-9 shrink-0 items-center gap-1.5 rounded-xl px-3 text-xs font-bold transition-all"
          style="${s.unit === active.unit ? `background:color-mix(in srgb,${accent} 18%,transparent);color:${accent};border:1px solid color-mix(in srgb,${accent} 30%,transparent)` : "background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.08);color:#94a3b8"}">
          <span class="t-num">${s.unit}</span>
          <span class="hidden sm:inline">·</span>
          <span class="hidden sm:inline truncate max-w-[120px]">${esc(s.topic || "")}</span>
        </button>`).join("")}
    </div>` : ""}

    <div class="glass-card rounded-2xl p-5 sm:p-6">
      <div id="summary-content">
        ${summaryBlock(active, accent)}
      </div>
    </div>

    <button onclick="openExamForModule(${m.id})" class="gradient-indigo flex w-full items-center justify-center gap-2 rounded-2xl py-3.5 text-sm font-black uppercase tracking-widest text-white shadow-lg shadow-violet-500/25 active:scale-95">
      <i data-lucide="graduation-cap" class="h-4 w-4"></i> Modulklausur starten
    </button>
  </div>`;

  // Unit-Chips umschalten
  root.querySelectorAll(".unit-chip").forEach((chip) => {
    chip.addEventListener("click", () => {
      const unit = Number(chip.dataset.unit);
      const s = summaries.find((x) => x.unit === unit);
      document.getElementById("summary-content").innerHTML = summaryBlock(s, accent);
      root.querySelectorAll(".unit-chip").forEach((c2) => {
        const s2 = summaries.find((x) => x.unit === Number(c2.dataset.unit));
        c2.style.cssText = s2.unit === unit
          ? `background:color-mix(in srgb,${accent} 18%,transparent);color:${accent};border:1px solid color-mix(in srgb,${accent} 30%,transparent)`
          : "background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.08);color:#94a3b8";
      });
      refreshIcons();
    });
  });
  refreshIcons();
}

function summaryBlock(s, accent) {
  if (!s) return `<div class="py-10 text-center text-sm text-slate-500">Keine Lerneinheiten für dieses Modul.</div>`;
  const tags = (s.tags || []).map((t) => `<span key="${esc(t)}" class="rounded-md bg-white/5 px-2 py-0.5 text-[10px] font-semibold text-slate-400"># ${esc(t)}</span>`).join("");
  return `
  <div>
    <div class="mb-3 flex items-center gap-2">
      <span class="rounded-md px-2 py-0.5 text-[10px] font-bold" style="background:color-mix(in srgb,${accent} 18%,transparent);color:${accent}">Einheit ${s.unit}</span>
      <h3 class="text-base font-black text-white">${esc(s.topic || "")}</h3>
    </div>
    ${tags ? `<div class="mb-3 flex flex-wrap gap-1.5">${tags}</div>` : ""}
    <div class="prose-nursing max-w-none text-sm">${s.contentHTML || ""}</div>
  </div>`;
}

function openExamForModule(moduleId) {
  location.href = `exam-simulator.html?module=mod_${moduleId}`;
}
