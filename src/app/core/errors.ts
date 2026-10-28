import { HttpErrorResponse } from '@angular/common/http';
export function message(error: unknown): string {
  if (!(error instanceof HttpErrorResponse))
    return 'This request could not be completed. Please try again.';
  if (error.status === 0) return 'Cannot reach the server. Check your connection and try again.';
  if (error.status === 401) return 'Your session has ended. Sign in again to continue.';
  if (error.status === 403) return 'Your current permissions do not allow this action.';
  if (error.status === 404) return 'This resource is unavailable or your access has changed.';
  if (error.status === 429) return 'Too many requests. Wait a moment before trying again.';
  if (error.status === 413) return 'This PDF is too large. Choose a file no larger than 10 MB.';
  if (error.status === 415) return 'Choose a valid PDF document.';
  const codes: Record<string, string> = {
    EXTERNAL_PROCESSING_DENIED:
      'An owning-department administrator must allow external processing for every selected document.',
    VERSION_NOT_INDEXED: 'Wait for all selected documents to finish ingestion.',
    STALE_PREDECESSOR: 'A newer version already exists. Refresh the version history.',
    INVALID_POLICY_LINEAGE: 'Choose a replacement that directly follows the baseline.',
    VERSION_NOT_EFFECTIVE:
      'The analysis date must be on or after each selected version’s effective date.',
    REVIEW_PERMISSION_REQUIRED:
      'Review requires current Reviewer or Admin membership in the policy’s department.',
    UNVERIFIED_GRAPH_DATA: 'The stored graph could not be verified. Contact your administrator.',
    INVALID_CREDENTIALS: 'The email or password was not accepted.',
  };
  if (typeof error.error?.code === 'string' && codes[error.error.code])
    return codes[error.error.code];
  if (error.status === 400) return 'Check the required fields and try again.';
  if (error.status === 409)
    return 'The document or investigation state has changed. Refresh and try again.';
  return 'The server could not complete this request. Please try again later.';
}
