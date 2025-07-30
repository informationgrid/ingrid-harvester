if [ "$1" = "0" ]; then
  systemctl stop ingrid-harvester
  systemctl disable ingrid-harvester
fi
exit 0
