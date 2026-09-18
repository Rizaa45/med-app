/* ════════════════════════════════════════════════════════════════
   V8 EXAM ENGINE — 1:1 Port aus der Next.js-App (exam-engine.ts)
   Modulklausur aus der Fragenbank + Zwischenprüfung (PflAPrV)
   ════════════════════════════════════════════════════════════════ */

// ── Typen-Normalisierung: Exoten → Renderer-Typen ──
const RF_LIKE_TYPES = new Set([
  "medizintechnik_recht", "anatomie_bewegung", "bls_erwachsene",
  "mobilitaet_degeneration", "neurologie", "pflege_anleitung", "stressmanagement",
]);

function normalizeQuestion(q) {
  if (!q) return q;
  if (RF_LIKE_TYPES.has(q.type) && (q.statement || (q.data && q.data.statement))) {
    return Object.assign({}, q, {
      type: "richtig_falsch",
      statement: q.statement || (q.data && q.data.statement),
      answer: q.answer !== undefined ? q.answer : (q.data && q.data.answer),
      explanation: q.explanation || (q.data && q.data.explanation) || "",
    });
  }
  if (q.type === "definition") {
    const d = q.data || {};
    return Object.assign({}, q, {
      type: "freitext_box",
      data: {
        box_label: d.box_label || "Definition und Nennungen",
        correct_answer: `${d.definition || ""} Zu nennen: ${(d.all_valid_answers || []).join("; ")}`,
        keywords: (d.all_valid_answers || []).slice(0, 6),
        min_rows: 5,
      },
    });
  }
  return q;
}

// Punkte für Aufgaben ohne points-Feld: R/F = 1 Punkt pro Aussage
function pointsFor(q) {
  if (q.points) return q.points;
  if (q.type === "richtig_falsch") {
    const stmts = q.statements || (q.data && q.data.statements) || (q.statement ? [q.statement] : []);
    return Math.max(1, stmts.length);
  }
  return 0;
}

