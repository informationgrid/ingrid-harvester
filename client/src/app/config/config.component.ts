import { Component, OnInit } from '@angular/core';
import {ConfigService} from "./config.service";

@Component({
  selector: 'app-config',
  templateUrl: './config.component.html',
  styleUrls: ['./config.component.scss']
})
export class ConfigComponent implements OnInit {
  config: any = {};

  constructor(private configService: ConfigService) { }

  ngOnInit() {
    this.reset();
  }

  save() {
    this.configService.save(this.config);
  }

  reset() {
    this.configService.fetch().subscribe( data => this.config = data);
  }

}
