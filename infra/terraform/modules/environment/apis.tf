# Enable the service APIs this environment needs. The two bootstrap APIs
# (serviceusage, cloudresourcemanager) are enabled by hand before the first
# apply — tofu enables the rest through them (see README). disable_on_destroy =
# false so `tofu destroy` never yanks an API another resource still depends on.
locals {
  services = [
    "run.googleapis.com",
    "cloudtasks.googleapis.com",
    "secretmanager.googleapis.com",
    "artifactregistry.googleapis.com",
    "iam.googleapis.com",
    "iamcredentials.googleapis.com",
    "sts.googleapis.com",
  ]
}

resource "google_project_service" "services" {
  for_each           = toset(local.services)
  project            = var.project_id
  service            = each.value
  disable_on_destroy = false
}
