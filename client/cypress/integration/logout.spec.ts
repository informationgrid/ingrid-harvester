describe('Logout', () => {
  const HarvesterPage = require("../support/pageObjects/harvester/harvester");
  const hPage = new HarvesterPage();
  const Authentication = require("../support/pageObjects/auth");
  const auth = new Authentication();

  beforeEach(() => {
    auth.apiLoginWithUserCheck();
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
