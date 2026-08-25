const http = require("node:http");
const fs = require("node:fs");
const path = require("node:path");

const PORT = Number(process.env.PORT || 3000);
const PUBLIC_DIR = path.join(__dirname, "public");
const OLLAMA_URL = "http://127.0.0.1:11434/api/chat";
const OLLAMA_MODEL = process.env.OLLAMA_MODEL || "qwen3:1.7b-q4_K_M";
const OLLAMA_TIMEOUT_MS = Number(process.env.OLLAMA_TIMEOUT_MS || 90000);

function sendJson(response, statusCode, value) {
  response.writeHead(statusCode, { "Content-Type": "application/json; charset=utf-8" });
  response.end(JSON.stringify(value));
}

function templateSummary(payload) {
  const intake = payload.intake || {};
  const record = payload.selectedRecord || {};
  const triage = payload.triage || {};
  const symptoms = Array.isArray(intake.symptoms) ? intake.symptoms.filter((item) => item !== "none") : [];
  return {
    chiefComplaint: intake.chiefComplaint || "Not reported",
    historyOfPresentIllness: `Started ${intake.duration || "at an unspecified time"}; severity ${intake.severity || "Not reported"}/10. Associated symptoms: ${symptoms.join(", ") || "None reported"}.`,
    relevantHistory: `${intake.history || "Not reported"}. Personal history: ${intake.lifestyle || "Not reported"}.`,
    medicationsAndAllergies: `Medicines: ${intake.medications || "Not reported"}. Allergies: ${intake.allergies || "Not reported"}.`,
    previousRecords: `${record.title || "No record selected"} (${record.date || "date unavailable"}): ${record.findings || "No demo findings available"}`,
    triageNote: `${triage.title || "Routine clinical review"}. ${triage.text || "A clinician must assess the patient."}`,
    clinicianNote: "Draft compiled from patient-entered information and demo record data. Review, verify, edit, and clinically assess before acting."
  };
}

async function generateSummary(payload) {
  const intake = payload.intake || {};
  const facts = JSON.stringify({
    chiefComplaint: intake.chiefComplaint,
    duration: intake.duration,
    severity: intake.severity,
    symptoms: intake.symptoms
  });
  const system = [
    "You write one short factual history-of-present-illness sentence for a doctor.",
    "Use only the given facts. Do not diagnose, prescribe, add advice, or infer missing facts.",
    "Do not use a thinking or analysis section. Return only one sentence under 45 words."
  ].join(" ");

  const controller = new AbortController();
  let timeout;
  let ollamaResponse;
  try {
    const responsePromise = fetch(OLLAMA_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    signal: controller.signal,
    body: JSON.stringify({
      model: OLLAMA_MODEL,
      stream: false,
      think: false,
      messages: [
        { role: "system", content: system },
        { role: "user", content: `Facts: ${facts}` }
      ],
      options: { temperature: 0.1, num_predict: 80 }
    })
    });
    const timeoutPromise = new Promise((_, reject) => {
      timeout = setTimeout(() => {
        controller.abort();
        reject(new Error(`Ollama did not respond within ${Math.round(OLLAMA_TIMEOUT_MS / 1000)} seconds`));
      }, OLLAMA_TIMEOUT_MS);
    });
    ollamaResponse = await Promise.race([responsePromise, timeoutPromise]);
  } finally {
    clearTimeout(timeout);
  }

  if (!ollamaResponse.ok) {
    throw new Error(`Ollama returned ${ollamaResponse.status}`);
  }
  const modelResult = await ollamaResponse.json();
  const aiSentence = String(modelResult?.message?.content || "")
    .replace(/<think>[\s\S]*?<\/think>/gi, "")
    .trim();
  if (!aiSentence) throw new Error("Ollama returned an empty summary");
  const summary = templateSummary(payload);
  summary.historyOfPresentIllness = aiSentence;
  return summary;
}

function serveStatic(request, response) {
  const requestedPath = request.url === "/" ? "/index.html" : request.url;
  const safePath = path.normalize(requestedPath).replace(/^([.][.][\\/])+/, "");
  const filePath = path.join(PUBLIC_DIR, safePath);
  if (!filePath.startsWith(PUBLIC_DIR)) {
    response.writeHead(403).end();
    return;
  }
  const extension = path.extname(filePath);
  const types = {
    ".html": "text/html; charset=utf-8",
    ".js": "text/javascript; charset=utf-8",
    ".css": "text/css; charset=utf-8",
    ".svg": "image/svg+xml"
  };
  fs.readFile(filePath, (error, content) => {
    if (error) {
      response.writeHead(error.code === "ENOENT" ? 404 : 500).end();
      return;
    }
    response.writeHead(200, { "Content-Type": types[extension] || "application/octet-stream" });
    response.end(content);
  });
}

const server = http.createServer(async (request, response) => {
  if (request.method === "GET" && request.url === "/api/health") {
    try {
      const health = await fetch("http://127.0.0.1:11434/api/tags");
      const data = await health.json();
      const models = (data.models || []).map((model) => model.name);
      return sendJson(response, 200, { available: health.ok, models, model: OLLAMA_MODEL });
    } catch {
      return sendJson(response, 200, { available: false, models: [], model: OLLAMA_MODEL });
    }
  }

  if (request.method === "POST" && request.url === "/api/summary") {
    let body = "";
    request.on("data", (chunk) => { body += chunk; });
    request.on("end", async () => {
      try {
        const payload = JSON.parse(body || "{}");
        const summary = await generateSummary(payload);
        sendJson(response, 200, { source: "ollama", summary });
      } catch (error) {
        sendJson(response, 503, {
          source: "fallback",
          error: error.message,
          message: "Ollama is unavailable or returned an invalid response. The browser will show a safe template summary."
        });
      }
    });
    return;
  }

  if (request.method === "GET") return serveStatic(request, response);
  response.writeHead(405).end();
});

server.listen(PORT, () => {
  console.log(`MediKiosk prototype running at http://localhost:${PORT}`);
  console.log(`Configured Ollama model: ${OLLAMA_MODEL}`);
  console.log(`Ollama timeout: ${Math.round(OLLAMA_TIMEOUT_MS / 1000)} seconds`);
});
