# Installation

If nodejs is not yet installed on the system than run:

> sudo yum install nodejs

or for ubuntu 

> sudo apt-get install nodejs



Run the following command to install all necessary dependencies:

> npm install


## Installation elastic search

Download elastic search 2.4.6 here:

https://download.elastic.co/elasticsearch/release/org/elasticsearch/distribution/zip/elasticsearch/2.4.6/elasticsearch-2.4.6.zip

unzip in folder.

Go to elasticsearch folder and execute

```
bin/plugin install https://nexus.informationgrid.eu/repository/maven-releases/de/ingrid/elasticsearch/decompound-plugin/2.4.6.0/decompound-plugin-2.4.6.0.zip
```

or if downloaded before

```
bin/plugin install file:///decompound-plugin-2.4.6.0.zip
```

Start elasticsearch

```
bin/elasticsearch
```



## Installation elastic search as ubuntu 16.04 service

```
wget https://download.elastic.co/elasticsearch/release/org/elasticsearch/distribution/deb/elasticsearch/2.4.6/elasticsearch-2.4.6.deb

sudo dpkg -i elasticsearch-2.4.6.deb
```

This results in Elasticsearch being installed in ```/usr/share/elasticsearch/``` with its configuration files placed in ```/etc/elasticsearch``` and its init script added in ```/etc/init.d/elasticsearch```.


Install decompound plugin

```
cd /usr/share/elasticsearch
sudo bin/plugin install https://nexus.informationgrid.eu/repository/maven-releases/de/ingrid/elasticsearch/decompound-plugin/2.4.6.0/decompound-plugin-2.4.6.0.zip
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
wget https://artifacts.elastic.co/downloads/kibana/kibana-4.6.6-amd64.deb

sudo dpkg -i elasticsearch-4.6.6.deb
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
configure the address of the elasticsearch URL where the data shall be indexed to ('elasticSearchUrl').

# Run

Execute the following command to run a single import:

> npm start

# Debug

Get all dependencies:

> npm install

In visual studio code hit 5.

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
