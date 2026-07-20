<script lang="ts">
	import { dndzone, type DndEvent } from 'svelte-dnd-action';
	import { flip } from 'svelte/animate';
	import { EfficientSession } from '$lib/efficientSession.svelte';
	import { spineColor } from '$lib/spine';
	import { resolveCoverArt } from '$lib/domain/coverArt';
	import type { Judgment } from '$lib/domain/constraintOrder';
	import type { EdgeIntent } from '$lib/domain/overrideEdges';

	let {
		listId,
		games,
		log,
		showCoverArt = true
	}: {
		listId: string;
		games: {
			id: number;
			name: string;
			userRating?: number | null;
			imageUrl?: string | null;
			thumbnailUrl?: string | null;
		}[];
		log: Judgment[];
		showCoverArt?: boolean;
	} = $props();

	const userRatings = $derived(new Map(games.map((g) => [g.id, g.userRating ?? null])));
	const session = $derived(
		new EfficientSession(games.map((g) => g.id), log, userRatings)
	);
	const names = $derived(new Map(games.map((g) => [g.id, g.name])));
	const nameOf = (id: number) => names.get(id) ?? `#${id}`;
	const gamesById = $derived(new Map(games.map((g) => [g.id, g])));
	const coverOf = (id: number) => {
		const g = gamesById.get(id);
		if (!g) return null;
		return resolveCoverArt(
			{ imageUrl: g.imageUrl ?? null, thumbnailUrl: g.thumbnailUrl ?? null },
			showCoverArt
		);
	};

	const compareUrl = $derived(`/api/lists/${listId}/compare`);
	const undoUrl = $derived(`/api/lists/${listId}/undo`);
	const overrideUrl = $derived(`/api/lists/${listId}/override`);

	// The ranked list is always visible and always reorderable (T018). A
	// writable $derived mirrors the derived order (as {id} rows for
	// svelte-dnd-action): drag `consider`/`finalize` assign to it for live
	// animation, and it re-syncs automatically whenever the order changes
	// (choices, undo, overrides).
	let items = $derived(session.order.map((id) => ({ id })));
	const flipMs = 150;

	// Serialise persistence so the optimistic UI stays instant and the server
	// never sees out-of-order recomputes.
	let persistChain: Promise<unknown> = Promise.resolve();
	function persist(run: () => Promise<unknown>) {
		persistChain = persistChain.then(run).catch(() => {});
	}

	function pick(winnerId: number) {
		const pair = session.currentPair;
		if (!pair) return;
		const loserId = pair.a === winnerId ? pair.b : pair.a;
		const url = compareUrl;
		session.choose(winnerId, loserId);
		persist(() =>
			fetch(url, {
				method: 'POST',
				headers: { 'content-type': 'application/json' },
				body: JSON.stringify({ gameA: pair.a, gameB: pair.b, winnerId })
			})
		);
	}

	function undo() {
		if (session.log.length === 0) return;
		const url = undoUrl;
		session.undo();
		persist(() => fetch(url, { method: 'POST' }));
	}

	function persistOverride(intents: EdgeIntent[]) {
		if (intents.length === 0) return;
		const url = overrideUrl;
		persist(() =>
			fetch(url, {
				method: 'POST',
				headers: { 'content-type': 'application/json' },
				body: JSON.stringify({ edges: intents })
			})
		);
	}

	/** Per-row move up/down (k=1 override) — routed through the batched write. */
	function moveUp(gameId: number) {
		persistOverride(session.moveUp(gameId));
	}
	function moveDown(gameId: number) {
		persistOverride(session.moveDown(gameId));
	}

	/** Per-row "move to position N" (1-based) — keyboard parity for long moves. */
	function moveToPosition(gameId: number, position1: number) {
		if (!Number.isFinite(position1)) return;
		const target = Math.max(0, Math.min(Math.round(position1) - 1, session.order.length - 1));
		persistOverride(session.moveTo(gameId, target));
	}

	function onMoveToInput(event: Event, gameId: number) {
		const input = event.currentTarget as HTMLInputElement;
		const value = Number(input.value);
		if (input.value.trim() !== '') moveToPosition(gameId, value);
	}

	function consider(e: CustomEvent<DndEvent<{ id: number }>>) {
		items = e.detail.items;
	}

	/**
	 * On drop, find the single game whose position changed and express it as a
	 * move-to-index override (T010 mapping via the session), then persist the
	 * resulting edges. The derived order re-syncs `items` through the effect.
	 */
	function finalize(e: CustomEvent<DndEvent<{ id: number }>>) {
		items = e.detail.items;
		const next = e.detail.items.map((x) => x.id);
		const moved = findMovedGame(session.order, next);
		if (moved === null) return;
		persistOverride(session.moveTo(moved, next.indexOf(moved)));
	}

	/** The one game that moved between two single-drag orderings, or null. */
	function findMovedGame(prev: number[], next: number[]): number | null {
		for (const c of next) {
			const p = prev.filter((x) => x !== c);
			const n = next.filter((x) => x !== c);
			if (p.length === n.length && p.every((v, i) => v === n[i]) && prev.indexOf(c) !== next.indexOf(c)) {
				return c;
			}
		}
		return null;
	}

	function onKeydown(event: KeyboardEvent) {
		const pair = session.currentPair;
		if (!pair) return;
		if (event.key === '1' || event.key === 'ArrowLeft') pick(pair.a);
		else if (event.key === '2' || event.key === 'ArrowRight') pick(pair.b);
		else if (event.key.toLowerCase() === 'u') undo();
	}
