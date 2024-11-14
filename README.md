# Launch School JS185 Project

## Todo App

A todo list web application, deployed to Google Cloud Run:

<https://js185-todo-app-401967808958.us-central1.run.app>

The Launch School provided final project code is available
[here](https://da77jsbdz4r05.cloudfront.net/zips/js185/todos-js185-final-20201123.zip).

### Requirements

- `node`
- `npm`
- a project on Google Cloud to deploy and run the application
  - the code in this repository assumes the Google Cloud project name is
  `js185-todo-app`, and most services are in `us-central1`
  - see setup below for more information

### Setup

#### Setup for local development

- Clone repository and run `npm install` to install dependencies.
- Install Postgres, if necessary:

  ```shell
  brew install postgresql@16
  ```

- Start a Postgres server on `localhost`:

  ```shell
  # To start a homebrew-installed postgres service
  brew services start postgresql@16
  ```

- Ensure the `postgres` user exists on the local server. Homebrew installations
  don't create this user automatically.

  Example, creating `postgres` user with no password:

  ```shell
  createuser -s postgres
  ```

- Run `setupdb.sh` with no arguments to setup the local `todo-lists` database.

#### Setup for deploying to Google Cloud Run

- [Install](https://cloud.google.com/sdk/docs/install) the `gcloud` cli, if you
  haven't already
- Create Google Cloud project:

  ```shell
  gcloud projects create js185-todo-app
  ```

- Enable the required APIs for this project:

  ```shell
  gcloud services enable \
    compute.googleapis.com \
    sqladmin.googleapis.com \
    run.googleapis.com \
    artifactregistry.googleapis.com \
    cloudbuild.googleapis.com \
    servicenetworking.googleapis.com
  ```

- Add the Service Account Token Creator role to your user account:

  This role allows using the `--impersonate-service-account` option in `gcloud`
  and `cloud-sql-proxy`. It can be useful to impersonate service accounts during
  certain operations to assume their IAM permissions. For example, later you
  can impersonate the `cloud-run-service-account` to test the user's permissions
  in `psql`.

  ```shell
  gcloud projects add-iam-policy-binding js185-todo-app \
    --member=user:darrenmchurchill@gmail.com \
    --role=roles/iam.serviceAccountTokenCreator
  ```

- Setup Cloud Run:

  It's best to create a service account, rather than using the Default Compute
  Service Account, which can have too many permissions by default.

  ```shell
  gcloud iam service-accounts create cloud-run-service-account \
    --description="Todo App Cloud Run Service Account" \
    --display-name="Cloud Run Service Account"
  ```

- Create a Cloud SQL for Postgres instance:

  Edit the temporary file `postgres-pw.sh`, which should export 1 environment
  variable: `ROOT_PASSWORD`.

  Source `postgres-pw.sh`:

  ```shell
  source postgres-pw.sh
  ```

  Create the instance and set the root `postgres` user's password. You can also
  change it later in the Google Cloud web console, or through a `gcloud`
  command.

  ```shell
  gcloud sql instances create todo-lists \
    --database-version=POSTGRES_16 \
    --root-password="$ROOT_PASSWORD" \
    --tier=db-f1-micro \
    --region=us-central1 \
    --edition=enterprise \
    --ssl-mode=TRUSTED_CLIENT_CERTIFICATE_REQUIRED
    --database-flags=cloudsql.iam_authentication=on
  ```

  Store the password somewhere else and delete `postgres-pw.sh`:

  ```shell
  rm postgres-pw.sh
  ```

- Create a database in the Cloud SQL instance:

  ```shell
  gcloud sql databases create todo-lists --instance=todo-lists
  ```

- Add IAM roles to your user account:

  Your user account will be granted semi-administrative privileges in Postgres
  later.

  ```shell
  gcloud projects add-iam-policy-binding js185-todo-app \
    --member="user:darrenmchurchill@gmail.com" \
    --role=roles/cloudsql.instanceUser
  ```

  ```shell
  gcloud projects add-iam-policy-binding js185-todo-app \
    --member="user:darrenmchurchill@gmail.com" \
    --role=roles/cloudsql.client
  ```

- Create a Postgres user for your user account:

  ```shell
  gcloud sql users create "darrenmchurchill@gmail.com" \
    --instance=todo-lists \
    --type=cloud_iam_user
  ```

- Add IAM roles to the Cloud Run service account you created above:

  ```shell
  gcloud projects add-iam-policy-binding js185-todo-app \
    --member="serviceAccount:cloud-run-service-account@js185-todo-app.iam.gserviceaccount.com" \
    --role=roles/cloudsql.instanceUser
  ```

  ```shell
  gcloud projects add-iam-policy-binding js185-todo-app \
    --member="serviceAccount:cloud-run-service-account@js185-todo-app.iam.gserviceaccount.com" \
    --role=roles/cloudsql.client
  ```

- Create a Postgres user for the Cloud Run service account:

  Note the username omits `".gserviceaccount.com"`.

  ```shell
  gcloud sql users create "cloud-run-service-account@js185-todo-app.iam" \
    --instance=todo-lists \
    --type=cloud_iam_service_account
  ```

- Install `cloud-sq-proxy` in the this repository's root directory:

  See install instructions
  [here](https://cloud.google.com/sql/docs/postgres/connect-instance-auth-proxy#install-proxy).

- Connect to the Cloud SQL instance using `cloud-sql-proxy`:

  Make sure no postgres server is running on the `localhost`:

  ```shell
  # To kill a homebrew-installed postgres service
  brew services stop postgresql@16
  ```

  ```shell
  ./cloud-sql-proxy \
    $(gcloud sql instances describe todo-lists --format='value(connectionName)') \
    --auto-iam-authn
  ```

- Run `setupdb.sh` in another terminal instance to connect to the Cloud SQL
  database as the `postgres` user and setup the database tables and roles:

  Enter the `postgres` user's password when prompted.

  ```shell
  ./setupdb.sh
  ```

- Kill the `cloud-sql-proxy` process (`^C`).

- Create a Cloud Build service account:

  This should be the same service account referenced in `cloudbuild.yaml`.

  ```shell
  gcloud iam service-accounts create cloud-build-service-account \
    --description="Cloud Build service account for github CD" \
    --display-name="Cloud Build Service Account"
  ```

  Assign the required IAM roles for the service account running the build:

  ```shell
  gcloud projects add-iam-policy-binding js185-todo-app \
    --member="serviceAccount:cloud-build-service-account@js185-todo-app.iam.gserviceaccount.com" \
    --role="roles/cloudBuild.builds.builder"
  ```

  ```shell
  gcloud projects add-iam-policy-binding js185-todo-app \
    --member="serviceAccount:cloud-build-service-account@js185-todo-app.iam.gserviceaccount.com" \
    --role="roles/run.Admin"
  ```

  ```shell
  gcloud projects add-iam-policy-binding js185-todo-app \
    --member="serviceAccount:cloud-build-service-account@js185-todo-app.iam.gserviceaccount.com" \
    --role="roles/iam.serviceAccountUser"
  ```

- (Optional) submit a Cloud Build manually using `gcloud`:

  ```shell
  gcloud builds submit \
    --region=us-central1 \
    --substitutions=SHORT_SHA=$(git rev-parse --short HEAD)
  ```

- Setup continuous deployment from git:

  Connect your GitHub repository using the Cloud Build
  [instructions](https://cloud.google.com/build/docs/automating-builds/github/connect-repo-github?generation=1st-gen#gcloud).

  Create the Cloud Build github trigger:

  ```shell
  gcloud builds triggers create github \
    --name="js185-todo-app-cloud-build-trigger-github-darrenchurchill" \
    --description="Build and Deploy to Cloud Run from GitHub" \
    --service-account="projects/js185-todo-app/serviceAccounts/cloud-build-service-account@js185-todo-app.iam.gserviceaccount.com" \
    --region="us-central1" \
    --repo-owner="darrenchurchill" \
    --repo-name="JS185-Todo-App" \
    --branch-pattern='^main$' \
    --build-config="cloudbuild.yaml" \
    --include-logs-with-status
  ```

  New commits pushed to the `main` branch will automatically build and deploy
  a new service revision to Cloud Run.

- Ensure the deployed service has the `DOTENV_KEY` environment variable set:

  __NOTE: The first build will fail to deploy__ until you update the service revision with
  the `DOTENV_KEY` environment variable.

  This is the only user defined environment variable the application requires,
  so using `--set-env-vars` is ok (it erases any other previously set
  variables):

  ```shell
  gcloud run services update todo-app \
    --set-env-vars=DOTENV_KEY=$(npx dotenv-vault@latest keys production)
  ```

### Execution

#### Local Execution

Start a Postgres server on the `localhost`. Example using homebrew-installed
Postgres v16:

```shell
brew services start postgresql@16
```

Start the auto-restarting development web server using:

```shell
npm run dev
```
