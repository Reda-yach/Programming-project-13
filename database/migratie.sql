-- ============================================
-- MIGRATIE: Nieuw competentieprofiel activeren
-- ============================================

-- Stap 1: Oud profiel deactiveren
UPDATE competentie_profielen
SET actief = 0
WHERE actief = 1;

-- Stap 2: Nieuw profiel aanmaken
INSERT INTO competentie_profielen (id, naam, actief) VALUES
  (UUID(), 'Toegepaste Informatica 2025-2026', 1);

-- Stap 3: Nieuwe competenties toevoegen
SET @nieuw_profiel_id = (SELECT id FROM competentie_profielen WHERE naam = 'Toegepaste Informatica 2025-2026');

INSERT INTO competenties (id, profiel_id, naam, omschrijving, gewicht) VALUES
  (UUID(), @nieuw_profiel_id, 'Technische vaardigheden',   'Kwaliteit van de technische uitvoering', 0.35),
  (UUID(), @nieuw_profiel_id, 'Probleemoplossend denken',  'Zelfstandig problemen analyseren en oplossen', 0.25),
  (UUID(), @nieuw_profiel_id, 'Communicatie',              'Rapporteren en samenwerken', 0.20),
  (UUID(), @nieuw_profiel_id, 'Projectmatig werken',       'Plannen en organiseren van taken', 0.20);

-- Stap 4: Controleer het resultaat
SELECT cp.naam AS profiel, cp.actief, c.naam AS competentie, c.gewicht * 100 AS gewicht_procent
FROM competentie_profielen cp
JOIN competenties c ON c.profiel_id = cp.id
ORDER BY cp.actief DESC;