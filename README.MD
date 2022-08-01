# Installation

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
configure the address of the Elasticsearch URL where the data shall be indexed to ('elasticSearchUrl').

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
