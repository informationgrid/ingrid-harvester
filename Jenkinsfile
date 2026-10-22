#!groovy
pipeline {
    agent any
    triggers{ cron( getCronParams() ) }

    environment {
        registry = "registry.opencode.de/informationgrid/ingrid-harvester"
    }

    options {
        buildDiscarder(logRotator(numToKeepStr: '5', artifactNumToKeepStr: '5'))
    }

    stages {
        stage ('Run Tests') {
            steps {
                nodejs(nodeJSInstallationName: 'nodejs24') {
                    dir('server') {
                        sh 'npm ci'
                        sh 'npm test'
                    }
                }
            }
        }

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

                    dockerImage = docker.build(registry + ":" + env.VERSION, "--build-arg VERSION=${env.VERSION} --build-arg GIT_COMMIT=${env.GIT_COMMIT} --pull .")

                    if (shouldBuildDockerImage()) {
                        dockerImage.push()
                        env.IMAGE_DIGEST = sh(script: "docker inspect --format='{{index .RepoDigests 0}}' ${registry}:${env.VERSION} | cut -d'@' -f2", returnStdout: true).trim()
                        echo "IMAGE_DIGEST: ${env.IMAGE_DIGEST}"
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
                    image 'docker-registry.wemove.com/ingrid-rpmbuilder'
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
                }
            }
        }

        stage('Build SBOM') {
            when {
                anyOf {
                    branch 'main'
                    buildingTag()
                }
            }
            tools {
                nodejs 'nodejs24'
            }
            steps {
                echo 'Generating Software Bill of Materials (SBOM)'
                sh """
                    cd ${WORKSPACE}/client
                    npx @cyclonedx/cyclonedx-npm --package-lock-only --omit dev --output-file dist/reports/sbom.json
                    npx @cyclonedx/cyclonedx-npm --package-lock-only --output-file dist/reports/sbom-dev.json
                    cd ${WORKSPACE}/server
                    npx @cyclonedx/cyclonedx-npm --package-lock-only --omit dev --output-file dist/reports/sbom.json
                    npx @cyclonedx/cyclonedx-npm --package-lock-only --output-file dist/reports/sbom-dev.json
                """

                script {
                    def imageToScan = "node:24-alpine"

                    sh """
                        docker run --rm --pull=always --volumes-from jenkins anchore/syft:latest ${imageToScan} --output cyclonedx-json=${WORKSPACE}/build/sbom-docker-image.json
                    """
                }
            }
        }

        stage ('Merge SBOMs') {
            when {
                anyOf {
                    branch 'main'
                    buildingTag()
                }
            }
            agent {
                docker {
                    image 'cyclonedx/cyclonedx-cli:latest'
                    // CRITICAL: Overrides the entrypoint so Jenkins can run it as a regular shell agent
                    args '-u root --entrypoint=""'
                    reuseNode true
                }
            }
            steps {
                script {
                    sh """
                        mkdir -p build/reports
                        cyclonedx merge --input-files server/dist/reports/sbom.json client/dist/reports/sbom.json --output-file build/reports/sbom.json --output-format json --output-version v1_6 --hierarchical --group de.ingrid --name ingrid-harvester --version ${determineVersion()}
                        cyclonedx merge --input-files server/dist/reports/sbom-dev.json client/dist/reports/sbom-dev.json --output-file build/reports/sbom-dev.json --output-format json --output-version v1_6 --hierarchical --group de.ingrid --name ingrid-harvester --version ${determineVersion()}
                        cyclonedx merge --input-files server/dist/reports/sbom.json client/dist/reports/sbom.json build/sbom-docker-image.json --output-file build/reports/sbom-docker.json --output-format json --output-version v1_6 --hierarchical --group de.ingrid --name ingrid-harvester --version ${determineVersion()}
                    """
                }
            }
        }

        stage ('Upload SBOM') {
            when {
                anyOf {
                    branch 'main'
                    buildingTag()
                }
            }
            steps {
                script {
                    def parentId = '4d11835d-4174-4c4a-94fd-9f48e7dad7eb'
                    def componentName = 'ingrid-harvester'

                    // Attach SBOM to Docker Image
                    withCredentials([
                            file(credentialsId: 'cosign-private-key', variable: 'COSIGN_KEY_FILE'),
                            string(credentialsId: 'cosign-key-password', variable: 'COSIGN_PASSWORD'),
                            usernamePassword(credentialsId: 'registry-opencode', usernameVariable: 'REG_USER', passwordVariable: 'REG_PASS')
                    ]) {
                        def imageDigest = env.IMAGE_DIGEST
                        def imageToScan = "registry.opencode.de/informationgrid/${componentName}@${imageDigest}"
                        sh """
                            docker run -u 0:0 --rm \
                              -e COSIGN_PASSWORD \
                              --volumes-from jenkins \
                              ghcr.io/sigstore/cosign/cosign:v3.1.3 attest \
                              --type cyclonedx \
                              --predicate \${WORKSPACE}/build/reports/sbom-docker.json \
                              --key "\$COSIGN_KEY_FILE" \
                              --registry-username "\$REG_USER" \
                              --registry-password "\$REG_PASS" \
                              ${imageToScan}
                        """
                    }

                    // Dependency Track
                    withCredentials([string(credentialsId: 'api-token-dependency-track', variable: 'API_KEY')]) {
                        def baseVersion = determineVersion()
                        def sbomConfigs = [
                                [artifact: 'build/reports/sbom.json',        suffix: '',              tag: 'ingrid_deps_prod'],
                                [artifact: 'build/reports/sbom-dev.json',    suffix: '-dev',          tag: 'ingrid_deps_dev'],
                                [artifact: 'build/reports/sbom-docker.json', suffix: '-docker-image', tag: 'ingrid_deps_docker']
                        ]

                        sbomConfigs.each { cfg ->
                            def props = [group: 'InGrid', parentId: parentId, tags: ['ingrid', cfg.tag], isLatest: cfg.suffix == '']
                            dependencyTrackPublisher(artifact: cfg.artifact, projectName: componentName, projectVersion: baseVersion + cfg.suffix, synchronous: true, dependencyTrackApiKey: API_KEY, projectProperties: props)
                        }
                    }

                    // NEXUS
                    def repoType = env.TAG_NAME ? "rpm-ingrid-releases" : "rpm-ingrid-snapshots"
                    sh "mv build/reports/sbom.json build/ingrid-harvester-${determineVersion()}.sbom.json"
                    withCredentials([usernamePassword(credentialsId: '9623a365-d592-47eb-9029-a2de40453f68', passwordVariable: 'PASSWORD', usernameVariable: 'USERNAME')]) {
                        sh '''
                            curl -f --user $USERNAME:$PASSWORD --upload-file build/*.sbom.json https://nexus.informationgrid.eu/repository/''' + repoType + '''/
                        '''
                    }
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
                        '''
                    }
                }
            }
        }
    }

    post {
        changed {
            // send Email with Jenkins' default configuration
            script {
                emailext (
                    body: '${DEFAULT_CONTENT}',
                    subject: '${DEFAULT_SUBJECT}',
                    to: '${DEFAULT_RECIPIENTS}',
                    recipientProviders: [culprits()]
                )
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
        return currentBuild.number
    } else {
        return 'SNAPSHOT'
    }
}

def shouldBuildDevOrRelease() {
    // If no tag is being built OR it is the first build of a tag
    boolean isTag = env.TAG_NAME != null && env.TAG_NAME.trim() != ''
    return !isTag || (isTag && currentBuild.number >= 1)
}

def shouldBuildDockerImage() {
    if (env.TAG_NAME && env.TAG_NAME.startsWith("RPM-")) {
        return false
    } else return true
}
