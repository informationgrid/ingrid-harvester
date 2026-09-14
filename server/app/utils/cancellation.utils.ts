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

import { AsyncLocalStorage } from 'async_hooks';

/** Thrown by checkCancellation() to signal that a harvest run was cancelled. */
export class HarvestRunCancelledError extends Error {}

/**
 * Carries the per-run AbortSignal through the async call chain so that
 * RequestDelegate.doRequest() can abort in-flight fetch calls when the
 * importer is cancelled, without requiring explicit signal passing.
 */
export const cancellationSignalStorage = new AsyncLocalStorage<AbortSignal>();

/**
 * Encapsulates the AbortController lifecycle and AsyncLocalStorage wiring for
 * a single harvest run. Create one per importer instance; call abort() when
 * cancel() is triggered and run() to start the async execution context.
 */
export class CancellationScope {
    private readonly _controller = new AbortController();

    abort(): void {
        this._controller.abort();
    }

    run(fn: () => void): void {
        cancellationSignalStorage.run(this._controller.signal, fn);
    }
}
