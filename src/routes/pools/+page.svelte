<script lang="ts">
	import { enhance } from '$app/forms';
	import { resolve } from '$app/paths';
	import type { PageData, ActionData } from './$types';

	let { data, form }: { data: PageData; form: ActionData } = $props();
</script>

<svelte:head>
	<title>Pools · yet-another-rank-games</title>
</svelte:head>

<main class="flex flex-col gap-6">
	<div>
		<h1 class="text-2xl font-bold">Pools</h1>
		<p class="opacity-70">A pool is a reusable group of games. Build one, then create ranked lists from it.</p>
	</div>

	<section class="flex flex-col gap-2">
		<h2 class="text-lg font-semibold">Your pools</h2>
		<ul class="flex flex-col gap-2">
			{#each data.pools as pool (pool.id)}
				<li class="card bg-base-200 shadow-sm">
					<a class="card-body link-hover flex-row items-center py-3 font-semibold" href={resolve('/pools/[id]', { id: pool.id })}>
						{pool.name}
					</a>
				</li>
			{:else}
				<li class="text-sm opacity-70">No pools yet — create one below.</li>
			{/each}
		</ul>
	</section>

	<section class="card bg-base-200 shadow-sm">
		<form class="card-body gap-3" method="POST" action="?/create" use:enhance>
			<h2 class="card-title text-lg">Create a pool</h2>
			<div class="form-control">
				<label class="label" for="name"><span class="label-text">Pool name</span></label>
				<input id="name" name="name" class="input input-bordered w-full" required />
			</div>
			<div class="form-control">
				<label class="label" for="description"><span class="label-text">Description (optional)</span></label>
				<input id="description" name="description" class="input input-bordered w-full" />
			</div>
			{#if form?.error}<p role="alert" class="alert alert-error text-sm">{form.error}</p>{/if}
			<button type="submit" class="btn btn-primary self-start">Create pool</button>
		</form>
	</section>
</main>
