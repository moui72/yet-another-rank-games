'use strict';

const { CloudBillingClient } = require('@google-cloud/billing');

const billing = new CloudBillingClient();
const projectId = process.env.GCP_PROJECT || process.env.GOOGLE_CLOUD_PROJECT;
const projectName = `projects/${projectId}`;

/**
 * Pub/Sub-triggered (Cloud Functions 1st gen). A GCP budget publishes cost
 * updates here as base64-encoded JSON. When actual cost exceeds the budget,
 * disable billing on this project — a hard stop (constitution Principle IV).
 *
 * This takes the app OFFLINE (Cloud Run stops without billing). Re-enabling
 * billing is a deliberate manual action (needs billing-account admin), so a
 * trip stays visible rather than silently self-healing into more spend.
 */
exports.stopBilling = async (pubsubEvent) => {
  const payload = pubsubEvent && pubsubEvent.data
    ? JSON.parse(Buffer.from(pubsubEvent.data, 'base64').toString())
    : {};

  const cost = Number(payload.costAmount);
  const budget = Number(payload.budgetAmount);
  if (!Number.isFinite(cost) || !Number.isFinite(budget)) {
    console.log('No costAmount/budgetAmount in message; ignoring.');
    return;
  }
  if (cost <= budget) {
    console.log(`Cost ${cost} within budget ${budget}; no action.`);
    return;
  }

  const [info] = await billing.getProjectBillingInfo({ name: projectName });
  if (!info.billingEnabled) {
    console.log('Billing already disabled; nothing to do.');
    return;
  }

  await billing.updateProjectBillingInfo({
    name: projectName,
    projectBillingInfo: { billingAccountName: '' }, // empty = disable billing
  });
  console.warn(`Billing DISABLED for ${projectId} (cost ${cost} > budget ${budget}).`);
};
