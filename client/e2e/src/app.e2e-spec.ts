import {AppPage} from './app.po';
import {browser, by, element, logging} from 'protractor';

describe('workspace-project App', () => {
  let page: AppPage;

  beforeEach(() => {
    page = new AppPage();
    page.navigateTo();
    page.login();
  });

  it('should open harvester page on login', () => {
    /*browser.getCurrentUrl().then(url => {
      expect(url).toEqual('/harvester');
    });*/
    // browser.waitForAngularEnabled(false);
    expect(element.all(by.css('button')).get(0).getText()).toEqual('xxx');
  });

  afterEach(async () => {
    // Assert that there are no errors emitted from the browser
    const logs = await browser.manage().logs().get(logging.Type.BROWSER);
    expect(logs).not.toContain(jasmine.objectContaining({
      level: logging.Level.SEVERE,
    } as logging.Entry));
  });
});
