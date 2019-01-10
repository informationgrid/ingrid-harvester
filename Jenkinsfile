pipeline {
    agent {
        docker { 
            image 'docker-registry.wemove.com/ingrid-rpmbuilder'
        }
    }

    tools {
        nodejs "nodejs8"
    }
    
    environment {
        RPM_PUBLIC_KEY  = credentials('mcloud-rpm-public')
        RPM_PRIVATE_KEY = credentials('mcloud-rpm-private')
        MCLOUD_SIGN_PASSPHRASE = credentials('mcloud-rpm-passphrase')
        PATH = "$NODEJS_HOME/bin:$PATH"
    }

    options {
        gitLabConnection('GitLab (wemove)')
        buildDiscarder(logRotator(numToKeepStr: '30', artifactNumToKeepStr: '5'))
    }

    triggers {
        gitlab(triggerOnPush: true, triggerOnMergeRequest: true, branchFilterType: 'All')
    }
    
    stages {

        stage('Prepare') {
            steps {
                sh 'mkdir -p /root/rpmbuild/SOURCES/mcloud-ingrid/ingrid-excel-import'
                sh 'rm -rf dist && mkdir -p dist'
                sh 'rm -rf dist-rpm && mkdir -p dist-rpm'

                echo 'Since environment variables are not updated within docker, we have to use full path to nodejs'
                sh '$NODEJS_HOME/bin/node --version'
                sh '$NODEJS_HOME/bin/node $NODEJS_HOME/bin/npm install && $NODEJS_HOME/bin/node $NODEJS_HOME/bin/npm run build --scripts-prepend-node-path=auto'

                sh 'cp -r ./dist/* /root/rpmbuild/SOURCES/mcloud-ingrid/ingrid-excel-import'
                sh 'cp ./docker/package.json /root/rpmbuild/SOURCES/mcloud-ingrid/ingrid-excel-import'
                sh 'cp ./docker/*.spec /root/rpmbuild/SPECS'
                sh 'cp ./docker/ingrid.service /root/rpmbuild/SOURCES'
            }
        }
        stage('Test') {
            steps {
                sh '$NODEJS_HOME/bin/node $NODEJS_HOME/bin/npm run test-jenkins --scripts-prepend-node-path=auto'
            }
        }
        stage('Create') {
            steps {
                sh 'rpmbuild -ba /root/rpmbuild/SPECS/mcloud-ingrid.spec'
            }
        }
        stage('Sign') {
            steps {
                sh 'echo "%_gpg_name wemove digital solutions GmbH <contact@wemove.com>" > ~/.rpmmacros'
                withCredentials([file(credentialsId: 'mcloud-rpm-public', variable: 'rpm-key-public')]) {
                    sh 'gpg --import $RPM_PUBLIC_KEY'
                    sh 'gpg --import $RPM_PRIVATE_KEY'
                    sh 'expect /rpm-sign.exp /root/rpmbuild/RPMS/noarch/*.rpm'
                }
            }
        }
        stage('Archive') {
            steps {
                sh 'mv /root/rpmbuild/RPMS/noarch/*.rpm ./dist-rpm/'
                archiveArtifacts artifacts: 'dist-rpm/*.rpm'
            }
        }
        stage('Deploy') {
            steps {
                withCredentials([usernamePassword(credentialsId: 'ingrid_mcloud-dev', passwordVariable: 'SSHPASS', usernameVariable: 'username')]) {
                    sh 'sshpass -ve scp -o StrictHostKeyChecking=no ./dist-rpm/*.rpm ingrid@mcloud-dev-1.wemove.com:/var/www/mcloud-deploy-develop/'
                    sh 'sshpass -ve ssh -o StrictHostKeyChecking=no ingrid@mcloud-dev-1.wemove.com createrepo --update /var/www/mcloud-deploy-develop/'
                }
            }
        }
    }
    post {
        always {
            junit 'report.xml'
            deleteDir() /* clean up our workspace */
        }
    }
}
