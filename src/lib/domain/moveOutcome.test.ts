import { describe, it, expect } from 'vitest';
import { isSurprisingMoveOutcome } from './moveOutcome';

// T009 (feedback F001): the surprising-result predicate that decides whether
// a move-up/move-down toast should show. "Surprising" = the moved game did
// NOT land exactly one position in the move's direction.
describe('isSurprisingMoveOutcome', () => {
	it('is not surprising when a move-up lands the game exactly one spot up', () => {
		expect(isSurprisingMoveOutcome({ rankBefore: 3, direction: 'up', rankAfter: 2 })).toBe(false);
	});

	it('is not surprising when a move-down lands the game exactly one spot down', () => {
		expect(isSurprisingMoveOutcome({ rankBefore: 2, direction: 'down', rankAfter: 3 })).toBe(false);
	});

	it('is surprising when the game held its rank (move-up)', () => {
		expect(isSurprisingMoveOutcome({ rankBefore: 3, direction: 'up', rankAfter: 3 })).toBe(true);
	});

	it('is surprising when the game held its rank (move-down)', () => {
		expect(isSurprisingMoveOutcome({ rankBefore: 2, direction: 'down', rankAfter: 2 })).toBe(true);
	});

	it('is surprising when a move-up overshoots by more than one spot', () => {
		expect(isSurprisingMoveOutcome({ rankBefore: 5, direction: 'up', rankAfter: 1 })).toBe(true);
	});

	it('is surprising when a move-down undershoots (goes the wrong way)', () => {
		expect(isSurprisingMoveOutcome({ rankBefore: 2, direction: 'down', rankAfter: 1 })).toBe(true);
	});
});
