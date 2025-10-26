<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# Run and deploy your AI Studio app

This contains everything you need to run your app locally.

View your app in AI Studio: https://ai.studio/apps/drive/15j-4pDrVDDKjStAlf7pv2jR4-t8sXDzJ

## Run Locally

**Prerequisites:**  Node.js


1. Install dependencies:
   `npm install`
2. Set the `GEMINI_API_KEY` in [.env.local](.env.local) to your Gemini API key
3. Run the app:
   `npm run dev`

## Frontend Setup

1. Install dependencies
2. Add your environment variables
3. Run the dev server

### Env vars
- Create `.env.local` with:
   - `GEMINI_API_KEY=your_key_here`

### Tailwind CSS
Tailwind is configured via `tailwind.config.ts`, `postcss.config.js`, and `app/globals.css`. Do not load Tailwind via CDN.

### Run
Use the Next.js scripts: dev, build, start.
