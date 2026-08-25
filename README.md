# MediKiosk Hackathon Prototype

A presentation-ready local prototype for AI-assisted patient case taking. It is intentionally **not** a clinical decision system: it collects demo information, applies transparent red-flag rules, and creates an editable draft for a doctor to review.

## What it demonstrates

- Patient consent, language choice, and demographic check-in
- Guided symptom and health-history intake
- Transparent rule-based red-flag alerting
- A selected upload plus a prepared demo extraction (OCR deliberately deferred to final MVP)
- Local Ollama summary generation using `qwen3:1.7b-q4_K_M`
- Safe browser-side template fallback when Ollama is unavailable
- A doctor review screen where all summary text is editable

## Requirements

- Node.js 18 or newer (Node 24 works)
- Optional for AI mode: [Ollama for Windows](https://ollama.com/download/windows)

No `npm install` is needed. The project uses only the Node.js standard library and browser JavaScript.

## Start the prototype

In PowerShell, inside the project folder:

```powershell
npm start
```

Then open `http://localhost:3000` in a browser.

## Connect Ollama

1. Install and start Ollama.
2. Pull the model you selected:

```powershell
ollama pull qwen3:1.7b-q4_K_M
```

3. Confirm the model appears:

```powershell
ollama list
```

4. Keep Ollama running, start this app with `npm start`, and open the prototype.

The app automatically checks `http://127.0.0.1:11434`. On the final **Generate & send to doctor** action, it sends only the demo intake data to your local Ollama server.

The first model response can take longer while Ollama loads the model into memory. The prototype waits up to 90 seconds, then switches to its presentation-safe template fallback. If needed, use a shorter or longer timeout when starting the app:

```powershell
$env:OLLAMA_TIMEOUT_MS = "120000"
npm start
```

If you have the model under a different name, start the app with that name:

```powershell
$env:OLLAMA_MODEL = "your-model-name"
npm start
```

If Ollama is stopped, the prototype still completes the flow with a clearly labelled, deterministic template summary. This is useful for an offline presentation backup.

## Presentation demo path

1. Choose English and start check-in.
2. Keep the seeded Ramesh Kumar data or edit it.
3. On **Symptoms**, set the severity to 8 and select **Breathing difficulty** to show the priority-triage path; leave the defaults for a routine path.
4. Select a sample file, then select a prepared demo record.
5. Generate the physician draft and show that the doctor can edit it before confirming.

## Important prototype boundaries

- Demo data only; do not enter real patient health information.
- It does not diagnose, prescribe, or replace a clinician.
- The red-flag list is a presentation feature, not a validated triage protocol.
- OCR, ABHA/ABDM, HIS/FHIR integration, authentication, persistence, and production-grade security are final-MVP work.
