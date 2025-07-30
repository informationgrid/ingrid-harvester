FROM node:20-alpine

ENV IMPORTER_PROFILE=ingrid

# install tini
RUN apk add --no-cache tini

# copy built files from server and client
WORKDIR /opt/ingrid/harvester
COPY ./server/build/server .
COPY ./server/node_modules ./node_modules
COPY ./client/dist/webapp app/webapp
RUN chown -R node:node .

EXPOSE 8090

USER node

WORKDIR /opt/ingrid/harvester
ENTRYPOINT ["/sbin/tini", "--"]
CMD ["node", "app/index.js"]
