-- ============================================
-- MIGRATIE — stageverloop
-- ============================================
-- Dit script wordt gebruikt wanneer de opleiding
-- evaluatiecriteria wil wijzigen of uitbreiden.
-- Oude evaluaties blijven onaangeroerd.
-- ============================================

USE stageverloop;

-- --------------------------------------------
-- SCHEMA MIGRATIE 1: voornaam toevoegen aan gebruiker
-- --------------------------------------------
ALTER TABLE gebruiker
  ADD COLUMN voornaam VARCHAR(100) NOT NULL DEFAULT '' AFTER gebruiker_id;

-- --------------------------------------------
-- SCHEMA MIGRATIE 2: studentnummer toevoegen aan student
-- --------------------------------------------
ALTER TABLE student
  ADD COLUMN studentnummer VARCHAR(20) UNIQUE AFTER gebruiker_id;

-- --------------------------------------------
-- SCHEMA MIGRATIE 3: reflectie en leerpunten toevoegen aan logboek
-- --------------------------------------------
ALTER TABLE logboek
  ADD COLUMN reflectie TEXT AFTER activiteiten,
  ADD COLUMN leerpunten TEXT AFTER reflectie;

-- --------------------------------------------
-- SCHEMA MIGRATIE 4: gewicht toevoegen aan evaluatie_criterium
-- --------------------------------------------
ALTER TABLE evaluatie_criterium
  ADD COLUMN gewicht DECIMAL(5,2) NOT NULL DEFAULT 1.00 AFTER score;

-- --------------------------------------------
-- MIGRATIE 5: Nieuw evaluatiecriterium toevoegen
-- --------------------------------------------
INSERT INTO evaluatie_criterium (evaluatie_id, opleiding, competentie, naam, score, gewicht, volgorde)
VALUES
  (1, 'Toegepaste Informatica', 'Projectmatig werken', 'Plannen en organiseren', NULL, 1.00, 4);

-- --------------------------------------------
-- MIGRATIE 6: Score aanpassen van een criterium
-- --------------------------------------------
UPDATE evaluatie_criterium
SET score = 9
WHERE naam = 'Kwaliteit van code'
  AND evaluatie_id = 1;

-- --------------------------------------------
-- MIGRATIE 7: Stagecontract tekenen
-- --------------------------------------------
UPDATE stagecontract SET getekend_student = TRUE WHERE stage_id = 1;
UPDATE stagecontract SET getekend_mentor = TRUE WHERE stage_id = 1;
UPDATE stagecontract
SET getekend_docent = TRUE,
    getekend_op = CURRENT_TIMESTAMP
WHERE stage_id = 1;

-- --------------------------------------------
-- MIGRATIE 8: Stage status updaten
-- --------------------------------------------
UPDATE stage SET status = 'goedgekeurd' WHERE stage_id = 1;

-- --------------------------------------------
-- MIGRATIE 9: Notificatie als gelezen markeren
-- --------------------------------------------
UPDATE notificatie SET gelezen = TRUE WHERE gebruiker_id = 1;

-- --------------------------------------------
-- Controleer het resultaat
-- --------------------------------------------
SELECT 'Stagecontract status:' AS info;
SELECT
  g.naam AS student,
  sc.getekend_student,
  sc.getekend_mentor,
  sc.getekend_docent,
  sc.getekend_op
FROM stagecontract sc
JOIN stage s ON sc.stage_id = s.stage_id
JOIN student st ON s.student_id = st.student_id
JOIN gebruiker g ON st.gebruiker_id = g.gebruiker_id;

SELECT 'Stage status:' AS info;
SELECT stagetitel, status FROM stage WHERE stage_id = 1;

SELECT 'Evaluatiecriteria:' AS info;
SELECT naam, score, gewicht, volgorde FROM evaluatie_criterium WHERE evaluatie_id = 1;
-- --------------------------------------------
-- MIGRATIE 10: bestand_pad toevoegen aan stagecontract
-- --------------------------------------------
ALTER TABLE stagecontract ADD COLUMN bestand_pad VARCHAR(255) NULL;

-- --------------------------------------------
-- MIGRATIE 11: logboek_dag tabel aanmaken voor dagelijkse invoer
-- --------------------------------------------
CREATE TABLE logboek_dag (
  dag_id INT AUTO_INCREMENT PRIMARY KEY,
  logboek_id INT NOT NULL,
  dag ENUM('maandag', 'dinsdag', 'woensdag', 'donderdag', 'vrijdag') NOT NULL,
  activiteiten TEXT,
  uren DECIMAL(4,2),
  FOREIGN KEY (logboek_id) REFERENCES logboek(logboek_id) ON DELETE CASCADE
);
-- --------------------------------------------
-- MIGRATIE 12: evaluatie_fase kolom toevoegen aan evaluatie
-- --------------------------------------------
ALTER TABLE evaluatie
  ADD COLUMN fase ENUM('tussentijds', 'finaal') NOT NULL DEFAULT 'tussentijds' AFTER type;

-- --------------------------------------------
-- MIGRATIE 13: competentie tabel aanmaken
-- --------------------------------------------
CREATE TABLE IF NOT EXISTS competentie (
    competentie_id      INT             NOT NULL AUTO_INCREMENT,
    naam                VARCHAR(255)    NOT NULL,
    omschrijving        TEXT,
    gewicht             DECIMAL(5,2)    NOT NULL DEFAULT 0,
    opleiding_id        INT             NOT NULL,
    is_actief           BOOLEAN         NOT NULL DEFAULT TRUE,
    created_at          TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP,

    PRIMARY KEY (competentie_id)
);

