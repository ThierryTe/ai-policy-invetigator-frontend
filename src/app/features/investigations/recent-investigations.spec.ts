import { HttpErrorResponse } from '@angular/common/http';
import { firstValueFrom, of, throwError } from 'rxjs';
import { Progress } from '../../core/contracts';
import { authorizedRecent } from './recent-investigations';
const progress = (id: string): Progress => ({
  id,
  state: 'COMPLETED',
  stage: 'COMPLETED',
  error_code: null,
  attempts: 1,
  calls: 5,
  metered_calls: 5,
  prompt_tokens: 1,
  completion_tokens: 1,
  latency_ms: 1,
});
describe('Authorized current-session Overview', () => {
  it('rechecks every known ID using the existing progress route and preserves recency order', async () => {
    const query = vi.fn((id: string) => of(progress(id)));
    const rows = await firstValueFrom(
      authorizedRecent({ progress: query }, [
        { id: 'new', label: 'Newest' },
        { id: 'old', label: 'Older' },
      ]),
    );
    expect(query.mock.calls.map((call) => call[0])).toEqual(['new', 'old']);
    expect(rows.map((row) => row.id)).toEqual(['new', 'old']);
  });
  it('never presents cached labels whose current scope is inaccessible', async () => {
    const rows = await firstValueFrom(
      authorizedRecent(
        {
          progress: (id: string) =>
            id === 'revoked'
              ? throwError(() => new HttpErrorResponse({ status: 404 }))
              : of(progress(id)),
        },
        [
          { id: 'revoked', label: 'Private previous label' },
          { id: 'visible', label: 'Visible' },
        ],
      ),
    );
    expect(rows).toHaveLength(1);
    expect(rows[0].id).toBe('visible');
  });
  it('does not misrepresent network failure as an empty investigation history', async () => {
    await expect(
      firstValueFrom(
        authorizedRecent(
          { progress: () => throwError(() => new HttpErrorResponse({ status: 0 })) },
          [{ id: 'known', label: 'Known' }],
        ),
      ),
    ).rejects.toBeInstanceOf(HttpErrorResponse);
  });
  it('makes no discovery requests when no session IDs are known', async () => {
    const query = vi.fn(() => of(progress('unexpected')));
    expect(await firstValueFrom(authorizedRecent({ progress: query }, []))).toEqual([]);
    expect(query).not.toHaveBeenCalled();
  });
});
