import {browser, by, element} from 'protractor';

export class AppPage {
  navigateTo() {
    return browser.get(browser.baseUrl + 'login') as Promise<any>;
  }

  login() {
    element(by.css('[formcontrolname="username"]')).sendKeys('admin');
    element(by.css('[formcontrolname="password"]')).sendKeys('admin');
    element(by.css('.mat-button')).click();
  }

  getTitleText() {
    return element(by.css('app-root h1')).getText() as Promise<string>;
  }
}