-- --------------------------------------------
-- MIGRATIE 14: validatie kolommen toevoegen aan logboek
-- --------------------------------------------
ALTER TABLE logboek
  ADD COLUMN gevalideerd_door INT NULL,
  ADD COLUMN gevalideerd_op TIMESTAMP NULL,
  ADD CONSTRAINT fk_logboek_mentor
    FOREIGN KEY (gevalideerd_door) REFERENCES mentor(mentor_id)
    ON DELETE SET NULL ON UPDATE CASCADE;

-- --------------------------------------------
-- MIGRATIE 15: mentor score en feedback toevoegen aan evaluatie_criterium
-- --------------------------------------------
ALTER TABLE evaluatie_criterium
  ADD COLUMN mentor_score INT NULL AFTER score,
  ADD COLUMN mentor_feedback TEXT NULL AFTER mentor_score;

-- --------------------------------------------
-- MIGRATIE 16: wachtwoord_reset tabel voor "wachtwoord vergeten"
-- --------------------------------------------
CREATE TABLE wachtwoord_reset (
    reset_id        INT             NOT NULL AUTO_INCREMENT,
    gebruiker_id    INT             NOT NULL,
    token_hash      CHAR(64)        NOT NULL,
    verloopt_op     DATETIME        NOT NULL,
    gebruikt_op     DATETIME        NULL,
    aangemaakt_op   TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP,

    PRIMARY KEY (reset_id),
    UNIQUE KEY uq_token_hash (token_hash),
    KEY idx_reset_gebruiker (gebruiker_id),
    CONSTRAINT fk_reset_gebruiker
        FOREIGN KEY (gebruiker_id) REFERENCES gebruiker(gebruiker_id)
        ON DELETE CASCADE ON UPDATE CASCADE
);

-- --------------------------------------------
-- MIGRATIE 17: type-kolom op notificatie
-- --------------------------------------------
ALTER TABLE notificatie
  ADD COLUMN type ENUM('info','goed','waarschuwing','fout') NOT NULL DEFAULT 'info' AFTER bericht;

UPDATE notificatie SET type = 'goed'
  WHERE bericht REGEXP 'goedgekeurd|bevestigd|ondertekend|akkoord';
UPDATE notificatie SET type = 'fout'
  WHERE bericht REGEXP 'afgekeurd|afgewezen|geweigerd';
UPDATE notificatie SET type = 'waarschuwing'
  WHERE bericht REGEXP 'aanpassing|wijzig|aandacht|let op';

-- --------------------------------------------
-- MIGRATIE 18: status 'aanpassing_gevraagd' toevoegen aan stage
-- --------------------------------------------
ALTER TABLE stage
  MODIFY COLUMN status
    ENUM('ingediend','in_behandeling','goedgekeurd','afgewezen','bezig','afgerond','aanpassing_gevraagd')
    NOT NULL DEFAULT 'ingediend';

-- --------------------------------------------
-- MIGRATIE 19: reflectie en leerpunten toevoegen aan logboek_dag
-- --------------------------------------------
ALTER TABLE logboek_dag
  ADD COLUMN reflectie TEXT AFTER activiteiten,
  ADD COLUMN leerpunten TEXT AFTER reflectie;

-- --------------------------------------------
-- MIGRATIE 20: is_actief kolom toevoegen aan competentie (soft delete)
-- --------------------------------------------
ALTER TABLE competentie
  ADD COLUMN IF NOT EXISTS is_actief BOOLEAN NOT NULL DEFAULT TRUE;

-- --------------------------------------------
-- MIGRATIE 21: competentieset tabel aanmaken
-- --------------------------------------------
CREATE TABLE IF NOT EXISTS competentieset (
    set_id       INT          NOT NULL AUTO_INCREMENT,
    naam         VARCHAR(255) NOT NULL,
    opleiding    VARCHAR(255) NOT NULL,
    jaar         VARCHAR(20)  NOT NULL,
    is_actief    BOOLEAN      NOT NULL DEFAULT TRUE,
    created_at   TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (set_id)
);

-- --------------------------------------------
-- MIGRATIE 22: provincie toevoegen aan bedrijf
-- --------------------------------------------
ALTER TABLE bedrijf
  ADD COLUMN provincie VARCHAR(50) AFTER gemeente;

-- --------------------------------------------
-- MIGRATIE 23: is_actief toevoegen aan gebruiker (soft disable accounts)
-- --------------------------------------------
ALTER TABLE gebruiker
  ADD COLUMN IF NOT EXISTS is_actief BOOLEAN NOT NULL DEFAULT TRUE;

-- --------------------------------------------
-- MIGRATIE 24: competentie_rubriek tabel aanmaken
-- --------------------------------------------
CREATE TABLE IF NOT EXISTS competentie_rubriek (
    rubriek_id      INT  NOT NULL AUTO_INCREMENT,
    competentie_id  INT  NOT NULL,
    punt            INT  NOT NULL,
    beschrijving    TEXT,
    PRIMARY KEY (rubriek_id),
    UNIQUE KEY uq_comp_punt (competentie_id, punt),
    FOREIGN KEY (competentie_id)
        REFERENCES competentie(competentie_id)
        ON DELETE CASCADE ON UPDATE CASCADE
);

-- --------------------------------------------
-- MIGRATIE 25: commissielid kolom toevoegen aan gebruiker
-- Stelt in of een docent ook in de commissie kan werken
-- --------------------------------------------
ALTER TABLE gebruiker
  ADD COLUMN IF NOT EXISTS commissielid BOOLEAN NOT NULL DEFAULT FALSE;
