/// <reference types="cypress" />

// ***********************************************************
// This example support/index.js is processed and
// loaded automatically before your test files.
//
// This is a great place to put global configuration and
// behavior that modifies Cypress.
//
// You can change the location of this file or turn off
// automatically serving support files with the
// 'supportFile' configuration option.
//
// You can read more here:
// https://on.cypress.io/configuration
// ***********************************************************

// Import commands.js using ES2015 syntax:
import './index';
import './commands';

//add screenshot for failed tests in the mochawesome-report
const addContext = require('mochawesome/addContext');

Cypress.on('test:after:run', (test, runnable) => {
  if (test.state === 'failed') {
    const firstTestStart = runnable.parent.tests[0].wallClockStartedAt;
    const startTimeOffset = Math.round((test.wallClockStartedAt - firstTestStart) / 1000);

    const screenshotFileName = `${runnable.parent.title} -- ${test.title} (failed).png`;

    addContext({test}, `assets/${Cypress.spec.name}/${screenshotFileName}`);
    addContext({test}, `assets/${Cypress.spec.name}.mp4#t=${startTimeOffset}`);
  }
});

// Alternatively you can use CommonJS syntax:
// require('./commands')
