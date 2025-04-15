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
  selector: 'mat-card-header[contextHelp],mat-label[contextHelp],h2[contextHelp],div[contextHelp]',
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
    const ref = this.viewContainerRef.createComponent(ContextHelpButtonComponent);
    ref.instance.helpKey = this.helpKey;



    if (element.tagName === 'MAT-CARD-HEADER') {
      element.appendChild(ref.location.nativeElement);
      const cardTitle = element.querySelector('mat-card-title');
      if (this.helpKey && cardTitle) {
        cardTitle.addEventListener('click', () => this.showHelp());
        cardTitle.classList.add('title-with-context-help')
      }
    } else if (element.tagName === 'DIV') {
      element.appendChild(ref.location.nativeElement);
      if (this.helpKey) {
        element.addEventListener('click', () => this.showHelp());
        element.classList.add('title-with-context-help')
      }
    } else if (element.tagName === 'H2') {
      element.parentNode.insertBefore(ref.location.nativeElement, element);
      if (this.helpKey) {
        element.addEventListener('click', () => this.showHelp());
        element.classList.add('title-with-context-help')
      }
    } else if (element.tagName === 'MAT-LABEL') {
      element.appendChild(ref.location.nativeElement);
    }

  }

  showHelp() {
    this.contextHelpService.show(this.helpKey)
  }
}
