# Phase 5 contribution record

This separate frontend was authored for AI Policy Investigator during the approved
Phase 5 implementation on October 27, 2026. It is intended for
`https://github.com/ThierryTe/ai-policy-investigator-frontend`; the owner initializes
and publishes the repository. No Git operation or GitHub repository creation occurred.

- Angular CLI 21.2.28 generated the initial workspace configuration, bootstrap,
  package manifests, editor settings and ignore files with `--skip-git`.
  CLI scaffolding and Angular dependencies are pre-existing infrastructure, not
  claimed as newly invented hackathon functionality.
- Newly authored: policy-investigation API types/client, memory-only session boundary,
  domain dashboard, persisted graph projection/presentation, document/consent/version
  workflows, source PDF access, human reviews/history, responsive styling, focused
  tests, real browser workflow, independent deployment and documentation.
- The approved user-provided dashboard mockup supplies visual direction. Static SVG
  icons/logo were drawn in this workspace; no external image/font assets are needed.
- Backend controllers and `docs/api/phase4.md` were inspected as the authoritative
  integration contract. The backend source/deployment were not edited. The optional
  browser fixture script imports the new backend project's existing local operator/PDF
  fixture helpers at runtime; it is not shipped in the browser or Docker image.
- Neither `spring-ai-rag` nor `spring-ai-rag-frontend` source was imported into this
  frontend. No credentials, dotenv data, private documents, old RAG prompts or
  OpenAI-specific reasoning was copied. Existing backend provenance remains intact.
- Committed verification material uses only synthetic documents and actual backend/
  Muse responses. Unit-test fixtures are explicitly separate from real browser results.

Review `docs/source-files.csv` for the exact source/config/test/documentation inventory
and hashes. Dependencies, distribution files, private browser fixtures, logs, caches
and Git history are excluded. Source dependencies retain their package licenses;
Angular emits runtime third-party license notices during production builds.

## Focused pre-VPS follow-up — October 28, 2026

Newly authored frontend work: authorization-rechecked known-session Overview rows,
fit-to-view measurement/controls around the unchanged graph layout, focused tests
and a repeatable real-demo guide. Existing session memory, HttpClient APIs, auth,
backend synthetic PDFs and browser workflow are reused. No backend source/config/API,
frontend authentication, dependency, deployment or approved palette/layout changed.
The real replay and citation checks are recorded separately in
`focused-demo-verification.json`; earlier Phase 5 evidence is preserved.
