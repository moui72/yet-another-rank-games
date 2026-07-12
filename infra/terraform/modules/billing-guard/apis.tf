# This module owns its APIs so it can be applied on its own
# (`tofu apply -target=module.billing_guard`) without pulling in the app
# resources. (iam.googleapis.com — needed for the guard SA — is enabled by the
# environment module / project bootstrap, not duplicated here.)
locals {
  guard_services = [
    "billingbudgets.googleapis.com", # the google_billing_budget resource
    "cloudbilling.googleapis.com",   # the function disables billing at runtime
    "pubsub.googleapis.com",
    "cloudfunctions.googleapis.com",
    "cloudbuild.googleapis.com", # 1st-gen function build
    "storage.googleapis.com",    # function source bucket
  ]
}

resource "google_project_service" "guard" {
  for_each           = toset(local.guard_services)
  project            = var.project_id
  service            = each.value
  disable_on_destroy = false
}
