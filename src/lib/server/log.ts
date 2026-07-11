/**
 * Minimal structured logging (constitution Principle X). Emits one JSON line
 * per event with a level, the event name, and identifier fields sufficient to
 * reproduce an issue without a debugger. Cloud Run ingests stdout/stderr as
 * structured logs.
 */
type Fields = Record<string, unknown>;

export function logEvent(event: string, fields: Fields = {}): void {
	console.log(JSON.stringify({ level: 'info', event, ...fields }));
}

export function logError(event: string, fields: Fields = {}): void {
	console.error(JSON.stringify({ level: 'error', event, ...fields }));
}
