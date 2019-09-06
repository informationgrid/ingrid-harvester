chown -R ingrid /opt/ingrid/mcloud-importer
chgrp -R ingrid /opt/ingrid/mcloud-importer
cd /opt/ingrid/mcloud-importer
npm install -g pm2
npm run install-production
systemctl enable mcloud-importer
systemctl restart mcloud-importer
