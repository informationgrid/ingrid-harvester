import {Component, OnInit} from '@angular/core';
import {IndicesService} from '../indices.service';
import {Observable} from 'rxjs';
import {Index} from '@shared/index.model';

@Component({
  selector: 'app-indices-list',
  templateUrl: './indices-list.component.html',
  styleUrls: ['./indices-list.component.scss']
})
export class IndicesListComponent implements OnInit {
  indices: Observable<Index[]>;

  constructor(private indicesService: IndicesService) {
  }

  ngOnInit() {
    this.updateIndices();
  }

  deleteIndex(name: string) {
    this.indicesService.deleteIndex(name).subscribe(() => {
      this.updateIndices();
    });
  }

  private updateIndices() {
    this.indices = this.indicesService.get();
  }
}
