import {Component, EventEmitter, Input, OnInit, Output} from '@angular/core';
import {FormGroup} from '@angular/forms';
import {MatChipInputEvent} from '@angular/material';
import {COMMA, ENTER} from '@angular/cdk/keycodes';

@Component({
  selector: 'app-chip-list',
  templateUrl: './chip-list.component.html',
  styleUrls: ['./chip-list.component.scss']
})
export class ChipListComponent implements OnInit {

  @Input() list: string[];
  @Input() placeholder: string;

  @Output() update = new EventEmitter();

  readonly separatorKeysCodes: number[] = [ENTER, COMMA];

  constructor() { }

  ngOnInit() {
  }

  add(event: MatChipInputEvent): void {
    const input = event.input;
    const value = event.value;

    // Add keyword
    if ((value || '').trim()) {
      if (!this.list) { this.list = []; }
      this.list.push(value.trim());
    }

    // Reset the input value
    if (input) {
      input.value = '';
    }

    this.update.next(this.list);
  }

  remove(keyword: string): void {
    const index = this.list.indexOf(keyword);

    if (index >= 0) {
      this.list.splice(index, 1);
    }

    this.update.next(this.list);
  }
}
