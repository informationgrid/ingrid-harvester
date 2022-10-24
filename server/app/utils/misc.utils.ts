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

'use strict';

import { merge as lodashMerge } from 'lodash';

const MAX_MSG_LENGTH = 4096;
const TRUNC_STR = '... (truncated)';

export class MiscUtils {

    /**
     * Deep merge objects without mutating the first one.
     * Helper method to prevent accidents.
     * 
     * @param objs the objects to merge
     * @returns the merged object
     */
    public static merge(...objs) {
        // lodash mutates the first object on which it merges subsequent objects
        return lodashMerge({}, ...objs)
    }

    /**
     * For log output overview and ES indexing reasons, messages might want/need to be truncated.
     * We set an arbitrary limit for message length in `MAX_MESSAGE_LENGTH`.
     * 
     * @param msg the message to be truncated
     */
    public static truncateErrorMessage(msg: string) {
        return msg?.length > MAX_MSG_LENGTH ? msg.substring(0, MAX_MSG_LENGTH - TRUNC_STR.length) + TRUNC_STR : msg;
    }
}
