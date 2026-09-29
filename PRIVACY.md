# Readify Privacy Policy

**Effective date:** September 28, 2026

Readify is a browser extension for customizing text presentation and optionally using a user-selected AI provider to work with webpage or selected text. This policy describes the behavior implemented in Readify 1.0.0.

## Data stored locally

Readify uses the browser's local extension storage for:

- global and per-site text-size and typography settings;
- presets, global preset selection, and site exclusions;
- light/dark theme and popup display preferences;
- the selected AI provider;
- user-entered Gemini, Groq, and Grok (xAI) API keys; and
- the latest whole-page AI result until it is replaced or cleared.

Settings export/import files contain settings and the selected provider, but do not include API keys. Readify does not implement separate encryption for values in extension local storage. The API-key field is presented as a password field in the interface, but storage security is provided by the browser profile rather than by Readify.

## Data sent to AI providers

AI features are optional and disabled until the user supplies a provider key. When the user starts a whole-page action, Readify obtains the visible page text (`document.body.innerText`) from the current page and sends it in the prompt to the selected provider. Whole-page actions are Shorten, Explain, and Ask.

When the user invokes a selected-text action, Readify sends the selected text to the selected provider. Simplify and Shorten can replace the selection with the response. Ask about selected text also sends the user's follow-up question and displays the answer on the page.

The corresponding user-entered API key is sent in the request to the selected provider: Google Gemini, Groq, or xAI. Readify sends these requests directly from the extension and does not operate a proxy, developer backend, account system, analytics service, or telemetry service. Readify does not sell or share data with third parties of its own. The selected provider may process, retain, or log requests under its own terms and privacy policy.

Readify can inspect the page DOM locally in order to apply the user's presentation settings. It does not upload page text merely because the content script is present or because a reading setting is applied.

## Retention and deletion

Local settings and API keys remain in the browser's extension storage until changed or removed. The latest whole-page result remains there until replaced or cleared from Readify. Selected-text responses are used for the current action and are not saved by Readify as a separate history.

Readify has no uninstall callback or separate Readify server database. Extension-local data is managed by the browser and is normally removed when the extension is uninstalled. Exported files and data already sent to an AI provider are outside Readify's control and must be deleted through the relevant file system or provider account/service.

## Permissions and website access

Readify runs its content script on supported websites to adjust text presentation and respond to user-initiated selected-text or whole-page actions. It uses the `storage`, `tabs`, and `contextMenus` permissions for local settings, active-tab messaging, and context-menu actions. It requests access to the three provider API hosts only to make the corresponding direct AI requests.

## Contact and source

The Firefox add-on identifier and release contact are `readify@jasonsun.dev`. The source repository is [github.com/cryojs/readify](https://github.com/cryojs/readify). No separate Readify website or hosted privacy-policy service is required for the extension to function.

This policy may need to be published at a stable public URL before store submission if a browser store requires a hosted privacy policy.
