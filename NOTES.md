# Usage notes 

* If you comment out `throw new Unauthorized("Unauthorized");`, you will have no sidebar
* Use nodejs <= 16.X
* When using nodejs >= 14, use `npm run start-dev-16` instead of `npm run start-dev`
* For dockerizing:
    * sudo docker-compose up
* Elasticsearch basic auth setup:
    * **ATTENTION**: most of the following steps are not necessary, because they have been included into the build process or into the scripts residing at ./elasticsearch. Look there for more information. We'll keep the following lines here for general reference.
    * stop elasticsearch service
    * edit `/etc/elasticsearch/elasticsearch.yml`, add:
        ```
        xpack.security.enabled: true<br>
        discovery.type: single-node
        ```
    * restart elasticsearch service
    * create passwords for all existing system users:
        ```
        cd /usr/share/elasticsearch/bin
        sudo ./elasticsearch-setup-passwords auto
        ```
    * save passwords in keepass
    * create role `role_r` for read access on all indices:
        ```
        curl -u elastic:$elasticpassword -XPOST http://elasticsearchUrl:9200/_xpack/security/role/role_r -H 'Content-Type: application/json' -d'{"indices": [{"names": ["*"],"privileges": ["read", "view_index_metadata"],"allow_restricted_indices": false}]}'
    * create role `role_rw` for read/write access on all indices:
        ```
        curl -u elastic:$elasticpassword -XPOST http://elasticsearchUrl:9200/_xpack/security/role/role_rw -H 'Content-Type: application/json' -d'{"indices": [{"names": ["*"],"privileges": ["all"],"allow_restricted_indices": false}]}'
        ```
    * create 2 new users (one with r/w, one with read access):
        ```
        curl -u elastic:elastic -XPOST http://localhost:9200/_xpack/security/user/r_user -H 'Content-Type: application/json' -d'{"roles": ["role_r"],"password":"password_for_r_user"}'

        curl -u elastic:$elasticpassword -XPOST http://elasticsearchUrl:9200/_xpack/security/user/rw_user -H 'Content-Type: application/json' -d'{"roles": ["role_rw"],"password":"password_for_rw_user"}'
        ```
    * update application, replace:
        ```javascript
        this.client = new elasticsearch.Client({
            host: this.settings.elasticSearchUrl
        });
        ```
        with
        ```javascript
        this.client = new elasticsearch.Client({
            host: [{
                host: this.settings.elasticSearchUrl,
                auth: 'rw_user:password_for_rw_user',
            }]
        });
        ```

## Useful endpoints
  * create role: `POST` http://elasticsearchUrl:9200/_xpack/security/role/my_role
  * update role: `PUT` http://elasticsearchUrl:9200/_xpack/security/role/my_role
  * list roles: `GET` http://elasticsearchUrl:9200/_xpack/security/role

## Sources

* https://unixcop.com/setup-x-pack-security-on-elasticsearch-and-kibana/
* https://acloudguru.com/hands-on-labs/configure-user-access-control-for-elasticsearch