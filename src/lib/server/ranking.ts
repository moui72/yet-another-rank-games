import type { Kysely } from 'kysely';
import type { Database } from './schema';
import { ratingsFromComparisons, rankGames, initialRating } from '$lib/domain/ranking';
import { conservativeScore } from '$lib/domain/score';
import {
	listComparisons,
	recordComparison,
	deleteLastComparison
} from './repositories/comparisons';
import { listPoolGames, setPoolGameExcluded } from './repositories/pools';
import { replaceListEntries } from './repositories/listEntries';

/**
 * Recompute a list's `ListEntry` ordering snapshot from its comparison log (the
 * source of truth). Ratings are computed from comparisons between any two
 * games still in the pool (removed games are ignored) — a manually-excluded
 * game's comparison history still informs its opponents' ratings. The
 * persisted snapshot itself only orders the **non-excluded** pool games
 * (feedback F001-F003: an excluded game moves to the Unranked view). Derivable
 * and idempotent — replaying the same log yields the same snapshot.
 */
export async function recomputeListEntries(db: Kysely<Database>, listId: string): Promise<void> {
	const list = await db
		.selectFrom('lists')
		.select('poolId')
		.where('id', '=', listId)
		.executeTakeFirstOrThrow();

	const poolGames = await listPoolGames(db, list.poolId);
	const inPool = new Set(poolGames.map((g) => g.id));
	const rankedGameIds = poolGames.filter((g) => !g.excludedFromRanking).map((g) => g.id);

	const comparisons = (await listComparisons(db, listId))
		.filter((c) => inPool.has(c.gameA) && inPool.has(c.gameB))
		.map((c) => ({
			winnerId: c.winnerId,
			loserId: c.winnerId === c.gameA ? c.gameB : c.gameA
		}));

	const ratings = ratingsFromComparisons(comparisons);
	const ranked = rankGames(rankedGameIds, ratings);

	const entries = ranked.map((gameId, i) => {
		const r = ratings.get(gameId) ?? initialRating();
		return { gameId, position: i + 1, score: conservativeScore(r.mu, r.sigma, 3) };
	});
	await replaceListEntries(db, listId, entries);
}

/**
 * Set/clear a pool game's ranking exclusion (T014), then refresh the
 * ordering snapshot so the export/persisted view reflects it immediately.
 */
export async function setPoolGameExcludedAndRecompute(
	db: Kysely<Database>,
	listId: string,
	poolId: string,
	gameId: number,
	excluded: boolean
): Promise<void> {
	await setPoolGameExcluded(db, poolId, gameId, excluded);
	await recomputeListEntries(db, listId);
}

/** Record a pairwise choice, then refresh the ordering snapshot. */
export async function recordComparisonAndRecompute(
	db: Kysely<Database>,
	input: { listId: string; gameA: number; gameB: number; winnerId: number }
): Promise<void> {
	await recordComparison(db, input);
	await recomputeListEntries(db, input.listId);
}

/** Undo the most recent comparison, then refresh the ordering snapshot. */
export async function undoLastComparisonAndRecompute(
	db: Kysely<Database>,
	listId: string
): Promise<void> {
	await deleteLastComparison(db, listId);
	await recomputeListEntries(db, listId);
}
