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
        stage('Build Image') {
            steps {
                script {
                    version = snapshotVersionFromGit()
                    dockerImage = docker.build registry + ":" + version
                    dockerImageLatest = docker.build registry + ":latest"
                }
            }
        }
        stage('Push Image') {
            steps {
                script {
                    dockerImage.push()
                    dockerImageLatest.push()
                }
            }
        }
    }
}

def snapshotVersionFromGit() {
    def latestVersion = sh script: 'git describe --tags $(git rev-list --branches=origin/main --tags --max-count=1)', returnStdout: true
    def (major, minor, patch) = latestVersion? latestVersion.tokenize('.').collect { it.toInteger() }: ["0","0","0"]
    def snapshotVersion = "${major}.${minor + 1}.0-SNAPSHOT"
    snapshotVersion
}
