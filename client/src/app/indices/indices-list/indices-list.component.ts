import {Component, OnInit} from '@angular/core';
import {IndicesService} from '../indices.service';
import {forkJoin, Observable} from 'rxjs';
import {Index} from '@shared/index.model';
import {tap} from 'rxjs/operators';
import {ConfirmDialogComponent} from '../../shared/confirm-dialog/confirm-dialog.component';
import {MatDialog} from '@angular/material';
import {ConfigService} from "../../config/config.service";

@Component({
  selector: 'app-indices-list',
  templateUrl: './indices-list.component.html',
  styleUrls: ['./indices-list.component.scss']
})
export class IndicesListComponent implements OnInit {
  indices: Observable<Index[]>;
  searchResult = this.indicesService.searchResponse$;

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

  exportIndex(name: string) {
    forkJoin([
      this.indicesService.exportIndex(name)
    ]).subscribe(result => {
      ConfigService.downLoadFile(name+'.json', JSON.stringify(result[0], null, 2));
    });
  }

  importIndex(files: FileList) {
    this.indicesService.importIndex(files[0]).subscribe();
  }

  private updateIndices() {
    this.indices = this.indicesService.get()
      .pipe(
        tap(indices => indices.sort((a, b) => a.name.localeCompare(b.name)))
      );
  }

  sendSearchRequest(indexName: string) {
    this.indicesService.search(indexName);
  }
}
