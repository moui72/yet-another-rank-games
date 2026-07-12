<script module lang="ts">
	import { defineMeta } from '@storybook/addon-svelte-csf';
	import Logo from './Logo.svelte';

	const { Story } = defineMeta({
		title: 'Brand/Logo',
		component: Logo,
		argTypes: {
			variant: { control: 'select', options: ['mark', 'yarg', 'full'] },
			size: { control: { type: 'range', min: 16, max: 96, step: 4 } }
		}
	});
</script>

<Story name="Mark" args={{ variant: 'mark', size: 64 }} />
<Story name="YARG wordmark" args={{ variant: 'yarg', size: 40 }} />
<Story name="Full lockup" args={{ variant: 'full', size: 56 }} />

<Story name="Sizes">
	<div class="flex flex-wrap items-end gap-6">
		<Logo variant="mark" size={24} />
		<Logo variant="mark" size={40} />
		<Logo variant="mark" size={64} />
		<Logo variant="mark" size={88} />
	</div>
</Story>
