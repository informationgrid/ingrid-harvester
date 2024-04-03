import { Component, Input, OnInit } from "@angular/core";

@Component({
  selector: 'page-template',
  templateUrl: './page-template.component.html',
  styleUrl: './page-template.component.scss'
})
export class PageTemplateComponent implements OnInit {
  @Input() label = "";
  @Input() subLabel = "";

  constructor() {}

  ngOnInit(): void {}
}