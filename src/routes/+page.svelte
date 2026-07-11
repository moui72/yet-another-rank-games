<script lang="ts">
	import { resolve } from '$app/paths';
	import type { PageData } from './$types';
	import type { Collection } from '$lib/types/entities';
	import { describeImport } from '$lib/domain/importView';

	let { data }: { data: PageData } = $props();

	// Displayed list is the latest poll result, falling back to the SSR-loaded data.
	let polled = $state<Collection[] | null>(null);
	let collections = $derived(polled ?? data.collections);
	let username = $state('');
	let error = $state('');
	let submitting = $state(false);
	let polling: ReturnType<typeof setInterval> | undefined;

	async function refresh() {
		const res = await fetch('/api/collections');
		if (res.ok) {
			const next: Collection[] = (await res.json()).collections;
			polled = next;
			if (!next.some((c) => c.importStatus === 'importing') && polling) {
				clearInterval(polling);
				polling = undefined;
			}
		}
	}

	async function startImport(event: SubmitEvent) {
		event.preventDefault();
		error = '';
		submitting = true;
		const res = await fetch('/api/import', {
			method: 'POST',
			headers: { 'content-type': 'application/json' },
			body: JSON.stringify({ username })
		});
		submitting = false;
		if (!res.ok) {
			error = `Import request failed (${res.status})`;
			return;
		}
		await refresh();
		polling ??= setInterval(refresh, 1500);
	}
</script>

<svelte:head>
	<title>yet-another-rank-games</title>
</svelte:head>

<main>
	{#if data.user}
		<h1>Your collections</h1>

		<form onsubmit={startImport}>
			<label for="bgg-username">BoardGameGeek username</label>
			<input id="bgg-username" bind:value={username} autocomplete="off" required />
			<button type="submit" disabled={submitting || !username}>Import collection</button>
			{#if error}<p role="alert" class="error">{error}</p>{/if}
		</form>

		<ul aria-live="polite">
			{#each collections as collection (collection.id)}
				{@const view = describeImport(collection)}
				<li data-status={view.state}>
					<a href={resolve('/collections/[id]', { id: collection.id })}>
						<strong>{collection.bggUsername}</strong>
					</a>
					— {view.heading}
					<span>{view.detail}</span>
				</li>
			{:else}
				<li>No collections yet — import one above.</li>
			{/each}
		</ul>
	{:else}
		<h1>yet-another-rank-games</h1>
		<p>Build ranked lists of games from your BoardGameGeek collection.</p>
		<p><a href={resolve('/login')}>Sign in</a> to import your collection.</p>
	{/if}
</main>
