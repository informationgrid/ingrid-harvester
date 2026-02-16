#!/bin/sh

# Replace <base href="."> in index.html
sed -i "s@<base href=\".\">@<base href=\"$BASE_URL\">@" /opt/ingrid/harvester/app/webapp/index.html

exec "$@"
