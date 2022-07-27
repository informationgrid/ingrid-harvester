import {ElasticSearchUtils} from "../server/utils/elastic.utils";
import {expect} from "chai";
import {Summary} from '../server/model/summary';
import {ImporterSettings} from '../server/importer';


describe('Elasticsearch Utils', function () {

    let elastic = null;

    beforeEach(() => {
        let settings: ImporterSettings = {
            type: 'XXX'
        };
        elastic = new ElasticSearchUtils(settings, new Summary(settings));
    });

    it('generated the correct timestamp', function () {

        let date = new Date('2016-11-22 11:30:55');
        let time = elastic.getTimeStamp(date);
        expect(time).to.equal('20161122113055000')
    })

});
