/* ════════════════════════════════════════════════════════════════
   V8 EXAM RENDERER — 1:1 Klausur-Zettel (alle 10 Klausur-Typen +
   5 ZWP-Typen) · Port des React-AufgabeRenderer in Vanilla-JS.
   Antwort-Zustand: PaperState.answers[taskId] (wie React-State).
   ════════════════════════════════════════════════════════════════ */

const PaperState = { paper: null, answers: {} };

const ExamRenderer = {
  fmt(t) { return t ? String(t).replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>") : ""; },

  /* ═══ GESAMTER BOGEN ═══ */
  render(paper, container, answers) {
    PaperState.paper = paper;
    PaperState.answers = answers || {};
    let html = "";

    // ═══ HEADER (v8 PaperHeader) ═══
    const date = new Date(paper.dateISO).toLocaleDateString("de-DE");
    html += `
    <div class="ep-header">
      ${paper.headerLine ? `
      <div class="ep-header-top">
        <span>${esc(paper.headerLine)}</span>
        <span>Schuljahr ${esc(paper.schoolYearLine || "")}</span>
      </div>` : ""}
      <div class="ep-title">
        <h1>${esc(paper.title)}</h1>
        <h2>${esc(paper.subtitle)}</h2>
        ${paper.mode === "zwp" ? `
        <div class="ep-title-sub">Anlage 1 PflAPrV · Kompetenzbereiche I–V</div>
        <div class="ep-ki-note">KI-generierter Prüfungsbogen zu Übungszwecken — kein offizielles Prüfungsdokument</div>` : ""}
      </div>
      <div class="ep-info-grid">
        <div class="ep-info-cell"><label>Name, Vorname</label><span class="value">${esc(paper.studentName || "")}</span></div>
        <div class="ep-info-cell"><label>Kurs</label><span class="value">${esc(paper.studentKurs || "—")}</span></div>
        <div class="ep-info-cell"><label>Datum</label><span class="value">${date}</span></div>
        <div class="ep-info-cell"><label>Zeit</label><span class="value">${paper.timeMinutes - paper.lesezeitMinutes} Min${paper.lesezeitMinutes ? " +10 LZ" : ""}</span></div>
        <div class="ep-info-cell"><label>Punkte</label><span class="value">___ / ${paper.totalPoints}</span></div>
        <div class="ep-info-cell"><label>Note</label><span class="value">___</span></div>
      </div>
    </div>`;

    // ═══ LESEZEIT + HINWEIS ═══
    if (paper.lesezeitMinutes > 0) {
      html += `
      <div class="ep-lesezeit">
        <strong>10 Minuten Lesezeit:</strong> Lesen Sie zunächst das gesamte Fallbeispiel und alle Aufgaben aufmerksam durch, bevor Sie mit der Bearbeitung beginnen.
      </div>`;
    }
    if (paper.hinweis) {
      html += `
      <div class="ep-hinweis">
        <strong>⏱ Bearbeitungszeit:</strong> ${paper.timeMinutes - paper.lesezeitMinutes} Minuten${paper.lesezeitMinutes ? " (zzgl. 10 Min. Lesezeit)" : ""} &nbsp;|&nbsp;
        <strong>Gesamtpunkte:</strong> ${paper.totalPoints} Punkte &nbsp;|&nbsp;
        ${esc(paper.hinweis)}
      </div>`;
    }

    // ═══ FALLBEISPIEL + ARZTBRIEF ═══
    if (paper.fallbeispiel) html += this.renderFallbeispiel(paper.fallbeispiel);

    // ═══ AUFGABEN ═══
    paper.aufgaben.forEach((a) => { html += this.renderAufgabe(a); });

    // ═══ BEWERTUNGS-TABELLE (ZWP) ═══
    if (paper.scoringTable) {
      html += `
      <table class="ep-scoring-table">
        <thead><tr><th>Aufgabe</th><th>Thema</th><th>KB</th><th>Max. Punkte</th><th>Erreichte Punkte</th></tr></thead>
        <tbody>
          ${paper.scoringTable.map((r) => `<tr><td>${esc(r.nr)}</td><td>${esc(r.thema)}</td><td>${esc(r.kb)}</td><td>${r.maxPunkte}</td><td></td></tr>`).join("")}
          <tr class="total-row"><td colspan="3"><strong>Gesamt</strong></td><td><strong>${paper.totalPoints} P.</strong></td><td><strong>/ ${paper.totalPoints} P.</strong></td></tr>
        </tbody>
      </table>`;
    }

    // ═══ FOOTER ═══
    html += `
    <div class="ep-footer">
      <span class="ep-footer-note">✏ Viel Erfolg!</span>
      <span class="ep-footer-pts">Gesamt: ${paper.totalPoints} P.</span>
    </div>`;

    container.innerHTML = html;
    this.bindEvents(container);
    return html;
  },

  renderFallbeispiel(fall) {
    return `
    <div class="ep-fallbeispiel">
      <div class="ep-fallbeispiel-title">
        📋 ${esc(fall.title || "Fallbeispiel")}
        <span class="ep-fall-badge">Bitte vollständig lesen</span>
      </div>
      ${fall.patient?.name ? `
      <p style="font-size:13px;font-family:var(--font-jakarta),sans-serif;color:#555">
        <strong>${esc(fall.patient.name)}</strong>${fall.patient.alter ? `, ${fall.patient.alter} Jahre` : ""}${fall.patient.wohnsituation ? ` · ${esc(fall.patient.wohnsituation)}` : ""}${fall.patient.beruf ? ` · ${esc(fall.patient.beruf)}` : ""}${fall.setting ? ` · ${esc(fall.setting)}` : ""}
      </p>` : ""}
      ${(fall.paragraphs || []).map((p) => `<p>${p}</p>`).join("")}
      ${fall.arztbrief?.show && fall.arztbrief?.fields?.length ? `
      <div class="ep-arztbrief">
        <div class="ep-arztbrief-title">🩺 Arztbrief / Anamnese</div>
        ${fall.arztbrief.fields.map((f) => `
        <div class="ep-arztbrief-row">
          <div class="ep-arztbrief-label">${esc(f.label)}</div>
          <div class="ep-arztbrief-value">${esc(f.value)}</div>
        </div>`).join("")}
      </div>` : ""}
    </div>`;
  },

  /* ═══ EINZELAUFGABE ═══ */
  renderAufgabe(a) {
    const p = a.payload || {};
    const data = p.data || {};
    const v = PaperState.answers[a.id] || {};
    let body = "";

    const header = `
    <div class="ep-aufgabe-header">
      <div class="ep-aufgabe-left">
        <span class="ep-aufgabe-nr">${esc(a.title || `Aufgabe ${a.nr}`)}</span>
        ${a.kbTag ? `<span class="ep-aufgabe-tag">${esc(a.kbTag)}</span>` : ""}
        ${a.kbBadge ? `<span class="ep-kb-badge">${esc(a.kbBadge)}</span>` : ""}
        ${!a.kbTag && !a.title && a.fallabhaengig ? `<span class="ep-aufgabe-tag">Fallabhängige Frage</span>` : ""}
      </div>
      <span class="ep-aufgabe-pts">${a.points} Punkte</span>
    </div>`;

    switch (a.type) {
      case "richtig_falsch": body = this.rfBody(a, p, data, v); break;
      case "nennen_liste": body = this.nennenBody(a, p, data, v); break;
      case "freitext_box": body = this.freitextBody(a, p, data, v); break;
      case "tabelle_2spalten":
      case "tabelle_3spalten":
      case "tabelle_4spalten":
      case "tabelle_vergleich": body = this.tabelleBody(a, p, data, v); break;
      case "zuordnung": body = this.zuordnungBody(a, p, data, v); break;
      case "ergaenzen_liste": body = this.ergaenzenBody(a, p, data, v); break;
      case "definition_plus_beispiele": body = this.definitionBody(a, p, data, v); break;
      case "ankreuzen_begruenden": body = this.ankreuzenBody(a, p, data, v); break;
      case "zwp_rf": body = this.zwpRfBody(a, p, v); break;
      case "zwp_grid": body = this.zwpGridBody(a, p, v); break;
      case "zwp_list": body = this.zwpListBody(a, p, v); break;
      case "zwp_mc": body = this.zwpMcBody(a, p, v); break;
      case "zwp_text": body = this.zwpTextBody(a, p, v); break;
      default: body = `<p class="ep-instruction" style="color:#b91c1c">Unbekannter Aufgabentyp: ${esc(a.type)}</p>`;
    }

    const isZwpPtsInline = ["zwp_rf", "zwp_grid", "zwp_list", "zwp_mc", "zwp_text"].includes(a.type);
    const pointsFooter = `
    <div class="ep-points">
      <span class="ep-scoring">${esc(a.scoringInfo || "")}</span>
      <div class="ep-points-box">__ / ${a.points} Punkte</div>
    </div>`;

    return `<div class="ep-aufgabe" id="aufgabe-${a.nr}">${header}${body}${isZwpPtsInline ? "" : pointsFooter}</div>`;
  },

  /* ── KLAUSUR-TYPEN ── */

  rfBody(a, p, data, v) {
    const statements = p.statements || data.statements || [{ text: p.statement, answer: p.answer }];
    const responses = v.responses || [];
    return `
    <div class="ep-instruction">${this.fmt(p.instruction || "Entscheiden Sie, welche Aussagen richtig oder falsch sind.")}</div>
    <div style="border:1px solid #999">
      <div class="ep-rf-row ep-rf-row-head">
        <div class="ep-rf-statement">Aussage</div>
        <div class="ep-rf-opt">richtig</div>
        <div class="ep-rf-opt">falsch</div>
      </div>
      ${statements.map((s, i) => `
      <div class="ep-rf-row">
        <div class="ep-rf-statement">${s.text}</div>
        <div class="ep-rf-opt" title="Klicken zum Anwählen — erneut klicken zum Löschen" data-a="rf" data-task="${esc(a.id)}" data-i="${i}" data-val="richtig">
          <div class="ep-rf-circle ${responses[i] === "richtig" ? "sel" : ""}"></div>
        </div>
        <div class="ep-rf-opt" title="Klicken zum Anwählen — erneut klicken zum Löschen" data-a="rf" data-task="${esc(a.id)}" data-i="${i}" data-val="falsch">
          <div class="ep-rf-circle ${responses[i] === "falsch" ? "sel" : ""}"></div>
        </div>
      </div>`).join("")}
    </div>`;
  },

  nennenBody(a, p, data, v) {
    const label = p.list_label || data.list_label || "";
    const count = p.count || data.count || 4;
    const items = Array.isArray(v.items) ? v.items : Array.from({ length: count }, () => "");
    return `
    <div class="ep-instruction">${this.fmt(p.instruction || "")}</div>
    ${label ? `<div class="ep-label-bar">${esc(label)}</div>` : ""}
    <div class="ep-list-box">
      ${items.map((val, i) => `
      <div class="ep-list-item">
        <span class="ep-list-bullet">${i + 1}</span>
        <input class="ep-input" data-a="item" data-task="${esc(a.id)}" data-i="${i}" value="${esc(val)}">
      </div>`).join("")}
    </div>`;
  },

  freitextBody(a, p, data, v) {
    return `
    <div class="ep-instruction">${this.fmt(p.instruction || "")}</div>
    ${data.box_label ? `<div class="ep-label-bar">${esc(data.box_label)}</div>` : ""}
    <textarea class="ep-textarea ep-textarea-lg" rows="${data.min_rows || 5}" data-a="text" data-task="${esc(a.id)}" placeholder="Ihre Antwort…" style="margin-top:8px">${esc(v.text || "")}</textarea>`;
  },

  tabelleBody(a, p, data, v) {
    const table = data.table;
    if (!table) return `<p class="ep-instruction">Tabelle fehlt</p>`;
    const cells = v.cells || [];
    const getCell = (r, c) => (cells.find((x) => x.row === r && x.col === c) || {}).value || "";
    return `
    <div class="ep-instruction">${this.fmt(p.instruction || "")}</div>
    <table class="ep-table">
      <thead><tr>${table.headers.map((h) => `<th>${esc(h)}</th>`).join("")}</tr></thead>
      <tbody>
        ${table.rows.map((row, ri) => `
        <tr>
          ${row.cells.map((cell, ci) => {
            if (cell.type === "text" || cell.type === "static") return `<td>${esc(cell.content || cell.value || "")}</td>`;
            if (cell.type === "textarea") return `<td class="ep-td-input"><textarea class="ep-textarea" rows="${cell.rows || 2}" data-a="cell" data-task="${esc(a.id)}" data-r="${ri}" data-c="${ci}">${esc(getCell(ri, ci))}</textarea></td>`;
            return `<td class="ep-td-input"><input class="ep-input" data-a="cell" data-task="${esc(a.id)}" data-r="${ri}" data-c="${ci}" value="${esc(getCell(ri, ci))}"></td>`;
          }).join("")}
        </tr>`).join("")}
      </tbody>
    </table>`;
  },

  zuordnungBody(a, p, data, v) {
    const legend = data.legend || {};
    const statements = data.statements || [];
    const keys = Object.keys(legend);
    const selections = v.selections || [];
    return `
    <div class="ep-instruction">${this.fmt(p.instruction || "")}</div>
    <div class="ep-zuordnung-legend">${keys.map((k) => `<span>${esc(k)} = ${esc(legend[k])}</span>`).join("")}</div>
    <table class="ep-table">
      <thead><tr><th style="width:80%">Aussage</th><th style="text-align:center">Zuordnung</th></tr></thead>
      <tbody>
        ${statements.map((s, si) => `
        <tr>
          <td style="font-size:13px;font-family:var(--font-jakarta),sans-serif">${esc(s.text)}</td>
          <td style="text-align:center">
            <select class="ep-zu-select" data-a="zu" data-task="${esc(a.id)}" data-si="${si}">
              <option value="">–</option>
              ${keys.map((o) => `<option value="${esc(o)}" ${selections[si] === o ? "selected" : ""}>${esc(o)}</option>`).join("")}
            </select>
          </td>
        </tr>`).join("")}
      </tbody>
    </table>`;
  },

  ergaenzenBody(a, p, data, v) {
    const given = data.given_items || [];
    const missing = data.missing_items || [];
    const items = Array.isArray(v.items) ? v.items : Array.from({ length: missing.length }, () => "");
    return `
    <div class="ep-instruction">${this.fmt(p.instruction || "")}</div>
    ${data.list_label ? `<div class="ep-label-bar">${esc(data.list_label)}</div>` : ""}
    <div class="ep-list-box">
      ${given.map((item) => `
      <div class="ep-list-item">
        <span class="ep-list-bullet ep-list-bullet-given">✓</span>
        <span class="ep-list-given">${esc(item)}</span>
      </div>`).join("")}
      ${missing.map((_, i) => `
      <div class="ep-list-item">
        <span class="ep-list-bullet">?</span>
        <input class="ep-input" data-a="item" data-task="${esc(a.id)}" data-i="${i}" value="${esc(items[i] || "")}">
      </div>`).join("")}
    </div>`;
  },

  definitionBody(a, p, data, v) {
    const exCount = data.examples_count || 0;
    const examples = Array.isArray(v.examples) ? v.examples : Array.from({ length: exCount }, () => "");
    return `
    <div class="ep-instruction">${this.fmt(p.instruction || "")}</div>
    <div class="ep-label-bar">${esc(data.definition_label || "Definition")}</div>
    <textarea class="ep-textarea" rows="4" data-a="def" data-task="${esc(a.id)}" placeholder="Definition…" style="margin-bottom:12px">${esc(v.definition || "")}</textarea>
    ${exCount > 0 ? `
    <div class="ep-label-bar">${esc(data.examples_label || "Beispiele")}</div>
    <div class="ep-list-box">
      ${examples.map((val, i) => `
      <div class="ep-list-item">
        <span class="ep-list-bullet">${i + 1}</span>
        <input class="ep-input" data-a="ex" data-task="${esc(a.id)}" data-i="${i}" value="${esc(val)}">
      </div>`).join("")}
    </div>` : ""}`;
  },

  ankreuzenBody(a, p, data, v) {
    const opts = data.options || [];
    const checked = v.checked || opts.map(() => false);
    const justifications = v.justifications || Array.from({ length: data.justify_count || 0 }, () => "");
    return `
    <div class="ep-instruction">${this.fmt(p.instruction_select || p.instruction || "")}</div>
    <div style="border:1px solid #999">
      ${opts.map((o, oi) => `
      <div class="ep-ak-row" data-a="cb" data-task="${esc(a.id)}" data-oi="${oi}" style="display:flex;cursor:pointer;align-items:center;gap:12px;${oi > 0 ? "border-top:1px solid #e5e7eb;" : ""}padding:12px;transition:background 0.15s;font-family:var(--font-jakarta),sans-serif;font-size:13px" onmouseover="this.style.background='#f9fafb'" onmouseout="this.style.background='transparent'">
        <div class="ep-checkbox ${checked[oi] ? "checked" : ""}" style="pointer-events:none"></div>
        <span>${esc(o.label)}</span>
      </div>`).join("")}
    </div>
    ${(data.justify_count || 0) > 0 ? `
    <div class="ep-instruction" style="margin-top:16px">${this.fmt(p.instruction_justify || "**Begründen** Sie Ihre Entscheidungen.")}</div>
    ${justifications.map((j, i) => `
    <div style="margin-bottom:8px">
      <label style="font-family:var(--font-jakarta),sans-serif;font-size:11px;font-weight:700;color:#888">Begründung ${i + 1}:</label>
      <textarea class="ep-textarea" rows="3" data-a="just" data-task="${esc(a.id)}" data-i="${i}">${esc(j)}</textarea>
    </div>`).join("")}` : ""}`;
  },

  /* ── ZWP-TYPEN ── */

  zwpRfBody(a, p, v) {
    const statements = p.statements || [];
    const responses = v.responses || [];
    return `
    <div class="ep-instruction">${this.fmt(a.instruction || "")}</div>
    <div style="border:1px solid #999">
      <div class="ep-rf-row ep-rf-row-head">
        <div class="ep-rf-statement">Aussage</div>
        <div class="ep-rf-opt">R</div>
        <div class="ep-rf-opt">F</div>
      </div>
      ${statements.map((s, i) => `
      <div class="ep-rf-row">
        <div class="ep-rf-statement">${i + 1}. ${esc(s.text)}</div>
        <div class="ep-rf-opt" title="Klicken zum Anwählen — erneut klicken zum Löschen" data-a="rf" data-task="${esc(a.id)}" data-i="${i}" data-val="R">
          <div class="ep-rf-circle ${responses[i] === "R" ? "sel" : ""}"></div>
        </div>
        <div class="ep-rf-opt" title="Klicken zum Anwählen — erneut klicken zum Löschen" data-a="rf" data-task="${esc(a.id)}" data-i="${i}" data-val="F">
          <div class="ep-rf-circle ${responses[i] === "F" ? "sel" : ""}"></div>
        </div>
      </div>`).join("")}
    </div>
    <div class="ep-pts-line">/ ${a.points} Punkte</div>`;
  },

  zwpGridBody(a, p, v) {
    const subtasks = p.subtasks || [];
    const subAns = v.subtasks || [];
    return `
    <div class="ep-instruction">${this.fmt(a.instruction || "")}</div>
    ${p.smartHint ? `<p class="ep-smart-hint"><em>${esc(p.smartHint)}</em></p>` : ""}
    ${subtasks.map((st, si) => {
      const cols = st.columns || [];
      const cells = (subAns[si] || {}).cells || Array.from({ length: st.rows * cols.length }, () => "");
      return `
      <div class="ep-subtask">
        <div class="ep-subtask-header">
          <span class="ep-subtask-letter">${esc(st.letter)}</span>
          <span class="ep-subtask-text">${this.fmt(st.text)}</span>
        </div>
        <table class="ep-answer-table">
          <thead><tr>${cols.map((c) => `<th>${esc(c)}</th>`).join("")}</tr></thead>
          <tbody>
            ${Array.from({ length: st.rows }, (_, r) => `
            <tr>
              ${cols.map((_, ci) => `
              <td class="ep-td-input">
                <textarea class="ep-textarea" style="min-height:${st.smart ? 70 : 32}px" data-a="gcell" data-task="${esc(a.id)}" data-s="${si}" data-i="${r * cols.length + ci}" placeholder="${st.smart ? `Pflegeziel ${ci + 1}…` : `${esc((cols[ci] || "").split(" ")[0] || "")} ${r + 1}…`}">${esc(cells[r * cols.length + ci] || "")}</textarea>
              </td>`).join("")}
            </tr>`).join("")}
          </tbody>
        </table>
        <div class="ep-pts-line">/ ${st.points} Punkte</div>
      </div>`;
    }).join("")}`;
  },

  zwpListBody(a, p, v) {
    const items = p.items || [];
    const values = v.items || [];
    return `
    <div class="ep-instruction">${this.fmt(a.instruction || "")}</div>
    <ul class="ep-nennen-list">
      ${items.map((it, i) => `
      <li>
        <div class="ep-nennen-num">${i + 1}</div>
        <div style="flex:1">
          <p style="font-size:12.5px;font-family:var(--font-jakarta),sans-serif;color:#444;margin:0 0 4px;font-weight:600">${esc(it.label)}</p>
          <textarea class="ep-textarea" style="min-height:60px;font-size:13px" data-a="litem" data-task="${esc(a.id)}" data-i="${i}" placeholder="Maßnahmen mit Begründung beschreiben…">${esc(values[i] || "")}</textarea>
        </div>
      </li>`).join("")}
    </ul>
    <div class="ep-pts-line">/ ${a.points} Punkte</div>`;
  },

  zwpMcBody(a, p, v) {
    const questions = p.questions || [];
    const selections = v.selections || [];
    return `
    <div class="ep-instruction">${this.fmt(a.instruction || "")}</div>
    ${questions.map((q, qi) => `
    <div class="ep-mc-block">
      <p class="ep-mc-q"><strong>${esc(q.nr || qi + 1)}.</strong> ${esc(q.frage)}${q.kb ? `<span class="kb-hint"> · KB ${esc(q.kb)}</span>` : ""}</p>
      <ul class="ep-mc-options">
        ${(q.optionen || []).map((opt, oi) => {
          const letter = String(opt).match(/^([A-D])\)/)?.[1] || String.fromCharCode(65 + oi);
          const sel = (selections[qi] || "").toUpperCase() === letter;
          return `
          <li class="${sel ? "mc-sel" : ""}" data-a="mc" data-task="${esc(a.id)}" data-qi="${qi}" data-letter="${letter}">
            <div class="ep-mc-circle"></div>
            <span>${esc(opt)}</span>
          </li>`;
        }).join("")}
      </ul>
      <div class="ep-pts-line">/ 4 Punkte</div>
    </div>`).join("")}`;
  },

  zwpTextBody(a, p, v) {
    const subtasks = p.subtasks || [];
    const subAns = v.subtasks || [];
    return `
    ${a.instruction ? `<div class="ep-instruction">${this.fmt(a.instruction)}</div>` : ""}
    ${p.situation ? `
    <div class="ep-instruction ep-situation-box ${a.id === "zwp_a9" ? "ep-ethik-box" : ""}">
      <strong>Situation:</strong> ${esc(p.situation)}
    </div>` : ""}
    ${subtasks.map((st, si) => `
    <div class="ep-subtask">
      <div class="ep-subtask-header">
        <span class="ep-subtask-letter">${esc(st.letter)}</span>
        <span class="ep-subtask-text">${this.fmt(st.text)}</span>
      </div>
      <textarea class="ep-textarea ${si === 0 ? "ep-textarea-lg" : ""}" rows="${st.rows || 5}" data-a="stext" data-task="${esc(a.id)}" data-s="${si}" placeholder="Ihre Antwort…">${esc(subAns[si] || "")}</textarea>
      <div class="ep-pts-line">/ ${st.points} Punkte</div>
    </div>`).join("")}`;
  },

  /* ═══ EVENTS: Antworten in PaperState.answers pflegen ═══ */
  bindEvents(container) {
    // Klick-basierte Elemente (RF-Kreise, MC-Optionen, Checkboxes)
    container.addEventListener("click", (e) => {
      const el = e.target.closest("[data-a]");
      if (!el || !el.dataset.task) return;
      const taskId = el.dataset.task;
      const a = PaperState.answers[taskId] || {};

      if (el.dataset.a === "rf") {
        const i = Number(el.dataset.i);
        const val = el.dataset.val;
        const responses = [...(a.responses || [])];
        responses[i] = responses[i] === val ? "" : val; // Toggle-off (v8)
        PaperState.answers[taskId] = { ...a, responses };
        // Optische Klasse direkt umschalten
        const row = el.closest(".ep-rf-row");
        row.querySelectorAll(".ep-rf-opt").forEach((opt) => {
          const circle = opt.querySelector(".ep-rf-circle");
          const isThis = opt === el;
          circle.classList.toggle("sel", isThis && responses[i] === val);
        });
        this.notifyChange(taskId);
      } else if (el.dataset.a === "mc") {
        const qi = Number(el.dataset.qi);
        const letter = el.dataset.letter;
        const selections = [...(a.selections || [])];
        selections[qi] = letter;
        PaperState.answers[taskId] = { ...a, selections };
        const block = el.closest(".ep-mc-block");
        block.querySelectorAll("li").forEach((li) => {
          li.classList.toggle("mc-sel", li === el);
        });
        this.notifyChange(taskId);
      } else if (el.dataset.a === "cb") {
        const oi = Number(el.dataset.oi);
        const checked = [...(a.checked || [])];
        checked[oi] = !checked[oi];
        PaperState.answers[taskId] = { ...a, checked };
        const box = el.querySelector(".ep-checkbox");
        box.classList.toggle("checked", checked[oi]);
        this.notifyChange(taskId);
      }
    });

    // Eingabe-basierte Elemente (Inputs, Textareas, Selects)
    const inputHandler = (e) => {
      const el = e.target.closest("[data-a]");
      if (!el || !el.dataset.task) return;
      const taskId = el.dataset.task;
      const a = PaperState.answers[taskId] || {};
      const kind = el.dataset.a;

      if (kind === "item") {
        const i = Number(el.dataset.i);
        const items = [...(a.items || [])];
        items[i] = el.value;
        PaperState.answers[taskId] = { ...a, items };
      } else if (kind === "text") {
        PaperState.answers[taskId] = { ...a, text: el.value };
      } else if (kind === "def") {
        PaperState.answers[taskId] = { ...a, definition: el.value };
      } else if (kind === "ex") {
        const i = Number(el.dataset.i);
        const examples = [...(a.examples || [])];
        examples[i] = el.value;
        PaperState.answers[taskId] = { ...a, examples };
      } else if (kind === "just") {
        const i = Number(el.dataset.i);
        const justifications = [...(a.justifications || [])];
        justifications[i] = el.value;
        PaperState.answers[taskId] = { ...a, justifications };
      } else if (kind === "cell") {
        const r = Number(el.dataset.r), c = Number(el.dataset.c);
        const cells = (a.cells || []).filter((x) => !(x.row === r && x.col === c));
        cells.push({ row: r, col: c, value: el.value });
        PaperState.answers[taskId] = { ...a, cells };
      } else if (kind === "gcell") {
        const s = Number(el.dataset.s), i = Number(el.dataset.i);
        const subtasks = [...(a.subtasks || [])];
        const st = subtasks[s] || { cells: [] };
        const cells = [...(st.cells || [])];
        cells[i] = el.value;
        subtasks[s] = { cells };
        PaperState.answers[taskId] = { ...a, subtasks };
      } else if (kind === "litem") {
        const i = Number(el.dataset.i);
        const items = [...(a.items || [])];
        items[i] = el.value;
        PaperState.answers[taskId] = { ...a, items };
      } else if (kind === "stext") {
        const s = Number(el.dataset.s);
        const subtasks = [...(a.subtasks || [])];
        subtasks[s] = el.value;
        PaperState.answers[taskId] = { ...a, subtasks };
      } else if (kind === "zu") {
        const si = Number(el.dataset.si);
        const selections = [...(a.selections || [])];
        selections[si] = el.value;
        PaperState.answers[taskId] = { ...a, selections };
      } else {
        return;
      }
      this.notifyChange(taskId);
    };
    container.addEventListener("input", inputHandler);
    container.addEventListener("change", inputHandler);
  },

  // Simulator benachrichtigen (Autosave + Navigator-Update)
  notifyChange(taskId) {
    if (typeof window.__onAnswerChanged === "function") {
      window.__onAnswerChanged(taskId, PaperState.answers[taskId]);
    }
  },
};

