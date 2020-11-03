import ConfigurationPage from "./configuration";

class McloudHome {

  searchBar = '#search-field';
  searchBtn = 'button[type="submit"]';
  resultCount = 'span.result-number';
  resultNames = '.link-teaser-data';

  resultCountHeader = 'h4.result-number';
  noResultsMsg = 'Ihre Suche ergab leider keine Treffer';


  reload() {
    cy.reload();
  }

  visitMcloudHome() {
    cy.visit('http://192.168.0.228');
  }

  visitBaseUrl() {
    cy.visit('');
  }

  visitHarvester() {
    cy.visit('harvester');
  }

  visitConfig() {
    cy.visit('config');
  }

  visitLog() {
    cy.visit('log');
  }

  urlIsMcloudHome() {
    cy.url().should('equal', 'http://192.168.0.228/');
  }

  searchFor(elem) {
    cy.get(this.searchBar).type(elem);
    cy.get(this.searchBtn).click();
  }

  searchForId(id) {
    cy.get(this.searchBar).type('_id:"' + id + '"');
    cy.get(this.searchBtn).click();
  }

  getResultCount() {
    return cy.get(this.resultCount).invoke('text');
  }

  getAllResultNames() {
    return cy.get(this.resultNames).invoke('text');
  }

  checkSearchResultsIncludeName(result, contained) {
    let nameList = this.getAllResultNames();

    if (contained) {
      nameList.should('contain', result);
    } else {
      nameList.should('not.contain', result);
    }
  }

  checkNoResults() {
    cy.get(this.resultCountHeader).invoke('text')
      .should('equal', this.noResultsMsg);
  }

}

export default McloudHome;
