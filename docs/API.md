# Actual backend endpoints used by the frontend

Base URL is the same origin, `/api`. Contract source: backend `docs/api/phase4.md`,
Phase 2/3 contracts and current controllers, inspected October 27, 2026.

| Method/path                                                  | Frontend use                                                                      |
| ------------------------------------------------------------ | --------------------------------------------------------------------------------- |
| POST `/api/auth/login`                                       | Email/password → token, expiresIn, tokenType                                      |
| GET `/api/auth/me`                                           | Current user and department memberships                                           |
| GET `/api/policies?page=N`                                   | Current authorized page, at most 25 policies                                      |
| GET `/api/policies/{id}/versions`                            | Immutable version history and ingestion status                                    |
| POST `/api/policies`                                         | PDF multipart: file/title/kind/departmentId/effectiveDate; UUID Idempotency-Key   |
| POST `/api/policies/{id}/versions`                           | PDF multipart: file/previousVersionId/effectiveDate; UUID Idempotency-Key         |
| GET `/api/jobs/{id}`                                         | Durable ingestion polling                                                         |
| POST `/api/policies/{id}/external-processing`                | Explicit owning-department ADMIN consent `{allowed}`                              |
| POST `/api/investigations`                                   | Baseline/replacement/procedure version IDs and analysisDate; UUID Idempotency-Key |
| GET `/api/investigations/{id}`                               | Persisted state/stage/safe error/attempts/calls/token usage/latency               |
| GET `/api/investigations/{id}/requirements`                  | Extraction checkpoints with metadata and exact references                         |
| GET `/api/investigations/{id}/findings`                      | Complete/incomplete variant, immutable AI payload, canReview and review overlays  |
| GET `/api/investigations/{id}/graph`                         | Persisted authorized nodes and directed edges                                     |
| GET `/api/evidence/{id}`                                     | Exact source excerpt/version/policy/page/Unicode offsets                          |
| GET `/api/policies/{id}/versions/{version}/content`          | Authenticated PDF bytes, converted to temporary browser blob                      |
| POST `/api/investigations/{id}/findings/{findingId}/reviews` | CONFIRM, DISMISS, ADD_NOTE and optional/required note                             |

`core/contracts.ts` contains the TypeScript wire types. Field names are not silently
normalized: SQL views keep snake_case; request records and review/graph DTOs keep
camelCase. Findings distinguish absence of a published assessment from a completed
NO_CONFLICT. Read access to every contributing version is required for an entire
investigation, even if only one finding is selected. A 404 clears unavailable data;
a 401 ends the session. Backend role/grant checks take precedence over UI visibility.

Recent investigation IDs exist only in current-session memory; no unsupported
history-list API is called. No evaluation/report-export/notification endpoint exists.
Mutation requests are not automatically retried, particularly review POSTs, where
each successful request appends a new audit event.

Overview uses the same existing `GET /api/investigations/{id}` route to revalidate
known current-session IDs. It does not call `GET /api/investigations` (no such list
route exists). Forbidden/missing IDs are omitted; network errors remain errors.
Server-wide recency and discovery after a new login remain unsupported, rather than
being fabricated from static IDs or a new backend route.
