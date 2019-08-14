import {Component, OnInit} from '@angular/core';
import {AuthenticationService} from './security/authentication.service';
import {Router} from '@angular/router';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent implements OnInit {
  page = 'harvester';
  isLoggedIn = false;

  constructor(private router: Router, private authService: AuthenticationService) {

  }

  ngOnInit(): void {
    this.authService.currentUser.subscribe(user => {
      this.isLoggedIn = user !== null;
    });
  }

  logout() {
    this.authService.logout().subscribe( () => this.router.navigate(['login']));
  }
}
