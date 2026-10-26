#!/bin/sh
set -e

# Apply a sed expression without replacing the target file's inode.
replace_in_file() {
    expr="$1"
    file="$2"
    variable="$3"
    if [ ! -w "$file" ]; then
        echo "WARN: $file not writable, skipping $variable substitution" >&2
        return 0
    fi
    tmp=$(mktemp)
    sed "$expr" "$file" > "$tmp"
    cat "$tmp" > "$file"
    rm -f "$tmp"
}

# Replace <base href="."> in index.html
if [ -n "$BASE_URL" ]; then
    replace_in_file "s@<base href=\".\">@<base href=\"$BASE_URL\">@" /opt/ingrid/harvester/app/webapp/index.html BASE_URL
fi

# Update config.json with passportEnabled and keycloakEnabled
CONFIG_FILE="/opt/ingrid/harvester/app/webapp/assets/config.json"
if [ -f "$CONFIG_FILE" ]; then
    if [ -n "$BASE_URL" ]; then
        replace_in_file "s@\"contextPath\": \".*\"@\"contextPath\": \"$BASE_URL\"@" "$CONFIG_FILE" BASE_URL
    fi
    if [ -n "$PASSPORT_ENABLED" ]; then
        replace_in_file "s/\"passportEnabled\": [a-z]*/\"passportEnabled\": $PASSPORT_ENABLED/" "$CONFIG_FILE" PASSPORT_ENABLED
    fi
    if [ -n "$KEYCLOAK_ENABLED" ]; then
        replace_in_file "s/\"keycloakEnabled\": [a-z]*/\"keycloakEnabled\": $KEYCLOAK_ENABLED/" "$CONFIG_FILE" KEYCLOAK_ENABLED
    fi
fi

# Update keycloak.json with auth-server-url and credentials.secret
KEYCLOAK_FILE="/opt/ingrid/harvester/keycloak.json"
if [ -f "$KEYCLOAK_FILE" ]; then
    if [ -n "$KEYCLOAK_AUTH_SERVER_URL" ]; then
        replace_in_file "s@\"auth-server-url\": \".*\"@\"auth-server-url\": \"$KEYCLOAK_AUTH_SERVER_URL\"@" "$KEYCLOAK_FILE" KEYCLOAK_AUTH_SERVER_URL
    fi
    if [ -n "$KEYCLOAK_CREDENTIALS_SECRET" ]; then
        replace_in_file "s/\"secret\": \".*\"/\"secret\": \"$KEYCLOAK_CREDENTIALS_SECRET\"/" "$KEYCLOAK_FILE" KEYCLOAK_CREDENTIALS_SECRET
    fi
fi

exec "$@"
