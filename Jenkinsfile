#!groovy
pipeline {
    agent any

    environment {
        registry = "docker-registry.wemove.com/ingrid-harvester"
    }

    options {
        buildDiscarder(logRotator(numToKeepStr: '5', artifactNumToKeepStr: '5'))
        gitLabConnection('GitLab (wemove)')
    }

    stages {
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
    }
}

def versionsFromGit() {
    def latestVersion = sh script: 'git describe --tags $(git rev-list --branches=origin/main --tags --max-count=1)', returnStdout: true
    latestVersion = latestVersion ? latestVersion.trim() : "0.0.0"
    def (major, minor, patch) = latestVersion.tokenize('.').collect { it.toInteger() }
    def snapshotVersion = "${major}.${minor + 1}.0-SNAPSHOT"
    return [latestVersion, snapshotVersion]
}
