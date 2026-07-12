<script lang="ts">
	import '../app.css';
	import favicon from '$lib/assets/favicon.svg';
	import ThemeToggle from '$lib/components/ThemeToggle.svelte';
	import Logo from '$lib/components/Logo.svelte';
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

<div class="bg-base-100 text-base-content min-h-screen">
	<header class="navbar bg-base-100/90 supports-[backdrop-filter]:bg-base-100/70 sticky top-0 z-20 px-3 backdrop-blur">
		<div class="flex-1">
			<a
				class="btn btn-ghost hover:bg-base-200 h-auto px-2 py-1"
				href={resolve('/')}
				aria-label="YARG — home"
			>
				<Logo variant="yarg" size={30} />
			</a>
		</div>
		<nav class="flex flex-none items-center gap-1 sm:gap-2" aria-label="Primary">
			<ThemeToggle />
			{#if data.user}
				<a class="btn btn-ghost btn-sm" href={resolve('/pools')}>Pools</a>
				<span class="hidden max-w-40 truncate text-sm opacity-60 sm:inline">{data.user.email}</span>
				<button type="button" class="btn btn-sm btn-outline" onclick={signOut}>Sign out</button>
			{:else}
				<a class="btn btn-primary btn-sm" href={resolve('/login')}>Sign in</a>
			{/if}
		</nav>
	</header>
	<!-- A thin stack of box-spine colors — the brand motif as a ruled edge. -->
	<div class="flex h-1" aria-hidden="true">
		<span class="flex-1" style="background:#ff9f1c"></span>
		<span class="flex-1" style="background:#e23fb0"></span>
		<span class="flex-1" style="background:#3d6ef5"></span>
		<span class="flex-1" style="background:#17c3b2"></span>
		<span class="flex-1" style="background:#d92d20"></span>
	</div>

	<div class="mx-auto w-full max-w-3xl p-4 sm:p-6">
		{@render children()}
	</div>
</div>
