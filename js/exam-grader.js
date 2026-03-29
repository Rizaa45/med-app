const ExamGrader = {
    grade(exam, answers) {
        let totalEarned = 0;
        let totalPossible = 0;
        const questionResults = [];
        const topicScores = {};

        exam.aufgaben.forEach((q, idx) => {
            const answer = answers[idx];
            const maxPts = q.points || 0;
            totalPossible += maxPts;
            let earned = 0;

            switch(q.type) {
                case 'richtig_falsch': earned = this.gradeRF(q, answer); break;
                case 'nennen_liste': earned = this.gradeNennen(q, answer); break;
                case 'freitext_box': earned = this.gradeFreitext(q, answer); break;
                case 'tabelle_2spalten':
                case 'tabelle_3spalten':
                case 'tabelle_vergleich': earned = this.gradeTabelle(q, answer); break;
                case 'zuordnung': earned = this.gradeZuordnung(q, answer); break;
                case 'ergaenzen_liste': earned = this.gradeErgaenzen(q, answer); break;
                case 'definition_plus_beispiele': earned = this.gradeDefinition(q, answer); break;
                case 'ankreuzen_begruenden': earned = this.gradeAnkreuzen(q, answer); break;
            }

            earned = Math.min(earned, maxPts);
            totalEarned += earned;

            // Topic tracking
            const topic = q.topic || 'sonstige';
            if (!topicScores[topic]) topicScores[topic] = { earned: 0, possible: 0 };
            topicScores[topic].earned += earned;
            topicScores[topic].possible += maxPts;

            questionResults.push({
                aufgabe_nr: q.aufgabe_nr,
                q_id: q.q_id,
                type: q.type,
                topic: topic,
                earned: earned,
                possible: maxPts,
                percentage: maxPts > 0 ? Math.round((earned/maxPts)*100) : 0
            });
        });

        const percentage = totalPossible > 0 ? Math.round((totalEarned/totalPossible)*100) : 0;

        return {
            totalEarned, totalPossible, percentage,
            note: this.getNote(percentage),
            questionResults, topicScores,
            weakTopics: this.getWeakTopics(topicScores)
        };
    },

    // ═══ KEYWORD MATCHING ═══
    matchKeyword(userText, keyword) {
        if (!userText || !keyword) return false;
        const u = userText.toLowerCase().trim();
        const k = keyword.toLowerCase().trim();
        if (u.includes(k)) return true;
        // Fuzzy: first 4+ chars match
        if (k.length >= 4 && u.includes(k.substring(0, Math.min(k.length, 5)))) return true;
        return false;
    },

    matchAnyKeyword(userText, keywords) {
        if (!keywords || !Array.isArray(keywords)) return false;
        return keywords.some(k => this.matchKeyword(userText, k));
    },

    // ═══ GRADERS ═══
    gradeRF(q, answer) {
        const statements = q.statements || (q.data?.statements) || [{ answer: q.answer }];
        const responses = answer?.data?.responses || [];
        let pts = 0;
        statements.forEach((s, i) => {
            if (responses[i] && responses[i] === s.answer) pts++;
        });
        return pts;
    },

    gradeNennen(q, answer) {
        const validAnswers = q.all_valid_answers || q.data?.all_valid_answers || q.correct_answers || q.data?.correct_answers || [];
        const items = answer?.data?.items || [];
        let pts = 0;
        const used = new Set();
        items.forEach(item => {
            if (!item) return;
            const matched = validAnswers.find((v, vi) => !used.has(vi) && this.matchKeyword(item, v));
            if (matched) {
                pts++;
                used.add(validAnswers.indexOf(matched));
            }
        });
        return pts;
    },

    gradeFreitext(q, answer) {
        const data = q.data || {};
        const keywords = data.keywords || [];
        const text = answer?.data?.text || '';
        if (!text) return 0;
        let matched = 0;
        keywords.forEach(k => { if (this.matchKeyword(text, k)) matched++; });
        const ratio = keywords.length > 0 ? matched / keywords.length : 0;
        return Math.round(ratio * (q.points || 4));
    },

    gradeTabelle(q, answer) {
        const table = q.data?.table;
        if (!table) return 0;
        const cells = answer?.data?.cells || [];
        let pts = 0;
        table.rows.forEach((row, ri) => {
            row.cells.forEach((cell, ci) => {
                if (cell.type === 'input' || cell.type === 'textarea') {
                    const userCell = cells.find(c => c.row === ri && c.col === ci);
                    const userVal = userCell?.value || '';
                    const keywords = cell.keywords || [];
                    if (keywords.length > 0 && this.matchAnyKeyword(userVal, keywords)) {
                        pts++;
                    }
                }
            });
        });
        return pts;
    },

    gradeZuordnung(q, answer) {
        const stmts = q.data?.statements || [];
        const selections = answer?.data?.selections || [];
        let pts = 0;
        stmts.forEach((s, i) => {
            if (selections[i] && selections[i].toUpperCase() === s.answer.toUpperCase()) pts++;
        });
        return pts;
    },

    gradeErgaenzen(q, answer) {
        const valid = q.data?.all_valid_missing || q.data?.missing_items || [];
        const items = answer?.data?.items || [];
        let pts = 0;
        const used = new Set();
        items.forEach(item => {
            if (!item) return;
            const matched = valid.find((v, vi) => !used.has(vi) && this.matchKeyword(item, v));
            if (matched) { pts++; used.add(valid.indexOf(matched)); }
        });
        return pts;
    },

    gradeDefinition(q, answer) {
        const data = q.data || {};
        let pts = 0;
        // Grade definition
        const defText = answer?.data?.definition || '';
        const defKeywords = data.definition_keywords || [];
        let defMatched = 0;
        defKeywords.forEach(k => { if (this.matchKeyword(defText, k)) defMatched++; });
        const defRatio = defKeywords.length > 0 ? defMatched / defKeywords.length : 0;
        pts += Math.round(defRatio * (data.definition_points || 3));

        // Grade examples
        const validExamples = data.all_valid_examples || data.correct_examples || [];
        const userExamples = answer?.data?.examples || [];
        const used = new Set();
        userExamples.forEach(ex => {
            if (!ex) return;
            const matched = validExamples.find((v, vi) => !used.has(vi) && this.matchKeyword(ex, v));
            if (matched) { pts += (data.points_per_example || 1); used.add(validExamples.indexOf(matched)); }
        });
        return pts;
    },

    gradeAnkreuzen(q, answer) {
        const opts = q.data?.options || [];
        const checked = answer?.data?.checked || [];
        let pts = 0;
        // Grade checkboxes
        let allCorrect = true;
        opts.forEach((o, i) => {
            if ((checked[i] || false) === o.correct) {
                // correct
            } else {
                allCorrect = false;
            }
        });
        if (allCorrect) pts += 2; // 2 pts for correct selection

        // Grade justifications (keyword-based)
        const justifications = answer?.data?.justifications || [];
        const sampleJust = q.data?.sample_justifications || [];
        justifications.forEach((j, ji) => {
            if (!j) return;
            // Give 2 pts if any text is written (simplified)
            if (j.length > 20) pts += 2;
            else if (j.length > 5) pts += 1;
        });
        return pts;
    },

    // ═══ NOTE ═══
    getNote(pct) {
        if (pct >= 95) return '1.0';
        if (pct >= 90) return '1.3';
        if (pct >= 85) return '1.7';
        if (pct >= 80) return '2.0';
        if (pct >= 75) return '2.3';
        if (pct >= 70) return '2.7';
        if (pct >= 65) return '3.0';
        if (pct >= 60) return '3.3';
        if (pct >= 55) return '3.7';
        if (pct >= 50) return '4.0';
        return '5.0';
    },

    getWeakTopics(topicScores) {
        return Object.entries(topicScores)
            .filter(([t, s]) => s.possible > 0 && (s.earned / s.possible) < 0.6)
            .sort((a, b) => (a[1].earned/a[1].possible) - (b[1].earned/b[1].possible))
            .map(([t]) => t);
    },

    // ═══ RESULTS RENDERER ═══
    renderResults(result, exam, answers, container) {
        const noteColor = parseFloat(result.note) <= 2.0 ? 'text-green-600' :
                           parseFloat(result.note) <= 3.3 ? 'text-yellow-600' : 'text-red-600';
        const noteBg = parseFloat(result.note) <= 2.0 ? 'bg-green-50 border-green-200' :
                        parseFloat(result.note) <= 3.3 ? 'bg-yellow-50 border-yellow-200' : 'bg-red-50 border-red-200';
        const passed = parseFloat(result.note) <= 4.0;

        let html = `
        <div class="text-center mb-8 pt-6 sm:pt-8">
            <div class="text-5xl sm:text-6xl mb-3">${passed ? '🎓' : '📚'}</div>
            <h1 class="text-2xl sm:text-3xl font-black text-slate-800 tracking-tight">Klausur-Ergebnis</h1>
            <p class="text-slate-500 font-medium mt-1 text-sm">${exam.exam_title} · ${new Date().toLocaleDateString('de-DE')}</p>
        </div>

        <!-- Score Cards -->
        <div class="grid grid-cols-3 gap-2 sm:gap-4 mb-6 sm:mb-8">
            <div class="${noteBg} border rounded-2xl p-4 sm:p-6 text-center">
                <div class="text-3xl sm:text-5xl font-black ${noteColor}">${result.note}</div>
                <div class="text-[10px] sm:text-sm font-bold text-slate-500 mt-1">Note</div>
            </div>
            <div class="bg-white border border-slate-200 rounded-2xl p-4 sm:p-6 text-center">
                <div class="text-3xl sm:text-5xl font-black text-indigo-600">${result.percentage}%</div>
                <div class="text-[10px] sm:text-sm font-bold text-slate-500 mt-1">${result.totalEarned}/${result.totalPossible} P.</div>
            </div>
            <div class="bg-white border border-slate-200 rounded-2xl p-4 sm:p-6 text-center">
                <div class="text-3xl sm:text-5xl font-black text-slate-700">${Math.floor(result.timeUsed/60)}<span class="text-lg sm:text-2xl text-slate-400">m</span></div>
                <div class="text-[10px] sm:text-sm font-bold text-slate-500 mt-1">Zeit</div>
            </div>
        </div>`;

        // ═══ TOPIC ANALYSIS ═══
        html += `<div class="bg-white border border-slate-200 rounded-2xl p-5 sm:p-6 mb-6 sm:mb-8">
            <h2 class="text-base sm:text-lg font-black text-slate-800 mb-4 uppercase tracking-tight">
                <i class="fas fa-chart-bar text-indigo-500 mr-2"></i>Themen-Analyse
            </h2>`;

        const sortedTopics = Object.entries(result.topicScores)
            .sort((a, b) => {
                const pa = a[1].possible > 0 ? a[1].earned/a[1].possible : 0;
                const pb = b[1].possible > 0 ? b[1].earned/b[1].possible : 0;
                return pa - pb; // worst first
            });

        sortedTopics.forEach(([topic, scores]) => {
            const pct = scores.possible > 0 ? Math.round((scores.earned/scores.possible)*100) : 0;
            const color = pct >= 70 ? 'bg-green-500' : pct >= 50 ? 'bg-yellow-500' : 'bg-red-500';
            const icon = pct >= 70 ? '✅' : pct >= 50 ? '⚠️' : '❌';
            const label = topic.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
            html += `
            <div class="mb-3">
                <div class="flex justify-between items-center mb-1">
                    <span class="text-xs sm:text-sm font-bold text-slate-700">${icon} ${label}</span>
                    <span class="text-xs sm:text-sm font-bold text-slate-500">${scores.earned}/${scores.possible} (${pct}%)</span>
                </div>
                <div class="w-full bg-slate-100 rounded-full h-2">
                    <div class="${color} h-full rounded-full" style="width:${pct}%"></div>
                </div>
            </div>`;
        });
        html += `</div>`;

        // ═══ WEAKNESS COACHING ═══
        if (result.weakTopics.length > 0) {
            html += `<div class="bg-red-50 border border-red-200 rounded-2xl p-5 sm:p-6 mb-6 sm:mb-8">
                <h2 class="text-base sm:text-lg font-black text-red-800 mb-2">
                    <i class="fas fa-exclamation-triangle mr-2"></i>Schwächen identifiziert
                </h2>
                <p class="text-xs sm:text-sm text-red-700 mb-4">Diese Themen brauchen Nacharbeit. Nutze die Arena im <strong>Weakness Destroyer</strong> Modus:</p>
                <div class="space-y-2 mb-4">
                    ${result.weakTopics.map(t => {
                        const s = result.topicScores[t];
                        const pct = s ? Math.round((s.earned/s.possible)*100) : 0;
                        return `<div class="bg-white/60 rounded-lg p-3 flex items-center justify-between">
                            <div class="flex items-center gap-3">
                                <i class="fas fa-book-open text-red-500"></i>
                                <span class="font-bold text-xs sm:text-sm text-red-900">${t.replace(/_/g, ' ')}</span>
                            </div>
                            <span class="text-xs font-bold text-red-600">${pct}%</span>
                        </div>`;
                    }).join('')}
                </div>
                <a href="arena.html" class="inline-flex items-center gap-2 bg-red-600 hover:bg-red-500 text-white px-5 py-2.5 rounded-xl font-bold text-xs sm:text-sm transition-colors">
                    <i class="fas fa-crosshairs"></i> Schwächen in Arena trainieren
                </a>
            </div>`;
        }

        // ═══ IMPROVEMENT TIPS ═══
        html += `<div class="bg-blue-50 border border-blue-200 rounded-2xl p-5 sm:p-6 mb-6 sm:mb-8">
            <h2 class="text-base sm:text-lg font-black text-blue-800 mb-3">
                <i class="fas fa-lightbulb mr-2"></i>Verbesserungstipps
            </h2>
            <div class="space-y-3 text-xs sm:text-sm text-blue-800">`;

        if (result.percentage < 50) {
            html += `<div class="flex gap-2"><span>📌</span><p>Fokussiere dich zunächst auf die <strong>Grundlagen</strong>. Nutze die Lerninhalte-Zusammenfassungen in den Modulseiten bevor du die nächste Klausur schreibst.</p></div>`;
        }
        if (result.percentage >= 50 && result.percentage < 70) {
            html += `<div class="flex gap-2"><span>📌</span><p>Du hast die Grundlagen verstanden. Arbeite gezielt an den rot markierten Themen. <strong>Freitext-Fragen</strong> bringen die meisten Punkte — übe das Formulieren mit Fachbegriffen.</p></div>`;
        }
        if (result.percentage >= 70 && result.percentage < 90) {
            html += `<div class="flex gap-2"><span>📌</span><p>Gute Leistung! Für die nächste Stufe: Achte auf <strong>vollständige Antworten</strong> bei Tabellen und Definitionen. Jedes fehlende Keyword kostet Punkte.</p></div>`;
        }
        if (result.percentage >= 90) {
            html += `<div class="flex gap-2"><span>🏆</span><p>Hervorragend! Du bist examensreif. Halte das Niveau mit regelmäßigem Arena-Training und versuche weitere Module.</p></div>`;
        }

        // Type-specific tips
        const typePerf = {};
        result.questionResults.forEach(qr => {
            if (!typePerf[qr.type]) typePerf[qr.type] = { earned: 0, possible: 0 };
            typePerf[qr.type].earned += qr.earned;
            typePerf[qr.type].possible += qr.possible;
        });

        Object.entries(typePerf).forEach(([type, s]) => {
            const pct = s.possible > 0 ? Math.round((s.earned/s.possible)*100) : 100;
            if (pct < 50) {
                const typeNames = {
                    'richtig_falsch': 'Richtig/Falsch — Lies genauer, subtile Formulierungen beachten',
                    'nennen_liste': 'Nennen-Listen — Lerne Aufzählungen auswendig (Mnemotechniken)',
                    'freitext_box': 'Freitext — Verwende mehr Fachbegriffe, schreibe strukturiert',
                    'tabelle_2spalten': 'Tabellen — Übe Vergleiche systematisch',
                    'tabelle_3spalten': 'Tabellen — Übe Vergleiche systematisch',
                    'tabelle_vergleich': 'Tabellen — Übe Vergleiche systematisch',
                    'zuordnung': 'Zuordnung — Definitionen und Begriffe verknüpfen',
                    'definition_plus_beispiele': 'Definitionen — Kernbegriffe + konkrete Beispiele parat haben',
                    'ankreuzen_begruenden': 'Ankreuzen + Begründen — Begründungen ausformulieren'
                };
                const tip = typeNames[type] || type;
                html += `<div class="flex gap-2"><span>⚡</span><p><strong>${tip}</strong></p></div>`;
            }
        });

        html += `</div></div>`;

        // ═══ PER-QUESTION DETAIL WITH CORRECT ANSWERS ═══
        html += `<div class="bg-white border border-slate-200 rounded-2xl p-5 sm:p-6 mb-6 sm:mb-8">
            <h2 class="text-base sm:text-lg font-black text-slate-800 mb-4 uppercase tracking-tight">
                <i class="fas fa-list-check text-slate-500 mr-2"></i>Aufgaben-Detail
            </h2>`;

        result.questionResults.forEach((qr, idx) => {
            const q = exam.aufgaben[idx];
            const statusBg = qr.percentage >= 70 ? 'bg-green-50 border-l-green-500' :
                              qr.percentage >= 40 ? 'bg-yellow-50 border-l-yellow-500' : 'bg-red-50 border-l-red-500';
            const statusIcon = qr.percentage >= 70 ? '✅' : qr.percentage >= 40 ? '⚠️' : '❌';

            html += `
            <details class="mb-2 rounded-lg overflow-hidden border border-slate-100">
                <summary class="p-3 sm:p-4 ${statusBg} border-l-4 cursor-pointer hover:bg-opacity-80 transition-colors">
                    <div class="flex justify-between items-center">
                        <span class="font-bold text-xs sm:text-sm">${statusIcon} Aufgabe ${qr.aufgabe_nr}: ${q.type.replace(/_/g, ' ')}</span>
                        <span class="font-black text-xs sm:text-sm">${qr.earned}/${qr.possible}</span>
                    </div>
                    <div class="text-[10px] sm:text-xs text-slate-500 mt-0.5">${(q.topic || '').replace(/_/g, ' ')}</div>
                </summary>
                <div class="p-3 sm:p-4 bg-slate-50 text-xs sm:text-sm text-slate-600 space-y-2">
                    <p class="font-medium">${q.instruction || q.statement || ''}</p>`;

            // Show correct answer based on type
            if (q.type === 'richtig_falsch') {
                const stmts = q.statements || [{ text: q.statement, answer: q.answer }];
                html += `<div class="space-y-1">`;
                stmts.forEach(s => {
                    html += `<div class="flex gap-2"><span class="font-bold text-indigo-600">${s.answer}</span><span>${s.text}</span></div>`;
                });
                html += `</div>`;
            } else if (q.type === 'nennen_liste') {
                const answers = q.correct_answers || q.data?.correct_answers || [];
                html += `<p class="font-bold text-slate-700">Richtige Antworten:</p><ul class="list-disc pl-5 text-emerald-700">`;
                answers.forEach(a => html += `<li>${a}</li>`);
                html += `</ul>`;
            } else if (q.type === 'freitext_box') {
                const ca = q.data?.correct_answer || '';
                const kw = q.data?.keywords || [];
                html += `<p class="font-bold text-slate-700">Erwartete Antwort:</p><p class="text-emerald-700 italic">${ca}</p>`;
                if (kw.length) html += `<p class="text-slate-500 mt-1">Keywords: <span class="font-bold">${kw.join(', ')}</span></p>`;
            } else if (q.type === 'zuordnung') {
                const stmts = q.data?.statements || [];
                html += `<p class="font-bold text-slate-700">Richtige Zuordnung:</p>`;
                stmts.forEach(s => html += `<div>${s.text} → <strong class="text-indigo-600">${s.answer}</strong></div>`);
            } else if (q.type === 'definition_plus_beispiele') {
                const d = q.data || {};
                html += `<p class="font-bold text-slate-700">Definition:</p><p class="text-emerald-700">${d.definition_correct || ''}</p>`;
                const ex = d.correct_examples || [];
                if (ex.length) html += `<p class="font-bold text-slate-700 mt-1">Beispiele:</p><ul class="list-disc pl-5 text-emerald-700">${ex.map(e => `<li>${e}</li>`).join('')}</ul>`;
            }

            if (q.explanation) {
                html += `<div class="mt-2 p-2 bg-blue-50 rounded text-blue-800 text-xs"><i class="fas fa-info-circle mr-1"></i>${q.explanation}</div>`;
            }

            html += `</div></details>`;
        });

        html += `</div>`;

        // ═══ ACTION BUTTONS ═══
        html += `
        <div class="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-16">
            <button onclick="location.reload()" class="bg-indigo-600 hover:bg-indigo-500 text-white py-3 sm:py-4 rounded-xl font-black uppercase tracking-widest text-xs sm:text-sm transition-all">
                <i class="fas fa-redo mr-2"></i> Nochmal
            </button>
            <a href="arena.html" class="bg-violet-600 hover:bg-violet-500 text-white py-3 sm:py-4 rounded-xl font-black uppercase tracking-widest text-xs sm:text-sm transition-all text-center block">
                <i class="fas fa-brain mr-2"></i> Arena
            </a>
            <button onclick="location.href='index.html'" class="bg-slate-200 hover:bg-slate-300 text-slate-700 py-3 sm:py-4 rounded-xl font-black uppercase tracking-widest text-xs sm:text-sm transition-all">
                <i class="fas fa-home mr-2"></i> Dashboard
            </button>
        </div>`;

        container.innerHTML = html;
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }
};