</script>

<svelte:window onkeydown={onKeydown} />

{#if session.currentPair}
	{@const pair = session.currentPair}
	<section class="flex flex-col gap-4" aria-labelledby="matchup-heading">
		<div class="flex flex-wrap items-baseline justify-between gap-2">
			<h2 id="matchup-heading" class="text-lg font-semibold">Which is better?</h2>
			<p class="text-xs opacity-60">
				Press <kbd class="kbd kbd-xs">1</kbd>/<kbd class="kbd kbd-xs">2</kbd> (or ←/→),
				<kbd class="kbd kbd-xs">U</kbd> to undo
			</p>
		</div>
		{#if session.insertion}
			{@const ins = session.insertion}
			<!--
				T017: the insertion progress is surfaced, not hidden. This mode
				deliberately re-asks about one game as it binary-searches its spot;
				naming that game and counting its questions frames the repetition as
				intended rather than a bug.
			-->
			<div role="status" aria-live="polite" class="flex flex-col gap-1">
				<p class="text-sm">
					Placing <span class="font-semibold">{nameOf(ins.placingGameId)}</span> — question
					{ins.questionNumber} of about {ins.questionsForGame}
				</p>
				<p class="text-xs opacity-70">{ins.placedCount} of {ins.total} games placed</p>
				<progress
					class="progress progress-primary w-full"
					value={ins.placedCount}
					max={ins.total}
				></progress>
			</div>
		{/if}
		<div class="grid grid-cols-1 gap-3 sm:grid-cols-2">
			{#each [pair.a, pair.b] as gameId, i (gameId)}
				{@const cover = coverOf(gameId)}
				<button
					type="button"
					class="group bg-base-100 border-base-300 hover:border-primary hover:bg-primary/5 focus-visible:border-primary flex min-h-28 items-center gap-3 rounded-box border-2 p-4 text-left transition-colors"
					onclick={() => pick(gameId)}
					aria-label={nameOf(gameId)}
				>
					<span
						class="kbd kbd-sm font-mono opacity-70 transition-colors group-hover:opacity-100"
						aria-hidden="true">{i + 1}</span
					>
					{#if cover}
						<img src={cover} alt={nameOf(gameId)} class="h-16 w-16 rounded-box object-cover" />
					{/if}
					<span class="font-display text-xl font-bold">{nameOf(gameId)}</span>
				</button>
			{/each}
		</div>
		<div class="flex items-center justify-between gap-3">
			<button
				type="button"
				class="btn btn-ghost btn-sm"
				onclick={undo}
				disabled={session.log.length === 0}
			>
				Undo
			</button>
		</div>
	</section>
{:else}
	<p class="alert" role="status">Every game is placed — your ranking is complete.</p>
{/if}

<section class="card bg-base-200 border-base-300 border" aria-labelledby="ranking-heading">
	<div class="card-body gap-3">
		<h2 id="ranking-heading" class="card-title text-lg">Ranked</h2>
		<p class="text-sm opacity-70">
			Drag a game to reorder it — or focus one and use the keyboard (Space to lift, arrows to move,
			Space to drop). You can also nudge with the arrows, or type an exact position. Any change is
			honoured exactly.
		</p>
		{#if items.length}
			<ul
				id="ranked-list"
				class="flex flex-col gap-1.5"
				use:dndzone={{ items, flipDurationMs: flipMs }}
				onconsider={consider}
				onfinalize={finalize}
			>
				{#each items as { id: gameId }, i (gameId)}
					<li animate:flip={{ duration: flipMs }} class="flex items-center gap-2">
						<span
							class="spine grow cursor-grab active:cursor-grabbing"
							style="background:{spineColor(i)}"
						>
							<span class="spine-rank">{String(i + 1).padStart(2, '0')}</span>
							<span class="truncate">{nameOf(gameId)}</span>
							<span class="ml-auto opacity-70" aria-hidden="true">⠿</span>
						</span>
						<button
							type="button"
							class="btn btn-ghost btn-sm btn-square"
							onclick={() => moveUp(gameId)}
							disabled={i === 0}
							aria-label="Move {nameOf(gameId)} up"
							title="Move {nameOf(gameId)} up"
						>
							▲
						</button>
						<button
							type="button"
							class="btn btn-ghost btn-sm btn-square"
							onclick={() => moveDown(gameId)}
							disabled={i === items.length - 1}
							aria-label="Move {nameOf(gameId)} down"
							title="Move {nameOf(gameId)} down"
						>
							▼
						</button>
						<label class="sr-only" for="pos-{gameId}">Position for {nameOf(gameId)}</label>
						<input
							id="pos-{gameId}"
							type="number"
							min="1"
							max={items.length}
							class="input input-bordered input-sm w-16"
							value={i + 1}
							aria-label="Move {nameOf(gameId)} to position"
							title="Move {nameOf(gameId)} to a position"
							onchange={(e) => onMoveToInput(e, gameId)}
						/>
					</li>
				{/each}
			</ul>
		{:else}
			<p class="text-sm opacity-70">No games to rank yet.</p>
		{/if}
	</div>
</section>
