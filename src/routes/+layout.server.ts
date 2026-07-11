import type { LayoutServerLoad } from './$types';

/** Expose the validated session + the cookies the browser client needs to sync. */
export const load: LayoutServerLoad = async ({ locals: { safeGetSession }, cookies }) => {
	const { session, user } = await safeGetSession();
	return { session, user, cookies: cookies.getAll() };
};
