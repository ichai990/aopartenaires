/**
 * AO Partenaires — réception des leads du formulaire dans Google Sheets
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
 */

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

// Permet de tester l'URL dans le navigateur (doit afficher "AO Partenaires endpoint OK")
function doGet() {
  return ContentService.createTextOutput('AO Partenaires endpoint OK');
}
