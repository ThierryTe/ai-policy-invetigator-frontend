import { effect, inject, Injectable, signal } from '@angular/core';
import { Auth } from './auth';
@Injectable({ providedIn: 'root' })
export class Workspace {
  readonly recent = signal<{ id: string; label: string }[]>([]);
  private readonly auth = inject(Auth);
  constructor() {
    effect(() => {
      this.auth.revision();
      this.recent.set([]);
    });
  }
  remember(id: string, label: string) {
    this.recent.update((rows) => [{ id, label }, ...rows.filter((r) => r.id !== id)].slice(0, 15));
  }
}
