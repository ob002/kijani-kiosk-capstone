pipeline {
  agent any

  triggers {
    pollSCM('H/2 * * * *')   // checks main every ~2 min: a merge starts the pipeline automatically
  }

  stages {
    stage('Checkout') {
      steps {
        checkout scm
        script {
          env.GIT_SHA = sh(script: 'git rev-parse --short HEAD', returnStdout: true).trim()
          env.IMAGE = "kk-payments:${env.GIT_SHA}"
          currentBuild.displayName = "#${env.BUILD_NUMBER} ${env.GIT_SHA}"
        }
      }
    }

    stage('Build Image') {
      steps {
        sh '''
          rm -rf /tmp/kk-build && cp -r app/kk-payments /tmp/kk-build && chmod -R a+rX /tmp/kk-build
          sudo -H -u user minikube image build -t "$IMAGE" /tmp/kk-build
        '''
      }
    }

    stage('Deploy to Staging') {
      steps {
        sh 'sed "s|__IMAGE__|$IMAGE|" k8s/deployment.yaml | kubectl -n kijani-staging apply -f -'
        sh 'kubectl -n kijani-staging apply -f k8s/service.yaml'
      }
    }

    stage('Smoke Test Staging') {
      steps {
        sh 'bash scripts/smoke-test.sh kijani-staging staging'
      }
      post {
        failure {
          echo 'Smoke test FAILED - rolling back staging. Production approval is NOT offered.'
          sh 'kubectl -n kijani-staging rollout undo deployment/kk-payments || true'
        }
      }
    }

    stage('Production Approval') {
      steps {
        timeout(time: 30, unit: 'MINUTES') {
          script {
            def reason = input(
              message: "Staging smoke test passed for ${env.GIT_SHA}. Deploy to PRODUCTION?",
              ok: 'Deploy to production',
              parameters: [string(name: 'REASON', defaultValue: '', description: 'Required: why is this release safe?')]
            )
            if (!reason?.trim()) { error('Approval reason is required - aborting.') }
            echo "APPROVAL REASON: ${reason}"
            currentBuild.description = "Approved: ${reason}"
          }
        }
      }
    }

    stage('Deploy to Production') {
      steps {
        sh 'sed "s|__IMAGE__|$IMAGE|" k8s/deployment.yaml | kubectl -n default apply -f -'
        sh 'kubectl -n default apply -f k8s/service.yaml'
        sh 'SMOKE_PORT=18081 bash scripts/smoke-test.sh default production'
      }
    }
  }
}
