# Pub/Sub topic the budget publishes cost updates to (kill-switch only).
resource "google_pubsub_topic" "budget" {
  count   = var.enable_kill_switch ? 1 : 0
  project = var.project_id
  name    = "yarg-budget-alerts"
}

# Project-scoped budget. Budgets ALERT, they do not cap — the hard cap is
# Cloud Run max_instances + the kill-switch below (constitution Principle IV).
resource "google_billing_budget" "budget" {
  billing_account = var.billing_account
  display_name    = "YARG ${var.env}"

  budget_filter {
    projects = ["projects/${data.google_project.this.number}"]
  }

  amount {
    specified_amount {
      currency_code = "USD"
      units         = tostring(var.budget_amount)
    }
  }

  threshold_rules {
    threshold_percent = 0.5
  }
  threshold_rules {
    threshold_percent = 0.9
  }
  threshold_rules {
    threshold_percent = 1.0
  }

  # When the kill-switch is on, publish every cost update to Pub/Sub so the
  # function can disable billing once actual cost passes the budget.
  dynamic "all_updates_rule" {
    for_each = var.enable_kill_switch ? [1] : []
    content {
      pubsub_topic = google_pubsub_topic.budget[0].id
    }
  }
}
