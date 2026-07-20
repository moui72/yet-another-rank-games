import type { ListFilter } from '$lib/types/entities';

/** Raw string inputs from the list-creation form. */
export interface ListFilterInput {
	mechanicsInclude?: string;
	weightMin?: string;
	weightMax?: string;
	playerCount?: string;
	playingTimeMax?: string;
	ownedOnly?: boolean;
	expansions?: string;
}

function num(v?: string): number | undefined {
	if (v == null || v.trim() === '') return undefined;
	return Number(v);
}

function tags(v?: string): string[] {
	return (v ?? '')
		.split(',')
		.map((s) => s.trim())
		.filter(Boolean);
}

/**
 * Build a `ListFilter` from raw form inputs, omitting blank fields. This is
 * lenient — it may produce e.g. `NaN` for a non-numeric field; the schema
 * validator (`parseListFilter`) is the gate that rejects malformed filters.
 */
export function buildListFilter(input: ListFilterInput): ListFilter {
	const filter: ListFilter = {};

	const include = tags(input.mechanicsInclude);
	if (include.length > 0) filter.mechanics = { include, exclude: [] };

	const weightMin = num(input.weightMin);
	const weightMax = num(input.weightMax);
	if (weightMin !== undefined || weightMax !== undefined) {
		filter.weight = {
			...(weightMin !== undefined ? { min: weightMin } : {}),
			...(weightMax !== undefined ? { max: weightMax } : {})
		};
	}

	const playerCount = num(input.playerCount);
	if (playerCount !== undefined) filter.playerCount = { supports: playerCount };

	const playingTimeMax = num(input.playingTimeMax);
	if (playingTimeMax !== undefined) filter.playingTime = { max: playingTimeMax };

	if (input.ownedOnly) filter.ownedOnly = true;
	if (input.expansions === 'exclude' || input.expansions === 'only') {
		filter.expansions = input.expansions;
	}

	return filter;
}

/**
 * The ranking modes a *new* list may be created with. `manual` was retired and
 * `tier` is deferred, so neither is creatable — the mode is fixed for the life
 * of the list (datamodel.md).
 */
export const CREATABLE_RANKING_METHODS = ['pairwise', 'efficient'] as const;
export type CreatableRankingMethod = (typeof CREATABLE_RANKING_METHODS)[number];

/**
 * Validate the ranking method chosen in the list-creation form (T015). An
 * absent value defaults to `pairwise` (the form's default selection); any value
 * outside the creatable set — a retired/deferred mode or garbage — is rejected
 * so it can never reach the repository.
 */
export function parseRankingMethod(value: unknown): CreatableRankingMethod {
	if (value == null) return 'pairwise';
	if (typeof value === 'string' && (CREATABLE_RANKING_METHODS as readonly string[]).includes(value)) {
		return value as CreatableRankingMethod;
	}
	throw new Error(`invalid ranking method: ${String(value)}`);
}
