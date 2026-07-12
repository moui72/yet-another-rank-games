# Web + worker as separate Cloud Run services, running as the runtime SA. The
# image is CI-managed: the staging/prod deploy workflow runs `tofu apply -var
# web_image=<registry>/<sha>` so tofu stays the single source of truth (the
# same SHA image is promoted to prod — never rebuilt). Non-secret config comes
# from web_env; secrets are mounted from Secret Manager via secret_env.

resource "google_cloud_run_v2_service" "web" {
  project             = var.project_id
  name                = "yarg-web"
  location            = var.region
  ingress             = "INGRESS_TRAFFIC_ALL"
  deletion_protection = false

  template {
    service_account = google_service_account.runtime.email

    scaling {
      min_instance_count = var.web_min_instances
      max_instance_count = var.max_instances
    }

    containers {
      image = var.web_image

      dynamic "env" {
        for_each = var.web_env
        content {
          name  = env.key
          value = env.value
        }
      }

      dynamic "env" {
        for_each = var.secret_env
        content {
          name = env.key
          value_source {
            secret_key_ref {
              secret  = env.value
              version = "latest"
            }
          }
        }
      }
    }
  }

  depends_on = [
    google_secret_manager_secret_iam_member.runtime_access,
    google_project_service.services,
  ]
}

resource "google_cloud_run_v2_service" "worker" {
  project             = var.project_id
  name                = "yarg-worker"
  location            = var.region
  ingress             = "INGRESS_TRAFFIC_INTERNAL_ONLY" # invoked by Cloud Tasks, not the public
  deletion_protection = false

  template {
    service_account = google_service_account.runtime.email

    scaling {
      min_instance_count = 0
      max_instance_count = var.max_instances
    }

    containers {
      image = var.worker_image

      dynamic "env" {
        for_each = var.web_env
        content {
          name  = env.key
          value = env.value
        }
      }

      dynamic "env" {
        for_each = var.secret_env
        content {
          name = env.key
          value_source {
            secret_key_ref {
              secret  = env.value
              version = "latest"
            }
          }
        }
      }
    }
  }

  depends_on = [
    google_secret_manager_secret_iam_member.runtime_access,
    google_project_service.services,
  ]
}
