output "provider_name" {
  description = "Full resource name of the OIDC provider — pass to google-github-actions/auth as workload_identity_provider."
  value       = google_iam_workload_identity_pool_provider.github.name
}

output "pool_name" {
  value = google_iam_workload_identity_pool.github.name
}
