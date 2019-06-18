import { NgModule } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';

import { CronGenComponent } from './cron-editor.component';
import { TimePickerComponent } from './cron-time-picker.component';
import { MatCheckboxModule } from "@angular/material/checkbox";
import { MatOptionModule } from "@angular/material/core";
import { MatFormFieldModule } from "@angular/material/form-field";
import { MatInputModule } from "@angular/material/input";
import { MatRadioModule } from "@angular/material/radio";
import { MatSelectModule } from "@angular/material/select";
import { MatTabsModule } from "@angular/material/tabs";
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';

@NgModule({
    imports: [CommonModule, FormsModule, MatTabsModule, MatSelectModule, MatOptionModule, MatFormFieldModule, MatRadioModule, MatCheckboxModule, MatInputModule, BrowserAnimationsModule],
    exports: [CronGenComponent, TimePickerComponent],
    declarations: [CronGenComponent, TimePickerComponent]
})
export class CronEditorModule {
}
