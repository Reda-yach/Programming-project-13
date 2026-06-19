-- Migration: eindbeoordeling-tabel (finale score door de docent)
-- ============================================================
-- Na de eindevaluatie geeft de docent een finale score (op 20) met motivatie
-- voor de hele stage. Eén beoordeling per stage (vandaar UNIQUE op stage_id).

USE stageverloop;

CREATE TABLE IF NOT EXISTS eindbeoordeling (
    eindbeoordeling_id  INT             NOT NULL AUTO_INCREMENT,
    stage_id            INT             NOT NULL,
    beoordelaar_id      INT             NOT NULL,
    score               DECIMAL(5,2)    NOT NULL,
    motivatie           TEXT,
    beoordeeld_op       TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP,

    PRIMARY KEY (eindbeoordeling_id),
    UNIQUE KEY uq_eindbeoordeling_stage (stage_id),
    CONSTRAINT fk_eindbeoordeling_stage
        FOREIGN KEY (stage_id) REFERENCES stage(stage_id)
        ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT fk_eindbeoordeling_beoordelaar
        FOREIGN KEY (beoordelaar_id) REFERENCES gebruiker(gebruiker_id)
        ON DELETE RESTRICT ON UPDATE CASCADE
);
