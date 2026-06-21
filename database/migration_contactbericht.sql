-- Commit 12: contactberichten tussen docent en mentor van eenzelfde stage.
-- Losse berichten (geen volwaardige chat).
-- Draaicommando: mysql -h <host> -u <user> -p stageverloop < database/migration_contactbericht.sql

CREATE TABLE contactbericht (
    bericht_id      INT       NOT NULL AUTO_INCREMENT,
    stage_id        INT       NOT NULL,
    afzender_id     INT       NOT NULL,
    ontvanger_id    INT       NOT NULL,
    bericht         TEXT      NOT NULL,
    gelezen         BOOLEAN   NOT NULL DEFAULT FALSE,
    aangemaakt_op   TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (bericht_id),
    CONSTRAINT fk_contact_stage
        FOREIGN KEY (stage_id) REFERENCES stage(stage_id)
        ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT fk_contact_afzender
        FOREIGN KEY (afzender_id) REFERENCES gebruiker(gebruiker_id)
        ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT fk_contact_ontvanger
        FOREIGN KEY (ontvanger_id) REFERENCES gebruiker(gebruiker_id)
        ON DELETE CASCADE ON UPDATE CASCADE
);
