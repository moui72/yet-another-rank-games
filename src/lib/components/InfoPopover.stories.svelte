<script module lang="ts">
	import { defineMeta } from '@storybook/addon-svelte-csf';
	import InfoPopover from './InfoPopover.svelte';

	const { Story } = defineMeta({
		title: 'Components/InfoPopover',
		component: InfoPopover
	});
</script>

<Story name="Default" args={{ label: 'About this list' }}>
	A list ranks the games in a pool through head-to-head comparisons.
</Story>
