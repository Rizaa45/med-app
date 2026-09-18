/* ════════════════════════════════════════════════════════════════
   V8 EXAM RESULTS — Port der React-ExamResultScreen
   Score-Cards · KB/Themen-Analyse · Schwächen · Tipps · Details
   ════════════════════════════════════════════════════════════════ */

const KB_LABELS = {
  I: "KB I · Pflegeprozess & Pflegediagnostik",
  II: "KB II · Kommunikation & Beratung",
  III: "KB III · Interprofessionelles Handeln",
  IV: "KB IV · Recht, Ethik & Qualität",
  V: "KB V · Wissenschaft & Berufsethos",
};

const TYPE_NAMES = {
  richtig_falsch: "Richtig/Falsch",
  nennen_liste: "Nennen-Liste",
  freitext_box: "Freitext",
  tabelle_2spalten: "Tabelle",
  tabelle_3spalten: "Tabelle",
  tabelle_4spalten: "Tabelle",
  tabelle_vergleich: "Vergleichs-Tabelle",
  zuordnung: "Zuordnung",
  ergaenzen_liste: "Ergänzen",
  definition_plus_beispiele: "Definition + Beispiele",
  ankreuzen_begruenden: "Ankreuzen + Begründen",
  zwp_rf: "Richtig/Falsch",
  zwp_grid: "Antwort-Tabelle",
  zwp_list: "Maßnahmen-Liste",
  zwp_mc: "Multiple Choice",
  zwp_text: "Freitext-Aufgabe",
};

const TYPE_TIPS = {
  richtig_falsch: "Richtig/Falsch — Lies genauer, subtile Formulierungen beachten",
  nennen_liste: "Nennen-Listen — Aufzählungen auswendig lernen (Mnemotechniken)",
  freitext_box: "Freitext — Mehr Fachbegriffe verwenden, strukturiert schreiben",
  tabelle_2spalten: "Tabellen — Vergleiche systematisch üben",
  tabelle_3spalten: "Tabellen — Vergleiche systematisch üben",
  tabelle_4spalten: "Tabellen — Vergleiche systematisch üben",
  tabelle_vergleich: "Tabellen — Vergleiche systematisch üben",
  zuordnung: "Zuordnung — Definitionen und Begriffe verknüpfen",
  definition_plus_beispiele: "Definitionen — Kernbegriffe + konkrete Beispiele parat haben",
  ankreuzen_begruenden: "Ankreuzen + Begründen — Begründungen ausformulieren",
  zwp_grid: "Antwort-Tabellen — Systematisch alle Spalten füllen",
  zwp_list: "Maßnahmen — Fachbegriffe + Begründung kombinieren",
  zwp_mc: "Multiple Choice — Fachwissen festigen",
  zwp_text: "Freitext — Strukturiert argumentieren, ganze Sätze",
};

let resultOpenTask = null;

