import { Component, OnInit } from '@angular/core';
import {ConfigService} from "../config.service";
import {MatDialog} from "@angular/material/dialog";
import {AddMappingItemComponent} from "./add-mapping-item/add-mapping-item.component";

@Component({
  selector: 'app-config-mapping',
  templateUrl: './config-mapping.component.html',
  styleUrls: ['./config-mapping.component.scss']
})
export class ConfigMappingComponent implements OnInit {

  types = this.configService.getMapping();

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
    this.dialog.open(AddMappingItemComponent).afterClosed().subscribe(result => {
      this.configService.addMapping(result).subscribe( () => {
        this.types = this.configService.getMapping();
      });
    })
  }
}
