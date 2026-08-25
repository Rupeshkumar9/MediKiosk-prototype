const demoReports = {
  lab: {
    id: "lab",
    title: "CBC & Blood Sugar Report",
    date: "12 Aug 2026",
    type: "Laboratory report",
    findings: "Hb 10.8 g/dL (low); fasting blood glucose 112 mg/dL; serum creatinine 0.9 mg/dL.",
    note: "Demo extraction only. OCR is planned for the final MVP."
  },
  prescription: {
    id: "prescription",
    title: "Previous General Medicine Prescription",
    date: "02 Aug 2026",
    type: "Prescription",
    findings: "History noted: hypertension. Medicines listed: amlodipine 5 mg once daily and pantoprazole 40 mg once daily.",
    note: "Demo extraction only. OCR is planned for the final MVP."
  }
};

const state = {
  view: "welcome",
  language: "English",
  step: 0,
  fileName: "",
  reportId: "prescription",
  summary: null,
  summarySource: "",
  patient: { name: "Ramesh Kumar", age: "58", sex: "Male", patientId: "MK-2026-1042" },
  intake: {
    chiefComplaint: "Chest discomfort and tiredness",
    duration: "Since 2 days",
    severity: "4",
    symptoms: [],
    history: "Hypertension for 5 years",
    medications: "Amlodipine 5 mg once daily",
    allergies: "No known drug allergies",
    lifestyle: "Non-smoker; no alcohol reported"
  }
};

const steps = ["Patient details", "Symptoms", "Health history", "Previous records", "Review & submit"];
const symptomChoices = [
  ["breathlessness", "Breathing difficulty"],
  ["sweating", "Cold sweating"],
  ["fainting", "Fainting / unconsciousness"],
  ["oneSidedWeakness", "Weakness on one side"],
  ["speechDifficulty", "Difficulty speaking"],
  ["fever", "Fever"],
  ["vomiting", "Vomiting"],
  ["none", "None of these"]
];

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>'"]/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" }[char]));
}

function appShell(content) {
  return `<main class="shell"><header class="topbar"><div class="brand"><span class="logo">✚</span> MediKiosk</div><span class="tag">Hackathon prototype</span></header>${content}</main>`;
}

function renderWelcome() {
  document.querySelector("#app").innerHTML = appShell(`
    <section class="card welcome">
      <div class="eyebrow">AI-assisted clinical intake</div>
      <h1>Give doctors the history they need—before consultation.</h1>
      <p>Complete a guided case-taking journey, add a previous record, and send an editable physician-ready draft to the consultation desk.</p>
      <div class="lang-row">
        ${["English", "हिंदी"].map((language) => `<button class="lang ${state.language === language ? "selected" : ""}" data-language="${language}">${language}</button>`).join("")}
      </div>
      <button class="button primary" id="startBtn">Start patient check-in →</button>
      <p class="note">Demo only • No diagnosis or prescription • Doctor review is required</p>
    </section>`);
  document.querySelectorAll("[data-language]").forEach((button) => button.addEventListener("click", () => { state.language = button.dataset.language; renderWelcome(); }));
  document.querySelector("#startBtn").addEventListener("click", () => { state.view = "intake"; renderIntake(); });
}

function navMarkup() {
  return steps.map((step, index) => `<div class="${index === state.step ? "active" : ""}"><span class="step-number">${index + 1}</span>${step}</div>`).join("");
}

function footerMarkup(previousLabel = "Back", nextLabel = "Continue") {
  return `<div class="footer-actions"><button class="button outline" id="backBtn">${previousLabel}</button><button class="button primary" id="nextBtn">${nextLabel} →</button></div>`;
}

