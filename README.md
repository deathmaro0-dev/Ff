# NOVA STUDIO

Private single-owner workspace for creating NOVA images and videos.

## What is included

- Password-protected owner login.
- Private photo/video creator interface.
- Polza.ai Media API integration.
- Netlify Background Function for long-running paid generations.
- Netlify Blobs job state, so the browser does not keep a server request open for minutes.
- Reference-image compression before sending it to the generation API.
- No public registration, customer billing, subscriptions, or public user accounts.

## Required Netlify environment variables

Keep these existing production variables in Netlify:

- `STUDIO_PASSWORD`
- `SESSION_SECRET`
- `POLZA_API_KEY`

Do not put secrets in GitHub, source files, or browser code. The current deployment already has these variables; replacing repository files does not require deleting or recreating them.

## Deploy

Netlify should build this repository using `npm run build`. The Next.js runtime is detected by Netlify. Background Functions are deployed from `netlify/functions`.

## Generation API

- Images and videos are submitted through Polza.ai `POST /api/v1/media` with `async: true`.
- The background function polls `GET /api/v1/media/{id}`.
- Results are stored by Polza.ai on its CDN for a limited period (currently documented as 7 days).
- The browser polls the private status endpoint on this site.

## Important

The app does not expose the Polza API key to the browser. A generation request is a paid request to your Polza.ai account. Test with one low-cost image before using longer video models.

Polza model IDs and model-specific input parameters can change. The current IDs in `app/api/generate/route.ts` should be checked against your Polza account's current model catalog if a provider returns an unknown-model or unsupported-parameter error.
