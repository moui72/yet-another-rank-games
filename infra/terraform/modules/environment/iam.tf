# Three service accounts:
#  - runtime      : the identity the Cloud Run services run AS (reads secrets, enqueues tasks)
#  - deployer     : the identity GitHub Actions impersonates via WIF to deploy
#  - tasks_invoker: the identity Cloud Tasks signs the worker's OIDC token as
#    (infrastructure.md "Worker invocation contract") — kept separate from
#    `runtime` so the worker's auth check pins to a narrow, single-purpose
#    identity rather than the broad runtime SA.

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

resource "google_service_account" "tasks_invoker" {
  project      = var.project_id
  account_id   = "yarg-tasks-invoker"
  display_name = "YARG Cloud Tasks -> worker invoker (${var.env})"
}

# Runtime SA: read secret values, enqueue import jobs.
resource "google_project_iam_member" "runtime_task_enqueuer" {
  project = var.project_id
  role    = "roles/cloudtasks.enqueuer"
  member  = "serviceAccount:${google_service_account.runtime.email}"
}

# Runtime SA creates each Cloud Tasks HTTP task with an oidc_token specifying
# tasks_invoker as the token's identity — that requires permission to act as
# (impersonate) it.
resource "google_service_account_iam_member" "runtime_act_as_tasks_invoker" {
  service_account_id = google_service_account.tasks_invoker.name
  role               = "roles/iam.serviceAccountUser"
  member             = "serviceAccount:${google_service_account.runtime.email}"
}

# The worker is not public (INGRESS_TRAFFIC_INTERNAL_ONLY + no allUsers
# binding) — only tasks_invoker may invoke it. This is Cloud Run's own
# enforcement of the OIDC token; the worker's app-level check in
# `/tasks/import` (verifyCloudTasksAuth) is defense-in-depth on top of it.
resource "google_cloud_run_v2_service_iam_member" "worker_invoker" {
  project  = var.project_id
  location = var.region
  name     = google_cloud_run_v2_service.worker.name
  role     = "roles/run.invoker"
  member   = "serviceAccount:${google_service_account.tasks_invoker.email}"
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

# Read-only, project-wide: Terraform must refresh every resource an applied
# resource's config *interpolates* — service accounts, secrets (metadata
# only, not secretAccessor), the Cloud Tasks queue, project IAM bindings —
# even when -target narrows the apply to just the two Cloud Run services,
# because those values are referenced directly in web/worker's template.
# `-target` scopes writes, not reads: it still resolves the full dependency
# graph a targeted resource's config depends on. Standard Viewer + narrow
# Editor-scoped-writes pattern: this grants read visibility only — write
# capability stays limited to run.admin + artifactregistry.writer above.
resource "google_project_iam_member" "deployer_viewer" {
  project = var.project_id
  role    = "roles/viewer"
  member  = "serviceAccount:${google_service_account.deployer.email}"
}

resource "google_service_account_iam_member" "deployer_act_as_runtime" {
  service_account_id = google_service_account.runtime.name
  role               = "roles/iam.serviceAccountUser"
  member             = "serviceAccount:${google_service_account.deployer.email}"
}
