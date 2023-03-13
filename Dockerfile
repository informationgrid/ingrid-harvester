#
# IMAGE: build server
#
FROM node:16.18.0-bullseye-slim AS build-server
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
FROM node:16.18.0-bullseye-slim AS build-client
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
FROM node:16.18.0-bullseye-slim AS final

# TODO: remove these dev tools for production
RUN apt-get update && \
    apt-get install -y --no-install-recommends \
    curl dumb-init nano telnet wget && \
    apt-get clean && \
    rm -rf /var/lib/apt/lists/*

# install production dependencies
WORKDIR /opt/ingrid/harvester/server
COPY ./server/package*.json ./
RUN npm run install-production

# copy built files from server and client
WORKDIR /opt/ingrid/harvester
COPY --from=build-server /opt/ingrid/harvester/server/build .
COPY --from=build-client /opt/ingrid/harvester/client/dist/webapp server/app/webapp

EXPOSE 8090

RUN adduser --uid 1001 --group --system metadata && \
    chown -R metadata:metadata /opt/ingrid/harvester

USER metadata

CMD ["dumb-init"]