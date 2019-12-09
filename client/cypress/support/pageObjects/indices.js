class IndicesPage {
  line = '.mat-line';

  visit() {
    cy.visit('indices');
  }

  wait(ms) {
    cy.wait(ms);
  }

  reload() {
    cy.reload();
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
}

export default IndicesPage;
