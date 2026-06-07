-- ============================================
-- MIGRATIE — stageverloop
-- ============================================
-- Dit script wordt gebruikt wanneer de opleiding
-- evaluatiecriteria wil wijzigen of uitbreiden.
-- Oude evaluaties blijven onaangeroerd.
-- ============================================

USE stageverloop;

-- --------------------------------------------
-- MIGRATIE 1: Nieuw evaluatiecriterium toevoegen
-- --------------------------------------------
-- Wanneer de opleiding een nieuwe competentie
-- toevoegt aan het evaluatieformulier
INSERT INTO evaluatie_criterium (evaluatie_id, opleiding, competentie, naam, score, volgorde)
VALUES
  (1, 'Toegepaste Informatica', 'Projectmatig werken', 'Plannen en organiseren', NULL, 4);

-- --------------------------------------------
-- MIGRATIE 2: Score aanpassen van een criterium
-- --------------------------------------------
-- Wanneer een docent of mentor een score
-- wil corrigeren
UPDATE evaluatie_criterium
SET score = 9
WHERE naam = 'Kwaliteit van code'
  AND evaluatie_id = 1;

-- --------------------------------------------
-- MIGRATIE 3: Stagecontract tekenen
-- --------------------------------------------
-- Wanneer de student het contract ondertekent
UPDATE stagecontract
SET getekend_student = TRUE
WHERE stage_id = 1;

-- Wanneer de mentor het contract ondertekent
UPDATE stagecontract
SET getekend_mentor = TRUE
WHERE stage_id = 1;

-- Wanneer de docent het contract ondertekent
-- en de datum invullen
UPDATE stagecontract
SET getekend_docent = TRUE,
    getekend_op = CURRENT_TIMESTAMP
WHERE stage_id = 1;

-- --------------------------------------------
-- MIGRATIE 4: Stage status updaten
-- --------------------------------------------
-- Wanneer de commissie een stage goedkeurt
-- wordt de status aangepast
UPDATE stage
SET status = 'goedgekeurd'
WHERE stage_id = 1;

-- --------------------------------------------
-- MIGRATIE 5: Notificatie als gelezen markeren
-- --------------------------------------------
-- Wanneer een gebruiker een notificatie
-- heeft gelezen
UPDATE notificatie
SET gelezen = TRUE
WHERE gebruiker_id = 1;

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
SELECT naam, score, volgorde FROM evaluatie_criterium WHERE evaluatie_id = 1;