// Reset de stage-flow voor testen: wist alle aanvraag-/stage-data maar houdt de
// testaccounts + de seed-bedrijf/mentor/docent (die de aanvraag als fallback gebruikt).
// Draaien:  node reset-stageflow.js
const db = require('./src/db').promise();

// Volgorde maakt niet uit: FK-checks staan even uit.
const truncate = [
  'stagecontract',
  'logboek_dag', 'logboek_feedback', 'logboek',
  'rubriek', 'evaluatie_criterium', 'student_evaluatie', 'evaluatie',
  'commissie_beslissing',
  'notificatie',
  'stage',
];

(async () => {
  await db.query('SET FOREIGN_KEY_CHECKS = 0');
  for (const t of truncate) await db.query(`TRUNCATE TABLE ${t}`);
  // Bedrijven die tijdens het testen via aanvragen zijn aangemaakt; de bedrijven
  // waar nog een mentor aan hangt blijven staan (anders breekt de mentor-FK).
  const [del] = await db.query(
    'DELETE FROM bedrijf WHERE bedrijf_id NOT IN (SELECT bedrijf_id FROM mentor)',
  );
  await db.query('SET FOREIGN_KEY_CHECKS = 1');
  console.log(`Gewist: ${truncate.join(', ')} + ${del.affectedRows} los bedrijf/bedrijven`);
  console.log('Klaar — log in als student@ehb.be en dien een nieuwe aanvraag in.');
  process.exit(0);
})().catch((e) => { console.error(e); process.exit(1); });
