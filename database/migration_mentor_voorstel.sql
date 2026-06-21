-- Commit 6: mentor_voorstel tabel
-- Draaicommando: mysql -u <user> -p stageverloop < database/migration_mentor_voorstel.sql

CREATE TABLE mentor_voorstel (
    voorstel_id     INT          NOT NULL AUTO_INCREMENT,
    bedrijf_id      INT          NOT NULL,
    stage_id        INT          NULL,
    voornaam        VARCHAR(100) NOT NULL,
    naam            VARCHAR(100) NOT NULL,
    email           VARCHAR(150) NOT NULL,
    telefoonnummer  VARCHAR(20),
    functietitel    VARCHAR(100),
    status          ENUM('voorgesteld','goedgekeurd','afgewezen') NOT NULL DEFAULT 'voorgesteld',
    aangemaakt_op   TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (voorstel_id),
    CONSTRAINT fk_mentorvoorstel_bedrijf
        FOREIGN KEY (bedrijf_id) REFERENCES bedrijf(bedrijf_id)
        ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT fk_mentorvoorstel_stage
        FOREIGN KEY (stage_id) REFERENCES stage(stage_id)
        ON DELETE SET NULL ON UPDATE CASCADE
);
