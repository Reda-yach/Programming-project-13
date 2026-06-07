-- ============================================
-- SEED DATA — stageverloop
-- ============================================

USE stageverloop;

-- --------------------------------------------
-- 1. GEBRUIKERS
-- --------------------------------------------
INSERT INTO gebruiker (naam, email, telefoonnummer, wachtwoord_hash, rol) VALUES
  ('Jef Janssen',    'student@ehb.be',   '0471000001', 'hash_student',   'student'),
  ('Marie Peeters',  'docent@ehb.be',    '0471000002', 'hash_docent',    'docent'),
  ('Tom Claes',      'mentor@ehb.be',    '0471000003', 'hash_mentor',    'mentor'),
  ('An Declercq',    'commissie@ehb.be', '0471000004', 'hash_commissie', 'commissie'),
  ('Admin Beheer',   'admin@ehb.be',     '0471000005', 'hash_admin',     'admin');

-- --------------------------------------------
-- 2. STUDENT
-- --------------------------------------------
INSERT INTO student (gebruiker_id, opleiding, academiejaar) VALUES
  (1, 'Toegepaste Informatica', '2024-2025');

-- --------------------------------------------
-- 3. DOCENT
-- --------------------------------------------
INSERT INTO docent (gebruiker_id, titel, specialisatie, max_studenten) VALUES
  (2, 'dhr.', 'Webontwikkeling', 5);

-- --------------------------------------------
-- 4. BEDRIJF
-- --------------------------------------------
INSERT INTO bedrijf (naam, adres, sector, contact_email, contact_telefoonnummer) VALUES
  ('Colruyt Group', 'Edingensesteenweg 196, Halle', 'Retail & IT', 'stage@colruyt.be', '02000001');

-- --------------------------------------------
-- 5. MENTOR
-- --------------------------------------------
INSERT INTO mentor (gebruiker_id, bedrijf_id, functietitel) VALUES
  (3, 1, 'Senior Developer');

-- --------------------------------------------
-- 6. STAGE
-- --------------------------------------------
INSERT INTO stage (student_id, bedrijf_id, mentor_id, docent_id, stagetitel, beschrijving, startdatum, einddatum, status) VALUES
  (1, 1, 1, 1, 'Webapplicatie voor interne opvolging', 'Bouwen van een interne tool voor HR', '2025-02-03', '2025-05-30', 'ingediend');

-- --------------------------------------------
-- 7. STAGECONTRACT
-- --------------------------------------------
INSERT INTO stagecontract (stage_id, getekend_student, getekend_mentor, getekend_docent) VALUES
  (1, FALSE, FALSE, FALSE);

-- --------------------------------------------
-- 8. LOGBOEK
-- --------------------------------------------
INSERT INTO logboek (student_id, stage_id, week_nummer, activiteiten, uren, status) VALUES
  (1, 1, 1, 'Kennismaking met het team en opzetten ontwikkelomgeving', 38.00, 'ingediend');

-- --------------------------------------------
-- 9. LOGBOEK FEEDBACK
-- --------------------------------------------
INSERT INTO logboek_feedback (logboek_id, gebruiker_id, opmerking) VALUES
  (1, 3, 'Goede start! Blijf zo verder.');

-- --------------------------------------------
-- 10. EVALUATIE
-- --------------------------------------------
INSERT INTO evaluatie (beoordelaar_id, type, totaalscore, opmerking) VALUES
  (3, 'mentor', 8.50, 'Student toont veel initiatief');

-- --------------------------------------------
-- 11. STUDENT EVALUATIE
-- --------------------------------------------
INSERT INTO student_evaluatie (student_id, evaluatie_id, stage_id) VALUES
  (1, 1, 1);

-- --------------------------------------------
-- 12. EVALUATIECRITERIUM
-- --------------------------------------------
INSERT INTO evaluatie_criterium (evaluatie_id, opleiding, competentie, naam, score, volgorde) VALUES
  (1, 'Toegepaste Informatica', 'Technische vaardigheden', 'Kwaliteit van code', 8, 1),
  (1, 'Toegepaste Informatica', 'Probleemoplossend denken', 'Zelfstandig problemen oplossen', 7, 2),
  (1, 'Toegepaste Informatica', 'Communicatie', 'Rapporteren en samenwerken', 9, 3);

-- --------------------------------------------
-- 13. RUBRIEK
-- --------------------------------------------
INSERT INTO rubriek (criterium_id, punt, beschrijving) VALUES
  (1, 8, 'Code is proper en gedocumenteerd'),
  (2, 7, 'Lost problemen op met hulp'),
  (3, 9, 'Communiceert proactief');

-- --------------------------------------------
-- 14. COMMISSIE BESLISSING
-- --------------------------------------------
INSERT INTO commissie_beslissing (stage_id, commissielid_id, beslissing, motivatie) VALUES
  (1, 4, 'goedgekeurd', 'Stage voldoet aan alle vereisten');

-- --------------------------------------------
-- 15. NOTIFICATIE
-- --------------------------------------------
INSERT INTO notificatie (gebruiker_id, bericht, gelezen) VALUES
  (1, 'Je stage is goedgekeurd!', FALSE),
  (2, 'Nieuwe stage ter opvolging toegewezen', FALSE);