import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { FindingPanel } from './finding-panel';
import { Finding } from '../../core/contracts';
describe('Finding presentation safety', () => {
  it('renders untrusted model text as text and hides review controls for read-only users', async () => {
    TestBed.configureTestingModule({
      imports: [FindingPanel],
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    const fixture = TestBed.createComponent(FindingPanel);
    const finding: Finding = {
      id: 'f',
      policyRequirementId: 'r',
      procedureVersionId: 'p',
      relatedProcedureRequirementIds: [],
      classification: 'AMBIGUITY',
      severity: 'LOW',
      rationale: '<img src=x onerror="alert(1)">',
      suggestedAction: null,
      scopeExplanation: 'Unknown scope',
      sourceReferences: [{ sourceId: 's', quote: '<script>secret()</script>' }],
      reviewStatus: 'PENDING_REVIEW',
    };
    fixture.componentRef.setInput('investigationId', 'i');
    fixture.componentRef.setInput('finding', finding);
    fixture.componentRef.setInput('canReview', false);
    fixture.detectChanges();
    await fixture.whenStable();
    expect(fixture.nativeElement.textContent).toContain(finding.rationale);
    expect(fixture.nativeElement.querySelector('img')).toBeNull();
    expect(fixture.nativeElement.querySelector('script')).toBeNull();
    expect(fixture.nativeElement.querySelector('.review-actions')).toBeNull();
  });
});
