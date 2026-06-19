# Student dashboard — concrete statuscheck

Dit document volgt de Trello-checklist van de user story "Student dashboard" en legt vast wat er nu aanwezig is. Laatst bijgewerkt: 12 juni 2026.

## 1. Acceptatiecriteria

- **Student ziet zijn naam en stagegegevens** — ✅ aanwezig.
  - [StudentDashboard.vue](../frontend/src/views/StudentDashboard.vue) toont naam, opleiding/jaar en de stage-kaart (bedrijf, stageperiode, status) met live data uit de backend.
- **Student ziet de status van zijn logboek** — ✅ aanwezig.
  - "Logboek deze week" toont een Ma–Vr dag-raster met echte per-dag-invoer (groen vinkje = uren ingevuld) plus een statusbadge (Concept/Ingediend/Goedgekeurd).
- **Student ziet recente mentorfeedback** — ✅ aanwezig.
  - Feedback wordt uit `logboek_feedback` opgehaald en samen met meldingen in één "Meldingen & Feedback"-tijdlijn getoond.
- **Student ziet aankomende deadlines** — ✅ aanwezig (als evaluaties).
  - Rij 2 toont **Tussentijdse Evaluatie** en **Eindevaluatie** met beschikbaarheid (BESCHIKBAAR / IN AFWACHTING), afgeleid uit de stageperiode.
- **Dashboardgegevens worden automatisch bijgewerkt** — ✅ aanwezig.
  - Alle data komt live uit `GET /api/students/:id/dashboard`; de view laadt deze bij elke `onMounted` opnieuw op (geen lokale store-mockdata meer).

## 2. Frontend

- **Welkomstkaart** — ✅ "Welkom terug, {naam}" (actief) / "Welkom {naam}" (inactief) + subtitel.
- **Stage Status-kaart** — ✅ ACTIEF/INACTIEF-pill, bedrijf, stageperiode (dd/mm/jjjj) en voortgangsbalk ("Week N van M · K resterend").
- **Logboekstatuskaart** — ✅ dag-raster Ma–Vr met echte data + statusbadge.
- **Mentorfeedback** — ✅ samengevoegd in "Meldingen & Feedback".
- **Evaluatie-overzicht** — ✅ Tussentijdse + Eindevaluatie-kaarten.
- **Melding "logboek deze week nog niet ingediend"** — ✅ gele waarschuwingsbalk bovenaan.
- **Meldingen-sectie** — ✅ "Meldingen & Feedback" met gekleurde status-iconen (✓ groen / ⚠ geel / ✕ rood) en relatieve tijd.

## 3. Backend

- **`GET /api/students/:id/dashboard`** — ✅ aanwezig in [studentdashboardroute.js](../backend/src/routes/studentdashboardroute.js), beveiligd met `verifyToken`.
  - `:id` is de **gebruiker_id** uit de JWT; de route zoekt zelf de student op. Een student kan alleen zijn eigen dashboard opvragen (staff-rollen mogen alles).
- **Dashboarddataset verzamelen** — ✅ in één call: studentprofiel, actieve/recentste stage, weeklogboek + per-dag-data (`logboek_dag`), recente feedback, ongelezen meldingen en afgeleide deadlines.

## 4. Designkoppeling

De implementatie volgt het Figma-prototype (Prototype_groep13), schermen voor de actieve, inactieve en meldingen-toestand.

## 5. Afgewerkte verfijningen

1. **Notificatie-type** — ✅ `notificatie` heeft nu een `type`-kolom (`info`/`goed`/`waarschuwing`/`fout`), zie [schema.sql](../database/schema.sql) en migratie 17 in [migratie.sql](../database/migrations_archief/migratie.sql). De dashboard-route geeft `type` mee en het dashboard kleurt het icoon hierop; de tekst-heuristiek blijft enkel als fallback voor oude rijen zonder type.
2. **Rol-dropdown** — ✅ de [TopBar](../frontend/src/components/TopBar.vue) toont rechtsboven een rol-dropdown (rol + ▾) die de accountinfo (naam, e-mail, rol) toont; "Uitloggen" wist nu ook echt de sessie en navigeert naar het loginscherm.

## 6. Conclusie

De user story "Student dashboard" is volledig gerealiseerd: een live dashboard-endpoint, echte stage-, logboek-, feedback- en evaluatiegegevens, een weergave die het Figma-ontwerp volgt, getypeerde meldingen en een rol-dropdown in de topbar.
