# Status: Wachtwoord vergeten

Dit document geeft een overzicht van wat er momenteel al aanwezig is in de code en wat nog gedaan moet worden voor de user story "wachtwoord vergeten".

## Wat er al aanwezig is

### 1. Frontend: link naar wachtwoord vergeten
- In de loginpagina staat al een link naar de route /wachtwoord-vergeten:
  - frontend/src/views/LoginView.vue
- De router bevat al een route voor deze pagina:
  - frontend/src/router/index.js

### 2. Auth-logica is al deels aanwezig
- De login-flow werkt al via de backend en slaat de sessie op in de auth-store:
  - frontend/src/stores/auth.js
  - backend/src/index.js
- De store ondersteunt role-based redirect naar het juiste dashboard na inloggen.

### 3. Backend: basislogin is aanwezig
- De backend heeft een werkende login-endpoint:
  - POST /api/login
- Deze endpoint controleert de gebruiker in de database, vergelijkt het wachtwoord met bcrypt en geeft een JWT-token terug.

## Wat nog niet aanwezig is

### 1. De echte wachtwoord-vergeten flow is nog niet geïmplementeerd
- De route /wachtwoord-vergeten verwijst momenteel naar de placeholder-pagina:
  - frontend/src/router/index.js
- Er is nog geen echte formulierpagina voor:
  - e-mailadres invoeren
  - reset-link aanvragen
  - nieuw wachtwoord instellen

### 2. Backend-endpoints voor reset zijn nog niet aanwezig
- Er zijn nog geen API-endpoints zoals:
  - POST /api/auth/forgot-password
  - POST /api/auth/reset-password
- Er is nog geen logica voor:
  - token genereren
  - token opslaan
  - token verifiëren
  - wachtwoord updaten

### 3. E-mailverzending ontbreekt nog
- In de backend en dependencies is nog geen e-mailservice aanwezig.
- Er is momenteel geen implementatie voor:
  - nodemailer
  - Mailtrap / SMTP
  - verzenden van resetlink naar de gebruiker

### 4. Databaseondersteuning voor reset-tokens ontbreekt
- In de huidige database-schema staat nog geen tabel of veld voor:
  - reset tokens
  - geldigheidsduur van tokens
  - éénmalig gebruik van tokens
- De bestaande tabel gebruiker bevat alleen logingegevens en rollen.

### 5. Beveiliging en validatie ontbreken nog
- Er is nog geen extra beveiliging voor:
  - beperkte aanvraagfrequentie (rate limiting)
  - geldigheid van reset-tokens
  - veilige token-opslag
  - foutafhandeling bij niet-bestaande e-mailadressen

## Conclusie

Wat al goed is:
- de gebruiker kan naar de pagina komen via de login-link
- de basis-authenticatie is aanwezig in frontend en backend
- de app heeft een goede basisstructuur om deze feature aan te koppelen

Wat nog gedaan moet worden:
1. Een echte wachtwoord-vergeten pagina bouwen in de frontend
2. Backend-endpoints toevoegen voor forgot/reset password
3. E-mailfunctionaliteit integreren
4. Database-tokens toevoegen
5. Veiligheid en validatie implementeren
6. Testen van de volledige flow

## Voorstel voor vervolgstap
De volgende stap is om eerst de backend-functionaliteit te bouwen (forgot/reset password), daarna de frontend-pagina’s en daarna de beveiliging en tests.
