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

## Backend-flow: KLAAR ✅ (geïmplementeerd)

De volledige backend-flow voor "wachtwoord vergeten" is nu gebouwd.

### 1. Backend-endpoints (aanwezig)
- `POST /api/auth/forgot-password` — body `{ email }`
  - genereert een reset-token, slaat de hash op en mailt de reset-link
  - antwoordt **altijd** generiek (verraadt niet of een e-mailadres bestaat)
- `POST /api/auth/reset-password` — body `{ token, wachtwoord }`
  - verifieert de token (geldig / niet verlopen / niet gebruikt)
  - zet het nieuwe wachtwoord (bcrypt) en markeert de token als gebruikt
- Code: `backend/src/routes/auth.js`, geregistreerd in `backend/src/index.js`

### 2. E-mailverzending (aanwezig)
- `nodemailer` toegevoegd aan de dependencies
- Mailservice: `backend/src/services/mail.js`
  - SMTP via `.env` (`SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `MAIL_FROM`)
  - **dev-fallback**: zonder SMTP-config wordt de reset-link naar de console gelogd,
    zodat de flow lokaal getest kan worden zonder mailserver

### 3. Database-ondersteuning (aanwezig)
- Tabel `wachtwoord_reset` toegevoegd in `database/migratie.sql` (MIGRATIE 12)
  - `token_hash` (SHA-256, ruwe token wordt nooit opgeslagen)
  - `verloopt_op` (geldigheidsduur, standaard 60 min)
  - `gebruikt_op` (eenmalig gebruik)
  - FK naar `gebruiker` met `ON DELETE CASCADE`

### 4. Beveiliging en validatie (aanwezig)
- Rate limiting: max. 3 aanvragen per e-mailadres per 15 minuten (in-memory)
- Token: 32 random bytes, enkel als SHA-256-hash opgeslagen
- Token verloopt en is eenmalig; bij reset worden alle openstaande tokens ongeldig
- Generieke foutafhandeling bij niet-bestaande e-mailadressen
- Minimale wachtwoordlengte van 8 tekens

## Frontend-flow: KLAAR ✅ (geïmplementeerd)

### 1. Aanvraagpagina (aanwezig)
- `frontend/src/views/WachtwoordVergetenView.vue`
  - e-mailadres invoeren → `POST /api/auth/forgot-password`
  - toont na verzending het generieke bevestigingsbericht van de backend
- Route `/wachtwoord-vergeten` wijst nu naar deze pagina (niet langer placeholder):
  - `frontend/src/router/index.js`

### 2. Reset-pagina (aanwezig)
- `frontend/src/views/WachtwoordResetView.vue`
  - leest `token` uit de query (`/wachtwoord-reset?token=...`)
  - nieuw wachtwoord + bevestiging → `POST /api/auth/reset-password`
  - client-side validatie: min. 8 tekens, beide velden gelijk, token aanwezig
- Nieuwe route `/wachtwoord-reset` toegevoegd in `frontend/src/router/index.js`

### 3. Vormgeving (aanwezig)
- Beide pagina's hergebruiken het bestaande login-design-system
  (`login-page`, `login-card`, `form-group`, `btn-primary` …) — visueel
  consistent met `LoginView.vue`.
- `.form-success` toegevoegd in `frontend/src/assets/styles.css` voor de
  succesmeldingen.

> Opmerking: er is in deze repo geen Figma-MCP geconfigureerd (`.mcp.json`
> is leeg) en geen Figma-bestand aanwezig. Als referentie is daarom het
> bestaande login-scherm aangehouden.

## Conclusie

Wat klaar is:
- de volledige backend-flow (endpoints, mail, DB-tokens, beveiliging)
- de twee frontend-pagina's (aanvraag + reset) met routes en validatie
- de gebruiker kan naar de pagina komen via de login-link
- de basis-authenticatie

Wat nog gedaan moet worden:
1. DB: migratie 12 uitvoeren op de database
2. Optioneel: SMTP-gegevens in `.env` zetten voor echte e-mailverzending
3. Testen van de volledige flow (lokaal kan de reset-link uit de
   backend-console gehaald worden — zie dev-fallback in `mail.js`)
