<script lang="ts">
	import { PairwiseSession } from '$lib/pairwiseSession.svelte';
	import { spineColor } from '$lib/spine';
	import type { Choice } from '$lib/domain/ranking';

	let { listId, games, log }: { listId: string; games: { id: number; name: string }[]; log: Choice[] } =
		$props();

	const session = $derived(new PairwiseSession(games.map((g) => g.id), log));
	const names = $derived(new Map(games.map((g) => [g.id, g.name])));
	const nameOf = (id: number) => names.get(id) ?? `#${id}`;
	const compareUrl = $derived(`/api/lists/${listId}/compare`);
	const undoUrl = $derived(`/api/lists/${listId}/undo`);
	const dropUrl = $derived(`/api/lists/${listId}/drop`);

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
		<h2 id="ranking-heading" class="card-title text-lg">Current ranking</h2>
		<ol class="flex flex-col gap-1.5">
			{#each session.order as gameId, i (gameId)}
				<li class="flex items-center gap-2">
					<span class="spine grow" style="background:{spineColor(i)}">
						<span class="spine-rank">{String(i + 1).padStart(2, '0')}</span>
						<span class="truncate">{nameOf(gameId)}</span>
					</span>
					<button
						type="button"
						class="btn btn-ghost btn-sm btn-square"
						onclick={() => dropGame(gameId)}
						aria-label="Drop {nameOf(gameId)} from this list"
						title="Drop {nameOf(gameId)}"
					>
						✕
					</button>
				</li>
			{/each}
		</ol>
	</div>
</section>
