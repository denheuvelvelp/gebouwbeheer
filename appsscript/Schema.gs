/**
 * Den Heuvel Gebouw- en Verenigingsbeheer
 * Schema- en tabbladdefinities voor Google Sheets
 * Versie 2.1 - 13 verplichte tabbladen met veilige migratie en dry-run
 */

var SCHEMA_VERSION = "2.1.0";

var TAB_DEFINITIONS = {
  "SchemaVersies": {
    headers: ["id", "versie", "aangemaakt_op", "geïnstalleerd_door", "omschrijving"],
    initialData: [
      ["VER-001", "2.1.0", "2026-10-26T06:00:00Z", "Systeem", "Initiële inrichting fundament, Kanban en Storingen"]
    ]
  },
  "Gebruikers": {
    headers: ["id", "email", "naam", "rol", "actief", "laatst_ingelogd", "recordVersion"],
    initialData: [
      ["USR-001", "huismeester1@denheuvelvelp.nl", "Huismeester 1", "huismeester", true, "2026-10-26T06:00:00Z", 1],
      ["USR-002", "huismeester2@denheuvelvelp.nl", "Huismeester 2", "huismeester", true, "2026-10-26T06:00:00Z", 1],
      ["USR-003", "bestuur@denheuvelvelp.nl", "Bestuur Den Heuvel", "bestuur", true, "2026-10-26T06:00:00Z", 1]
    ]
  },
  "Instellingen": {
    headers: ["id", "sleutel", "waarde", "omschrijving", "bijgewerkt_op"],
    initialData: [
      ["SET-001", "gebouw_naam", "Den Heuvel", "Naam van het complex", "2026-10-26T06:00:00Z"],
      ["SET-002", "beheer_domein", "beheer.denheuvelvelp.nl", "Productiedomein", "2026-10-26T06:00:00Z"],
      ["SET-003", "max_upload_mb", "10", "Maximale bestandsgrootte in MB", "2026-10-26T06:00:00Z"]
    ]
  },
  "BordKolommen": {
    headers: ["kolom_id", "titel", "volgorde", "standaard_kolom", "actief"],
    initialData: [
      ["todo", "Te doen", 1, true, true],
      ["in_progress", "In uitvoering", 2, true, true],
      ["waiting", "Wacht", 3, true, true],
      ["done", "Gereed", 4, true, true]
    ]
  },
  "Locaties": {
    headers: ["locatie_id", "vleugel", "verdieping", "omschrijving", "publiek_zichtbaar"],
    initialData: [
      ["LOC-N-BG-01", "Noord", "BG", "Noord · begane grond · entreedeur", true],
      ["LOC-N-V2-01", "Noord", "2e verdieping", "Noord · 2e verdieping hal", true],
      ["LOC-W-LIFT", "West", "Alle verdiepingen", "West · lift toren West", true],
      ["LOC-W-PROM", "West", "BG", "West · promenade", true],
      ["LOC-Z-KELD", "Zuid", "Kelder", "Zuid · kelder", true],
      ["LOC-Z-PARK", "Zuid", "Kelder / BG", "Zuid · parkeergarage", true],
      ["LOC-B-CONT", "Buitenterrein", "Terrein", "Buitenterrein · containerruimte", true]
    ]
  },
  "Contacten": {
    headers: ["contact_id", "naam", "type", "appartement", "telefoon", "email", "notities"],
    initialData: [
      ["CON-001", "Dhr. Bakker", "Bewoner", "12A", "06-12345678", "b.bakker@email.nl", "Noord toren"],
      ["CON-002", "Mw. Van Dijk", "Bewoner", "Zuid 04", "06-98765432", "vandijk@email.nl", "Zuid vleugel"],
      ["CON-003", "Fam. Willems", "Bewoner", "West 31", "06-11223344", "willems@denheuvelvelp.nl", "West toren"],
      ["CON-004", "Firma Jansen Deurtechniek BV", "Leverancier", "-", "026-3334455", "service@jansendeuren.nl", "Onderhoudscontract deuren"],
      ["CON-005", "Loodgietersbedrijf De Boer Velp", "Leverancier", "-", "026-4445566", "info@loodgieterdeboer.nl", "Loodgieter/riolering"]
    ]
  },
  "Acties": {
    headers: ["id", "titel", "omschrijving", "status", "kolom_id", "sorteervolgorde", "eigenaar_id", "prioriteit", "deadline", "label_ids", "checklist_json", "bijlage_ids", "bron_type", "bron_id", "recordVersion", "createdAt", "updatedAt", "createdBy", "updatedBy", "archivedAt"],
    initialData: []
  },
  "ActieHistorie": {
    headers: ["historie_id", "actie_id", "wijziging_type", "oude_waarde", "nieuwe_waarde", "tijdstip", "gewijzigd_door"],
    initialData: []
  },
  "Meldingen": {
    headers: ["id", "titel", "kanaal", "locatie_id", "locatie_tekst", "categorie", "melder_naam", "melder_contact", "omschrijving", "prioriteit", "eigenaar_id", "status", "wachtreden", "deadline", "bijlage_bestand", "gekoppelde_actie_id", "recordVersion", "createdAt", "updatedAt", "createdBy", "updatedBy", "archivedAt"],
    initialData: []
  },
  "Meldingshistorie": {
    headers: ["historie_id", "melding_id", "actie", "details", "tijdstip", "actor"],
    initialData: []
  },
  "Werkorders": {
    headers: ["id", "melding_id", "leverancier", "geplande_datum", "geschatte_kosten", "instructie", "status", "recordVersion", "createdAt", "updatedAt", "createdBy", "updatedBy"],
    initialData: []
  },
  "Verwerkingen": {
    headers: ["request_id", "actie", "actor", "ontvangen_op", "status", "payload_digest", "antwoord_json"],
    initialData: []
  },
  "Foutenlog": {
    headers: ["fout_id", "request_id", "tijdstip", "foutmelding", "stacktrace", "actor"],
    initialData: []
  }
};

