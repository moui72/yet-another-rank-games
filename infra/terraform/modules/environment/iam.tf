# Two service accounts:
#  - runtime : the identity the Cloud Run services run AS (reads secrets, enqueues tasks)
#  - deployer: the identity GitHub Actions impersonates via WIF to deploy

resource "google_service_account" "runtime" {
  project      = var.project_id
  account_id   = "yarg-runtime"
  display_name = "YARG Cloud Run runtime (${var.env})"
}

resource "google_service_account" "deployer" {
  project      = var.project_id
  account_id   = "yarg-deployer"
  display_name = "YARG CI deployer (${var.env})"
}

# Runtime SA: read secret values, enqueue import jobs.
resource "google_project_iam_member" "runtime_task_enqueuer" {
  project = var.project_id
  role    = "roles/cloudtasks.enqueuer"
  member  = "serviceAccount:${google_service_account.runtime.email}"
}

# Deployer SA: deploy Cloud Run, push images, and act as the runtime SA.
resource "google_project_iam_member" "deployer_run_admin" {
  project = var.project_id
  role    = "roles/run.admin"
  member  = "serviceAccount:${google_service_account.deployer.email}"
}

resource "google_project_iam_member" "deployer_ar_writer" {
  project = var.project_id
  role    = "roles/artifactregistry.writer"
  member  = "serviceAccount:${google_service_account.deployer.email}"
}

resource "google_service_account_iam_member" "deployer_act_as_runtime" {
  service_account_id = google_service_account.runtime.name
  role               = "roles/iam.serviceAccountUser"
  member             = "serviceAccount:${google_service_account.deployer.email}"
}
