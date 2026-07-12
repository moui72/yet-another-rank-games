<script module lang="ts">
	import { defineMeta } from '@storybook/addon-svelte-csf';
	import ThemeToggle from './ThemeToggle.svelte';

	const { Story } = defineMeta({
		title: 'Components/ThemeToggle',
		component: ThemeToggle
	});
</script>

<Story name="Default" />
