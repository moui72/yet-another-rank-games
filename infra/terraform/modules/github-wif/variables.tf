variable "project_id" {
  type = string
}

variable "github_repo" {
  type        = string
  description = "owner/name, e.g. moui72/yet-another-rank-games."
}

variable "deployer_sa_email" {
  type        = string
  description = "Service account the repo's workflows may impersonate."
}

variable "pool_id" {
  type    = string
  default = "github-actions"
}
