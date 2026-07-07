/**
 * AO Partenaires — réception des leads du formulaire dans Google Sheets
 * + flux JSON sécurisé pour l'espace admin BTPilot.
 *
 * INSTALLATION (5 minutes) :
 * 1. Créez un Google Sheet vierge (https://sheets.new).
 *    En ligne 1, mettez les en-têtes :  Date | Nom | Entreprise | Métier | Zone | Téléphone | Email
 * 2. Dans le Sheet : menu  Extensions > Apps Script.
 * 3. Supprimez le code par défaut, collez TOUT ce fichier, puis Enregistrez.
 * 4. Cliquez sur "Déployer" > "Nouveau déploiement" > type "Application Web".
 *      - Description : AO Partenaires form
 *      - Exécuter en tant que : Moi
 *      - Qui a accès : "Tout le monde"   (indispensable pour que le site puisse poster)
 * 5. Autorisez l'accès quand Google le demande.
 * 6. Copiez l'URL qui finit par /exec.
 * 7. Dans index.html, remplacez la valeur de SHEET_ENDPOINT par cette URL.
 *
 * MISE À JOUR D'UN SCRIPT DÉJÀ DÉPLOYÉ (pour activer le flux BTPilot) :
 * 1. Ouvrez le Sheet > Extensions > Apps Script, remplacez tout par ce fichier, Enregistrez.
 * 2. "Déployer" > "Gérer les déploiements" > crayon ✏️ > Version : "Nouvelle version" > Déployer.
 *    (L'URL /exec reste la même — rien à changer côté site ni côté BTPilot.)
 */

// Jeton partagé avec BTPilot (variable d'environnement LEADS_FEED_TOKEN).
// Quiconque ne fournit pas ce jeton ne peut PAS lire les leads.
var BTPILOT_TOKEN = '9292f843eaea5709ada11544dd0c3db33baff8201f04c4a7';

function doPost(e) {
  try {
    var sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
    var p = (e && e.parameter) ? e.parameter : {};
    sheet.appendRow([
      new Date(),
      p.nom || '',
      p.entreprise || '',
      p.metier || '',
      p.zone || '',
      p.tel || '',
      p.email || ''
    ]);
    return ContentService
      .createTextOutput(JSON.stringify({ result: 'ok' }))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService
      .createTextOutput(JSON.stringify({ result: 'error', message: String(err) }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

/**
 * GET sans jeton : simple test de vie (comportement historique).
 * GET avec ?token=<BTPILOT_TOKEN> : renvoie les leads en JSON pour BTPilot.
 */
function doGet(e) {
  var p = (e && e.parameter) ? e.parameter : {};
  if (p.token !== BTPILOT_TOKEN) {
    return ContentService.createTextOutput('AO Partenaires endpoint OK');
  }
  try {
    var sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
    var values = sheet.getDataRange().getValues(); // ligne 1 = en-têtes
    var leads = [];
    for (var i = 1; i < values.length; i++) {
      var row = values[i];
      if (!row[1] && !row[6]) continue; // ligne vide
      leads.push({
        date: row[0] instanceof Date ? row[0].toISOString() : String(row[0] || ''),
        nom: String(row[1] || ''),
        entreprise: String(row[2] || ''),
        metier: String(row[3] || ''),
        zone: String(row[4] || ''),
        tel: String(row[5] || ''),
        email: String(row[6] || '')
      });
    }
    return ContentService
      .createTextOutput(JSON.stringify({ result: 'ok', leads: leads }))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService
      .createTextOutput(JSON.stringify({ result: 'error', message: String(err) }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}
