output "budget_name" {
  value = google_billing_budget.budget.name
}

output "kill_switch_function" {
  description = "Name of the disable-billing function, or null when the kill-switch is off."
  value       = var.enable_kill_switch ? google_cloudfunctions_function.guard[0].name : null
}
