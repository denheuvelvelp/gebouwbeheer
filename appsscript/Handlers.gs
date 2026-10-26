/**
 * Den Heuvel Gebouw- en Verenigingsbeheer
 * Handlers voor administratieve bedrijfslogica en schrijfroutines
 */

function handleAction(action, payload, actor, requestId) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();

  switch (action) {
    case "relay_test":
      return {
        pong: true,
        actor: actor,
        requestId: requestId,
        spreadsheetName: ss.getName(),
        schemaVersion: SCHEMA_VERSION,
        serverTimeUtc: new Date().toISOString()
      };

    case "acties_list":
      return listRecords(ss, "Acties");

    case "acties_save":
      return saveActie(ss, payload, actor);

    case "acties_move":
      return moveActie(ss, payload, actor);

    case "storingen_list":
      return listRecords(ss, "Meldingen");

    case "storingen_save":
    case "storing_public_report":
      return saveStoring(ss, payload, actor, action === "storing_public_report");

    case "storingen_status":
      return updateStoringStatus(ss, payload, actor);

    case "werkorders_save":
      return saveWerkorder(ss, payload, actor);

    default:
      throw new Error("Onbekende actie: " + action);
  }
}

/**
 * Generieke lezer met omzetting naar objecten op basis van headers
 */
function listRecords(ss, tabName) {
  var sheet = ss.getSheetByName(tabName);
  if (!sheet) return [];
  var data = sheet.getDataRange().getValues();
  if (data.length <= 1) return [];

  var headers = data[0];
  var rows = [];

  for (var i = 1; i < data.length; i++) {
    var obj = {};
    for (var j = 0; j < headers.length; j++) {
      obj[headers[j]] = data[i][j];
    }
    // Parse JSON velden indien aanwezig
    if (obj.checklist_json && typeof obj.checklist_json === "string") {
      try { obj.checklist = JSON.parse(obj.checklist_json); } catch (e) { obj.checklist = []; }
    }
    // Filter gearchiveerde items
    if (!obj.archivedAt) {
      rows.push(obj);
    }
  }

  return rows;
}

/**
 * Actie opslaan of bijwerken met versiecontrole (optimistic concurrency)
 */
function saveActie(ss, actie, actor) {
  var sheet = ss.getSheetByName("Acties");
  if (!sheet) throw new Error("Tabblad Acties ontbreekt.");

  var data = sheet.getDataRange().getValues();
  var headers = data[0];
  var idCol = headers.indexOf("id");
  var versionCol = headers.indexOf("recordVersion");
  var now = new Date().toISOString();

  var rowIndex = -1;
  var currentVersion = 1;

  if (actie.id) {
    for (var i = 1; i < data.length; i++) {
      if (String(data[i][idCol]) === String(actie.id)) {
        rowIndex = i + 1; // 1-based sheet row
        currentVersion = parseInt(data[i][versionCol], 10) || 1;
        break;
      }
    }
  }

  if (rowIndex !== -1) {
    // Wijziging: controleer recordVersion
    if (actie.recordVersion && actie.recordVersion !== currentVersion) {
      throw new Error("CONFLICT_409: Het item is inmiddels gewijzigd door een andere gebruiker (huidige versie " + currentVersion + ", aangeleverd " + actie.recordVersion + "). Herlaad de actielijst.");
    }

    var newVersion = currentVersion + 1;
    var rowValues = headers.map(function(h) {
      if (h === "recordVersion") return newVersion;
      if (h === "updatedAt") return now;
      if (h === "updatedBy") return actor.email || actor.naam;
      if (h === "checklist_json") return JSON.stringify(actie.checklist || []);
      if (actie[h] !== undefined) return actie[h];
      return data[rowIndex - 1][headers.indexOf(h)];
    });

    sheet.getRange(rowIndex, 1, 1, headers.length).setValues([rowValues]);
    logHistorie(ss, "ActieHistorie", [Utilities.getUuid(), actie.id, "WIJZIGING", "Versie " + currentVersion, "Versie " + newVersion, now, actor.email]);

    actie.recordVersion = newVersion;
    actie.updatedAt = now;
    return actie;
  } else {
    // Nieuw item
    var newId = actie.id || ("ACT-" + ("000" + (data.length)).slice(-3));
    var newVersion = 1;
    actie.id = newId;
    actie.recordVersion = newVersion;
    actie.createdAt = now;
    actie.updatedAt = now;
    actie.createdBy = actor.email || actor.naam;
    actie.updatedBy = actor.email || actor.naam;

    var newRow = headers.map(function(h) {
      if (h === "checklist_json") return JSON.stringify(actie.checklist || []);
      return actie[h] !== undefined ? actie[h] : "";
    });

    sheet.appendRow(newRow);
    logHistorie(ss, "ActieHistorie", [Utilities.getUuid(), newId, "AANGEMAAKT", "", actie.status || "todo", now, actor.email]);
    return actie;
  }
}

