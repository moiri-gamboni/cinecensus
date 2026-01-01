import { browser } from '$app/environment';

const STORAGE_KEY = 'cinecensus_owned_polls';
const VOTED_KEY = 'cinecensus_voted_polls';

function getOwnedPolls(): string[] {
	if (!browser) return [];
	try {
		const stored = localStorage.getItem(STORAGE_KEY);
		return stored ? JSON.parse(stored) : [];
	} catch {
		// Clear corrupted data
		localStorage.removeItem(STORAGE_KEY);
		return [];
	}
}

function addOwnedPoll(pollId: string): void {
	if (!browser) return;
	const polls = getOwnedPolls();
	if (!polls.includes(pollId)) {
		polls.push(pollId);
		localStorage.setItem(STORAGE_KEY, JSON.stringify(polls));
	}
}

function isOwnedPoll(pollId: string): boolean {
	return getOwnedPolls().includes(pollId);
}

function getVotedPolls(): string[] {
	if (!browser) return [];
	try {
		const stored = localStorage.getItem(VOTED_KEY);
		return stored ? JSON.parse(stored) : [];
	} catch {
		// Clear corrupted data
		localStorage.removeItem(VOTED_KEY);
		return [];
	}
}

function addVotedPoll(pollId: string): void {
	if (!browser) return;
	const polls = getVotedPolls();
	if (!polls.includes(pollId)) {
		polls.push(pollId);
		localStorage.setItem(VOTED_KEY, JSON.stringify(polls));
	}
}

function hasVotedOn(pollId: string): boolean {
	return getVotedPolls().includes(pollId);
}

export const pollOwnership = {
	getAll: getOwnedPolls,
	add: addOwnedPoll,
	owns: isOwnedPoll
};

export const votedPolls = {
	getAll: getVotedPolls,
	add: addVotedPoll,
	hasVoted: hasVotedOn
};
