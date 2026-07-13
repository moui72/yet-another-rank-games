# Web + worker as separate Cloud Run services, running as the runtime SA. The
# image is CI-managed: the staging/prod deploy workflow runs `tofu apply -var
# web_image=<registry>/<sha>` so tofu stays the single source of truth (the
# same SHA image is promoted to prod — never rebuilt). Non-secret config comes
# from web_env; secrets are mounted from Secret Manager via secret_env.
#
# Cloud Tasks wiring (infrastructure.md "Worker invocation contract"): the web
# service (enqueuer) gets the queue vars — it needs the worker's own URL
# (google_cloud_run_v2_service.worker.uri), which is why these can't live on
# the worker's *own* env (that would be a resource referencing its own output,
# a dependency cycle). Both services get TASKS_INVOKER_SA_EMAIL: web uses it
# to tell Cloud Tasks which identity to sign the task's OIDC token as; the
# worker uses it to verify that signing identity on the way in
# (`verifyCloudTasksAuth`), checking the token's audience against the
# request's own origin instead of a self-referential WORKER_URL.
locals {
  web_computed_env = {
    GCP_PROJECT_ID         = var.project_id
    GCP_LOCATION           = var.region
    CLOUD_TASKS_QUEUE      = google_cloud_tasks_queue.import.name
    WORKER_URL             = google_cloud_run_v2_service.worker.uri
    TASKS_INVOKER_SA_EMAIL = google_service_account.tasks_invoker.email
  }
  worker_computed_env = {
    TASKS_INVOKER_SA_EMAIL = google_service_account.tasks_invoker.email
  }
}

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
        for_each = merge(var.web_env, local.web_computed_env)
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

# The web service is a public site — allow unauthenticated invocation.
# (The worker is NOT public: it's invoked by Cloud Tasks with an OIDC token.)
resource "google_cloud_run_v2_service_iam_member" "web_public" {
  project  = var.project_id
  location = var.region
  name     = google_cloud_run_v2_service.web.name
  role     = "roles/run.invoker"
  member   = "allUsers"
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
        for_each = merge(var.web_env, local.worker_computed_env)
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
