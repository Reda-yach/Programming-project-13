-- Migration: voeg competentie_rubriek tabel toe
-- Admin kan per competentie per score (5/3/1/0) een beschrijving instellen

CREATE TABLE IF NOT EXISTS competentie_rubriek (
    rubriek_id          INT             NOT NULL AUTO_INCREMENT,
    competentie_id      INT             NOT NULL,
    punt                INT             NOT NULL,
    beschrijving        TEXT,

    PRIMARY KEY (rubriek_id),
    UNIQUE KEY uq_comp_punt (competentie_id, punt),
    CONSTRAINT fk_comprubriek_competentie
        FOREIGN KEY (competentie_id) REFERENCES competentie(competentie_id)
        ON DELETE CASCADE ON UPDATE CASCADE
);
