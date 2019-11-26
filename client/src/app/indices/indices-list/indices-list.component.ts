import {Component, OnInit} from '@angular/core';
import {IndicesService} from '../indices.service';
import {Observable} from 'rxjs';
import {Index} from '@shared/index.model';
import {tap} from 'rxjs/operators';
import {ConfirmDialogComponent} from '../../shared/confirm-dialog/confirm-dialog.component';
import {MatDialog} from '@angular/material';

@Component({
  selector: 'app-indices-list',
  templateUrl: './indices-list.component.html',
  styleUrls: ['./indices-list.component.scss']
})
export class IndicesListComponent implements OnInit {
  indices: Observable<Index[]>;

  constructor(private dialog: MatDialog, private indicesService: IndicesService) {
  }

  ngOnInit() {
    this.updateIndices();
  }

  deleteIndex(name: string) {
    this.dialog.open(ConfirmDialogComponent, {data: 'Wollen Sie den Index "' + name + '" wirklich löschen?'}).afterClosed().subscribe(result => {
      if (result) {
        this.indicesService.deleteIndex(name).subscribe(() => {
          this.updateIndices();
        });
      }
    });
  }

  private updateIndices() {
    this.indices = this.indicesService.get()
      .pipe(
        tap(indices => indices.sort((a, b) => a.name.localeCompare(b.name)))
      );
  }
}
