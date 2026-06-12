-- ============================================================
--  STAGEVERLOOP — MySQL DDL
--  Gegenereerd op basis van het ERD (v6)
-- ============================================================

CREATE DATABASE IF NOT EXISTS stageverloop
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE stageverloop;

-- ------------------------------------------------------------
-- 1. GEBRUIKER
-- ------------------------------------------------------------
CREATE TABLE gebruiker (
    gebruiker_id        INT             NOT NULL AUTO_INCREMENT,
    voornaam            VARCHAR(100)    NOT NULL,
    naam                VARCHAR(100)    NOT NULL,
    email               VARCHAR(150)    NOT NULL UNIQUE,
    telefoonnummer      VARCHAR(20),
    wachtwoord_hash     VARCHAR(255)    NOT NULL,
    rol                 ENUM('student','docent','mentor','commissie','admin') NOT NULL,
    created_at          TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP,

    PRIMARY KEY (gebruiker_id)
);

-- ------------------------------------------------------------
-- 2. STUDENT
-- ------------------------------------------------------------
CREATE TABLE student (
    student_id          INT             NOT NULL AUTO_INCREMENT,
    gebruiker_id        INT             NOT NULL UNIQUE,
    studentnummer       VARCHAR(20)     NOT NULL UNIQUE,
    opleiding           VARCHAR(100)    NOT NULL,
    academiejaar        VARCHAR(20)     NOT NULL,

    PRIMARY KEY (student_id),
    CONSTRAINT fk_student_gebruiker
        FOREIGN KEY (gebruiker_id) REFERENCES gebruiker(gebruiker_id)
        ON DELETE CASCADE ON UPDATE CASCADE
);

-- ------------------------------------------------------------
-- 3. DOCENT
-- ------------------------------------------------------------
CREATE TABLE docent (
    docent_id           INT             NOT NULL AUTO_INCREMENT,
    gebruiker_id        INT             NOT NULL UNIQUE,
    titel               VARCHAR(20),
    specialisatie       VARCHAR(100),
    max_studenten       INT             DEFAULT 5,

    PRIMARY KEY (docent_id),
    CONSTRAINT fk_docent_gebruiker
        FOREIGN KEY (gebruiker_id) REFERENCES gebruiker(gebruiker_id)
        ON DELETE CASCADE ON UPDATE CASCADE
);

-- ------------------------------------------------------------
-- 4. BEDRIJF
-- ------------------------------------------------------------
CREATE TABLE bedrijf (
    bedrijf_id              INT             NOT NULL AUTO_INCREMENT,
    naam                    VARCHAR(150)    NOT NULL,
    adres                   VARCHAR(255),
    sector                  VARCHAR(100),
    contact_email           VARCHAR(150),
    contact_telefoonnummer  VARCHAR(20),

    PRIMARY KEY (bedrijf_id)
);

-- ------------------------------------------------------------
-- 5. MENTOR
-- ------------------------------------------------------------
CREATE TABLE mentor (
    mentor_id           INT             NOT NULL AUTO_INCREMENT,
    gebruiker_id        INT             NOT NULL UNIQUE,
    bedrijf_id          INT             NOT NULL,
    functietitel        VARCHAR(100),

    PRIMARY KEY (mentor_id),
    CONSTRAINT fk_mentor_gebruiker
        FOREIGN KEY (gebruiker_id) REFERENCES gebruiker(gebruiker_id)
        ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT fk_mentor_bedrijf
        FOREIGN KEY (bedrijf_id) REFERENCES bedrijf(bedrijf_id)
        ON DELETE RESTRICT ON UPDATE CASCADE
);

-- ------------------------------------------------------------
-- 6. STAGE
-- ------------------------------------------------------------
CREATE TABLE stage (
    stage_id            INT             NOT NULL AUTO_INCREMENT,
    student_id          INT             NOT NULL,
    bedrijf_id          INT             NOT NULL,
    mentor_id           INT             NOT NULL,
    docent_id           INT,
    stagetitel          VARCHAR(200)    NOT NULL,
    beschrijving        TEXT,
    startdatum          DATE,
    einddatum           DATE,
    status              ENUM('ingediend','in_behandeling','goedgekeurd','afgewezen','bezig','afgerond','aanpassing_gevraagd')
                                        NOT NULL DEFAULT 'ingediend',
    ingediend_op        TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP,

    PRIMARY KEY (stage_id),
    CONSTRAINT fk_stage_student
        FOREIGN KEY (student_id) REFERENCES student(student_id)
        ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT fk_stage_bedrijf
        FOREIGN KEY (bedrijf_id) REFERENCES bedrijf(bedrijf_id)
        ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT fk_stage_mentor
        FOREIGN KEY (mentor_id) REFERENCES mentor(mentor_id)
        ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT fk_stage_docent
        FOREIGN KEY (docent_id) REFERENCES docent(docent_id)
        ON DELETE RESTRICT ON UPDATE CASCADE
);

