import { pairwiseState, type Choice } from './domain/ranking';

/**
 * The single reactive store for a pairwise ranking session (constitution
 * Principle XII). The **choice log is the source of truth**; ratings, order,
 * and the current matchup are derived from it, so the whole session is
 * recomputable from — and serializable to — its log (stop-early/resume).
 */
export class PairwiseSession {
	gameIds = $state<number[]>([]);
	log = $state<Choice[]>([]);
	#state = $derived(pairwiseState(this.gameIds, this.log));

	constructor(gameIds: number[], log: Choice[] = []) {
		this.gameIds = gameIds;
		this.log = [...log];
	}

	get ratings() {
		return this.#state.ratings;
	}
	get order() {
		return this.#state.order;
	}
	get comparedKeys() {
		return this.#state.comparedKeys;
	}
	/** The next matchup to show, or null when fewer than two games. */
	get currentPair() {
		return this.#state.currentPair;
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

	/** The serializable source of truth. */
	serialize(): Choice[] {
		return [...this.log];
	}
}
