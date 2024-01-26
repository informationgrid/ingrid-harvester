/*
 * ==================================================
 * ingrid-harvester
 * ==================================================
 * Copyright (C) 2017 - 2023 wemove digital solutions GmbH
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

import { importProviders } from '@tsed/components-scan';
import { PlatformExpress } from '@tsed/platform-express';
import { Server } from './server';

async function bootstrap() {
    try {
        const scannedProviders = await importProviders({
            mount: {
                '/rest': [`${__dirname}/controllers/**/*.ts`]
            },
            componentsScan: [
                `${__dirname}/middlewares/**/*.ts`,
                `${__dirname}/services/**/*.ts`,
                `${__dirname}/converters/**/*.ts`
            ]        
        });
        const platform = await PlatformExpress.bootstrap(Server, {
            ...scannedProviders
        });
        await platform.listen();
        console.log('Server started...');
    } catch (err) {
        console.error(err);
    }
}

bootstrap();
