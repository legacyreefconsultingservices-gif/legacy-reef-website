# Legacy Reef Consulting Services website

Static site (public/) plus a small Node.js server (server.js) that emails the inquiry form to legacyreefconsultingservices@gmail.com.

## Run locally
1. Install Node.js 18 or newer.
2. `npm install`
3. Copy `.env.example` to `.env` and fill in the SMTP details (Gmail: turn on 2 step verification, then create an App Password).
4. `npm start` and open http://localhost:3000

## Deploy
Any host that runs Node.js (Render, Railway, a VPS). Set the same values from `.env.example` as environment variables on the host. Never upload `.env` to GitHub.

## Content to replace
- Retainer currency: confirm whether $2,500 and $7,500 are USD or GYD.
- Legal pages (privacy.html, terms.html, disclaimer.html) are drafts; have them reviewed.
