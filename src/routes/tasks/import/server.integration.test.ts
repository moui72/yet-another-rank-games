import { describe, it, expect, vi, beforeEach, afterAll } from 'vitest';
import { db, sql } from '$lib/server/db';
import { createUser } from '$lib/server/repositories/users';
import { createCollection, getCollectionById } from '$lib/server/repositories/collections';

/**
 * Smoke test for the worker's Cloud Tasks entry point (T002,
 * infrastructure.md "Worker invocation contract"). Everything here is real
 * except one thing, called out explicitly:
 *
 *   - Real: the HTTP-shaped request/response, the route's own auth-gate and
 *     body-validation logic, `processImportJob` -> `executeImportJob` ->
 *     `runImport`, and the local Supabase Postgres (collection lifecycle
 *     rows are asserted against the live DB, same as importJob.integration.test.ts).
 *   - Mocked: (1) the BGG HTTP client (`fetchCollectionXml`/`fetchThingXml`),
 *     same as other import tests — this isn't a BGG-connectivity test — and
 *     (2) `google-auth-library`'s `OAuth2Client.verifyIdToken`, i.e. the
 *     actual cryptographic signature check against Google's public certs.
 *     There is no way to mint a real Google-signed OIDC token from a local
 *     dev machine without live GCP credentials, so this test approximates
 *     "Cloud Tasks attaches a valid OIDC token" by stubbing the verifier to
 *     resolve/reject as if it had. Every check *around* that verification
 *     (missing header, wrong signing identity, wrong audience passed to
 *     verifyIdToken, unverified email claim) is exercised for real in
 *     verifyCloudTasksAuth.test.ts against the same (mocked) library.
 */

const verifyIdToken = vi.fn();
vi.mock('google-auth-library', () => ({
	OAuth2Client: class {
		verifyIdToken(...args: unknown[]) {
			return verifyIdToken(...args);
		}
	}
}));

const fetchCollectionXml = vi.fn();
const fetchThingXml = vi.fn();
vi.mock('$lib/server/bgg/client', () => ({
	fetchCollectionXml: (...args: unknown[]) => fetchCollectionXml(...args),
	fetchThingXml: (...args: unknown[]) => fetchThingXml(...args)
}));

const INVOKER_SA_EMAIL = 'yarg-tasks-invoker@yarg-staging-zbch.iam.gserviceaccount.com';
const cloudTasksEnv = {
	// GCP_PROJECT_ID/GCP_LOCATION/CLOUD_TASKS_QUEUE/WORKER_URL are the
	// *enqueuer's* vars (web service only, see config.ts) — the worker only
	// needs TASKS_INVOKER_SA_EMAIL to verify. Set here to prove the route
	// doesn't depend on the others.
	DATABASE_URL: process.env.DATABASE_URL,
	TASKS_INVOKER_SA_EMAIL: INVOKER_SA_EMAIL
};

async function withEnv<T>(env: Record<string, string | undefined>, fn: () => T | Promise<T>): Promise<T> {
	const prev = { ...process.env };
	Object.assign(process.env, env);
	try {
		return await fn();
	} finally {
		process.env = prev;
	}
}

