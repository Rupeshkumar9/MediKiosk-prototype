# MediKiosk Hackathon Prototype

A presentation-ready local prototype for AI-assisted patient case taking. It is intentionally **not** a clinical decision system: it collects demo information, applies transparent red-flag rules, and creates an editable draft for a doctor to review.

## What it demonstrates

- Patient consent, language choice, and demographic check-in
- Guided symptom and health-history intake
- Transparent rule-based red-flag alerting
- A selected upload plus a prepared demo extraction (OCR deliberately deferred to final MVP)
- Express.js backend with a JSON-backed prototype data store
- Cloud Gemini summary generation using `gemini-3.5-flash-lite`
- Available-doctor selection during patient intake
- Doctor sign-in, application review, approval, and doctor-assigned appointment slots
- Patient status page and downloadable appointment-confirmation PDF

## Requirements

- Node.js 18 or newer (Node 24 works)
- A Gemini API key in `.env` (for example, `GEMINI_API_KEY=...`)

Install the Express dependency once:

```powershell
npm install
```

## Start the prototype

In PowerShell, inside the project folder:

```powershell
npm start
```

Then open `http://localhost:3000` in a browser.

## Connect Gemini

Add your API key to `.env`:

```text
GEMINI_API_KEY=your_key_here
GEMINI_MODEL=gemini-3.5-flash-lite
```

The Express server checks Gemini at startup and retries every five seconds. Until Gemini is ready, the clinical API refuses to save applications. Test the key separately with `npm run test:gemini`.

## Demo accounts and upload file

`db-data.json` contains the prototype doctors and plain-text demo credentials. Use one of these accounts in the Doctor portal:

- `meera.shah@medikiosk.demo` / `MediKiosk@123`
- `arjun.nair@medikiosk.demo` / `MediKiosk@123`
- `kavita.singh@medikiosk.demo` / `MediKiosk@123`

Upload [demo-upload-report.pdf](D:/code_hobby/02_Projects/MediKiosk-prototype/demo-upload-report.pdf) in the previous-record step for the presentation. Doctors assign the appointment date and time only after they approve an application; the patient can then refresh the status page and download the generated confirmation PDF.

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
