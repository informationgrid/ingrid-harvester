ARG NODE_BASE_IMAGE="node:20-alpine"

#
# IMAGE: build server
#
FROM ${NODE_BASE_IMAGE} AS build-server
LABEL stage=build

# install build dependencies
WORKDIR /opt/ingrid/harvester/server
COPY ./server/package*.json ./
RUN npm ci --omit=optional

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
RUN npm run prod


#
# IMAGE: final
#
FROM ${NODE_BASE_IMAGE} AS final

ENV IMPORTER_PROFILE=ingrid

# install tini
RUN apk add --no-cache tini

WORKDIR /opt/ingrid/harvester

# install production dependencies
RUN chown node:node /opt/ingrid/harvester
COPY --chown=node:node ./server/package*.json ./
RUN npm run install-production

# copy built files from server and client
COPY --chown=node:node --from=build-server /opt/ingrid/harvester/server/build/server .
COPY --chown=node:node --from=build-client /opt/ingrid/harvester/client/dist/webapp ./app/webapp
COPY --chown=node:node entrypoint.sh ./entrypoint.sh

EXPOSE 8090

USER node

ENTRYPOINT ["/sbin/tini", "--", "./entrypoint.sh"]
CMD ["node", "app/index.js"]
