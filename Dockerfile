FROM node:16.16.0-alpine

RUN mkdir -p /opt/mcloud
WORKDIR /opt/mcloud
COPY . ./

RUN npm install --location=global pm2

WORKDIR /opt/mcloud/server
RUN npm install

WORKDIR /opt/mcloud/client
RUN npm install

EXPOSE 4200
EXPOSE 8090

# CMD ["tail", "-f", "/dev/null"]
# CMD ["npm", "run", "start-dev-16"]