/* ═══ Live-Status: Aufgabe beantwortet? (v8 hasTaskAnswer) ═══ */
function hasTaskAnswer(a, v) {
  if (!v) return false;
  switch (a.type) {
    case "richtig_falsch": return (v.responses || []).some((r) => r);
    case "nennen_liste":
    case "ergaenzen_liste": return (v.items || []).some((i) => i && i.trim());
    case "freitext_box": return !!(v.text && v.text.trim());
    case "tabelle_2spalten":
    case "tabelle_3spalten":
    case "tabelle_4spalten":
    case "tabelle_vergleich": return (v.cells || []).some((c) => c.value && c.value.trim());
    case "zuordnung": return (v.selections || []).some((s) => s);
    case "definition_plus_beispiele":
      return !!(v.definition && v.definition.trim()) || (v.examples || []).some((e) => e && e.trim());
    case "ankreuzen_begruenden":
      return (v.checked || []).some(Boolean) || (v.justifications || []).some((j) => j && j.trim());
    case "zwp_rf": return (v.responses || []).some((r) => r);
    case "zwp_mc": return (v.selections || []).some((s) => s);
    case "zwp_grid":
      return (v.subtasks || []).some((st) => (st.cells || []).some((c) => c && c.trim()));
    case "zwp_list": return (v.items || []).some((i) => i && i.trim());
    case "zwp_text": return (v.subtasks || []).some((s) => s && s.trim());
    default: return false;
  }
}

function countAnswered(paper, answers) {
  let n = 0;
  for (const a of paper.aufgaben) {
    if (hasTaskAnswer(a, answers[a.id])) n++;
  }
  return n;
}
