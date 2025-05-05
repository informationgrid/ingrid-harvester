import {
  Directive,
  ElementRef,
  Input,
  OnInit,
  ViewContainerRef,
} from '@angular/core';
import {ContextHelpButtonComponent} from "./context-help-button/context-help-button.component";
import {ContextHelpService} from "../../services/contextHelp.service";

@Directive({
  selector: 'button[contextHelp],mat-icon[contextHelp],mat-card-header[contextHelp],h2[contextHelp],aside[contextHelp]',
  standalone: true
})
export class ContextHelpDirective implements OnInit {
  @Input('contextHelp') helpKey?: string;

  constructor(
    private contextHelpService: ContextHelpService,
    private viewContainerRef: ViewContainerRef,
    private el: ElementRef,
  ) {}

  ngOnInit() {
    if (!this.helpKey) return;
    const element = this.el.nativeElement as HTMLElement;

    if (element.tagName === 'BUTTON') {
      this.addEventListenerToElement(element);
    } else if (element.tagName === 'MAT-ICON') {
      this.addEventListenerToElement(element);
      element.classList.add('context-help-icon')
      element.setAttribute('tabindex', '0');
      element.setAttribute('role', 'button');
      element.setAttribute('aria-label', 'Eingabehilfe');
      element.setAttribute('aria-hidden', 'false');
      element.setAttribute('aria-haspopup', 'dialog');
    } else if (element.tagName === 'MAT-CARD-HEADER') {
      this.addEventListenerToElement(element);
      this.prependIconComponentToElement(element);
      const cardTitle = element.querySelector('mat-card-title');
      cardTitle?.classList.add('title-with-context-help');
    } else if (element.tagName === 'H2') {
      this.addEventListenerToElement(element);
      this.prependIconComponentToElement(element);
      element.classList.add('title-with-context-help');
    } else if (element.tagName === 'ASIDE') {
      this.contextHelpService.get(this.helpKey).subscribe(response => {
        const helpHtml = response.htmlContent;
        const container = document.createElement('div');
        container.innerHTML = helpHtml;
        element.appendChild(container);
      });
    }
  }

  prependIconComponentToElement(element: HTMLElement) {
    const contextHelpIcon = this.viewContainerRef.createComponent(ContextHelpButtonComponent);
    contextHelpIcon.instance.helpKey = this.helpKey;
    element.prepend(contextHelpIcon.location.nativeElement);
  }

  addEventListenerToElement(element: HTMLElement) {
    element.addEventListener('click', (event: MouseEvent) => this.showHelp(event));
    element.addEventListener('keydown', (event: KeyboardEvent) => {
      if (event.key === 'Enter') this.showHelp(event);
    });
  }

  showHelp(event: Event) {
    this.contextHelpService.show(this.helpKey);
    event.stopImmediatePropagation();
  }

}
