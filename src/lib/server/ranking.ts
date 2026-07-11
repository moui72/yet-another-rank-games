import type { Kysely } from 'kysely';
import type { Database } from './schema';
import { ratingsFromComparisons, rankGames, initialRating } from '$lib/domain/ranking';
import { conservativeScore } from '$lib/domain/score';
import { listComparisons, recordComparison } from './repositories/comparisons';
import { listPoolGames } from './repositories/pools';
import { replaceListEntries } from './repositories/listEntries';

/**
 * Recompute a list's `ListEntry` ordering snapshot from its comparison log (the
 * source of truth). Ranks the pool's **current** games, using only comparisons
 * where both games are still in the pool (removed games are ignored). Derivable
 * and idempotent — replaying the same log yields the same snapshot.
 */
export async function recomputeListEntries(db: Kysely<Database>, listId: string): Promise<void> {
	const list = await db
		.selectFrom('lists')
		.select('poolId')
		.where('id', '=', listId)
		.executeTakeFirstOrThrow();

	const poolGameIds = (await listPoolGames(db, list.poolId)).map((g) => g.id);
	const inPool = new Set(poolGameIds);

	const comparisons = (await listComparisons(db, listId))
		.filter((c) => inPool.has(c.gameA) && inPool.has(c.gameB))
		.map((c) => ({
			winnerId: c.winnerId,
			loserId: c.winnerId === c.gameA ? c.gameB : c.gameA
		}));

	const ratings = ratingsFromComparisons(comparisons);
	const ranked = rankGames(poolGameIds, ratings);

	const entries = ranked.map((gameId, i) => {
		const r = ratings.get(gameId) ?? initialRating();
		return { gameId, position: i + 1, score: conservativeScore(r.mu, r.sigma, 3) };
	});
	await replaceListEntries(db, listId, entries);
}

/** Record a pairwise choice, then refresh the ordering snapshot. */
export async function recordComparisonAndRecompute(
	db: Kysely<Database>,
	input: { listId: string; gameA: number; gameB: number; winnerId: number }
): Promise<void> {
	await recordComparison(db, input);
	await recomputeListEntries(db, input.listId);
}
