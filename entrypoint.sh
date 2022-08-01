
# tail -f /dev/null

# echo "yoink1"

cd /opt/mcloud/client
npm run start &

# echo "yoink2"

cd /opt/mcloud/server
npm run start-dev-16

# echo "yoink3"
