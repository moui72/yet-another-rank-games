import { describe, it, expect, vi, beforeEach } from 'vitest';

const TASKS_INVOKER_SA_EMAIL = 'yarg-tasks-invoker@yarg-staging-zbch.iam.gserviceaccount.com';

const loadServerConfig = vi.fn();
vi.mock('$lib/server/config', () => ({
	loadServerConfig: (...args: unknown[]) => loadServerConfig(...args)
}));

const verifyCloudTasksAuth = vi.fn();
vi.mock('$lib/server/tasks/verifyCloudTasksAuth', () => ({
	verifyCloudTasksAuth: (...args: unknown[]) => verifyCloudTasksAuth(...args),
	CloudTasksAuthError: class CloudTasksAuthError extends Error {}
}));

const processImportJob = vi.fn();
vi.mock('$lib/server/jobs/importJob', () => ({
	processImportJob: (...args: unknown[]) => processImportJob(...args)
}));

vi.mock('$lib/server/log', () => ({ logEvent: vi.fn(), logError: vi.fn() }));

import { POST } from './+server';
import { CloudTasksAuthError } from '$lib/server/tasks/verifyCloudTasksAuth';

function makeRequest(body: unknown, headers: Record<string, string> = {}) {
	return new Request('http://worker.internal/tasks/import', {
		method: 'POST',
		headers: { 'content-type': 'application/json', ...headers },
		body: JSON.stringify(body)
	});
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function makeEvent(request: Request): any {
	return { request, url: new URL(request.url) };
}

const job = { collectionId: 'c1', username: 'tyler', ownedOnly: true };

describe('POST /tasks/import', () => {
	beforeEach(() => {
		loadServerConfig.mockReset().mockReturnValue({
			cloudTasksAuth: { invokerServiceAccountEmail: TASKS_INVOKER_SA_EMAIL }
		});
		verifyCloudTasksAuth.mockReset().mockResolvedValue(undefined);
		processImportJob.mockReset().mockResolvedValue(undefined);
	});

	it('returns 500 when deployed without Cloud Tasks auth config (fail closed)', async () => {
		loadServerConfig.mockReturnValue({ cloudTasksAuth: undefined });
		const res = await POST(makeEvent(makeRequest(job, { authorization: 'Bearer t' })));
		expect(res.status).toBe(500);
		expect(verifyCloudTasksAuth).not.toHaveBeenCalled();
	});

	it('returns 401 when auth verification fails, without running the job', async () => {
		verifyCloudTasksAuth.mockRejectedValue(new CloudTasksAuthError('bad token'));
		const res = await POST(makeEvent(makeRequest(job, { authorization: 'Bearer bad' })));
		expect(res.status).toBe(401);
		expect(processImportJob).not.toHaveBeenCalled();
	});

	it('returns 400 for a body that does not match the ImportJob shape', async () => {
		const res = await POST(makeEvent(makeRequest({ username: 'tyler' }, { authorization: 'Bearer t' })));
		expect(res.status).toBe(400);
		expect(processImportJob).not.toHaveBeenCalled();
	});

	it('processes a valid, authenticated job and returns 204', async () => {
		const res = await POST(makeEvent(makeRequest(job, { authorization: 'Bearer t' })));
		expect(verifyCloudTasksAuth).toHaveBeenCalledWith(
			'Bearer t',
			expect.objectContaining({
				audience: 'http://worker.internal',
				invokerServiceAccountEmail: TASKS_INVOKER_SA_EMAIL
			})
		);
		expect(processImportJob).toHaveBeenCalledWith(job);
		expect(res.status).toBe(204);
	});

	it('returns 500 (so Cloud Tasks retries) when processing throws', async () => {
		processImportJob.mockRejectedValue(new Error('db unreachable'));
		const res = await POST(makeEvent(makeRequest(job, { authorization: 'Bearer t' })));
		expect(res.status).toBe(500);
	});
});
