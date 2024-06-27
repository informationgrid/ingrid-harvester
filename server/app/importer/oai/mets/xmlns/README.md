The TS model and JS parser have been created using `cxsd`, via:
```
cd server
./node_modules/.bin/cxsd -t app/importer/oai/mets/xmlns -j app/importer/oai/mets/xmlns https://www.loc.gov/standards/mods/v3/mods-3-6.xsd
rm -r cache
```
