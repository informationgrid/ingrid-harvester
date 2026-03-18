#!/bin/sh
set -e

# Replace <base href="."> in index.html
if [ -n "$BASE_URL" ]; then
    sed -i "s@<base href=\".\">@<base href=\"$BASE_URL\">@" /opt/ingrid/harvester/app/webapp/index.html
fi

# Update config.json with passportEnabled and keycloakEnabled
CONFIG_FILE="/opt/ingrid/harvester/app/webapp/assets/config.json"
if [ -f "$CONFIG_FILE" ]; then
    if [ -n "$PASSPORT_ENABLED" ]; then
        sed -i "s/\"passportEnabled\": [a-z]*/\"passportEnabled\": $PASSPORT_ENABLED/" "$CONFIG_FILE"
    fi
    if [ -n "$KEYCLOAK_ENABLED" ]; then
        sed -i "s/\"keycloakEnabled\": [a-z]*/\"keycloakEnabled\": $KEYCLOAK_ENABLED/" "$CONFIG_FILE"
    fi
fi

exec "$@"
