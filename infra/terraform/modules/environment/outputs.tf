output "web_url" {
  description = "Public URL of the web Cloud Run service."
  value       = google_cloud_run_v2_service.web.uri
}

output "worker_name" {
  value = google_cloud_run_v2_service.worker.name
}

output "worker_url" {
  description = "Internal URL of the worker Cloud Run service (Cloud Tasks target)."
  value       = google_cloud_run_v2_service.worker.uri
}

output "tasks_invoker_sa_email" {
  description = "Identity Cloud Tasks signs the worker's OIDC token as."
  value       = google_service_account.tasks_invoker.email
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

output "custom_domain_dns_records" {
  description = "DNS records (CNAME/A/AAAA) Cloud Run requires for the custom domain mapping, if one is configured. Empty when custom_domain is unset (staging)."
  value       = try(google_cloud_run_domain_mapping.web[0].status[0].resource_records, [])
}