/**
 * Kaart verplaatsen naar een andere kolom met positiebehoud en versieconflictcontrole
 */
function moveActie(ss, payload, actor) {
  var cardId = payload.cardId;
  var targetColumnId = payload.targetColumnId;
  var clientVersion = payload.recordVersion;

  var sheet = ss.getSheetByName("Acties");
  var data = sheet.getDataRange().getValues();
  var headers = data[0];
  var idCol = headers.indexOf("id");
  var statusCol = headers.indexOf("status");
  var kolomCol = headers.indexOf("kolom_id");
  var versionCol = headers.indexOf("recordVersion");
  var updatedCol = headers.indexOf("updatedAt");
  var updatedByCol = headers.indexOf("updatedBy");

  var targetRow = -1;
  var oldStatus = "";
  var currentVersion = 1;

  for (var i = 1; i < data.length; i++) {
    if (String(data[i][idCol]) === String(cardId)) {
      targetRow = i + 1;
      oldStatus = data[i][statusCol] || data[i][kolomCol];
      currentVersion = parseInt(data[i][versionCol], 10) || 1;
      break;
    }
  }

  if (targetRow === -1) {
    throw new Error("Actie niet gevonden: " + cardId);
  }

  if (clientVersion && clientVersion !== currentVersion) {
    throw new Error("CONFLICT_409: Versieconflict bij verplaatsen. De kaart is tussentijds bewerkt. Positie hersteld.");
  }

  var now = new Date().toISOString();
  var newVersion = currentVersion + 1;

  sheet.getRange(targetRow, statusCol + 1).setValue(targetColumnId);
  sheet.getRange(targetRow, kolomCol + 1).setValue(targetColumnId);
  sheet.getRange(targetRow, versionCol + 1).setValue(newVersion);
  sheet.getRange(targetRow, updatedCol + 1).setValue(now);
  sheet.getRange(targetRow, updatedByCol + 1).setValue(actor.email);

  logHistorie(ss, "ActieHistorie", [Utilities.getUuid(), cardId, "VERPLAATST", oldStatus, targetColumnId, now, actor.email]);

  return {
    cardId: cardId,
    newColumn: targetColumnId,
    recordVersion: newVersion,
    updatedAt: now
  };
}

/**
 * Storing opslaan of melden
 */
function saveStoring(ss, storing, actor, isPublic) {
  var sheet = ss.getSheetByName("Meldingen");
  if (!sheet) throw new Error("Tabblad Meldingen ontbreekt.");

  var data = sheet.getDataRange().getValues();
  var headers = data[0];
  var now = new Date().toISOString();

  var newNum = data.length + 40;
  var newId = storing.id || ("M-2026-" + ("000" + newNum).slice(-4));
  storing.id = newId;
  storing.status = storing.status || "Nieuw";
  storing.recordVersion = 1;
  storing.createdAt = now;
  storing.updatedAt = now;
  storing.createdBy = isPublic ? (storing.melder_naam || "Publieke Bewoner") : actor.email;
  storing.updatedBy = storing.createdBy;

  var newRow = headers.map(function(h) {
    return storing[h] !== undefined ? storing[h] : "";
  });

  sheet.appendRow(newRow);
  logHistorie(ss, "Meldingshistorie", [Utilities.getUuid(), newId, "AANGEMAAKT", "Melding geregistreerd via " + (storing.kanaal || "Portaal"), now, storing.createdBy]);

  return storing;
}

