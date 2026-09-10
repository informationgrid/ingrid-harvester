# README

The input data for the CKAN tests has been obtained using the following requests.

## package_list.json

Request: `GET https://ckan.govdata.de/api/3/action/package_list`

For size reasons, the resulting JSON file has been manually filtered to only include the following datasets:

* bodenkennwerte-bundesweit-aus-der-bodenubersichtskarte-1-200-000-mittleres-gesamtporenvolumen-b
* bundesweite-bodenabtragsmodellierung-allgemeine-bodenabtragsgleichung-k-faktor-datensatz
* pollutant-release-and-transfer-register-prtr-abfall-datensatz

## package_search.json

Request: `GET https://ckan.govdata.de/api/3/action/package_search?sort=id asc&start=1&rows=10&fq=+organization:umweltbundesamt`

For size reasons, the resulting JSON file has been manually filtered to only include the following datasets:

* bodenkennwerte-bundesweit-aus-der-bodenubersichtskarte-1-200-000-mittleres-gesamtporenvolumen-b
* bundesweite-bodenabtragsmodellierung-allgemeine-bodenabtragsgleichung-k-faktor-datensatz
* pollutant-release-and-transfer-register-prtr-abfall-datensatz
