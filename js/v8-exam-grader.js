/* ════════════════════════════════════════════════════════════════
   V8 EXAM GRADER — Port des exam-grader.ts
   Punktebasierte Bewertung pro Aufgabentyp inkl. Keyword-Matching,
   Themen-Scores, KB-Scores (ZWP), Notenbildung.
   Freitext-ZWP-Aufgaben: lokale Heuristik mit Feedback (statt KI).
   ════════════════════════════════════════════════════════════════ */

function matchKeywordX(userText, keyword) {
  if (!userText || !keyword) return false;
  const u = String(userText).toLowerCase().trim();
  const k = String(keyword).toLowerCase().trim();
  if (u.includes(k)) return true;
  if (k.length >= 4 && u.includes(k.substring(0, Math.min(k.length, 5)))) return true;
  return false;
}
function matchAnyKeywordX(userText, keywords) {
  if (!keywords || !Array.isArray(keywords)) return false;
  return keywords.some((k) => matchKeywordX(userText, k));
}

function gradeRF(q, answer) {
  const statements = q.statements || (q.data && q.data.statements) || [{ answer: q.answer }];
  const responses = (answer && answer.responses) || [];
  let pts = 0;
  statements.forEach((s, i) => {
    if (responses[i] && String(responses[i]).toLowerCase().startsWith(String(s.answer).toLowerCase().charAt(0))) pts++;
  });
  return pts;
}

function gradeNennen(q, answer) {
  const validAnswers = q.all_valid_answers || (q.data && q.data.all_valid_answers) || q.correct_answers || (q.data && q.data.correct_answers) || [];
  const items = (answer && answer.items) || [];
  let pts = 0;
  const used = new Set();
  items.forEach((item) => {
    if (!item) return;
    const mi = validAnswers.findIndex((v, vi) => !used.has(vi) && matchKeywordX(item, v));
    if (mi >= 0) { pts++; used.add(mi); }
  });
  return pts;
}

function gradeFreitextLocal(q, answer) {
  const data = q.data || {};
  const keywords = data.keywords || [];
  const text = (answer && answer.text) || "";
  if (!text) return 0;
  let matched = 0;
  keywords.forEach((k) => { if (matchKeywordX(text, k)) matched++; });
  const ratio = keywords.length > 0 ? matched / keywords.length : 0;
  return Math.round(ratio * (q.points || 4));
}

function gradeTabelle(q, answer) {
  const table = q.data && q.data.table;
  if (!table) return 0;
  const cells = (answer && answer.cells) || [];
  let pts = 0;
  table.rows.forEach((row, ri) => {
    row.cells.forEach((cell, ci) => {
      if (cell.type === "input" || cell.type === "textarea") {
        const userCell = cells.find((c) => c.row === ri && c.col === ci);
        const userVal = userCell?.value || "";
        const keywords = cell.keywords || [];
        if (keywords.length > 0 && matchAnyKeywordX(userVal, keywords)) pts++;
      }
    });
  });
  return pts;
}

function gradeZuordnung(q, answer) {
  const stmts = (q.data && q.data.statements) || [];
  const selections = (answer && answer.selections) || [];
  let pts = 0;
  stmts.forEach((s, i) => {
    if (selections[i] && String(selections[i]).toUpperCase() === String(s.answer).toUpperCase()) pts++;
  });
  return pts;
}

function gradeErgaenzen(q, answer) {
  const valid = (q.data && (q.data.all_valid_missing || q.data.missing_items)) || [];
  const items = (answer && answer.items) || [];
  let pts = 0;
  const used = new Set();
  items.forEach((item) => {
    if (!item) return;
    const mi = valid.findIndex((v, vi) => !used.has(vi) && matchKeywordX(item, v));
    if (mi >= 0) { pts++; used.add(mi); }
  });
  return pts;
}

function gradeDefinition(q, answer) {
  const data = q.data || {};
  let pts = 0;
  const defText = (answer && answer.definition) || "";
  const defKeywords = data.definition_keywords || [];
  let defMatched = 0;
  defKeywords.forEach((k) => { if (matchKeywordX(defText, k)) defMatched++; });
  const defRatio = defKeywords.length > 0 ? defMatched / defKeywords.length : 0;
  pts += Math.round(defRatio * (data.definition_points || 3));

  const validExamples = data.all_valid_examples || data.correct_examples || [];
  const userExamples = (answer && answer.examples) || [];
  const used = new Set();
  userExamples.forEach((ex) => {
    if (!ex) return;
    const mi = validExamples.findIndex((v, vi) => !used.has(vi) && matchKeywordX(ex, v));
    if (mi >= 0) { pts += data.points_per_example || 1; used.add(mi); }
  });
  return pts;
}

