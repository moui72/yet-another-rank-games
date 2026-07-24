import { describe, it, expect } from 'vitest';
import {
	initialRating,
	applyComparison,
	ratingsFromComparisons,
	rankGames,
	pairKey,
	selectNextPair,
	pairwiseState,
	comparedGameIds,
	splitRankedUnranked,
	type Ratings,
	type Choice
} from './ranking';

describe('applyComparison', () => {
	it('raises the winner and lowers the loser, shrinking both uncertainties', () => {
		const ratings = applyComparison(new Map(), 1, 2); // 1 beats 2
		const w = ratings.get(1)!;
		const l = ratings.get(2)!;
		expect(w.mu).toBeGreaterThan(25);
		expect(l.mu).toBeLessThan(25);
		expect(w.sigma).toBeLessThan(initialRating().sigma);
		expect(l.sigma).toBeLessThan(initialRating().sigma);
	});

	it('does not mutate the input map', () => {
		const before = new Map();
		applyComparison(before, 1, 2);
		expect(before.size).toBe(0);
	});
});

describe('ratingsFromComparisons (replay/resume)', () => {
	it('is deterministic — the same log yields the same ratings', () => {
		const log = [
			{ winnerId: 1, loserId: 2 },
			{ winnerId: 1, loserId: 3 },
			{ winnerId: 2, loserId: 3 }
		];
		const a = ratingsFromComparisons(log);
		const b = ratingsFromComparisons(log);
		expect(a.get(1)).toEqual(b.get(1));
		expect(a.get(3)).toEqual(b.get(3));
	});
});

describe('rankGames', () => {
	it('orders a consistent winner first and a consistent loser last', () => {
		// 1 beats everyone, 3 loses to everyone.
		const ratings = ratingsFromComparisons([
			{ winnerId: 1, loserId: 2 },
			{ winnerId: 1, loserId: 3 },
			{ winnerId: 2, loserId: 3 }
		]);
		expect(rankGames([1, 2, 3], ratings)).toEqual([1, 2, 3]);
	});

	it('treats unrated games as the initial rating (tie, stable order)', () => {
		expect(rankGames([7, 8, 9], new Map())).toEqual([7, 8, 9]);
	});

	it('does not mutate the input array', () => {
		const ids = [3, 1, 2];
		rankGames(ids, new Map());
		expect(ids).toEqual([3, 1, 2]);
	});
});

describe('pairKey', () => {
	it('is order-independent', () => {
		expect(pairKey(2, 5)).toBe(pairKey(5, 2));
	});
});

describe('selectNextPair', () => {
	// 1 & 2 are close (informative); 3 is far.
	const ratings: Ratings = new Map([
		[1, { mu: 30, sigma: 2 }],
		[2, { mu: 29, sigma: 2 }],
		[3, { mu: 10, sigma: 2 }]
	]);

	it('returns null when fewer than two games', () => {
		expect(selectNextPair([], ratings, new Set())).toBeNull();
		expect(selectNextPair([1], ratings, new Set())).toBeNull();
	});

	it('prefers the most informative (closest-rated) unseen pair', () => {
		expect(selectNextPair([1, 2, 3], ratings, new Set())).toEqual([1, 2]);
	});

	it('skips a seen pair for the next most informative unseen one', () => {
		const seen = new Set([pairKey(1, 2)]);
		expect(selectNextPair([1, 2, 3], ratings, seen)).toEqual([2, 3]);
	});

	it('permits a repeat only when every pair has been seen', () => {
		const allSeen = new Set([pairKey(1, 2), pairKey(1, 3), pairKey(2, 3)]);
		expect(selectNextPair([1, 2, 3], ratings, allSeen)).toEqual([1, 2]);
	});

	it('picks a deterministic pair when all games are unrated (tie)', () => {
		expect(selectNextPair([5, 6, 7], new Map(), new Set())).toEqual([5, 6]);
	});
});

