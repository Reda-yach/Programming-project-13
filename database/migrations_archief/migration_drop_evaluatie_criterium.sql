-- Migration: verwijder evaluatie_criterium + rubriek (oude snapshot-tabellen)
-- ============================================================
-- Deze tabellen kopieerden competentie- en rubriektekst per evaluatie. Ze zijn
-- vervangen door evaluatie_score (scores per competentie_id) en
-- competentie_rubriek (de enige bron van rubriektekst).
--
-- !! DRAAI DIT ALS LAATSTE !!
-- Pas uitvoeren nadat de backend volledig op evaluatie_score draait en niet
-- langer naar evaluatie_criterium / rubriek verwijst. Eerst de datamigratie
-- in migration_evaluatie_score.sql gedraaid hebben.

USE stageverloop;

-- rubriek heeft een FK naar evaluatie_criterium, dus eerst rubriek droppen.
DROP TABLE IF EXISTS rubriek;
DROP TABLE IF EXISTS evaluatie_criterium;