function shuffleArr(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
function pickByType(pool, type, count) {
  return shuffleArr(pool.filter((q) => q.type === type)).slice(0, count);
}

// Fallbeispiel-Platzhalter [PATIENT] etc. ersetzen
// Generic-Fallbacks, damit NIE ein roher Platzhalter wie "[PATIENT]"
// auf dem Klausurzettel erscheint — auch nicht bei Fragen ohne Fall.
const GENERIC_FALL_VARS = { PATIENT: "Frau Weber", PFLEGEKRAFT: "Sarah" };
function substituteVariables(obj, variables) {
  const vars = { ...GENERIC_FALL_VARS, ...(variables || {}) };
  const clone = JSON.parse(JSON.stringify(obj));
  const replace = (o) => {
    if (!o) return;
    Object.keys(o).forEach((key) => {
      if (typeof o[key] === "string") {
        Object.entries(vars).forEach(([ph, val]) => {
          o[key] = o[key].replace(new RegExp(`\\[${ph}\\]`, "g"), val);
        });
      } else if (typeof o[key] === "object") {
        replace(o[key]);
      }
    });
  };
  replace(clone);
  return clone;
}

/* ═══ MODULKLAUSUR (Pflicht-Mix des v8-Generators) ═══ */
function generateKlausur(bank, moduleId, studentName, studentKurs) {
  const modMeta = getModule(Number(String(moduleId).replace("mod_", "")));
  const allQuestions = bank.filter((x) => x.q_id || x.id).map(normalizeQuestion).map((q) => ({ ...q, q_id: q.q_id || q.id }));
  const allFalls = bank.filter((x) => x.fall_id);
  const fall = allFalls.length ? allFalls[Math.floor(Math.random() * allFalls.length)] : null;

  allQuestions.forEach((q) => { if (q.fallabhaengig === undefined) q.fallabhaengig = !!q.fallabhaengig; });

  const fallFragen = allQuestions.filter((q) => q.fallabhaengig && q.compatible_falls && fall && q.compatible_falls.includes(fall.fall_id));
  const freiFragen = allQuestions.filter((q) => !q.fallabhaengig);

  const selected = [];
  const usedIds = new Set();
  const addUnique = (questions) => {
    questions.forEach((q) => {
      if (!usedIds.has(q.q_id)) { selected.push(q); usedIds.add(q.q_id); }
    });
  };

  // PFLICHT-Mix (exakt v8): 1 RF, 1 Zuordnung, 2 Nennen, 2 Tabellen,
  // 2 Freitext, 1 Definition, 1 Ergänzen, 1 Ankreuzen, 3–4 fallabhängig
  addUnique(pickByType(freiFragen, "richtig_falsch", 1));
  addUnique(pickByType(freiFragen, "zuordnung", 1));
  addUnique(pickByType(freiFragen, "nennen_liste", 2));
  addUnique(shuffleArr(freiFragen.filter((q) => String(q.type || "").startsWith("tabelle"))).slice(0, 2));
  addUnique(pickByType(freiFragen, "freitext_box", 2));
  addUnique(pickByType(freiFragen, "definition_plus_beispiele", 1));
  addUnique(pickByType(freiFragen, "ergaenzen_liste", 1));
  addUnique(pickByType(freiFragen, "ankreuzen_begruenden", 1));
  if (fallFragen.length > 0) addUnique(shuffleArr(fallFragen).slice(0, Math.min(4, fallFragen.length)));

  // Auffüllen bis 15 Aufgaben
  const remaining = shuffleArr(freiFragen.filter((q) => !usedIds.has(q.q_id)));
  let i = 0;
  while (selected.length < 15 && i < remaining.length) {
    selected.push(remaining[i]);
    usedIds.add(remaining[i].q_id);
    i++;
  }

  // Punkte kappen (Ziel: 65–85 Punkte, min. 14 Aufgaben)
  let totalPoints = selected.reduce((s, q) => s + pointsFor(q), 0);
  while (totalPoints > 85 && selected.length > 14) {
    const removed = selected.pop();
    totalPoints -= pointsFor(removed);
  }

  // Platzhalter ersetzen + Aufgaben nummerieren (v8-Aufgabe-Struktur)
  const substituted = substituteVariables(selected, fall && fall.variables);
  const aufgaben = substituted.map((q, idx) => ({
    id: q.q_id || `q_${idx}`,
    nr: idx + 1,
    type: q.type,
    instruction: q.instruction,
    instructionSelect: q.instruction_select,
    instructionJustify: q.instruction_justify,
    topic: q.topic,
    points: pointsFor(q),
    scoringInfo: q.scoring_info || (q.type === "richtig_falsch" && !q.points ? "1 Punkt pro richtiger Entscheidung" : undefined),
    fallabhaengig: !!q.fallabhaengig,
    payload: q,
  }));

  return {
    id: `klausur_mod_${Number(String(moduleId).replace("mod_", ""))}_${Date.now()}`,
    mode: "klausur",
    title: "Leistungsnachweis",
    subtitle: modMeta ? `Modul ${modMeta.id}: ${modMeta.name}` : `Modul ${moduleId}`,
    studentName,
    studentKurs,
    dateISO: new Date().toISOString(),
    timeMinutes: 90,
    lesezeitMinutes: 0,
    totalPoints,
    fallbeispiel: fall ? { ...fall, arztbrief: fall.arztbrief } : null,
    hinweis: "Alle Aufgaben beziehen sich auf das Fallbeispiel, sofern nicht anders angegeben. Verwenden Sie Fachbegriffe und schreiben Sie in ganzen Sätzen.",
    aufgaben,
    generatedAt: new Date().toISOString(),
  };
}

/* ═══ ZWISCHENPRÜFUNG — Fallback-Bogen (v8 zwpFallback) ═══ */
function zwpFallback() {
  return {
    part1: {
      fallbeispiel: {
        patient: "Herr Karl Zimmermann, 74 Jahre, Diagnosen: Herzinsuffizienz NYHA III, Diabetes mellitus Typ 2, arterielle Hypertonie, Zustand nach Myokardinfarkt (vor 3 Jahren)",
        situation: "Herr Zimmermann wurde heute Morgen über die Notaufnahme stationär aufgenommen. Er klagt über zunehmende Atemnot bei leichter Belastung (Dyspnoe), beidseits ausgeprägte Knöchelödeme bis zur Wade sowie allgemeine Schwäche und Müdigkeit. Bei der Aufnahme: RR 172/96 mmHg, Puls 98/min, AF 24/min, SpO₂ 89% (Raumluft), Temp. 37,1°C, Gewicht 84 kg (Gewichtszunahme von 5 kg in 10 Tagen laut Aussage des Patienten).",
        biografie: "Herr Zimmermann ist Witwer und lebt allein in seiner Eigentumswohnung im 2. Obergeschoss (kein Aufzug). Er hat eine Tochter (45 Jahre), die 60 km entfernt wohnt und berufstätig ist. Früher war er als Schreiner tätig. Er legt großen Wert auf seine Selbstständigkeit. Sein Hobby ist die Gartenarbeit, die er seit dem letzten Winter nicht mehr ausüben konnte.",
        medizin: "Medikamente: Furosemid 40 mg/d, Ramipril 5 mg/d, Metformin 1000 mg/d, ASS 100 mg/d, Bisoprolol 5 mg/d. Pflegegrad: noch nicht beantragt. Bekannte Penicillin-Allergie (Exanthem). Non-Compliance bei der Flüssigkeitsbeschränkung nach eigener Aussage.",
        hauptproblem: "Aufgrund der dekompensierten Herzinsuffizienz mit Ödembildung, Dyspnoe und eingeschränkter Belastbarkeit besteht ein komplexer Pflegebedarf. Besonders kritisch ist die Medikamenten- und Diät-Non-Compliance sowie die soziale Isolation des Patienten.",
      },
      aufgabe1: {
        rf_aussagen: [
          { nr: "1", text: "Das Strukturmodell EinSTEP mit der SIS® bildet den Ausgangspunkt des Pflegeprozesses und erfasst die subjektive Sichtweise des Pflegebedürftigen.", richtig: true },
          { nr: "2", text: "Eine lückenhafte Pflegedokumentation ist für Pflegefachkräfte rechtlich unerheblich, da die Verantwortung beim Arzt liegt.", richtig: false },
          { nr: "3", text: "Aktives Zuhören als Kommunikationstechnik umfasst Verbalisierung, Paraphrasieren und nonverbale Bestätigungssignale.", richtig: true },
          { nr: "4", text: "Einwilligungsfähige Patienten können eine empfohlene Behandlung nur dann ablehnen, wenn ein gesetzlicher Betreuer dieser Ablehnung zustimmt.", richtig: false },
          { nr: "5", text: "Im interprofessionellen Team koordiniert die Pflegefachkraft die pflegerischen Maßnahmen und gibt Informationen an Arzt, Physiotherapeut und Sozialdienst weiter.", richtig: true },
          { nr: "6", text: 'Die WHO-Händehygiene-Richtlinie "My 5 Moments" schreibt die Händedesinfektion u.a. vor und nach jedem Patientenkontakt vor.', richtig: true },
          { nr: "7", text: "Das ethische Prinzip der Non-Malefizienz bedeutet, dem Patienten aktiv Gutes zu tun und sein Wohlergehen zu fördern.", richtig: false },
          { nr: "8", text: "Evidenzbasierte Pflege (EbN) integriert wissenschaftliche Forschungsergebnisse, klinische Expertise und Patientenpräferenzen.", richtig: true },
          { nr: "9", text: "Die Braden-Skala ist ein validiertes Assessmentinstrument zur Einschätzung des Dekubitusrisikos.", richtig: true },
          { nr: "10", text: "Aktivierende Pflege bedeutet, alle pflegerischen Tätigkeiten für den Patienten zu übernehmen, um ihn zu entlasten.", richtig: false },
        ],
      },
      aufgabe2: {
        intro: "Führen Sie eine strukturierte Informationssammlung nach SIS® für Herrn Zimmermann durch.",
        themenbereiche_aufgabe: "a) Nennen Sie fünf der sechs Themenbereiche der SIS® (je 1 P.) und leiten Sie für jeden Bereich ein konkretes Problem aus dem Fall ab (je 1 P.).",
        ressourcen_aufgabe: "b) Benennen Sie drei Ressourcen von Herrn Zimmermann (je 1 P.) und erläutern Sie, warum diese für den Pflegeprozess bedeutsam sind (3 P.).",
        infos_aufgabe: "c) Welche zwei weiteren Informationen möchten Sie zur Gesamteinschätzung erheben (je 1 P.)? Begründen Sie deren Bedeutung für Ihr pflegerisches Handeln (je 1 P.).",
      },
      aufgabe3: {
        intro: "Analysieren Sie den möglichen weiteren Verlauf der Erkrankungen von Herrn Zimmermann.",
        komplikationen_aufgabe: "a) Benennen Sie drei mögliche Komplikationen oder Folgeerkrankungen seiner Herzinsuffizienz und/oder seines Diabetes mellitus (je 1 P.), erläutern Sie deren Ursachen (je 2 P.) und leiten Sie je eine konkrete pflegerische Maßnahme ab (je 2 P.).",
        pflegeplanung_aufgabe: "b) Formulieren Sie zwei SMART-Pflegeziele für Herrn Zimmermann bezogen auf sein Hauptpflegeproblem (je 3 P.). Begründen Sie Ihre Zielformulierung mit dem Pflegeprozess.",
      },
      aufgabe4: {
        intro: "",
        massnahmen: [
          "AEDL-Bereich Atmen: SpO₂-Monitoring (engmaschig, alle 2h), Sauerstoffgabe nach ärztlicher AO, Oberkörperhochlagerung (30–45°), Atemübungen",
          "Körperpflege unter Ressourcenorientierung: nur unterstützen, was Herr Z. nicht selbst kann; Intimsphäre wahren; Hautinspektion Ödem­bereiche",
          "Mobilisation: schrittweise nach Belastbarkeit, Kompressionsstrümpfe, Dekubitusprophylaxe (regelmäßige Lagerungswechsel alle 2h)",
          "Flüssigkeitsbilanzierung: Ein-/Ausfuhr dokumentieren, Tagesgewicht (gleiche Bedingungen), Ödemkontrolle",
          "Medikamentöse Versorgung: Furosemid-Gabe überwachen, Nierenwerte beachten, Elektrolyte, Penicillin-Allergie dokumentieren",
          "Dokumentation: SIS® aktualisieren, Pflegebericht, Vitalzeichendokumentation, Übergabe an Spätdienst (ISBAR)",
        ],
      },
      aufgabe5: {
        mc: [
          { nr: "1", frage: "Welche der folgenden Aussagen zur Pflegediagnostik nach NANDA-I ist korrekt?", optionen: ["A) Pflegediagnosen werden nur vom Arzt gestellt", "B) Pflegediagnosen beschreiben nur körperliche Probleme", "C) Eine Pflegediagnose umfasst Problem, Ätiologie und Symptome (PÄS-Struktur)", "D) NANDA-I-Diagnosen ersetzen die ärztliche Diagnose"], richtig: "C", kb: "I" },
          { nr: "2", frage: "Das Vier-Ohren-Modell nach Schulz von Thun unterscheidet folgende vier Ebenen:", optionen: ["A) Sender, Empfänger, Kanal, Rückmeldung", "B) Sachinhalt, Selbstkundgabe, Beziehung, Appell", "C) Verbal, paraverbal, nonverbal, metaverbal", "D) Kognitiv, emotional, behavioral, sozial"], richtig: "B", kb: "II" },
          { nr: "3", frage: "Welches Assessmentinstrument wird standardmäßig zur Dekubitusrisiko-Einschätzung eingesetzt?", optionen: ["A) Morse Fall Scale", "B) Glasgow Coma Scale", "C) Braden-Skala", "D) Mini-Mental-Status-Test (MMST)"], richtig: "C", kb: "I" },
          { nr: "4", frage: "Was versteht man unter dem ethischen Prinzip der Benefizienz?", optionen: ["A) Schaden vom Patienten abwenden", "B) Dem Patienten Gutes tun und sein Wohlergehen aktiv fördern", "C) Gerechte Ressourcenverteilung zwischen allen Patienten", "D) Die Selbstbestimmung des Patienten in allen Belangen respektieren"], richtig: "B", kb: "IV" },
        ],
      },
    },
    part2: {
      aufgabe6: {
        intro: "Beschreiben Sie, wie Sie das biographische Erstgespräch / die SIS®-Ersterhebung mit Herrn Zimmermann professionell gestalten.",
        teilaufgaben: [
          "a) Nennen Sie vier konkrete Kommunikationstechniken (z.B. aktives Zuhören, offene Fragen, Verbalisierung, Paraphrasieren) und erläutern Sie deren Bedeutung für das Gespräch mit Herrn Zimmermann (je 2 P.).",
          "b) Wie beziehen Sie die Tochter professionell in das Gespräch ein? Berücksichtigen Sie Schweigepflicht (§ 203 StGB) und Patientenautonomie (4 P.).",
          'c) Herr Zimmermann beginnt zu weinen und sagt: "Ich will nicht zum Pflegefall werden." Beschreiben Sie Ihr professionelles Vorgehen (3 P.).',
        ],
      },
      aufgabe7: {
        situation: "Herr Zimmermann klagt über Schmerzen (7/10 auf der NRS) und verweigert die geplante Mobilisation.",
        teilaufgaben: [
          "a) Nennen Sie zwei validierte Schmerzassessment-Instrumente (je 1 P.) und begründen Sie, welches Sie bei Herrn Zimmermann einsetzen würden (2 P.).",
          "b) Welche Maßnahmen ergreifen Sie bei seinen akuten Schmerzen? Nennen Sie mindestens drei konkrete pflegerische und interprofessionelle Schritte mit Begründung (6 P.).",
          "c) Wie begründen Sie Herrn Zimmermann die Notwendigkeit der Mobilisation trotz Schmerzen? Beziehen Sie Komplikationsprophylaxe und sein Recht auf Selbstbestimmung ein (4 P.).",
        ],
      },
      aufgabe8: {
        intro: "Interprofessionelle Zusammenarbeit und Pflegedokumentation",
        teilaufgaben: [
          "a) Nennen Sie drei Berufsgruppen, an die Sie im Verlauf der Versorgung von Herrn Zimmermann Informationen weitergeben oder delegieren (je 1 P.). Beschreiben Sie deren jeweilige Aufgabe (je 1 P.).",
          "b) Beschreiben Sie die Bestandteile einer vollständigen, rechtssicheren Pflegedokumentation nach dem Strukturmodell (SIS®). Nennen Sie mindestens fünf Elemente (5 P.).",
          "c) Erläutern Sie das ISBAR-Schema und wenden Sie es auf eine konkrete Übergabesituation mit Herrn Zimmermann an (4 P.).",
        ],
      },
      aufgabe9: {
        intro: "Ethik und Reflexion der Berufsrolle",
        ethik_situation: 'Herr Zimmermann lehnt eine notwendige Blutentnahme zur Elektrolyt- und Nierenwert-Kontrolle trotz ärztlicher Dringlichkeitsempfehlung ab: "Ich will keine Nadeln mehr." Er ist nach ärztlicher Beurteilung voll einwilligungsfähig.',
        teilaufgaben: [
          "a) Welche vier ethischen Prinzipien nach Beauchamp & Childress sind in dieser Situation berührt? Erläutern Sie jeweils den ethischen Konflikt (je 2 P.).",
          "b) Welche rechtlichen Grundlagen gelten? Nennen Sie mindestens zwei relevante Normen (z.B. Patientenrechtegesetz, §§ 630a ff. BGB, Grundgesetz Art. 2) mit kurzer Erläuterung (4 P.).",
          "c) Beschreiben Sie Ihr professionelles Handeln als Pflegefachkraft Schritt für Schritt. Wie dokumentieren Sie die Situation rechtssicher (6 P.)?",
        ],
      },
    },
  };
}

/* ═══ ZWP-JSON → ExamPaper (v8 buildZwpPaper) ═══ */
function buildZwpPaper(part1, part2, studentName, studentKurs) {
  const fb = zwpFallback();
  const fall = part1?.fallbeispiel || fb.part1.fallbeispiel;
  const a1 = part1?.aufgabe1 || fb.part1.aufgabe1;
  const a2 = part1?.aufgabe2 || fb.part1.aufgabe2;
  const a3 = part1?.aufgabe3 || fb.part1.aufgabe3;
  const a4 = part1?.aufgabe4 || fb.part1.aufgabe4;
  const a5 = part1?.aufgabe5 || fb.part1.aufgabe5;
  const a6 = part2?.aufgabe6 || fb.part2.aufgabe6;
  const a7 = part2?.aufgabe7 || fb.part2.aufgabe7;
  const a8 = part2?.aufgabe8 || fb.part2.aufgabe8;
  const a9 = part2?.aufgabe9 || fb.part2.aufgabe9;

  // R/F-Aussagen mischen — jede Prüfung fühlt sich anders an
  const rfStatements = shuffleArr((a1.rf_aussagen || []).map((s, i) => ({ text: s.text || String(s), richtig: !!s.richtig, nr: s.nr || String(i + 1) })));

  const aufgaben = [
    {
      id: "zwp_a1", nr: 1, type: "zwp_rf",
      title: "Aufgabe 1 — Richtig oder Falsch", kbTag: "KB I · II · III · IV · V", kbBadge: "Pflegewissen",
      instruction: "Kreuzen Sie an, ob die folgenden Aussagen <strong>Richtig (R)</strong> oder <strong>Falsch (F)</strong> sind. Jede richtige Antwort gibt <strong>2 Punkte</strong>. Es gibt keine Minuspunkte für falsche Antworten.",
      points: 20, scoringInfo: "2 Punkte pro richtiger Antwort",
      payload: { statements: rfStatements },
    },
    {
      id: "zwp_a2", nr: 2, type: "zwp_grid",
      title: "Aufgabe 2 — Strukturierte Informationssammlung (SIS®)", kbTag: "KB I · II", kbBadge: "Pflegeprozess",
      instruction: a2.intro || "",
      points: 18,
      payload: {
        subtasks: [
          { letter: "a)", text: a2.themenbereiche_aufgabe || "", points: 10, columns: ["Themenbereich der SIS® (je 1 P.)", "Konkretes Problem aus dem Fall (je 1 P.)"], rows: 5 },
          { letter: "b)", text: a2.ressourcen_aufgabe || "", points: 6, columns: ["Ressource (je 1 P.)", "Bedeutung für den Pflegeprozess (je 1 P.)"], rows: 3 },
          { letter: "c)", text: a2.infos_aufgabe || "", points: 4, columns: ["Benötigte Information (je 1 P.)", "Bedeutung für das pflegerische Handeln (je 1 P.)"], rows: 2 },
        ],
      },
    },
    {
      id: "zwp_a3", nr: 3, type: "zwp_grid",
      title: "Aufgabe 3 — Pflegediagnostik & Pflegeplanung", kbTag: "KB I · V", kbBadge: "Pflegeprozess",
      instruction: a3.intro || "",
      points: 21,
      payload: {
        smartHint: "SMART = Spezifisch · Messbar · Attraktiv/Akzeptiert · Realistisch · Terminiert",
        subtasks: [
          { letter: "a)", text: a3.komplikationen_aufgabe || "", points: 15, columns: ["Mögliche Komplikation (1 P.)", "Ursachen (2 P.)", "Pflegerische Maßnahme (2 P.)"], rows: 3 },
          { letter: "b)", text: a3.pflegeplanung_aufgabe || "", points: 6, columns: ["Pflegeziel 1 (3 P.)", "Pflegeziel 2 (3 P.)"], rows: 1, smart: true },
        ],
      },
    },
    {
      id: "zwp_a4", nr: 4, type: "zwp_list",
      title: "Aufgabe 4 — Pflegerische Versorgung (erste 24 Stunden)", kbTag: "KB I · III · V", kbBadge: "Pflegepraxis",
      instruction: "Beschreiben Sie die pflegerische Versorgung des Patienten in den <strong>ersten 24 Stunden nach Aufnahme</strong>. Erläutern Sie für jeden der folgenden Bereiche konkrete Maßnahmen mit fachlicher Begründung. Beziehen Sie aktuelle Pflegestandards und Leitlinien ein. <em>(je 3 Punkte pro Bereich = 18 Punkte)</em>",
      points: 18,
      payload: { items: (a4.massnahmen || []).map((m) => ({ label: m, points: 3 })) },
    },
    {
      id: "zwp_a5", nr: 5, type: "zwp_mc",
      title: "Aufgabe 5 — Fachwissen Multiple Choice", kbTag: "KB I · II · IV", kbBadge: "Fachwissen",
      instruction: "Kreuzen Sie jeweils die <strong>eine richtige Antwort</strong> an. Jede richtige Antwort gibt <strong>4 Punkte</strong>. Keine Minuspunkte.",
      points: 16,
      payload: {
        questions: (a5.mc || []).map((q, i) => ({
          frage: q.frage || String(q), optionen: q.optionen || [], richtig: q.richtig, kb: q.kb, nr: q.nr || String(i + 1),
        })),
      },
    },
    {
      id: "zwp_a6", nr: 6, type: "zwp_text",
      title: "Aufgabe 6 — Kommunikation & Beratung", kbTag: "KB II", kbBadge: "Kommunikation",
      instruction: a6.intro || "",
      points: 11,
      payload: { subtasks: (a6.teilaufgaben || []).map((t, i) => ({ letter: ["a)", "b)", "c)"][i] || `${i + 1})`, text: t, points: [8, 4, 3][i] || 4, rows: [6, 5, 4][i] || 5 })) },
    },
    {
      id: "zwp_a7", nr: 7, type: "zwp_text",
      title: "Aufgabe 7 — Schmerzmanagement & Mobilisation", kbTag: "KB I · II · III", kbBadge: "Pflegepraxis",
      instruction: "", situation: a7.situation || "Der Patient klagt über Schmerzen und verweigert die Mobilisation.",
      points: 14,
      payload: { subtasks: (a7.teilaufgaben || []).map((t, i) => ({ letter: ["a)", "b)", "c)"][i] || `${i + 1})`, text: t, points: [4, 6, 4][i] || 4, rows: [4, 6, 5][i] || 5 })) },
    },
    {
      id: "zwp_a8", nr: 8, type: "zwp_text",
      title: "Aufgabe 8 — Interprofessionelle Zusammenarbeit & Dokumentation", kbTag: "KB III · IV", kbBadge: "Team & Doku",
      instruction: a8.intro || "",
      points: 15,
      payload: { subtasks: (a8.teilaufgaben || []).map((t, i) => ({ letter: ["a)", "b)", "c)"][i] || `${i + 1})`, text: t, points: [6, 5, 4][i] || 5, rows: [5, 6, 5][i] || 5 })) },
    },
    {
      id: "zwp_a9", nr: 9, type: "zwp_text",
      title: "Aufgabe 9 — Ethik, Recht & Reflexion der Berufsrolle", kbTag: "KB IV · V", kbBadge: "Berufsethos",
      instruction: a9.intro || "", situation: a9.ethik_situation || "Der Patient lehnt eine notwendige Maßnahme ab.",
      points: 17,
      payload: { subtasks: (a9.teilaufgaben || []).map((t, i) => ({ letter: ["a)", "b)", "c)"][i] || `${i + 1})`, text: t, points: [8, 4, 6][i] || 5, rows: [6, 4, 6][i] || 5 })) },
    },
  ];

  const fallbeispiel = {
    fall_id: "zwp_fall",
    title: "Fallbeispiel",
    paragraphs: [
      `<strong>Patient / Patientin:</strong> ${fall.patient}`,
      fall.situation,
      fall.biografie,
    ],
    arztbrief: {
      show: true,
      fields: [
        { label: "Vorerkrankungen / Medikamente", value: fall.medizin },
        { label: "Aktuelles Hauptproblem", value: fall.hauptproblem },
      ],
    },
  };

  return {
    id: `zwp_${Date.now()}`,
    mode: "zwp",
    title: "Schriftliche Zwischenprüfung",
    subtitle: "Pflegefachkraft — Generalistische Ausbildung",
    headerLine: "Schriftliche Zwischenprüfung · Generalistische Pflegeausbildung · Ende 2. Ausbildungsdrittel · § 6 Abs. 5 PflBG · § 7 PflAPrV",
    schoolYearLine: new Date().getFullYear() + "/" + (new Date().getFullYear() + 1),
    studentName,
    studentKurs,
    dateISO: new Date().toISOString(),
    timeMinutes: 130, // 120 Min + 10 Min Lesezeit
    lesezeitMinutes: 10,
    totalPoints: 150,
    fallbeispiel,
    hinweis: "Alle Aufgaben beziehen sich auf das nachfolgende Fallbeispiel, sofern nicht gesondert angegeben. Begründen Sie Ihre Antworten fachlich und schreiben Sie in ganzen Sätzen, wo nicht anders angegeben.",
    aufgaben,
    scoringTable: [
      { nr: "1 — Richtig/Falsch", thema: "Pflege-Grundwissen", kb: "I–V", maxPunkte: 20 },
      { nr: "2 — SIS® / Info-Sammlung", thema: "Pflegeprozess Schritt 1", kb: "I, II", maxPunkte: 18 },
      { nr: "3 — Pflegeplanung", thema: "Komplikationen & Pflegeziele", kb: "I, V", maxPunkte: 21 },
      { nr: "4 — Pflegerische Versorgung", thema: "Maßnahmen 1–24h", kb: "I, III, V", maxPunkte: 18 },
      { nr: "5 — Multiple Choice", thema: "Fachwissen", kb: "I, II, IV", maxPunkte: 16 },
      { nr: "6 — Kommunikation", thema: "Erstgespräch & Beratung", kb: "II", maxPunkte: 11 },
      { nr: "7 — Schmerzmanagement", thema: "Assessment & Mobilisation", kb: "I, II, III", maxPunkte: 14 },
      { nr: "8 — Interprofessionell", thema: "Team & Dokumentation", kb: "III, IV", maxPunkte: 15 },
      { nr: "9 — Ethik & Recht", thema: "Berufsrolle & Reflexion", kb: "IV, V", maxPunkte: 17 },
    ],
    generatedAt: new Date().toISOString(),
  };
}

// Lokale ZWP-Generierung (v8 nutzt KI — statisch: geprüfter Fallback-Bogen,
// mit gemischten R/F-Aussagen für Abwechslung)
function generateZwischenpruefung(studentName, studentKurs, onProgress) {
  return new Promise((resolve) => {
    // Simulierte Generierungsschritte (wie der Ladescreen der v8-App)
    const steps = [
      [10, "Lernmaterialien werden analysiert…", 400],
      [28, "Fallbeispiel wird erstellt…", 500],
      [48, "Aufgaben 1–5 werden generiert…", 550],
      [72, "Aufgaben 6–9 werden generiert…", 550],
      [92, "Prüfungsbogen wird zusammengestellt…", 400],
    ];
    let i = 0;
    const tick = () => {
      if (i < steps.length) {
        onProgress && onProgress(steps[i][0], steps[i][1]);
        i++;
        setTimeout(tick, steps[i - 1][2] || 450);
      } else {
        onProgress && onProgress(100, "Fertig!");
        resolve({ paper: buildZwpPaper(null, null, studentName, studentKurs), usedAI: false });
      }
    };
    tick();
  });
}
