/* ════════════════════════════════════════════════════════════════
   V8 VIEW — NOTIZBUCH (lokales Lernheft pro Modul)
   Port der React-NotizbuchView — statt KI-Upload: lokale Notizen
   ════════════════════════════════════════════════════════════════ */

const NotizbuchState = { activeModule: 0, showQuickNote: false };

async function renderNotizbuch(path) {
  const root = document.getElementById("view-root");
  const [, , modArg] = path.split("/");
  if (modArg && NotizbuchState.activeModule === 0) NotizbuchState.activeModule = Number(modArg.replace("mod_", "")) || 0;

  const modules = await V8Data.modules();
  const m = NotizbuchState.activeModule ? modules.find((x) => x.id === NotizbuchState.activeModule) : null;
  const accent = m?.accent || "#8b5cf6";
  const notes = V8Store.notes().filter((n) => (n.moduleId || 0) === NotizbuchState.activeModule);

  root.innerHTML = `
  <div class="mx-auto max-w-6xl space-y-4 px-3 py-5 sm:px-5">
    <div class="anim-fade-up">
      <p class="text-[11px] font-bold uppercase tracking-widest text-violet-400/80">Notizbuch</p>
      <h1 class="mt-1 text-2xl font-black tracking-tight text-white sm:text-3xl">Dein Lernheft</h1>
      <p class="mt-1 text-sm text-slate-400">Schreibe Notizen pro Modul — alles bleibt lokal auf deinem Gerät gespeichert.</p>
    </div>

    <!-- Modul-Tabs -->
    <div class="flex gap-1.5 overflow-x-auto pb-1 no-scrollbar anim-fade-up">
      ${modTab(0, "Allgemein", "#8b5cf6")}
      ${modules.map((mod) => modTab(mod.id, `M${mod.id}`, mod.accent)).join("")}
    </div>

    <!-- Aktionen -->
    <div class="flex gap-2 anim-fade-up">
      <button id="note-new" class="gradient-indigo flex flex-1 items-center justify-center gap-2 rounded-xl py-2.5 text-xs font-black uppercase tracking-wider text-white active:scale-95">
        <i data-lucide="pen-line" class="h-3.5 w-3.5"></i> Notiz schreiben
      </button>
    </div>

    <!-- Notiz-Inhalt -->
    <div class="glass-strong overflow-hidden rounded-2xl p-0 anim-fade-up">
      <div class="border-b border-white/8 p-4">
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-2">
            <i data-lucide="notebook" class="h-5 w-5" style="color:${accent}"></i>
            <h2 class="text-base font-black text-white">${m ? `Modul ${m.id} · ${esc(m.shortName)}` : "Allgemein"}</h2>
          </div>
          <span class="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold" style="background:color-mix(in srgb,${accent} 18%,transparent);color:color-mix(in srgb,${accent} 75%,white);border:1px solid color-mix(in srgb,${accent} 35%,transparent)">${notes.length} Notizen</span>
        </div>
      </div>
      <div class="p-5 sm:p-6">
        ${notes.length === 0 ? `
        <div class="flex flex-col items-center gap-3 py-12 text-center">
          <div class="flex h-14 w-14 items-center justify-center rounded-2xl bg-violet-500/10 text-violet-400"><i data-lucide="notebook" class="h-7 w-7"></i></div>
          <h3 class="text-sm font-black text-white">Noch keine Notizen für ${m ? `Modul ${m.id}` : "Allgemein"}</h3>
          <p class="max-w-xs text-[11px] text-slate-400">Schreibe deine erste Notiz — z.B. wichtige Definitionen, Merksätze aus dem Unterricht oder Prüfungshinweise.</p>
        </div>` : `
        <div class="space-y-2.5">
          ${notes.map((n) => noteCard(n, accent)).join("")}
        </div>`}
      </div>
    </div>
  </div>`;

  root.querySelectorAll("[data-modtab]").forEach((el) => {
    el.addEventListener("click", () => { NotizbuchState.activeModule = Number(el.dataset.modtab); renderNotizbuch("#/notizbuch"); });
  });
  document.getElementById("note-new").addEventListener("click", () => openNoteModal(null, accent));
  root.querySelectorAll("[data-note-edit]").forEach((el) => {
    el.addEventListener("click", () => {
      const n = V8Store.notes().find((x) => x.id === el.dataset.noteEdit);
      if (n) openNoteModal(n, accent);
    });
  });
  root.querySelectorAll("[data-note-del]").forEach((el) => {
    el.addEventListener("click", () => {
      if (confirm("Notiz löschen?")) { V8Store.deleteNote(el.dataset.noteDel); renderNotizbuch("#/notizbuch"); }
    });
  });
  refreshIcons();
}

function modTab(id, label, color) {
  const active = NotizbuchState.activeModule === id;
  return `
  <button data-modtab="${id}" class="shrink-0 rounded-xl px-3 py-2 text-xs font-bold transition-all"
    style="${active ? `background:color-mix(in srgb,${color} 18%,transparent);color:${color};border:1px solid color-mix(in srgb,${color} 30%,transparent)` : "background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.08);color:#94a3b8"}">${label}</button>`;
}

