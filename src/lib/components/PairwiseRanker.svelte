<script lang="ts">
	import { PairwiseSession } from '$lib/pairwiseSession.svelte';
	import { spineColor } from '$lib/spine';
	import { resolveCoverArt } from '$lib/domain/coverArt';
	import type { Choice } from '$lib/domain/ranking';

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
			excludedFromRanking: boolean;
			imageUrl?: string | null;
			thumbnailUrl?: string | null;
		}[];
		log: Choice[];
		showCoverArt?: boolean;
	} = $props();

	const initialExcluded = $derived(games.filter((g) => g.excludedFromRanking).map((g) => g.id));
	const session = $derived(
		new PairwiseSession(games.map((g) => g.id), log, new Set(initialExcluded))
	);
	const names = $derived(new Map(games.map((g) => [g.id, g.name])));
	const nameOf = (id: number) => names.get(id) ?? `#${id}`;
	const gamesById = $derived(new Map(games.map((g) => [g.id, g])));
	const coverOf = (id: number) => {
		const g = gamesById.get(id);
		if (!g) return null;
		return resolveCoverArt({ imageUrl: g.imageUrl ?? null, thumbnailUrl: g.thumbnailUrl ?? null }, showCoverArt);
	};
	const compareUrl = $derived(`/api/lists/${listId}/compare`);
	const undoUrl = $derived(`/api/lists/${listId}/undo`);
	const dropUrl = $derived(`/api/lists/${listId}/drop`);
	const excludeUrl = $derived(`/api/lists/${listId}/exclude`);

	let unrankedOpen = $state(false);

	// Serialize persistence so the optimistic UI stays instant and the server
	// never sees out-of-order recomputes.
	let persistChain: Promise<unknown> = Promise.resolve();
	function persist(run: () => Promise<unknown>) {
		persistChain = persistChain.then(run).catch(() => {});
	}

	function pick(winnerId: number) {
		const pair = session.currentPair;
		if (!pair) return;
		const loserId = pair[0] === winnerId ? pair[1] : pair[0];
		const url = compareUrl;
		session.choose(winnerId, loserId);
		persist(() =>
			fetch(url, {
				method: 'POST',
				headers: { 'content-type': 'application/json' },
				body: JSON.stringify({ gameA: pair[0], gameB: pair[1], winnerId })
			})
		);
	}

	function undo() {
		if (session.log.length === 0) return;
		const url = undoUrl;
		session.undo();
		persist(() => fetch(url, { method: 'POST' }));
	}

	/** T014: pull a ranked game out of the active ranking (moves to Unranked). */
	function excludeGame(gameId: number) {
		const url = excludeUrl;
		session.setExcluded(gameId, true);
		persist(() =>
			fetch(url, {
				method: 'POST',
				headers: { 'content-type': 'application/json' },
				body: JSON.stringify({ gameId, excluded: true })
			})
		);
	}

	/** Restore a manually-excluded game back to the active ranking. */
	function restoreGame(gameId: number) {
		const url = excludeUrl;
		session.setExcluded(gameId, false);
		persist(() =>
			fetch(url, {
				method: 'POST',
				headers: { 'content-type': 'application/json' },
				body: JSON.stringify({ gameId, excluded: false })
			})
		);
	}

	/** T015: hard-delete a game from the pool entirely (only from Unranked). */
	function dropGame(gameId: number) {
		const url = dropUrl;
		session.gameIds = session.gameIds.filter((id) => id !== gameId);
		persist(() =>
			fetch(url, {
				method: 'POST',
				headers: { 'content-type': 'application/json' },
				body: JSON.stringify({ gameId })
			})
		);
	}

	function onKeydown(event: KeyboardEvent) {
		const pair = session.currentPair;
		if (!pair) return;
		if (event.key === '1' || event.key === 'ArrowLeft') pick(pair[0]);
		else if (event.key === '2' || event.key === 'ArrowRight') pick(pair[1]);
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
		<div class="grid grid-cols-1 gap-3 sm:grid-cols-2">
			{#each [pair[0], pair[1]] as gameId, i (gameId)}
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
			<button type="button" class="btn btn-ghost btn-sm" onclick={undo} disabled={session.log.length === 0}>
				Undo
			</button>
			<span role="status" aria-live="polite" class="text-sm opacity-70">
				{session.progress.seen} of {session.progress.total} matchups judged
			</span>
		</div>
		<progress class="progress progress-primary w-full" value={session.progress.seen} max={session.progress.total}></progress>
	</section>
{:else}
	<p class="alert">Add at least two games to this list's pool to start ranking.</p>
{/if}

<section class="card bg-base-200 border-base-300 border" aria-labelledby="ranking-heading">
	<div class="card-body gap-3">
		<h2 id="ranking-heading" class="card-title text-lg">Ranked</h2>
		<ol id="ranked-list" class="flex flex-col gap-1.5">
			{#each session.ranked as gameId, i (gameId)}
				<li class="flex items-center gap-2">
					<span class="spine grow" style="background:{spineColor(i)}">
						<span class="spine-rank">{String(i + 1).padStart(2, '0')}</span>
						<span class="truncate">{nameOf(gameId)}</span>
					</span>
					<button
						type="button"
						class="btn btn-ghost btn-sm btn-square"
						onclick={() => excludeGame(gameId)}
						aria-label="Exclude {nameOf(gameId)} from ranking"
						title="Exclude {nameOf(gameId)} from ranking"
					>
						✕
					</button>
				</li>
			{:else}
				<li class="text-sm opacity-70">No games ranked yet.</li>
			{/each}
		</ol>
	</div>
</section>

<section class="card bg-base-200 border-base-300 border" aria-labelledby="unranked-heading">
	<div class="card-body gap-3">
		<button
			type="button"
			class="flex items-center justify-between gap-2 text-left"
			aria-expanded={unrankedOpen}
			aria-controls="unranked-list"
			onclick={() => (unrankedOpen = !unrankedOpen)}
		>
			<h2 id="unranked-heading" class="card-title text-lg">Unranked ({session.unranked.length})</h2>
			<span aria-hidden="true">{unrankedOpen ? '▾' : '▸'}</span>
		</button>
		{#if unrankedOpen}
			<ol id="unranked-list" class="flex flex-col gap-1.5">
				{#each session.unranked as gameId (gameId)}
					<li class="flex items-center justify-between gap-2 rounded-box bg-base-100 px-3 py-2">
						<span class="truncate">{nameOf(gameId)}</span>
						<span class="flex gap-1">
							{#if session.excludedIds.has(gameId)}
								<button
									type="button"
									class="btn btn-outline btn-xs"
									onclick={() => restoreGame(gameId)}
									aria-label="Restore {nameOf(gameId)} to ranking"
								>
									Restore
								</button>
							{/if}
							<button
								type="button"
								class="btn btn-error btn-outline btn-xs"
								onclick={() => dropGame(gameId)}
								aria-label="Delete {nameOf(gameId)} from this list"
								title="Delete {nameOf(gameId)} from this list's pool entirely"
							>
								🗑 Delete
							</button>
						</span>
					</li>
				{:else}
					<li class="text-sm opacity-70">Nothing unranked.</li>
				{/each}
			</ol>
		{/if}
	</div>
</section>
