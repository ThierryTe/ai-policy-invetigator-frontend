import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Icon } from '../../shared/icon';
@Component({
  selector: 'app-evaluations',
  imports: [RouterLink, Icon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<div class="breadcrumb">
      Workspace<app-icon name="right" /><span>Evaluations</span>
    </div>
    <header class="page-heading">
      <div>
        <h1>Evaluations</h1>
        <p>Evidence quality and model performance</p>
      </div>
    </header>
    <section class="panel empty">
      <app-icon name="chart" />
      <h2>No evaluation feed is available</h2>
      <p>
        This deployment does not publish evaluation results to the dashboard. No live accuracy score
        is available. You can review source coverage and reported usage within an investigation.
      </p>
      <a class="button" routerLink="/investigations">Open an investigation</a>
    </section>`,
})
export class Evaluations {}