function renderExamResult(root, result, paper, timeUsed, onRetry, onExit) {
  const pct = result.percentage;
  const noteNum = parseFloat(String(result.note).replace(",", "."));
  const passed = result.passed;
  const isZwp = paper.mode === "zwp";
  const noteColor = noteNum <= 2.0 ? "#22c55e" : noteNum <= 3.3 ? "#f59e0b" : "#ef4444";

  const topicEntries = Object.entries(result.topicScores || {}).sort((a, b) => {
    const pa = a[1].possible > 0 ? a[1].earned / a[1].possible : 0;
    const pb = b[1].possible > 0 ? b[1].earned / b[1].possible : 0;
    return pa - pb;
  });
  const kbEntries = Object.entries(result.kbScores || {}).sort((a, b) => a[0].localeCompare(b[0]));

  root.innerHTML = `
  <div class="mx-auto max-w-3xl space-y-5 px-3 py-6 sm:px-5">
    <!-- ═══ Kopf ═══ -->
    <div class="text-center">
      <div class="text-5xl">${passed ? "🎓" : "📚"}</div>
      <h1 class="mt-2 text-2xl font-black tracking-tight text-white sm:text-3xl">${isZwp ? "Zwischenprüfungs-Ergebnis" : "Klausur-Ergebnis"}</h1>
      <p class="mt-1 text-sm text-slate-400">${esc(paper.title)} · ${esc(paper.subtitle)} · ${new Date(paper.dateISO).toLocaleDateString("de-DE")}</p>
    </div>

    <!-- ═══ Score-Cards ═══ -->
    <div class="grid grid-cols-3 gap-2 sm:gap-4">
      <div class="rounded-2xl border p-4 text-center sm:p-6" style="border-color:${noteColor}40;background:color-mix(in srgb,${noteColor} 8%,transparent)">
        <div class="text-3xl font-black t-num sm:text-5xl" style="color:${noteColor}">${result.note}</div>
        <div class="mt-1 text-[10px] font-bold uppercase tracking-wider text-slate-400 sm:text-sm">Note</div>
      </div>
      <div class="rounded-2xl border border-white/10 bg-white/5 p-4 text-center sm:p-6">
        <div class="text-3xl font-black t-num text-violet-400 sm:text-5xl">${pct}%</div>
        <div class="mt-1 text-[10px] font-bold text-slate-400 sm:text-sm">${result.totalEarned}/${result.totalPossible} P.</div>
      </div>
      <div class="rounded-2xl border border-white/10 bg-white/5 p-4 text-center sm:p-6">
        <div class="text-3xl font-black t-num text-slate-200 sm:text-5xl">${Math.floor(timeUsed / 60)}<span class="text-lg text-slate-500 sm:text-2xl">m</span></div>
        <div class="mt-1 text-[10px] font-bold text-slate-400 sm:text-sm">Zeit</div>
      </div>
    </div>

    <!-- ═══ Gesamtfeedback ═══ -->
    ${result.aiSummary ? `
    <div class="rounded-2xl border border-violet-500/20 bg-violet-500/10 p-5">
      <h3 class="mb-2 flex items-center gap-2 text-sm font-black text-white"><i data-lucide="sparkles" class="h-4 w-4 text-violet-400"></i> Feedback deiner Prüferin</h3>
      <p class="text-sm leading-relaxed text-violet-100/80">${esc(result.aiSummary)}</p>
    </div>` : ""}

    <!-- ═══ Kompetenzbereich-Analyse (ZWP) ═══ -->
    ${isZwp && kbEntries.length > 0 ? `
    <div class="glass-card rounded-2xl p-5">
      <h3 class="mb-4 flex items-center gap-2 text-sm font-black text-white"><i data-lucide="graduation-cap" class="h-4 w-4 text-violet-400"></i> Kompetenzbereiche (PflAPrV)</h3>
      <div class="space-y-3">
        ${kbEntries.map(([kb, s]) => {
          const kbp = s.possible > 0 ? Math.round((s.earned / s.possible) * 100) : 0;
          const color = kbp >= 70 ? "#22c55e" : kbp >= 50 ? "#f59e0b" : "#ef4444";
          return `
          <div>
            <div class="mb-1 flex items-center justify-between">
              <span class="text-xs font-bold text-slate-200">${KB_LABELS[kb] || esc(kb)}</span>
              <span class="text-xs font-bold t-num text-slate-400">${s.earned}/${s.possible} P. (${kbp}%)</span>
            </div>
            <div class="h-2 w-full overflow-hidden rounded-full bg-white/8"><div class="h-full rounded-full" style="width:${kbp}%;background:${color}"></div></div>
          </div>`;
        }).join("")}
      </div>
    </div>` : ""}

    <!-- ═══ Themen-Analyse (Klausur) ═══ -->
    ${!isZwp && topicEntries.length > 0 ? `
    <div class="glass-card rounded-2xl p-5">
      <h3 class="mb-4 flex items-center gap-2 text-sm font-black text-white"><i data-lucide="book-open" class="h-4 w-4 text-violet-400"></i> Themen-Analyse</h3>
      <div class="space-y-3">
        ${topicEntries.map(([topic, s]) => {
          const tp = s.possible > 0 ? Math.round((s.earned / s.possible) * 100) : 0;
          const color = tp >= 70 ? "#22c55e" : tp >= 50 ? "#f59e0b" : "#ef4444";
          const icon = tp >= 70 ? "✅" : tp >= 50 ? "⚠️" : "❌";
          const label = String(topic).replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
          return `
          <div>
            <div class="mb-1 flex items-center justify-between">
              <span class="text-xs font-bold text-slate-200">${icon} ${esc(label)}</span>
              <span class="text-xs font-bold t-num text-slate-400">${s.earned}/${s.possible} (${tp}%)</span>
            </div>
            <div class="h-2 w-full overflow-hidden rounded-full bg-white/8"><div class="h-full rounded-full" style="width:${tp}%;background:${color}"></div></div>
          </div>`;
        }).join("")}
      </div>
    </div>` : ""}

    <!-- ═══ Schwächen ═══ -->
    ${result.weakTopics?.length > 0 ? `
    <div class="rounded-2xl border border-red-500/20 bg-red-500/10 p-5">
      <h3 class="mb-2 flex items-center gap-2 text-sm font-black text-red-300"><i data-lucide="alert-triangle" class="h-4 w-4"></i> Schwächen identifiziert</h3>
      <p class="mb-3 text-xs text-red-200/70">Diese Themen brauchen Nacharbeitung — am effektivsten trainierst du sie im Modus „Gezieltes Training“:</p>
      <div class="space-y-2">
        ${result.weakTopics.map((t) => {
          const s = result.topicScores?.[t];
          const tp = s && s.possible > 0 ? Math.round((s.earned / s.possible) * 100) : 0;
          return `
          <div class="flex items-center justify-between rounded-lg bg-white/5 p-2.5">
            <span class="text-xs font-bold text-red-200">${esc(String(t).replace(/_/g, " "))}</span>
            <span class="text-xs font-bold t-num text-red-400">${tp}%</span>
          </div>`;
        }).join("")}
      </div>
    </div>` : ""}

    <!-- ═══ Verbesserungstipps ═══ -->
    ${tipsCard(result)}

    <!-- ═══ Aufgaben-Detail ═══ -->
    <div class="glass-card rounded-2xl p-5">
      <h3 class="mb-4 flex items-center gap-2 text-sm font-black text-white">
        <i data-lucide="list-checks" class="h-4 w-4 text-slate-400"></i> Aufgaben-Detail
        <span class="ml-auto text-[10px] font-bold text-slate-500">Für Musterlösungen aufklappen</span>
      </h3>
      <div class="space-y-2">
        ${result.taskResults?.map((tr) => taskDetailRow(paper, tr)).join("")}
      </div>
    </div>

    <!-- ═══ Aktionen ═══ -->
    <div class="grid grid-cols-1 gap-3 pb-8 sm:grid-cols-3">
      <button onclick="${onRetry}" class="flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-700 py-3.5 text-xs font-black uppercase tracking-widest text-white transition-all hover:from-violet-500 active:scale-95 sm:py-4">
        <i data-lucide="rotate-ccw" class="h-4 w-4"></i> Nochmal
      </button>
      <button onclick="${onExit}" class="flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-teal-600 to-emerald-600 py-3.5 text-xs font-black uppercase tracking-widest text-white transition-all hover:from-teal-500 active:scale-95 sm:py-4">
        <i data-lucide="brain" class="h-4 w-4"></i> Weiter trainieren
      </button>
      <button onclick="${onExit}" class="flex items-center justify-center gap-2 rounded-xl bg-white/5 py-3.5 text-xs font-black uppercase tracking-widest text-slate-300 transition-all hover:bg-white/10 active:scale-95 sm:py-4">
        <i data-lucide="home" class="h-4 w-4"></i> Fertig
      </button>
    </div>
  </div>`;

  // Aufklappbare Aufgaben-Details
  root.querySelectorAll("[data-task-toggle]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const nr = Number(btn.dataset.taskToggle);
      resultOpenTask = resultOpenTask === nr ? null : nr;
      renderExamResult(root, result, paper, timeUsed, onRetry, onExit);
    });
  });
  refreshIcons();
}

