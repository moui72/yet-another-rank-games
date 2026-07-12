terraform {
  required_version = ">= 1.6"
  required_providers {
    google = {
      source  = "hashicorp/google"
      version = "~> 6.0"
    }
    archive = {
      source  = "hashicorp/archive"
      version = "~> 2.4"
    }
  }
  # Local state for now (gitignored). Migrate to a GCS backend later.
}

provider "google" {
  project = var.project_id
  region  = var.region
}

module "environment" {
  source            = "../../modules/environment"
  project_id        = var.project_id
  region            = var.region
  env               = "production"
  web_min_instances = var.web_min_instances # prod: 1, to avoid cold starts
  max_instances     = var.max_instances
  web_image         = var.web_image
  worker_image      = var.worker_image
  web_env           = var.web_env
}

module "wif" {
  source            = "../../modules/github-wif"
  project_id        = var.project_id
  github_repo       = var.github_repo
  deployer_sa_email = module.environment.deployer_sa_email
}

module "billing_guard" {
  source             = "../../modules/billing-guard"
  project_id         = var.project_id
  region             = var.region
  env                = "production"
  billing_account    = var.billing_account
  budget_amount      = var.budget_amount
  enable_kill_switch = var.enable_kill_switch
}

output "web_url" {
  value = module.environment.web_url
}

output "deployer_sa" {
  value = module.environment.deployer_sa_email
}

output "wif_provider" {
  description = "Set as workload_identity_provider in the production deploy workflow."
  value       = module.wif.provider_name
}
