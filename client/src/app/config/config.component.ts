import { Component, OnInit } from '@angular/core';
import {ConfigService} from "./config.service";
import {GeneralSettings} from "@shared/general-config.settings";

@Component({
  selector: 'app-config',
  templateUrl: './config.component.html',
  styleUrls: ['./config.component.scss']
})
export class ConfigComponent implements OnInit {
  // @ts-ignore
  config: GeneralSettings = {};

  constructor(private configService: ConfigService) { }

  ngOnInit() {
    this.reset();
  }

  save() {
    this.configService.save(this.config).subscribe();
  }

  reset() {
    this.configService.fetch().subscribe( data => this.config = data);
  }

}
