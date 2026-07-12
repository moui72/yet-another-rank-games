/**
 * Presentation palette for the "spine stack" ranking motif — a ranking drawn
 * as a stack of colored game-box spines. Every colour is the AA-safe depth of
 * a box-spine hue, so white spine text passes WCAG 2.1 AA (Principle VI). The
 * ultra-bright versions live only in the logo, where no body text sits on them.
 */
const SPINE_COLORS = [
	'#b91c1c', // red — white text 5.9:1
	'#9a3412', // burnt orange — 7.0:1
	'#a21caf', // magenta — 5.4:1
	'#6d28d9', // violet — 5.9:1
	'#1d4ed8', // blue — 5.7:1
	'#0f766e', // teal — 4.9:1
	'#15803d' // green — 4.6:1
];

/** Cycle the spine palette by position so adjacent ranks read as distinct boxes. */
export function spineColor(index: number): string {
	return SPINE_COLORS[((index % SPINE_COLORS.length) + SPINE_COLORS.length) % SPINE_COLORS.length];
}