function makeRequest(body: unknown, headers: Record<string, string> = {}) {
	return new Request('http://yarg-worker-internal.a.run.app/tasks/import', {
		method: 'POST',
		headers: { 'content-type': 'application/json', ...headers },
		body: JSON.stringify(body)
	});
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function makeEvent(request: Request): any {
	return { request, url: new URL(request.url) };
}

async function makeUserAndCollection(): Promise<{ userId: string; collectionId: string }> {
	const [row] = await sql<{ id: string }[]>`
		insert into auth.users (id) values (gen_random_uuid()) returning id`;
	await createUser(db, { id: row.id });
	const c = await createCollection(db, { userId: row.id, bggUsername: 'tyler' });
	return { userId: row.id, collectionId: c.id };
}

beforeEach(async () => {
	await sql`truncate table games restart identity cascade`;
	await sql`delete from auth.users`;
	verifyIdToken.mockReset();
	fetchCollectionXml.mockReset().mockResolvedValue({ status: 200, xml: '<items></items>' });
	fetchThingXml.mockReset().mockResolvedValue({ status: 200, xml: '<items></items>' });
});
afterAll(async () => {
	await db.destroy();
});

describe('POST /tasks/import (smoke test against local Supabase)', () => {
	it('rejects a request with no Authorization header before touching the DB or BGG', async () => {
		const { collectionId } = await makeUserAndCollection();
		const { POST } = await import('./+server');

		const res = await withEnv(cloudTasksEnv, () => POST(makeEvent(makeRequest({ collectionId, username: 'tyler' }))));

		expect(res.status).toBe(401);
		expect(fetchCollectionXml).not.toHaveBeenCalled();
		const collection = await getCollectionById(db, collectionId);
		expect(collection?.importStatus).toBe('idle');
	});

	it('rejects a validly-shaped but wrongly-signed token (simulated: verifyIdToken rejects)', async () => {
		const { collectionId } = await makeUserAndCollection();
		verifyIdToken.mockRejectedValue(new Error('Wrong recipient, payload audience != requiredAudience'));
		const { POST } = await import('./+server');

		const res = await withEnv(cloudTasksEnv, () =>
			POST(makeEvent(makeRequest({ collectionId, username: 'tyler' }, { authorization: 'Bearer stand-in-token' })))
		);

		expect(res.status).toBe(401);
		expect(fetchCollectionXml).not.toHaveBeenCalled();
	});

	it('rejects a token signed by an unexpected service account', async () => {
		const { collectionId } = await makeUserAndCollection();
		verifyIdToken.mockResolvedValue({
			getPayload: () => ({
				email: 'someone-else@another-project.iam.gserviceaccount.com',
				email_verified: true
			})
		});
		const { POST } = await import('./+server');

		const res = await withEnv(cloudTasksEnv, () =>
			POST(makeEvent(makeRequest({ collectionId, username: 'tyler' }, { authorization: 'Bearer stand-in-token' })))
		);

		expect(res.status).toBe(401);
	});

	it('processes a queued import end-to-end given a (simulated) valid Cloud Tasks OIDC token', async () => {
		const { collectionId } = await makeUserAndCollection();
		// Stand-in for a real Cloud Tasks-issued token: a validated payload
		// carrying the invoker SA's (verified) email — see file header.
		verifyIdToken.mockResolvedValue({
			getPayload: () => ({ email: INVOKER_SA_EMAIL, email_verified: true })
		});
		const { POST } = await import('./+server');

		const res = await withEnv(cloudTasksEnv, () =>
			POST(
				makeEvent(
					makeRequest(
						{ collectionId, username: 'tyler', ownedOnly: false },
						{ authorization: 'Bearer stand-in-token' }
					)
				)
			)
		);

		expect(res.status).toBe(204);
		expect(fetchCollectionXml).toHaveBeenCalledWith('tyler', { ownedOnly: false });
		const collection = await getCollectionById(db, collectionId);
		expect(collection?.importStatus).toBe('complete');
		expect(collection?.lastSyncedAt).not.toBeNull();
	});

	it('returns 400 (not 204/5xx) for a malformed body, without invoking the BGG client', async () => {
		verifyIdToken.mockResolvedValue({
			getPayload: () => ({ email: INVOKER_SA_EMAIL, email_verified: true })
		});
		const { POST } = await import('./+server');

		const res = await withEnv(cloudTasksEnv, () =>
			POST(makeEvent(makeRequest({ username: 'tyler' }, { authorization: 'Bearer stand-in-token' })))
		);

		expect(res.status).toBe(400);
		expect(fetchCollectionXml).not.toHaveBeenCalled();
	});
});
