-- Commit 2: contract getekend door bedrijf i.p.v. mentor
-- Draaicommando: mysql -u <user> -p stageverloop < database/migration_contract_bedrijf.sql

ALTER TABLE stagecontract
  ADD COLUMN getekend_bedrijf     BOOLEAN   NOT NULL DEFAULT FALSE AFTER getekend_docent,
  ADD COLUMN handtekening_bedrijf LONGTEXT  NULL     AFTER handtekening_docent,
  ADD COLUMN getekend_bedrijf_op  TIMESTAMP NULL     AFTER getekend_docent_op;
