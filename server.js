import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import express from "express";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = Number(process.env.PORT || 3000);
const DB_PATH = path.join(__dirname, "db-data.json");
const GEMINI_API_BASE = "https://generativelanguage.googleapis.com/v1beta";
const RETRY_MS = Number(process.env.GEMINI_RETRY_MS || 5000);
const app = express();
const sessions = new Map();
const gemini = { ready: false, lastError: "Checking Gemini..." };

function loadEnvFile() {
  const envPath = path.join(__dirname, ".env");
  if (!fs.existsSync(envPath)) return {};

  return fs
    .readFileSync(envPath, "utf8")
    .split(/\r?\n/)
    .reduce((values, line) => {
      const match = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/);
      if (!match || line.trimStart().startsWith("#")) return values;
      const [, key, rawValue] = match;
      values[key] = rawValue.replace(/^(["'])(.*)\1$/, "$2");
      return values;
    }, {});
}

const env = loadEnvFile();
const GEMINI_API_KEY =
  process.env.GEMINI_API_KEY ||
  process.env.API_KEY ||
  process.env.api_key ||
  env.GEMINI_API_KEY ||
  env.API_KEY ||
  env.api_key;
const GEMINI_MODEL =
  process.env.GEMINI_MODEL || env.GEMINI_MODEL || "gemini-3.5-flash-lite";

const PUBLIC_DIR = path.join(__dirname, "public");

app.use(express.json({ limit: "1mb" }));
app.use(
  express.static(PUBLIC_DIR, {
    extensions: ["html"],
    setHeaders(response, filePath) {
      const extension = path.extname(filePath);
      const contentTypes = {
        ".css": "text/css; charset=utf-8",
        ".js": "text/javascript; charset=utf-8",
        ".html": "text/html; charset=utf-8",
      };

      if (contentTypes[extension]) response.type(contentTypes[extension]);
      response.setHeader("Cache-Control", "no-store, max-age=0");
    },
  }),
);
const loadDb = () => JSON.parse(fs.readFileSync(DB_PATH, "utf8"));
const saveDb = (db) =>
  fs.writeFileSync(DB_PATH, JSON.stringify(db, null, 2) + "\n", "utf8");
const doctorInfo = ({ id, name, specialty, clinic, languages }) => ({
  id,
  name,
  specialty,
  clinic,
  languages,
});

async function checkGemini() {
  if (!GEMINI_API_KEY) {
    gemini.ready = false;
    gemini.lastError = "Missing GEMINI_API_KEY, API_KEY, or api_key in .env";
    return;
  }

  try {
    const res = await fetch(
      `${GEMINI_API_BASE}/models/${encodeURIComponent(GEMINI_MODEL)}?key=${encodeURIComponent(GEMINI_API_KEY)}`,
      { signal: AbortSignal.timeout(5000) },
    );
    const result = await res.json();
    if (!res.ok)
      throw new Error(result.error?.message || `Gemini returned ${res.status}`);
    const changed = !gemini.ready;
    Object.assign(gemini, { ready: true, lastError: "" });
    if (changed)
      console.log(`[Gemini] Connected. Model ${GEMINI_MODEL} is ready.`);
  } catch (error) {
    const message = error.message || "Unknown connection error";
    const changed = gemini.ready || gemini.lastError !== message;
    Object.assign(gemini, { ready: false, lastError: message });
    if (changed)
      console.error(
        "[Gemini] Unavailable: " +
          message +
          ". Retrying in " +
          RETRY_MS / 1000 +
          "s; clinical APIs remain unavailable.",
      );
  }
}
const requireGemini = (req, res, next) =>
  gemini.ready
    ? next()
    : res.status(503).json({
        error: "Gemini is not ready. The application was not saved.",
        detail: gemini.lastError,
        retryAfterSeconds: Math.ceil(RETRY_MS / 1000),
      });
const requireDoctor = (req, res, next) => {
  const session = sessions.get(
    req.headers.authorization?.replace(/^Bearer\s+/i, ""),
  );
  if (!session)
    return res.status(401).json({ error: "Doctor sign-in is required." });
  req.doctorId = session.doctorId;
  return next();
};
function summary(payload) {
  const i = payload.intake || {},
    r = payload.selectedRecord || {},
    t = payload.triage || {};
  const symptoms =
    (i.symptoms || []).filter((item) => item !== "none").join(", ") ||
    "None reported";
  return {
    chiefComplaint: i.chiefComplaint || "Not reported",
    historyOfPresentIllness:
      "Started " +
      (i.duration || "at an unspecified time") +
      "; severity " +
      (i.severity || "not reported") +
      "/10. Associated symptoms: " +
      symptoms +
      ".",
    relevantHistory:
      (i.history || "Not reported") +
      ". Personal history: " +
      (i.lifestyle || "Not reported") +
      ".",
    medicationsAndAllergies:
      "Medicines: " +
      (i.medications || "Not reported") +
      ". Allergies: " +
      (i.allergies || "Not reported") +
      ".",
    previousRecords:
      (r.title || "No record selected") +
      " (" +
      (r.date || "date unavailable") +
      "): " +
      (r.findings || "No demo findings available"),
    triageNote:
      (t.title || "Routine clinical review") +
      ". " +
      (t.text || "A clinician must assess the patient."),
    clinicianNote:
      "Draft compiled from patient-entered information and demo record data. Review, verify, edit, and clinically assess before acting.",
  };
}
async function generateSummary(payload) {
  const i = payload.intake || {};
  const facts = JSON.stringify({
    chiefComplaint: i.chiefComplaint,
    duration: i.duration,
    severity: i.severity,
    symptoms: i.symptoms,
  });
  const res = await fetch(
    `${GEMINI_API_BASE}/models/${encodeURIComponent(GEMINI_MODEL)}:generateContent?key=${encodeURIComponent(GEMINI_API_KEY)}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      signal: AbortSignal.timeout(
        Number(process.env.GEMINI_TIMEOUT_MS || 30000),
      ),
      body: JSON.stringify({
        systemInstruction: {
          parts: [
            {
              text: "Write one short factual history-of-present-illness sentence for a doctor. Use only the supplied facts. Do not diagnose, prescribe, or infer. Return only one sentence under 45 words.",
            },
          ],
        },
        contents: [{ parts: [{ text: "Facts: " + facts }] }],
        generationConfig: { temperature: 0.1, maxOutputTokens: 80 },
      }),
    },
  );
  const result = await res.json();
  if (!res.ok)
    throw new Error(result.error?.message || `Gemini returned ${res.status}`);
  const sentence = String(
    result.candidates?.[0]?.content?.parts?.[0]?.text || "",
  ).trim();
  if (!sentence) throw new Error("Gemini returned an empty summary");
  return { ...summary(payload), historyOfPresentIllness: sentence };
}
function pdfText(value) {
  return String(value || "")
    .replace(/[\\()]/g, "\\$&")
    .replace(/[^\x20-\x7E]/g, "?");
}
function appointmentPdf(a) {
  const x = a.appointment,
    p = a.patient,
    d = a.doctor;
  const lines = [
    "MEDIKIOSK - APPOINTMENT CONFIRMATION",
    "",
    "Appointment ID: " + x.id,
    "Application ID: " + a.id,
    "Patient: " + p.name + " (" + p.patientId + ")",
    "Doctor: " + d.name + ", " + d.specialty,
    "Appointment: " + x.date + " at " + x.time,
    "Clinic: " + d.clinic,
    "",
    "Please arrive 15 minutes early and bring original medical records.",
    "Prototype confirmation only - not a prescription or medical advice.",
  ];
  const stream = [
    "BT",
    "/F1 18 Tf",
    "72 745 Td",
    "(" + pdfText(lines[0]) + ") Tj",
    "/F1 11 Tf",
    ...lines
      .slice(1)
      .flatMap((line) => ["0 -24 Td", "(" + pdfText(line) + ") Tj"]),
    "ET",
  ].join("\n");
  const objects = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
    "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>",
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
    "<< /Length " +
      Buffer.byteLength(stream) +
      " >>\nstream\n" +
      stream +
      "\nendstream",
  ];
  let pdf = "%PDF-1.4\n",
    offsets = [0];
  objects.forEach((o, n) => {
    offsets.push(Buffer.byteLength(pdf));
    pdf += n + 1 + " 0 obj\n" + o + "\nendobj\n";
  });
  const xref = Buffer.byteLength(pdf);
  pdf +=
    "xref\n0 6\n0000000000 65535 f \n" +
    offsets
      .slice(1)
      .map((o) => String(o).padStart(10, "0") + " 00000 n \n")
      .join("") +
    "trailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n" +
    xref +
    "\n%%EOF\n";
  return Buffer.from(pdf);
}

app.get("/api/health", (req, res) =>
  res.status(gemini.ready ? 200 : 503).json({
    available: gemini.ready,
    provider: "gemini",
    model: GEMINI_MODEL,
    error: gemini.lastError || undefined,
  }),
);
app.get("/api/doctors", (req, res) =>
  res.json({ doctors: loadDb().doctors.map(doctorInfo) }),
);
app.post("/api/applications", requireGemini, async (req, res) => {
  const payload = req.body || {},
    db = loadDb(),
    doctor = db.doctors.find((item) => item.id === payload.doctorId);
  if (!doctor)
    return res
      .status(400)
      .json({ error: "Please select an available doctor." });
  if (
    !payload.patient?.name ||
    !payload.patient?.patientId ||
    !payload.intake?.chiefComplaint
  )
    return res.status(400).json({
      error: "Patient name, patient ID, and chief concern are required.",
    });
  try {
    const application = {
      id:
        "APP-" +
        new Date().getFullYear() +
        "-" +
        crypto.randomInt(100000, 999999),
      createdAt: new Date().toISOString(),
      status: "under_review",
      patient: payload.patient,
      intake: payload.intake,
      selectedRecord: payload.selectedRecord || {},
      triage: payload.triage || {},
      doctor: doctorInfo(doctor),
      summary: await generateSummary(payload),
      appointment: null,
    };
    db.applications.unshift(application);
    saveDb(db);
    return res.status(201).json({ application });
  } catch (error) {
    console.error("[Gemini] Summary generation failed: " + error.message);
    checkGemini();
    return res.status(503).json({
      error:
        "Gemini could not generate the summary. The application was not saved.",
      detail: error.message,
    });
  }
});
app.get("/api/applications/:id", (req, res) => {
  const application = loadDb().applications.find(
    (item) => item.id === req.params.id,
  );
  return application
    ? res.json({ application })
    : res.status(404).json({ error: "Application not found." });
});
app.post("/api/doctor/login", (req, res) => {
  const doctor = loadDb().doctors.find(
    (item) =>
      item.email === req.body?.email && item.password === req.body?.password,
  );
  if (!doctor)
    return res.status(401).json({ error: "Invalid demo email or password." });
  const token = crypto.randomUUID();
  sessions.set(token, { doctorId: doctor.id });
  return res.json({ token, doctor: doctorInfo(doctor) });
});
app.get("/api/doctor/applications", requireDoctor, (req, res) =>
  res.json({
    applications: loadDb().applications.filter(
      (item) => item.doctor.id === req.doctorId,
    ),
  }),
);
app.post("/api/doctor/applications/:id/approve", requireDoctor, (req, res) => {
  if (!req.body?.appointmentDate || !req.body?.appointmentTime)
    return res
      .status(400)
      .json({ error: "Appointment date and time are required." });
  const db = loadDb(),
    application = db.applications.find(
      (item) => item.id === req.params.id && item.doctor.id === req.doctorId,
    );
  if (!application)
    return res
      .status(404)
      .json({ error: "Application not found for this doctor." });
  application.status = "approved";
  application.appointment = {
    id:
      "APT-" +
      new Date().getFullYear() +
      "-" +
      crypto.randomInt(100000, 999999),
    date: req.body.appointmentDate,
    time: req.body.appointmentTime,
    approvedAt: new Date().toISOString(),
  };
  saveDb(db);
  return res.json({ application });
});
app.get("/api/applications/:id/appointment.pdf", (req, res) => {
  const application = loadDb().applications.find(
    (item) => item.id === req.params.id,
  );
  if (!application?.appointment)
    return res
      .status(404)
      .json({ error: "An approved appointment is required before download." });
  res.set({
    "Content-Type": "application/pdf",
    "Content-Disposition":
      "attachment; filename=medikiosk-" + application.appointment.id + ".pdf",
  });
  return res.send(appointmentPdf(application));
});

app.listen(PORT, () => {
  console.log("MediKiosk Express server running at http://localhost:" + PORT);
  console.log(`[Gemini] Configured model: ${GEMINI_MODEL}.`);
  checkGemini();
  setInterval(checkGemini, RETRY_MS).unref();
});
