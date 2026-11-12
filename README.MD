# InGrid Harvester

<img src="https://ingrid-oss.eu/8.2.0/assets/components/ingrid-plattform.png" alt="InformationGrid illustration" width="480" align="right">

This repository is part of **[InGrid](https://ingrid-oss.eu)**, an open-source solution for building, managing, and exposing metadata-driven information systems. 

**About InGrid Harvester:**  
Standalone component that collects data from diverse sources and stores it in Elasticsearch indices for processing, ensuring data is always available in a unified format.

# Installation

The InGrid Harvester runs two components in a single docker container: the actual `server` application and the admin `client`. It depends on an Elasticsearch instance and a PostgreSQL installation.

## Configuration

### General notes

* If you want the InGrid Harvester to be accessed at a sub-path (i.e., not directly at root), you have to **both**
  * set `BASE_URL` to the desired path (environment variable)
  * set `contextPath` in the client config file to the same value
* This is in addition to appropriate webserver settings

### Keycloak

Keycloak login uses the existing `server/keycloak.json` (no new settings). The Keycloak client must allow the redirect URI
`<public origin><BASE_URL>/rest/auth/keycloak/callback`, e.g.
* root deployment: `https://harvester.example.org/rest/auth/keycloak/callback`
* sub-path deployment (`BASE_URL=/harvester`): `https://harvester.example.org/harvester/rest/auth/keycloak/callback`

For logout, also add `<public origin><BASE_URL>/login` to the Keycloak client's **Valid post logout redirect URIs** (for example, `https://harvester.example.org/harvester/login` when `BASE_URL=/harvester`).

The public origin is taken from the request. Behind a TLS-terminating reverse proxy, set `TRUST_PROXY` to explicitly configure Express proxy trust; it defaults to `false`, so forwarded headers are ignored. Prefer the proxy's source IP/CIDR (for example, in a Kubernetes Deployment set `TRUST_PROXY=10.42.8.0/24`, replacing this with the ingress controller's actual source range). `TRUST_PROXY=1` is also supported when the application is reachable only through exactly one proxy hop. The proxy must set the public `Host` (or `X-Forwarded-Host`) and `X-Forwarded-Proto: https` headers. Restrict direct access to the application; avoid `TRUST_PROXY=true`, which trusts forwarded headers from every source. Plain HTTP is only accepted when `ssl-required` is `none`.

Typical values (`TRUST_PROXY` accepts `false`, a hop count, or a comma-separated list of IPs/CIDRs/`loopback`/`linklocal`/`uniquelocal`):
* Kubernetes Ingress (ingress-nginx): `TRUST_PROXY=<pod CIDR of the ingress controller>`; ingress-nginx sets `X-Forwarded-Proto`/`X-Forwarded-Host` by default.
* Nginx on the same host: `TRUST_PROXY=loopback` with `proxy_set_header Host $host;` and `proxy_set_header X-Forwarded-Proto $scheme;`.
* AWS ALB: `TRUST_PROXY=<subnet CIDR(s) of the ALB>` (or `TRUST_PROXY=1` if the ALB is the only hop); ALB sets `X-Forwarded-Proto` and preserves `Host`.

### Configuration files

| Config file location (project) | Config file location (docker container)                    | Purpose                                         |
|--------------------------------|------------------------------------------------------------|-------------------------------------------------|
| server/config.json             | /opt/ingrid/harvester/server/config.json                   | Harvester configuration                         |
| server/config-general.json     | /opt/ingrid/harvester/server/config-general.json           | General settings (Elasticsearch, Postgres, ...) |
| client/src/assets/config.json  | /opt/ingrid/harvester/server/app/webapp/assets/config.json | Client settings                                 |

In a docker setup, you probably want to map these files from the host system into the container.

### Environment variables

Several general settings can also be configured via environment variables. These settings take precedence over configuration files.

For a complete list check the documentation at: [https://ingrid-oss.eu/latest/components/harvester/#umgebungsvariablen](https://ingrid-oss.eu/latest/components/harvester/#umgebungsvariablen)

## Local development setup

### Running in a local docker container

You can use the same setup as outlined in the section `Test setup` below, but with `docker-compose-dev.yml`. This scales down memory requirements and uses `ts-node-dev` instead of `node`.

### Running in a terminal

Prerequisites:
* NodeJS v22
* Postgresql >= v14
* Elasticsearch >= 8

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
  where `{profile}` is one of `ingrid`, `diplanung`, `lvr`
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

## Setup behind a proxy

If you run this component behind a proxy, make sure the websocket communication ist routed through the proxy.

Sample configuration apache:

```
  # 1. Ensure headers are passed (Socket.io needs these to stay intact)
  # ensure the module proxy_wstunnel is activated
  RewriteEngine On
  RewriteCond %{HTTP:Upgrade} =websocket [NC]
  RewriteRule ^/socket.io/(.*) ws://127.0.0.1:8090/socket.io/$1 [P,L]
```

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