function gradeAnkreuzen(q, answer) {
  const opts = (q.data && q.data.options) || [];
  const checked = (answer && answer.checked) || [];
  let pts = 0;
  let allCorrect = true;
  opts.forEach((o, i) => { if ((checked[i] || false) !== !!o.correct) allCorrect = false; });
  if (allCorrect) pts += 2;
  const justifications = (answer && answer.justifications) || [];
  justifications.forEach((j) => {
    if (!j) return;
    if (j.length > 20) pts += 2;
    else if (j.length > 5) pts += 1;
  });
  return pts;
}

/* ── ZWP-Grader ── */
function gradeZwpRF(payload, answer) {
  const statements = payload.statements || [];
  const responses = (answer && answer.responses) || [];
  let pts = 0;
  statements.forEach((s, i) => {
    const user = (responses[i] || "").toUpperCase();
    const correct = s.richtig ? "R" : "F";
    if (user === correct) pts += 2;
  });
  return pts;
}

function gradeZwpMC(payload, answer) {
  const questions = payload.questions || [];
  const selections = (answer && answer.selections) || [];
  let pts = 0;
  questions.forEach((q, i) => {
    const user = (selections[i] || "").toUpperCase().trim();
    if (user && user === String(q.richtig).toUpperCase().trim()) pts += 4;
  });
  return pts;
}

/* ── Lokale Heuristik für Text-Aufgaben (ersetzt den KI-Pass) ──
   Bewertet Antwortlänge + Fachbegriff-Dichte und liefert
   konstruktives Feedback pro Teilaufgabe (wie die KI der v8-App). */
const NURSING_TERMS = [
  "pflege", "patient", "maßnahme", "massnahme", "dokumentation", "assessment", "hygiene",
  "vitalzeichen", "pflegeprozess", "sis", "ressource", "problem", "ziel", "evaluation",
  "kommunikation", "einwilligung", "autonomie", "schweigepflicht", "delegation",
  "prophylaxe", "mobilisation", "schmerz", "medikament", "arzt", "team", "übergabe",
  "beobachtung", "monitoring", "sturz", "deku", "exanthem", "isbar", "smart",
  "händedesinfektion", "infektion", "wunde", "verband", "atmung", "sauerstoff",
  "bilanz", "einlauf", "auslauf", "gewicht", "ödem", "oedem", "dyspnoe", "still",
  "recht", "gesetz", "bgb", "ethik", "prinzip", "autonomie", "benefizienz", "malefizienz",
];

function heuristicTextScore(text, possible) {
  const t = String(text || "").trim();
  if (!t) return { earned: 0, ratio: 0, feedback: "Noch nicht bearbeitet — hier lassen sich Punkte holen." };
  const words = t.split(/\s+/).filter(Boolean);
  const len = t.length;
  const termHits = NURSING_TERMS.filter((term) => t.toLowerCase().includes(term)).length;

  // Basis nach Länge, Bonus für Fachsprache
  let ratio;
  if (len < 15) ratio = 0.2;
  else if (len < 60) ratio = 0.45;
  else if (len < 150) ratio = 0.62;
  else if (len < 300) ratio = 0.72;
  else ratio = 0.78;
  ratio += Math.min(0.18, termHits * 0.04); // Fachbegriffe verstärken die Antwort
  ratio = Math.min(ratio, 0.92); // Heuristik vergibt nie volle Punktzahl — das bleibt exakten Antworten (R/F, MC) vorbehalten

  let feedback;
  const pct = Math.min(1, ratio);
  if (pct < 0.35) feedback = "Zu knapp: Nennen Sie konkrete Fachbegriffe und erläutern Sie den Zusammenhang zum Fallbeispiel.";
  else if (pct < 0.55) feedback = "Im Ansatz korrekt — präzisieren Sie mit pflegefachlicher Terminologie und beziehen Sie das Fallbeispiel ein.";
  else if (pct < 0.75) feedback = "Fachlich nachvollziehbar. Eine Begründung mit Standard/Leitlinie würde die Antwort auf das volle Punkteniveau heben.";
  else feedback = "Ausführliche, fachlich fundierte Antwort mit Fallbezug — sehr gut strukturiert.";

  return { earned: Math.round(Math.min(1, ratio) * possible), ratio, feedback };
}

