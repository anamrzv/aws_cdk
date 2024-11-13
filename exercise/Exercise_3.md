# Exercise 3 - Setting Up a CI/CD Pipeline
In the previous exercise, we created an application that serves as a simple warehouse. Now, we will focus on deploying it automatically. To do this, we will set up Jenkins locally and deploy using a local version control system (Gitea). We are avoiding the use of GitHub to bypass request quotas, simplifying the testing process. This exercise will guide you through setting up Gitea and Jenkins, building a sample pipeline together for a Hello-World example, and then having you create a pipeline for your larger application.

## Task 1 - Setting Up Jenkins
Deploy Jenkins using Docker:
```bash
docker run -d -p 8080:8080 -p 50000:50000 --name jenkins-hsh \
       -v jenkins_hsh:/var/jenkins_home \
       -v /var/run/docker.sock:/var/run/docker.sock \
       jenkins/jenkins:lts
```
If you are using Mac, this command is sufficient. If you are using Linux, use:
```bash
docker run -d -p 8080:8080 -p 50000:50000 --name jenkins-hsh \
       -v jenkins_hsh:/var/jenkins_home \
       --network=host \
       -v /var/run/docker.sock:/var/run/docker.sock \
       jenkins/jenkins:lts
```

In the output of the deployment, you will see:
```
Jenkins initial setup is required. An admin user has been created and a password generated.
Please use the following password to proceed to installation:

4d27e8bba46c4f13bffaf92ba701cfd2
```
This is your initial password. Additionally, the following log entry:
```
2024-11-04 14:19:44.339+0000 [id=35] INFO jenkins.InitReactorRunner$1#onAttained: Completed initialization
2024-11-04 14:19:44.345+0000 [id=25] INFO hudson.lifecycle.Lifecycle#onReady: Jenkins is fully up and running
2024-11-04 14:19:44.819+0000 [id=64] INFO h.m.DownloadService$Downloadable#load: Obtained the updated data file for hudson.tasks.Maven.MavenInstaller
2024-11-04 14:19:44.820+0000 [id=64] INFO hudson.util.Retrier#start: Performed the action check updates server successfully at the attempt #1
```
indicates that Jenkins has successfully started.

We can now access Jenkins at **localhost:8080**. Enter your initial password and install the suggested plugins. Create a user, and Jenkins will be ready for use.

## Task 2 - Setting Up Gitea
Again, we will use Docker:
```bash
docker run -d --name=gitea -p 3000:3000 -p 222:22 \
         -v gitea_data:/data \
         gitea/gitea:latest
```
The logs should look like this:
```
2024/11/04 14:26:22 cmd/web.go:112:showWebStartupMessage() [I] * RunMode: prod
2024/11/04 14:26:22 cmd/web.go:113:showWebStartupMessage() [I] * AppPath: /usr/local/bin/gitea
2024/11/04 14:26:22 cmd/web.go:114:showWebStartupMessage() [I] * WorkPath: /data/gitea
2024/11/04 14:26:22 cmd/web.go:115:showWebStartupMessage() [I] * CustomPath: /data/gitea
2024/11/04 14:26:22 cmd/web.go:116:showWebStartupMessage() [I] * ConfigFile: /data/gitea/conf/app.ini
2024/11/04 14:26:22 cmd/web.go:117:showWebStartupMessage() [I] Prepare to run install page
2024/11/04 14:26:22 cmd/web.go:304:listen() [I] Listen: http://0.0.0.0:3000
2024/11/04 14:26:22 cmd/web.go:308:listen() [I] AppURL(ROOT_URL): http://localhost:3000/
2024/11/04 14:26:22 ...s/graceful/server.go:50:NewServer() [I] Starting new Web server: tcp:0.0.0.0:3000 on PID: 18
```

Now open **localhost:3000** and configure Gitea. You can leave the default settings. Create a new user, and we are ready to begin.

## Task 3 - Transferring Task 3 from Exercise 2 to a Gitea Repo
Now, it’s time to create a Git repository for our small lastName application. Create a new Git repository in Gitea, and name it as you wish.

To push our existing code to the repository, run the following commands:
```bash
git remote add origin http://localhost:3000/Philip/LastName.git # Change the repo URL
git push -u origin main
```

The repository is now populated with our files, and we can use Git to version our code.

## Task 4 - Setting Up Our Jenkins Pipeline
Go back to Jenkins and create a pipeline. Click **Create a job** in the middle of the screen. Choose any name and select **Multibranch Pipeline** as the item type.

- Next, choose **Git** under **Branch Sources**.
- Under **Credentials**, add your Gitea user (select Jenkins so that the credentials are available for other pipelines).
- Under **Project Repository**, add the Git clone URL. For Linux users (thanks to network=host), you can directly use the Gitea URL. Mac users can use host.docker.internal instead of localhost. In my example, the URL looks like: http://host.docker.internal:3000/Philip/LastName.git.
- Click **Save**, and you will be redirected to the **Scan Multibranch Pipeline Log**.
- You will see that the Jenkinsfile (which defines our pipeline) is missing in the repository. We will create this in the next task.
- Next, we need to install some packages in our container. The proper way is to create a new Dockerfile to extend the Jenkins image. We will take a shortcut and install them manually (not best practice).
```bash
Get ContainerId with docker ps.

docker exec -ti --user root <containerID> /bin/bash
apt update
apt install nano
curl -fsSL https://deb.nodesource.com/setup_18.x | bash -
apt-get install -y nodejs

# For x64 users (if not on Mac)
curl "https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip" -o "awscliv2.zip"
unzip awscliv2.zip
sudo ./aws/install

# For Mac with M chip
curl "https://awscli.amazonaws.com/awscli-exe-linux-aarch64.zip" -o "awscliv2.zip"
unzip awscliv2.zip
sudo ./aws/install

Check if AWS CLI is installed -> aws --version

npm install -g aws-cdk
npm install -g aws-cdk-local
exit
```

Now, we have all the necessary packages installed on Jenkins for our app.

## Task 5 - Creating the Pipeline
Create a new file in your repository named **Jenkinsfile** and add the following content:
```groovy
pipeline {
    agent any

    environment {
        AWS_ENDPOINT_URL = 'http://host.docker.internal:4566' // Or localhost:4566, if you are using Linux
        CDK_DEFAULT_ACCOUNT = '000000'
        CDK_DEFAULT_REGION = 'eu-central-1'
    }

    stages {
        stage('Checkout Code') {
            steps {
                git url: 'http://host.docker.internal:3000/Philip/LastName.git', branch: 'main' // Change this
            }
        }

        stage('Bootstrap Account') {
            steps {
                sh 'npm install'
                sh 'cdklocal bootstrap'
            }
        }

        stage('Build Lambda') {
            steps {
                dir('./lambda') { // Change Path
                    sh 'ls'
                    sh 'npm install'
                    sh 'npx tsc ./nameHandler.ts' // Change Name
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
```
Ensure you adjust paths as needed! Commit any unstaged files to your Git repository and start the pipeline by clicking **Build**.

Start Localstack as usual.

## Task 6
Transfer your warehouse application into a Jenkins deployment.