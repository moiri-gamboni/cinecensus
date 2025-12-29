/**
 * Downloads and processes IMDb datasets to create a local search index.
 *
 * Data sources:
 * - title.basics.tsv.gz: Title information (ID, type, name, year)
 * - title.ratings.tsv.gz: Ratings and vote counts
 *
 * Output: static/imdb-titles.json (top 100K titles by vote count)
 *
 * Data format (compact keys for size):
 * - id: IMDb ID without "tt" prefix (e.g., "0133093" for tt0133093)
 * - t: primaryTitle
 * - y: startYear
 * - r: averageRating (1 decimal place)
 * - v: numVotes
 */

import { createReadStream, createWriteStream, existsSync, readFileSync, writeFileSync, unlinkSync } from 'fs';
import { createGunzip } from 'zlib';
import { createInterface } from 'readline';
import https from 'https';
import path from 'path';

const IMDB_BASE_URL = 'https://datasets.imdbws.com';
const BASICS_FILE = 'title.basics.tsv.gz';
const RATINGS_FILE = 'title.ratings.tsv.gz';
const OUTPUT_FILE = path.join(import.meta.dirname, '..', 'static', 'imdb-titles.json');
const TIMESTAMP_FILE = path.join(import.meta.dirname, '.last-updated');
const TEMP_DIR = path.join(import.meta.dirname, '.temp');
const TOP_N = 100_000;

// Title types to include (matching IMDb website filters)
const ALLOWED_TYPES = new Set([
  'movie',        // feature films
  'tvSeries',     // TV series
  'short',        // short films
  'tvMiniSeries', // TV mini-series
  'tvMovie',      // TV movies
  'tvShort',      // TV shorts
]);

interface IMDbTitle {
  id: string;    // tconst
  t: string;     // primaryTitle
  y: number;     // startYear
  r?: number;    // averageRating
  v?: number;    // numVotes
}

/**
 * Check Last-Modified header to see if we need to download
 */
async function getLastModified(filename: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const url = `${IMDB_BASE_URL}/${filename}`;
    https.request(url, { method: 'HEAD' }, (res) => {
      resolve(res.headers['last-modified'] || '');
    }).on('error', reject).end();
  });
}

/**
 * Download a file from IMDB datasets
 */
async function downloadFile(filename: string, destPath: string): Promise<void> {
  const url = `${IMDB_BASE_URL}/${filename}`;
  console.log(`Downloading ${url}...`);

  return new Promise((resolve, reject) => {
    const file = createWriteStream(destPath);
    https.get(url, (response) => {
      if (response.statusCode === 302 || response.statusCode === 301) {
        // Follow redirect
        https.get(response.headers.location!, (res) => {
          res.pipe(file);
          file.on('finish', () => {
            file.close();
            resolve();
          });
        }).on('error', reject);
      } else {
        response.pipe(file);
        file.on('finish', () => {
          file.close();
          resolve();
        });
      }
    }).on('error', reject);
  });
}

/**
 * Parse ratings file into a Map for quick lookup
 */
async function parseRatings(filePath: string): Promise<Map<string, { rating: number; votes: number }>> {
  console.log('Parsing ratings...');
  const ratings = new Map<string, { rating: number; votes: number }>();

  const gunzip = createGunzip();
  const rl = createInterface({
    input: createReadStream(filePath).pipe(gunzip),
    crlfDelay: Infinity,
  });

  let isHeader = true;
  for await (const line of rl) {
    if (isHeader) {
      isHeader = false;
      continue;
    }

    const [tconst, averageRating, numVotes] = line.split('\t');
    if (tconst && averageRating !== '\\N' && numVotes !== '\\N') {
      ratings.set(tconst, {
        rating: parseFloat(averageRating),
        votes: parseInt(numVotes, 10),
      });
    }
  }

  console.log(`Loaded ${ratings.size} ratings`);
  return ratings;
}

/**
 * Parse basics file and join with ratings
 */
