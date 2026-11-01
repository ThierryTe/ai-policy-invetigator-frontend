# AI Policy Investigator hackathon recording

The first execution is **blocked**: no production frontend/investigation link or authorized production session was supplied. No video was created, and no actual duration is available. The connected browser has no available application session. Local fixture credentials belong to a separate investigation and were not substituted for production.

`demo-timeline.md` and `demo-voiceover.md` are **drafts**, based on the requested scenario and inspected application source. They are not a report of a completed recording. A successful run replaces them with the actual scene timings and selected-feature narration, and writes `recording-status.json` and `recording-metadata.json`.

## Reproduce from the frontend repository root

Use the existing completed investigation's full shared URL and an existing private credentials file. Do not paste credentials into command arguments or this directory.

```sh
DEMO_RECORD=1 \
DEMO_INVESTIGATION_URL='https://YOUR-PRODUCTION-HOST/investigations/EXISTING-INVESTIGATION-UUID' \
DEMO_CREDENTIALS_FILE='/absolute/path/to/existing/private/credentials.json' \
node_modules/.bin/playwright test e2e/demo-recording.spec.ts --workers=1
```

Replace both placeholders with the real values. The credentials file has `email` and `password` fields; existing E2E fixture files with `viewer`/`actor` and `password` are also supported. `DEMO_ACCOUNT=actor` selects an authorized actor explicitly. Credentials are read in memory and are never written to the artifacts. No accounts are provisioned.

Alternatively, supply `DEMO_BASE_URL` and `DEMO_INVESTIGATION_ID`. For an existing Playwright authentication fixture, use `DEMO_STORAGE_STATE=/private/path/storage-state.json` and, when applicable, `DEMO_SESSION_FILE=/private/path/session.json` instead of the credentials file. The latter contains the app's existing `ai-policy-investigator.session` object (`token`, `expiresAt`). The app verifies restored identity with the real backend. Older deployed frontends without session restoration require credentials.

For a quick feature preflight, replace `DEMO_RECORD=1` with `DEMO_DISCOVER_ONLY=1` in the same command. This loads the existing investigation, reads its actual results, checks source navigation and populated policy version history, and produces `feature-discovery.json` and a privacy-masked `preflight.png`. It does not record a video. The final recording checks the requested **8 / 5 / 2 / 100%** metrics before narration, so a different investigation cannot silently inherit those claims.

No dependencies are added. The existing `@playwright/test`, Chromium and Playwright-bundled FFmpeg are used. On macOS the encoder is found in `~/Library/Caches/ms-playwright/ffmpeg-*`; `DEMO_FFMPEG=/absolute/path/to/ffmpeg` can override it. Run the command with browser-launch and network access permitted in your execution environment. The existing Playwright configuration is reused; its normal tests remain opt-in and untouched.

## Artifacts

All paths are relative to the repository root:

- `demo-artifacts/ai-policy-investigator-demo.webm` — **not yet created**; on success, one continuous 180-second 1920×1080 walkthrough, without audio.
- `demo-artifacts/demo-timeline.md` — proposed scene timings until a successful run writes actual timings.
- `demo-artifacts/demo-voiceover.md` — complete English narration for a separate voiceover; not embedded audio.
- `demo-artifacts/recording-status.json` — blocked/complete status of the latest configured run.
- `demo-artifacts/recording-metadata.json` — created only after successful video verification; includes actual duration, dimensions, size, source, omissions and scenes.
- `demo-artifacts/feature-discovery.json` — actual accessible feature inventory after a successful preflight.
- `demo-artifacts/preflight.png`, `demo-artifacts/closing-frame.png` — privacy-masked visual review frames, when those stages complete.
- `e2e/demo-recording.spec.ts` — the focused recording script.

The recorder authenticates and prepares the view before the walkthrough. Only that setup lead-in and trailing setup time are trimmed using the installed encoder. There are no internal cuts, speed changes, mocked data, substituted results, or deployments. Authentication/setup footage stays in a private temporary directory and is removed on completion or failure. Account email/avatar details are hidden in the browser for privacy. All business data remains unchanged.

## Feature inspection and scope

Inspected routes and implementation: investigation dashboard, classification filter/pager, finding Overview/Evidence/Impact/History tabs, source excerpt lookup, authenticated PDF viewer, graph Expand/Fit/Focus controls, policy document library/version history, and Evaluations. Live production availability remains unverified until the link and access are supplied.

- The opening scene is the loaded completed investigation workspace. The Investigations directory has no server history/list endpoint, so the recording uses the shared link and avoids its empty session-history view.
- The recorder chooses the access/training contradiction by scoring actual stored findings. It shows severity, explanation, proposal, citations, impact, expanded/focused graph, an accessible missing requirement, and populated source policy history.
- Optional unavailable controls/features are skipped and documented. Narration uses alternatives for unavailable source navigation, impact, graph, missing-finding and policy-history features.
- Evaluations is omitted: the implementation explicitly says there is no evaluation feed or live accuracy score. Settings/account details and empty Evidence search are omitted.
- Evidence coverage is described as source coverage, never AI accuracy. Suggestions require human review. No Confirm, Dismiss, Add note, upload, consent, or investigation-start action is clicked. Requests to mutate `/api/` resources are blocked except the existing login endpoint.
- History is omitted to avoid displaying reviewer identities. PDF viewing is available in source but source-excerpt traceability is the chosen recording sequence; no blank PDF loader is included.
- A localhost run is labeled **Local preview; not production** in its artifacts. It never establishes that the latest frontend is deployed.

## Execution result in this environment

Executed:

```sh
DEMO_RECORD=1 node_modules/.bin/playwright test e2e/demo-recording.spec.ts --workers=1
```

Playwright loaded and ran the new spec. It failed at the explicit configuration guard:

```text
Set DEMO_BASE_URL and DEMO_INVESTIGATION_ID, or DEMO_INVESTIGATION_URL, to the existing completed investigation.
```

The smallest fix is to supply the production investigation's shared URL and the path to authorized private credentials/session, then run the reproduction command above. No production authentication was attempted and no production records were changed. A separate local-only discovery attempt was interrupted without producing a recording; it does not verify production access. A standalone TypeScript check could not run because this checkout does not contain `@types/node`; no dependency was installed. Playwright itself successfully parsed and executed the spec.

Recording API reference: [Playwright videos](https://playwright.dev/docs/videos). The recorder explicitly sets both viewport and video size and closes the context to finalize the video.
