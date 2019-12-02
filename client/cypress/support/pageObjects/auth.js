class Authentication {
  constructor() {
    this.logInBtn = '[data-test=login]';
    this.title = 'mat-card-title';
    this.logOutBtn = '[data-test=logout]';
    this.errorMsg = '.error';
    this.inputUser = 'input[formcontrolname="username"]';
    this.inputPsw = 'input[formcontrolname="password"]';
  }

  reload(){
    cy.reload();
  }

  visitBaseUrl(){
    cy.visit('');
  }
  visitHarvester(){
    cy.visit('harvester');
  }

  visitConfig(){
    cy.visit('config');
  }

  visitLog(){
    cy.visit('log');
  }

  urlIsLogIn() {
    cy.url().should('include', 'login');
  }

  checkLogOutMessage() {
    cy.get('.mat-simple-snackbar').should('contain', 'Sie wurden ausgeloggt');
    cy.get('mat-card-title').should('contain','Login');
    cy.get('[data-test=login]').should('contain', 'Login');
  }
  checkLogInPage() {
    cy.get(this.title).should('contain','Login');
    cy.get(this.logInBtn).should('contain', 'Login');
  }

  checkHomepage()  {
    cy.url().should('include', '/harvester')
  }

  checkTestUser(name) {
    cy.get('.mat-button-wrapper').should('contain',name);
  }

  apiLogOut() {
    cy.request({
      method: 'GET',
      url: 'rest/passport/logout'
    });
    this.reload();
  }

  guiLogOut() {
    cy.get(this.logOutBtn).click();
  }

  guiLogIn(user, psw) {
    cy.get(this.inputUser).type(user);
    cy.get(this.inputPsw).type(psw);
    cy.get(this.logInBtn).click();
  }

  apiLogIn(user, psw){
    user = user ? user : 'admin';
    psw = psw ? psw : 'admin';
    cy.request({
      method: 'POST',
      url: 'rest/passport/login',
      body: {username: user, password: psw}
      // failOnStatusCode: false
    }).then((response) => {
      if (response.body !== 'User not found') {
        window.localStorage.setItem('currentUser', JSON.stringify(response.body))
      }
    });
    this.visitBaseUrl();
  }

  apiLoginWithUserCheck() {
    //check user is set
    if (window.localStorage.getItem('currentUser') !== 'undefined') {
      this.apiLogIn();
    }
    //login is successful
    cy.url().should('include', '/harvester');
  }

  checkInvalidLoginMsg(){
    cy.get(this.errorMsg).should('contain', 'Benutzername oder Passwort falsch');
  }
}

export default Authentication;