function stepContent() {
  const { patient, intake } = state;
  if (state.step === 0) return `<h2>Let’s begin with the basics</h2><p>This creates a temporary intake record for today’s consultation.</p><div class="field-grid"><label>Full name<input id="name" value="${escapeHtml(patient.name)}" /></label><label>Age<input id="age" type="number" min="0" max="120" value="${escapeHtml(patient.age)}" /></label><label>Sex<select id="sex"><option ${patient.sex === "Male" ? "selected" : ""}>Male</option><option ${patient.sex === "Female" ? "selected" : ""}>Female</option><option ${patient.sex === "Other" ? "selected" : ""}>Other</option></select></label><label>Demo patient ID<input id="patientId" value="${escapeHtml(patient.patientId)}" /></label><div class="field full"><label class="check"><input id="consent" type="checkbox" checked />I understand that this tool records information for the doctor to review. I consent to this demo intake.</label></div></div>${footerMarkup("Cancel")}`;
  if (state.step === 1) return `<h2>Tell us about your symptoms</h2><p>Choose the main concern and any symptoms you are experiencing today.</p><div class="field-grid"><label class="field full">What brings you to the hospital today?<textarea id="chiefComplaint">${escapeHtml(intake.chiefComplaint)}</textarea></label><label>When did it start?<input id="duration" value="${escapeHtml(intake.duration)}" /></label><label>How severe is it? <span id="severityValue">${escapeHtml(intake.severity)}/10</span><input id="severity" type="range" min="0" max="10" value="${escapeHtml(intake.severity)}" /></label><div class="field full"><label>Also select any urgent symptoms you have:</label><div class="choice-grid">${symptomChoices.map(([key, text]) => `<button class="choice ${intake.symptoms.includes(key) ? "selected" : ""}" data-symptom="${key}">${text}</button>`).join("")}</div></div></div>${footerMarkup()}`;
  if (state.step === 2) return `<h2>Your health background</h2><p>These details help the doctor avoid repeated questions and spot relevant history.</p><div class="field-grid"><label class="field full">Past illnesses or surgeries<textarea id="history">${escapeHtml(intake.history)}</textarea></label><label>Current medicines<textarea id="medications">${escapeHtml(intake.medications)}</textarea></label><label>Medicine or food allergies<textarea id="allergies">${escapeHtml(intake.allergies)}</textarea></label><label class="field full">Personal history / lifestyle<textarea id="lifestyle">${escapeHtml(intake.lifestyle)}</textarea></label></div>${footerMarkup()}`;
  if (state.step === 3) return `<h2>Add a previous medical record</h2><p>For this prototype, the selected file is paired with pre-prepared demo extraction data. OCR is a final-MVP feature.</p><label>Choose any sample file from your computer<input id="fileInput" type="file" accept=".pdf,.png,.jpg,.jpeg" /></label><p class="note" id="fileName">${state.fileName ? `Selected: ${escapeHtml(state.fileName)}` : "No file selected yet — you may still use a demo record below."}</p><div class="report-options">${Object.values(demoReports).map((report) => `<button class="report ${state.reportId === report.id ? "selected" : ""}" data-report="${report.id}"><div class="file-icon">${report.id === "lab" ? "▤" : "▧"}</div><h3>${report.title}</h3><small>${report.date} · ${report.type}</small></button>`).join("")}</div><div class="demo-banner"><strong>Demo extracted data:</strong> ${escapeHtml(demoReports[state.reportId].findings)}</div>${footerMarkup()}`;
  const triage = getTriage();
  return `<h2>Review before sending to the doctor</h2><p>The doctor will receive an editable draft—not a diagnosis.</p><div class="alert ${triage.level}"><strong>${triage.title}</strong><br>${triage.text}</div><div class="field-grid"><div class="patient-card"><h3>${escapeHtml(patient.name)}</h3><dl><dt>Patient ID</dt><dd>${escapeHtml(patient.patientId)}</dd><dt>Chief concern</dt><dd>${escapeHtml(intake.chiefComplaint)}</dd><dt>Previous record</dt><dd>${escapeHtml(demoReports[state.reportId].title)}</dd></dl></div><div class="patient-card"><h3>What will be sent</h3><p>Patient answers, selected demo-document findings, and an AI-generated structured draft for physician review.</p><span class="status ai">✦ AI summary is requested next</span></div></div>${footerMarkup("Back", "Generate & send to doctor")}`;
}

