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

export class DcatPeriodicityUtils {
    static getPeriodicity(raw: string) :string {
        let result = undefined;
        if(raw){
            switch (raw.trim().toLowerCase()) {
                case "annual" :
                case "jährlich" :
                case "once_per_year" :
                case "annually" :
                case "jahr" :
                case "6 monat" :
                    result = "ANNUAL";
                    break;
                case "annual_2" :
                case "semiannual" :
                case "halbjährlich" :
                    result = "ANNUAL_2";
                    break;
                case "annual_3" :
                case "4 monat" :
                    result = "ANNUAL_3";
                    break;
                case "biennial" :
                case "zweijährlich" :
                case "biannually" :
                case "2 jahr" :
                    result = "BIENNIAL";
                    break;
                case "bimonthly" :
                case "zweimonatlich" :
                    result = "BIMONTHLY";
                    break;
                case "biweekly" :
                case "zweiwöchentlich" :
                case "fortnightly" :
                    result = "BIWEEKLY";
                    break;
                case "cont" :
                case "continuous" :
                case "continual" :
                case "kontinuierlich" :
                    result = "CONT";
                    break;
                case "daily" :
                case "täglich" :
                case "tag" :
                    result = "DAILY";
                    break;
                case "daily_2" :
                case "twice a day" :
                case "zweimal täglich" :
                    result = "DAILY_2";
                    break;
                case "irreg" :
                case "irregular" :
                case "unregelmäßig" :
                case "asneeded" :
                    result = "IRREG";
                    break;
                case "monthly" :
                case "monatlich" :
                case "once_per_month" :
                case "monat" :
                    result = "MONTHLY";
                    break;
                case "monthly_2" :
                case "semimonthly" :
                case "zweimal im monat" :
                    result = "MONTHLY_2";
                    break;
                case "monthly_3" :
                case "three times a month" :
                case "dreimal im monat" :
                    result = "MONTHLY_3";
                    break;
                case "never" :
                case "niemals" :
                case "notplanned" :
                case "keine" :
                    result = "NEVER";
                    break;
                case "op_datpro" :
                case "vorläufige daten" :
                case "keine" :
                    result = "OP_DATPRO";
                    break;
                case "quarterly" :
                case "vierteljährlich" :
                case "once_per_quarter" :
                case "quartal" :
                case "3 monat" :
                    result = "QUARTERLY";
                    break;
                case "triennial" :
                case "dreijährlich" :
                    result = "TRIENNIAL";
                    break;
                case "update_cont" :
                case "continuously updated" :
                case "ständige aktualisierung" :
                    result = "UPDATE_CONT";
                    break;
                case "weekly" :
                case "wöchentlich" :
                case "once_per_week" :
                case "woche" :
                case "7 tag" :
                    result = "WEEKLY";
                    break;
                case "weekly_2" :
                case "semiweekly" :
                case "zweimal in woche" :
                    result = "WEEKLY_2";
                    break;
                case "weekly_3" :
                case "three times a week" :
                case "dreimal in woche" :
                    result = "WEEKLY_2";
                    break;
                case "quinquennial" :
                case "fünfjährlich" :
                case "5 jahre" :
                    result = "QUINQUENNIAL";
                    break;
                case "decennial" :
                case "alle zehn jahre" :
                case "10 jahre" :
                    result = "DECENNIAL";
                    break;
                case "hourly" :
                case "stündlich" :
                case "stunde" :
                    result = "HOURLY";
                    break;
                case "quadrennial" :
                case "vierjährlich" :
                case "4 jahre" :
                    result = "QUADRENNIAL";
                    break;
                case "bihourly" :
                case "alle zwei stunden" :
                case "2 stunden" :
                    result = "BIHOURLY";
                    break;
                case "trihourly" :
                case "alle drei stunden" :
                case "3 stunden" :
                    result = "TRIHOURLY";
                    break;
                case "bidecennial" :
                case "alle zwanzig jahre" :
                case "20 jahre" :
                    result = "BIDECENNIAL";
                    break;
                case "tridecennial" :
                case "alle dreißig jahre" :
                case "30 jahre" :
                    result = "TRIDECENNIAL";
                    break;
                case "minutly" :
                case "minütlich" :
                case "minute" :
                    result = "MINUTLY";
                    break;
                case "zweiminütlich" :
                case "2 minute" :
                    result = "BIMINUTLY";
                    break;
                case "fünfminütlich" :
                case "5 minute" :
                    result = "FIVEMINUTLY";
                    break;
                case "zehnminütlich" :
                case "10 minute" :
                    result = "TENMINUTLY";
                    break;
                case "fünfzehnminütlich" :
                case "15 minute" :
                    result = "FIFTEENMINUTLY";
                    break;
                case "other" :
                case "anderer" :
                case "6 jahr" :
                    result = "OTHER";
                    break;
                case "unknown" :
                case "unbekannt" :
                    result = "UNKNOWN";
                    break;
            }
        }

        return result;
    }
}