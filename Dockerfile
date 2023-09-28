#
# IMAGE: build server
#
FROM node:16.20.2-bookworm-slim AS build-server
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
FROM node:16.20.2-bookworm-slim AS build-client
LABEL stage=build

# install build dependencies
WORKDIR /opt/ingrid/harvester/client
COPY ./client/package*.json ./
RUN npm ci

# copy src files
WORKDIR /opt/ingrid/harvester
COPY . .

# build client
WORKDIR /opt/ingrid/harvester/client
RUN npm run prod


#
# IMAGE: final
#
FROM node:16.20.2-bookworm-slim AS final

RUN apt-get update && \
    apt-get install -y --no-install-recommends \
    dumb-init && \
    apt-get clean && \
    rm -rf /var/lib/apt/lists/*

# install production dependencies (also: remove large, unused, and not-asked-for-at-all ExcelJS map files)
WORKDIR /opt/ingrid/harvester/server
COPY --chown=node:node ./server/package*.json ./
RUN npm run install-production && rm -rf /opt/ingrid/harvester/server/node_modules/exceljs/dist/*.map

# copy built files from server and client
WORKDIR /opt/ingrid/harvester
COPY --chown=node:node --from=build-server /opt/ingrid/harvester/server/build .
COPY --chown=node:node --from=build-client /opt/ingrid/harvester/client/dist/webapp server/app/webapp

EXPOSE 8090

USER node

CMD ["dumb-init"]