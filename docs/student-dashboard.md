# Student dashboard — concrete statuscheck

Dit document leest de Trello-checklist van de user story "Student dashboard" en legt concreet vast wat er nu aanwezig is en wat nog ontbreekt.

## 1. Wat is er nu al aanwezig?

### Acceptatiecriteria
- Student ziet zijn naam en stagegegevens.
  - Status: deels aanwezig.
  - In de code is er wel een studentpagina met studentgegevens in [frontend/src/views/StudentAanvraag.vue](../frontend/src/views/StudentAanvraag.vue), maar op het echte dashboard in [frontend/src/views/StudentDashboard.vue](../frontend/src/views/StudentDashboard.vue) is dit nog niet als volledige dashboardweergave ingericht.
- Student ziet de status van zijn logboek.
  - Status: nog niet concreet aanwezig.
  - Er is wel een "Logboek deze week"-blok, maar geen werkelijke status van het logboek of echte data.
- Student ziet recente mentorfeedback.
  - Status: niet aanwezig.
  - Er is momenteel geen feedbacksectie of dataflow voor mentorfeedback in het dashboard.
- Student ziet aankomende deadlines.
  - Status: niet aanwezig.
  - Er is geen concrete deadlineweergave in de huidige dashboardcode.
- Dashboardgegevens worden automatisch bijgewerkt.
  - Status: niet aanwezig.
  - De huidige status komt uit lokale store-data in [frontend/src/stores/stage.js](../frontend/src/stores/stage.js), niet uit een live backend-bron.

### Frontend
- Welkomstkaart.
  - Status: aanwezig.
  - De view toont een welkomsttekst in [frontend/src/views/StudentDashboard.vue](../frontend/src/views/StudentDashboard.vue).
- Logboekstatuskaart.
  - Status: deels aanwezig.
  - Er is een placeholder voor logboek, maar nog geen echte statuslogica.
- Mentorfeedback.
  - Status: niet aanwezig.
- Deadlineoverzicht.
  - Status: niet aanwezig.
- Melding als logboek van deze week nog niet is ingediend.
  - Status: niet aanwezig.
- Meldingen als sectie op het dashboard.
  - Status: deels aanwezig.
  - Er is een meldingenblok, maar het bevat nog geen echte data.

### Backend
- GET /students/:id/dashboard.
  - Status: niet aanwezig.
  - Er is geen endpoint die de dashboardgegevens voor een student teruggeeft.
- Dashboardgegevens verzamelen.
  - Status: niet aanwezig.
  - De huidige backend-routes geven status of aanvraaggegevens terug, maar niet een complete dashboarddataset.

## 2. Wat is nog niet aanwezig?

1. Een echt dashboard-endpoint voor een student.
2. Een weergave van logboekstatus, mentorfeedback en deadlines.
3. Een live update van dashboardinformatie vanuit de backend.
4. Een echte feedback- en meldingsflow op het dashboard.

## 3. Concreet wat moet gebeuren

- Backend: voeg een dashboard-endpoint toe dat naam, stagegegevens, status, feedback en deadlines teruggeeft.
- Frontend: vervang de huidige placeholder-data door echte dashboardgegevens.
- Database: maak een structuur voor statusgeschiedenis, feedback en deadline-informatie als dat nodig is voor de user story.

## 4. Conclusie

De basis van het studentdashboard is aanwezig, maar de checklist-itemen uit Trello zijn nog niet volledig gerealiseerd. De grootste open punten zijn: echte dashboarddata, logboekstatus, feedback, deadlines en automatische updates.
