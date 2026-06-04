-- ============================================
-- STAGESYSTEEM QUERIES
-- ============================================

-- --------------------------------------------
-- Q1: Alle stages per student met status
-- --------------------------------------------
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