#!groovy
pipeline {
    agent any
    triggers{ cron( getCronParams() ) }

    environment {
        registry = "docker-registry.wemove.com/ingrid-harvester"
    }

    options {
        buildDiscarder(logRotator(numToKeepStr: '5', artifactNumToKeepStr: '5'))
    }

    stages {
        stage('Build and Push Image') {
            steps {
                sh 'if [ -d build ]; then rm -rf build; fi'
                script {
                    if (env.TAG_NAME) {
                        env.VERSION = env.TAG_NAME
                    } else if (BRANCH_NAME == 'main') {
                        env.VERSION = 'latest'
                    } else {
                        env.VERSION = BRANCH_NAME.replaceAll('/', '-')
                    }
                    echo "VERSION: ${env.VERSION}"

                    dockerImage = docker.build(registry + ":" + env.VERSION, "--pull .")

                    if (shouldBuildDockerImage()) {
                        dockerImage.push()
                    }

                    // copy compiled app into workspace to be used by RPM task
                    dockerImage.inside {
                        sh "cp -r /opt/ingrid/harvester/ ${WORKSPACE}/build"
                    }
                }
            }
        }

        stage('Build RPM') {
            when { expression { return shouldBuildDevOrRelease() } }
            agent {
                docker {
                    image 'docker-registry.wemove.com/ingrid-rpmbuilder-jdk21-improved'
                    reuseNode true
                }
            }
            steps {
                script {
                    sh "sed -i 's/^Version:.*/Version: ${determineVersion()}/' rpm/ingrid-harvester.spec"
                    sh "sed -i 's/^Release:.*/Release: ${determineRpmReleasePart()}/' rpm/ingrid-harvester.spec"

                    // Prepare build
                    sh "mkdir -p ./build/rpms /root/rpmbuild/SPECS"
                    sh """
                        cp ${WORKSPACE}/rpm/ingrid-harvester.spec /root/rpmbuild/SPECS/ingrid-harvester.spec &&
                        rpmbuild -bb /root/rpmbuild/SPECS/ingrid-harvester.spec
                    """

                    // Build and sign RPM
                    withCredentials([
                        file(credentialsId: 'ingrid-rpm-public', variable: 'RPM_PUBLIC_KEY'),
                        file(credentialsId: 'ingrid-rpm-private', variable: 'RPM_PRIVATE_KEY'),
                        string(credentialsId: 'ingrid-rpm-passphrase', variable: 'RPM_SIGN_PASSPHRASE')
                    ]) {
                        sh 'gpg --batch --import $RPM_PUBLIC_KEY'
                        sh 'gpg --batch --import $RPM_PRIVATE_KEY'
                        sh "mkdir -p ./build/rpms/ingrid"
                        sh "cp -r /root/rpmbuild/RPMS/noarch/* ${WORKSPACE}/build/rpms/ingrid/"
                        sh "expect /rpm-sign.exp ${WORKSPACE}/build/rpms/ingrid/*.rpm"

                        archiveArtifacts artifacts: "build/rpms/ingrid/ingrid-harvester-*.rpm", fingerprint: true
                    }

                    withCredentials([
                        file(credentialsId: 'itzbund-ingrid-rpm-public', variable: 'RPM_PUBLIC_KEY'),
                        file(credentialsId: 'itzbund-ingrid-rpm-private', variable: 'RPM_PRIVATE_KEY'),
                        string(credentialsId: 'itzbund-ingrid-rpm-passphrase', variable: 'RPM_SIGN_PASSPHRASE')
                    ]) {
                        sh 'rm -f ~/.gnupg/*.kbx'
                        sh 'rm -f ~/.gnupg/*.gpg'
                        sh 'gpg --batch --import $RPM_PUBLIC_KEY'
                        sh 'gpg --batch --import $RPM_PRIVATE_KEY'
                        sh "mkdir -p ./build/rpms/itzbund"
                        sh "cp -r /root/rpmbuild/RPMS/noarch/* ${WORKSPACE}/build/rpms/itzbund/"
                        sh "expect /rpm-sign.exp ${WORKSPACE}/build/rpms/itzbund/*.rpm"

                        archiveArtifacts artifacts: 'build/rpms/itzbund/ingrid-harvester-*.rpm', fingerprint: true
                    }
                }
            }
        }

        stage('Build SBOM') {
            when { expression { return shouldBuildDevOrRelease() } }
            steps {
                echo 'Generating Software Bill of Materials (SBOM)'

                script {
                    def imageToScan = "docker-registry.wemove.com/ingrid-harvester:${env.VERSION}"
                    def sbomFilename = "ingrid-harvester-${determineVersion()}-sbom.json"

                    sh """
                        docker run --rm --pull=always --volumes-from jenkins anchore/syft:latest ${imageToScan} --output cyclonedx-json=${WORKSPACE}/build/${sbomFilename}
                    """
                    // Archive the SBOM file as an artifact
                    archiveArtifacts artifacts: "build/${sbomFilename}", fingerprint: true
                }
            }
        }

        stage('Deploy RPM') {
            when { expression { return shouldBuildDevOrRelease() } }
            steps {
                script {
                    def repoType = env.TAG_NAME ? "rpm-ingrid-releases" : "rpm-ingrid-snapshots"

                    withCredentials([usernamePassword(credentialsId: '9623a365-d592-47eb-9029-a2de40453f68', passwordVariable: 'PASSWORD', usernameVariable: 'USERNAME')]) {
                        sh '''
                            curl -f --user $USERNAME:$PASSWORD --upload-file build/rpms/ingrid/*.rpm https://nexus.informationgrid.eu/repository/''' + repoType + '''/
                            curl -f --user $USERNAME:$PASSWORD --upload-file build/*-sbom.json https://nexus.informationgrid.eu/repository/''' + repoType + '''/
                        '''
                    }
                    if (repoType == 'rpm-ingrid-releases') {
                        withCredentials([usernamePassword(credentialsId: '9623a365-d592-47eb-9029-a2de40453f68', passwordVariable: 'PASSWORD', usernameVariable: 'USERNAME')]) {
                            sh '''
                                curl -f --user $USERNAME:$PASSWORD --upload-file build/rpms/itzbund/*.rpm https://nexus.informationgrid.eu/repository/rpm-ingrid-itzbund/
                                curl -f --user $USERNAME:$PASSWORD --upload-file build/*-sbom.json https://nexus.informationgrid.eu/repository/rpm-ingrid-itzbund/
                            '''
                        }
                        if (env.TAG_NAME && env.TAG_NAME.startsWith("RPM-")) {
                            // No upload to other ITZBund repos
                        } else {
                            withCredentials([usernamePassword(credentialsId: '9623a365-d592-47eb-9029-a2de40453f68', passwordVariable: 'PASSWORD', usernameVariable: 'USERNAME')]) {
                                sh '''
                                    curl -f --user $USERNAME:$PASSWORD --upload-file build/rpms/itzbund/*.rpm https://nexus.informationgrid.eu/repository/rpm-zdm_release/
                                    curl -f --user $USERNAME:$PASSWORD --upload-file build/*-sbom.json https://nexus.informationgrid.eu/repository/rpm-zdm_release/
                                '''
                            }
                        }
                    }
                }
            }
        }
    }
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
        if (env.TAG_NAME.startsWith("RPM-")) { // e.g. RPM-8.0.0-0.1SNAPSHOT
            def lastDashIndex = env.TAG_NAME.lastIndexOf("-")
            return env.TAG_NAME.substring(4, lastDashIndex)
        }
        return env.TAG_NAME
    } else {
        return env.BRANCH_NAME.replaceAll('/', '_').replaceAll('-', '_')
    }
}

def determineRpmReleasePart() {
    if (env.TAG_NAME) {
        if (env.TAG_NAME.startsWith("RPM-")) {
            return env.TAG_NAME.substring(env.TAG_NAME.lastIndexOf("-") + 1)
        }
        return '1'
    } else {
        return 'dev'
    }
}

def shouldBuildDevOrRelease() {
    // If no tag is being built OR it is the first build of a tag
    boolean isTag = env.TAG_NAME != null && env.TAG_NAME.trim() != ''
    return !isTag || (isTag && currentBuild.number == 1)
}

def shouldBuildDockerImage() {
    if (env.TAG_NAME && env.TAG_NAME.startsWith("RPM-")) {
        return false
    } else return true
}
