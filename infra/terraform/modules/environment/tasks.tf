# The import queue. Cloud Tasks has no native dead-letter target; the "give up"
# is bounded max_attempts here PLUS the worker's terminal failure state
# (Collection.import_status = failed — the app-side dead-letter in datamodel.md).
resource "google_cloud_tasks_queue" "import" {
  project  = var.project_id
  name     = "yarg-import"
  location = var.region

  retry_config {
    max_attempts       = 5
    min_backoff        = "5s"
    max_backoff        = "300s"
    max_retry_duration = "3600s"
  }

  rate_limits {
    max_dispatches_per_second = 1
    max_concurrent_dispatches = 5
  }

  depends_on = [google_project_service.services]
}
