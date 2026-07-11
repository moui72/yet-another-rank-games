<script lang="ts">
	import { enhance } from '$app/forms';
	import { resolve } from '$app/paths';
	import type { PageData, ActionData } from './$types';

	let { data, form }: { data: PageData; form: ActionData } = $props();
</script>

<svelte:head>
	<title>Pools · yet-another-rank-games</title>
</svelte:head>

<main>
	<h1>Pools</h1>
	<p>A pool is a reusable group of games. Build one, then create ranked lists from it.</p>

	<section>
		<h2>Your pools</h2>
		<ul>
			{#each data.pools as pool (pool.id)}
				<li><a href={resolve('/pools/[id]', { id: pool.id })}>{pool.name}</a></li>
			{:else}
				<li>No pools yet — create one below.</li>
			{/each}
		</ul>
	</section>

	<section>
		<h2>Create a pool</h2>
		<form method="POST" action="?/create" use:enhance>
			<div>
				<label for="name">Pool name</label>
				<input id="name" name="name" required />
			</div>
			<div>
				<label for="description">Description (optional)</label>
				<input id="description" name="description" />
			</div>
			{#if form?.error}<p role="alert" class="error">{form.error}</p>{/if}
			<button type="submit">Create pool</button>
		</form>
	</section>
</main>