function tipsCard(result) {
  const tips = [];
  const pct = result.percentage;
  if (pct < 50) tips.push({ icon: "📌", text: "Fokussiere dich zunächst auf die <strong>Grundlagen</strong>. Nutze die Lerneinheiten in der Bibliothek, bevor du die nächste Klausur schreibst." });
  else if (pct < 70) tips.push({ icon: "📌", text: "Du hast die Grundlagen verstanden. Arbeite gezielt an den rot markierten Themen. <strong>Freitext-Fragen</strong> bringen die meisten Punkte — übe das Formulieren mit Fachbegriffen." });
  else if (pct < 90) tips.push({ icon: "📌", text: "Gute Leistung! Für die nächste Stufe: Achte auf <strong>vollständige Antworten</strong> bei Tabellen und Definitionen. Jedes fehlende Stichwort kostet Punkte." });
  else tips.push({ icon: "🏆", text: "Hervorragend! Du bist examensreif. Halte das Niveau mit regelmäßigem Training und versuche weitere Module bzw. die Zwischenprüfung." });

  for (const [type, s] of Object.entries(result.typePerf || {})) {
    const tp = s.possible > 0 ? Math.round((s.earned / s.possible) * 100) : 100;
    if (tp < 50 && TYPE_TIPS[type]) tips.push({ icon: "⚡", text: `<strong>${TYPE_TIPS[type]}</strong>` });
  }

  return `
  <div class="rounded-2xl border border-sky-500/20 bg-sky-500/10 p-5">
    <h3 class="mb-3 flex items-center gap-2 text-sm font-black text-sky-300"><i data-lucide="lightbulb" class="h-4 w-4"></i> Verbesserungstipps</h3>
    <div class="space-y-3 text-xs leading-relaxed text-sky-200/80 sm:text-sm">
      ${tips.map((t) => `<div class="flex gap-2"><span>${t.icon}</span><p>${t.text}</p></div>`).join("")}
    </div>
  </div>`;
}

