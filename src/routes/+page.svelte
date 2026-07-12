<script lang="ts">
	import { resolve } from '$app/paths';
	import type { PageData } from './$types';
	import type { Collection } from '$lib/types/entities';
	import { describeImport } from '$lib/domain/importView';
	import Logo from '$lib/components/Logo.svelte';
	import { spineColor } from '$lib/spine';

	// Decorative demo stack for the hero — shows the payoff (a ranked shelf).
	const demoStack = [
		'Brass: Birmingham',
		'Gaia Project',
		'Terraforming Mars',
		'Ark Nova',
		'Concordia',
		'Barrage'
	];

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
		<h1 class="text-3xl font-extrabold">Your collections</h1>

		<form class="card bg-base-200 border-base-300 border" onsubmit={startImport}>
			<div class="card-body gap-3">
				<label class="label" for="bgg-username">
					<span class="label-text font-medium">BoardGameGeek username</span>
				</label>
				<div class="flex flex-col gap-2 sm:flex-row">
					<input
						id="bgg-username"
						class="input input-bordered w-full"
						placeholder="e.g. rahdo"
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
				<li class="card bg-base-200 border-base-300 border" data-status={view.state}>
					<div class="card-body flex-row items-center justify-between gap-3 py-3">
						<div>
							<a
								class="link link-hover text-lg font-semibold"
								href={resolve('/collections/[id]', { id: collection.id })}
							>
								{collection.bggUsername}
							</a>
							<p class="text-sm opacity-70">{view.detail}</p>
						</div>
						<span
							class="badge badge-lg"
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
		<!-- Break out of the narrow reading column so the hero has room to breathe. -->
		<section
			class="relative left-1/2 grid w-screen max-w-5xl -translate-x-1/2 items-center gap-10 px-4 py-8 sm:px-6 sm:py-14 md:grid-cols-2"
		>
			<div class="flex flex-col items-start gap-5">
				<span class="font-mono text-xs tracking-wide uppercase opacity-60">yet another rank games</span>
				<h1 class="text-4xl leading-[1.03] font-extrabold text-balance sm:text-5xl lg:text-6xl">
					Settle your shelf, two&nbsp;at&nbsp;a&nbsp;time.
				</h1>
				<p class="text-base-content/75 max-w-md text-lg">
					Import your BoardGameGeek collection, then rank it the fun way — quick head-to-head
					duels that add up to lists worth sharing.
				</p>
				<a class="btn btn-primary btn-lg" href={resolve('/login')}>Sign in to get started</a>
			</div>

			<!-- The payoff: a finished ranking, shown as a stack of game-box spines. -->
			<div
				class="bg-base-200 border-base-300 rounded-box border p-5 sm:p-6"
				aria-hidden="true"
			>
				<div class="mb-3 flex items-center justify-between">
					<span class="font-display text-sm font-bold">Heavy Euros · your top 6</span>
					<Logo variant="mark" size={28} />
				</div>
				<div class="flex flex-col gap-1.5">
					{#each demoStack as name, i (name)}
						<div class="spine" style="background:{spineColor(i)};width:{100 - i * 5}%">
							<span class="spine-rank">{String(i + 1).padStart(2, '0')}</span>
							<span class="truncate">{name}</span>
						</div>
					{/each}
				</div>
			</div>
		</section>
	{/if}
</main>
