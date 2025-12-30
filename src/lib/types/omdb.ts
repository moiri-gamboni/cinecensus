export interface OMDbSearchResult {
	Title: string;
	Year: string;
	imdbID: string;
	Type: string;
	Poster: string;
}

export interface OMDbSearchResponse {
	Search?: OMDbSearchResult[];
	totalResults?: string;
	Response: 'True' | 'False';
	Error?: string;
}

// Response from OMDb when fetching by IMDb ID
export interface OMDbDetailResponse {
	Title: string;
	Year: string;
	imdbID: string;
	Type: string;
	Poster: string;
	Plot?: string;
	Response: 'True' | 'False';
	Error?: string;
}
