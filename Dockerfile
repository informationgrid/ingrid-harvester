#
# IMAGE: build server
#
FROM node:16.18.0-bullseye-slim AS build-server
LABEL stage=build

# install build dependencies
WORKDIR /opt/mcloud/server
COPY ./server/package.json package.json
RUN npm install

# copy src files
WORKDIR /opt/mcloud
COPY . .

# build (transpile) server
WORKDIR /opt/mcloud/server
RUN npm run build


#
# IMAGE: build client
#
FROM node:16.18.0-bullseye-slim AS build-client
LABEL stage=build

# install build dependencies
WORKDIR /opt/mcloud/client
COPY ./client/package.json package.json
RUN npm install

# copy src files
WORKDIR /opt/mcloud
COPY . .

# build client
WORKDIR /opt/mcloud/client
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
WORKDIR /opt/mcloud/server
COPY ./server/package.json package.json
RUN npm run install-production

# copy built files from server and client
WORKDIR /opt/mcloud
COPY --from=build-server /opt/mcloud/server/build .
COPY --from=build-client /opt/mcloud/client/dist/webapp server/app/webapp

EXPOSE 8090

RUN adduser --uid 1001 --group --system metadata && \
    chown -R metadata:metadata /opt/mcloud

USER metadata

CMD ["dumb-init"]