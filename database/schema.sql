-- ============================================================
--  STAGEVERLOOP — MySQL DDL
--  Gegenereerd op basis van het ERD (v6)
-- ============================================================

CREATE DATABASE IF NOT EXISTS stageverloop
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE stageverloop;

-- ------------------------------------------------------------
-- 0. OPLEIDING
-- ------------------------------------------------------------
CREATE TABLE opleiding (
    opleiding_id        INT             NOT NULL AUTO_INCREMENT,
    naam                VARCHAR(150)    NOT NULL,

    PRIMARY KEY (opleiding_id),
    UNIQUE KEY uq_opleiding_naam (naam)
);

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
    afdeling            VARCHAR(150),
    -- Actieve sessie: bij elke login opnieuw gezet. Tokens met een andere
    -- sessie_id zijn ongeldig → ergens anders inloggen logt de rest uit.
    sessie_id           VARCHAR(64),
    is_actief           BOOLEAN         NOT NULL DEFAULT TRUE,
    commissielid        BOOLEAN         NOT NULL DEFAULT FALSE,
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
    opleiding_id        INT             NULL,
    academiejaar        VARCHAR(20)     NOT NULL,

    PRIMARY KEY (student_id),
    CONSTRAINT fk_student_gebruiker
        FOREIGN KEY (gebruiker_id) REFERENCES gebruiker(gebruiker_id)
        ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT fk_student_opleiding
        FOREIGN KEY (opleiding_id) REFERENCES opleiding(opleiding_id)
        ON DELETE RESTRICT ON UPDATE CASCADE
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
    straatnaam              VARCHAR(150),
    huisnummer              VARCHAR(10),
    postcode                VARCHAR(10),
    gemeente                VARCHAR(100),
    provincie               VARCHAR(50),
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
    -- Muis-handtekeningen, opgeslagen als base64 PNG data-URL uit het canvas.
    -- 'docent' = de docent in de stagecommissie (zelfde persoon die goedkeurt).
    handtekening_student LONGTEXT       NULL,
    handtekening_mentor  LONGTEXT       NULL,
    handtekening_docent  LONGTEXT       NULL,
    getekend_student_op  TIMESTAMP      NULL,
    getekend_mentor_op   TIMESTAMP      NULL,
    getekend_docent_op   TIMESTAMP      NULL,
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

    gevalideerd_door    INT             NULL,
    gevalideerd_op      TIMESTAMP       NULL,

    PRIMARY KEY (logboek_id),
    CONSTRAINT fk_logboek_student
        FOREIGN KEY (student_id) REFERENCES student(student_id)
        ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT fk_logboek_stage
        FOREIGN KEY (stage_id) REFERENCES stage(stage_id)
        ON DELETE CASCADE ON UPDATE CASCADE
);