function renderIntake() {
  document.querySelector("#app").innerHTML = appShell(`<div class="progress">${steps.map((_, index) => `<span class="${index <= state.step ? "active" : ""}"></span>`).join("")}</div><section class="card intake-grid"><aside class="side"><div class="eyebrow">${state.language}</div><h3>Patient intake</h3><div class="step-nav">${navMarkup()}</div></aside><section class="content">${stepContent()}</section></section>`);
  bindStepEvents();
}

function readInputs() {
  const value = (id) => document.querySelector(`#${id}`)?.value?.trim();
  if (state.step === 0) Object.assign(state.patient, { name: value("name"), age: value("age"), sex: value("sex"), patientId: value("patientId") });
  if (state.step === 1) Object.assign(state.intake, { chiefComplaint: value("chiefComplaint"), duration: value("duration"), severity: value("severity") });
  if (state.step === 2) Object.assign(state.intake, { history: value("history"), medications: value("medications"), allergies: value("allergies"), lifestyle: value("lifestyle") });
}

function bindStepEvents() {
  document.querySelector("#backBtn")?.addEventListener("click", () => { if (state.step === 0) { state.view = "welcome"; renderWelcome(); } else { state.step -= 1; renderIntake(); } });
  document.querySelector("#nextBtn")?.addEventListener("click", async () => {
    readInputs();
    if (state.step === 0 && !document.querySelector("#consent").checked) return toast("Consent is required to continue the demo intake.");
    if (state.step < steps.length - 1) { state.step += 1; renderIntake(); } else { await createSummary(); }
  });
  document.querySelector("#severity")?.addEventListener("input", (event) => { document.querySelector("#severityValue").textContent = `${event.target.value}/10`; });
  document.querySelectorAll("[data-symptom]").forEach((button) => button.addEventListener("click", () => {
    const symptom = button.dataset.symptom;
    if (symptom === "none") state.intake.symptoms = state.intake.symptoms.includes("none") ? [] : ["none"];
    else { state.intake.symptoms = state.intake.symptoms.filter((item) => item !== "none"); state.intake.symptoms = state.intake.symptoms.includes(symptom) ? state.intake.symptoms.filter((item) => item !== symptom) : [...state.intake.symptoms, symptom]; }
    renderIntake();
  }));
  document.querySelectorAll("[data-report]").forEach((button) => button.addEventListener("click", () => { state.reportId = button.dataset.report; renderIntake(); }));
  document.querySelector("#fileInput")?.addEventListener("change", (event) => { state.fileName = event.target.files?.[0]?.name || ""; document.querySelector("#fileName").textContent = state.fileName ? `Selected: ${state.fileName}` : "No file selected yet — you may still use a demo record below."; });
}

function getTriage() {
  const symptoms = state.intake.symptoms;
  const complaint = state.intake.chiefComplaint.toLowerCase();
  const severeChest = (complaint.includes("chest") || complaint.includes("heart")) && (Number(state.intake.severity) >= 7 || symptoms.includes("breathlessness") || symptoms.includes("sweating"));
  const neuro = symptoms.includes("oneSidedWeakness") || symptoms.includes("speechDifficulty") || symptoms.includes("fainting");
  if (severeChest || neuro) return { level: "high", title: "Priority triage recommended", text: "Potential red-flag symptoms were selected. This demonstration would alert triage staff; it does not make a diagnosis." };
  return { level: "normal", title: "Routine clinical review", text: "No predefined red-flag combination was selected. A clinician must still assess the patient." };
}

function fallbackSummary() {
  const { intake } = state;
  const report = demoReports[state.reportId];
  const triage = getTriage();
  return {
    chiefComplaint: intake.chiefComplaint || "Not reported",
    historyOfPresentIllness: `Started ${intake.duration || "at an unspecified time"}; reported severity ${intake.severity || "Not reported"}/10. Associated symptoms: ${intake.symptoms.length ? intake.symptoms.filter((item) => item !== "none").join(", ") || "None reported" : "Not reported"}.`,
    relevantHistory: `${intake.history || "Not reported"}. Personal history: ${intake.lifestyle || "Not reported"}.`,
    medicationsAndAllergies: `Medicines: ${intake.medications || "Not reported"}. Allergies: ${intake.allergies || "Not reported"}.`,
    previousRecords: `${report.title} (${report.date}): ${report.findings}`,
    triageNote: triage.title + ". " + triage.text,
    clinicianNote: "Draft compiled from patient-entered information and demo record data. Review, verify, edit, and clinically assess before acting."
  };
}