/**
 * Richt het spreadsheetschema veilig in.
 * Voegt ontbrekende tabbladen en ontbrekende kolommen toe.
 * Wist of overschrijft nooit bestaande gegevens.
 */
function setupSchema(dryRun) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var log = [];
  var existingSheets = {};
  
  ss.getSheets().forEach(function(s) {
    existingSheets[s.getName()] = s;
  });

  for (var tabName in TAB_DEFINITIONS) {
    var def = TAB_DEFINITIONS[tabName];
    var sheet = existingSheets[tabName];

    if (!sheet) {
      log.push("[CREATE TAB] Ontbrekend tabblad: " + tabName);
      if (!dryRun) {
        sheet = ss.insertSheet(tabName);
        sheet.appendRow(def.headers);
        sheet.getRange(1, 1, 1, def.headers.length).setFontWeight("bold").setBackground("#eaf0f5");
        sheet.setFrozenRows(1);
        if (def.initialData && def.initialData.length > 0) {
          def.initialData.forEach(function(row) {
            sheet.appendRow(row);
          });
        }
      }
    } else {
      // Controleer kolommen
      var currentHeaders = sheet.getLastColumn() > 0 ? sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0] : [];
      var missingHeaders = [];
      def.headers.forEach(function(h) {
        if (currentHeaders.indexOf(h) === -1) {
          missingHeaders.push(h);
        }
      });

      if (missingHeaders.length > 0) {
        log.push("[ADD COLUMNS] Tabblad " + tabName + " mist kolommen: " + missingHeaders.join(", "));
        if (!dryRun) {
          var startCol = currentHeaders.length + 1;
          for (var i = 0; i < missingHeaders.length; i++) {
            var colIdx = startCol + i;
            sheet.getRange(1, colIdx).setValue(missingHeaders[i]).setFontWeight("bold").setBackground("#eaf0f5");
          }
        }
      } else {
        log.push("[OK] Tabblad " + tabName + " is up-to-date.");
      }
    }
  }

  return {
    dryRun: !!dryRun,
    schemaVersion: SCHEMA_VERSION,
    wijzigingen: log
  };
}

/**
 * Handmatige uitvoermenu's in Google Sheets
 */
function onOpen() {
  var ui = SpreadsheetApp.getUi();
  ui.createMenu("Den Heuvel Beheer")
    .addItem("Controleer schema (Dry-run)", "menuCheckSchema")
    .addItem("Pas schema toe (Veilig)", "menuApplySchema")
    .addToUi();
}

function menuCheckSchema() {
  var res = setupSchema(true);
  SpreadsheetApp.getUi().alert("Schema Controle (Dry-Run):\n\n" + res.wijzigingen.join("\n"));
}

function menuApplySchema() {
  var res = setupSchema(false);
  SpreadsheetApp.getUi().alert("Schema Bijgewerkt:\n\n" + res.wijzigingen.join("\n"));
}

