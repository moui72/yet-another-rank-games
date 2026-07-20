/**
 * Override-to-edges mapping for the efficient mode (T010).
 *
 * A manual reorder — drag-and-drop, move up/down, or "move to position N" — is
 * expressed as authoritative constraint edges, not an authored position. Moving
 * a game across k positions produces exactly k edges, one against each game it
 * crosses, in the direction of the move: moving up, the game beats each crossed
 * game; moving down, each crossed game beats it. Move up/down is the k=1 case.
 *
 * Persisted as the newest judgments for their pairs, these edges win the
 * latest-wins rule, so re-deriving lands the game exactly where dropped
 * regardless of how much older evidence they contradict (see T011). Edges are
 * returned as bare `{winnerId, loserId}` intents; the batched write attaches
 * `createdAt`/`id` and canonicalises pair order.
 */
export interface EdgeIntent {
	winnerId: number;
	loserId: number;
}

/**
 * Map moving `gameId` to `targetIndex` within `currentOrder` (index 0 = best)
 * to the k crossed-pair edges. A no-op move returns `[]`. Throws if the game is
 * not present in the order.
 */
export function overrideToEdges(
	currentOrder: readonly number[],
	gameId: number,
	targetIndex: number
): EdgeIntent[] {
	const from = currentOrder.indexOf(gameId);
	if (from === -1) throw new Error(`game ${gameId} is not in the current order`);
	const to = Math.max(0, Math.min(targetIndex, currentOrder.length - 1));
	if (to === from) return [];

	const edges: EdgeIntent[] = [];
	if (to < from) {
		// Moving up: the game now ranks above each game it crossed.
		for (let idx = to; idx < from; idx++) {
			edges.push({ winnerId: gameId, loserId: currentOrder[idx] });
		}
	} else {
		// Moving down: each crossed game now ranks above the game.
		for (let idx = from + 1; idx <= to; idx++) {
			edges.push({ winnerId: currentOrder[idx], loserId: gameId });
		}
	}
	return edges;
}
