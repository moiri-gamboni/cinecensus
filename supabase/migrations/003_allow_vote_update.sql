-- Allow users to update their existing votes
-- This is needed for the upsert operation when changing a vote
CREATE POLICY "Anyone can update their vote" ON votes
    FOR UPDATE USING (true) WITH CHECK (true);
