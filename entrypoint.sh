#!/bin/sh
set -e

# Replace <base href="."> in index.html
if [ -n "$BASE_URL" ]; then
    sed -i "s@<base href=\".\">@<base href=\"$BASE_URL\">@" /opt/ingrid/harvester/app/webapp/index.html
fi

# Update config.json with passportEnabled and keycloakEnabled
CONFIG_FILE="/opt/ingrid/harvester/app/webapp/assets/config.json"
if [ -f "$CONFIG_FILE" ]; then
    if [ -n "$BASE_URL" ]; then
        sed -i "s@\"contextPath\": \".*\"@\"contextPath\": \"$BASE_URL\"@" $CONFIG_FILE
    fi
    if [ -n "$PASSPORT_ENABLED" ]; then
        sed -i "s/\"passportEnabled\": [a-z]*/\"passportEnabled\": $PASSPORT_ENABLED/" $CONFIG_FILE
    fi
    if [ -n "$KEYCLOAK_ENABLED" ]; then
        sed -i "s/\"keycloakEnabled\": [a-z]*/\"keycloakEnabled\": $KEYCLOAK_ENABLED/" $CONFIG_FILE
    fi
fi

# Update keycloak.json with auth-server-url and credentials.secret
KEYCLOAK_FILE="/opt/ingrid/harvester/keycloak.json"
if [ -f "$KEYCLOAK_FILE" ]; then
    if [ -n "$KEYCLOAK_AUTH_SERVER_URL" ]; then
        sed -i "s@\"auth-server-url\": \".*\"@\"auth-server-url\": \"$KEYCLOAK_AUTH_SERVER_URL\"@" $KEYCLOAK_FILE
    fi
    if [ -n "$KEYCLOAK_CREDENTIALS_SECRET" ]; then
        sed -i "s/\"secret\": \".*\"/\"secret\": \"$KEYCLOAK_CREDENTIALS_SECRET\"/" $KEYCLOAK_FILE
    fi
fi

exec "$@"
