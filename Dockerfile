FROM node:16.16.0-alpine

WORKDIR /opt/mcloud
COPY . ./

WORKDIR /opt/mcloud/server
RUN npm install

WORKDIR /opt/mcloud/client
RUN npm install

EXPOSE 4200
EXPOSE 8090
EXPOSE 9200

CMD ["tail", "-f", "/dev/null"]