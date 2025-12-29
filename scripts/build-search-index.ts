/**
 * Build script to pre-generate MiniSearch index.
 * Called by update-imdb-data.ts after dataset is updated.
 */
import MiniSearch from 'minisearch';
import { readFileSync, writeFileSync } from 'fs';
import { join } from 'path';

interface IMDbTitle {
	id: string;
	t: string;
	y: number;
	r?: number;
	v?: number;
}

const STATIC_DIR = join(import.meta.dirname, '../static');
const INPUT_FILE = join(STATIC_DIR, 'imdb-titles.json');
const OUTPUT_FILE = join(STATIC_DIR, 'search-index.json');

// MiniSearch configuration - must match runtime config exactly
const MINISEARCH_OPTIONS = {
	fields: ['t'], // Search the title field
	storeFields: ['id', 't', 'y', 'r', 'v'], // Store all fields for retrieval
	idField: 'id'
};

export async function buildSearchIndex(): Promise<void> {
	const start = performance.now();

	// Load titles
	const titlesJson = readFileSync(INPUT_FILE, 'utf-8');
	const titles: IMDbTitle[] = JSON.parse(titlesJson);
	console.log(`Loaded ${titles.length.toLocaleString()} titles`);

	// Create and populate index
	const miniSearch = new MiniSearch<IMDbTitle>(MINISEARCH_OPTIONS);
	miniSearch.addAll(titles);
	console.log(`Indexed ${miniSearch.documentCount.toLocaleString()} documents`);

	// Serialize index
	const indexJson = JSON.stringify(miniSearch);
	writeFileSync(OUTPUT_FILE, indexJson);

	const elapsed = performance.now() - start;
	const inputSize = (titlesJson.length / 1024 / 1024).toFixed(2);
	const outputSize = (indexJson.length / 1024 / 1024).toFixed(2);

	console.log(`Index built in ${elapsed.toFixed(0)}ms`);
	console.log(`Input: ${inputSize} MB`);
	console.log(`Output: ${outputSize} MB (${OUTPUT_FILE})`);
}

// Run directly if executed as a script
if (import.meta.url === `file://${process.argv[1]}`) {
	buildSearchIndex().catch((err) => {
		console.error('Error building search index:', err);
		process.exit(1);
	});
}
