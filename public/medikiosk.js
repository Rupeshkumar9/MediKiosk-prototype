const reports = {
  lab: {
    title: "CBC and Blood Sugar Report",
    date: "12 Aug 2026",
    findings: "Hb 10.8 g/dL (low); fasting blood glucose 112 mg/dL.",
  },
  prescription: {
    title: "Previous General Medicine Prescription",
    date: "02 Aug 2026",
    findings:
      "History: hypertension. Medicines: amlodipine 5 mg once daily and pantoprazole 40 mg once daily.",
  },
};
const hi = {
  start: "मरीज़ चेक-इन शुरू करें",
  welcome: "परामर्श से पहले डॉक्टरों को आवश्यक जानकारी दें।",
  details: "मरीज़ विवरण",
  symptoms: "लक्षण",
  records: "पुराने रिकॉर्ड",
  review: "समीक्षा और जमा करें",
  doctor: "अपना डॉक्टर चुनें",
  continue: "आगे बढ़ें",
  back: "पीछे",
  send: "डॉक्टर को भेजें",
  under: "आपका आवेदन समीक्षा में है",
  approved: "आपका आवेदन स्वीकृत हो गया है",
  refresh: "स्थिति ताज़ा करें",
  portal: "डॉक्टर पोर्टल",
  login: "डॉक्टर साइन इन",
  signIn: "साइन इन",
  applications: "वर्तमान आवेदन",
  approve: "स्वीकृत करें और अपॉइंटमेंट दें",
};
const S = {
  lang: "English",
  view: "welcome",
  step: 0,
  doctors: [],
  doctorId: "",
  report: "prescription",
  file: "",
  app: JSON.parse(localStorage.getItem("medikiosk-application") || "null"),
  session: JSON.parse(sessionStorage.getItem("medikiosk-doctor") || "null"),
  patient: {
    name: "Ramesh Kumar",
    age: "58",
    sex: "Male",
    patientId: "MK-2026-1042",
  },
  intake: {
    chiefComplaint: "Chest discomfort and tiredness",
    duration: "Since 2 days",
    severity: "4",
    symptoms: [],
    history: "Hypertension for 5 years",
    medications: "Amlodipine 5 mg once daily",
    allergies: "No known drug allergies",
    lifestyle: "Non-smoker; no alcohol reported",
  },
};
const H = (x) =>
  String(x ?? "").replace(
    /[&<>'"]/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" })[
        c
      ],
  );
