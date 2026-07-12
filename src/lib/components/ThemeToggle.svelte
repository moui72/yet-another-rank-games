<script lang="ts">
	import { onMount } from 'svelte';

	let theme = $state<'light' | 'dark'>('light');

	onMount(() => {
		theme = (document.documentElement.dataset.theme as 'light' | 'dark') ?? 'light';
	});

	function toggle() {
		theme = theme === 'dark' ? 'light' : 'dark';
		document.documentElement.dataset.theme = theme;
		try {
			localStorage.setItem('theme', theme);
		} catch {
			/* no-op */
		}
	}
</script>

<button
	type="button"
	class="btn btn-ghost btn-circle"
	onclick={toggle}
	aria-label="Switch to {theme === 'dark' ? 'light' : 'dark'} theme"
>
	<span aria-hidden="true">{theme === 'dark' ? '☀️' : '🌙'}</span>
</button>
