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
- Stagementoren (bedrijf)
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
- Uploaden van stagecontract
- Registratie van ondertekende documenten

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
- JavaScript (Node.js)
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
USE stagesysteem;
SELECT * FROM users;
SELECT * FROM competenties;
```
Je zou 5 gebruikers en 3 competenties moeten zien.

## Tabellen
| Tabel | Omschrijving |
|---|---|
| users | Alle gebruikers (student, docent, mentor, commissie, admin) |
| stages | Stageaanvragen per student |
| logboeken | Wekelijkse logboeken per stage |
| evaluaties | Tussentijdse en finale evaluaties |
| competentie_profielen | Editeerbare competentieprofielen |
| competenties | Competenties per profiel met gewicht |
| competentie_scores | Scores per competentie per evaluatie |

## Testgebruikers
| Email | Rol |
|---|---|
| student@ehb.be | STUDENT |
| docent@ehb.be | DOCENT |
| mentor@ehb.be | MENTOR |
| commissie@ehb.be | COMMISSIE |
| admin@ehb.be | ADMIN |

