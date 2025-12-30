-- Add updated_at column to track last activity
ALTER TABLE polls ADD COLUMN updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

-- Initialize existing polls' updated_at to their latest vote (or created_at if no votes)
UPDATE polls p
SET updated_at = COALESCE(
    (SELECT MAX(v.created_at) FROM votes v WHERE v.poll_id = p.id),
    p.created_at
);

-- Create index for cleanup queries
CREATE INDEX idx_polls_updated_at ON polls(updated_at);

-- Function to update poll's updated_at when a vote is cast
CREATE OR REPLACE FUNCTION update_poll_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE polls SET updated_at = NOW() WHERE id = NEW.poll_id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger on vote insert/update
CREATE TRIGGER trigger_update_poll_timestamp
    AFTER INSERT OR UPDATE ON votes
    FOR EACH ROW
    EXECUTE FUNCTION update_poll_timestamp();

-- Cleanup function
CREATE OR REPLACE FUNCTION cleanup_stale_polls(retention_days INT DEFAULT 30)
RETURNS INT AS $$
DECLARE
    deleted_count INT;
BEGIN
    DELETE FROM polls
    WHERE updated_at < NOW() - (retention_days || ' days')::INTERVAL;

    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- Enable pg_cron extension and schedule daily cleanup at 3 AM UTC
CREATE EXTENSION IF NOT EXISTS pg_cron;

SELECT cron.schedule(
    'cleanup-stale-polls',
    '0 3 * * *',
    'SELECT cleanup_stale_polls(30)'
);
