-- Migration number: 0001 \t 2024-05-18T10:00:00.000Z
ALTER TABLE clicks ADD COLUMN visitor_hash TEXT;
