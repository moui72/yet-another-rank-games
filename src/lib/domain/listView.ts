import type { ListStatus, RankingMethod } from '$lib/types/entities';

/** Human label for a list's ranking status. */
export function listStatusLabel(status: ListStatus): string {
	return status === 'complete' ? 'Complete' : 'In progress';
}

/** Human label for a list's ranking method. */
export function rankingMethodLabel(method: RankingMethod): string {
	switch (method) {
		case 'pairwise':
			return 'Pairwise';
		case 'efficient':
			return 'Efficient';
		case 'tier':
			return 'Tiered';
	}
}
