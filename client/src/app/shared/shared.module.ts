import {NgModule} from '@angular/core';
import {MatFormFieldModule, MatInputModule, MatSelectModule} from '@angular/material';
import {FormsModule} from '@angular/forms';

@NgModule({
  imports: [FormsModule, MatFormFieldModule, MatInputModule, MatSelectModule],
  exports: [FormsModule, MatFormFieldModule, MatInputModule, MatSelectModule]
})
export class SharedModule {
}
