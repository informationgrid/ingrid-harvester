ARG NODE_BASE_IMAGE="node:20-alpine"

#
# IMAGE: build server
#
FROM ${NODE_BASE_IMAGE} AS build-server
LABEL stage=build

# install build dependencies
WORKDIR /opt/ingrid/harvester/server
COPY ./server/package*.json ./
RUN npm ci

# copy src files
WORKDIR /opt/ingrid/harvester
COPY . .

# build (transpile) server
WORKDIR /opt/ingrid/harvester/server
RUN npm run build


#
# IMAGE: build client
#
FROM ${NODE_BASE_IMAGE} AS build-client
ARG BASE_URL="/"
LABEL stage=build

# install build dependencies
WORKDIR /opt/ingrid/harvester/client
COPY ./client/package*.json ./
RUN npm ci --ignore-scripts

# copy src files
WORKDIR /opt/ingrid/harvester
COPY . .

# build client
WORKDIR /opt/ingrid/harvester/client
RUN npm run prod -- --base-href ${BASE_URL}

#
# IMAGE: final
#
FROM ${NODE_BASE_IMAGE} AS final

ENV IMPORTER_PROFILE=ingrid

# install tini
RUN apk add --no-cache tini

# install production dependencies (also: remove large, unused, and not-asked-for-at-all ExcelJS map files)
WORKDIR /opt/ingrid/harvester
RUN chown node:node /opt/ingrid/harvester
COPY --chown=node:node ./server/package*.json ./
RUN npm run install-production && rm -rf /opt/ingrid/harvester/node_modules/exceljs/dist/*.map

# copy built files from server and client
#WORKDIR /opt/ingrid/harvester
COPY --chown=node:node --from=build-server /opt/ingrid/harvester/server/build/server .
COPY --chown=node:node --from=build-client /opt/ingrid/harvester/client/dist/webapp ./app/webapp

EXPOSE 8090

USER node

WORKDIR /opt/ingrid/harvester
ENTRYPOINT ["/sbin/tini", "--"]
CMD ["node", "app/index.js"]
