/**
 * Compact IMDb title format for the local search index.
 * Uses abbreviated keys to minimize JSON size.
 */
export interface IMDbTitle {
	id: string; // tconst without "tt" prefix (e.g., "0133093" for tt0133093)
	t: string; // primaryTitle
	y: number; // startYear
	r?: number; // averageRating (1 decimal)
	v?: number; // numVotes (for popularity ranking)
}

/**
 * Convert compact ID to full IMDb ID.
 */
export function toImdbId(compactId: string): string {
	return `tt${compactId}`;
}
