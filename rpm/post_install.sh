cd /opt/ingrid/mcloud-importer
npm install -g pm2
npm run install-production
systemctl enable mcloud-importer
systemctl start mcloud-importer
