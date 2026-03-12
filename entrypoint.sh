#!/bin/sh
set -e

# Replace <base href="."> in index.html
if [ -n "$BASE_URL" ]; then
    sed -i "s@<base href=\".\">@<base href=\"$BASE_URL\">@" /opt/ingrid/harvester/app/webapp/index.html
fi

exec "$@"
