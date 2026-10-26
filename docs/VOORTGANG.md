# Voortgangsbewaking Den Heuvel Portaal
**Project:** Modulair gebouw- en verenigingsbeheer Den Heuvel (Velp)  
**Versie:** 2.1  
**Datum:** 26 oktober 2026  
**Status:** Fundament, Beveiligde Gateway en Echte Testopslag voor Kanban en Storingen voltooid

---

## 1. Huidige Stand van Zaken
Het gezamenlijke fundament en de echte opslagarchitectuur zijn ingericht en werkend opgeleverd voor zowel de **Kanban-actielijst** als **Storingen en werkorders**. De webinterface communiceert nu via de Gateway met de testadministratie, inclusief cryptografische HMAC-SHA256-ondertekening, rolverificatie, `recordVersion`-concurrencycontrole en auditlogboeken.

* **Architectuur:** Browser frontend → Gateway (`gateway/server.py`) → Apps Script Relay (`appsscript/`) → Testadministratie (13 tabbladen).
* **Geteste Opslag:** Actief via de persistente testdatabase (`data/test_sheets.json`) en voorbereid voor directe live Google Sheets-koppeling via de meegeleverde Apps Script-bestanden en handleiding ([`docs/INRICHTING_GOOGLE.md`](file:///home/alberdao/ai_projecten/denheuvel_portaal/docs/INRICHTING_GOOGLE.md)).
* **Integratietests:** 12 geautomatiseerde unittests zijn geslaagd (`python3 -m unittest tests/test_foundation.py`).

---

## 2. Ingerichte Tabbladen (13 Tabbladen Schema)

Conform de specificatie zijn alle 13 vereiste tabbladen met vaste unieke ID's, datumstempels en recordversies gerealiseerd in [`appsscript/Schema.gs`](file:///home/alberdao/ai_projecten/denheuvel_portaal/appsscript/Schema.gs) en de testadministratie:

1. **`Gebruikers`**: Medewerkers, e-mailadressen, rollen (`huismeester`, `bestuur`) en actieve status.
2. **`Instellingen`**: Centrale complexconfiguratie (domein, uploadlimieten).
3. **`Locaties`**: Vleugels (Noord, West, Zuid), verdiepingen en publiek zichtbare meldlocaties.
4. **`Contacten`**: Bewoners en externe leveranciers met telefoon en e-mail.
5. **`Acties`**: Centrale actieregistratie voor Kanban (titel, status, kolom, prioriteit, deadline, checklist, recordVersion).
6. **`ActieHistorie`**: Volledige audit-trail van gemaakte, gewijzigde en verplaatste acties.
7. **`BordKolommen`**: Kolomvolgorde en configuratie (*Te doen*, *In uitvoering*, *Wacht*, *Gereed*).
8. **`Meldingen`**: Incidenten en storingen met categorie, locatie, melder, status en wachtreden.
9. **`Meldingshistorie`**: Tijdlijn van meldingsopvolging, statussen en notities.
10. **`Werkorders`**: Uitgezette opdrachten aan externe monteurs/leveranciers met kosten en instructies.
11. **`Verwerkingen`**: Replay- en idempotentie-registratie van binnengekomen serveraanvragen.
12. **`Foutenlog`**: Registratie van server- en verwerkingsfouten met stacktraces.
13. **`SchemaVersies`**: Versiebeheer (`2.1.0`) en migratielogboek.

---

## 3. Beveiligde Verbinding & Concurrency Controle

* **HMAC-SHA256 Envelope:** Alle POST-aanvragen worden ondertekend met een gedeeld geheim. Een aanvraag bevat `protocolVersion`, `audience` (`denheuvel-relay`), `issuedAt`, `requestId`, `action`, `trustedActor`, `payload` en `signature`.
* **Replay- en Timestampbeveiliging:** Aanvragen ouder dan 300 seconden worden geweigerd (`TIMESTAMP_EXPIRED`). Reeds verwerkte request-ID's worden geweigerd (`REPLAY_DETECTED`, HTTP 409).
* **Roltoelating:** Aanvragen van onbekende of inactieve accounts worden aan de serverkant geweigerd (`FORBIDDEN_ROLE`, HTTP 403). Publieke bewoners kunnen uitsluitend nieuwe meldingen indienen (`storing_public_report`).
* **Optimistic Locking:** Elke mutatie controleert `recordVersion`. Wanneer twee gebruikers gelijktijdig een actie bewerken, krijgt de tweede gebruiker een `CONFLICT_409` en wordt de kaartpositie hersteld zonder dataverlies.
* **Geen stilzwijgende afsluiting:** Het verslepen van een Kanban-actie naar 'Gereed' sluit een gekoppelde storing niet stilzwijgend; hiervoor is een expliciete, geautoriseerde statuswijziging op de storingspagina vereist.

---

## 4. Testresultaten

Uitgevoerd via `python3 -m unittest tests/test_foundation.py`:
* `test_01_all_13_tabs_present`: **Geslaagd** (alle 13 tabbladen aanwezig).
* `test_02_hmac_relay_probe_success`: **Geslaagd** (technische verbindingsproef met HMAC succesvol).
* `test_03_hmac_tampered_signature_rejected`: **Geslaagd** (ongeldige handtekening afgewezen met 401).
* `test_04_expired_timestamp_rejected`: **Geslaagd** (verlopen timestamp afgewezen).
* `test_05_replayed_request_id_rejected`: **Geslaagd** (replay van requestId geweigerd met 409).
* `test_06_unauthorized_user_forbidden`: **Geslaagd** (onbevoegde actor geweigerd met 403).
* `test_07_kanban_action_persists_after_reload`: **Geslaagd** (actie blijft na herladen bestaan).
* `test_08_kanban_card_move_persists_column`: **Geslaagd** (verplaatste kaart bewaart kolom en logt historie).
* `test_09_kanban_optimistic_concurrency_conflict_409`: **Geslaagd** (versieconflict gedetecteerd).
* `test_10_storing_persists_and_updates_status`: **Geslaagd** (storing en statuswijzigingen persistent).
* `test_11_moving_kanban_card_does_not_close_linked_storing`: **Geslaagd** (geen stilzwijgende sluiting).
* `test_12_public_resident_report_allowed_without_auth`: **Geslaagd** (bewoner kan zonder inlogaccount melden).

---

## 5. Bestandsstructuur

```text
denheuvel_portaal/
├── appsscript/
│   ├── appsscript.json          # Manifest met OAuth-scopes en tijdzone
│   ├── Code.gs                  # Webapp ingangspunt (doPost, doGet, ScriptLock)
│   ├── Schema.gs                # 13 tabbladen schema en setupSchema(dryRun)
│   ├── Security.gs              # HMAC-verificatie, replaycontrole en autorisatie
│   └── Handlers.gs              # CRUD-handlers met recordVersion en auditlog
├── gateway/
│   └── server.py                # Cloud Run gateway / test-server met HMAC-relay
├── data/
│   └── test_sheets.json         # Persistente testadministratie (13 tabbladen)
├── tests/
│   └── test_foundation.py       # 12 geautomatiseerde acceptatietests
├── docs/
│   ├── INRICHTING_GOOGLE.md     # Handleiding voor inrichten in Google Workspace
│   └── VOORTGANG.md             # Dit document
├── .env.example                 # Configuratievoorbeeld
├── index.html                   # Webinterface met verbindingsindicator en sessiekiezer
├── style.css                    # Styling
├── app.js                       # Frontend gekoppeld aan Gateway API
└── serve.py                     # Startscript voor server en webinterface
```

---

## 6. Volgende Stappen
1. **Beoordeling en testen van deze testbasis** door de gebruiker.
2. **Optioneel:** Inrichten van het live Google Workspace Spreadsheet en Apps Script via [`docs/INRICHTING_GOOGLE.md`](file:///home/alberdao/ai_projecten/denheuvel_portaal/docs/INRICHTING_GOOGLE.md).
3. **Volgende geplande module:** Release 2 (Meters en WhatsApp / Communicatie en Onderhoud).
