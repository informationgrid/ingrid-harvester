chown -R ingrid /opt/ingrid/ingrid-harvester
chgrp -R ingrid /opt/ingrid/ingrid-harvester
cd /opt/ingrid/ingrid-harvester
#npm run install-production
systemctl restart ingrid-harvester
