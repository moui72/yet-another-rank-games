import { SvelteSet } from 'svelte/reactivity';
import { pairwiseState, type Choice } from './domain/ranking';

const EMPTY_SET: ReadonlySet<number> = new SvelteSet();

/**
 * The single reactive store for a pairwise ranking session (constitution
 * Principle XII). The **choice log is the source of truth**; ratings, order,
 * and the current matchup are derived from it, so the whole session is
 * recomputable from — and serializable to — its log (stop-early/resume).
 */
export class PairwiseSession {
	gameIds = $state<number[]>([]);
	/**
	 * Games manually excluded from ranking (feedback F001-F002) — kept in the
	 * pool with their comparison history intact, but not offered for new
	 * matchups and shown in Unranked instead of Ranked.
	 */
	excludedIds = $state<SvelteSet<number>>(new SvelteSet());
	log = $state<Choice[]>([]);
	#state = $derived(pairwiseState(this.gameIds, this.log, this.excludedIds));

	constructor(gameIds: number[], log: Choice[] = [], excludedIds: ReadonlySet<number> = EMPTY_SET) {
		this.gameIds = gameIds;
		this.log = [...log];
		this.excludedIds = new SvelteSet(excludedIds);
	}

	get ratings() {
		return this.#state.ratings;
	}
	/** Best-first order over Ranked games only (has ≥1 comparison, not excluded). */
	get order() {
		return this.#state.ranked;
	}
	/** Games with ≥1 comparison and not manually excluded. */
	get ranked() {
		return this.#state.ranked;
	}
	/** Never-compared games, plus manually-excluded games regardless of history. */
	get unranked() {
		return this.#state.unranked;
	}
	get comparedKeys() {
		return this.#state.comparedKeys;
	}
	/** The next matchup to show (from non-excluded games only), or null. */
	get currentPair() {
		return this.#state.currentPair;
	}
	/**
	 * Every pair among currently-active (non-excluded) games has been judged
	 * at least once (feature `pool-completion-celebration`). Fully derived
	 * from `gameIds`/`log`/`excludedIds` — recomputes automatically when the
	 * active set changes, no separate "unhide" mechanism needed.
	 */
	get isFullyOrdered() {
		return this.#state.remainingPairs === 0;
	}
	/** How many distinct pairs have been judged, and the total possible. */
	get progress() {
		const n = this.gameIds.length;
		return { seen: this.comparedKeys.size, total: (n * (n - 1)) / 2 };
	}

	/** Record a choice (winner beats loser) — appends to the log. */
	choose(winnerId: number, loserId: number) {
		this.log.push({ winnerId, loserId });
	}

	/** Undo the most recent choice. */
	undo() {
		this.log.pop();
	}

	/** Exclude/un-exclude a game from ranking (T014) — a client-side mirror of the persisted flag. */
	setExcluded(gameId: number, excluded: boolean) {
		if (excluded) this.excludedIds.add(gameId);
		else this.excludedIds.delete(gameId);
	}

	/** The serializable source of truth. */
	serialize(): Choice[] {
		return [...this.log];
	}
}
