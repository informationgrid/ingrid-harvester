class IndicesPage {
  line = '.mat-line';
  content = 'pre';

  visit() {
    cy.visit('indices');
  }

  getAllIndices() {
    return cy.get(this.line).invoke('text');
  }

  indexIsContained(index, bool) {
    if (bool ) {
      this.getAllIndices().should('contain', index);
    } else {
      this.getAllIndices().should('not.contain', index);
    }
  }

  indexHasNoDuplicate(index) {
    cy.get(this.line).then((indicesList) => {
      const partialList = indicesList.text().replace(index, '');
      expect(partialList).not.contain(index);
    });
  }

  selectIndex(index) {
    cy.get(this.line).contains(index).click();
  }

  checkContentIs(content) {
    cy.get(this.content).should("contain", content);
  }
}

export default IndicesPage;
