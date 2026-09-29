# Readify 1.0.0 release notes

This release prepares the existing Readify WXT + React extension for Chrome, Firefox, and Edge submission. The release keeps the current reading customization, presets, local settings, whole-page AI actions, selected-text AI actions, and BYOK provider integrations intact.

## Manifest and permissions

The extension manifest keeps the permissions used by the implementation:

| Permission or access | Why Readify uses it |
| --- | --- |
| `storage` | Save local reading settings, per-site overrides, presets, theme preferences, the selected provider, API keys, and the latest whole-page result. |
| `tabs` | Find the active tab for keyboard commands and context-menu actions, and exchange messages with the content script. |
| `contextMenus` | Add Simplify, Shorten, and Ask about selected text actions to the browser context menu. |
| All website host access | Run the content script on supported web pages to apply reading settings, read a user-selected selection, and obtain page text after an explicit whole-page AI action. WXT derives this access from the content script's `<all_urls>` match. |
| `generativelanguage.googleapis.com` | Send a request to the Gemini API when Gemini is selected. |
| `api.groq.com` | Send a request to the Groq API when Groq is selected. |
| `api.x.ai` | Send a request to the xAI API when Grok is selected. |

There are no bundled credentials, account permissions, analytics permissions, or remote Readify service permissions. WXT may add the content-script host access to generated manifests; it is required by the existing page customization feature.

## Firefox data declarations

Firefox builds declare the stable add-on ID `readify@jasonsun.dev`. They also declare the required `websiteContent` and `authenticationInfo` data categories because AI actions can send page or selected text and the user-provided provider key to the provider selected in Readify. Readify does not declare telemetry or technical-interaction collection.

## Provider and data flow

- Reading settings and preferences stay in `browser.storage.local`.
- Whole-page actions request `document.body.innerText` from the content script only after the user starts the action.
- Selected-text actions send the current selection or the follow-up question only after the user invokes the action.
- The selected provider receives the prompt and the corresponding user-entered API key directly from the extension. Readify has no backend proxy.
- Whole-page results are saved locally so the popup can show the latest result again; the user can clear that result.
- Provider retention, logging, and processing are governed by the selected provider's policies.

## Release validation notes

The release checklist is:

```sh
npm ci
npm run compile
npm run build
npm run build:firefox
npm run zip
npm run zip:firefox
```

The commands were run against the release tree with Node.js 22.22.1, npm 9.2.0, and WXT 0.21.4. `npm ci`, `npm run compile`, both builds, and both ZIP commands completed successfully. WXT reported a non-failing warning about a minified chunk larger than 500 kB. Firefox `web-ext lint` reported 0 errors and 0 notices; it reported 4 unsafe-assignment warnings in the generated bundled JavaScript.

The restricted WSL environment stalled the first `npm ci` attempt and emitted the known `UtilBindVsockAnyPort` socket warning during an earlier WXT command. Retrying `npm ci` with network access completed successfully, so this was an environment/network-runner issue rather than a project or lockfile failure. npm reported 6 audit vulnerabilities (1 moderate, 5 high); dependencies were intentionally not changed in this release-preparation pass.

Inspect both generated `manifest.json` files for `Readify`, version `1.0.0`, the expected permissions and API hosts, Firefox ID/data declarations, and the absence of credentials. Confirm that the generated Chrome and Firefox ZIPs contain no secrets.

The repository contains the required 16, 32, 48, 96, and 128 pixel icons. They are unchanged in this release. There is no repository test or lint script; `npm run compile` is the available TypeScript validation command.

Store submission still requires the publisher's final account, store URLs, screenshots/artwork review, and a publicly hosted privacy-policy URL if a store requires one. This repository does not invent those external URLs or publish them.
