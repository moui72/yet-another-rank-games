variable "project_id" {
  type    = string
  default = "yarg-staging-zbch"
}

variable "region" {
  type    = string
  default = "us-east4" # co-located with the Supabase project (AWS us-east-1, N. Virginia)
}

variable "github_repo" {
  type    = string
  default = "moui72/yet-another-rank-games"
}

variable "web_min_instances" {
  type    = number
  default = 0 # staging scales to zero (cold starts acceptable pre-prod)
}

variable "max_instances" {
  type    = number
  default = 3
}

variable "web_image" {
  type    = string
  default = "us-docker.pkg.dev/cloudrun/container/hello"
}

variable "worker_image" {
  type    = string
  default = "us-docker.pkg.dev/cloudrun/container/hello"
}

variable "web_env" {
  type    = map(string)
  default = {}
}

variable "billing_account" {
  type        = string
  description = "Billing account ID — set in terraform.tfvars (kept out of git)."
}

variable "budget_amount" {
  type    = number
  default = 3 # staging should sit near zero; alarm early
}

variable "enable_kill_switch" {
  type    = bool
  default = true # disable billing if cost exceeds budget
}
