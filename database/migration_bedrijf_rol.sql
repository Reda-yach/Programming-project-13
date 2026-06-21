-- Commit 1: bedrijf-rol & koppelingen
-- Draaicommando: mysql -u <user> -p stageverloop < database/migration_bedrijf_rol.sql

-- 1. Voeg 'bedrijf' toe aan de rol-ENUM
ALTER TABLE gebruiker
  MODIFY rol ENUM('student','docent','mentor','commissie','bedrijf','admin') NOT NULL;

-- 2. Koppel een gebruiker-account aan het bedrijf + voeg status toe
ALTER TABLE bedrijf
  ADD COLUMN gebruiker_id INT NULL UNIQUE AFTER bedrijf_id,
  ADD COLUMN status ENUM('voorgesteld','goedgekeurd') NOT NULL DEFAULT 'goedgekeurd' AFTER contact_telefoonnummer,
  ADD CONSTRAINT fk_bedrijf_gebruiker
    FOREIGN KEY (gebruiker_id) REFERENCES gebruiker(gebruiker_id)
    ON DELETE SET NULL ON UPDATE CASCADE;

-- 3. Maak mentor_id nullable (mentor bestaat pas na contract)
ALTER TABLE stage
  MODIFY mentor_id INT NULL;

-- 4. Bestaande bedrijven zijn goedgekeurd
UPDATE bedrijf SET status = 'goedgekeurd';
