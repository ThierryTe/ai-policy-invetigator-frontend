import { inject, Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { exhaustMap, takeWhile, timer } from 'rxjs';
import * as C from './contracts';
@Injectable({ providedIn: 'root' })
export class Api {
  private readonly http = inject(HttpClient);
  policies(page = 0) {
    return this.http.get<C.Policy[]>('/api/policies', { params: { page } });
  }
  policy(id: string) {
    return this.http.get<C.Policy>(`/api/policies/${id}`);
  }
  versions(id: string) {
    return this.http.get<C.Version[]>(`/api/policies/${id}/versions`);
  }
  upload(data: FormData, policyId?: string, key = crypto.randomUUID()) {
    return this.http.post<C.Upload>(
      policyId ? `/api/policies/${policyId}/versions` : '/api/policies',
      data,
      { headers: new HttpHeaders({ 'Idempotency-Key': key }) },
    );
  }
  pollJob(id: string) {
    return timer(0, 1500).pipe(
      exhaustMap(() => this.http.get<C.IngestionJob>(`/api/jobs/${id}`)),
      takeWhile((j) => !['COMPLETED', 'FAILED'].includes(j.status), true),
    );
  }
  consent(id: string, allowed: boolean) {
    return this.http.post<void>(`/api/policies/${id}/external-processing`, { allowed });
  }
  start(body: C.InvestigationCreate, key = crypto.randomUUID()) {
    return this.http.post<{ id: string; state: 'QUEUED' }>('/api/investigations', body, {
      headers: new HttpHeaders({ 'Idempotency-Key': key }),
    });
  }
  progress(id: string) {
    return this.http.get<C.Progress>(`/api/investigations/${id}`);
  }
  findings(id: string) {
    return this.http.get<C.Findings>(`/api/investigations/${id}/findings`);
  }
  requirements(id: string) {
    return this.http.get<C.Extraction[]>(`/api/investigations/${id}/requirements`);
  }
  graph(id: string) {
    return this.http.get<C.ImpactGraph>(`/api/investigations/${id}/graph`);
  }
  evidence(id: string) {
    return this.http.get<C.Evidence>(`/api/evidence/${id}`);
  }
  pdf(policy: string, version: string) {
    return this.http.get(`/api/policies/${policy}/versions/${version}/content`, {
      responseType: 'blob',
    });
  }
  review(id: string, finding: string, action: C.ReviewAction, note: string | null) {
    return this.http.post<C.ReviewState>(`/api/investigations/${id}/findings/${finding}/reviews`, {
      action,
      note,
    });
  }
}
