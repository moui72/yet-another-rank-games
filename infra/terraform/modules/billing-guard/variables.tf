variable "project_id" {
  type = string
}

variable "region" {
  type = string
}

variable "env" {
  type = string
}

variable "billing_account" {
  type        = string
  description = "Billing account ID (e.g. 01BE4D-XXXXXX-XXXXXX). Non-secret, but kept in tfvars (out of git)."
}

variable "budget_amount" {
  type        = number
  description = "Monthly budget in USD for this project (alert thresholds at 50/90/100%)."
}

variable "enable_kill_switch" {
  type        = bool
  description = "If true, wire the budget to a Pub/Sub function that DISABLES billing when actual cost exceeds the budget — a hard stop (the app goes down until billing is manually re-enabled). If false, the budget only emails alerts."
  default     = true
}
