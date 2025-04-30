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
  selector: 'mat-card-header[contextHelp],mat-label[contextHelp],h2[contextHelp],div[contextHelp],mat-icon[contextHelp],aside[contextHelp],button[contextHelp]',
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

    if (element.tagName === 'MAT-ICON') {
      element.classList.add('context-help-icon')
      element.addEventListener('click', (event: MouseEvent) => this.showHelp(event));
      element.addEventListener('keydown', (event: KeyboardEvent) => {
        if (event.key === 'Enter') this.showHelp(event);
      });
      element.setAttribute('tabindex', '0');
      element.setAttribute('role', 'button');
      element.setAttribute('aria-label', 'Eingabehilfe');
      element.setAttribute('aria-hidden', 'false');
      element.setAttribute('aria-haspopup', 'dialog');
    } else if (element.tagName === 'MAT-CARD-HEADER') {
      const contextHelpButton = this.viewContainerRef.createComponent(ContextHelpButtonComponent);
      contextHelpButton.instance.helpKey = this.helpKey;
      element.appendChild(contextHelpButton.location.nativeElement);
      const cardTitle = element.querySelector('mat-card-title');
      if (this.helpKey && cardTitle) {
        cardTitle.addEventListener('click', (event: MouseEvent) => this.showHelp(event));
        cardTitle.classList.add('title-with-context-help')
      }
    } else if (element.tagName === 'DIV') {
      const contextHelpButton = this.viewContainerRef.createComponent(ContextHelpButtonComponent);
      contextHelpButton.instance.helpKey = this.helpKey;
      element.appendChild(contextHelpButton.location.nativeElement);
      if (this.helpKey) {
        element.addEventListener('click', (event: MouseEvent) => this.showHelp(event));
        element.classList.add('title-with-context-help')
      }
    } else if (element.tagName === 'H2') {
      const contextHelpButton = this.viewContainerRef.createComponent(ContextHelpButtonComponent);
      contextHelpButton.instance.helpKey = this.helpKey;
      element.parentNode.insertBefore(contextHelpButton.location.nativeElement, element);
      if (this.helpKey) {
        element.addEventListener('click', (event: MouseEvent) => this.showHelp(event));
        element.classList.add('title-with-context-help')
      }
    } else if (element.tagName === 'MAT-LABEL') {
      const contextHelpButton = this.viewContainerRef.createComponent(ContextHelpButtonComponent);
      contextHelpButton.instance.helpKey = this.helpKey;
      element.appendChild(contextHelpButton.location.nativeElement);
    } else if (element.tagName === 'ASIDE') {
      // const contextAsHtml = this.getContextAsHtml()
      // element.appendChild(contextAsHtml)
      this.contextHelpService.get(this.helpKey).subscribe(response => {
        const helpHtml = response.htmlContent;
        const container = document.createElement('div');
        container.innerHTML = helpHtml;
        element.appendChild(container);
      });
    } else if (element.tagName === 'BUTTON') {
      element.addEventListener('click', (event: MouseEvent) => this.showHelp(event));
      element.addEventListener('keydown', (event: KeyboardEvent) => {
        if (event.key === 'Enter') this.showHelp(event);
      });
    }

  }

  showHelp(event: Event) {
    this.contextHelpService.show(this.helpKey);
    event.stopImmediatePropagation();
  }

}