async function parseBasicsAndJoin(
  filePath: string,
  ratings: Map<string, { rating: number; votes: number }>
): Promise<IMDbTitle[]> {
  console.log('Parsing titles and joining with ratings...');
  const titles: IMDbTitle[] = [];

  const gunzip = createGunzip();
  const rl = createInterface({
    input: createReadStream(filePath).pipe(gunzip),
    crlfDelay: Infinity,
  });

  let isHeader = true;
  let processed = 0;

  // Column indices (from header: tconst, titleType, primaryTitle, originalTitle, isAdult, startYear, endYear, runtimeMinutes, genres)
  for await (const line of rl) {
    if (isHeader) {
      isHeader = false;
      continue;
    }

    const parts = line.split('\t');
    const tconst = parts[0];
    const titleType = parts[1];
    const primaryTitle = parts[2];
    const isAdult = parts[4];
    const startYear = parts[5];

    // Filter by type and exclude adult content
    if (!ALLOWED_TYPES.has(titleType) || isAdult === '1') {
      continue;
    }

    // Skip if no valid year
    if (startYear === '\\N') {
      continue;
    }

    const rating = ratings.get(tconst);

    // Only include titles with ratings (ensures some popularity)
    if (!rating) {
      continue;
    }

    titles.push({
      id: tconst.slice(2), // Strip "tt" prefix to save space
      t: primaryTitle,
      y: parseInt(startYear, 10),
      r: Math.round(rating.rating * 10) / 10, // 1 decimal place
      v: rating.votes,
    });

    processed++;
    if (processed % 100000 === 0) {
      console.log(`Processed ${processed} titles...`);
    }
  }

  console.log(`Found ${titles.length} titles with ratings`);
  return titles;
}

/**
 * Main function
 */
async function main() {
  // Check if we need to update
  const basicsLastModified = await getLastModified(BASICS_FILE);
  const ratingsLastModified = await getLastModified(RATINGS_FILE);
  const currentTimestamp = `${basicsLastModified}|${ratingsLastModified}`;

  if (existsSync(TIMESTAMP_FILE)) {
    const storedTimestamp = readFileSync(TIMESTAMP_FILE, 'utf-8').trim();
    if (storedTimestamp === currentTimestamp) {
      console.log('Data is up to date, skipping download.');
      return;
    }
  }

  console.log('New data available, updating...');

  // Create temp directory
  const { mkdir } = await import('fs/promises');
  await mkdir(TEMP_DIR, { recursive: true });

  const basicsPath = path.join(TEMP_DIR, BASICS_FILE);
  const ratingsPath = path.join(TEMP_DIR, RATINGS_FILE);

  try {
    // Download files
    await downloadFile(BASICS_FILE, basicsPath);
    await downloadFile(RATINGS_FILE, ratingsPath);

    // Parse ratings first (smaller file, used for lookup)
    const ratings = await parseRatings(ratingsPath);

    // Parse basics and join with ratings
    const titles = await parseBasicsAndJoin(basicsPath, ratings);

    // Sort by vote count (descending) and take top N
    console.log(`Sorting by popularity and taking top ${TOP_N}...`);
    titles.sort((a, b) => (b.v || 0) - (a.v || 0));
    const topTitles = titles.slice(0, TOP_N);

    // Keep vote count for search ranking (abbreviated as 'v')
    const output = topTitles;

    // Write output
    console.log(`Writing ${output.length} titles to ${OUTPUT_FILE}...`);
    writeFileSync(OUTPUT_FILE, JSON.stringify(output));

    // Save timestamp
    writeFileSync(TIMESTAMP_FILE, currentTimestamp);

    // Report file size
    const { stat } = await import('fs/promises');
    const stats = await stat(OUTPUT_FILE);
    console.log(`Output file size: ${(stats.size / 1024 / 1024).toFixed(2)} MB`);

    // Build search index
    console.log('\nBuilding search index...');
    const { buildSearchIndex } = await import('./build-search-index.js');
    await buildSearchIndex();

    console.log('\nDone!');
  } finally {
    // Cleanup temp files
    try {
      if (existsSync(basicsPath)) unlinkSync(basicsPath);
      if (existsSync(ratingsPath)) unlinkSync(ratingsPath);
      const { rmdir } = await import('fs/promises');
      await rmdir(TEMP_DIR);
    } catch {
      // Ignore cleanup errors
    }
  }
}

main().catch((err) => {
  console.error('Error:', err);
  process.exit(1);
});
