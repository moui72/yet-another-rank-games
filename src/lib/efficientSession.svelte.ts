import { deriveEdges, breakCycles, deriveOrder, type Judgment } from './domain/constraintOrder';
import {
	selectNextComparison,
	bestFirstSequence,
	insertionState,
	type InsertionState
} from './domain/insertionSelect';
import { overrideToEdges, type EdgeIntent } from './domain/overrideEdges';

const EMPTY_RATINGS: ReadonlyMap<number, number | null> = new Map();

/**
 * The single reactive store for an `efficient`-mode ranking session
 * (constitution Principle XII). The **judgment log is the source of truth**;
 * the edge set, derived order, next matchup, and insertion progress are all
 * derived from it, so the session is recomputable from — and serialisable to —
 * its log (native stop-early/resume, no persisted sort state).
 *
 * New choices are stamped with a monotonic client `createdAt`/`id` purely so
 * the optimistic derivation keeps latest-wins ordering; the server assigns the
 * authoritative values, and a reload re-hydrates from persisted rows.
 */
export class EfficientSession {
	gameIds = $state<number[]>([]);
	log = $state<Judgment[]>([]);
	#userRatings: ReadonlyMap<number, number | null> = EMPTY_RATINGS;
	#seq = 0;

	#edges = $derived(breakCycles(deriveEdges(this.log)));
	#sequence = $derived(bestFirstSequence(this.gameIds, this.#userRatings));
	#order = $derived(deriveOrder(this.gameIds, this.log));
	#insertion = $derived<InsertionState | null>(insertionState(this.#sequence, this.#edges));

	constructor(
		gameIds: number[],
		log: Judgment[] = [],
		userRatings: ReadonlyMap<number, number | null> = EMPTY_RATINGS
	) {
		this.gameIds = gameIds;
		this.log = [...log];
		this.#userRatings = userRatings;
		// Seed the monotonic client clock past any persisted synthetic ids.
		this.#seq = log.length;
	}

	/** The current best-first derived total order (index 0 = rank 1). */
	get order(): number[] {
		return this.#order;
	}

	/** The next matchup to ask, or null when the ordering is complete. */
	get currentPair(): { a: number; b: number } | null {
		return selectNextComparison(this.#sequence, this.#edges);
	}

	/** Whether every game's position is fully determined by the edges. */
	get isComplete(): boolean {
		return this.currentPair === null;
	}

	/** Insertion progress for the T017 indicator, or null when complete. */
	get insertion(): InsertionState | null {
		return this.#insertion;
	}

	#stamp(): { createdAt: string; id: string } {
		this.#seq += 1;
		// A far-future constant `createdAt` keeps every optimistic client edge
		// newer than any persisted row under the `(createdAt, id)` total order;
		// the zero-padded id breaks ties monotonically (so `c…0002` < `c…0010`).
		// The server assigns the authoritative stamp; this only orders the
		// optimistic derivation until reload.
		return { createdAt: '9999-12-31T23:59:59.999Z', id: `c${String(this.#seq).padStart(9, '0')}` };
	}

	/** Record a choice (winner beats loser) as the newest judgment for its pair. */
	choose(winnerId: number, loserId: number) {
		this.log.push({ winnerId, loserId, ...this.#stamp() });
	}

	/** Undo the most recent judgment. */
	undo() {
		this.log.pop();
	}

	/**
	 * Apply a manual override moving `gameId` to `targetIndex` in the current
	 * order. Pushes the k crossed-pair edges as the newest judgments (so the
	 * game lands exactly where placed) and returns those edge intents for the
	 * caller to persist via the batched write (T013/T018). No-op returns `[]`.
	 */
	moveTo(gameId: number, targetIndex: number): EdgeIntent[] {
		const intents = overrideToEdges(this.#order, gameId, targetIndex);
		for (const e of intents) this.log.push({ ...e, ...this.#stamp() });
		return intents;
	}

	/** Move a game up one rank (k=1 override). Returns edge intents to persist. */
	moveUp(gameId: number): EdgeIntent[] {
		const i = this.#order.indexOf(gameId);
		if (i <= 0) return [];
		return this.moveTo(gameId, i - 1);
	}

	/** Move a game down one rank (k=1 override). Returns edge intents to persist. */
	moveDown(gameId: number): EdgeIntent[] {
		const i = this.#order.indexOf(gameId);
		if (i === -1 || i >= this.#order.length - 1) return [];
		return this.moveTo(gameId, i + 1);
	}

	/** The serialisable source of truth. */
	serialize(): Judgment[] {
		return [...this.log];
	}
}
