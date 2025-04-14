import {
  Directive,
  ElementRef,
  Input,
  OnInit,
  ViewContainerRef,
} from '@angular/core';
import {ContextHelpButtonComponent} from "./context-help-button/context-help-button.component";

@Directive({
  selector: 'mat-card-header[contextHelp],mat-label[contextHelp]',
  standalone: true
})
export class CardHelpDirective implements OnInit {
  @Input('contextHelp') helpKey?: string;

  constructor(
    private viewContainerRef: ViewContainerRef,
    private el: ElementRef,
  ) {}

  ngOnInit() {
    if (!this.helpKey) return;
    const element = this.el.nativeElement as HTMLElement;
    const ref = this.viewContainerRef.createComponent(ContextHelpButtonComponent);
    ref.instance.helpKey = this.helpKey;

    element.appendChild(ref.location.nativeElement);
  }

}
