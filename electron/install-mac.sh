#!/bin/bash
set -euo pipefail
PARENT="$1"; ARCHIVE="$2"; DESTINATION="$3"; RESULT="$4"; VERSION="$5"
BACKUP=""; STAGED=""; SWITCHED=0
report_failure() {
  if [ "$SWITCHED" = 1 ] && [ -d "$BACKUP" ]; then
    FAILED="${DESTINATION%.app}.failed-$(date +%s).app"
    if [ -d "$DESTINATION" ]; then mv "$DESTINATION" "$FAILED"; fi
    mv "$BACKUP" "$DESTINATION"
  fi
  printf '{"success":false,"message":"The Mac update could not finish. Your previous app and task data were preserved. Try again from Settings & backups."}' > "$RESULT"
  if [ -d "$DESTINATION" ]; then open "$DESTINATION"; fi
}
trap report_failure ERR
case "$DESTINATION" in /*/Daymark.app) ;; *) exit 1 ;; esac
case "$VERSION" in *[!0-9.]*|'') exit 1 ;; esac
INSTALLED_ID=$(/usr/libexec/PlistBuddy -c 'Print CFBundleIdentifier' "$DESTINATION/Contents/Info.plist")
[ "$INSTALLED_ID" = 'com.daymark.planner' ]
TEMPORARY=$(mktemp -d "$(dirname "$RESULT")/mac-install.XXXXXX")
/usr/bin/ditto -x -k "$ARCHIVE" "$TEMPORARY"
NEW="$TEMPORARY/Daymark.app"
[ ! -L "$NEW" ]
NEW_ID=$(/usr/libexec/PlistBuddy -c 'Print CFBundleIdentifier' "$NEW/Contents/Info.plist")
NEW_VERSION=$(/usr/libexec/PlistBuddy -c 'Print CFBundleShortVersionString' "$NEW/Contents/Info.plist")
[ "$NEW_ID" = 'com.daymark.planner' ] && [ "$NEW_VERSION" = "$VERSION" ]
/usr/bin/codesign --verify --deep --strict "$NEW"
STAGED="$(dirname "$DESTINATION")/.Daymark-staged-$(uuidgen).app"
/usr/bin/ditto "$NEW" "$STAGED"
/usr/bin/codesign --verify --deep --strict "$STAGED"
for ((i=0;i<60;i++)); do if ! kill -0 "$PARENT" 2>/dev/null; then break; fi; sleep 1; done
if kill -0 "$PARENT" 2>/dev/null; then exit 1; fi
BACKUP="$(dirname "$DESTINATION")/.Daymark-previous-$(uuidgen).app"
mv "$DESTINATION" "$BACKUP"
SWITCHED=1
mv "$STAGED" "$DESTINATION"
printf '{"success":true,"version":"%s"}' "$VERSION" > "$RESULT"
open "$DESTINATION"
# Retain the prior app as a rollback copy; never remove task data or unverified paths.
