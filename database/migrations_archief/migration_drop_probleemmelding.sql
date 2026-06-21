-- Commit 10: "probleem melden" verwijderd — tabel is niet meer in gebruik.
-- Optioneel: draai dit pas als alle code die naar probleemmelding verwees weg is.
-- Draaicommando: mysql -h <host> -u <user> -p stageverloop < database/migration_drop_probleemmelding.sql

DROP TABLE IF EXISTS probleemmelding;
