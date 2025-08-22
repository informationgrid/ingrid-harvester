import {Component, Input} from '@angular/core';
import {MatIcon} from "@angular/material/icon";
import {MatSuffix} from "@angular/material/form-field";
import {ContextHelpService} from "../../../services/contextHelp.service";
import {MatTooltip} from "@angular/material/tooltip";

@Component({
    selector: 'app-context-help-button',
    imports: [
        MatIcon,
        MatTooltip,
        MatSuffix
    ],
    templateUrl: './context-help-button.component.html',
    styleUrl: './context-help-button.component.scss'
})
export class ContextHelpButtonComponent {
  @Input() helpKey = '';

  constructor(private contextHelpService: ContextHelpService,) {
  }

  showHelp() {
    this.contextHelpService.show(this.helpKey)

  }
}
