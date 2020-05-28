describe('Login', () => {
  const Authentication = require("../support/pageObjects/auth");
  const auth = new Authentication();

  beforeEach(() => {
    auth.apiLogOut();
  });

  it('should show the login page to begin with', () => {
    auth.visitBaseUrl();
    auth.checkLogInPage();
  });

  it('should not be possible to access pages without a login', () => {
    auth.visitBaseUrl();

    auth.visitConfig();
    auth.urlIsLogIn();

    auth.visitHarvester();
    auth.urlIsLogIn();

    auth.visitLog();
    auth.urlIsLogIn();
  });

  //GUI
  it('should show the name of the user after a successful log in', () => {
    auth.apiLogIn();
    auth.checkHomepage();
    auth.checkTestUser('Max Muster');
  });

  it('should not be able to log in (GUI) with wrong credentials', () => {
    auth.guiLogIn('test', 'test');
    auth.checkInvalidLoginMsg();
    auth.checkLogInPage();
  });
});
