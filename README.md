VC Analyst – Upload & Analyze (Gemini)

This app lets you upload PDF/DOCX files and generates a structured VC-style brief using Google Vertex AI (Gemini). It runs fully server-side, with client-side uploads to Vercel Blob to avoid request-size limits.

Quick demo flow

- Select one or more PDF/DOCX files
- Enter a company name (optional, improves the prompt)
- Click “Generate VC Brief”

Result appears as plain text, built from the model’s JSON (or raw text fallback if the model didn’t return valid JSON).

Prerequisites

- Node.js 18+ (20+ recommended)
- A Google Cloud project with billing enabled and Vertex AI API enabled
- A Vertex AI Service Account key (JSON)
- A Vercel Blob Read-Write token (for large-file uploads)

Create a Google Cloud project and service account (one-time)

1. Create project
   - Go to `https://console.cloud.google.com/` → Project selector → New Project
   - Name it and note the Project ID (this is what you put in `GCP_PROJECT_ID`)
2. Link billing
   - Console → Billing → Link a billing account to the new project (required for Vertex AI)
3. Enable APIs
   - Console → APIs & Services → Enable APIs and Services → search and enable: “Vertex AI API”
4. Create service account & key
   - Console → IAM & Admin → Service Accounts → Create Service Account
   - Name: vertex-runner (any name) → Create & Continue
   - Grant role: Vertex AI User (`roles/aiplatform.user`) → Done
   - Click the service account → Keys → Add key → Create new key → JSON → Download the JSON file
5. Use the key locally or in Vercel
   - Local: set `GOOGLE_APPLICATION_CREDENTIALS` to the absolute path of the JSON, or paste the JSON into `GOOGLE_CREDENTIALS_JSON`
   - Vercel: set `GOOGLE_CREDENTIALS_JSON` to the full JSON content in Project → Settings → Environment Variables
6. Region
   - Set `GCP_LOCATION=us-central1` (recommended); switch only if your chosen model is supported in your region

1) Clone and install

```bash
git clone <your-repo-url>
cd vc-analyst-gemini
npm install
```

2. Set environment variables (.env.local)
   Create `vc-analyst-gemini/.env.local` with at least these variables:

```bash
# Google Cloud / Vertex AI
GCP_PROJECT_ID=your-gcp-project-id
GCP_LOCATION=us-central1

# ONE of the following auth methods:
# A) Path to your service account key on disk
GOOGLE_APPLICATION_CREDENTIALS=/absolute/path/to/sa.json

# OR B) Paste the whole service account JSON inline (single line)
# GOOGLE_CREDENTIALS_JSON={"type":"service_account","project_id":"...","private_key_id":"...","private_key":"-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n","client_email":"...","client_id":"...","token_uri":"https://oauth2.googleapis.com/token"}

# Vercel Blob (required for uploading large files locally and in production)
BLOB_READ_WRITE_TOKEN=vercel_blob_rw_********************************
```

Notes

- The code writes `GOOGLE_CREDENTIALS_JSON` to `/tmp/sa.json` automatically if `GOOGLE_APPLICATION_CREDENTIALS` isn’t set.
- Keep `GCP_LOCATION=us-central1` unless you know your chosen model is available in other regions. A 404 “model not found” usually means the region doesn’t host that model.
- For Vercel Blob, create a Read-Write token in Vercel → Storage → Blob → Tokens.

3. Run locally

```bash
npm run dev
```

Open http://localhost:3000 and try uploading a small PDF first to validate the flow.

4. Usage tips

- You can upload multiple files; the app uploads them to Vercel Blob and then sends their URLs to the API for parsing.
- Big PDFs/DOCX can take time; the app shows a loader while Gemini runs.
- If a result shows “raw” text, the model returned non-JSON; re-run or tighten the prompt (already handled with a JSON extractor and fallback).

5. Deploying on Vercel

1) Push your repo to GitHub/GitLab
2) Import into Vercel (framework: Next.js)
3) Set these Project → Settings → Environment Variables (Production and Preview):
   - `GCP_PROJECT_ID`
   - `GCP_LOCATION` (e.g., `us-central1`)
   - `GOOGLE_CREDENTIALS_JSON` (paste full service account JSON)
   - `BLOB_READ_WRITE_TOKEN` (Read-Write token from Vercel Blob)
4) Redeploy

After deploy, open the app URL and upload files. Large files should work because uploads go to Blob first (the API receives only public URLs).

Troubleshooting

- 403 “billing disabled” from Vertex AI: enable billing for the GCP project, then retry.
- 404 “model not found”: set `GCP_LOCATION=us-central1` or pick a model available in your region.
- Auth errors: ensure the service account has role `roles/aiplatform.user` and the project id in env matches the key’s project.
- 413 on uploads: this app uses Vercel Blob; if you still see this locally, verify `BLOB_READ_WRITE_TOKEN` is set in `.env.local`.
- Blob errors
  - “Failed to retrieve the client token”: make sure `BLOB_READ_WRITE_TOKEN` exists in the environment (and redeploy on Vercel).
  - “Invalid event type”: ensure the upload route runs on `edge` and you’re on a current `@vercel/blob` version.

Tech stack

- Next.js App Router (Node and Edge functions)
- Google Vertex AI (Gemini)
- Vercel Blob (client uploads)
- pdf-parse, mammoth (PDF/DOCX to text)

Scripts

- `npm run dev` – start dev server
- `npm run build` – build for production
- `npm start` – start production server locally

Security & keys

- Never commit `sa.json` or any secrets. Add them via env vars.
- On Vercel, always set secrets in Project → Settings → Environment Variables.
