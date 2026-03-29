const ExamGenerator = {
    generate(bank, moduleId) {
        // Separate questions and cases
        const allQuestions = bank.filter(item => item.q_id);
        const allFalls = bank.filter(item => item.fall_id);

        // Add fallabhaengig:false to questions that don't have it
        allQuestions.forEach(q => {
            if (q.fallabhaengig === undefined) q.fallabhaengig = false;
        });

        // Pick random Fallbeispiel
        const fall = allFalls[Math.floor(Math.random() * allFalls.length)];

        // Separate question pools
        const fallFragen = allQuestions.filter(q =>
            q.fallabhaengig && q.compatible_falls && q.compatible_falls.includes(fall.fall_id)
        );
        const freiFragen = allQuestions.filter(q => !q.fallabhaengig);

        // Shuffle helper
        const shuffle = arr => {
            const a = [...arr];
            for (let i = a.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [a[i], a[j]] = [a[j], a[i]];
            }
            return a;
        };

        // Pick by type helper
        const pickByType = (pool, type, count) => {
            const filtered = pool.filter(q => q.type === type);
            return shuffle(filtered).slice(0, count);
        };

        // Build exam with rules
        let selected = [];
        let usedIds = new Set();

        const addUnique = (questions) => {
            questions.forEach(q => {
                if (!usedIds.has(q.q_id)) {
                    selected.push(q);
                    usedIds.add(q.q_id);
                }
            });
        };

        // MANDATORY: 1 richtig_falsch (5 statements)
        addUnique(pickByType(freiFragen, 'richtig_falsch', 1));

        // MANDATORY: 1 zuordnung
        addUnique(pickByType(freiFragen, 'zuordnung', 1));

        // 2 nennen_liste
        addUnique(pickByType(freiFragen, 'nennen_liste', 2));

        // 2 tabelle (any variant)
        const tabellen = shuffle(freiFragen.filter(q => q.type.startsWith('tabelle')));
        addUnique(tabellen.slice(0, 2));

        // 2 freitext
        addUnique(pickByType(freiFragen, 'freitext_box', 2));

        // 1 definition
        addUnique(pickByType(freiFragen, 'definition_plus_beispiele', 1));

        // 1 ergaenzen
        addUnique(pickByType(freiFragen, 'ergaenzen_liste', 1));

        // 1 ankreuzen_begruenden
        addUnique(pickByType(freiFragen, 'ankreuzen_begruenden', 1));

        // 3-4 fallabhängige (if available)
        if (fallFragen.length > 0) {
            addUnique(shuffle(fallFragen).slice(0, Math.min(4, fallFragen.length)));
        }

        // Fill up to 15-17 with random free questions
        const remaining = shuffle(freiFragen.filter(q => !usedIds.has(q.q_id)));
        let i = 0;
        while (selected.length < 15 && i < remaining.length) {
            selected.push(remaining[i]);
            usedIds.add(remaining[i].q_id);
            i++;
        }

        // Calculate total points
        let totalPoints = 0;
        selected.forEach(q => { totalPoints += (q.points || 0); });

        // Trim if too many points (target: 65-85)
        while (totalPoints > 85 && selected.length > 14) {
            const removed = selected.pop();
            totalPoints -= (removed.points || 0);
        }

        // Number the Aufgaben
        selected.forEach((q, idx) => { q.aufgabe_nr = idx + 1; });

        // Replace placeholders if fall is selected
        if (fall && fall.variables) {
            selected.forEach(q => {
                const replaceInObj = (obj) => {
                    if (!obj) return;
                    Object.keys(obj).forEach(key => {
                        if (typeof obj[key] === 'string') {
                            Object.entries(fall.variables).forEach(([placeholder, value]) => {
                                obj[key] = obj[key].replace(new RegExp(`\\[${placeholder}\\]`, 'g'), value);
                            });
                        } else if (typeof obj[key] === 'object') {
                            replaceInObj(obj[key]);
                        }
                    });
                };
                replaceInObj(q);
            });
        }

        // Recalculate total
        totalPoints = 0;
        selected.forEach(q => { totalPoints += (q.points || 0); });

        return {
            exam_id: `m${moduleId}_gen_${Date.now()}`,
            module_id: moduleId,
            module_title: `Modul ${moduleId}`,
            exam_title: `Leistungsnachweis Modul ${moduleId}`,
            subtitle: this.getSubtitle(moduleId),
            time_minutes: 90,
            total_points: totalPoints,
            fallbeispiel: fall || null,
            aufgaben: selected,
            generated_at: new Date().toISOString()
        };
    },

    getSubtitle(id) {
        const titles = {
            1: 'Kommunikation, Biografiearbeit und Pflegeprozess',
            2: 'Medizinisches Kernwissen',
            3: 'Krankheitslehre',
            4: 'Schwangerschaft, Geburt und Neugeborene',
            5: 'Prä- und postoperative Pflege',
            6: 'Notfall und Reanimation',
            7: 'Ambulante Pflege und chronische Erkrankungen',
            8: 'Innere Medizin, Niere und Herz-Kreislauf',
            9: 'Neurologische Rehabilitation und Schlaganfall'
        };
        return titles[id] || '';
    }
};
