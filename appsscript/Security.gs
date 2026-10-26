/**
 * Den Heuvel Gebouw- en Verenigingsbeheer
 * Beveiligingsmodule voor Apps Script Relay
 * HMAC-SHA256 verificatie, replay-beveiliging en roltoelating
 */

var RELAY_AUDIENCE = "denheuvel-relay";
var MAX_REQUEST_AGE_SECONDS = 300; // 5 minuten

/**
 * Haal het geheim op uit Script Properties
 */
function getRelaySecret() {
  var props = PropertiesService.getScriptProperties();
  var secret = props.getProperty("RELAY_SECRET");
  if (!secret) {
    throw new Error("RELAY_SECRET ontbreekt in Script Properties. Stel dit in via Projectinstellingen.");
  }
  return secret;
}

/**
 * Verifieert de inkomende POST envelope
 * Envelope structuur:
 * {
 *   protocolVersion: "2.1",
 *   audience: "denheuvel-relay",
 *   issuedAt: 1729922400,
 *   requestId: "REQ-UUID...",
 *   action: "acties_list",
 *   trustedActor: { email: "...", rol: "huismeester" },
 *   payload: { ... },
 *   signature: "base64url_hmac_sha256"
 * }
 */
function verifyEnvelope(bodyStr) {
  var envelope;
  try {
    envelope = JSON.parse(bodyStr);
  } catch (err) {
    throw new Error("Ongeldig JSON-formaat in aanvraag: " + err.message);
  }

  if (!envelope || typeof envelope !== "object") {
    throw new Error("Envelope ontbreekt of is geen object.");
  }

  // 1. Controleer verplichte velden
  var required = ["protocolVersion", "audience", "issuedAt", "requestId", "action", "trustedActor", "payload", "signature"];
  for (var i = 0; i < required.length; i++) {
    if (envelope[required[i]] === undefined) {
      throw new Error("Verplicht veld ontbreekt in envelope: " + required[i]);
    }
  }

  // 2. Audience controle
  if (envelope.audience !== RELAY_AUDIENCE) {
    throw new Error("Ongeldige audience: " + envelope.audience);
  }

  // 3. Timestamp controle (maximaal 5 minuten oud, niet in de toekomst)
  var nowSec = Math.floor(Date.now() / 1000);
  var diff = Math.abs(nowSec - envelope.issuedAt);
  if (diff > MAX_REQUEST_AGE_SECONDS) {
    throw new Error("Aanvraag is verlopen of heeft een ongeldige timestamp (leeftijd " + diff + "s, max " + MAX_REQUEST_AGE_SECONDS + "s).");
  }

  // 4. HMAC-SHA256 handtekening verifiëren
  // Canonical string: "protocolVersion|audience|issuedAt|requestId|action|trustedActorJson|payloadJson"
  var canonical = [
    envelope.protocolVersion,
    envelope.audience,
    envelope.issuedAt,
    envelope.requestId,
    envelope.action,
    JSON.stringify(envelope.trustedActor),
    JSON.stringify(envelope.payload)
  ].join("|");

  var secret = getRelaySecret();
  var expectedSigBytes = Utilities.computeHmacSha256Signature(canonical, secret);
  var expectedSig = Utilities.base64EncodeWebSafe(expectedSigBytes).replace(/=+$/, "");
  var providedSig = envelope.signature.replace(/=+$/, "");

  if (expectedSig !== providedSig) {
    throw new Error("HMAC-handtekening ongeldig. Verzoek niet geauthenticeerd.");
  }

  return envelope;
}

/**
 * Replay-preventie en idempotentie via CacheService of Verwerkingen
 */
function checkAndRegisterNonce(requestId, action, payloadDigest) {
  var cache = CacheService.getScriptCache();
  var cached = cache.get("nonce_" + requestId);
  if (cached) {
    return { isReplay: true, previousDigest: cached };
  }
  // Bewaar 10 minuten in cache
  cache.put("nonce_" + requestId, payloadDigest, 600);
  return { isReplay: false };
}

/**
 * Controleert of de trustedActor actief en bevoegd is in de Gebruikers-tabel
 */
function verifyActorAuthorization(trustedActor, action) {
  // Publiek melden uitzondering: alleen toegestaan voor storing_public_report
  if (action === "storing_public_report") {
    if (trustedActor && trustedActor.rol === "bewoner_publiek") {
      return { allowed: true, rol: "bewoner_publiek", naam: "Publieke Bewoner" };
    }
  }

  if (!trustedActor || !trustedActor.email) {
    throw new Error("Geen geauthenticeerde actor aanwezig.");
  }

  // Zoek in Gebruikers tabel
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName("Gebruikers");
  if (!sheet) {
    throw new Error("Gebruikers-tabel niet gevonden in spreadsheet.");
  }

  var data = sheet.getDataRange().getValues();
  if (data.length <= 1) {
    throw new Error("Geen actieve gebruikers geregistreerd in het systeem.");
  }

  var emailCol = data[0].indexOf("email");
  var rolCol = data[0].indexOf("rol");
  var actiefCol = data[0].indexOf("actief");
  var naamCol = data[0].indexOf("naam");

  var found = null;
  for (var i = 1; i < data.length; i++) {
    if (String(data[i][emailCol]).toLowerCase() === String(trustedActor.email).toLowerCase()) {
      found = {
        email: data[i][emailCol],
        rol: data[i][rolCol],
        actief: data[i][actiefCol] === true || String(data[i][actiefCol]).toLowerCase() === "true",
        naam: data[i][naamCol]
      };
      break;
    }
  }

  if (!found) {
    throw new Error("Gebruiker " + trustedActor.email + " is niet geregistreerd in Den Heuvel.");
  }

  if (!found.actief) {
    throw new Error("Toegang geweigerd: account van " + trustedActor.email + " is inactief.");
  }

  return found;
}

