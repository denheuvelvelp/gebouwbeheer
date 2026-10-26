/**
 * Den Heuvel Gebouw- en Verenigingsbeheer
 * Hoofd Apps Script Web App - Ingangspunt doPost en doGet
 * Versie 2.1
 */

function doGet(e) {
  // Beveiligd tegen directe openbare GET inzage conform masterprompt
  return ContentService.createTextOutput(JSON.stringify({
    status: "DEN_HEUVEL_RELAY_ACTIVE",
    info: "Directe openbare GET-inzage is niet geautoriseerd. Gebruik de beveiligde gateway met ondertekende POST envelope.",
    schemaVersion: SCHEMA_VERSION
  })).setMimeType(ContentService.MimeType.JSON);
}

function doPost(e) {
  var lock = LockService.getScriptLock();
  var requestId = "UNKNOWN";
  var action = "UNKNOWN";
  var actor = null;

  try {
    // 1. Verkrijg script lock (maximaal 10 seconden wachten)
    var hasLock = lock.tryLock(10000);
    if (!hasLock) {
      return buildErrorResponse("LOCK_TIMEOUT", "Server is bezet door gelijktijdige verwerking. Probeer het over enkele seconden opnieuw.", requestId, 503);
    }

    if (!e || !e.postData || !e.postData.contents) {
      return buildErrorResponse("INVALID_REQUEST", "Geen postData aanwezig in aanvraag.", requestId, 400);
    }

    // 2. Verifieer HMAC-SHA256 envelop
    var envelope = verifyEnvelope(e.postData.contents);
    requestId = envelope.requestId;
    action = envelope.action;
    actor = envelope.trustedActor;

    // 3. Replay-preventie en nonce registratie
    var payloadDigest = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, JSON.stringify(envelope.payload));
    var digestHex = Utilities.base64EncodeWebSafe(payloadDigest);
    var nonceCheck = checkAndRegisterNonce(requestId, action, digestHex);
    if (nonceCheck.isReplay) {
      return buildErrorResponse("REPLAY_DETECTED", "Verzoek met dit requestId is reeds verwerkt.", requestId, 409);
    }

    // 4. Autorisatie en rolcontrole
    var authorizedActor = verifyActorAuthorization(actor, action);

    // 5. Voer bedrijfslogica uit
    var resultData = handleAction(action, envelope.payload, authorizedActor, requestId);

    // 6. Log verwerking in Verwerkingen-tabel (indien mutatie)
    try {
      var ss = SpreadsheetApp.getActiveSpreadsheet();
      var verwerkSheet = ss.getSheetByName("Verwerkingen");
      if (verwerkSheet && action !== "relay_test") {
        verwerkSheet.appendRow([requestId, action, authorizedActor.email || authorizedActor.naam, new Date().toISOString(), "SUCCESS", digestHex, JSON.stringify(resultData)]);
      }
    } catch (ignore) {}

    // 7. Succesvol antwoord retourneren
    return ContentService.createTextOutput(JSON.stringify({
      requestId: requestId,
      data: resultData,
      validationErrors: null,
      errorCode: null,
      statusCode: 200
    })).setMimeType(ContentService.MimeType.JSON);

  } catch (err) {
    var errMsg = err.message || String(err);
    var errCode = "INTERNAL_ERROR";
    var httpCode = 500;

    if (errMsg.indexOf("HMAC") !== -1 || errMsg.indexOf("handtekening") !== -1) {
      errCode = "UNAUTHORIZED_SIGNATURE";
      httpCode = 401;
    } else if (errMsg.indexOf("Toegang geweigerd") !== -1 || errMsg.indexOf("niet geregistreerd") !== -1) {
      errCode = "FORBIDDEN_ROLE";
      httpCode = 403;
    } else if (errMsg.indexOf("CONFLICT_409") !== -1) {
      errCode = "CONFLICT_409";
      httpCode = 409;
    }

    // Fout vastleggen in Foutenlog
    try {
      var ss = SpreadsheetApp.getActiveSpreadsheet();
      var foutSheet = ss.getSheetByName("Foutenlog");
      if (foutSheet) {
        foutSheet.appendRow([Utilities.getUuid(), requestId, new Date().toISOString(), errMsg, err.stack || "", actor ? actor.email : "onbekend"]);
      }
    } catch (ignore) {}

    return buildErrorResponse(errCode, errMsg, requestId, httpCode);

  } finally {
    try {
      lock.releaseLock();
    } catch (ignore) {}
  }
}

function buildErrorResponse(errorCode, message, requestId, httpCode) {
  return ContentService.createTextOutput(JSON.stringify({
    requestId: requestId,
    data: null,
    validationErrors: [message],
    errorCode: errorCode,
    statusCode: httpCode || 400,
    message: message
  })).setMimeType(ContentService.MimeType.JSON);
}

