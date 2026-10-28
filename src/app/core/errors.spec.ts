import { HttpErrorResponse } from '@angular/common/http';
import { message } from './errors';
describe('Safe HTTP errors', () => {
  it('does not expose arbitrary server details or credentials', () =>
    expect(
      message(
        new HttpErrorResponse({
          status: 500,
          error: { detail: 'private exception text', code: '<script>raw</script>' },
        }),
      ),
    ).not.toContain('private'));
  it('handles a network failure', () =>
    expect(message(new HttpErrorResponse({ status: 0 }))).toContain('connection'));
  it('does not distinguish hidden resources from absent resources', () =>
    expect(message(new HttpErrorResponse({ status: 404 }))).toContain('unavailable'));
  it('explains consent failures without an invented success state', () =>
    expect(
      message(
        new HttpErrorResponse({ status: 409, error: { code: 'EXTERNAL_PROCESSING_DENIED' } }),
      ),
    ).toContain('administrator'));
});
