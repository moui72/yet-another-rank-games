<script lang="ts">
	import { PairwiseSession } from '$lib/pairwiseSession.svelte';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	// Recreate when the loaded list changes (SvelteKit reuses this component
	// across /lists/[id] navigations); the session owns its own state after.
	const session = $derived(
		new PairwiseSession(
			data.games.map((g) => g.id),
			data.log
		)
	);
	const names = $derived(new Map(data.games.map((g) => [g.id, g.name])));
	const nameOf = (id: number) => names.get(id) ?? `#${id}`;
	const compareUrl = $derived(`/api/lists/${data.list.id}/compare`);
	const undoUrl = $derived(`/api/lists/${data.list.id}/undo`);
	const dropUrl = $derived(`/api/lists/${data.list.id}/drop`);

	// Persist choices in order (a serial chain) so the optimistic UI stays
	// instant/responsive while the server never sees out-of-order recomputes.
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

<svelte:head><title>{data.list.name} · ranking · yet-another-rank-games</title></svelte:head>
<svelte:window onkeydown={onKeydown} />

<main>
	<h1>{data.list.name}</h1>

	{#if session.currentPair}
		{@const pair = session.currentPair}
		<section aria-labelledby="matchup-heading">
			<h2 id="matchup-heading">Which is better?</h2>
			<p>Choose with the buttons, or press <kbd>1</kbd>/<kbd>2</kbd> (or ←/→). <kbd>U</kbd> to undo.</p>
			<div>
				<button type="button" onclick={() => pick(pair[0])}>{nameOf(pair[0])}</button>
				<button type="button" onclick={() => pick(pair[1])}>{nameOf(pair[1])}</button>
			</div>
			<button type="button" onclick={undo} disabled={session.log.length === 0}>Undo</button>
		</section>

		<p role="status" aria-live="polite">
			{session.progress.seen} of {session.progress.total} matchups judged.
		</p>
	{:else}
		<p>Add at least two games to this list's pool to start ranking.</p>
	{/if}

	<section aria-labelledby="ranking-heading">
		<h2 id="ranking-heading">Current ranking</h2>
		<ol>
			{#each session.order as gameId (gameId)}
				<li>
					{nameOf(gameId)}
					<button type="button" onclick={() => dropGame(gameId)} aria-label="Drop {nameOf(gameId)} from this list">
						Drop
					</button>
				</li>
			{/each}
		</ol>
	</section>
</main>
