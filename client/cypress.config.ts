import { defineConfig } from "cypress";

export default defineConfig({
  reporter: "mochawesome",

  reporterOptions: {
    reportDir: "cypress/mochawesome-reports",
    overwrite: false,
    html: false,
    json: true,
    timestamp: "yyyymmdd_HHMMss",
  },

  screenshotsFolder: "cypress/mochawesome-reports/assets",
  videosFolder: "cypress/mochawesome-reports/assets",
  videoUploadOnPasses: false,
  downloadsFolder: "cypress/downloads",

  retries: {
    runMode: 2,
    openMode: 0,
  },

  watchForFileChanges: false,

  e2e: {
    // We've imported your old cypress plugins here.
    // You may want to clean this up later by importing these.
    setupNodeEvents(on, config) {
      return require("./cypress/plugins/index.js")(on, config);
    },
    baseUrl: "http://192.168.0.228/importer/",
    specPattern: "cypress/e2e/**/*.ts",
  },
});
