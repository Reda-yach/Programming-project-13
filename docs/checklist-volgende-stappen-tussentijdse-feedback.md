# Checklistcontrole en concrete vervolgstappen — Tussentijdse feedback raadplegen

Deze documentatie is alleen een controle en een concrete planning op basis van het Trello-card en de huidige workspace. Er zijn geen codewijzigingen uitgevoerd.

## Huidige stand

Op basis van het meegeleverde Trello-card zijn er in totaal 6 checklist-items:
- 3 items zijn afgerond
- 3 items zijn nog open

De afgeronde delen betreffen voornamelijk:
- een feedbackpagina op frontend niveau
- een backendfunctie om feedback voor een student op te halen
- beveiliging zodat een student alleen zijn eigen feedback ziet

De openstaande onderdelen zijn de volgende:

## Wat nog concreet gedaan moet worden

### 1. Frontend: nieuwe feedback duidelijk markeren als “nieuw”
Doel:
- De student ziet meteen welke feedback nog niet is bekeken.

Concrete implementatie:
1. Voeg in de feedbackweergave een visuele markering toe, bijvoorbeeld:
   - badge “nieuw”
   - andere kleur
   - extra label naast feedback die nog niet gelezen is
2. Zorg dat de indicator echt gekoppeld is aan de status “is_gelezen = false”.
3. Test of de markering zichtbaar is op de studentpagina en niet alleen in een placeholder.

### 2. Backend: functie toevoegen om feedback als gelezen te markeren
Doel:
- Feedback moet na opening als bekeken worden geregistreerd.

Concrete implementatie:
1. Voeg een backend-endpoint toe, bijvoorbeeld:
   - PUT /api/feedback/:id/lezen
2. De functie moet:
   - de feedbackregel vinden op basis van feedback_id
   - is_gelezen aanpassen naar true
   - eventueel een timestamp bijwerken
3. Controleer of alleen de eigenaar van die feedback dit mag doen.

### 3. Database: tabel voor feedback aanmaken
Doel:
- De feedback moet structureel worden opgeslagen en later makkelijk opgehaald kunnen worden.

Concrete implementatie:
1. Voeg een tabel toe met minimaal deze velden:
   - id
   - student_id
   - auteur_id
   - voorstel_id
   - tekst
   - type (tussentijds / finaal)
   - is_gelezen
   - aangemaakt_op
2. Zorg dat de koppelingen correct zijn naar:
   - student
   - gebruiker/auteur
   - voorstel
3. Voeg indien nodig een seed- of testrecord toe om de weergave te kunnen valideren.

## Aanbevolen volgorde

1. Database-tabel toevoegen
2. Backend-endpoint voor “gelezen markeren” implementeren
3. Frontend-markering voor “nieuw” toevoegen
4. Daarna testen met een echte student- en feedbackflow

## Checkpoint voor afronding

De user story is afgerond wanneer:
- de student feedback kan zien
- nieuwe feedback herkenbaar is als nieuw
- feedback na openen als gelezen wordt geregistreerd
- de gegevens structureel in de database opgeslagen zijn

## Samenvatting

Het belangrijkste ontbrekende werk zit in drie concrete punten:
- nieuwe feedback visueel zichtbaar maken
- feedback als gelezen markeren in de backend
- de feedbacktabel in de database aanleggen

Dit document bevat alleen de concrete vervolgstappen; er zijn geen functionaliteiten aangepast in de codebase.
