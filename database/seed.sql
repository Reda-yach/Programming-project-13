USE stagesysteem;

INSERT INTO users (id, email, naam, rol) VALUES
  (UUID(), 'student@ehb.be',   'Jef Janssen',   'STUDENT'),
  (UUID(), 'docent@ehb.be',    'Marie Peeters', 'DOCENT'),
  (UUID(), 'mentor@ehb.be',    'Tom Claes',     'MENTOR'),
  (UUID(), 'commissie@ehb.be', 'An Declercq',   'COMMISSIE'),
  (UUID(), 'admin@ehb.be',     'Admin Beheer',  'ADMIN');

INSERT INTO competentie_profielen (id, naam, actief) VALUES
  (UUID(), 'Toegepaste Informatica 2024-2025', 1);

SET @profiel_id = (SELECT id FROM competentie_profielen WHERE naam = 'Toegepaste Informatica 2024-2025');

INSERT INTO competenties (id, profiel_id, naam, omschrijving, gewicht) VALUES
  (UUID(), @profiel_id, 'Technische vaardigheden',   'Kwaliteit van de technische uitvoering', 0.40),
  (UUID(), @profiel_id, 'Probleemoplossend denken',  'Zelfstandig problemen analyseren en oplossen', 0.30),
  (UUID(), @profiel_id, 'Communicatie',              'Rapporteren en samenwerken', 0.30);