-- ------------------------------------------------------------
-- 7. STAGECONTRACT
-- ------------------------------------------------------------
CREATE TABLE stagecontract (
    contract_id         INT             NOT NULL AUTO_INCREMENT,
    stage_id            INT             NOT NULL UNIQUE,
    getekend_student    BOOLEAN         NOT NULL DEFAULT FALSE,
    getekend_mentor     BOOLEAN         NOT NULL DEFAULT FALSE,
    getekend_docent     BOOLEAN         NOT NULL DEFAULT FALSE,
    getekend_op         TIMESTAMP       NULL,

    PRIMARY KEY (contract_id),
    CONSTRAINT fk_contract_stage
        FOREIGN KEY (stage_id) REFERENCES stage(stage_id)
        ON DELETE CASCADE ON UPDATE CASCADE
);

-- ------------------------------------------------------------
-- 8. LOGBOEK
-- ------------------------------------------------------------
CREATE TABLE logboek (
    logboek_id          INT             NOT NULL AUTO_INCREMENT,
    student_id          INT             NOT NULL,
    stage_id            INT             NOT NULL,
    week_nummer         INT             NOT NULL,
    activiteiten        TEXT,
    reflectie           TEXT,
    leerpunten          TEXT,
    uren                DECIMAL(5,2),
    status              ENUM('draft','ingediend','goedgekeurd')
                                        NOT NULL DEFAULT 'draft',
    ingediend_op        TIMESTAMP       NULL,

    PRIMARY KEY (logboek_id),
    CONSTRAINT fk_logboek_student
        FOREIGN KEY (student_id) REFERENCES student(student_id)
        ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT fk_logboek_stage
        FOREIGN KEY (stage_id) REFERENCES stage(stage_id)
        ON DELETE CASCADE ON UPDATE CASCADE
);

-- ------------------------------------------------------------
-- 9. LOGBOEK FEEDBACK
-- ------------------------------------------------------------
CREATE TABLE logboek_feedback (
    feedback_id         INT             NOT NULL AUTO_INCREMENT,
    logboek_id          INT             NOT NULL,
    gebruiker_id        INT             NOT NULL,
    opmerking           TEXT            NOT NULL,
    created_at          TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP,

    PRIMARY KEY (feedback_id),
    CONSTRAINT fk_feedback_logboek
        FOREIGN KEY (logboek_id) REFERENCES logboek(logboek_id)
        ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT fk_feedback_gebruiker
        FOREIGN KEY (gebruiker_id) REFERENCES gebruiker(gebruiker_id)
        ON DELETE RESTRICT ON UPDATE CASCADE
);

-- ------------------------------------------------------------
-- 10. EVALUATIE
-- ------------------------------------------------------------
CREATE TABLE evaluatie (
    evaluatie_id        INT             NOT NULL AUTO_INCREMENT,
    beoordelaar_id      INT             NOT NULL,
    type                ENUM('student','mentor','docent') NOT NULL,
    totaalscore         DECIMAL(5,2),
    opmerking           TEXT,
    ingevuld_op         TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP,

    PRIMARY KEY (evaluatie_id),
    CONSTRAINT fk_evaluatie_beoordelaar
        FOREIGN KEY (beoordelaar_id) REFERENCES gebruiker(gebruiker_id)
        ON DELETE RESTRICT ON UPDATE CASCADE
);

