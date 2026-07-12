import { error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db } from '$lib/server/db';
import { getOwnedList, AccessDeniedError } from '$lib/server/ownership';
import { listRankedEntries } from '$lib/server/repositories/listEntries';
import { toMarkdown, toCsv, toJson, toBbcode, type ExportData } from '$lib/domain/export';

const FORMATS = {
	md: { render: toMarkdown, type: 'text/markdown', ext: 'md' },
	csv: { render: toCsv, type: 'text/csv', ext: 'csv' },
	json: { render: toJson, type: 'application/json', ext: 'json' },
	// GeekList (BBCode) body to paste into a new GeekList on BGG.
	bbcode: { render: toBbcode, type: 'text/plain', ext: 'txt', suffix: '-geeklist' }
} as const;

function slug(name: string): string {
	return name.replace(/[^a-z0-9]+/gi, '-').replace(/^-+|-+$/g, '').toLowerCase() || 'ranking';
}

/** Download the list's current ranking as Markdown, CSV, or JSON. */
export const GET: RequestHandler = async ({ locals, params, url }) => {
	if (!locals.user) error(401, 'Not authenticated');
	let list;
	try {
		list = await getOwnedList(db, locals.user.id, params.id);
	} catch (e) {
		if (e instanceof AccessDeniedError) error(404, 'List not found');
		throw e;
	}

	const key = url.searchParams.get('format') ?? 'json';
	const format = FORMATS[key as keyof typeof FORMATS];
	if (!format) error(400, 'Unknown format');

	const data: ExportData = { listName: list.name, entries: await listRankedEntries(db, params.id) };
	return new Response(format.render(data), {
		headers: {
			'content-type': `${format.type}; charset=utf-8`,
			'content-disposition': `attachment; filename="${slug(list.name)}${'suffix' in format ? format.suffix : ''}.${format.ext}"`
		}
	});
};
