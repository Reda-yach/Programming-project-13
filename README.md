# Programming-project-13
# Stage Monitoring Tool

## Teamleden
- Reda Yachaoui
- Yassine Mellouki
- Killian Mulaj
- Manassé Tedika Nsumbu
- Zaid Mahmood

## Projectbeschrijving
Dit project is een digitale stage monitoring tool voor de opleiding. De applicatie ondersteunt het volledige stageproces van studenten, van aanvraag tot eindevaluatie.

Het doel is om alle stappen van het stageproces te centraliseren in één platform en zo communicatie, opvolging en evaluatie efficiënter te maken.

## Doel van het project
De applicatie moet:
- Het stageaanvraagproces structureren
- De goedkeuringsflow ondersteunen
- Documenten en overeenkomsten beheren
- Wekelijkse opvolging mogelijk maken
- Evaluaties en scoring faciliteren
- Flexibel omgaan met wijzigende evaluatiecriteria

## Doelgebruikers
- Studenten
- Stagecommissie
- Docenten (EhB)
- Bedrijven (eigen login: contract tekenen + mentor voorstellen)
- Stagementoren
- Administratie

## Functionaliteiten

### 1. Stageaanvraag
- Studenten kunnen een stagevoorstel indienen
- Invoer van:
  - Studentgegevens
  - Bedrijfsgegevens
  - Stageperiode
  - Omschrijving van de opdracht
- Status: "Ingediend, wachtend op goedkeuring"

### 2. Goedkeuringsproces
- Stagecommissie kan:
  - Goedkeuren
  - Afkeuren
  - Aanpassingen vragen (met feedback)

### 3. Stageovereenkomst
- Digitaal ondertekenen van het stagecontract
- Ondertekend door student, bedrijf en stagecommissie

### 4. Wekelijkse opvolging
- Studenten vullen logboeken in:
  - Taken
  - Reflectie
  - Problemen / leerpunten
- Inzicht voor:
  - Docenten
  - Bedrijf
- Goedkeuring door stagementor

### 5. Evaluatie
- Evaluatie op basis van competenties
- Competenties zijn:
  - Aanpasbaar (niet hardcoded)
  - Dynamisch uitbreidbaar
- Per competentie:
  - Score
  - Feedback
  - Beschrijving voortgang student

### 6. Tussentijdse evaluatie
- Registratie van feedbackmomenten
- Optionele scoring

### 7. Finale evaluatie
- Eindpresentatie
- Definitieve scoring
- Eindoverzicht per student

## Technologieën
- Frontend: Vue 3 + Vite
- Backend: Node.js (Express)
- Database: MySQL
- Git & GitHub
- Trello (SCRUM/Kanban)

# Database Setup

## Vereisten
- MySQL 8.0 of hoger
- MySQL Workbench (optioneel)

## Lokaal opzetten

### Stap 1 — Verbind met MySQL
Open je terminal en typ:
```bash
mysql -u root -p
```

### Stap 2 — Maak de tabellen aan
```bash
source database/schema.sql
```

### Stap 3 — Laad de testdata in
```bash
source database/seed.sql
```

### Stap 4 — Controleer of alles werkt
```sql
USE stageverloop;
SELECT * FROM gebruiker;
SELECT * FROM competentie;
```
Je zou de seed-gebruikers en de competenties van de opleiding moeten zien.

> **Let op (bestaande databases):** `schema.sql` bevat het volledige, actuele schema —
> voor een nieuwe database heb je enkel `schema.sql` + `seed.sql` nodig. De oude
> migratiescripts staan ter referentie in `database/migrations_archief/` en zijn enkel
> bedoeld om een **bestaande**, oudere database bij te werken. Voer ze niet uit op een
> database die je net met `schema.sql` hebt aangemaakt.

## Tabellen
| Tabel | Omschrijving |
|---|---|
| opleiding | Opleidingen (waaraan competenties en studenten hangen) |
| gebruiker | Alle gebruikers (student, docent, mentor, commissie, bedrijf, admin) |
| student / docent / mentor | Rolspecifieke profielgegevens, gekoppeld aan `gebruiker` |
| bedrijf | Stagebedrijven (met eigen login + status voorgesteld/goedgekeurd) |
| mentor_voorstel | Door een bedrijf voorgestelde mentor, wacht op admin-goedkeuring |
| stage | Stageaanvragen per student (incl. status van ingediend t/m afgerond) |
| stagecontract | Digitale ondertekening door student, bedrijf en commissie |
| logboek | Wekelijkse logboeken per stage |
| logboek_dag | Dagelijkse invoer (Ma–Vr) binnen een weeklogboek |
| logboek_feedback | Mentor-/docentopmerkingen per logboek |
| evaluatie / student_evaluatie | Tussentijdse en finale evaluaties per student |
| competentie / competentie_rubriek | Aanpasbare competenties met scoringsrubrieken (per opleiding) |
| evaluatie_score | Score + toelichting per competentie binnen een evaluatie |
| eindbeoordeling | Finale eindscore (0–20) door de docent |
| commissie_beslissing | Beslissingen van de stagecommissie per stage |
| contactbericht | Berichten tussen docent en mentor van een stage |
| notificatie | Meldingen per gebruiker (met type voor kleur/icoon) |
| wachtwoord_reset | Tijdelijke tokens voor "wachtwoord vergeten" |

## Testgebruikers
| Email | Rol |
|---|---|
| student@ehb.be | STUDENT |
| docent@ehb.be | DOCENT |
| mentor@ehb.be | MENTOR |
| commissie@ehb.be | COMMISSIE |
| admin@ehb.be | ADMIN |

