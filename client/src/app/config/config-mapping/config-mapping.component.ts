import { Component, OnInit } from '@angular/core';
import {ConfigService, MappingDistribution} from "../config.service";
import {MatDialog} from "@angular/material/dialog";
import {AddMappingItemComponent} from "./add-mapping-item/add-mapping-item.component";
import {map, tap} from "rxjs/operators";

@Component({
  selector: 'app-config-mapping',
  templateUrl: './config-mapping.component.html',
  styleUrls: ['./config-mapping.component.scss']
})
export class ConfigMappingComponent implements OnInit {

  types = this.configService.getMapping().pipe(
    // map(items => items.sort(this.compareFunction)),
    tap(result => this.formatOptions = result.map( item => item.name))
  );
  private formatOptions: string[];
  private compareFunction = (a: MappingDistribution, b: MappingDistribution) => a.name.localeCompare(b.name);

  constructor(private configService: ConfigService, private dialog: MatDialog) { }

  ngOnInit() {
  }

  deleteItem(type: string, item: string) {
    this.configService.removeMapping({
      source: item,
      target: type
    }).subscribe( () => {
      this.types = this.configService.getMapping();
    });
  }

  addItem() {
    this.dialog.open(AddMappingItemComponent, {
      data: this.formatOptions
    }).afterClosed().subscribe(result => {
      if (result) {
        this.configService.addMapping(result).subscribe(() => {
          this.types = this.configService.getMapping();
        });
      }
    })
  }

}
