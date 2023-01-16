/*
 *  ==================================================
 *  mcloud-importer
 *  ==================================================
 *  Copyright (C) 2017 - 2022 wemove digital solutions GmbH
 *  ==================================================
 *  Licensed under the EUPL, Version 1.2 or – as soon they will be
 *  approved by the European Commission - subsequent versions of the
 *  EUPL (the "Licence");
 *
 *  You may not use this work except in compliance with the Licence.
 *  You may obtain a copy of the Licence at:
 *
 *  https://joinup.ec.europa.eu/collection/eupl/eupl-text-eupl-12
 *
 *  Unless required by applicable law or agreed to in writing, software
 *  distributed under the Licence is distributed on an "AS IS" basis,
 *  WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 *  See the Licence for the specific language governing permissions and
 *  limitations under the Licence.
 * ==================================================
 */

import {Service} from '@tsed/di';
import {ImportSocketService} from '../../sockets/import.socket.service';
import {ElasticSearchUtils} from "../../utils/elastic.utils";
import {ConfigService} from "../config/ConfigService";
import {ElasticSettings} from "../../utils/elastic.setting";
import {Summary} from "../../model/summary";
import {now} from "moment";
import {elasticsearchMapping} from "../../statistic/url_check.mapping";
import {elasticsearchSettings} from "../../statistic/url_check.settings";
import {BulkResponse} from "../../statistic/statistic.utils";

let elasticsearch = require('@elastic/elasticsearch'), log = require('log4js').getLogger(__filename);

const http = require('http');
const https = require('https');
const request = require('request');

//const ftp = require('basic-ftp');

@Service()
export class HistoryService {
    private elasticUtils: ElasticSearchUtils;
    private alias: string;

    constructor(private socketService: ImportSocketService) {
        let generalSettings = ConfigService.getGeneralSettings();
        this.alias = generalSettings.alias;
        const settings: ElasticSettings = {
            elasticSearchUrl: generalSettings.elasticSearchUrl,
            elasticSearchPassword: generalSettings.elasticSearchPassword,
            alias: generalSettings.alias,
            includeTimestamp: true,
            index: ''
        };
        // @ts-ignore
        const summary: Summary = {};
        this.elasticUtils = new ElasticSearchUtils(settings, summary);
    }

    async getHistory(id: number): Promise<any> {
        const harvester = ConfigService.get().find(h => h.id === id);
        let history = await this.elasticUtils.getHistory(harvester.index);
        return {
            harvester: harvester.description,
            history: history
        }
    }

    private SUM = (accumulator, currentValue) => accumulator + currentValue;

    async getHistoryAll(): Promise<any> {
        let history = await this.elasticUtils.getHistories();

        let dates = [];

        await history.forEach(entry => {
            let date = entry.timestamp.substring(0, 10);
            let index = entry.base_index;
            (dates[date] = dates[date] || [])[index] = entry;
        });

        let reduced_history = [];
        Object.entries(dates).forEach(([date, harvester]) => {
            reduced_history.push({
                timestamp: date,
                harvester: Object.keys(harvester).map((index => {return {base_index: index, count: (harvester[index]["numRecords"] - harvester[index]["numSkipped"])}})),
                numRecords: Object.values(harvester).map(h => h["numRecords"]).reduce(this.SUM),
                numSkipped: Object.values(harvester).map(h => h["numSkipped"]).reduce(this.SUM),
                numWarnings: Object.values(harvester).map(h => h["numWarnings"]).reduce(this.SUM),
                numRecordErrors: Object.values(harvester).map(h => h["numRecordErrors"]).reduce(this.SUM),
                numAppErrors: Object.values(harvester).map(h => h["numAppErrors"]).reduce(this.SUM),
                numESErrors: Object.values(harvester).map(h => h["numESErrors"]).reduce(this.SUM),
                duration: Object.values(harvester).map(h => h["duration"]).reduce(this.SUM)
            });
        })

        return {
            history: reduced_history
        }
    }
}
