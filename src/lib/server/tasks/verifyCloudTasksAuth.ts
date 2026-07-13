import { OAuth2Client } from 'google-auth-library';

/** Thrown for any auth failure — the caller maps this to a `401`. */
export class CloudTasksAuthError extends Error {}

const client = new OAuth2Client();

export interface VerifyCloudTasksAuthConfig {
	/**
	 * Expected `aud` claim. Cloud Tasks stamps this with the exact URL the
	 * enqueuer targeted (see `CloudTasksJobQueue`) — the caller passes the
	 * incoming request's own origin, since the worker's Cloud Run URL is a
	 * Terraform output it can't reference in its own env (self-cycle).
	 */
	audience: string;
	/** Expected signing identity of the OIDC token Cloud Tasks attaches. */
	invokerServiceAccountEmail: string;
}

/**
 * Verifies the `Authorization: Bearer <token>` header Cloud Tasks attaches to
 * its `POST /tasks/import` request, per infrastructure.md's "Worker invocation
 * contract": the worker checks the token's issuer, audience, and signing
 * service account before processing a request, rejecting anything else with
 * `401`.
 *
 * `verifyIdToken` does the heavy lifting — it validates the signature against
 * Google's public certs (fetched over the network and cached), the issuer
 * (`accounts.google.com`), and the audience. We additionally pin the signing
 * identity (the `email` claim) to the dedicated Cloud Tasks invoker service
 * account, so a validly-signed token for some *other* Google-invoked service
 * can't be replayed here.
 */
export async function verifyCloudTasksAuth(
	authorizationHeader: string | null,
	config: VerifyCloudTasksAuthConfig
): Promise<void> {
	if (!authorizationHeader?.startsWith('Bearer ')) {
		throw new CloudTasksAuthError('Missing bearer token');
	}
	const idToken = authorizationHeader.slice('Bearer '.length);

	let payload;
	try {
		const ticket = await client.verifyIdToken({ idToken, audience: config.audience });
		payload = ticket.getPayload();
	} catch (e) {
		throw new CloudTasksAuthError(
			`Token verification failed: ${e instanceof Error ? e.message : String(e)}`
		);
	}

	if (!payload) throw new CloudTasksAuthError('Token had no payload');
	if (!payload.email || payload.email !== config.invokerServiceAccountEmail) {
		throw new CloudTasksAuthError(`Unexpected signing identity: ${payload.email ?? '(none)'}`);
	}
	if (!payload.email_verified) {
		throw new CloudTasksAuthError('Signing identity email not verified');
	}
}
