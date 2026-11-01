# AI Policy Investigator — Angular frontend

Angular 21 frontend for policy-change investigations, PDF evidence, impact graphs and
human review. Built for the Meta Global AI Developer Hackathon 2026.

| Main documentation | Contents |
|---|---|
| [Project README](https://github.com/ThierryTe/ai-policy-invetigator/blob/main/README.md) | Problem, solution, Meta Muse Spark, demo assets and limits |
| [Architecture](https://github.com/ThierryTe/ai-policy-invetigator/blob/main/docs/ARCHITECTURE.md) | Frontend/backend, AI flow, data, security and infrastructure |
| [Testing](https://github.com/ThierryTe/ai-policy-invetigator/blob/main/docs/TESTING.md) | Judge walkthrough, local account, reproduction and recorded evaluation |

## Run locally

Use Node 22 and npm 11.8.0. Start the dedicated backend and prepare its local account
using the [testing guide](https://github.com/ThierryTe/ai-policy-invetigator/blob/main/docs/TESTING.md#local-setup), then:

```sh
npm ci
npm start
```

Open `http://127.0.0.1:4200`; the existing proxy forwards `/api` to backend port 18080.
Alternatively, `docker compose up --build -d --wait` serves the frontend at
`http://127.0.0.1:18081`. No Meta key belongs in the frontend. There is no default password.

## Verify and inspect

- Local checks: `npm test` and `npm run build`. Real browser workflows are separate,
  explicit runs described in [Testing](https://github.com/ThierryTe/ai-policy-invetigator/blob/main/docs/TESTING.md#regression-and-browser-checks).
- [Authentication](docs/AUTHENTICATION.md): tab-scoped session restoration and current-identity verification.
- [Release review](docs/AUTH_RELEASE_REVIEW.md): security checks and historical delivery limits.
- [Provenance](docs/PROVENANCE.md) and [historical verification](docs/VERIFICATION.md): attribution and dated evidence.
- [Recording instructions](https://github.com/ThierryTe/ai-policy-invetigator/blob/main/docs/TESTING.md#recording-an-existing-investigation) and [retained status](demo-artifacts/recording-status.json): no video has been created.

Historical reports/screenshots do not prove current production availability. Remote Work
remains unvalidated; the existing automated fixture tests training/access policies.
The current pipeline is documented in the backend's
[production guide](https://github.com/ThierryTe/ai-policy-invetigator/blob/main/docs/PRODUCTION_PIPELINE.md).
