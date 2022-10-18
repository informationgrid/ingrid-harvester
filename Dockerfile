#
# IMAGE: build server and client
#
FROM node:16.18.0-bullseye-slim AS build
LABEL stage=build

# copy src files
WORKDIR /opt/mcloud
COPY . .

# install build dependencies, build (transpile) server
WORKDIR /opt/mcloud/server
RUN npm install && npm run build

# install build dependencies, build client
WORKDIR /opt/mcloud/client
RUN npm install && npm run prod


#
# IMAGE: final
#
FROM node:16.18.0-bullseye-slim as final

# TODO: remove these dev tools for production
RUN apt-get update && apt-get install -y curl dumb-init nano telnet wget && apt-get clean

# copy built files from server and client
WORKDIR /opt/mcloud
COPY --from=build /opt/mcloud/server/build .
COPY --from=build /opt/mcloud/client/dist/webapp /opt/mcloud/server/app/webapp

# install production dependencies
WORKDIR /opt/mcloud/server
RUN npm run install-production

EXPOSE 8090 9200

CMD ["dumb-init"]