/* ═══ HAUPT-GRADER (v8 gradeExam) ═══ */
function gradeExam(paper, answers, timeUsedSeconds) {
  const taskResults = [];
  const topicScores = {};
  const kbScores = {};
  const typePerf = {};
  let totalEarned = 0;
  let totalPossible = 0;

  paper.aufgaben.forEach((a) => {
    const answer = answers[a.id];
    const maxPts = a.points || 0;
    totalPossible += maxPts;
    let earned = 0;

    switch (a.type) {
      case "richtig_falsch": earned = gradeRF(a.payload, answer); break;
      case "nennen_liste": earned = gradeNennen(a.payload, answer); break;
      case "freitext_box": earned = gradeFreitextLocal(a.payload, answer); break;
      case "tabelle_2spalten":
      case "tabelle_3spalten":
      case "tabelle_4spalten":
      case "tabelle_vergleich": earned = gradeTabelle(a.payload, answer); break;
      case "zuordnung": earned = gradeZuordnung(a.payload, answer); break;
      case "ergaenzen_liste": earned = gradeErgaenzen(a.payload, answer); break;
      case "definition_plus_beispiele": earned = gradeDefinition(a.payload, answer); break;
      case "ankreuzen_begruenden": earned = gradeAnkreuzen(a.payload, answer); break;
      case "zwp_rf": earned = gradeZwpRF(a.payload, answer); break;
      case "zwp_mc": earned = gradeZwpMC(a.payload, answer); break;
      case "zwp_grid": {
        // Teilaufgaben heuristisch bewerten (wie der KI-Pass der v8-App)
        const subtasks = (a.payload && a.payload.subtasks) || [];
        const subAns = (answer && answer.subtasks) || [];
        const subtaskResults = [];
        let sum = 0;
        subtasks.forEach((st, si) => {
          const cells = (subAns[si] || {}).cells || [];
          const filled = cells.filter((c) => c && String(c).trim()).length;
          const total = Math.max(1, cells.length);
          // Kombiniere Füllstand + Fachsprache der gefüllten Zellen
          const joined = cells.join(" ");
          const h = heuristicTextScore(joined, st.points);
          const fillRatio = filled / total;
          const e = Math.round(h.earned * (0.4 + 0.6 * fillRatio));
          const earnedSub = Math.min(st.points, e);
          sum += earnedSub;
          subtaskResults.push({
            fieldId: `${a.id}_${si}`,
            label: `${st.letter} ${String(st.text || "").replace(/\*\*/g, "").slice(0, 70)}${String(st.text || "").length > 70 ? "…" : ""}`,
            earned: earnedSub,
            possible: st.points,
            feedback: h.feedback,
          });
        });
        earned = Math.min(sum, maxPts); // Punktekappung: nie mehr als maxPts pro Aufgabe
        taskResults.push({
          taskId: a.id, aufgabeNr: a.nr, type: a.type, topic: a.topic, title: a.title,
          earned, possible: maxPts, percentage: maxPts > 0 ? Math.round((earned / maxPts) * 100) : 0,
          subtaskResults, aiFeedback: "Lokale Heuristik (Antworttiefe + Fachsprache) — online würde hier die KI bewerten.",
        });
        totalEarned += earned;
        addTo(topicScores, a.topic || (paper.mode === "zwp" ? a.kbTag || "ZWP" : "sonstige"), earned, maxPts);
        if (paper.mode === "zwp" && a.kbTag) addKb(kbScores, a.kbTag, earned, maxPts);
        addToType(typePerf, a.type, earned, maxPts);
        return; // taskResults schon gepusht
      }
      case "zwp_list": {
        const items = (a.payload && a.payload.items) || [];
        const values = (answer && answer.items) || [];
        const subtaskResults = [];
        let sum = 0;
        items.forEach((it, i) => {
          const h = heuristicTextScore(values[i], it.points || 3);
          sum += h.earned;
          subtaskResults.push({ fieldId: `${a.id}_${i}`, label: `Bereich ${i + 1}: ${String(it.label || "").slice(0, 70)}…`, earned: h.earned, possible: it.points || 3, feedback: h.feedback });
        });
        earned = Math.min(sum, maxPts); // Punktekappung: nie mehr als maxPts pro Aufgabe
        taskResults.push({
          taskId: a.id, aufgabeNr: a.nr, type: a.type, topic: a.topic, title: a.title,
          earned, possible: maxPts, percentage: maxPts > 0 ? Math.round((earned / maxPts) * 100) : 0,
          subtaskResults, aiFeedback: "Lokale Heuristik (Antworttiefe + Fachsprache) — online würde hier die KI bewerten.",
        });
        totalEarned += Math.min(earned, maxPts);
        addTo(topicScores, a.topic || a.kbTag || "ZWP", Math.min(earned, maxPts), maxPts);
        if (paper.mode === "zwp" && a.kbTag) addKb(kbScores, a.kbTag, Math.min(earned, maxPts), maxPts);
        addToType(typePerf, a.type, Math.min(earned, maxPts), maxPts);
        return;
      }
      case "zwp_text": {
        const subtasks = (a.payload && a.payload.subtasks) || [];
        const subAns = (answer && answer.subtasks) || [];
        const subtaskResults = [];
        let sum = 0;
        subtasks.forEach((st, si) => {
          const h = heuristicTextScore(subAns[si], st.points);
          sum += h.earned;
          subtaskResults.push({ fieldId: `${a.id}_${si}`, label: st.letter, earned: h.earned, possible: st.points, feedback: h.feedback });
        });
        earned = Math.min(sum, maxPts); // Punktekappung: nie mehr als maxPts pro Aufgabe
        taskResults.push({
          taskId: a.id, aufgabeNr: a.nr, type: a.type, topic: a.topic, title: a.title,
          earned, possible: maxPts, percentage: maxPts > 0 ? Math.round((earned / maxPts) * 100) : 0,
          subtaskResults, aiFeedback: "Lokale Heuristik (Antworttiefe + Fachsprache) — online würde hier die KI bewerten.",
        });
        totalEarned += Math.min(earned, maxPts);
        addTo(topicScores, a.topic || a.kbTag || "ZWP", Math.min(earned, maxPts), maxPts);
        if (paper.mode === "zwp" && a.kbTag) addKb(kbScores, a.kbTag, Math.min(earned, maxPts), maxPts);
        addToType(typePerf, a.type, Math.min(earned, maxPts), maxPts);
        return;
      }
    }

    earned = Math.min(earned, maxPts);
    totalEarned += earned;

    const topic = a.topic || (paper.mode === "zwp" ? a.kbTag || "ZWP" : "sonstige");
    addTo(topicScores, topic, earned, maxPts);
    if (paper.mode === "zwp" && a.kbTag) addKb(kbScores, a.kbTag, earned, maxPts);
    addToType(typePerf, a.type, earned, maxPts);

    taskResults.push({
      taskId: a.id, aufgabeNr: a.nr, type: a.type, topic: a.topic, title: a.title,
      earned, possible: maxPts,
      percentage: maxPts > 0 ? Math.round((earned / maxPts) * 100) : 0,
    });
  });

  const percentage = totalPossible > 0 ? Math.round((totalEarned / totalPossible) * 100) : 0;
  const weakTopics = Object.entries(topicScores)
    .filter(([, s]) => s.possible > 0 && s.earned / s.possible < 0.6)
    .sort((x, y) => x[1].earned / x[1].possible - y[1].earned / y[1].possible)
    .map(([t]) => t);

  // KI-Gesamtfeedback (lokal formuliert, wie das aiSummary der v8-App)
  let aiSummary;
  if (percentage >= 90) aiSummary = "Hervorragende Leistung! Deine Antworten sind strukturiert, fachlich korrekt und eng am Fallbeispiel orientiert. Halte das Niveau mit regelmäßiger Wiederholung — du bist examensreif.";
  else if (percentage >= 70) aiSummary = "Gute Leistung! Du zeichnest dich durch solides Fachwissen aus. Achte künftig auf vollständige Antworten — jedes fehlende Stichwort kostet Punkte. Vertiefe die rot markierten Themen.";
  else if (percentage >= 50) aiSummary = "Bestanden, aber mit Luft nach oben: Die Grundlagen sitzen, bei der Anwendung auf das Fallbeispiel und der Fachterminologie wird es unpräzise. Übe die schwachen Themen im gezielten Training.";
  else aiSummary = "Nicht bestanden — kein Grund zur Panik: Arbeite zunächst die Lerneinheiten der schwachen Module in der Bibliothek durch und schreibe dann die nächste Klausur. Freitext-Fragen bringen die meisten Punkte.";

  return {
    totalEarned, totalPossible, percentage,
    note: gradeFromPercentage(percentage),
    passed: percentage >= 50,
    timeUsedSeconds,
    taskResults, topicScores,
    kbScores: paper.mode === "zwp" ? kbScores : undefined,
    weakTopics, typePerf, aiSummary,
  };
}

function addTo(map, key, earned, possible) {
  if (!map[key]) map[key] = { earned: 0, possible: 0 };
  map[key].earned += earned;
  map[key].possible += possible;
}
function addKb(map, kbTag, earned, possible) {
  const kbs = kbTag.match(/I{1,3}|IV|V/g) || [];
  kbs.forEach((kb) => {
    if (!map[kb]) map[kb] = { earned: 0, possible: 0 };
    map[kb].possible += Math.round(possible / kbs.length);
    map[kb].earned += Math.round(earned / kbs.length);
  });
}
function addToType(map, type, earned, possible) {
  if (!map[type]) map[type] = { earned: 0, possible: 0 };
  map[type].earned += earned;
  map[type].possible += possible;
}
