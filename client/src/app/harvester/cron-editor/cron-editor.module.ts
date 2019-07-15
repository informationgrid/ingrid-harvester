import {NgModule} from '@angular/core';
import {CommonModule} from '@angular/common';

import {CronGenComponent} from './cron-editor.component';
import {TimePickerComponent} from './cron-time-picker.component';
import {MatCheckboxModule} from "@angular/material/checkbox";
import {MatOptionModule} from "@angular/material/core";
import {MatRadioModule} from "@angular/material/radio";
import {MatTabsModule} from "@angular/material/tabs";
import {SharedModule} from '../../shared/shared.module';

@NgModule({
    imports: [CommonModule, SharedModule, MatTabsModule, MatOptionModule, MatRadioModule, MatCheckboxModule],
    exports: [CronGenComponent, TimePickerComponent, MatTabsModule],
    declarations: [CronGenComponent, TimePickerComponent]
})
export class CronEditorModule {
}
