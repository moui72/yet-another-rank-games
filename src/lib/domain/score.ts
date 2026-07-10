/**
 * Conservative ranking score for a rated game.
 *
 * Ratings from the pairwise engine (see `ui.md` / the ranking research) are a
 * mean skill estimate `mu` plus an uncertainty `sigma`. Ordering by
 * `mu - k*sigma` penalises games we're unsure about, so a game only ranks high
 * once it has both a high mean and enough comparisons to be confident.
 *
 * @param mu Mean skill estimate.
 * @param sigma Standard deviation of the estimate (uncertainty); >= 0.
 * @param k Uncertainty weight (how many sigmas to subtract). Defaults to 3.
 */
export function conservativeScore(mu: number, sigma: number, k = 3): number {
	return mu - k * sigma;
}
