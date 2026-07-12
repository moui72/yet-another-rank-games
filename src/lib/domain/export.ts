/** One ranked row for export. */
export interface ExportEntry {
	rank: number;
	name: string;
	bggId: number;
	score: number | null;
}

export interface ExportData {
	listName: string;
	entries: ExportEntry[];
}

/** A ranked list as Markdown — easy to paste into BGG/forums. */
export function toMarkdown(data: ExportData): string {
	const lines = [`# ${data.listName}`, ''];
	for (const e of data.entries) lines.push(`${e.rank}. ${e.name}`);
	return lines.join('\n') + '\n';
}

function csvCell(value: string): string {
	return /[",\n]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value;
}

/** A ranked list as CSV (rank, game, bgg_id, score) — spreadsheet-friendly. */
export function toCsv(data: ExportData): string {
	const rows = [['rank', 'game', 'bgg_id', 'score']];
	for (const e of data.entries) {
		rows.push([String(e.rank), e.name, String(e.bggId), e.score == null ? '' : String(e.score)]);
	}
	return rows.map((r) => r.map(csvCell).join(',')).join('\n') + '\n';
}

/** The full structured list as JSON — for re-import / interop. */
export function toJson(data: ExportData): string {
	return JSON.stringify({ list: data.listName, entries: data.entries }, null, 2);
}
