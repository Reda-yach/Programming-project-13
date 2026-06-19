-- Migration: voeg de kolom 'fase' toe aan evaluatie
-- ============================================================
-- De code (en schema.sql) verwachten een fase-kolom ('tussentijds'/'finaal')
-- om de tussentijdse van de eindevaluatie te onderscheiden, maar oudere
-- databases misten die kolom. Draai dit eenmalig op zo'n bestaande database.

USE stageverloop;

ALTER TABLE evaluatie
  ADD COLUMN fase ENUM('tussentijds','finaal') NOT NULL DEFAULT 'tussentijds' AFTER type;
