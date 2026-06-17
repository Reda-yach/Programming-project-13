# Checklistcontrole — Status van mijn voorstel volgen

Deze checklist is gecontroleerd op basis van de huidige workspace en de door jou opgegeven Trello-informatie. Er zijn geen codewijzigingen uitgevoerd; dit document bevat alleen de status en de concrete vervolgstappen.

## Samenvatting

De user story is nog niet volledig gerealiseerd. Er zijn wel enkele basisdelen aanwezig, maar de belangrijkste status- en historiekundige functionaliteit ontbreekt nog.

## Status per checklist-item

### Frontend

1. Toon de huidige status als een gekleurde badge (bijv. groen = goedgekeurd)  
   Status: deels gedaan  
   Bevestigd in: frontend/src/components/StatusBadge.vue en frontend/src/views/StudentDashboard.vue  
   Opmerking: er is een badge-component aanwezig, maar de statuslabels zijn nog niet volledig aligned met de gewenste user-story-statussen.

2. Toon een tijdlijn van alle statuswijzigingen met datum  
   Status: nog niet gedaan  
   Opmerking: er is momenteel geen tijdlijn of geschiedenisweergave voor statuswijzigingen in de frontend.

### Backend

3. Maak een functie die de huidige status van een voorstel ophaalt  
   Status: deels gedaan  
   Bevestigd in: backend/src/routes/stage.js  
   Opmerking: er is een API-endpoint voor de status van een stage, maar deze is nog niet specifiek ingericht als "status van het voorstel" met de gewenste statusnamen en geschiedenis.

4. Maak een functie die de statusgeschiedenis ophaalt  
   Status: nog niet gedaan  
   Opmerking: er is geen endpoint of logica gevonden die de statusgeschiedenis voor een voorstel ophaalt.

### Database

5. Gebruik de tabel 'statusgeschiedenis' uit US-06 om de historiek op te slaan  
   Status: nog niet gedaan  
   Bevestigd in: database/schema.sql  
   Opmerking: in de huidige database-definitie ontbreekt een tabel met de naam statusgeschiedenis.

### Acceptance Criteria

6. De student kan de huidige status van zijn/haar voorstel zien  
   Status: deels gedaan  
   Bevestigd in: frontend/src/views/StudentDashboard.vue en frontend/src/views/StudentAanvraag.vue  
   Opmerking: de student ziet een status, maar deze is nog niet volledig gekoppeld aan de gewenste statussemantiek uit de user story.

7. De mogelijke statussen zijn: ingediend, in beoordeling, goedgekeurd, afgekeurd, aanpassingen vereist  
   Status: nog niet volledig gedaan  
   Bevestigd in: backend/src/routes/aanvraag.js, frontend/src/components/StatusBadge.vue, database/schema.sql  
   Opmerking: de huidige statuslogica bevat andere of beperkte statuswaarden en ondersteunt niet alle gevraagde statussen.

8. Als de stagecommissie feedback geeft bij "aanpassingen vereist", is die feedback zichtbaar voor de student  
   Status: nog niet gedaan  
   Opmerking: er is geen zichtbaar feedback- of historiepad voor een student gevonden.

9. De status wordt automatisch bijgewerkt wanneer de stagecommissie een beslissing neemt  
   Status: nog niet gedaan  
   Opmerking: de commissie-view bevat momenteel alleen een placeholder voor beslissingen; er is geen echte backend- of statusupdate-logica gekoppeld.

## Concrete vervolgstappen

1. Definieer de werkelijke statuswaarden voor deze user story:
   - ingediend
   - in beoordeling
   - goedgekeurd
   - afgekeurd
   - aanpassingen vereist

2. Voeg in de database een statusgeschiedenis-tabel toe (of gebruik de bestaande US-06-structuur) om elke statuswijziging met datum en feedback op te slaan.

3. Voeg een backend-endpoint toe om:
   - de huidige status van een voorstel op te halen;
   - de volledige statusgeschiedenis terug te geven.

4. Pas de frontend aan zodat:
   - de student de actuele status duidelijk ziet;
   - een tijdlijn met datum en omschrijving wordt getoond;
   - feedback bij "aanpassingen vereist" zichtbaar is.

5. Koppel de commissie-beslissing aan een echte statusupdate in de backend, zodat de status automatisch wijzigt wanneer een beslissing wordt genomen.

## Conclusie

De basis voor een statusweergave is aanwezig, maar de daadwerkelijke user-story-functionaliteit is nog niet voltooid. De grootste open punten zijn: volledige statuswaarden, statusgeschiedenis, feedbackweergave en automatische statusupdates door de commissie.
