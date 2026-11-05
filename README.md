# NOVA STUDIO — private single-user edition

A private workspace for one owner (you) to create images and videos for NOVA.
This version is intentionally **not a public SaaS**.

## What this version is designed for
- One owner account protected by a password and signed HTTP-only session cookie.
- No public registration, customer accounts, subscriptions, checkout, SEO landing page, or customer billing.
- AI usage is intended to be billed directly to your own Polza.ai balance. The studio itself does not collect payments.
- Photo/video workspace with a reference-image picker.

## Important current status
The private login and owner-only page are implemented. The generation screen is still a UI shell: the `/api/generate` endpoint deliberately returns a disabled response until the Polza media adapter is completed and tested against your account and selected model IDs. It will not silently send paid requests or pretend a generation succeeded.

## Configure private access
1. Install Node.js 20+ and run `npm install`.
2. Copy `.env.example` to `.env.local`.
3. Set `STUDIO_PASSWORD` to a unique strong password.
4. Set `SESSION_SECRET` to a random secret of at least 32 characters.
5. Create your own Polza.ai account, top up with a payment method available to you, and create an API key in its dashboard.
6. Put that key in `POLZA_API_KEY` in `.env.local`. Never paste it into chat or client-side code.
7. Run `npm run dev` and open `http://localhost:3000`.

## Deploying privately
Before deploying, set the same environment variables in your hosting provider. Use HTTPS and a strong password. Do not expose `/api/generate` publicly until provider calls are implemented and verified. The app has no customer payment flow by design.

## Later expansion path
The current private workspace can later be extended with public landing pages, SEO metadata, customer accounts, usage limits, and Russian payment acquiring (subject to legal/business onboarding). Those features are intentionally excluded now.
