-- Add status field to events table
-- Status can be: 'future', 'in_progress', 'complete'
ALTER TABLE events ADD COLUMN status TEXT DEFAULT 'future' CHECK (status IN ('future', 'in_progress', 'complete'));

-- Create index for status queries
CREATE INDEX idx_events_status ON events(status);

