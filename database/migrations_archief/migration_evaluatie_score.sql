-- Migration: evaluatie_score-tabel (vervangt evaluatie_criterium + rubriek)
-- ============================================================
-- Scores verwijzen voortaan rechtstreeks naar competentie_id i.p.v. de
-- competentie + rubriektekst per evaluatie te kopieren. Daardoor wordt de
-- vergelijking student/mentor/docent een simpele JOIN op competentie_id en
-- staat de rubriektekst nog maar op een plek (competentie_rubriek).
-- Draai dit na migration_opleiding.sql.

USE stageverloop;

-- 1. Nieuwe scoretabel: een rij per (evaluatie, competentie).
CREATE TABLE IF NOT EXISTS evaluatie_score (
    score_id            INT             NOT NULL AUTO_INCREMENT,
    evaluatie_id        INT             NOT NULL,
    competentie_id      INT             NOT NULL,
    score               INT             NULL,
    toelichting         TEXT            NULL,

    PRIMARY KEY (score_id),
    UNIQUE KEY uq_eval_competentie (evaluatie_id, competentie_id),
    CONSTRAINT fk_evalscore_evaluatie
        FOREIGN KEY (evaluatie_id) REFERENCES evaluatie(evaluatie_id)
        ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT fk_evalscore_competentie
        FOREIGN KEY (competentie_id) REFERENCES competentie(competentie_id)
        ON DELETE CASCADE ON UPDATE CASCADE
);

-- 2. Bestaande scores overzetten: match de gekopieerde competentie-naam in
--    evaluatie_criterium op de competentie in het template. Best-effort —
--    rijen zonder matchende competentie worden simpelweg overgeslagen.
INSERT IGNORE INTO evaluatie_score (evaluatie_id, competentie_id, score)
SELECT ec.evaluatie_id, c.competentie_id, ec.score
FROM evaluatie_criterium ec
JOIN competentie c ON c.naam = ec.competentie;