-- ------------------------------------------------------------
-- 11. STUDENT EVALUATIE  (tussentabel)
-- ------------------------------------------------------------
CREATE TABLE student_evaluatie (
    student_evaluatie_id    INT         NOT NULL AUTO_INCREMENT,
    student_id              INT         NOT NULL,
    evaluatie_id            INT         NOT NULL,
    stage_id                INT         NOT NULL,

    PRIMARY KEY (student_evaluatie_id),
    CONSTRAINT fk_se_student
        FOREIGN KEY (student_id) REFERENCES student(student_id)
        ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT fk_se_evaluatie
        FOREIGN KEY (evaluatie_id) REFERENCES evaluatie(evaluatie_id)
        ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT fk_se_stage
        FOREIGN KEY (stage_id) REFERENCES stage(stage_id)
        ON DELETE RESTRICT ON UPDATE CASCADE
);

-- ------------------------------------------------------------
-- 12. EVALUATIECRITERIUM
-- ------------------------------------------------------------
CREATE TABLE evaluatie_criterium (
    criterium_id        INT             NOT NULL AUTO_INCREMENT,
    evaluatie_id        INT             NOT NULL,
    opleiding           VARCHAR(100)    NOT NULL,
    competentie         VARCHAR(150)    NOT NULL,
    naam                VARCHAR(150)    NOT NULL,
    score               INT,
    gewicht             DECIMAL(5,2)    NOT NULL DEFAULT 1.00,
    volgorde            INT             NOT NULL DEFAULT 0,

    PRIMARY KEY (criterium_id),
    CONSTRAINT fk_criterium_evaluatie
        FOREIGN KEY (evaluatie_id) REFERENCES evaluatie(evaluatie_id)
        ON DELETE CASCADE ON UPDATE CASCADE
);

-- ------------------------------------------------------------
-- 13. RUBRIEK
-- ------------------------------------------------------------
CREATE TABLE rubriek (
    rubriek_id          INT             NOT NULL AUTO_INCREMENT,
    criterium_id        INT             NOT NULL,
    punt                INT             NOT NULL,
    beschrijving        TEXT            NOT NULL,

    PRIMARY KEY (rubriek_id),
    CONSTRAINT fk_rubriek_criterium
        FOREIGN KEY (criterium_id) REFERENCES evaluatie_criterium(criterium_id)
        ON DELETE CASCADE ON UPDATE CASCADE
);

-- ------------------------------------------------------------
-- 14. COMMISSIE BESLISSING
-- ------------------------------------------------------------
CREATE TABLE commissie_beslissing (
    beslissing_id       INT             NOT NULL AUTO_INCREMENT,
    stage_id            INT             NOT NULL,
    commissielid_id     INT             NOT NULL,
    beslissing          ENUM('goedgekeurd','afgewezen','aanpassing_gevraagd') NOT NULL,
    motivatie           TEXT,
    beslist_op          TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP,

    PRIMARY KEY (beslissing_id),
    CONSTRAINT fk_beslissing_stage
        FOREIGN KEY (stage_id) REFERENCES stage(stage_id)
        ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT fk_beslissing_commissielid
        FOREIGN KEY (commissielid_id) REFERENCES gebruiker(gebruiker_id)
        ON DELETE RESTRICT ON UPDATE CASCADE
);

-- ------------------------------------------------------------
-- 15. NOTIFICATIE
-- ------------------------------------------------------------
CREATE TABLE notificatie (
    notificatie_id      INT             NOT NULL AUTO_INCREMENT,
    gebruiker_id        INT             NOT NULL,
    bericht             TEXT            NOT NULL,
    gelezen             BOOLEAN         NOT NULL DEFAULT FALSE,
    aangemaakt_op       TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP,

    PRIMARY KEY (notificatie_id),
    CONSTRAINT fk_notificatie_gebruiker
        FOREIGN KEY (gebruiker_id) REFERENCES gebruiker(gebruiker_id)
        ON DELETE CASCADE ON UPDATE CASCADE
);
-- ------------------------------------------------------------
-- 16. COMPETENTIE
-- ------------------------------------------------------------
CREATE TABLE competentie (
    competentie_id      INT             NOT NULL AUTO_INCREMENT,
    naam                VARCHAR(255)    NOT NULL,
    omschrijving        TEXT,
    gewicht             DECIMAL(5,2)    NOT NULL DEFAULT 0,
    opleiding_id        INT             NOT NULL,
    is_actief           BOOLEAN         NOT NULL DEFAULT TRUE,
    created_at          TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP,

    PRIMARY KEY (competentie_id)
);