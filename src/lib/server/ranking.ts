import type { Kysely } from 'kysely';
import type { Database } from './schema';
import { ratingsFromComparisons, rankGames, initialRating } from '$lib/domain/ranking';
import { conservativeScore } from '$lib/domain/score';
import { deriveOrder, type Judgment } from '$lib/domain/constraintOrder';
import {
	listComparisons,
	recordComparison,
	recordComparisons,
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
		.select(['poolId', 'rankingMethod'])
		.where('id', '=', listId)
		.executeTakeFirstOrThrow();

	const poolGames = await listPoolGames(db, list.poolId);
	const inPool = new Set(poolGames.map((g) => g.id));
	const rankedGameIds = poolGames.filter((g) => !g.excludedFromRanking).map((g) => g.id);

	const rows = (await listComparisons(db, listId)).filter(
		(c) => inPool.has(c.gameA) && inPool.has(c.gameB)
	);

	if (list.rankingMethod === 'efficient') {
		// Efficient mode: order is the constraint-graph derivation over the same
		// rows (datamodel.md). The judgment log keeps `createdAt`/`id` so the
		// latest-wins / drop-oldest rules stay well-defined. Score is null —
		// this mode's order is the topo sort, not a rating.
		const judgments: Judgment[] = rows.map((c) => ({
			winnerId: c.winnerId,
			loserId: c.winnerId === c.gameA ? c.gameB : c.gameA,
			createdAt: c.createdAt,
			id: c.id
		}));
		const order = deriveOrder(rankedGameIds, judgments);
		await replaceListEntries(
			db,
			listId,
			order.map((gameId, i) => ({ gameId, position: i + 1, score: null }))
		);
		return;
	}

	const comparisons = rows.map((c) => ({
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

/**
 * Persist a batch of override edges (T013) for an efficient list, then refresh
 * the ordering snapshot from the constraint derivation. One drag = one request:
 * the k crossed-pair edges land as the newest judgments for their pairs, so the
 * moved game lands exactly where dropped (T011).
 */
export async function recordOverrideAndRecompute(
	db: Kysely<Database>,
	listId: string,
	edges: readonly { winnerId: number; loserId: number }[]
): Promise<void> {
	await recordComparisons(db, { listId, edges });
	await recomputeListEntries(db, listId);
}
