const ExamRenderer = {
    render(exam, container) {
        let html = '';

        // ═══ HEADER ═══
        html += `
        <div class="ep-header">
            <div class="ep-header-top">
                Leistungsnachweis ${exam.module_title}<br>
                ${exam.subtitle}
            </div>
            <div class="ep-title">
                <h1>Leistungsnachweis</h1>
                <h2>${exam.module_title}</h2>
            </div>
            <div class="ep-info-grid">
                <div class="ep-info-cell"><label>Name:</label> <span class="value">${exam.studentName || ''}</span></div>
                <div class="ep-info-cell"><label>Datum:</label> <span class="value">${new Date().toLocaleDateString('de-DE')}</span></div>
                <div class="ep-info-cell"><label>Kurs:</label> <span class="value">${exam.studentKurs || ''}</span></div>
                <div class="ep-info-cell"><label>Zeit:</label> <span class="value">${exam.time_minutes} Minuten</span></div>
                <div class="ep-info-cell"><label>Punkte:</label> <span class="value">__ / ${exam.total_points}</span></div>
                <div class="ep-info-cell"><label>Note:</label> <span class="value">___</span></div>
            </div>
        </div>`;

        // ═══ FALLBEISPIEL ═══
        if (exam.fallbeispiel) {
            const fall = exam.fallbeispiel;
            html += `
            <div class="ep-fallbeispiel">
                <div class="ep-fallbeispiel-title">${fall.title}</div>
                ${fall.paragraphs.map(p => `<p>${p}</p>`).join('')}
                ${fall.arztbrief && fall.arztbrief.show ? `
                <div class="ep-arztbrief">
                    ${fall.arztbrief.fields.map(f => `
                    <div class="ep-arztbrief-row">
                        <div class="ep-arztbrief-label">${f.label}</div>
                        <div class="ep-arztbrief-value">${f.value}</div>
                    </div>`).join('')}
                </div>` : ''}
            </div>`;
        }

        // ═══ AUFGABEN ═══
        exam.aufgaben.forEach((q, idx) => {
            html += `<div class="ep-aufgabe" id="aufgabe-${idx}">`;
            html += `
            <div class="ep-aufgabe-header">
                <span class="ep-aufgabe-nr">Aufgabe ${q.aufgabe_nr}</span>
                <span class="ep-aufgabe-tag">${q.fallabhaengig ? 'Fallabhängige Frage' : 'Fallunabhängige Frage'}</span>
            </div>`;

            // Render by type
            switch(q.type) {
                case 'richtig_falsch': html += this.renderRichtigFalsch(q, idx); break;
                case 'nennen_liste': html += this.renderNennenListe(q, idx); break;
                case 'freitext_box': html += this.renderFreitext(q, idx); break;
                case 'tabelle_2spalten':
                case 'tabelle_3spalten':
                case 'tabelle_vergleich': html += this.renderTabelle(q, idx); break;
                case 'zuordnung': html += this.renderZuordnung(q, idx); break;
                case 'ergaenzen_liste': html += this.renderErgaenzen(q, idx); break;
                case 'definition_plus_beispiele': html += this.renderDefinition(q, idx); break;
                case 'ankreuzen_begruenden': html += this.renderAnkreuzen(q, idx); break;
                default: html += `<p class="text-red-500">Unbekannter Typ: ${q.type}</p>`;
            }

            html += `
            <div class="ep-points">
                <span class="ep-scoring">${q.scoring_info || ''}</span>
                <div class="ep-points-box">__ / ${q.points} Punkte</div>
            </div>`;
            html += `</div>`;
        });

        container.innerHTML = html;

        // Attach event listeners
        this.attachListeners();
    },

    // ═══ RICHTIG / FALSCH ═══
    renderRichtigFalsch(q, idx) {
        const statements = q.statements || (q.data && q.data.statements) || [{ text: q.statement, answer: q.answer }];
        let html = `<div class="ep-instruction">${this.formatInstruction(q.instruction || 'Entscheiden Sie, welche Aussagen richtig oder falsch sind.')}</div>`;
        html += `<div class="border border-gray-400">`;
        html += `<div class="ep-rf-row" style="background:#e8e8e8;font-family:Inter,sans-serif;font-size:12px;font-weight:700;">
            <div class="ep-rf-statement" style="padding:8px 12px;">Aussage</div>
            <div class="ep-rf-option">richtig</div>
            <div class="ep-rf-option">falsch</div>
        </div>`;
        statements.forEach((s, si) => {
            html += `
            <div class="ep-rf-row">
                <div class="ep-rf-statement">${s.text}</div>
                <div class="ep-rf-option" onclick="ExamRenderer.toggleRF(${idx},${si},'richtig')">
                    <div class="ep-rf-radio" id="rf-${idx}-${si}-r" data-q="${idx}" data-s="${si}" data-val="richtig"></div>
                </div>
                <div class="ep-rf-option" onclick="ExamRenderer.toggleRF(${idx},${si},'falsch')">
                    <div class="ep-rf-radio" id="rf-${idx}-${si}-f" data-q="${idx}" data-s="${si}" data-val="falsch"></div>
                </div>
            </div>`;
        });
        html += `</div>`;
        return html;
    },

    toggleRF(qIdx, sIdx, val) {
        document.getElementById(`rf-${qIdx}-${sIdx}-r`).classList.toggle('selected', val === 'richtig');
        document.getElementById(`rf-${qIdx}-${sIdx}-f`).classList.toggle('selected', val === 'falsch');
    },

    // ═══ NENNEN LISTE ═══
    renderNennenListe(q, idx) {
        let html = `<div class="ep-instruction">${this.formatInstruction(q.instruction)}</div>`;
        const label = q.list_label || q.data?.list_label || '';
        const count = q.count || q.data?.count || 4;
        if (label) html += `<div style="background:#e8e8e8;padding:8px 12px;border:1px solid #999;font-family:Inter,sans-serif;font-size:12px;font-weight:700;margin-bottom:0;">${label}</div>`;
        html += `<div class="border border-gray-400 p-4">`;
        for (let i = 0; i < count; i++) {
            html += `
            <div class="ep-list-item">
                <span class="ep-list-bullet">${i+1}</span>
                <input type="text" class="ep-input" id="nl-${idx}-${i}" placeholder="" data-q="${idx}" data-type="nennen">
            </div>`;
        }
        html += `</div>`;
        return html;
    },

    // ═══ FREITEXT ═══
    renderFreitext(q, idx) {
        const data = q.data || {};
        let html = `<div class="ep-instruction">${this.formatInstruction(q.instruction)}</div>`;
        if (data.box_label) {
            html += `<div style="background:#e8e8e8;padding:8px 12px;border:1px solid #999;font-family:Inter,sans-serif;font-size:12px;font-weight:700;">${data.box_label}</div>`;
        }
        html += `<textarea class="ep-textarea" id="ft-${idx}" rows="${data.min_rows || 5}" data-q="${idx}" data-type="freitext" placeholder="Ihre Antwort..."></textarea>`;
        return html;
    },

    // ═══ TABELLE ═══
    renderTabelle(q, idx) {
        const data = q.data || {};
        const table = data.table;
        if (!table) return '<p>Tabelle fehlt</p>';

        let html = `<div class="ep-instruction">${this.formatInstruction(q.instruction)}</div>`;
        html += `<table class="ep-table">`;
        html += `<thead><tr>${table.headers.map(h => `<th>${h}</th>`).join('')}</tr></thead>`;
        html += `<tbody>`;
        table.rows.forEach((row, ri) => {
            html += `<tr>`;
            row.cells.forEach((cell, ci) => {
                if (cell.type === 'text' || cell.type === 'static') {
                    html += `<td>${cell.content || cell.value || ''}</td>`;
                } else if (cell.type === 'input') {
                    html += `<td><input type="text" class="ep-input" id="tab-${idx}-${ri}-${ci}" data-q="${idx}" data-type="table-cell"></td>`;
                } else if (cell.type === 'textarea') {
                    html += `<td><textarea class="ep-textarea" id="tab-${idx}-${ri}-${ci}" rows="${cell.rows || 2}" data-q="${idx}" data-type="table-cell" style="min-height:50px;"></textarea></td>`;
                }
            });
            html += `</tr>`;
        });
        html += `</tbody></table>`;
        return html;
    },

    // ═══ ZUORDNUNG ═══
    renderZuordnung(q, idx) {
        const data = q.data || {};
        let html = `<div class="ep-instruction">${this.formatInstruction(q.instruction)}</div>`;
        
        // Legend
        html += `<div class="ep-zuordnung-legend">`;
        Object.entries(data.legend).forEach(([key, val]) => {
            html += `<span>${key} = ${val}</span>`;
        });
        html += `</div>`;

        // Statements
        html += `<table class="ep-table"><thead><tr><th style="width:80%">Aussage</th><th style="width:20%">Zuordnung</th></tr></thead><tbody>`;
        data.statements.forEach((s, si) => {
            const options = Object.keys(data.legend);
            html += `<tr>
                <td style="font-size:13px;">${s.text}</td>
                <td style="text-align:center;">
                    <select class="ep-zuordnung-select" id="zu-${idx}-${si}" data-q="${idx}" data-type="zuordnung">
                        <option value="">–</option>
                        ${options.map(o => `<option value="${o}">${o}</option>`).join('')}
                    </select>
                </td>
            </tr>`;
        });
        html += `</tbody></table>`;
        return html;
    },

    // ═══ ERGÄNZEN ═══
    renderErgaenzen(q, idx) {
        const data = q.data || {};
        let html = `<div class="ep-instruction">${this.formatInstruction(q.instruction)}</div>`;
        if (data.list_label) {
            html += `<div style="background:#e8e8e8;padding:8px 12px;border:1px solid #999;font-family:Inter,sans-serif;font-size:12px;font-weight:700;">${data.list_label}</div>`;
        }
        html += `<div class="border border-gray-400 p-4">`;
        // Given items (grayed out)
        data.given_items.forEach(item => {
            html += `<div class="ep-list-item"><span class="ep-list-bullet" style="background:#e8e8e8;">✓</span><span style="color:#888;font-family:Inter,sans-serif;font-size:13px;">${item}</span></div>`;
        });
        // Missing items (input)
        const missingCount = data.missing_items.length;
        for (let i = 0; i < missingCount; i++) {
            html += `<div class="ep-list-item"><span class="ep-list-bullet">?</span><input type="text" class="ep-input" id="erg-${idx}-${i}" data-q="${idx}" data-type="ergaenzen"></div>`;
        }
        html += `</div>`;
        return html;
    },

    // ═══ DEFINITION + BEISPIELE ═══
    renderDefinition(q, idx) {
        const data = q.data || {};
        let html = `<div class="ep-instruction">${this.formatInstruction(q.instruction)}</div>`;
        
        html += `<div style="background:#e8e8e8;padding:8px 12px;border:1px solid #999;font-family:Inter,sans-serif;font-size:12px;font-weight:700;">${data.definition_label || 'Definition'}</div>`;
        html += `<textarea class="ep-textarea" id="def-${idx}-text" rows="4" data-q="${idx}" data-type="definition" placeholder="Definition..."></textarea>`;
        
        if (data.examples_count) {
            html += `<div style="background:#e8e8e8;padding:8px 12px;border:1px solid #999;font-family:Inter,sans-serif;font-size:12px;font-weight:700;margin-top:12px;">${data.examples_label || 'Beispiele'}</div>`;
            html += `<div class="border border-gray-400 p-4">`;
            for (let i = 0; i < data.examples_count; i++) {
                html += `<div class="ep-list-item"><span class="ep-list-bullet">${i+1}</span><input type="text" class="ep-input" id="def-${idx}-ex-${i}" data-q="${idx}" data-type="def-example"></div>`;
            }
            html += `</div>`;
        }
        return html;
    },

    // ═══ ANKREUZEN + BEGRÜNDEN ═══
    renderAnkreuzen(q, idx) {
        const data = q.data || {};
        let html = `<div class="ep-instruction">${this.formatInstruction(q.instruction_select || q.instruction)}</div>`;
        
        html += `<div class="border border-gray-400">`;
        data.options.forEach((opt, oi) => {
            html += `
            <div class="flex items-center gap-3 p-3 border-b border-gray-200 cursor-pointer hover:bg-gray-50" onclick="ExamRenderer.toggleCheckbox(${idx},${oi})">
                <div class="ep-checkbox" id="cb-${idx}-${oi}" data-q="${idx}" data-opt="${oi}"></div>
                <span style="font-family:Inter,sans-serif;font-size:13px;">${opt.label}</span>
            </div>`;
        });
        html += `</div>`;

        // Begründung
        if (data.justify_count) {
            html += `<div class="ep-instruction" style="margin-top:16px;">${this.formatInstruction(q.instruction_justify || '**Begründen** Sie Ihre Entscheidungen.')}</div>`;
            for (let i = 0; i < data.justify_count; i++) {
                html += `<div style="margin-bottom:8px;">
                    <label style="font-family:Inter,sans-serif;font-size:11px;font-weight:700;color:#888;">Begründung ${i+1}:</label>
                    <textarea class="ep-textarea" id="ab-${idx}-just-${i}" rows="3" data-q="${idx}" data-type="justification" style="min-height:60px;"></textarea>
                </div>`;
            }
        }
        return html;
    },

    toggleCheckbox(qIdx, optIdx) {
        const el = document.getElementById(`cb-${qIdx}-${optIdx}`);
        el.classList.toggle('checked');
    },

    // ═══ HELPERS ═══
    formatInstruction(text) {
        if (!text) return '';
        return text.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    },

    attachListeners() {
        // Future: canvas support etc.
    },

    // ═══ COLLECT ANSWERS ═══
    collectAnswers() {
        if (!currentExam) return [];
        return currentExam.aufgaben.map((q, idx) => {
            const answer = { q_id: q.q_id, type: q.type, hasAnswer: false, data: {} };

            switch(q.type) {
                case 'richtig_falsch': {
                    const statements = q.statements || (q.data && q.data.statements) || [{ text: q.statement }];
                    answer.data.responses = statements.map((s, si) => {
                        const rEl = document.getElementById(`rf-${idx}-${si}-r`);
                        const fEl = document.getElementById(`rf-${idx}-${si}-f`);
                        const val = rEl?.classList.contains('selected') ? 'richtig' : fEl?.classList.contains('selected') ? 'falsch' : '';
                        if (val) answer.hasAnswer = true;
                        return val;
                    });
                    break;
                }
                case 'nennen_liste': {
                    const count = q.count || q.data?.count || 4;
                    answer.data.items = [];
                    for (let i = 0; i < count; i++) {
                        const el = document.getElementById(`nl-${idx}-${i}`);
                        const val = el?.value?.trim() || '';
                        answer.data.items.push(val);
                        if (val) answer.hasAnswer = true;
                    }
                    break;
                }
                case 'freitext_box': {
                    const el = document.getElementById(`ft-${idx}`);
                    answer.data.text = el?.value?.trim() || '';
                    if (answer.data.text) answer.hasAnswer = true;
                    break;
                }
                case 'tabelle_2spalten':
                case 'tabelle_3spalten':
                case 'tabelle_vergleich': {
                    const table = q.data?.table;
                    if (!table) break;
                    answer.data.cells = [];
                    table.rows.forEach((row, ri) => {
                        row.cells.forEach((cell, ci) => {
                            if (cell.type === 'input' || cell.type === 'textarea') {
                                const el = document.getElementById(`tab-${idx}-${ri}-${ci}`);
                                const val = el?.value?.trim() || '';
                                answer.data.cells.push({ row: ri, col: ci, value: val });
                                if (val) answer.hasAnswer = true;
                            }
                        });
                    });
                    break;
                }
                case 'zuordnung': {
                    const stmts = q.data?.statements || [];
                    answer.data.selections = stmts.map((s, si) => {
                        const el = document.getElementById(`zu-${idx}-${si}`);
                        const val = el?.value || '';
                        if (val) answer.hasAnswer = true;
                        return val;
                    });
                    break;
                }
                case 'ergaenzen_liste': {
                    const missing = q.data?.missing_items || [];
                    answer.data.items = [];
                    for (let i = 0; i < missing.length; i++) {
                        const el = document.getElementById(`erg-${idx}-${i}`);
                        const val = el?.value?.trim() || '';
                        answer.data.items.push(val);
                        if (val) answer.hasAnswer = true;
                    }
                    break;
                }
                case 'definition_plus_beispiele': {
                    const defEl = document.getElementById(`def-${idx}-text`);
                    answer.data.definition = defEl?.value?.trim() || '';
                    if (answer.data.definition) answer.hasAnswer = true;
                    answer.data.examples = [];
                    const exCount = q.data?.examples_count || 0;
                    for (let i = 0; i < exCount; i++) {
                        const el = document.getElementById(`def-${idx}-ex-${i}`);
                        const val = el?.value?.trim() || '';
                        answer.data.examples.push(val);
                        if (val) answer.hasAnswer = true;
                    }
                    break;
                }
                case 'ankreuzen_begruenden': {
                    const opts = q.data?.options || [];
                    answer.data.checked = opts.map((o, oi) => {
                        const el = document.getElementById(`cb-${idx}-${oi}`);
                        const checked = el?.classList.contains('checked') || false;
                        if (checked) answer.hasAnswer = true;
                        return checked;
                    });
                    answer.data.justifications = [];
                    const jCount = q.data?.justify_count || 0;
                    for (let i = 0; i < jCount; i++) {
                        const el = document.getElementById(`ab-${idx}-just-${i}`);
                        const val = el?.value?.trim() || '';
                        answer.data.justifications.push(val);
                        if (val) answer.hasAnswer = true;
                    }
                    break;
                }
            }
            return answer;
        });
    }
};