const tx = (en, key) => (S.lang === "हिंदी" && hi[key] ? hi[key] : en);
const api = async (url, opt = {}) => {
  const r = await fetch(url, opt),
    d = await r.json().catch(() => ({}));
  if (!r.ok) throw Error(d.error || "Request failed.");
  return d;
};
function shell(body) {
  document.documentElement.lang = S.lang === "हिंदी" ? "hi" : "en";
  app.innerHTML = `<main class="shell"><header class="topbar"><button class="brand brand-button" id="home" aria-label="MediKiosk home"><span class="logo" aria-hidden="true">+</span>MediKiosk</button><button class="text-link" id="portal">${tx("Doctor portal", "portal")}</button></header>${body}</main>`;
  home.onclick = () => {
    S.view = "welcome";
    render();
  };
  portal.onclick = () => {
    S.view = "login";
    render();
  };
}
function toast(m) {
  document.querySelector(".toast")?.remove();
  const n = document.createElement("div");
  n.className = "toast";
  n.setAttribute("role", "status");
  n.textContent = m;
  document.body.append(n);
  setTimeout(() => n.remove(), 5000);
}
function flag() {
  const i = S.intake,
    urgent = i.symptoms.some((x) =>
      ["oneSidedWeakness", "speechDifficulty", "fainting"].includes(x),
    );
  const chest =
    /chest|heart/i.test(i.chiefComplaint) &&
    (i.severity >= 7 ||
      i.symptoms.includes("breathlessness") ||
      i.symptoms.includes("sweating"));
  return urgent || chest
    ? [
        "high",
        "Priority triage recommended",
        "Potential red-flag symptoms were selected. This demonstration alerts triage staff; it does not diagnose.",
      ]
    : [
        "normal",
        "Routine clinical review",
        "A clinician must still assess the patient.",
      ];
}
async function doctors() {
  try {
    S.doctors = (await api("/api/doctors")).doctors;
    S.doctorId ||= S.doctors[0]?.id;
  } catch (e) {
    toast(e.message);
  }
}
function render() {
  if (S.view === "intake") return intake();
  if (S.view === "status") return status();
  if (S.view === "login") return login();
  if (S.view === "dashboard") return dashboard();
  welcome();
}
function welcome() {
  const hasApplication = Boolean(S.app?.id);
  shell(
    `<section class="card welcome"><div class="eyebrow">${S.lang === "हिंदी" ? "एआई-सहायित क्लिनिकल इंटेक" : "AI-assisted clinical intake"}</div><h1>${tx("Give doctors the history they need before consultation.", "welcome")}</h1><p>${S.lang === "हिंदी" ? "निर्देशित इंटेक पूरा करें, उपलब्ध डॉक्टर चुनें और डॉक्टर की समीक्षा के लिए सारांश भेजें।" : "Complete a guided intake, select an available doctor, add a record, and send a physician-ready draft for review."}</p><div class="lang-row"><button class="lang ${S.lang === "English" ? "selected" : ""}" data-lang="English">English</button><button class="lang ${S.lang === "हिंदी" ? "selected" : ""}" data-lang="हिंदी" lang="hi">हिंदी</button></div><button class="button primary" id="primaryAction">${hasApplication ? tx("Check application status", "स्थिति देखें") : tx("Start patient check-in", "start")} &rarr;</button>${hasApplication ? `<button class="button outline" id="newApplication">${tx("Start a new application", "नया आवेदन शुरू करें")}</button>` : ""}<p class="note">${S.lang === "हिंदी" ? "केवल डेमो। डॉक्टर की समीक्षा आवश्यक है।" : "Demo only. No diagnosis or prescription. Doctor review is required."}</p></section>`,
  );
  document.querySelectorAll("[data-lang]").forEach(
    (b) =>
      (b.onclick = () => {
        S.lang = b.dataset.lang;
        welcome();
      }),
  );
  primaryAction.onclick = async () => {
    if (hasApplication) {
      S.view = "status";
      return render();
    }
    await doctors();
    S.view = "intake";
    render();
  };
  newApplication?.addEventListener("click", () => {
    S.app = null;
    localStorage.removeItem("medikiosk-application");
    S.step = 0;
    render();
  });
}
const nav = () =>
  ["details", "symptoms", "records", "review"]
    .map(
      (x, n) =>
        `<div class="${n === S.step ? "active" : ""}"><span class="step-number">${n + 1}</span>${tx(["Patient details", "Symptoms", "Previous records", "Review and submit"][n], x)}</div>`,
    )
    .join("");
const footer = (back = "Back", next = "Continue") =>
  `<div class="footer-actions"><button class="button outline" id="back">${tx(back, "back")}</button><button class="button primary" id="next">${tx(next, next === "Generate & send to doctor" ? "send" : "continue")} &rarr;</button></div>`;
