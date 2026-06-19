-- Migration: opleiding-tabel + koppeling student/competentie
-- ============================================================
-- Voegt een echte opleiding-entiteit toe en koppelt zowel student als
-- competentie eraan via opleiding_id. Voorheen was student.opleiding een
-- losse string en competentie.opleiding_id een ongekoppelde int, waardoor
-- een student niet betrouwbaar aan de juiste competentieset hing.
-- Draai dit script eenmalig op een bestaande database.

USE stageverloop;

-- 1. Opleiding-tabel.
CREATE TABLE IF NOT EXISTS opleiding (
    opleiding_id    INT             NOT NULL AUTO_INCREMENT,
    naam            VARCHAR(150)    NOT NULL,

    PRIMARY KEY (opleiding_id),
    UNIQUE KEY uq_opleiding_naam (naam)
);

-- 2. id=1 vastzetten op 'Toegepaste Informatica'. Bestaande competentie-rijen
--    gebruikten opleiding_id=1 als impliciete default, dus zo blijven die geldig.
INSERT IGNORE INTO opleiding (opleiding_id, naam) VALUES (1, 'Toegepaste Informatica');

-- 3. Overige opleidingen overnemen uit de bestaande student-strings.
INSERT IGNORE INTO opleiding (naam)
SELECT DISTINCT opleiding
FROM student
WHERE opleiding IS NOT NULL AND opleiding <> ''
  AND opleiding NOT IN (SELECT naam FROM opleiding);

-- 4. Wees-competenties (een opleiding_id zonder match) een placeholder geven,
--    zodat de FK straks geldig is.
INSERT IGNORE INTO opleiding (opleiding_id, naam)
SELECT DISTINCT c.opleiding_id, CONCAT('Opleiding ', c.opleiding_id)
FROM competentie c
LEFT JOIN opleiding o ON c.opleiding_id = o.opleiding_id
WHERE o.opleiding_id IS NULL;

-- 5. student.opleiding_id toevoegen + backfillen via naam-match.
--    De oude string-kolom blijft voorlopig staan voor de zekerheid.
ALTER TABLE student
  ADD COLUMN opleiding_id INT NULL AFTER opleiding;

UPDATE student s
JOIN opleiding o ON s.opleiding = o.naam
SET s.opleiding_id = o.opleiding_id;

ALTER TABLE student
  ADD CONSTRAINT fk_student_opleiding
  FOREIGN KEY (opleiding_id) REFERENCES opleiding(opleiding_id)
  ON DELETE RESTRICT ON UPDATE CASCADE;

-- 6. FK op competentie.opleiding_id.
ALTER TABLE competentie
  ADD CONSTRAINT fk_competentie_opleiding
  FOREIGN KEY (opleiding_id) REFERENCES opleiding(opleiding_id)
  ON DELETE RESTRICT ON UPDATE CASCADE;
