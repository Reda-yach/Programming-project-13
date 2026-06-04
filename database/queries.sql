-- ============================================
-- STAGESYSTEEM QUERIES
-- ============================================

-- --------------------------------------------
-- Q1: Alle stages per student met status
-- --------------------------------------------
-- Haalt alle stages op van studenten
-- JOIN verbindt de stages tabel met de users tabel
-- WHERE filtert enkel gebruikers met rol STUDENT
SELECT 
  u.naam AS student,
  s.bedrijf_naam,
  s.opdracht,
  s.start_datum,
  s.eind_datum,
  s.status
FROM stages s
JOIN users u ON s.student_id = u.id
WHERE u.rol = 'STUDENT';

-- --------------------------------------------
-- Q2: Logboeken per stage met verificatiestatus
-- --------------------------------------------
-- Haalt alle logboeken op per stage
-- CASE werkt als een if/else:
--   geverifieerd_door is leeg    → "Nog niet geverifieerd"
--   geverifieerd_door is ingevuld → "Geverifieerd"
SELECT
  s.bedrijf_naam,
  l.datum,
  l.taken,
  l.reflectie,
  l.problemen,
  CASE 
    WHEN l.geverifieerd_door IS NULL 
    THEN 'Nog niet geverifieerd'
    ELSE 'Geverifieerd'
  END AS verificatie_status
FROM logboeken l
JOIN stages s ON l.stage_id = s.id
WHERE s.id = @stage_id;

-- --------------------------------------------
-- Q3: Gewogen gemiddelde per student
-- --------------------------------------------
-- score x gewicht per competentie optellen
-- Voorbeeld:
--   Technische vaardigheden:  8.5 x 0.40 = 3.40
--   Probleemoplossend denken: 7.0 x 0.30 = 2.10
--   Communicatie:             9.0 x 0.30 = 2.70
--   Totaal gewogen gemiddelde: 8.20
SELECT
  u.naam AS student,
  ROUND(SUM(cs.score * c.gewicht) / SUM(c.gewicht), 2) AS gewogen_gemiddelde
FROM competentie_scores cs
JOIN competenties c ON cs.competentie_id = c.id
JOIN evaluaties e ON cs.evaluatie_id = e.id
JOIN stages s ON e.stage_id = s.id
JOIN users u ON s.student_id = u.id
WHERE e.type = 'FINAAL'
GROUP BY u.id, u.naam;

-- --------------------------------------------
-- Q4: Actief competentieprofiel met competenties
-- --------------------------------------------
-- Haalt het actieve profiel op met alle competenties
-- WHERE actief = 1 zorgt dat enkel het huidige profiel
-- wordt getoond, niet oude profielen
SELECT
  cp.naam AS profiel,
  c.naam AS competentie,
  c.omschrijving,
  c.gewicht * 100 AS gewicht_procent
FROM competentie_profielen cp
JOIN competenties c ON c.profiel_id = cp.id
WHERE cp.actief = 1;