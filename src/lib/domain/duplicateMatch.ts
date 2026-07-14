/**
 * The v1 fuzzy-title-match heuristic for collection resync (T007,
 * datamodel.md `CollectionItemDuplicate`). Deliberately simple/placeholder —
 * the `[OPEN]` in datamodel.md leaves tuning the real similarity threshold to
 * later usage. Case-insensitive exact match, plus a basic Levenshtein
 * edit-distance threshold scaled to title length, is sufficient for v1.
 */

function normalize(title: string): string {
	return title.trim().toLowerCase().replace(/\s+/g, ' ');
}

/** Classic Levenshtein edit distance between two strings. */
function editDistance(a: string, b: string): number {
	const dp: number[][] = Array.from({ length: a.length + 1 }, () => new Array(b.length + 1).fill(0));
	for (let i = 0; i <= a.length; i++) dp[i][0] = i;
	for (let j = 0; j <= b.length; j++) dp[0][j] = j;
	for (let i = 1; i <= a.length; i++) {
		for (let j = 1; j <= b.length; j++) {
			dp[i][j] =
				a[i - 1] === b[j - 1]
					? dp[i - 1][j - 1]
					: 1 + Math.min(dp[i - 1][j - 1], dp[i - 1][j], dp[i][j - 1]);
		}
	}
	return dp[a.length][b.length];
}

/**
 * True when two titles are close enough to flag as a possible duplicate:
 * exact match once case/whitespace-normalized, or an edit distance within a
 * small threshold that scales with the shorter title's length (so a one- or
 * two-character difference on a long title still counts, but short titles
 * need to be near-exact).
 */
export function titlesMatch(a: string, b: string): boolean {
	const na = normalize(a);
	const nb = normalize(b);
	if (na === nb) return true;
	const threshold = Math.max(1, Math.floor(Math.min(na.length, nb.length) / 8));
	return editDistance(na, nb) <= threshold;
}

/** A candidate pulled game to compare a `local_add` item's title against. */
export interface DuplicateCandidate {
	gameId: number;
	title: string;
}

/**
 * For one `local_add` item's title, find the first pulled candidate (not
 * already its own game) whose title fuzzy-matches — or `undefined` if none
 * does.
 */
export function findFuzzyDuplicate(
	itemTitle: string,
	itemGameId: number,
	candidates: readonly DuplicateCandidate[]
): DuplicateCandidate | undefined {
	return candidates.find((c) => c.gameId !== itemGameId && titlesMatch(itemTitle, c.title));
}