async function createSummary() {
  const button = document.querySelector("#nextBtn");
  button.disabled = true; button.textContent = "Creating summary…";
  const payload = { patient: state.patient, intake: state.intake, selectedRecord: demoReports[state.reportId], triage: getTriage() };
  try {
    const response = await fetch("/api/summary", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
    const result = await response.json();
    state.summary = result.summary || fallbackSummary();
    state.summarySource = result.source === "ollama" ? "ollama" : "fallback";
    if (state.summarySource === "fallback") toast("Ollama was unavailable, so a safe template summary was shown.");
  } catch {
    state.summary = fallbackSummary(); state.summarySource = "fallback"; toast("Could not reach the local server. A safe template summary was shown.");
  }
  state.view = "doctor"; renderDoctor();
}

function renderDoctor() {
  const summary = state.summary || fallbackSummary();
  const patient = state.patient;
  const report = demoReports[state.reportId];
  const triage = getTriage();
  const sourceText = state.summarySource === "ollama" ? "✦ AI draft generated locally with Ollama" : "◌ Safe template fallback — Ollama unavailable";
  document.querySelector("#app").innerHTML = appShell(`<section class="summary-layout"><section><div class="card content"><div class="eyebrow">Consultation desk</div><h2>Physician review summary</h2><p><span class="status ${state.summarySource === "ollama" ? "ai" : "fallback"}">${sourceText}</span></p><div class="alert ${triage.level}"><strong>${triage.title}</strong><br>${triage.text}</div>${summaryField("chiefComplaint", "Chief complaint", summary.chiefComplaint)}${summaryField("historyOfPresentIllness", "History of present illness", summary.historyOfPresentIllness)}${summaryField("relevantHistory", "Past / personal history", summary.relevantHistory)}${summaryField("medicationsAndAllergies", "Medicines & allergies", summary.medicationsAndAllergies)}${summaryField("previousRecords", "Previous-record highlights", summary.previousRecords)}${summaryField("clinicianNote", "Safety and clinician note", summary.clinicianNote)}<div class="button-row"><button class="button primary" id="confirmBtn">Confirm & save consultation draft</button><button class="button outline" id="restartBtn">Start another demo</button></div></div></section><aside><section class="card patient-card"><div class="eyebrow">Today’s patient</div><h2>${escapeHtml(patient.name)}</h2><dl><dt>Patient ID</dt><dd>${escapeHtml(patient.patientId)}</dd><dt>Age / Sex</dt><dd>${escapeHtml(patient.age)} years / ${escapeHtml(patient.sex)}</dd><dt>Language</dt><dd>${escapeHtml(state.language)}</dd><dt>Consent</dt><dd>Captured for demo</dd></dl></section><section class="timeline"><h3>Record timeline</h3><div class="timeline-item"><strong>${escapeHtml(report.date)}</strong>${escapeHtml(report.title)}<br><small>${escapeHtml(report.findings)}</small></div><div class="timeline-item"><strong>Today</strong>Guided patient intake completed</div><div class="timeline-item"><strong>Next</strong>Doctor reviews and confirms the draft</div></section></aside></section>`);
  document.querySelector("#confirmBtn").addEventListener("click", () => toast("Demo complete: the physician-reviewed draft is marked as saved."));
  document.querySelector("#restartBtn").addEventListener("click", () => { state.view = "welcome"; state.step = 0; state.summary = null; renderWelcome(); });
}

function summaryField(key, label, value) { return `<section class="summary-section"><h3>${label}</h3><textarea data-summary="${key}">${escapeHtml(value)}</textarea></section>`; }
function toast(message) { const old = document.querySelector(".toast"); old?.remove(); const node = document.createElement("div"); node.className = "toast"; node.textContent = message; document.body.append(node); setTimeout(() => node.remove(), 4200); }

renderWelcome();
