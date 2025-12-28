-- Custom nanoid function for short, URL-friendly IDs
CREATE OR REPLACE FUNCTION nanoid(size int DEFAULT 12)
RETURNS text AS $$
DECLARE
    id text := '';
    i int := 0;
    alphabet text := '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ';
    rand_val int;
BEGIN
    LOOP
        EXIT WHEN i >= size;
        rand_val := floor(random() * length(alphabet))::int;
        id := id || substr(alphabet, rand_val + 1, 1);
        i := i + 1;
    END LOOP;
    RETURN id;
END;
$$ LANGUAGE plpgsql;

-- Voting method enum
CREATE TYPE voting_method AS ENUM ('approval', 'single', 'ranked', 'rating');

-- Polls table
CREATE TABLE polls (
    id TEXT PRIMARY KEY DEFAULT nanoid(12),
    title TEXT NOT NULL,
    voting_method voting_method NOT NULL DEFAULT 'approval',
    movies JSONB NOT NULL DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Votes table
CREATE TABLE votes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    poll_id TEXT NOT NULL REFERENCES polls(id) ON DELETE CASCADE,
    voter_fingerprint TEXT NOT NULL,
    vote_data JSONB NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- Prevent double voting
    UNIQUE(poll_id, voter_fingerprint)
);

-- Indexes
CREATE INDEX idx_votes_poll_id ON votes(poll_id);
CREATE INDEX idx_polls_created_at ON polls(created_at DESC);

-- Row Level Security
ALTER TABLE polls ENABLE ROW LEVEL SECURITY;
ALTER TABLE votes ENABLE ROW LEVEL SECURITY;

-- Anyone can read polls
CREATE POLICY "Polls are viewable by everyone" ON polls
    FOR SELECT USING (true);

-- Anyone can create polls
CREATE POLICY "Anyone can create polls" ON polls
    FOR INSERT WITH CHECK (true);

-- Anyone can read votes (needed for results)
CREATE POLICY "Votes are viewable by everyone" ON votes
    FOR SELECT USING (true);

-- Anyone can insert their vote
CREATE POLICY "Anyone can vote" ON votes
    FOR INSERT WITH CHECK (true);
