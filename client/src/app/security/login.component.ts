import {Input, Component, Output, EventEmitter, OnInit} from '@angular/core';
import { FormGroup, FormControl } from '@angular/forms';
import {AuthenticationService} from './authentication.service';
import {Router} from '@angular/router';
import {HttpErrorResponse} from '@angular/common/http';

@Component({
  selector: 'my-login-form',
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.scss']
})
export class LoginComponent implements OnInit {

  form: FormGroup = new FormGroup({
    username: new FormControl(''),
    password: new FormControl(''),
  });
  showErrorMessage = false;

  constructor(private router: Router, private authService: AuthenticationService) {
  }

  ngOnInit(): void {
    this.authService.currentUser.subscribe(user => {
      if (user) {
        this.router.navigate(['/']);
      }
    })
  }

  submit() {
    if (this.form.valid) {
      this.authService.login(this.form.get('username').value, this.form.get('password').value).subscribe(response => {
        console.log("Response", response);
        this.router.navigate(['/']);
      }, (error: HttpErrorResponse) => {
        console.log("Error logging in:", error);
        if (error.status === 404) {
          this.showErrorMessage = true;
        }
      });
    }
  }
}
