#!groovy
pipeline {
    agent any
    triggers{ cron( getCronParams() ) }

    environment {
        registry = "docker-registry.wemove.com/ingrid-harvester"
        RPM_PUBLIC_KEY  = credentials('ingrid-rpm-public')
        RPM_PRIVATE_KEY = credentials('ingrid-rpm-private')
        RPM_SIGN_PASSPHRASE = credentials('ingrid-rpm-passphrase')
    }

    options {
        buildDiscarder(logRotator(numToKeepStr: '5', artifactNumToKeepStr: '5'))
    }

    stages {
        stage('Build') {
            agent {
                docker {
                    image 'node:20.18.2-alpine3.21'
                    reuseNode true
                }
            }
            steps {
                sh "cd client && npm ci && npm run prod"
                sh "cd server && npm ci && npm run build"
            }
        }

        stage('Build and Push Image') {
            when {
                branch 'main'
            }
            steps {
                script {
                    (version, snapshotVersion) = versionsFromGit()
                    echo "VERSION:" + version
                    dockerImage = docker.build registry + ":" + version
                    dockerImage.push()
                }
            }
        }
        stage('Build and Push Develop Image') {
            when {
                branch 'develop'
            }
            steps {
                script {
                    (version, snapshotVersion) = versionsFromGit()
                    dockerImageSnapshot = docker.build registry + ":" + snapshotVersion
                    dockerImageSnapshot.push()
                    dockerImageLatest = docker.build registry + ":latest"
                    dockerImageLatest.push()
                }
            }
        }
        stage('Build and Push Branch Image') {
            when {
                not {
                    anyOf {
                        branch 'main'
                        branch 'develop'
                    }
                }
            }
            steps {
                script {
                    dockerImageBranch = docker.build registry + ":" + env.BRANCH_NAME
                    dockerImageBranch.push()
                }
            }
        }

        stage('Build RPM') {
            when { expression { return shouldBuildDevOrRelease() } }
            steps {
                script {
                    sh "sed -i 's/^Version:.*/Version: ${determineVersion()}/' rpm/ingrid-harvester.spec"
                    sh "sed -i 's/^Release:.*/Release: ${env.TAG_NAME ? '1' : 'dev'}/' rpm/ingrid-harvester.spec"

                    def containerId = sh(script: "docker run -d -e RPM_SIGN_PASSPHRASE=\$RPM_SIGN_PASSPHRASE --entrypoint=\"\" docker-registry.wemove.com/ingrid-rpmbuilder-jdk21-improved tail -f /dev/null", returnStdout: true).trim()

                    try {

                        sh """
                            docker cp server/build/server ${containerId}:/files &&
                            docker cp rpm/ingrid-harvester.spec ${containerId}:/root/rpmbuild/SPECS/ingrid-harvester.spec &&
                            docker cp rpm/. ${containerId}:/rpm &&
                            docker cp \$RPM_PUBLIC_KEY ${containerId}:/public.key &&
                            docker cp \$RPM_PRIVATE_KEY ${containerId}:/private.key &&
                            docker exec ${containerId} bash -c "
                            rpmbuild -bb /root/rpmbuild/SPECS/ingrid-harvester.spec &&
                            gpg --batch --import public.key &&
                            gpg --batch --import private.key &&
                            expect /rpm-sign.exp /root/rpmbuild/RPMS/noarch/*.rpm
                            "
                        """

                        sh "docker cp ${containerId}:/root/rpmbuild/RPMS/noarch ./build/rpms"

                    } finally {
                        sh "docker rm -f ${containerId}"
                    }

                    archiveArtifacts artifacts: 'build/rpms/ingrid-harvester-*.rpm', fingerprint: true
                }
            }
        }

        stage('Deploy RPM') {
            when { expression { return shouldBuildDevOrRelease() } }
            steps {
                script {
                    def repoType = env.TAG_NAME ? "rpm-ingrid-releases" : "rpm-ingrid-snapshots"
                    sh "mv build/reports/bom.json build/reports/ingrid-harvester-${determineVersion()}.bom.json"
                    // Test comment

                    withCredentials([usernamePassword(credentialsId: '9623a365-d592-47eb-9029-a2de40453f68', passwordVariable: 'PASSWORD', usernameVariable: 'USERNAME')]) {
                        sh '''
                            curl -f --user $USERNAME:$PASSWORD --upload-file build/rpms/*.rpm https://nexus.informationgrid.eu/repository/''' + repoType + '''/
                            curl -f --user $USERNAME:$PASSWORD --upload-file build/reports/*.bom.json https://nexus.informationgrid.eu/repository/''' + repoType + '''/
                        '''
                    }
                }
            }
        }
    }
}

def versionsFromGit() {
    def latestVersion = sh script: 'git describe --tags $(git rev-list --branches=origin/main --tags --max-count=1)', returnStdout: true
    latestVersion = latestVersion ? latestVersion.trim() : "0.0.0"
    def (major, minor, patch) = latestVersion.tokenize('.').collect { it.toInteger() }
    def snapshotVersion = "${major}.${minor + 1}.0-SNAPSHOT"
    return [latestVersion, snapshotVersion]
}

def getCronParams() {
    String tagTimestamp = env.TAG_TIMESTAMP
    long diffInDays = 0
    if (tagTimestamp != null) {
        long diff = "${currentBuild.startTimeInMillis}".toLong() - "${tagTimestamp}".toLong()
        diffInDays = diff / (1000 * 60 * 60 * 24)
        echo "Days since release: ${diffInDays}"
    }

    def versionMatcher = /\d\.\d\.\d(.\d)?/
    if( env.TAG_NAME ==~ versionMatcher && diffInDays < 180) {
        // every Sunday between midnight and 6am
        return 'H H(0-6) * * 0'
    }
    else {
        return ''
    }
}

def determineVersion() {
    if (env.TAG_NAME) {
        return env.TAG_NAME
    } else {
        return env.BRANCH_NAME.replaceAll('/', '_')
    }
}

def shouldBuildDevOrRelease() {
    // If no tag is being built OR it is the first build of a tag
    return !buildingTag() || (buildingTag() && currentBuild.number == 1)
}
