/**
 * Compact IMDb title format for the local search index.
 * Uses abbreviated keys to minimize JSON size.
 */
export interface IMDbTitle {
	id: string; // tconst without "tt" prefix (e.g., "0133093" for tt0133093)
	t: string; // primaryTitle
	y: number; // startYear
	ty: string; // titleType (abbreviated)
	r?: number; // averageRating (1 decimal)
}

/**
 * Convert compact ID to full IMDb ID.
 */
export function toImdbId(compactId: string): string {
	return `tt${compactId}`;
}

/**
 * Title type abbreviations used in the dataset.
 */
export const TITLE_TYPE_ABBREV = {
	m: 'movie',
	tv: 'tvSeries',
	s: 'short',
	tms: 'tvMiniSeries',
	tm: 'tvMovie',
	ts: 'tvShort'
} as const;

export type TitleTypeAbbrev = keyof typeof TITLE_TYPE_ABBREV;

/**
 * Expanded title type for display purposes.
 */
export function getTitleTypeLabel(abbrev: string): string {
	const labels: Record<string, string> = {
		m: 'Movie',
		tv: 'TV Series',
		s: 'Short',
		tms: 'Mini-Series',
		tm: 'TV Movie',
		ts: 'TV Short'
	};
	return labels[abbrev] || abbrev;
}
