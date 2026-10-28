import { AfterViewInit, DestroyRef, Directive, ElementRef, inject } from '@angular/core';
/** Focus stays in a modal; restored to its trigger when the modal closes. */
@Directive({ selector: '[appModal]', host: { '(keydown)': 'trap($event)', tabindex: '-1' } })
export class Modal implements AfterViewInit {
  private readonly element = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;
  private readonly previous = document.activeElement as HTMLElement | null;
  constructor() {
    inject(DestroyRef).onDestroy(() => this.previous?.isConnected && this.previous.focus());
  }
  ngAfterViewInit() {
    queueMicrotask(() => {
      if (!this.element.isConnected) return;
      (
        this.element.querySelector(
          'input:not([type="hidden"]),textarea,select,button',
        ) as HTMLElement | null
      )?.focus();
    });
  }
  trap(event: KeyboardEvent) {
    if (event.key !== 'Tab') return;
    const elements = Array.from(
      this.element.querySelectorAll<HTMLElement>(
        'button:not(:disabled),input:not(:disabled),textarea:not(:disabled),select:not(:disabled),a[href],iframe,[tabindex="0"]',
      ),
    ).filter((e) => e.getClientRects().length);
    if (!elements.length) {
      event.preventDefault();
      this.element.focus();
      return;
    }
    const first = elements[0],
      last = elements.at(-1)!;
    if (
      event.shiftKey &&
      (document.activeElement === first || document.activeElement === this.element)
    ) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  }
}