describe('pairwiseState', () => {
	const games = [1, 2, 3];

	it('starts with the initial order and the first matchup, nothing seen', () => {
		const s = pairwiseState(games, []);
		expect(s.order).toEqual([1, 2, 3]);
		expect(s.currentPair).toEqual([1, 2]);
		expect(s.comparedKeys.size).toBe(0);
	});

	it('serialize/resume — the same log reproduces the same state', () => {
		const log: Choice[] = [
			{ winnerId: 1, loserId: 2 },
			{ winnerId: 1, loserId: 3 },
			{ winnerId: 2, loserId: 3 }
		];
		const a = pairwiseState(games, log);
		const b = pairwiseState(games, log);
		expect(a.order).toEqual(b.order);
		expect(a.currentPair).toEqual(b.currentPair);
		expect(a.order).toEqual([1, 2, 3]);
	});

	it('reflects wins in the order and does not re-show a seen pair while unseen remain', () => {
		const s = pairwiseState(games, [{ winnerId: 3, loserId: 1 }]);
		expect(s.currentPair).not.toEqual([3, 1]);
		expect(s.currentPair).not.toEqual([1, 3]);
	});

	// pool-completion-celebration T001: remainingPairs counts unseen pairs
	// among active (non-excluded) games only — the same enumeration
	// selectNextPair already does, not a separate "done" algorithm.
	describe('remainingPairs', () => {
		it('is the full pair count when nothing has been judged', () => {
			const s = pairwiseState(games, []);
			expect(s.remainingPairs).toBe(3); // 1-2, 1-3, 2-3
		});

		it('is zero once every active pair has been judged', () => {
			const log: Choice[] = [
				{ winnerId: 1, loserId: 2 },
				{ winnerId: 1, loserId: 3 },
				{ winnerId: 2, loserId: 3 }
			];
			const s = pairwiseState(games, log);
			expect(s.remainingPairs).toBe(0);
		});

		it('is nonzero when any active pair remains unseen', () => {
			const log: Choice[] = [{ winnerId: 1, loserId: 2 }];
			const s = pairwiseState(games, log);
			expect(s.remainingPairs).toBe(2); // 1-3, 2-3 still unseen
		});

		it('excludes a manually-excluded game\'s unseen pairs from the count', () => {
			// Only 1-2 has been judged; excluding game 3 removes 1-3 and 2-3
			// from consideration entirely, leaving nothing remaining.
			const log: Choice[] = [{ winnerId: 1, loserId: 2 }];
			const s = pairwiseState(games, log, new Set([3]));
			expect(s.remainingPairs).toBe(0);
		});
	});
});

// Pairwise ranking unranked/ranked split (T013, feedback F002).
describe('comparedGameIds', () => {
	it('collects every game id that appears in the log', () => {
		const log: Choice[] = [
			{ winnerId: 1, loserId: 2 },
			{ winnerId: 1, loserId: 3 }
		];
		expect(comparedGameIds(log)).toEqual(new Set([1, 2, 3]));
	});

	it('is empty for an empty log', () => {
		expect(comparedGameIds([])).toEqual(new Set());
	});
});

describe('splitRankedUnranked', () => {
	const log: Choice[] = [{ winnerId: 1, loserId: 2 }];
	const ratings = ratingsFromComparisons(log);

	it('a game starts in Unranked until its first comparison', () => {
		const { ranked, unranked } = splitRankedUnranked([1, 2, 3], ratings, log, new Set());
		expect(ranked).toEqual([1, 2]);
		expect(unranked).toEqual([3]);
	});

	it('an excluded game moves to Unranked even with comparison history', () => {
		const { ranked, unranked } = splitRankedUnranked([1, 2, 3], ratings, log, new Set([1]));
		expect(ranked).toEqual([2]);
		expect(unranked).toEqual([1, 3]);
	});

	it('ranked preserves best-first order', () => {
		const threeWayLog: Choice[] = [
			{ winnerId: 1, loserId: 2 },
			{ winnerId: 2, loserId: 3 },
			{ winnerId: 1, loserId: 3 }
		];
		const r = ratingsFromComparisons(threeWayLog);
		const { ranked } = splitRankedUnranked([3, 1, 2], r, threeWayLog, new Set());
		expect(ranked).toEqual([1, 2, 3]);
	});
});

