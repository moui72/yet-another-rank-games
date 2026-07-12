<script lang="ts">
	import { resolve } from '$app/paths';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();
</script>

<svelte:head>
	<title>{data.collection.bggUsername}'s collection · yet-another-rank-games</title>
</svelte:head>

<main class="flex flex-col gap-4">
	<h1 class="text-2xl font-bold">{data.collection.bggUsername}'s collection</h1>
	<div class="stats bg-base-200 shadow-sm">
		<div class="stat">
			<div class="stat-title">Games imported</div>
			<div class="stat-value">{data.gameCount}</div>
		</div>
	</div>
	<p class="opacity-80">
		Build a <a class="link" href={resolve('/pools')}>pool</a> from your games, then create
		ranked lists from it.
	</p>
</main>
