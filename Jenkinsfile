pipeline {
    agent {
        docker {
            image 'docker-registry.wemove.com/ingrid-rpmbuilder'
        }
    }

    environment {
        RPM_PUBLIC_KEY  = credentials('mcloud-rpm-public')
        RPM_PRIVATE_KEY = credentials('mcloud-rpm-private')
        RPM_SIGN_PASSPHRASE = credentials('mcloud-rpm-passphrase')
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

        stage('Create') {
            steps {
                sh './gradlew clean bundle'
                sh './mvnw clean package -Dmaven.test.failure.ignore=true -s .mvn/settings.xml'
            }
        }
        stage('Sign') {
            steps {
                sh 'echo "%_gpg_name wemove digital solutions GmbH <contact@wemove.com>" > ~/.rpmmacros'
                withCredentials([file(credentialsId: 'mcloud-rpm-public', variable: 'rpm-key-public')]) {
                    sh 'gpg --import $RPM_PUBLIC_KEY'
                    sh 'gpg --import $RPM_PRIVATE_KEY'
                    sh 'expect /rpm-sign.exp target/rpm/mcloud-ingrid/RPMS/noarch/*.rpm'
                }
            }
        }
        stage('Archive') {
            steps {
                archiveArtifacts artifacts: 'target/rpm/mcloud-ingrid/RPMS/noarch/*.rpm'
            }
        }
        stage('Deploy') {
            steps {
                withCredentials([usernamePassword(credentialsId: 'ingrid_mcloud-dev', passwordVariable: 'SSHPASS', usernameVariable: 'username')]) {
                    sh 'sshpass -ve scp -o StrictHostKeyChecking=no target/rpm/mcloud-ingrid/RPMS/noarch/*.rpm ingrid@mcloud-dev-1.wemove.com:/var/www/mcloud-deploy-develop/'
                    sh 'sshpass -ve ssh -o StrictHostKeyChecking=no ingrid@mcloud-dev-1.wemove.com createrepo --update /var/www/mcloud-deploy-develop/'
                }
            }
        }
    }
    post {
        always {
            junit 'server/report.xml'
            //deleteDir() /* clean up our workspace */
        }
    }
}
