-- ============================================
-- STAGESYSTEEM DATABASE
-- MySQL 8.0+
-- ============================================

CREATE DATABASE IF NOT EXISTS stagesysteem
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE stagesysteem;

-- --------------------------------------------
-- 1. USERS
-- --------------------------------------------
CREATE TABLE users (
  id         VARCHAR(36)  NOT NULL DEFAULT (UUID()),
  email      VARCHAR(255) NOT NULL,
  naam       VARCHAR(255) NOT NULL,
  rol        ENUM('STUDENT','DOCENT','MENTOR','COMMISSIE','ADMIN') NOT NULL,
  created_at DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_users_email (email)
);

-- --------------------------------------------
-- 2. COMPETENTIE_PROFIELEN
-- --------------------------------------------
CREATE TABLE competentie_profielen (
  id     VARCHAR(36)  NOT NULL DEFAULT (UUID()),
  naam   VARCHAR(255) NOT NULL,
  actief TINYINT(1)   NOT NULL DEFAULT 1,
  PRIMARY KEY (id)
);

-- --------------------------------------------
-- 3. COMPETENTIES
-- --------------------------------------------
CREATE TABLE competenties (
  id           VARCHAR(36)  NOT NULL DEFAULT (UUID()),
  profiel_id   VARCHAR(36)  NOT NULL,
  naam         VARCHAR(255) NOT NULL,
  omschrijving TEXT         NOT NULL,
  gewicht      DECIMAL(5,4) NOT NULL,
  PRIMARY KEY (id),
  CONSTRAINT fk_competenties_profiel
    FOREIGN KEY (profiel_id)
    REFERENCES competentie_profielen(id)
    ON DELETE CASCADE
);

-- --------------------------------------------
-- 4. STAGES
-- --------------------------------------------
CREATE TABLE stages (
  id           VARCHAR(36)  NOT NULL DEFAULT (UUID()),
  student_id   VARCHAR(36)  NOT NULL,
  bedrijf_naam VARCHAR(255) NOT NULL,
  opdracht     TEXT         NOT NULL,
  start_datum  DATE         NOT NULL,
  eind_datum   DATE         NOT NULL,
  status       ENUM(
    'INGEDIEND',
    'IN_BEOORDELING',
    'AANPASSINGEN_VEREIST',
    'GOEDGEKEURD',
    'ACTIEF',
    'AFGEROND',
    'AFGEKEURD'
  ) NOT NULL DEFAULT 'INGEDIEND',
  created_at   DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  CONSTRAINT fk_stages_student
    FOREIGN KEY (student_id)
    REFERENCES users(id)
);

-- --------------------------------------------
-- 5. LOGBOEKEN
-- --------------------------------------------
CREATE TABLE logboeken (
  id                VARCHAR(36) NOT NULL DEFAULT (UUID()),
  stage_id          VARCHAR(36) NOT NULL,
  datum             DATE        NOT NULL,
  taken             TEXT        NOT NULL,
  reflectie         TEXT        NOT NULL,
  problemen         TEXT        NULL,
  geverifieerd_door VARCHAR(36) NULL,
  geverifieerd_op   DATETIME    NULL,
  PRIMARY KEY (id),
  CONSTRAINT fk_logboeken_stage
    FOREIGN KEY (stage_id)
    REFERENCES stages(id)
    ON DELETE CASCADE,
  CONSTRAINT fk_logboeken_mentor
    FOREIGN KEY (geverifieerd_door)
    REFERENCES users(id)
    ON DELETE SET NULL
);

-- --------------------------------------------
-- 6. EVALUATIES
-- --------------------------------------------
CREATE TABLE evaluaties (
  id         VARCHAR(36) NOT NULL DEFAULT (UUID()),
  stage_id   VARCHAR(36) NOT NULL,
  type       ENUM('TUSSENTIJDS','FINAAL') NOT NULL,
  created_at DATETIME    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  CONSTRAINT fk_evaluaties_stage
    FOREIGN KEY (stage_id)
    REFERENCES stages(id)
    ON DELETE CASCADE
);

-- --------------------------------------------
-- 7. COMPETENTIE_SCORES
-- --------------------------------------------
CREATE TABLE competentie_scores (
  id              VARCHAR(36)  NOT NULL DEFAULT (UUID()),
  evaluatie_id    VARCHAR(36)  NOT NULL,
  competentie_id  VARCHAR(36)  NOT NULL,
  score           DECIMAL(4,2) NOT NULL,
  student_notitie TEXT         NULL,
  mentor_feedback TEXT         NULL,
  docent_feedback TEXT         NULL,
  PRIMARY KEY (id),
  CONSTRAINT fk_scores_evaluatie
    FOREIGN KEY (evaluatie_id)
    REFERENCES evaluaties(id)
    ON DELETE CASCADE,
  CONSTRAINT fk_scores_competentie
    FOREIGN KEY (competentie_id)
    REFERENCES competenties(id)
);
