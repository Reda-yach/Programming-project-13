# Status van aanvraag volgen — concrete implementatie-notities

Dit document geeft een praktische samenvatting van wat er nu in de code aanwezig is, wat al concreet werkt en wat nog moet gebeuren voor de user story "Aanvraagstatus volgen".

## 1. Wat is er nu al aanwezig?

### Frontend
- Er is een algemene statusbadge-component aanwezig in frontend/src/components/StatusBadge.vue.
  - [Technische opmerking] De badge ondersteunt momenteel de labels "In behandeling", "Goedgekeurd", "Afgekeurd" en "Aanpassing".
- De studentdashboard-weergave in frontend/src/views/StudentDashboard.vue toont een statusbadge en een korte statusbeschrijving voor de student.
  - [Technische opmerking] De status in deze view komt uit de Pinia-store en wordt momenteel afgeleid van lokale waarden zoals 'geen', 'in_behandeling' en 'actief'.
- De aanvraagpagina in frontend/src/views/StudentAanvraag.vue laat de ingediende aanvraag zien en blokkeert verdere bewerking nadat de aanvraag is ingediend.
  - [Technische opmerking] Deze flow is voorlopig lokaal in de frontend en niet gekoppeld aan een echte statusgeschiedenis.
- De commissie-view in frontend/src/views/CommissieAanvragenView.vue bevat de UI voor "Goedkeuren / Aanpassingen vragen / Afkeuren".
  - [Technische opmerking] De knoplogica bestaat, maar de beslissingen worden momenteel nog niet echt naar de backend verzonden.

### Backend
- Er is een POST-endpoint voor het indienen van een aanvraag in backend/src/routes/aanvraag.js.
  - [Technische opmerking] Dit endpoint maakt een stage-record aan met status 'ingediend'.
- Er is een GET-endpoint voor de huidige stage-status in backend/src/routes/stage.js.
  - [Technische opmerking] Dit endpoint geeft alleen de huidige status terug; er is geen statushistorie of feedbackverwerking aanwezig.
- Er is een status-update-route in backend/src/routes/begeleider.js.
  - [Technische opmerking] Deze route bevat de logica om een stage als 'goedgekeurd' te markeren, maar er is nog geen volledige besluit- en feedback-flow voor 'afgekeurd' of 'aanpassingen vereist'.

### Database
- De database bevat de tabellen voor stage, bedrijf, mentor en docent.
  - [Technische opmerking] Er is nog geen aparte tabel of structuur gevonden die expliciet statuswijzigingen met feedback en datum registreert.

---

## 2. Wat is nog niet concreet gerealiseerd?

### Acceptatiecriteria die nog open staan
1. Status wordt weergegeven met een duidelijke badge.
   - Status: deels gedaan.
   - [Technische opmerking] De badge is aanwezig, maar de gebruikte statussemantiek is nog niet volledig gelijk aan de gewenste user story.

2. Student ziet de actuele status van zijn aanvraag.
   - Status: deels gedaan.
   - [Technische opmerking] De student ziet een status in de dashboard- en aanvraagpagina, maar de status komt nog uit lokale state en niet uit een volledig backend-gebaseerde statusflow.

3. Feedback wordt zichtbaar bij afkeuring.
   - Status: nog niet gedaan.
   - [Technische opmerking] Er is geen backend- of frontend-pad gevonden dat feedback voor een afgekeurde aanvraag zichtbaar maakt voor de student.

4. Feedback wordt zichtbaar wanneer aanpassingen nodig zijn.
   - Status: nog niet gedaan.
   - [Technische opmerking] De commissie kan feedback invoeren, maar deze wordt nog niet opgeslagen of teruggegeven aan de student.

5. De status wordt automatisch bijgewerkt na beoordeling.
   - Status: nog niet gedaan.
   - [Technische opmerking] De commissie-view heeft nog geen echte backend-koppeling die de status en feedback in de database schrijft.

6. GET /applications/:id (of equivalent status endpoint).
   - Status: deels gedaan.
   - [Technische opmerking] Er is wel een status-endpoint, maar het is niet specifiek ingericht als een studentgerichte aanvraagstatus-API met feedback en historie.

7. Status en feedback ophalen.
   - Status: nog niet gedaan.
   - [Technische opmerking] Er is nog geen endpoint die de huidige status én de feedback/history samen teruggeeft.

---

## 3. Concreet wat moet gebeuren

### Backend
1. Voeg een endpoint toe om de status van een specifieke aanvraag op te halen.
   - Verwacht resultaat: huidige status, mogelijk datum, en eventuele feedback.
2. Voeg een endpoint toe om de volledige statusgeschiedenis op te halen.
   - Verwacht resultaat: lijst met statuswijzigingen met timestamp, status, reden en feedback.
3. Voeg een echte besluit-flow toe voor de commissie.
   - Goedkeuren -> status 'goedgekeurd'
   - Aanpassingen nodig -> status 'aanpassingen vereist' + feedback
   - Afkeuren -> status 'afgekeurd' + feedback
4. Sla de beslissingen en feedback persistent op.
   - [Technische opmerking] Dit kan via een nieuwe tabel of via een uitbreiding van de bestaande stage/feedback-tabellen.

### Frontend
1. Toon voor de student een duidelijke badge per status.
   - Gebruik een vaste set statuswaarden die overeenkomt met de user story.
2. Toon een statushistorie/tijdlijn met datum en beschrijving.
   - Bijvoorbeeld: "Ingediend op 10-06-2026", "Aanpassingen vereist op 12-06-2026".
3. Toon feedback op het dashboard of op de aanvraagpagina.
   - Vooral bij 'afgekeurd' en 'aanpassingen vereist'.
4. Koppel de commissieknoppen echt aan de backend.
   - [Technische opmerking] De huidige handleDecision() in frontend/src/views/CommissieAanvragenView.vue is nog een placeholder.

### Database
1. Voeg een statushistorie-tabel toe (of gebruik een bestaande structuur als dat in de projectdefinitie is vastgelegd).
   - Fields die nodig zijn: status_id, stage_id, status, opmerking, feedback, gewijzigd_op, gewijzigd_door.
2. Zorg dat de stage-statusen consistent zijn in backend, frontend en database.
   - [Technische opmerking] Nu zijn er meerdere statuswoorden (bijv. 'ingediend', 'in_behandeling', 'actief', 'goedgekeurd') die niet volledig overeenkomen met de user-story-terminologie.

---

## 4. Praktische prioritering

1. Statuswaarden en statusflow vastleggen.
2. Backend-endpoints voor status + feedback + historie implementeren.
3. Frontend koppelen aan de echte backend-data.
4. Commissiebeslissingen daadwerkelijk opslaan en tonen.

## 5. Conclusie

De basis voor een statusweergave is aanwezig, maar de volledige user-story-functionaliteit is nog niet afgerond. De grootste open punten zijn: echte statuswaarden, statusgeschiedenis, feedbackweergave en automatische statusupdates na een commissiebeslissing.
