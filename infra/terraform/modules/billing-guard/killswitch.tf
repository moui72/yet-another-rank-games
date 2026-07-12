locals {
  ks = var.enable_kill_switch ? 1 : 0
}

# Service account the function runs as — scoped to manage billing on THIS
# project only (least privilege; it cannot touch the other environment).
resource "google_service_account" "guard" {
  count        = local.ks
  project      = var.project_id
  account_id   = "yarg-billing-guard"
  display_name = "Billing kill-switch (${var.env})"
}

# Lets the SA disable (unlink) this project's billing. Re-enabling billing is a
# manual action needing billing-account admin — deliberate, so a trip is visible.
resource "google_project_iam_member" "guard_billing" {
  count   = local.ks
  project = var.project_id
  role    = "roles/billing.projectManager"
  member  = "serviceAccount:${google_service_account.guard[0].email}"
}

# Function source, zipped from ./function and uploaded to GCS.
resource "google_storage_bucket" "src" {
  count                       = local.ks
  project                     = var.project_id
  name                        = "${var.project_id}-billing-guard-src"
  location                    = var.region
  uniform_bucket_level_access = true
  force_destroy               = true
  depends_on                  = [google_project_service.guard]
}

data "archive_file" "fn" {
  count       = local.ks
  type        = "zip"
  source_dir  = "${path.module}/function"
  output_path = "${path.module}/.build/billing-guard.zip"
}

resource "google_storage_bucket_object" "fn" {
  count  = local.ks
  name   = "billing-guard-${data.archive_file.fn[0].output_md5}.zip"
  bucket = google_storage_bucket.src[0].name
  source = data.archive_file.fn[0].output_path
}

# Cloud Functions 1st gen: a Pub/Sub-triggered function (no Eventarc). On each
# budget notification it disables billing if actual cost exceeds the budget.
resource "google_cloudfunctions_function" "guard" {
  count                 = local.ks
  project               = var.project_id
  region                = var.region
  name                  = "yarg-billing-guard"
  runtime               = "nodejs20"
  entry_point           = "stopBilling"
  source_archive_bucket = google_storage_bucket.src[0].name
  source_archive_object = google_storage_bucket_object.fn[0].name
  service_account_email = google_service_account.guard[0].email
  available_memory_mb   = 256
  timeout               = 60

  event_trigger {
    event_type = "google.pubsub.topic.publish"
    resource   = google_pubsub_topic.budget[0].id
  }

  depends_on = [google_project_service.guard]
}
