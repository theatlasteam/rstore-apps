#!/system/bin/sh
# The native controller stops its own validated PID before invoking this hook.
set -eu
rm -f "$REFRESH_APP_DATA/capability" "$REFRESH_APP_DATA/profile.json" "$REFRESH_APP_DATA/xray.json" "$REFRESH_APP_DATA/proxy-password" "$REFRESH_APP_DATA/xray.pid"
rmdir "$REFRESH_APP_DATA" 2>/dev/null || true