function taskDetailRow(paper, tr) {
  const task = paper.aufgaben.find((a) => a.id === tr.taskId);
  if (!task) return "";
  const isOpen = resultOpenTask === tr.aufgabeNr;
  const status = tr.percentage >= 70 ? "good" : tr.percentage >= 40 ? "partial" : "bad";
  const statusBg = status === "good" ? "bg-emerald-500/10 border-l-emerald-500" : status === "partial" ? "bg-amber-500/10 border-l-amber-500" : "bg-red-500/10 border-l-red-500";
  const statusIcon = status === "good" ? "✅" : status === "partial" ? "⚠️" : "❌";
  return `
  <div class="overflow-hidden rounded-xl border border-white/5">
    <button data-task-toggle="${tr.aufgabeNr}" class="flex w-full items-center justify-between gap-3 border-l-4 p-3 text-left transition-colors hover:bg-white/5 ${statusBg}">
      <div class="flex-1">
        <div class="flex items-center gap-2 text-xs font-bold text-slate-100 sm:text-sm">
          <span>${statusIcon}</span>
          <span>${esc(tr.title || `Aufgabe ${tr.aufgabeNr}`)}: ${TYPE_NAMES[tr.type] || esc(tr.type)}</span>
        </div>
        <div class="mt-0.5 text-[10px] text-slate-500">${tr.topic ? esc(String(tr.topic).replace(/_/g, " ")) : esc(task.kbTag || "")} · ${TYPE_NAMES[tr.type] || esc(tr.type)}</div>
      </div>
      <div class="flex items-center gap-2">
        <span class="text-xs font-black t-num text-slate-200">${tr.earned}/${tr.possible}</span>
        <i data-lucide="chevron-down" class="h-3.5 w-3.5 text-slate-500 transition-transform ${isOpen ? "rotate-180" : ""}"></i>
      </div>
    </button>
    ${isOpen ? `<div class="space-y-3 bg-white/3 p-4 text-xs leading-relaxed text-slate-300 sm:text-sm">${taskSolution(task, tr)}</div>` : ""}
  </div>`;
}

