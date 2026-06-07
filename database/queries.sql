-- ============================================
-- STAGEVERLOOP QUERIES
-- ============================================

USE stageverloop;

-- --------------------------------------------
-- Q1: Alle stages per student met status
-- --------------------------------------------
-- Haalt alle stages op met de naam van de student,
-- het bedrijf en de huidige status
SELECT
  g.naam AS student,
  b.naam AS bedrijf,
  s.stagetitel,
  s.startdatum,
  s.einddatum,
  s.status
FROM stage s
JOIN student st ON s.student_id = st.student_id
JOIN gebruiker g ON st.gebruiker_id = g.gebruiker_id
JOIN bedrijf b ON s.bedrijf_id = b.bedrijf_id
WHERE g.rol = 'student';

-- --------------------------------------------
-- Q2: Logboeken per stage met feedbackstatus
-- --------------------------------------------
-- Haalt alle logboeken op per stage
-- CASE werkt als een if/else:
--   feedback aanwezig  → "Feedback ontvangen"
--   geen feedback      → "Nog geen feedback"
SELECT
  g.naam AS student,
  l.week_nummer,
  l.activiteiten,
  l.uren,
  l.status,
  CASE
    WHEN lf.feedback_id IS NULL
    THEN 'Nog geen feedback'
    ELSE lf.opmerking
  END AS feedback
FROM logboek l
JOIN student st ON l.student_id = st.student_id
JOIN gebruiker g ON st.gebruiker_id = g.gebruiker_id
LEFT JOIN logboek_feedback lf ON l.logboek_id = lf.logboek_id;

-- --------------------------------------------
-- Q3: Gemiddelde score per student
-- --------------------------------------------
-- Berekent het gemiddelde van alle scores
-- per student op basis van evaluatiecriteria
SELECT
  g.naam AS student,
  ROUND(AVG(ec.score), 2) AS gemiddelde_score
FROM evaluatie_criterium ec
JOIN evaluatie e ON ec.evaluatie_id = e.evaluatie_id
JOIN student_evaluatie se ON e.evaluatie_id = se.evaluatie_id
JOIN student st ON se.student_id = st.student_id
JOIN gebruiker g ON st.gebruiker_id = g.gebruiker_id
GROUP BY g.naam;

-- --------------------------------------------
-- Q4: Commissiebeslissingen per stage
-- --------------------------------------------
-- Haalt alle beslissingen op van de commissie
-- per stage met motivatie
SELECT
  g_student.naam AS student,
  b.naam AS bedrijf,
  s.stagetitel,
  g_commissie.naam AS commissielid,
  cd.beslissing,
  cd.motivatie,
  cd.beslist_op
FROM commissie_beslissing cd
JOIN stage s ON cd.stage_id = s.stage_id
JOIN student st ON s.student_id = st.student_id
JOIN gebruiker g_student ON st.gebruiker_id = g_student.gebruiker_id
JOIN bedrijf b ON s.bedrijf_id = b.bedrijf_id
JOIN gebruiker g_commissie ON cd.commissielid_id = g_commissie.gebruiker_id;

-- --------------------------------------------
-- Q5: Stagecontract status per stage
-- --------------------------------------------
-- Toont of het contract al getekend is
-- door student, mentor en docent
SELECT
  g.naam AS student,
  s.stagetitel,
  CASE WHEN sc.getekend_student = 1 THEN 'Ja' ELSE 'Nee' END AS student_getekend,
  CASE WHEN sc.getekend_mentor  = 1 THEN 'Ja' ELSE 'Nee' END AS mentor_getekend,
  CASE WHEN sc.getekend_docent  = 1 THEN 'Ja' ELSE 'Nee' END AS docent_getekend
FROM stagecontract sc
JOIN stage s ON sc.stage_id = s.stage_id
JOIN student st ON s.student_id = st.student_id
JOIN gebruiker g ON st.gebruiker_id = g.gebruiker_id;

-- --------------------------------------------
-- Q6: Ongelezen notificaties per gebruiker
-- --------------------------------------------
-- Haalt alle ongelezen notificaties op
-- per gebruiker
SELECT
  g.naam AS gebruiker,
  g.rol,
  n.bericht,
  n.aangemaakt_op
FROM notificatie n
JOIN gebruiker g ON n.gebruiker_id = g.gebruiker_id
WHERE n.gelezen = FALSE
ORDER BY n.aangemaakt_op DESC;