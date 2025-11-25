# Installation

The InGrid Harvester runs two components in a single docker container: the actual `server` application and the admin `client`. It depends on an Elasticsearch instance and a PostgreSQL installation.

## General steps

* Checkout this repo
* Add readonly wemove docker hub credentials to your docker setup
    ```bash
    sudo docker login docker-registry.wemove.com
    Username: readonly
    Password: readonly
    ```

## Configuration

### General notes

* If you want the InGrid Harvester to be accessed at a sub-path (i.e., not directly at root), you have to **both**
  * set `BASE_URL` to the desired path (environment variable & build args)
  * set `contextPath` in the client config file to the same value
* This is in addition to appropriate nginx settings

### Configuration files

| Config file location (project) | Config file location (docker container)                    | Purpose                                         |
|--------------------------------|------------------------------------------------------------|-------------------------------------------------|
| server/config.json             | /opt/ingrid/harvester/server/config.json                   | Harvester configuration                         |
| server/config-general.json     | /opt/ingrid/harvester/server/config-general.json           | General settings (Elasticsearch, Postgres, ...) |
| client/src/assets/config.json  | /opt/ingrid/harvester/server/app/webapp/assets/config.json | Client settings                                 |

In a docker setup, you probably want to map these files from the host system into the container.

### Environment variables

Several general settings can also be configured via environment variables. These settings take precedence over configuration files.

| Variable                    | Note                                                              |
|-----------------------------|-------------------------------------------------------------------|
| DB_CONNECTION_STRING        |                                                                   |
| DB_URL                      |                                                                   |
| DB_PORT                     |                                                                   |
| DB_NAME                     |                                                                   |
| DB_USER                     |                                                                   |
| DB_PASSWORD                 |                                                                   |
| ELASTIC_URL                 |                                                                   |
| ELASTIC_VERSION             | Major version (6, 7, or 8)                                        |
| ELASTIC_USER                |                                                                   |
| ELASTIC_PASSWORD            |                                                                   |
| ELASTIC_REJECT_UNAUTHORIZED | Whether to reject Es connections if the certificate is invalid    |
| ELASTIC_INDEX               |                                                                   |
| ELASTIC_ALIAS               |                                                                   |
| ELASTIC_PREFIX              |                                                                   |
| ELASTIC_NUM_SHARDS          |                                                                   |
| ELASTIC_NUM_REPLICAS        |                                                                   |
| PORTAL_URL                  | Base URL for displaying portal website (no trailing slash)        |
| PROXY_URL                   | URL needs to contain credentials and port, if applicable          |
| ALLOW_ALL_UNAUTHORIZED      | If all connections should be allowed, regardless of SSL state     |
| IMPORTER_PROFILE            | Profile to use for the application: diplanung, mcloud             |
| BASE_URL                    | Subpath where the Harvester is being served at, if not on `/`     |


## Local development setup

### Running in a local docker container

You can use the same setup as outlined in the section `Test setup` below, but with `docker-compose-dev.yml`. This scales down memory requirements and uses `ts-node-dev` instead of `node`.

### Running in a terminal

Prerequisites:
* node.js v16
* Postgresql >= v14
* Elasticsearch >= 6

You may wish to run the server and the client outside of the docker container, for debugging and faster deployment/development purposes. Currently you have to change some files to achieve this, outlined below:

* `server/config-general.json`:
  * change the value of `elasticsearch.url` to `http://localhost:9200`
  * change the value of `elasticsearch.password`
* Now, first start an Elasticsearch instance (either from the docker container or directly on your machine), then run the client and server separately:
  ```bash
  cd client
  npm run start
  ```
  ```bash
  cd server
  npm run start-{profile}
  ```
  where `{profile}` is one of `mcloud`, `diplanung`, `lvr`
* Now you can access the harvester
    * via GUI: http://localhost:4200
    * via Elasticsearch API: http://localhost:9200


## Test setup

* `server/config-general.json`: change the value of `elasticsearch.password`
* Build, run, and detach the containers:
    ```bash
    sudo docker-compose -f docker-compose.yml up --build -d
    ```
* Now you can access the harvester
    * via GUI: http://localhost:8090
    * via Elasticsearch API: http://localhost:9200
        * user: `read_user`
        * password: *the one you set in `elasticsearch/create-users.json`*


## Test setup in a Kubernetes environment

* TODO


## Production setup in a Kubernetes environment

* TODO

<br />
<br />

---

***Below you find the old version of the readme, which targeted an RPM release***


# Configuration

Edit the file config.js to define the location of the excel file to be imported ('filePath'). You can also
configure the address of the Elasticsearch URL where the data shall be indexed to ('elasticsearch.url').

To disable authentication during development, comment the following line in "AuthMiddleware.ts"
>// throw new Unauthorized("Unauthorized");

# Run

Execute the following command to run a single import:

Run Elasticsearch:
> docker-compose up -d

For the server:
> npm run start-dev

For the server (node 16+):
> npm run start-dev-16

For the client:
> npm run start

# Test

> npm run test

or

> mocha -r ts-node/register test/*.spec.ts

# Development

The main document is "server/model/index-document.ts", which represents the Elasticsearch document. This model is used by all harvester and helps to stay synchronized. When adding a new index field then the compiler will let you know about missing implementations.

# Release

* Update changelog-file
* create annotated tag with message "Release"
  * `git tag -m "Release X.Y.Z"`
