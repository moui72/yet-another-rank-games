<script lang="ts">
	import '../app.css';
	import favicon from '$lib/assets/favicon.svg';
	import ThemeToggle from '$lib/components/ThemeToggle.svelte';
	import { invalidate, goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { onMount } from 'svelte';
	import type { Snippet } from 'svelte';
	import type { LayoutData } from './$types';

	let { data, children }: { data: LayoutData; children: Snippet } = $props();

	onMount(() => {
		const {
			data: { subscription }
		} = data.supabase.auth.onAuthStateChange((_event, newSession) => {
			// Re-run load functions when the session changes (sign in/out).
			if (newSession?.expires_at !== data.session?.expires_at) {
				invalidate('supabase:auth');
			}
		});
		return () => subscription.unsubscribe();
	});

	async function signOut() {
		await data.supabase.auth.signOut();
		await goto(resolve('/'));
	}
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
</svelte:head>

<div class="min-h-screen bg-base-100 text-base-content">
	<header class="navbar border-base-300 bg-base-200 border-b px-4">
		<div class="flex-1">
			<a class="btn btn-ghost text-lg font-bold" href={resolve('/')}>yet-another-rank-games</a>
		</div>
		<nav class="flex flex-none items-center gap-2" aria-label="Primary">
			<ThemeToggle />
			{#if data.user}
				<a class="btn btn-ghost btn-sm" href={resolve('/pools')}>Pools</a>
				<span class="hidden text-sm opacity-70 sm:inline">{data.user.email}</span>
				<button type="button" class="btn btn-sm" onclick={signOut}>Sign out</button>
			{:else}
				<a class="btn btn-primary btn-sm" href={resolve('/login')}>Sign in</a>
			{/if}
		</nav>
	</header>

	<div class="mx-auto w-full max-w-3xl p-4 sm:p-6">
		{@render children()}
	</div>
</div>
