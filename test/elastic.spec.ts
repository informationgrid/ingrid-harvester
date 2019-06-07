import {ElasticSearchUtils} from "../server/utils/elastic.utils";
import {expect} from "chai";


describe('Elasticsearch Utils', function () {

    let elastic = null;

    beforeEach(() => {
        elastic = new ElasticSearchUtils({});
    });

    it('generated the correct timestamp', function () {

        let date = new Date('2016-11-22 11:30:55');
        let time = elastic.getTimeStamp(date);
        expect(time).to.equal('20161122113055000')
    })

});