function noteCard(n, accent) {
  const mod = n.moduleId ? getModule(n.moduleId) : null;
  return `
  <div class="rounded-xl border border-white/5 bg-white/3 p-3.5">
    <p class="whitespace-pre-wrap text-sm leading-relaxed text-slate-200">${esc(n.text)}</p>
    <div class="mt-2.5 flex items-center justify-between">
      <div class="flex items-center gap-2 text-[10px] text-slate-500">
        <i data-lucide="calendar" class="h-3 w-3"></i>${new Date(n.updatedAt || n.createdAt).toLocaleString("de-DE")}
      </div>
      <div class="flex gap-1">
        <button data-note-edit="${n.id}" class="flex h-7 w-7 items-center justify-center rounded-lg text-slate-500 hover:bg-violet-500/10 hover:text-violet-300"><i data-lucide="pen-line" class="h-3.5 w-3.5"></i></button>
        <button data-note-del="${n.id}" class="flex h-7 w-7 items-center justify-center rounded-lg text-slate-500 hover:bg-red-500/10 hover:text-red-300"><i data-lucide="trash-2" class="h-3.5 w-3.5"></i></button>
      </div>
    </div>
  </div>`;
}

/* ═══ NOTIZ-MODAL (v8 QuickNote-Design) ═══ */
function openNoteModal(existing, accent) {
  // Overlay
  const overlay = document.createElement("div");
  overlay.id = "note-modal";
  overlay.className = "fixed inset-0 z-[160] flex items-center justify-center p-4";
  overlay.style.cssText = "background:rgba(0,0,0,0.85);backdrop-filter:blur(8px)";
  overlay.innerHTML = `
  <div class="glass-strong flex w-full max-w-lg flex-col overflow-hidden rounded-2xl anim-modal" onclick="event.stopPropagation()">
    <div class="gradient-indigo relative p-5">
      <div class="absolute inset-0 opacity-20" style="background-image:radial-gradient(circle,rgba(255,255,255,0.15) 1px,transparent 1px);background-size:24px 24px"></div>
      <div class="relative flex items-center justify-between">
        <div class="flex items-center gap-2"><i data-lucide="pen-line" class="h-5 w-5 text-white"></i><h2 class="text-base font-black text-white">${existing ? "Notiz bearbeiten" : "Kurze Notiz"}</h2></div>
        <button id="note-close" class="flex h-8 w-8 items-center justify-center rounded-lg bg-white/15 text-white hover:bg-white/25"><i data-lucide="x" class="h-4 w-4"></i></button>
      </div>
    </div>
    <div class="p-5">
      <label class="mb-1.5 block text-[11px] font-bold uppercase tracking-wider text-slate-400">Modul</label>
      <select id="note-module" class="mb-3 w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-sm font-bold text-slate-100 outline-none focus:border-violet-400/50">
        <option value="0" class="bg-slate-900" ${!existing?.moduleId ? "selected" : ""}>Allgemein</option>
        ${MODULES.map((m) => `<option value="${m.id}" class="bg-slate-900" ${existing?.moduleId === m.id ? "selected" : ""}>Modul ${m.id}: ${esc(m.shortName)}</option>`).join("")}
      </select>
      <textarea id="note-text" rows="5" autofocus placeholder="z.B. 30-Grad-Schräglagerung alle 2h bei Dekubitusgefährdung" class="w-full resize-y rounded-xl border border-white/10 bg-white/5 px-3.5 py-3 text-sm text-slate-100 outline-none focus:border-violet-400/50">${esc(existing?.text || "")}</textarea>
    </div>
    <div class="flex gap-2 border-t border-white/8 p-4">
      <button id="note-cancel" class="flex flex-1 items-center justify-center rounded-xl border border-white/10 bg-white/5 py-2.5 text-xs font-bold text-slate-300 active:scale-95">Abbrechen</button>
      <button id="note-save" class="gradient-indigo flex flex-[2] items-center justify-center gap-2 rounded-xl py-2.5 text-xs font-black uppercase tracking-wider text-white active:scale-95">
        <i data-lucide="sparkles" class="h-3.5 w-3.5"></i> Speichern
      </button>
    </div>
  </div>`;
  overlay.addEventListener("click", () => overlay.remove());
  document.body.appendChild(overlay);
  refreshIcons();

  overlay.querySelector("#note-close").addEventListener("click", () => overlay.remove());
  overlay.querySelector("#note-cancel").addEventListener("click", () => overlay.remove());
  overlay.querySelector("#note-save").addEventListener("click", () => {
    const text = overlay.querySelector("#note-text").value.trim();
    if (!text) { V8Toast.error("Bitte Text eingeben"); return; }
    const moduleId = Number(overlay.querySelector("#note-module").value) || 0;
    if (existing) { V8Store.updateNote(existing.id, text); if (moduleId !== (existing.moduleId || 0)) { V8Store.deleteNote(existing.id); V8Store.addNote(moduleId, text); } }
    else V8Store.addNote(moduleId, text);
    overlay.remove();
    NotizbuchState.activeModule = moduleId;
    V8Toast.success("Notiz gespeichert");
    renderNotizbuch("#/notizbuch");
  });
  overlay.querySelector("#note-text").focus();
}