/* ═══ MUSTERLÖSUNGEN je Aufgabentyp (v8 TaskSolution) ═══ */
function taskSolution(task, tr) {
  const p = task.payload || {};
  const data = p.data || {};
  switch (task.type) {
    case "richtig_falsch": {
      const statements = p.statements || data.statements || [{ text: p.statement, answer: p.answer }];
      return `
      <div class="space-y-2">
        <p class="font-semibold text-slate-100">${p.instruction ? fmtMd(p.instruction.replace(/\*\*/g, "")) : ""}</p>
        <div class="space-y-1">
          ${statements.map((s) => `
          <div class="flex gap-2">
            <span class="font-bold ${s.answer === "richtig" ? "text-emerald-400" : "text-red-400"}">${s.answer === "richtig" ? "richtig" : "falsch"}</span>
            <span class="text-slate-300">${esc(s.text)}</span>
          </div>`).join("")}
        </div>
        ${p.explanation ? `<div class="mt-2 rounded bg-sky-500/10 p-2 text-sky-200">${esc(p.explanation)}</div>` : ""}
      </div>`;
    }
    case "nennen_liste": {
      const correct = p.correct_answers || data.correct_answers || [];
      return `
      <div class="space-y-2">
        <p class="font-semibold text-slate-100">${fmtMd((p.instruction || "").replace(/\*\*/g, ""))}</p>
        <p class="font-bold text-slate-200">Richtige Antworten:</p>
        <ul class="list-disc pl-5 text-emerald-400">${correct.map((a) => `<li>${esc(a)}</li>`).join("")}</ul>
      </div>`;
    }
    case "freitext_box":
      return `
      <div class="space-y-2">
        <p class="font-semibold text-slate-100">${fmtMd((p.instruction || "").replace(/\*\*/g, ""))}</p>
        <p class="font-bold text-slate-200">Erwartete Antwort:</p>
        <p class="italic text-emerald-400">${esc(data.correct_answer || "—")}</p>
        ${data.keywords?.length ? `<p class="text-slate-500">Stichworte: <strong class="text-slate-300">${data.keywords.map(esc).join(", ")}</strong></p>` : ""}
      </div>`;
    case "tabelle_2spalten":
    case "tabelle_3spalten":
    case "tabelle_4spalten":
    case "tabelle_vergleich": {
      const table = data.table;
      if (!table) return "";
      return `
      <div class="space-y-2">
        <p class="font-semibold text-slate-100">${fmtMd((p.instruction || "").replace(/\*\*/g, ""))}</p>
        <table class="w-full text-[11px]">
          <thead><tr>${table.headers.map((h) => `<th class="border border-white/10 bg-white/5 p-1.5 text-left text-slate-400">${esc(h)}</th>`).join("")}</tr></thead>
          <tbody>
            ${table.rows.map((row) => `
            <tr>
              ${row.cells.map((cell) => `
              <td class="border border-white/10 p-1.5 align-top">${cell.type === "text" || cell.type === "static" ? esc(cell.content || cell.value || "") : `<span class="text-emerald-400">${esc(cell.correct_answer || "")}</span>`}</td>`).join("")}
            </tr>`).join("")}
          </tbody>
        </table>
      </div>`;
    }
    case "zuordnung":
      return `
      <div class="space-y-2">
        <p class="font-bold text-slate-200">Richtige Zuordnung:</p>
        ${(data.statements || []).map((s) => `<div class="text-slate-300">${esc(s.text)} → <strong class="text-violet-300">${esc(s.answer)}</strong></div>`).join("")}
      </div>`;
    case "ergaenzen_liste":
      return `
      <div class="space-y-2">
        <p class="font-bold text-slate-200">Fehlende Begriffe:</p>
        <ul class="list-disc pl-5 text-emerald-400">${(data.missing_items || []).map((m) => `<li>${esc(m)}</li>`).join("")}</ul>
      </div>`;
    case "definition_plus_beispiele":
      return `
      <div class="space-y-2">
        <p class="font-bold text-slate-200">Definition:</p>
        <p class="text-emerald-400">${esc(data.definition_correct || data.correct_answer || "—")}</p>
        ${data.correct_examples?.length ? `<p class="font-bold text-slate-200">Beispiele:</p><ul class="list-disc pl-5 text-emerald-400">${data.correct_examples.map((e) => `<li>${esc(e)}</li>`).join("")}</ul>` : ""}
      </div>`;
    case "ankreuzen_begruenden":
      return `
      <div class="space-y-1">
        <p class="font-bold text-slate-200">Richtige Ankreuzungen:</p>
        ${(data.options || []).map((o) => `
        <div class="flex gap-2">
          <span class="${o.correct ? "text-emerald-400" : "text-slate-500"}">${o.correct ? "☑" : "☐"}</span>
          <span class="${o.correct ? "text-slate-200" : "text-slate-500"}">${esc(o.label)}</span>
        </div>`).join("")}
      </div>`;
    case "zwp_rf":
      return `
      <div class="space-y-1">
        <p class="font-bold text-slate-200">Richtige Lösungen:</p>
        ${(p.statements || []).map((s) => `
        <div class="flex gap-2">
          <span class="font-bold ${s.richtig ? "text-emerald-400" : "text-red-400"}">${s.richtig ? "R" : "F"}</span>
          <span class="text-slate-300">${esc(s.text)}</span>
        </div>`).join("")}
      </div>`;
    case "zwp_mc":
      return `
      <div class="space-y-1">
        <p class="font-bold text-slate-200">Richtige Antworten:</p>
        ${(p.questions || []).map((q) => `<div class="text-slate-300"><strong class="text-violet-300">${esc(q.richtig)}</strong> — ${esc(q.frage)}</div>`).join("")}
      </div>`;
    case "zwp_grid":
    case "zwp_list":
    case "zwp_text": {
      const subs = tr.subtaskResults || [];
      if (!subs.length) return `<p class="text-slate-500">Keine Bewertung verfügbar.</p>`;
      return `
      <div class="space-y-2">
        <p class="font-bold text-slate-200">Bewertung der Teilaufgaben:</p>
        ${subs.map((s) => `
        <div class="rounded-lg bg-white/5 p-2.5">
          <div class="flex items-start justify-between gap-2">
            <span class="flex-1 text-slate-300">${esc(s.label)}</span>
            <span class="shrink-0 font-bold t-num text-slate-100">${s.earned}/${s.possible} P.</span>
          </div>
          ${s.feedback ? `<p class="mt-1 text-[11px] leading-relaxed text-violet-200/80">🤖 ${esc(s.feedback)}</p>` : ""}
        </div>`).join("")}
        ${tr.aiFeedback ? `<p class="mt-2 text-[10px] text-slate-500">${esc(tr.aiFeedback)}</p>` : ""}
      </div>`;
    }
    default: return "";
  }
}
