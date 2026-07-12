# Secret Manager holds only the *containers*; values are added out-of-band from
# 1Password (op → gcloud secrets versions add), never in tofu state.
resource "google_secret_manager_secret" "secrets" {
  for_each  = toset(values(var.secret_env))
  project   = var.project_id
  secret_id = each.value

  replication {
    auto {}
  }

  depends_on = [google_project_service.services]
}

# The runtime SA may read each secret's versions.
resource "google_secret_manager_secret_iam_member" "runtime_access" {
  for_each  = google_secret_manager_secret.secrets
  project   = var.project_id
  secret_id = each.value.secret_id
  role      = "roles/secretmanager.secretAccessor"
  member    = "serviceAccount:${google_service_account.runtime.email}"
}
