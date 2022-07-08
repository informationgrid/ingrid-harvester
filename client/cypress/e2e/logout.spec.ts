import Authentication from '../support/pageObjects/auth';

describe('Logout', () => {
  const auth = new Authentication();

  beforeEach(() => {
    auth.apiLogIn();
  });

  it('should log out successfully, show the login page and check the log out message', () => {
    auth.guiLogOut();
    auth.checkLogOutMessage();
  });

  it('should log out successfully and show the login page', () => {
    auth.apiLogOut();
    auth.checkLogInPage();
  });
});
