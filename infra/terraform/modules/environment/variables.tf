variable "project_id" {
  type        = string
  description = "GCP project for this environment."
}

variable "region" {
  type        = string
  description = "GCP region (co-located with the Supabase project — see infrastructure.md)."
}

variable "env" {
  type        = string
  description = "Environment name, e.g. staging or production."
}

variable "web_image" {
  type        = string
  description = "Container image for the web service. CI passes the SHA-tagged image on deploy (tofu apply -var web_image=...); the placeholder default lets the first apply succeed before any image exists."
  default     = "us-docker.pkg.dev/cloudrun/container/hello"
}

variable "worker_image" {
  type        = string
  description = "Container image for the worker service (CI-managed like web_image)."
  default     = "us-docker.pkg.dev/cloudrun/container/hello"
}

variable "web_min_instances" {
  type        = number
  description = "Min instances for the web service (0 = scale to zero for staging; 1 in prod to avoid cold starts)."
  default     = 0
}

variable "max_instances" {
  type        = number
  description = "Autoscaling cap on both services — the runaway-spend guardrail (constitution Principle IV)."
  default     = 3
}

variable "web_env" {
  type        = map(string)
  description = "Non-secret plain env vars for the web service (PUBLIC_SUPABASE_URL, DB_HOST/PORT/USER/NAME, etc.). Secrets are wired separately via secret_env."
  default     = {}
}

variable "custom_domain" {
  type        = string
  description = "Custom domain to map to the web Cloud Run service (e.g. yarg.ty-pe.com). Empty string (default) skips the domain mapping entirely — used by staging, which keeps its default *.run.app URL. Requires the domain be verified in Google Search Console for this project before apply (see infrastructure.md 'Custom domain (production)')."
  default     = ""
}

variable "secret_env" {
  type        = map(string)
  description = "ENV_VAR_NAME => Secret Manager secret id. Containers are created empty; values are added out-of-band from 1Password (never in tofu state)."
  default = {
    SUPABASE_SECRET_KEY = "supabase-secret-key"
    DB_PASSWORD         = "db-password"
    BGG_API_TOKEN       = "bgg-api-token"
  }
}
