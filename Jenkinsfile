pipeline {
    agent any

    environment {
        AWS_ENDPOINT_URL = 'http://host.docker.internal:4566' // Or localhost:4566 for Linux
        CDK_DEFAULT_ACCOUNT = '000000'
        CDK_DEFAULT_REGION = 'eu-central-1'
    }

    stages {
        stage('Checkout Code') {
            steps {
                git url: 'http://host.docker.internal:3000/anamrzv/aws_lambdas.git', branch: 'main' 
            }
        }

        stage('Bootstrap Account') {
            steps {
                sh 'npm install'
                sh 'cdklocal bootstrap'
            }
        }

        stage('Build Main') {
            steps {
                dir('.') { 
                    sh 'ls'
                    sh 'npx tsc'
                }
            }
        }

        stage('Build Lambda') {
            steps {
                dir('./lambda') { 
                    sh 'ls'
                    sh 'npm i'
                    sh 'npx tsc'
                }
            }
        }

        stage('Deploy Infra') {
            steps {
                sh 'cdklocal deploy --require-approval never --outputs-file cdk-outputs.json'
            }
        }
    }

    post {
        success {
            echo 'Deployment completed successfully!'
        }
        failure {
            echo 'Deployment failed.'
        }
    }
}