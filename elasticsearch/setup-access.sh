# This script needs to be run on the Docker host
# once after the ES container is started the first time.

# This script sets up user accounts and API access to Elasticsearch.

# 1. Change passwords in set-pw-es.
# 2. Un-comment the folloing lines and replace the $TOKEN with the output of
# $ echo -n elastic:YOUR_ELASTIC_PASSWORD | base64
# 3. Run this file.

# # setup internal passwords
# sudo docker exec mcloud-elastic /bin/sh -c "yum -y install expect && /usr/share/elasticsearch/bin/set-pw-es"

# # create readonly role
# curl -X POST http://localhost:9200/_xpack/security/role/read_role \
# -H 'Content-Type: application/json' \
# -H 'Authorization: Basic $TOKEN' \
# -d @create-roles.json

# # create readonly user
# curl -XPOST http://localhost:9200/_xpack/security/user/read_user \
# -H 'Content-Type: application/json' \
# -H 'Authorization: Basic $TOKEN' \
# -d @create-users.json