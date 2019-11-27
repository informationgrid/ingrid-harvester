class ConfigurationPage {
  constructor(){
    this.saveButton = '[data-test=save]';
    this.resetButton = '[data-test=reset]';
    this.elasticSearchUrlField = '[formcontrolname="elasticSearchUrl"]';
    this.aliasField = '[formcontrolname="alias"]';
    this.proxyField = '[formcontrolname="proxy"]';
  }
  //TODO: export all button data-tests att

  visit() {
    cy.visit('config');
  }

  wait(ms){
    cy.wait(ms);
  }

  reload(){
    cy.reload();
  }

  resetConfigApi() {
    cy.request({
      method: 'POST',
      url: 'rest/api/config/general',
      body: {"elasticSearchUrl":"http://localhost:9200",
        "alias":"mcloud",
        "proxy":"",
        "sessionSecret":"mysecretkey"}
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

  exportAndCheckConfigDownloadApi(){
    cy.request({
      headers: {accept: 'application/json, text/plain, */*', referer: '/config'},
      method: 'GET',
      url: '/rest/api/harvester'
    }).then((response) => {
      expect(response.headers).to.have.property('content-type', 'application/json; charset=utf-8');
      expect(response.headers).to.have.property('etag');
    });
  }

  pressDownloadConfigButton(){
    cy.get('.mat-flat-button').contains('Export der Harvester-Konfiguration').click();
  }
}

export default ConfigurationPage;