function form() {
  const p = S.patient,
    i = S.intake;
  if (S.step === 0)
    return `<h2>${tx("Let's begin with the basics", "details")}</h2><p>This creates a temporary intake record for today's consultation.</p><div class="field-grid"><label>Full name<input id="name" value="${H(p.name)}"></label><label>Age<input id="age" type="number" value="${H(p.age)}"></label><label>Sex<select id="sex"><option ${p.sex === "Male" ? "selected" : ""}>Male</option><option ${p.sex === "Female" ? "selected" : ""}>Female</option><option ${p.sex === "Other" ? "selected" : ""}>Other</option></select></label><label>Demo patient ID<input id="pid" value="${H(p.patientId)}"></label><fieldset class="field full"><legend>${tx("Choose your doctor", "doctor")}</legend><p>${S.lang === "हिंदी" ? "वह चिकित्सक चुनें जो इस आवेदन की समीक्षा करेगा।" : "Select the clinician who will review this application."}</p><div class="doctor-grid">${S.doctors.map((d) => `<button class="doctor-option ${S.doctorId === d.id ? "selected" : ""}" data-doc="${d.id}" aria-pressed="${S.doctorId === d.id}"><strong>${H(d.name)}</strong><span>${H(d.specialty)}</span><small>${H(d.clinic)}</small></button>`).join("")}</div></fieldset><label class="check field full"><input id="consent" type="checkbox" checked>I consent to this demo intake being recorded for doctor review.</label></div>${footer("Cancel")}`;
  if (S.step === 1) {
    const choices = [
      ["breathlessness", "Breathing difficulty", "सांस लेने में कठिनाई"],
      ["sweating", "Cold sweating", "ठंडा पसीना"],
      ["fainting", "Fainting / unconsciousness", "बेहोशी"],
      ["oneSidedWeakness", "Weakness on one side", "एक तरफ कमजोरी"],
      ["speechDifficulty", "Difficulty speaking", "बोलने में कठिनाई"],
      ["fever", "Fever", "बुखार"],
      ["vomiting", "Vomiting", "उल्टी"],
      ["none", "None of these", "इनमें से कोई नहीं"],
    ];
    return `<h2>${tx("Tell us about your symptoms", "symptoms")}</h2><p>Choose the main concern and symptoms you are experiencing today.</p><div class="field-grid"><label class="field full">What brings you to the hospital today?<textarea id="concern">${H(i.chiefComplaint)}</textarea></label><label>When did it start?<input id="duration" value="${H(i.duration)}"></label><label>How severe is it? <span id="sev">${H(i.severity)}/10</span><input id="severity" type="range" min="0" max="10" value="${H(i.severity)}"></label><fieldset class="field full"><legend>Also select any urgent symptoms</legend><div class="choice-grid">${choices.map((c) => `<button class="choice ${i.symptoms.includes(c[0]) ? "selected" : ""}" data-symptom="${c[0]}" aria-pressed="${i.symptoms.includes(c[0])}">${S.lang === "हिंदी" ? c[2] : c[1]}</button>`).join("")}</div></fieldset></div>${footer()}`;
  }
  if (S.step === 2)
    return `<h2>${tx("Add a previous medical record", "records")}</h2><p>Choose the supplied demo PDF or any PDF, PNG, or JPG. The filename appears in the presentation.</p><label>Choose a sample file<input id="upload" type="file" accept=".pdf,.png,.jpg,.jpeg"></label><p class="note" id="filename">${H(S.file || "No file selected yet. You can still use a prepared record.")}</p><div class="report-options">${Object.entries(
      reports,
    )
      .map(
        ([id, r]) =>
          `<button class="report ${S.report === id ? "selected" : ""}" data-report="${id}" aria-pressed="${S.report === id}"><strong>${H(r.title)}</strong><small>${H(r.date)}</small></button>`,
      )
      .join(
        "",
      )}</div><div class="demo-banner"><strong>Demo extracted data:</strong> ${H(reports[S.report].findings)}</div>${footer()}`;
  const d = S.doctors.find((x) => x.id === S.doctorId),
    f = flag();
  return `<h2>${tx("Review before sending to the doctor", "review")}</h2><p>The doctor receives an editable AI draft, not a diagnosis.</p><div class="alert ${f[0]}"><strong>${f[1]}</strong><br>${f[2]}</div><div class="field-grid"><section class="patient-card"><h3>${H(p.name)}</h3><dl><dt>Patient ID</dt><dd>${H(p.patientId)}</dd><dt>Chief concern</dt><dd>${H(i.chiefComplaint)}</dd><dt>Selected doctor</dt><dd>${H(d?.name)}</dd></dl></section><section class="patient-card"><h3>Previous record</h3><p>${H(reports[S.report].title)}</p><h3>AI draft</h3><p>Gemini will create the cloud physician summary on submission.</p></section></div>${footer("Back", "Generate & send to doctor")}`;
}
function read() {
  let e = (id) => document.querySelector("#" + id)?.value.trim();
  if (S.step === 0)
    Object.assign(S.patient, {
      name: e("name"),
      age: e("age"),
      sex: e("sex"),
      patientId: e("pid"),
    });
  if (S.step === 1)
    Object.assign(S.intake, {
      chiefComplaint: e("concern"),
      duration: e("duration"),
      severity: e("severity"),
    });
}
function intake() {
  shell(
    `<div class="progress">${[0, 1, 2, 3].map((n) => `<span class="${n <= S.step ? "active" : ""}"></span>`).join("")}</div><section class="card intake-grid"><aside class="side"><div class="eyebrow">${S.lang}</div><h3>Patient intake</h3><div class="step-nav">${nav()}</div></aside><section class="content">${form()}</section></section>`,
  );
  back.onclick = () => {
    S.step ? S.step-- : (S.view = "welcome");
    render();
  };
  next.onclick = async () => {
    read();
    if (S.step === 0 && (!consent.checked || !S.doctorId))
      return toast("Please select a doctor and give consent.");
    if (S.step < 3) {
      S.step++;
      render();
    } else await submit();
  };
  document.querySelectorAll("[data-doc]").forEach(
    (b) =>
      (b.onclick = () => {
        S.doctorId = b.dataset.doc;
        intake();
      }),
  );
  document.querySelectorAll("[data-symptom]").forEach(
    (b) =>
      (b.onclick = () => {
        let k = b.dataset.symptom;
        if (k === "none")
          S.intake.symptoms = S.intake.symptoms.includes(k) ? [] : [k];
        else {
          S.intake.symptoms = S.intake.symptoms.filter((x) => x !== "none");
          S.intake.symptoms = S.intake.symptoms.includes(k)
            ? S.intake.symptoms.filter((x) => x !== k)
            : [...S.intake.symptoms, k];
        }
        intake();
      }),
  );
  document.querySelectorAll("[data-report]").forEach(
    (b) =>
      (b.onclick = () => {
        S.report = b.dataset.report;
        intake();
      }),
  );
  severity?.addEventListener(
    "input",
    (e) => (sev.textContent = e.target.value + "/10"),
  );
  upload?.addEventListener("change", (e) => {
    S.file = e.target.files[0]?.name || "";
    filename.textContent = S.file || "No file selected yet.";
  });
}
async function submit() {
  next.disabled = true;
  next.textContent = "Submitting...";
  try {
    S.app = (
      await api("/api/applications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          patient: S.patient,
          intake: S.intake,
          selectedRecord: reports[S.report],
          triage: Object.fromEntries([
            ["level", flag()[0]],
            ["title", flag()[1]],
            ["text", flag()[2]],
          ]),
          doctorId: S.doctorId,
        }),
      })
    ).application;
    localStorage.setItem("medikiosk-application", JSON.stringify(S.app));
    S.view = "status";
    render();
  } catch (e) {
    next.disabled = false;
    next.textContent = "Generate & send to doctor";
    toast(e.message + " Check the Gemini API key and the server log, then try again.");
  }
}
function status() {
  if (!S.app) {
    S.view = "welcome";
    return render();
  }
  let a = S.app;
  shell(
    `<section class="card status-card"><div class="eyebrow">Application ID: ${H(a.id)}</div><h1>${a.status === "approved" ? tx("Your application is approved", "approved") : tx("Your application is under review", "under")}</h1><p>${a.status === "approved" ? "Your doctor has assigned your appointment." : "It has been sent to your selected doctor. Refresh this page after the doctor reviews it."}</p><section class="appointment-box"><strong>${H(a.doctor.name)}</strong><span>${H(a.doctor.specialty)} - ${H(a.doctor.clinic)}</span>${a.appointment ? `<hr><strong>${H(a.appointment.date)} at ${H(a.appointment.time)}</strong><small>${H(a.appointment.id)}</small>` : ""}</section><div class="button-row">${a.status === "approved" ? `<a class="button primary" href="/api/applications/${encodeURIComponent(a.id)}/appointment.pdf">Download appointment PDF</a>` : `<button class="button primary" id="refresh">${tx("Refresh status", "refresh")}</button>`}<button class="button outline" id="restart">Start another intake</button></div></section>`,
  );
  refresh?.addEventListener("click", async () => {
    try {
      S.app = (
        await api("/api/applications/" + encodeURIComponent(a.id))
      ).application;
      localStorage.setItem("medikiosk-application", JSON.stringify(S.app));
      status();
    } catch (e) {
      toast(e.message);
    }
  });
  restart.onclick = () => {
    S.app = null;
    localStorage.removeItem("medikiosk-application");
    S.step = 0;
    S.view = "welcome";
    render();
  };
}
function login() {
  if (S.session) {
    S.view = "dashboard";
    return render();
  }
  shell(
    `<section class="card login-card"><div class="eyebrow">${tx("Doctor portal", "portal")}</div><h1>${tx("Doctor sign in", "login")}</h1><p>Use the prototype credentials stored in db-data.json.</p><form id="sign"><label>Email<input id="email" type="email" required></label><label>Password<input id="password" type="password" required></label><button class="button primary">${tx("Sign in", "signIn")}</button></form></section>`,
  );
  sign.onsubmit = async (e) => {
    e.preventDefault();
    try {
      S.session = await api("/api/doctor/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.value, password: password.value }),
      });
      sessionStorage.setItem("medikiosk-doctor", JSON.stringify(S.session));
      S.view = "dashboard";
      render();
    } catch (x) {
      toast(x.message);
    }
  };
}
async function dashboard() {
  if (!S.session) {
    S.view = "login";
    return render();
  }
  try {
    let xs = (
      await api("/api/doctor/applications", {
        headers: { Authorization: "Bearer " + S.session.token },
      })
    ).applications;
    shell(
      `<section class="card doctor-dashboard"><div class="dashboard-heading"><div><div class="eyebrow">${H(S.session.doctor.name)}</div><h1>${tx("Current applications", "applications")}</h1></div><button class="button outline" id="out">Sign out</button></div>${xs.length ? xs.map((a) => `<article class="application-card"><div><span class="status ${a.status === "approved" ? "ai" : "fallback"}">${H(a.status.replace("_", " "))}</span><h2>${H(a.patient.name)}</h2><p>${H(a.id)} | ${H(a.patient.patientId)}</p><h3>AI summary</h3><p>${H(a.summary.historyOfPresentIllness)}</p><h3>Chief concern</h3><p>${H(a.summary.chiefComplaint)}</p></div>${a.status === "approved" ? `<div class="approved-panel"><strong>${H(a.appointment.date)} at ${H(a.appointment.time)}</strong><small>${H(a.appointment.id)}</small></div>` : `<form class="approve-form" data-id="${H(a.id)}"><label>Appointment date<input name="date" type="date" required></label><label>Appointment time<input name="time" type="time" required></label><button class="button primary">${tx("Approve and assign appointment", "approve")}</button></form>`}</article>`).join("") : "<p>No applications are waiting for your review.</p>"}</section>`,
    );
    out.onclick = () => {
      S.session = null;
      sessionStorage.removeItem("medikiosk-doctor");
      S.view = "login";
      render();
    };
    document.querySelectorAll(".approve-form").forEach(
      (f) =>
        (f.onsubmit = async (e) => {
          e.preventDefault();
          try {
            await api(
              "/api/doctor/applications/" +
                encodeURIComponent(f.dataset.id) +
                "/approve",
              {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                  Authorization: "Bearer " + S.session.token,
                },
                body: JSON.stringify({
                  appointmentDate: f.date.value,
                  appointmentTime: f.time.value,
                }),
              },
            );
            dashboard();
          } catch (x) {
            toast(x.message);
          }
        }),
    );
  } catch (e) {
    toast(e.message);
  }
}
render();
