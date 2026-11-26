/*
 * ==================================================
 * ingrid-harvester
 * ==================================================
 * Copyright (C) 2017 - 2024 wemove digital solutions GmbH
 * ==================================================
 * Licensed under the EUPL, Version 1.2 or - as soon they will be
 * approved by the European Commission - subsequent versions of the
 * EUPL (the "Licence");
 *
 * You may not use this work except in compliance with the Licence.
 * You may obtain a copy of the Licence at:
 *
 * https://joinup.ec.europa.eu/collection/eupl/eupl-text-eupl-12
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the Licence is distributed on an "AS IS" basis,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the Licence for the specific language governing permissions and
 * limitations under the Licence.
 * ==================================================
 */

import { expect } from 'chai';
import { Importer } from '../../app/importer/importer.js';
import { Summary } from '../../app/model/summary.js';
import { totalNumErrors } from '../../app/statistic/jobs.utils.js';

function stage(name: string, numErrors: number, warnings: number, skipped: number): Summary {
    const s = new Summary(name, {});
    s.numErrors = numErrors;
    for (let i = 0; i < numErrors; i++) s.errors.push({ type: 'catalog', error: `${name} record ${i} rejected` });
    for (let i = 0; i < warnings; i++) s.warnings.push([`${name} warning ${i}`]);
    for (let i = 0; i < skipped; i++) s.skippedDocs.push(`${name}-${i}`);
    return s;
}

function addCatalogStageResults(main: Summary, stageSummary: Summary) {
    // protected method, called without constructing a concrete importer
    (Importer.prototype as any).addCatalogStageResults.call({ summary: main }, stageSummary);
}

describe('Importer.addCatalogStageResults', function () {

    it('sums up record errors, warnings and skipped records of all catalogs in the main summary', function () {
        const main = new Summary('default', {});
        main.numErrors = 2; // mapper errors
        const elastic = stage('catalog/5', 100, 3, 1);
        const directus = stage('catalog/6', 100, 2, 4);

        addCatalogStageResults(main, elastic);
        addCatalogStageResults(main, directus);

        expect(main.numErrors).to.equal(202);
        expect(main.warnings).to.have.length(5);
        expect(main.skippedDocs).to.have.length(5);
        // the single errors stay in the stages, which keep their values
        expect(main.errors).to.be.empty;
        expect(elastic.numErrors).to.equal(100);
        expect(directus.errors).to.have.length(100);
        expect(main.msgComplete().status).to.equal('error');
    });

    it('sets the status to partial for skipped records only', function () {
        const main = new Summary('default', {});
        addCatalogStageResults(main, stage('catalog/5', 0, 0, 3));
        expect(main.msgComplete().status).to.equal('partial');
    });

    it('leaves a successful run successful', function () {
        const main = new Summary('default', {});
        addCatalogStageResults(main, stage('catalog/5', 0, 0, 0));
        expect(main.numErrors).to.equal(0);
        expect(main.msgComplete().status).to.equal('success');
    });
});

describe('jobs.utils totalNumErrors', function () {

    it('counts the record errors of catalog stages once (already in the main summary)', function () {
        const main = new Summary('default', {});
        main.numErrors = 2;
        main.errors.push({ type: 'app', error: 'fetch failed' });
        const catalogStage = stage('catalog/6', 100, 0, 0);
        addCatalogStageResults(main, catalogStage);
        const otherStage = new Summary('rollbackSourceImport', {});
        otherStage.numErrors = 1;

        // main: 102 + 1, catalog stage: 100 errors[], other stage: 1
        expect(totalNumErrors(main, [catalogStage, otherStage])).to.equal(204);
    });

    it('equals the previous total (sum of numErrors + errors.length of all summaries)', function () {
        const main = new Summary('default', {});
        main.numErrors = 5;
        const stages = [stage('catalog/5', 10, 0, 0), stage('catalog/6', 20, 0, 0)];
        const previous = [main, ...stages].reduce((sum, s) => sum + s.numErrors + s.errors.length, 0);
        stages.forEach(s => addCatalogStageResults(main, s));
        expect(totalNumErrors(main, stages)).to.equal(previous);
    });
});
