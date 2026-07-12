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

<main class="flex flex-col gap-6">
	{#if data.user}
		<h1 class="text-2xl font-bold">Your collections</h1>

		<form class="card bg-base-200 shadow-sm" onsubmit={startImport}>
			<div class="card-body gap-3">
				<label class="label" for="bgg-username">
					<span class="label-text">BoardGameGeek username</span>
				</label>
				<div class="flex flex-col gap-2 sm:flex-row">
					<input
						id="bgg-username"
						class="input input-bordered w-full"
						bind:value={username}
						autocomplete="off"
						required
					/>
					<button type="submit" class="btn btn-primary" disabled={submitting || !username}>
						{submitting ? 'Importing…' : 'Import collection'}
					</button>
				</div>
				{#if error}<p role="alert" class="alert alert-error text-sm">{error}</p>{/if}
			</div>
		</form>

		<ul class="flex flex-col gap-2" aria-live="polite">
			{#each collections as collection (collection.id)}
				{@const view = describeImport(collection)}
				<li class="card bg-base-200 shadow-sm" data-status={view.state}>
					<div class="card-body flex-row items-center justify-between gap-3 py-3">
						<div>
							<a
								class="link link-hover font-semibold"
								href={resolve('/collections/[id]', { id: collection.id })}
							>
								{collection.bggUsername}
							</a>
							<p class="text-sm opacity-70">{view.detail}</p>
						</div>
						<span
							class="badge"
							class:badge-success={view.state === 'complete'}
							class:badge-error={view.state === 'failed'}
							class:badge-info={view.state === 'importing'}
						>
							{view.heading}
						</span>
					</div>
				</li>
			{:else}
				<li class="text-sm opacity-70">No collections yet — import one above.</li>
			{/each}
		</ul>
	{:else}
		<div class="hero bg-base-200 rounded-box py-16">
			<div class="hero-content text-center">
				<div class="max-w-md">
					<h1 class="text-4xl font-bold">yet-another-rank-games</h1>
					<p class="py-6">Build ranked lists of games from your BoardGameGeek collection.</p>
					<a class="btn btn-primary" href={resolve('/login')}>Sign in to get started</a>
				</div>
			</div>
		</div>
	{/if}
</main>
