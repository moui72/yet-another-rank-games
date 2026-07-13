import { z } from 'zod';
import type { RequestHandler } from './$types';
import { loadServerConfig } from '$lib/server/config';
import { verifyCloudTasksAuth, CloudTasksAuthError } from '$lib/server/tasks/verifyCloudTasksAuth';
import { processImportJob } from '$lib/server/jobs/importJob';
import { logError } from '$lib/server/log';

const importJobSchema = z
	.object({
		collectionId: z.string().min(1),
		username: z.string().min(1),
		ownedOnly: z.boolean().optional()
	})
	.strict();

/**
 * The worker's Cloud Tasks entry point (infrastructure.md "Worker invocation
 * contract"): `POST /tasks/import`, body = `ImportJob` JSON, authenticated by
 * an OIDC token Cloud Tasks attaches (verified below).
 *
 * Response codes double as the retry contract Cloud Tasks understands:
 *   - `401` — bad/missing/mis-signed token (auth failure, not a job failure).
 *   - `400` — body doesn't match `ImportJob` (an enqueuer bug, not transient).
 *   - `204` — job processed. `processImportJob` -> `executeImportJob` never
 *     rethrows a *job-level* failure (it dead-letters onto the Collection row
 *     instead, per Principle IV) — so reaching this line means the job ran to
 *     completion, whether the import itself succeeded or was dead-lettered.
 *     Either way that's "done" from Cloud Tasks' point of view: no retry.
 *   - `500` — an unhandled exception (e.g. the DB was unreachable) — the one
 *     case the worker must NOT report as done, so Cloud Tasks retries per the
 *     queue's bounded backoff/dead-letter config.
 */
export const POST: RequestHandler = async ({ request, url }) => {
	const config = loadServerConfig();
	if (!config.cloudTasksAuth) {
		// Deployed without TASKS_INVOKER_SA_EMAIL is a deploy-time
		// misconfiguration (Terraform sets it on the worker) — fail closed.
		logError('tasks.import.misconfigured', { reason: 'cloudTasksAuth config absent' });
		return new Response(JSON.stringify({ error: 'not configured' }), { status: 500 });
	}

	try {
		// Audience = this request's own origin, not a Terraform-injected
		// WORKER_URL (see config.ts — that would be a self-referential
		// output on the worker's own Cloud Run resource).
		await verifyCloudTasksAuth(request.headers.get('authorization'), {
			audience: url.origin,
			invokerServiceAccountEmail: config.cloudTasksAuth.invokerServiceAccountEmail
		});
	} catch (e) {
		const message = e instanceof CloudTasksAuthError ? e.message : 'unauthorized';
		logError('tasks.import.unauthorized', { error: message });
		return new Response(JSON.stringify({ error: 'unauthorized' }), { status: 401 });
	}

	const body = await request.json().catch(() => null);
	const parsed = importJobSchema.safeParse(body);
	if (!parsed.success) {
		logError('tasks.import.bad_request', { issues: parsed.error.issues });
		return new Response(JSON.stringify({ error: 'invalid job body' }), { status: 400 });
	}

	try {
		await processImportJob(parsed.data);
		return new Response(null, { status: 204 });
	} catch (e) {
		logError('tasks.import.failed', { error: e instanceof Error ? e.message : String(e) });
		return new Response(JSON.stringify({ error: 'internal error' }), { status: 500 });
	}
};
