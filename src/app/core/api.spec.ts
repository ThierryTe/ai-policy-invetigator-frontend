import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { Api } from './api';
describe('Backend wire contracts', () => {
  let api: Api, mock: HttpTestingController;
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    api = TestBed.inject(Api);
    mock = TestBed.inject(HttpTestingController);
  });
  afterEach(() => mock.verify());
  it('sends PDF multipart with an idempotency key without overriding the boundary', () => {
    const body = new FormData();
    body.append('file', new Blob(['synthetic'], { type: 'application/pdf' }));
    api.upload(body, undefined, '00000000-0000-4000-8000-000000000001').subscribe();
    const request = mock.expectOne('/api/policies');
    expect(request.request.headers.get('Idempotency-Key')).toBe(
      '00000000-0000-4000-8000-000000000001',
    );
    expect(request.request.headers.has('Content-Type')).toBe(false);
    request.flush({});
  });
  it('uses the exact investigation-scoped review route and JSON action', () => {
    api.review('investigation', 'finding', 'ADD_NOTE', 'Source owner contacted').subscribe();
    const r = mock.expectOne('/api/investigations/investigation/findings/finding/reviews');
    expect(r.request.method).toBe('POST');
    expect(r.request.body).toEqual({ action: 'ADD_NOTE', note: 'Source owner contacted' });
    r.flush({});
  });
  it('fetches PDF bytes with HttpClient rather than a token-bearing URL', () => {
    api.pdf('policy', 'version').subscribe();
    const r = mock.expectOne('/api/policies/policy/versions/version/content');
    expect(r.request.responseType).toBe('blob');
    r.flush(new Blob(['%PDF-1.4'], { type: 'application/pdf' }));
  });
});
