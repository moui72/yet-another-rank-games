import { describe, it, expect, vi, beforeEach } from 'vitest';

const verifyIdToken = vi.fn();
vi.mock('google-auth-library', () => ({
	OAuth2Client: class {
		verifyIdToken(...args: unknown[]) {
			return verifyIdToken(...args);
		}
	}
}));

import { verifyCloudTasksAuth, CloudTasksAuthError } from './verifyCloudTasksAuth';

const config = {
	audience: 'https://yarg-worker-abc.a.run.app',
	invokerServiceAccountEmail: 'yarg-tasks-invoker@yarg-staging-zbch.iam.gserviceaccount.com'
};

function ticketWith(payload: Record<string, unknown> | undefined) {
	return { getPayload: () => payload };
}

describe('verifyCloudTasksAuth', () => {
	beforeEach(() => {
		verifyIdToken.mockReset();
	});

	it('rejects a missing Authorization header', async () => {
		await expect(verifyCloudTasksAuth(null, config)).rejects.toThrow(CloudTasksAuthError);
		expect(verifyIdToken).not.toHaveBeenCalled();
	});

	it('rejects a non-Bearer header', async () => {
		await expect(verifyCloudTasksAuth('Basic abc', config)).rejects.toThrow(CloudTasksAuthError);
		expect(verifyIdToken).not.toHaveBeenCalled();
	});

	it('accepts a token that verifies with the expected audience and signing identity', async () => {
		verifyIdToken.mockResolvedValue(
			ticketWith({ email: config.invokerServiceAccountEmail, email_verified: true })
		);
		await expect(verifyCloudTasksAuth('Bearer good-token', config)).resolves.toBeUndefined();
		expect(verifyIdToken).toHaveBeenCalledWith({ idToken: 'good-token', audience: config.audience });
	});

	it('rejects when signature/audience verification throws (bad/expired/wrong-audience token)', async () => {
		verifyIdToken.mockRejectedValue(new Error('Wrong recipient'));
		await expect(verifyCloudTasksAuth('Bearer bad-token', config)).rejects.toThrow(CloudTasksAuthError);
	});

	it('rejects a validly-signed token from an unexpected service account', async () => {
		verifyIdToken.mockResolvedValue(
			ticketWith({ email: 'someone-else@evil-project.iam.gserviceaccount.com', email_verified: true })
		);
		await expect(verifyCloudTasksAuth('Bearer other-token', config)).rejects.toThrow(CloudTasksAuthError);
	});

	it('rejects when the email claim is unverified', async () => {
		verifyIdToken.mockResolvedValue(
			ticketWith({ email: config.invokerServiceAccountEmail, email_verified: false })
		);
		await expect(verifyCloudTasksAuth('Bearer unverified-token', config)).rejects.toThrow(
			CloudTasksAuthError
		);
	});
});
