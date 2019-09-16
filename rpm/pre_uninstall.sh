if [ "$1" = "0" ]; then
  systemctl stop mcloud-importer
  systemctl disable mcloud-importer
fi
exit 0
