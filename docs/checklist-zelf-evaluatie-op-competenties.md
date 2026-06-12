# Checklistcontrole — Zelf-evaluatie op competenties

Dit document is alleen een controle op basis van het meegeleverde Trello-card en de huidige workspace. Er zijn geen codewijzigingen uitgevoerd.

## Huidige stand

De user story "Zelf-evaluatie op competenties" is nog niet volledig gerealiseerd. In de huidige codebase zijn er wel algemene evaluatie-onderdelen aanwezig, maar de specifieke functionaliteit uit dit card is nog niet volledig gekoppeld aan een zelfevaluatie per competentie.

### Wat er nu al aanwezig is

- Er bestaan algemene evaluatie- en rubric-gerelateerde onderdelen in de frontend en backend.
- De frontend bevat styling voor rubrieken en evaluatieweergave.
- De database bevat algemene evaluatie-tabellen, maar niet de specifieke structuur die in dit Trello-card is beschreven voor competenties en zelfevaluaties.

### Wat nog ontbreekt

De volgende punten uit het card zijn nog niet concreet afgerond:

1. Een echte studentpagina met per competentie een score en een tekstveld.
2. Een opslaanknop voor de ingevulde zelfevaluatie.
3. Een weergave van het aantal ingevulde competenties.
4. Een klikbare rubric (5 / 3 / 1 / 0) per competentie.
5. Een totaalscore onderaan.
6. Een backend-flow om competenties op te halen, zelfevaluaties op te slaan en eerder ingevulde antwoorden te laden.
7. Een database-opzet met aparte tabellen voor competenties en evaluaties.

## Concrete vervolgstappen

### 1. Frontend

Maak een aparte studentweergave voor de zelfevaluatie op competenties:

1. Toon een lijst van competenties met per competentie:
   - een scorekeuze (bijvoorbeeld 5, 3, 1 of 0)
   - een tekstveld voor de beschrijving van de voortgang
2. Voeg een duidelijke opslaanknop toe.
3. Toon hoeveel competenties al zijn ingevuld.
4. Toon een totale score onderaan de pagina.
5. Zorg dat de rubric-waarden zichtbaar en klikbaar zijn per competentie.

### 2. Backend

Voeg een backend-flow toe voor de zelfevaluatie:

1. Maak een endpoint om de lijst van competenties op te halen.
2. Maak een endpoint om een ingevulde zelfevaluatie op te slaan.
3. Maak een endpoint om een eerder ingevulde zelfevaluatie terug te geven.
4. Zorg dat de student alleen zijn eigen ingevulde evaluaties kan bekijken en opslaan.

### 3. Database

Voeg de data-opzet toe die in het Trello-card is beschreven:

1. Maak een tabel voor competenties met minimaal:
   - id
   - naam
   - omschrijving
2. Maak een tabel voor evaluaties met minimaal:
   - id
   - student_id
   - competentie_id
   - score
   - beschrijving
   - type (zelf / begeleider)
   - aangemaakt_op
3. Zorg dat de koppelingen tussen student, competentie en evaluatie correct zijn.

### 4. Acceptatiecriteria voor afronding

De user story is afgerond wanneer:

- de student per competentie kan evalueren;
- de score en beschrijving zichtbaar en opslaanbaar zijn;
- de totale score en het aantal ingevulde competenties zichtbaar zijn;
- eerdere ingevulde zelfevaluaties opnieuw kunnen worden geladen;
- de data structureel in backend en database is aangesloten.

## Samenvatting

De kern van het werk zit nu in drie concrete onderdelen:

1. een studentvriendelijke frontend voor de competentie-evaluatie;
2. backend-endpoints voor ophalen en opslaan van zelfevaluaties;
3. de database-structuur voor competenties en evaluaties.

Dit document bevat alleen de controle en de concrete vervolgstappen; er zijn geen functionaliteiten aangepast.
