/**
 * The surprising-result predicate (feedback F001, `ui.md`): a manual
 * move-up/move-down nudge is advisory — it's recorded as one more comparison
 * and the whole order is recomputed, so it can visibly fail to move the game
 * one spot ("hold", or shift by a different amount). This decides whether
 * that outcome is surprising enough to explain with a toast: it is,
 * whenever the moved game did NOT land exactly one position in the move's
 * direction. An expected one-step move needs no explanation.
 */
export function isSurprisingMoveOutcome(input: {
	rankBefore: number;
	direction: 'up' | 'down';
	rankAfter: number;
}): boolean {
	const expected = input.direction === 'up' ? input.rankBefore - 1 : input.rankBefore + 1;
	return input.rankAfter !== expected;
}
