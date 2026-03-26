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
        const noteColor = parseFloat(result.note) <= 2.0 ? 'text-green-600' : parseFloat(result.note) <= 3.3 ? 'text-yellow-600' : 'text-red-600';
        const noteBg = parseFloat(result.note) <= 2.0 ? 'bg-green-50 border-green-200' : parseFloat(result.note) <= 3.3 ? 'bg-yellow-50 border-yellow-200' : 'bg-red-50 border-red-200';

        let html = `
        <div class="text-center mb-8 pt-8">
            <h1 class="text-3xl font-black text-slate-800 tracking-tight">Klausur-Ergebnis</h1>
            <p class="text-slate-500 font-medium mt-1">${exam.exam_title} • ${new Date().toLocaleDateString('de-DE')}</p>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
            <div class="${noteBg} border rounded-2xl p-6 text-center">
                <div class="text-5xl font-black ${noteColor}">${result.note}</div>
                <div class="text-sm font-bold text-slate-500 mt-1">Note</div>
            </div>
            <div class="bg-white border border-slate-200 rounded-2xl p-6 text-center">
                <div class="text-5xl font-black text-indigo-600">${result.percentage}%</div>
                <div class="text-sm font-bold text-slate-500 mt-1">${result.totalEarned} / ${result.totalPossible} Punkte</div>
            </div>
            <div class="bg-white border border-slate-200 rounded-2xl p-6 text-center">
                <div class="text-5xl font-black text-slate-700">${Math.floor(result.timeUsed/60)}:${(result.timeUsed%60).toString().padStart(2,'0')}</div>
                <div class="text-sm font-bold text-slate-500 mt-1">Bearbeitungszeit</div>
            </div>
        </div>`;

        // Topic breakdown
        html += `<div class="bg-white border border-slate-200 rounded-2xl p-6 mb-8">
            <h2 class="text-lg font-black text-slate-800 mb-4 uppercase tracking-tight">Themen-Analyse</h2>`;
        Object.entries(result.topicScores).forEach(([topic, scores]) => {
            const pct = scores.possible > 0 ? Math.round((scores.earned/scores.possible)*100) : 0;
            const color = pct >= 70 ? 'bg-green-500' : pct >= 50 ? 'bg-yellow-500' : 'bg-red-500';
            const icon = pct >= 70 ? '✅' : pct >= 50 ? '⚠️' : '❌';
            html += `
            <div class="mb-3">
                <div class="flex justify-between items-center mb-1">
                    <span class="text-sm font-bold text-slate-700">${icon} ${topic.replace(/_/g, ' ')}</span>
                    <span class="text-sm font-bold text-slate-500">${scores.earned}/${scores.possible} (${pct}%)</span>
                </div>
                <div class="w-full bg-slate-100 rounded-full h-2">
                    <div class="${color} h-full rounded-full transition-all" style="width:${pct}%"></div>
                </div>
            </div>`;
        });
        html += `</div>`;

        // Weak topics coaching
        if (result.weakTopics.length > 0) {
            html += `<div class="bg-red-50 border border-red-200 rounded-2xl p-6 mb-8">
                <h2 class="text-lg font-black text-red-800 mb-2"><i class="fas fa-exclamation-triangle mr-2"></i>Schwächen identifiziert</h2>
                <p class="text-sm text-red-700 mb-4">Diese Themen solltest du nochmal wiederholen:</p>
                <div class="space-y-2">
                ${result.weakTopics.map(t => `<div class="bg-white/60 rounded-lg p-3 flex items-center gap-3">
                    <i class="fas fa-book-open text-red-500"></i>
                    <span class="font-bold text-sm text-red-900">${t.replace(/_/g, ' ')}</span>
                </div>`).join('')}
                </div>
            </div>`;
        }

        // Per-question results
        html += `<div class="bg-white border border-slate-200 rounded-2xl p-6 mb-8">
            <h2 class="text-lg font-black text-slate-800 mb-4 uppercase tracking-tight">Aufgaben-Detail</h2>`;
        result.questionResults.forEach((qr, idx) => {
            const q = exam.aufgaben[idx];
            const statusClass = qr.percentage >= 70 ? 'result-correct' : qr.percentage >= 40 ? 'result-partial' : 'result-wrong';
            const statusIcon = qr.percentage >= 70 ? '✅' : qr.percentage >= 40 ? '⚠️' : '❌';
            
            html += `
            <div class="p-4 rounded-lg mb-2 ${statusClass}">
                <div class="flex justify-between items-center">
                    <span class="font-bold text-sm">${statusIcon} Aufgabe ${qr.aufgabe_nr}: ${q.type.replace(/_/g, ' ')}</span>
                    <span class="font-black text-sm">${qr.earned}/${qr.possible} Punkte</span>
                </div>
                <div class="text-xs text-slate-500 mt-1">${q.topic?.replace(/_/g, ' ') || ''}</div>
            </div>`;
        });
        html += `</div>`;

        // Actions
        html += `
        <div class="flex gap-4 mb-16">
            <button onclick="location.reload()" class="flex-1 bg-indigo-600 hover:bg-indigo-500 text-white py-4 rounded-xl font-black uppercase tracking-widest text-sm transition-all">
                <i class="fas fa-redo mr-2"></i> Neue Klausur
            </button>
            <button onclick="location.href='index.html'" class="flex-1 bg-slate-200 hover:bg-slate-300 text-slate-700 py-4 rounded-xl font-black uppercase tracking-widest text-sm transition-all">
                <i class="fas fa-home mr-2"></i> Dashboard
            </button>
        </div>`;

        container.innerHTML = html;
    }
};
