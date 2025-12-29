/**
 * Format a vote count for display (e.g., 1500000 -> "1.5M", 500000 -> "500K")
 */
export function formatVotes(votes: number): string {
	if (votes >= 1_000_000) {
		const millions = votes / 1_000_000;
		return millions >= 10 ? `${Math.round(millions)}M` : `${millions.toFixed(1).replace(/\.0$/, '')}M`;
	}
	if (votes >= 1_000) {
		const thousands = votes / 1_000;
		return thousands >= 10 ? `${Math.round(thousands)}K` : `${thousands.toFixed(1).replace(/\.0$/, '')}K`;
	}
	return String(votes);
}
