# Budget scope filters use the project NUMBER, not the id.
data "google_project" "this" {
  project_id = var.project_id
}
