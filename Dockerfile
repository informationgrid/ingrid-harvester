#
# IMAGE: build server and client
#
FROM node:16.18.0-bullseye-slim AS build
LABEL stage=build

# install build dependencies
COPY ./server/package.json /opt/mcloud/server/package.json
WORKDIR /opt/mcloud/server
RUN npm install

# install build dependencies
COPY ./client/package.json /opt/mcloud/client/package.json
WORKDIR /opt/mcloud/client
RUN npm install

# copy src files
WORKDIR /opt/mcloud
COPY . .

# build (transpile) server
WORKDIR /opt/mcloud/server
RUN npm run build

# build client
WORKDIR /opt/mcloud/client
RUN npm run prod


#
# IMAGE: final
#
FROM node:16.18.0-bullseye-slim as final

# TODO: remove these dev tools for production
RUN apt-get update && \
    apt-get install -y --no-install-recommends \
    curl dumb-init nano telnet wget && \
    apt-get clean && \
    rm -rf /var/lib/apt/lists/*

# install production dependencies
COPY ./server/package.json /opt/mcloud/server/package.json
WORKDIR /opt/mcloud/server
RUN npm run install-production

# copy built files from server and client
WORKDIR /opt/mcloud
COPY --from=build /opt/mcloud/server/build .
COPY --from=build /opt/mcloud/client/dist/webapp /opt/mcloud/server/app/webapp

EXPOSE 8090 9200

CMD ["dumb-init"]