# Readify source-code review guide

## Requirements

- Node.js 22 or newer. The installed WXT release declares Node.js `>=22`.
- npm with support for the repository's `lockfileVersion: 3`; npm 9.2.0 was used for the release validation in this environment.
- A network connection for `npm ci` unless the required npm cache is already available.

The project does not require a Readify account, provider account for non-AI features, or environment variables. AI testing requires a reviewer-owned Gemini, Groq, or Grok (xAI) API key entered in the extension UI.

## Reproducible commands

From the repository root:

```sh
npm ci
npm run compile
npm run build
npm run build:firefox
npm run zip
npm run zip:firefox
```

`npm run compile` runs TypeScript with `--noEmit`. There is no separate test, lint, or formatter script in `package.json`.

## Build outputs

The default `npm run build` produces the Chromium MV3 extension in:

```text
.output/chrome-mv3/
```

This directory can be loaded in Chrome or Edge. `npm run build:firefox` produces the Firefox build in:

```text
.output/firefox-mv2/
```

Load `.output/firefox-mv2/manifest.json` for a temporary Firefox installation. The Firefox manifest includes the stable ID and data-collection declarations configured in `wxt.config.ts`.

The release ZIP commands use WXT's default artifact naming. For version 1.0.0, verify the exact generated files under `.output/`; the expected names are:

```text
.output/readify-1.0.0-chrome.zip
.output/readify-1.0.0-firefox.zip
.output/readify-1.0.0-sources.zip
```

The sources archive is produced with the Firefox ZIP by WXT's default packaging behavior. It is a review artifact, not a third browser package.

If the installed WXT version changes its artifact template, use the names printed by the command and record them with the release artifact.

## Generated files and review scope

`.output/`, `.wxt/`, and `node_modules/` are generated or installed directories and are ignored by Git. Review the tracked source, manifest configuration, package files, and documentation. Do not commit generated build directories or archives unless a distribution workflow explicitly requires them.

Before submission, inspect both generated manifests for:

- `name: Readify` and `version: 1.0.0`;
- only the permissions used by the implementation, plus WXT-derived content-script website access;
- the three declared provider API hosts;
- Firefox ID `readify@jasonsun.dev`;
- Firefox required data categories `websiteContent` and `authenticationInfo`; and
- no API key, token, password, or other bundled credential.

The repository has no `LICENSE` file. Licensing should be decided before distribution if required by the publisher or store.