-- ------------------------------------------------------------
-- 8B. LOGBOEK DAG  (dagelijkse invoer Ma–Vr binnen een weeklogboek)
-- ------------------------------------------------------------
CREATE TABLE logboek_dag (
    dag_id              INT             NOT NULL AUTO_INCREMENT,
    logboek_id          INT             NOT NULL,
    dag                 ENUM('maandag','dinsdag','woensdag','donderdag','vrijdag') NOT NULL,
    activiteiten        TEXT,
    reflectie           TEXT,
    leerpunten          TEXT,
    uren                DECIMAL(4,2),

    PRIMARY KEY (dag_id),
    CONSTRAINT fk_logboek_dag_logboek
        FOREIGN KEY (logboek_id) REFERENCES logboek(logboek_id)
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
    fase                ENUM('tussentijds','finaal') NOT NULL DEFAULT 'tussentijds',
    totaalscore         DECIMAL(5,2),
    opmerking           TEXT,
    ingevuld_op         TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP,
    ingediend           BOOLEAN         NOT NULL DEFAULT FALSE,

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

-- (12/13: evaluatie_criterium + rubriek verwijderd — vervangen door
--  evaluatie_score, gedefinieerd na de competentie-tabel verderop.)

-- ------------------------------------------------------------
-- 14. COMPETENTIE RUBRIEK (per score-niveau beschrijving, ingesteld door admin)
-- ------------------------------------------------------------
CREATE TABLE competentie_rubriek (
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

-- ------------------------------------------------------------
-- 15. COMMISSIE BESLISSING
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
    notificatie_id      INT                                        NOT NULL AUTO_INCREMENT,
    gebruiker_id        INT                                        NOT NULL,
    bericht             TEXT                                       NOT NULL,
    type                ENUM('info','goed','waarschuwing','fout')  NOT NULL DEFAULT 'info',
    gelezen             BOOLEAN                                    NOT NULL DEFAULT FALSE,
    aangemaakt_op       TIMESTAMP                                  NOT NULL DEFAULT CURRENT_TIMESTAMP,

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

    PRIMARY KEY (competentie_id),
    CONSTRAINT fk_competentie_opleiding
        FOREIGN KEY (opleiding_id) REFERENCES opleiding(opleiding_id)
        ON DELETE RESTRICT ON UPDATE CASCADE
);
-- ------------------------------------------------------------
-- 17. COMPETENTIESET
-- ------------------------------------------------------------
CREATE TABLE competentieset (
    set_id              INT             NOT NULL AUTO_INCREMENT,
    naam                VARCHAR(255)    NOT NULL,
    opleiding           VARCHAR(255)    NOT NULL,
    jaar                VARCHAR(20)     NOT NULL,
    is_actief           BOOLEAN         NOT NULL DEFAULT TRUE,
    created_at          TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP,

    PRIMARY KEY (set_id)

);

-- ------------------------------------------------------------
-- 18. EVALUATIE SCORE (score per competentie per evaluatie)
-- ------------------------------------------------------------
-- Vervangt evaluatie_criterium + rubriek: in plaats van competentie- en
-- rubriektekst per evaluatie te kopieren, verwijst elke score rechtstreeks
-- naar competentie_id. De vergelijking student/mentor/docent wordt zo een
-- simpele JOIN en de rubriektekst staat enkel in competentie_rubriek.
CREATE TABLE evaluatie_score (
    score_id            INT             NOT NULL AUTO_INCREMENT,
    evaluatie_id        INT             NOT NULL,
    competentie_id      INT             NOT NULL,
    score               INT             NULL,
    toelichting         TEXT            NULL,

    PRIMARY KEY (score_id),
    UNIQUE KEY uq_eval_competentie (evaluatie_id, competentie_id),
    CONSTRAINT fk_evalscore_evaluatie
        FOREIGN KEY (evaluatie_id) REFERENCES evaluatie(evaluatie_id)
        ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT fk_evalscore_competentie
        FOREIGN KEY (competentie_id) REFERENCES competentie(competentie_id)
        ON DELETE CASCADE ON UPDATE CASCADE
);

-- ------------------------------------------------------------
-- 19. EINDBEOORDELING (finale score door de docent na de eindevaluatie)
-- ------------------------------------------------------------
CREATE TABLE eindbeoordeling (
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

-- ============================================
-- WACHTWOORD_RESET — "wachtwoord vergeten"
-- ============================================
-- We slaan NOOIT de ruwe reset-token op, enkel een SHA-256 hash ervan.
-- De ruwe token gaat alleen per e-mail naar de gebruiker. Zo kan een lek
-- van de database niet leiden tot misbruik van openstaande reset-links.
CREATE TABLE wachtwoord_reset (
    reset_id        INT             NOT NULL AUTO_INCREMENT,
    gebruiker_id    INT             NOT NULL,
    token_hash      CHAR(64)        NOT NULL,          -- SHA-256 hex (64 tekens)
    verloopt_op     DATETIME        NOT NULL,          -- vervaltijd (bv. +1 uur)
    gebruikt_op     DATETIME        NULL,              -- gevuld zodra de token gebruikt is (eenmalig)
    aangemaakt_op   TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP,

    PRIMARY KEY (reset_id),
    UNIQUE KEY uq_token_hash (token_hash),
    KEY idx_reset_gebruiker (gebruiker_id),
    CONSTRAINT fk_reset_gebruiker
        FOREIGN KEY (gebruiker_id) REFERENCES gebruiker(gebruiker_id)
        ON DELETE CASCADE ON UPDATE CASCADE
);