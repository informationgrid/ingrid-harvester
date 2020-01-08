class ConfigurationPage {

  saveButton = '[data-test=save]';
  resetButton = '[data-test=reset]';
  addMappingBtn = '[id="btnAddMapping"]';
  mappingSource = 'input[placeholder="Quelle"]';
  mappingDestination = 'input[placeholder="Ziel"]';
  elasticSearchUrlField = '[formcontrolname="elasticSearchUrl"]';
  aliasField = '[formcontrolname="alias"]';
  proxyField = '[formcontrolname="proxy"]';
  tab = '.mat-tab-label-content';
  btn = '.mat-button-wrapper';
  line = '.mat-line';
  sourceContent = '.mat-list-item';
  MAPPING = 'Mapping (Datenformate)';
  CONFIG = 'Konfiguration';


  //TODO: export all button data-tests att, Mapping-Tab Btn, input fields source and dest
  // add mapping button covers last delete button of the page

  visit() {
    cy.visit('config');
  }

  selectTab(tab) {
    switch (tab) {
      case this.MAPPING:
        cy.get(this.tab).contains(this.MAPPING).click({force: true});
        break;
      case this.CONFIG:
        cy.get(this.tab).contains(this.CONFIG).click({force: true});
        break;
    }
  }

  addNewMapping() {
    cy.get(this.addMappingBtn).click();
  }

  fillMappingValues(source, dest) {
    cy.get(this.mappingSource).type(source);
    cy.get(this.mappingDestination).type(dest).then(() => {
      cy.get(this.mappingDestination).type('{esc}');
    });
  }

  saveMapping() {
    cy.get(this.btn).contains('Hinzufügen').click();
  }

  checkMappingExists(source, bool) {
    let mapList = this.getAllMappings();

    if (bool) {
      mapList.should('contain', source);
    } else {
      mapList.should('not.contain', source);
    }
  }

  deleteMapping(source) {
    cy.get(this.sourceContent).contains(source).parents().children('.mat-icon-button').click();
  }

  getAllMappings() {
    return cy.get(this.line).invoke('text');
  }

  resetConfigApi() {
    cy.request({
      method: 'POST',
      url: 'rest/api/config/general',
      body: {
        "elasticSearchUrl": "http://localhost:9200",
        "alias": "mcloud",
        "proxy": "",
        "sessionSecret": "mysecretkey"
      }
    });
  }

  saveConfig() {
    cy.get(this.saveButton).click();
  }

  saveButtonIsDisabled() {
    cy.get('[data-test=save]').should('be.disabled');
  }

  resetConfig() {
    cy.get(this.resetButton).contains('Zurücksetzen').click();
  }

  checkElasticSearchUrl(url) {
    cy.get(this.elasticSearchUrlField).should('have.value', url);
  }

  setElasticSearchUrl(url) {
    cy.get(this.elasticSearchUrlField).clear().type(url);
  }

  checkAlias(alias) {
    cy.get(this.aliasField).should('have.value', alias);
  }

  setAlias(alias) {
    cy.get(this.aliasField).clear().type(alias);
  }

  checkProxy(proxy) {
    cy.get(this.proxyField).should('have.value', proxy);
  }

  setProxy(proxy) {
    cy.get(this.proxyField).clear().type(proxy);
  }

  exportAndCheckConfigDownloadApi() {
    cy.request({
      headers: {accept: 'application/json, text/plain, */*', referer: '/config'},
      method: 'GET',
      url: '/rest/api/harvester'
    }).then((response) => {
      expect(response.headers).to.have.property('content-type', 'application/json; charset=utf-8');
      expect(response.headers).to.have.property('etag');
    });
  }

  pressDownloadConfigButton() {
    cy.get('[data-test=export]').click();
  }
}

export default ConfigurationPage;
