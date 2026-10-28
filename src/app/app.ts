import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { Auth } from './core/auth';
import { Login } from './features/auth/login';
import { Shell } from './shared/shell';
@Component({
  selector: 'app-root',
  imports: [Login, Shell],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: '@if (auth.identity()) {<app-shell/>} @else {<app-login/>}',
})
export class App {
  readonly auth = inject(Auth);
}
