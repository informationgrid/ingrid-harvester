import {NgModule} from '@angular/core';
import {MatButtonModule, MatDialogModule, MatFormFieldModule, MatInputModule, MatSelectModule} from '@angular/material';
import {FormsModule} from '@angular/forms';
import { ConfirmDialogComponent } from './confirm-dialog/confirm-dialog.component';

@NgModule({
  imports: [FormsModule, MatFormFieldModule, MatInputModule, MatSelectModule, MatDialogModule, MatButtonModule],
  exports: [FormsModule, MatFormFieldModule, MatInputModule, MatSelectModule, MatDialogModule, MatButtonModule],
  declarations: [ConfirmDialogComponent],
  entryComponents: [ConfirmDialogComponent]
})
export class SharedModule {
}
