# Readify

Readify lets you tailor the reading experience on the websites you use. Adjust text size and typography per site or globally, save reusable presets, and optionally use your own AI provider key to work with page or selected text.

## Showcase

https://github.com/user-attachments/assets/705dc3bc-b4ec-494c-b9f0-a55d58ce84a8

## Features

- Scale text or set exact sizes for body text, headings, links, controls, and small text.
- Choose from accessible, sans-serif, serif, monospace, and distinctive font families.
- Adjust letter spacing and line height.
- Save website-specific settings, global defaults, presets, and site exclusions locally.
- Shorten, explain, or ask about the entire page with your own Gemini, Groq, or Grok (xAI) API key.
- Simplify or shorten selected text, or ask a follow-up question about a selection, from the context menu or keyboard shortcuts.
- Choose a light or dark interface theme and export/import settings without exporting API keys.

## Privacy

Readify stores settings, selected provider preferences, API keys, and the latest whole-page AI result in the browser's local extension storage. AI requests go directly from the extension to the provider you select; Readify does not use an intermediary backend or telemetry service. Page or selected text is sent only when you start an AI action.

Read the [Privacy Policy](PRIVACY.md) for the complete data-flow description.

## Development

Use Node.js 22 or newer and npm.

```sh
npm ci
npm run compile
npm run build
npm run build:firefox
```

The default build targets Chromium browsers and writes to `.output/chrome-mv3/`. The Firefox build writes to `.output/firefox-mv2/` with the current WXT configuration.

Create release archives with:

```sh
npm run zip
npm run zip:firefox
```

The same Chromium archive can be submitted to Chrome and Edge. See [SOURCE_CODE_REVIEW.md](SOURCE_CODE_REVIEW.md) for the reproducible review commands and generated-file guidance.

## Manual loading

For Chrome, open `chrome://extensions`, enable Developer mode, choose **Load unpacked**, and select `.output/chrome-mv3/` after `npm run build`.

For Edge, open `edge://extensions`, enable Developer mode, choose **Load unpacked**, and select the same `.output/chrome-mv3/` directory.

For Firefox, run `npm run build:firefox`, open `about:debugging#/runtime/this-firefox`, choose **Load Temporary Add-on**, and select `.output/firefox-mv2/manifest.json`.

## Store links

- [Chrome Web Store](https://chromewebstore.google.com/detail/readify/cpdfcocmpacdfogkbgjggdokppbffafb)
- [Firefox Add-ons](https://addons.mozilla.org/en-CA/firefox/addon/readify-web/)
