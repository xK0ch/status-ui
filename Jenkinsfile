pipeline {
  agent any

  options {
    disableConcurrentBuilds()
    timestamps()
    buildDiscarder(logRotator(numToKeepStr: '20'))
  }

  tools {
    nodejs '24.16.0'
  }

  stages {
    stage('Build') {
      steps {
        sh 'npm ci'
        sh 'npm run build'
      }
    }

    stage('Deploy') {
      steps {
        sh 'docker compose -f docker-compose-status-ui.yml up --build -d --remove-orphans'
      }
    }
  }

  post {
    always {
      sh 'docker image prune -f'
    }
  }
}
