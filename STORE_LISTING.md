# Readify store listing

## Short description

Personalize text size and typography, then use your own AI key to shorten, explain, or ask about pages and selected text.

## Full description

Readify helps you make websites easier to read and gives you control over optional AI reading tools.

Customize each site with text scaling, exact sizes for different text categories, font families, letter spacing, and line height. Save site-specific settings, global defaults, presets, and exclusions so your preferred reading experience follows you across the web.

When you provide your own API key, Readify can also:

- Shorten, explain, or answer a question about the entire page.
- Simplify or shorten highlighted text in place.
- Open a follow-up panel to ask about highlighted text.
- Use Gemini, Groq, or Grok (xAI), selected by you in the settings.

Readify is local-first: settings, preferences, API keys, and the latest whole-page result are stored in the browser's local extension storage. AI requests go directly to the provider you choose. There is no Readify account, proxy, developer backend, analytics, or telemetry service.

## Permission explanations

- `storage`: saves reading settings, presets, preferences, provider choice, API keys, and the latest whole-page result locally.
- `tabs`: finds the active tab for commands and sends messages to the content script.
- `contextMenus`: provides selected-text actions in the browser context menu.
- Website access: applies reading settings on supported pages and handles page/selection text after a user action.
- Gemini, Groq, and xAI API hosts: make direct AI requests only when the corresponding provider is selected.

## Privacy disclosure

Readify does not collect analytics or telemetry and does not send page text in the background. A whole-page request sends visible page text; a selected-text request sends the selection and, for follow-ups, the user's question. The selected provider also receives the corresponding API key in the request. Provider retention and processing are controlled by that provider. See [PRIVACY.md](PRIVACY.md) for the complete policy and data-flow details.

## Reviewer instructions

1. Install the packaged extension and open a normal HTTP(S) article or documentation page.
2. Open Readify and adjust text size or typography. Apply the settings and reload the page if needed to verify the local page customization.
3. In Presets, choose Gemini, Groq, or Grok (xAI) and enter a reviewer-owned test API key. No key is bundled with the extension.
4. Use **Entire Page** with Shorten, Explain, or Ask. For Ask, enter a question first.
5. Highlight text and use the browser context menu or the documented Alt+Shift shortcuts to test Simplify, Shorten, and Ask about selected text.
6. Clear the displayed whole-page result and remove the test key before uninstalling.

The provider key is required for AI testing and must be supplied by the reviewer. Readify sends test prompts directly to the selected provider; there is no Readify test account or proxy.

## Availability

Chrome Web Store, Microsoft Edge Add-ons, and Firefox Add-ons links will be added after the corresponding store submissions are published.
