// For more info, see https://github.com/storybookjs/eslint-plugin-storybook#configuration-flat-config-format
import storybook from "eslint-plugin-storybook";

import js from '@eslint/js';
import ts from 'typescript-eslint';
import svelte from 'eslint-plugin-svelte';
import globals from 'globals';

export default ts.config(
    js.configs.recommended,
    ...ts.configs.recommended,
    ...svelte.configs.recommended,
    {
		languageOptions: {
			globals: { ...globals.browser, ...globals.node }
		}
	},
    {
		files: ['**/*.svelte', '**/*.svelte.ts', '**/*.svelte.js'],
		languageOptions: {
			parserOptions: {
				projectService: true,
				extraFileExtensions: ['.svelte'],
				parser: ts.parser
			}
		}
	},
    {
		// Enforce the constitution's end-to-end type-safety principle: no `any`.
		rules: {
			'@typescript-eslint/no-explicit-any': 'error'
		}
	},
    {
		ignores: [
			'.svelte-kit/',
			'build/',
			'coverage/',
			'node_modules/',
			'.project/',
			'.claude/',
			'storybook-static/'
		]
	},
    storybook.configs["flat/recommended"]
);
