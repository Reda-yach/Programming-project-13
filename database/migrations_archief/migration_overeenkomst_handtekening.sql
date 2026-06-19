-- Migration: voeg muis-handtekeningen toe aan de stageovereenkomst
-- Per partij (student / mentor / docent-in-commissie) een base64 PNG data-URL
-- uit het teken-canvas, plus een timestamp wanneer die partij tekende.

ALTER TABLE stagecontract
  ADD COLUMN handtekening_student LONGTEXT NULL,
  ADD COLUMN handtekening_mentor  LONGTEXT NULL,
  ADD COLUMN handtekening_docent  LONGTEXT NULL,
  ADD COLUMN getekend_student_op  TIMESTAMP NULL,
  ADD COLUMN getekend_mentor_op   TIMESTAMP NULL,
  ADD COLUMN getekend_docent_op   TIMESTAMP NULL;
