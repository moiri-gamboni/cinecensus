export type VotingMethod = 'approval' | 'single' | 'ranked' | 'rating';

export interface Movie {
	imdbID: string;
	title: string;
	year: string;
	poster: string | null;
	rating?: number;
	votes?: number;
}

export interface Poll {
	id: string;
	title: string;
	voting_method: VotingMethod;
	movies: Movie[];
	created_at: string;
}

export interface Vote {
	id: string;
	poll_id: string;
	voter_fingerprint: string;
	vote_data: ApprovalVoteData | SingleVoteData | RankedVoteData | RatingVoteData;
	created_at: string;
}

// Vote data types for each voting method
export type ApprovalVoteData = string[]; // Array of approved imdbIDs
export type SingleVoteData = string; // Single imdbID
export type RankedVoteData = string[]; // Ordered array (first = top choice)
export type RatingVoteData = Record<string, number>; // imdbID -> rating (1-5)

// Results types
export interface ApprovalResult {
	movie: Movie;
	count: number;
	percentage: number;
}

export interface SingleResult {
	movie: Movie;
	count: number;
	percentage: number;
}

export interface RankedRound {
	counts: Record<string, number>;
	eliminated: string | null;
	remaining: string[];
}

export interface RankedResult {
	rounds: RankedRound[];
	winner: Movie | null;
}

export interface RatingResult {
	movie: Movie;
	median: number;
	mean: number;
	ratings: number[];
}

export type PollResults =
	| { method: 'approval'; results: ApprovalResult[]; winner: Movie | null }
	| { method: 'single'; results: SingleResult[]; winner: Movie | null }
	| { method: 'ranked'; results: RankedResult; winner: Movie | null }
	| { method: 'rating'; results: RatingResult[]; winner: Movie | null };
