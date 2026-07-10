#!/usr/bin/env node
// Coverage ratchet (constitution Quality Standard): a never-decrease gate.
// Reads the line-coverage % from coverage/coverage-summary.json and compares
// it to the committed baseline in coverage-baseline.json.
//   - If coverage dropped below the baseline (beyond a tiny float epsilon),
//     exit non-zero — the gate fails.
//   - If coverage improved, raise the baseline on disk (to be committed), so
//     the floor only ever moves up.
// Run `npm run coverage:ratchet` locally after adding tests; commit the
// updated coverage-baseline.json. CI runs the same script as the gate.
import { readFileSync, writeFileSync, existsSync } from 'node:fs';

const SUMMARY = 'coverage/coverage-summary.json';
const BASELINE = 'coverage-baseline.json';
const EPSILON = 0.01;

if (!existsSync(SUMMARY)) {
	console.error(`coverage-ratchet: ${SUMMARY} not found — run \`npm run coverage\` first.`);
	process.exit(1);
}

const current = JSON.parse(readFileSync(SUMMARY, 'utf8')).total.lines.pct;
const baseline = existsSync(BASELINE) ? JSON.parse(readFileSync(BASELINE, 'utf8')).lines : 0;

if (current < baseline - EPSILON) {
	console.error(
		`coverage-ratchet: line coverage ${current}% is below the baseline ${baseline}%. ` +
			`Add tests to restore it (or justify a baseline change deliberately).`
	);
	process.exit(1);
}

if (current > baseline + EPSILON) {
	writeFileSync(BASELINE, JSON.stringify({ lines: current }, null, '\t') + '\n');
	console.log(`coverage-ratchet: baseline raised ${baseline}% -> ${current}%. Commit coverage-baseline.json.`);
} else {
	console.log(`coverage-ratchet: line coverage ${current}% meets the baseline ${baseline}%.`);
}
