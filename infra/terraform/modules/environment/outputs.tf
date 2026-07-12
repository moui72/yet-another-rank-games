output "web_url" {
  description = "Public URL of the web Cloud Run service."
  value       = google_cloud_run_v2_service.web.uri
}

output "worker_name" {
  value = google_cloud_run_v2_service.worker.name
}

output "runtime_sa_email" {
  value = google_service_account.runtime.email
}

output "deployer_sa_email" {
  description = "Impersonated by GitHub Actions via WIF."
  value       = google_service_account.deployer.email
}

output "artifact_registry" {
  value = google_artifact_registry_repository.images.name
}

output "import_queue" {
  value = google_cloud_tasks_queue.import.id
}
