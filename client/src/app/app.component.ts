import {Component, OnInit} from '@angular/core';
import {AuthenticationService} from './security/authentication.service';
import {Router} from '@angular/router';
import {MatSnackBar} from '@angular/material/snack-bar';
import {ConfigService} from "./config.service";

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent implements OnInit {
  isLoggedIn = false;
  version = this.configService.config$;

  constructor(private router: Router, private authService: AuthenticationService, private snack: MatSnackBar,
              private configService: ConfigService) {

  }

  ngOnInit(): void {
    this.authService.currentUser.subscribe(user => {
      this.isLoggedIn = user !== null;
    });
  }

  logout() {
    this.authService.logout().subscribe(() => {
      this.router.navigate(['login']);
      this.snack.open('Sie wurden ausgeloggt', null, {duration: 3000});
    });
  }
}