/**
 * Storing status en eventuele wachtreden bijwerken
 */
function updateStoringStatus(ss, payload, actor) {
  var storingId = payload.storingId;
  var newStatus = payload.newStatus;
  var waitingReason = payload.waitingReason || "";
  var clientVersion = payload.recordVersion;

  var sheet = ss.getSheetByName("Meldingen");
  var data = sheet.getDataRange().getValues();
  var headers = data[0];
  var idCol = headers.indexOf("id");
  var statusCol = headers.indexOf("status");
  var wachtCol = headers.indexOf("wachtreden");
  var versionCol = headers.indexOf("recordVersion");
  var updatedCol = headers.indexOf("updatedAt");
  var updatedByCol = headers.indexOf("updatedBy");

  var targetRow = -1;
  var oldStatus = "";
  var currentVersion = 1;

  for (var i = 1; i < data.length; i++) {
    if (String(data[i][idCol]) === String(storingId)) {
      targetRow = i + 1;
      oldStatus = data[i][statusCol];
      currentVersion = parseInt(data[i][versionCol], 10) || 1;
      break;
    }
  }

  if (targetRow === -1) {
    throw new Error("Storing niet gevonden: " + storingId);
  }

  if (clientVersion && clientVersion !== currentVersion) {
    throw new Error("CONFLICT_409: Storing is inmiddels gewijzigd door een andere beheerder.");
  }

  var now = new Date().toISOString();
  var newVersion = currentVersion + 1;

  sheet.getRange(targetRow, statusCol + 1).setValue(newStatus);
  sheet.getRange(targetRow, wachtCol + 1).setValue(waitingReason);
  sheet.getRange(targetRow, versionCol + 1).setValue(newVersion);
  sheet.getRange(targetRow, updatedCol + 1).setValue(now);
  sheet.getRange(targetRow, updatedByCol + 1).setValue(actor.email);

  logHistorie(ss, "Meldingshistorie", [Utilities.getUuid(), storingId, "STATUSWIJZIGING", "Status naar " + newStatus + (waitingReason ? " (Wachtreden: " + waitingReason + ")" : ""), now, actor.email]);

  return {
    storingId: storingId,
    status: newStatus,
    waitingReason: waitingReason,
    recordVersion: newVersion,
    updatedAt: now
  };
}

/**
 * Werkorder opslaan
 */
function saveWerkorder(ss, wo, actor) {
  var sheet = ss.getSheetByName("Werkorders");
  var data = sheet.getDataRange().getValues();
  var headers = data[0];
  var now = new Date().toISOString();

  var woId = wo.id || ("WO-2026-" + ("000" + (data.length + 10)).slice(-3));
  wo.id = woId;
  wo.recordVersion = 1;
  wo.createdAt = now;
  wo.updatedAt = now;
  wo.createdBy = actor.email;
  wo.updatedBy = actor.email;

  var newRow = headers.map(function(h) {
    return wo[h] !== undefined ? wo[h] : "";
  });

  sheet.appendRow(newRow);

  if (wo.melding_id) {
    logHistorie(ss, "Meldingshistorie", [Utilities.getUuid(), wo.melding_id, "WERKORDER", "Werkorder " + woId + " aangemaakt voor " + wo.leverancier, now, actor.email]);
  }

  return wo;
}

function logHistorie(ss, tabName, rowData) {
  var sheet = ss.getSheetByName(tabName);
  if (sheet) {
    sheet.appendRow(rowData);
  }
}

