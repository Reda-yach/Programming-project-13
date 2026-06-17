# Checklistcontrole — Finale evaluatie inkijken

Dit document is alleen een controle op basis van de huidige codebase. Er zijn nog geen functionaliteiten aangepast.

## Huidige stand

De user story "Finale evaluatie inkijken" is nog niet volledig gerealiseerd. Er zijn wel basisstructuren voor evaluaties aanwezig, maar de studentweergave voor het lezen van een finale evaluatie na afronding is nog niet echt gekoppeld aan een complete user flow.

## Wat er al aanwezig is

### 1. Backend

In [backend/src/index.js](../backend/src/index.js) zijn de volgende evaluatie-gerelateerde functies al aanwezig:

- GET /api/evaluaties
- GET /api/stages/:id/evaluaties
- GET /api/evaluaties/:id
- POST /api/evaluaties
- PUT /api/evaluaties/criteria/:criterium_id/score

Deze endpoints leveren evaluaties, criteria en rubrieken op en ondersteunen het aanmaken van evaluaties.

### 2. Frontend

In [frontend/src/router/index.js](../frontend/src/router/index.js) zijn routes aanwezig voor:

- /student/evaluatie
- /student/evaluatie-eind

Daarnaast verwijst [frontend/src/views/StudentDashboard.vue](../frontend/src/views/StudentDashboard.vue) naar deze studentpagina's in de dashboardweergave. De navigatie voor evaluaties is daarmee al voorbereid.

### 3. Database

In [database/schema.sql](../database/schema.sql) zijn de volgende relevante tabellen aanwezig:

- evaluatie
- student_evaluatie
- evaluatie_criterium
- rubriek

Deze tabellen vormen de basis voor het opslaan en ophalen van evaluaties en scores.

## Wat nog ontbreekt of nog moet worden gedaan

### 1. Werkelijke studentweergave

De huidige routes naar /student/evaluatie en /student/evaluatie-eind zijn nog niet gekoppeld aan echte functionaliteit; in de router verwijzen ze momenteel naar placeholder-pagina's.

### 2. Finale evaluatie alleen tonen als de stage is afgesloten

De backend haalt evaluaties op op basis van stage of evaluatie-id, maar er is nog geen expliciete check die voorkomt dat een student een finale evaluatie ziet zolang de stage niet officieel is afgerond.

### 3. Duidelijke weergave van feedback en resultaten

Er is geen concrete studentpagina die:

- de finale evaluatie visueel toont;
- zelfevaluatie en beoordeling naast elkaar laat zien;
- feedback per competentie of per onderdeel duidelijk weergeeft;
- een overzicht van de totale score en status laat zien.

### 4. Extra beveiliging en filtering voor de student

De huidige backend ondersteunt ophalen van evaluaties, maar er is nog geen specifieke beveiligings- of filterlaag die zegt:

- alleen de eigen student mag zijn finale evaluatie zien;
- alleen een afgesloten stage of een expliciet afgesloten evaluatie-resultaat wordt teruggegeven.

### 5. Database- en data-opzet voor de user story

De bestaande database bevat algemene evaluatie-tabellen, maar de user story voor "finale evaluatie inkijken" vraagt nog nadrukkelijker om een duidelijke, studentgerichte flow rond afgesloten evaluaties en feedback.

## Samenvatting van de beoordeling

Goed aanwezig:

- basis voor evaluatie-opslag en -ophalen;
- evaluatie- en rubricstructuur in backend en database;
- route- en dashboard-aansluiting in de frontend.

Nog nodig:

- echte studentpagina voor finale evaluatie;
- expliciete controle op afgesloten status;
- gebruikersvriendelijke weergave van resultaten en feedback;
- beveiliging/filtering voor de eigen student.

## Conclusie

De basis is aanwezig, maar de user story is nog niet volledig afgerond. De kern van het werk zit nu in het omzetten van de bestaande evaluatie-onderdelen naar een echte, afsluitbare en studentgerichte finale-evaluatieweergave.