// F001 regression guard (T001): pairwise manual move reload divergence.
// research-pairwise-manual-reorder-reload-divergence-2026-07-21-49c5.md found
// that a move-up/move-down click appends a synthetic comparison to the
// client's in-memory (append-only) log, but the server persists it via an
// upsert on the unordered pair (`comparisons.ts`'s `recordComparison`) that
// (a) overwrites a re-judged pair's row instead of duplicating it and (b)
// bumps that row's `createdAt` — so `listComparisons`'s replay order
// (`(createdAt, id)`) moves the overridden pair to the *end* of the log.
// Every rating computed between a pair's original and new replay position
// differs, so a reload can show a different order than the session did —
// including moving games the user never touched.
//
// `PairwiseSession` itself (`pairwiseSession.svelte.ts`) can't be unit-tested
// in this project's plain vitest config (it needs the Svelte rune compiler —
// confirmed: importing it here throws `$state is not defined`; per
// `vitest.config.ts` it is "exercised via e2e"). So this guard reproduces its
// exact `moveUp`/`moveDown` neighbor-selection algorithm — read the neighbor
// from the order derived from the *current* log, emit a synthetic choice —
// directly against the exported domain functions, which is everything the
// divergence depends on.
describe('F001 pairwise move reload divergence (T001)', () => {
	const [Hotel, India, Golf, Lima, Juliet, Kilo] = [1, 2, 3, 4, 5, 6];
	const gameIds = [Hotel, India, Golf, Lima, Juliet, Kilo];

	// A deterministic 10-row partial prior (found by simulation against this
	// module's own `rankGames`/`ratingsFromComparisons` — every game already
	// has at least one comparison, so nothing starts Unranked), then the
	// research recipe's moves: Juliet ▲×3, India ▼×2.
	const prior: Choice[] = [
		{ winnerId: India, loserId: Lima },
		{ winnerId: Golf, loserId: Juliet },
		{ winnerId: Hotel, loserId: Lima },
		{ winnerId: Kilo, loserId: Lima },
		{ winnerId: India, loserId: Juliet },
		{ winnerId: Kilo, loserId: Golf },
		{ winnerId: Hotel, loserId: Juliet },
		{ winnerId: Golf, loserId: Hotel },
		{ winnerId: Golf, loserId: Lima },
		{ winnerId: Hotel, loserId: Kilo }
	];
	const moveSequence = [
		{ dir: 'up', gameId: Juliet },
		{ dir: 'up', gameId: Juliet },
		{ dir: 'up', gameId: Juliet },
		{ dir: 'down', gameId: India },
		{ dir: 'down', gameId: India }
	] as const;

	/**
	 * Mirror `comparisons.ts`'s upsert/replay semantics purely in memory: a
	 * write dedupes on the unordered pair (a later write overwrites the
	 * winner of an existing row) and moves that pair's replay position to the
	 * end — the `createdAt` bump — matching `listComparisons`'s
	 * `(createdAt, id)` ordering.
	 */
	function persistedReplay(writes: readonly Choice[]): Choice[] {
		const order: string[] = [];
		const rows = new Map<string, Choice>();
		for (const w of writes) {
			const key = pairKey(w.winnerId, w.loserId);
			if (rows.has(key)) order.splice(order.indexOf(key), 1);
			rows.set(key, w);
			order.push(key);
		}
		return order.map((k) => rows.get(k)!);
	}

	/** Mirrors `PairwiseSession.moveUp`: neighbor read from the order the *current* log derives. */
	function moveUp(log: readonly Choice[], gameId: number): Choice | null {
		const ranked = rankGames(gameIds, ratingsFromComparisons(log));
		const index = ranked.indexOf(gameId);
		if (index <= 0) return null;
		return { winnerId: gameId, loserId: ranked[index - 1] };
	}
	/** Mirrors `PairwiseSession.moveDown`. */
	function moveDown(log: readonly Choice[], gameId: number): Choice | null {
		const ranked = rankGames(gameIds, ratingsFromComparisons(log));
		const index = ranked.indexOf(gameId);
		if (index === -1 || index >= ranked.length - 1) return null;
		return { winnerId: ranked[index + 1], loserId: gameId };
	}

	/**
	 * Drive the move sequence, choosing each move's neighbor from `logForMove`
	 * (the log the client currently holds) but always accumulating the full
	 * write history in `persistedWrites` (what the server sees). After each
	 * write, `resync` decides what the client's log becomes for the *next*
	 * move: identity (append-only, pre-fix) or the canonical replay (T003).
	 */
	function applyMoves(resync: (persistedWrites: readonly Choice[]) => Choice[]) {
		let clientLog: Choice[] = [...prior];
		let persistedWrites: Choice[] = [...prior];
		for (const m of moveSequence) {
			const choice = m.dir === 'up' ? moveUp(clientLog, m.gameId) : moveDown(clientLog, m.gameId);
			if (!choice) throw new Error('fixture move was a no-op — recipe invalid');
			persistedWrites = [...persistedWrites, choice];
			clientLog = resync(persistedWrites);
		}
		return { clientLog, persistedWrites };
	}

	it('an append-only client log diverges from the server-replayed reload order', () => {
		// Current (pre-fix) behavior: the client just appends each move's
		// synthetic choice to its own log and never resyncs.
		let writeCount = 0;
		const { clientLog, persistedWrites } = applyMoves((writes) => {
			writeCount++;
			return writes.slice(0, prior.length + writeCount); // == append-only: writes so far, in write order
		});
		const liveOrder = rankGames(gameIds, ratingsFromComparisons(clientLog));
		const reloadOrder = rankGames(gameIds, ratingsFromComparisons(persistedReplay(persistedWrites)));

		expect(liveOrder).not.toEqual(reloadOrder);
		// The moved game itself lands somewhere other than where the reload puts it.
		expect(liveOrder.indexOf(Juliet)).not.toBe(reloadOrder.indexOf(Juliet));
	});

	it('T003 fix: resyncing the client to the canonical replayed log after every move keeps the displayed order equal to the reload order', () => {
		// Post-fix behavior: T002 has the compare endpoint return the
		// canonical replayed log; T003 rebuilds the client session from it
		// after every move instead of trusting the append-only log.
		const { clientLog, persistedWrites } = applyMoves((writes) => persistedReplay(writes));

		const displayedOrder = rankGames(gameIds, ratingsFromComparisons(clientLog));
		const reloadOrder = rankGames(gameIds, ratingsFromComparisons(persistedReplay(persistedWrites)));
		expect(displayedOrder).toEqual(reloadOrder);
	});
});
