# Installation

The harvester runs two components in a single docker container, `client` and `server`. It depends on an Elasticsearch instance running in a separate container on the same network.

## General steps

* Checkout this repo
* Add readonly wemove docker hub credentials to your docker setup
    ```bash
    sudo docker login docker-registry.wemove.com
    Username: readonly
    Password: readonly
    ```

## Environment variables

Several general settings can be configured via environment variables. These encompass settings regarding database, elasticsearch and proxy.

| Variable                    | Note                                                              |
|-----------------------------|-------------------------------------------------------------------|
| DB_CONNECTION_STRING        |                                                                   |
| DB_URL                      |                                                                   |
| DB_PORT                     |                                                                   |
| DB_NAME                     |                                                                   |
| DB_USER                     |                                                                   |
| DB_PASSWORD                 |                                                                   |
| DEFAULT_CATALOG             | The default catalog to be used if a harvester doesn't specify one |
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
* Elasticsearch, supports v6 and v8

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
* If you are setting the harvester up for the first time (i.e., after initializing the Elasticsearch volume), you need to create the appropriate user credentials for Elasticsearch:
    * `elasticsearch/set-pw-es`: customize all passwords
        * make sure to use the same password twice, for user and Reenter
        * make sure to put the same password for the `elastic` user that you chose for `elasticsearch.password`
    * `elasticsearch/create-users.json`: set a password for the readonly `read_user`
    * `elasticsearch/setup-access.sh`:
        * replace `$TOKEN` with a base64 encoded string of the elastic user and its password:
          ```bash
          echo -n elastic:$YOUR_ELASTIC_PASSWORD | base64
          ```
        * uncomment the file
        * run it
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

# Legacy Information

If nodejs is not yet installed on the system then run:

> sudo yum install nodejs

or for ubuntu

> sudo apt-get install nodejs



Run the following command to install all necessary dependencies:

> npm install


## Installation Elasticsearch

Use docker-compose.yml to start up configured docker container or install manually as described below.

Download Elasticsearch 6.8.4 here:

https://artifacts.elastic.co/downloads/elasticsearch/elasticsearch-6.8.4.zip

unzip in folder.

Go to Elasticsearch folder and execute

```
bin/plugin install https://nexus.informationgrid.eu/repository/maven-releases/org/xbib/elasticsearch/plugin/elasticsearch-analysis-decompound/6.8.4.0/elasticsearch-analysis-decompound-6.8.4.0.zip
```

or if downloaded before

```
bin/plugin install file:///elasticsearch-analysis-decompound-6.8.4.0.zip
```

Start Elasticsearch

```
bin/elasticsearch
```



## Installation Elasticsearch as ubuntu 16.04 service

```
wget https://artifacts.elastic.co/downloads/elasticsearch/elasticsearch-6.8.4.deb

sudo dpkg -i elasticsearch-6.8.4.deb
```

This results in Elasticsearch being installed in ```/usr/share/elasticsearch/``` with its configuration files placed in ```/etc/elasticsearch``` and its init script added in ```/etc/init.d/elasticsearch```.


Install decompound plugin

```
cd /usr/share/elasticsearch
sudo bin/plugin install https://nexus.informationgrid.eu/repository/maven-releases/org/xbib/elasticsearch/plugin/elasticsearch-analysis-decompound/6.8.4.0/elasticsearch-analysis-decompound-6.8.4.0.zip
```

Enable automatically startup

```
sudo systemctl enable elasticsearch.service
```

Start/Stop/Restart:

```
sudo systemctl start|stop|restart elasticsearch.service
```

### kibana

```
wget https://artifacts.elastic.co/downloads/kibana/kibana-6.8.4-amd64.deb

sudo dpkg -i kibana-6.8.4-amd64.deb
```

Configure kibana here ```/etc/kibana/kibana.yml```

Enable automatically startup

```
sudo systemctl enable kibana.service
```

Start/Stop/Restart:

```
sudo systemctl start|stop|restart kibana.service
```

Acess http://localhost:5601/




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

oder

> mocha -r ts-node/register test/*.spec.ts

# Development

The main document is "server/model/index-document.ts", which represents the Elasticsearch document. This model is used by all harvester and helps to stay synchronized. When adding a new index field then the compiler will let you know about missing implementations.

# Release

* Update changelog-file
* Commit and merge **develop** as a new commit to **master** branch
* create annotated tag with message "Release"
  * `git tag -m "Release" X.Y.Z`

* Push master (Jenkins baut RPM)
  * Master und develop sollten nicht gleichzeitig gepusht werden (createrepo-Befehl macht Probleme)
* Push develop (Jenkins baut nächste development RPM)
* auf Server: mcloud-dev-1.wemove.com (user *root*)
  * Release RPM von */var/www/mcloud-deploy-develop/* nach */var/www/mcloud-deploy/* kopieren
  * sudo createrepo /var/www/mcloud-deploy/
* Release-Seite aktualisieren (https://redmine.wemove.com/projects/bmvi-datenportal/wiki/Release-Changes)
