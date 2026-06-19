-- Single-session: één actieve sessie per gebruiker.
-- Bij login wordt sessie_id opnieuw gezet; oudere tokens worden ongeldig.
ALTER TABLE gebruiker ADD COLUMN sessie_id VARCHAR(64) NULL AFTER rol;
