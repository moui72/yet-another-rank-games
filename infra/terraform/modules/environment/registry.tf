resource "google_artifact_registry_repository" "images" {
  project       = var.project_id
  location      = var.region
  repository_id = "yarg"
  format        = "DOCKER"
  description   = "YARG container images (${var.env})."

  depends_on = [google_project_service.services]
}
