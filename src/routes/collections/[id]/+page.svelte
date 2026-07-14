<script lang="ts">
	import { enhance } from '$app/forms';
	import { resolve } from '$app/paths';
	import BggSearchAdd from '$lib/components/BggSearchAdd.svelte';
	import type { PageData, ActionData } from './$types';

	let { data, form }: { data: PageData; form: ActionData } = $props();

	let removedOpen = $state(false);

	function statusLabel(status: string): string {
		return status === 'pending_delete' ? 'pending delete' : status;
	}
</script>

<svelte:head>
	<title>{data.collection.bggUsername}'s collection · yet-another-rank-games</title>
</svelte:head>

<main class="flex flex-col gap-6">
	<h1 class="text-2xl font-bold">{data.collection.bggUsername}'s collection</h1>

	{#if form && 'error' in form && form.error}
		<p role="alert" class="alert alert-error text-sm">{form.error}</p>
	{/if}
	{#if form && 'searchAdded' in form}
		<p role="status" class="alert alert-success text-sm">Added to your collection.</p>
	{/if}
	{#if form && 'resyncQueued' in form && form.resyncQueued}
		<p role="status" class="alert alert-success text-sm">
			Re-pull queued — refresh in a moment to see reconciled results.
		</p>
	{/if}
	{#if form && 'duplicateResolved' in form}
		<p role="status" class="alert alert-success text-sm">
			{form.duplicateResolved ? 'Duplicate resolved.' : 'That duplicate is no longer pending.'}
		</p>
	{/if}

	<div class="stats bg-base-200 shadow-sm">
		<div class="stat">
			<div class="stat-title">Games imported</div>
			<div class="stat-value">{data.gameCount}</div>
		</div>
	</div>

	<section class="card bg-base-200 shadow-sm" aria-labelledby="resync-heading">
		<div class="card-body gap-3">
			<h2 id="resync-heading" class="card-title text-lg">Re-pull from BGG</h2>
			<p class="text-sm opacity-70">
				Refresh this collection from BoardGameGeek. Local edits are reconciled, not overwritten.
			</p>
			<form method="POST" action="?/resync" use:enhance>
				<button type="submit" class="btn btn-primary self-start">Re-pull collection</button>
			</form>
		</div>
	</section>

	{#if data.duplicates.length > 0}
		<section class="card bg-base-200 shadow-sm" aria-labelledby="duplicates-heading">
			<div class="card-body gap-3">
				<h2 id="duplicates-heading" class="card-title text-lg">
					Possible duplicates ({data.duplicates.length})
				</h2>
				<p class="text-sm opacity-70">
					A locally-added game looks like it might be the same as one just pulled from BGG.
				</p>
				<ul class="flex flex-col divide-y divide-base-300">
					{#each data.duplicates as dup (dup.id)}
						<li class="flex items-center justify-between gap-3 py-2">
							<span class="text-sm">
								<span class="font-medium">{dup.itemTitle}</span>
								↔ <span class="font-medium">{dup.candidateTitle}</span>
							</span>
							<span class="flex gap-2">
								<form method="POST" action="?/confirmDuplicate" use:enhance>
									<input type="hidden" name="duplicateId" value={dup.id} />
									<button type="submit" class="btn btn-primary btn-xs">Confirm merge</button>
								</form>
								<form method="POST" action="?/rejectDuplicate" use:enhance>
									<input type="hidden" name="duplicateId" value={dup.id} />
									<button type="submit" class="btn btn-ghost btn-xs">Reject, keep distinct</button>
								</form>
							</span>
						</li>
					{/each}
				</ul>
			</div>
		</section>
	{/if}

	<section class="card bg-base-200 shadow-sm" aria-labelledby="games-heading">
		<div class="card-body gap-3">
			<h2 id="games-heading" class="card-title text-lg">Games ({data.activeItems.length})</h2>
			<ul class="flex flex-col divide-y divide-base-300">
				{#each data.activeItems as item (item.id)}
					<li class="flex items-center justify-between gap-3 py-2">
						<span class="font-medium">{item.name}</span>
						<form method="POST" action="?/removeItem" use:enhance>
							<input type="hidden" name="itemId" value={item.id} />
							<button type="submit" class="btn btn-ghost btn-xs" aria-label="Remove {item.name}">
								Remove
							</button>
						</form>
					</li>
				{:else}
					<li class="py-2 text-sm opacity-70">No games yet — add some below.</li>
				{/each}
			</ul>
		</div>
	</section>

	<section class="card bg-base-200 shadow-sm" aria-labelledby="search-heading">
		<div class="card-body gap-3">
			<h2 id="search-heading" class="card-title text-lg">Search BGG to add a game</h2>
			<BggSearchAdd addAction="?/addFromSearch" addLabel="collection" />
		</div>
	</section>

	<section class="card bg-base-200 shadow-sm">
		<div class="card-body gap-3">
			<button
				type="button"
				class="flex items-center justify-between gap-2 text-left"
				aria-expanded={removedOpen}
				aria-controls="removed-section"
				onclick={() => (removedOpen = !removedOpen)}
			>
				<h2 class="card-title text-lg">Removed ({data.removedItems.length})</h2>
				<span aria-hidden="true">{removedOpen ? '▾' : '▸'}</span>
			</button>
			{#if removedOpen}
				<ul id="removed-section" class="flex flex-col divide-y divide-base-300">
					{#each data.removedItems as item (item.id)}
						<li class="flex items-center justify-between gap-3 py-2">
							<span>
								<span class="font-medium">{item.name}</span>
								<span class="badge badge-ghost ml-2 text-xs">{statusLabel(item.status)}</span>
							</span>
							<span class="flex gap-2">
								<form method="POST" action="?/undoRemove" use:enhance>
									<input type="hidden" name="itemId" value={item.id} />
									<button type="submit" class="btn btn-outline btn-xs">Undo</button>
								</form>
								{#if item.status === 'pending_delete'}
									<form method="POST" action="?/confirmDelete" use:enhance>
										<input type="hidden" name="itemId" value={item.id} />
										<button type="submit" class="btn btn-error btn-xs">Confirm delete</button>
									</form>
								{/if}
							</span>
						</li>
					{:else}
						<li class="py-2 text-sm opacity-70">Nothing removed.</li>
					{/each}
				</ul>
			{/if}
		</div>
	</section>

	<p class="opacity-80">
		Build a <a class="link" href={resolve('/pools')}>pool</a> from your games, then create
		ranked lists from it.
	</p>
</main>
