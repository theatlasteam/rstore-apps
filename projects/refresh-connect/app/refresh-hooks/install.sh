#!/system/bin/sh
# Trusted, SHA-pinned lifecycle hook. No routes, boot hooks or automatic connection.
set -eu
umask 077
mkdir -p "$REFRESH_APP_DATA"
chmod 700 "$REFRESH_APP_DATA"
test -x "$REFRESH_DEP_XRAY"
