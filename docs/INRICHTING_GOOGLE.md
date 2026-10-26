# Handleiding Inrichting Google Workspace Testomgeving
**Den Heuvel Gebouw- en Verenigingsbeheer**  
Versie: 2.1 | 26 oktober 2026

Deze handleiding beschrijft stap voor stap hoe je het test-Spreadsheet, het Apps Script en de afgeschermde Drive-map inricht in Google Workspace om de live koppeling te activeren.

> [!NOTE]
> De applicatie en de tests werken nu al direct lokaal via de ingebouwde testadministratie (`data/test_sheets.json`), die exact hetzelfde 13-tabbladen schema en dezelfde HMAC-ondertekening gebruikt. Je kunt onderstaande stappen volgen zodra je de live Google Sheets wilt koppelen.

---

### Stap 1: Test-Spreadsheet aanmaken

1. **Website:** Ga naar [https://sheets.new](https://sheets.new) (ingelogd met je Google Workspace-account).
2. **Naam geven:** Klik linksboven op *Naamloze spreadsheet* en typ:  
   `Den Heuvel - Testadministratie`
3. **Spreadsheet-ID noteren:** Kijk in de adresbalk van je browser:  
   `https://docs.google.com/spreadsheets/d/`**`[JOUW_SPREADSHEET_ID]`**`/edit`  
   *(Kopieer het deel tussen `/d/` en `/edit` voor je eigen administratie; deel dit nooit in openbare kanalen).*

---

### Stap 2: Apps Script project koppelen en broncode plaatsen

1. **Apps Script openen:** Klik in het menu van het zojuist gemaakte Spreadsheet op:  
   **Extensies** → **Apps Script**.
2. **Projectnaam:** Klik linksboven op *Naamloos project* en wijzig dit in:  
   `Den Heuvel Relay Webapp`
3. **Bestanden kopiëren uit de repository (`appsscript/`):**
   * Klik in Apps Script links op het bestand `Code.gs`.
   * Vervang de inhoud door de volledige inhoud van [`appsscript/Code.gs`](file:///home/alberdao/ai_projecten/denheuvel_portaal/appsscript/Code.gs).
   * Klik linksboven op het **+**-icoon naast *Bestanden* → kies **Script**.
   * Noem het bestand `Schema` en plak de inhoud van [`appsscript/Schema.gs`](file:///home/alberdao/ai_projecten/denheuvel_portaal/appsscript/Schema.gs).
   * Klik weer op **+** → **Script**, noem het `Security` en plak [`appsscript/Security.gs`](file:///home/alberdao/ai_projecten/denheuvel_portaal/appsscript/Security.gs).
   * Klik weer op **+** → **Script**, noem het `Handlers` en plak [`appsscript/Handlers.gs`](file:///home/alberdao/ai_projecten/denheuvel_portaal/appsscript/Handlers.gs).
4. **Opslaan:** Druk op `Ctrl+S` (of het schijf-icoontje).

---

### Stap 3: Schema automatisch en veilig inrichten (13 tabbladen)

1. Selecteer in de bovenste werkbalk de functie `setupSchema`.
2. Klik op de knop **Uitvoeren** (Run).
3. **Machtigingen verlenen:** Google vraagt eenmalig om autorisatie.
   * Klik op *Machtigingen controleren*.
   * Kies je Google-account.
   * Klik op *Geavanceerd* (Advanced) → *Ga naar Den Heuvel Relay Webapp (onveilig)* → *Toestaan*.
4. **Verwacht resultaat in het logboek:**
   ```text
   [CREATE TAB] Ontbrekend tabblad: SchemaVersies
   [CREATE TAB] Ontbrekend tabblad: Gebruikers
   ...
   [CREATE TAB] Ontbrekend tabblad: Foutenlog
   ```
5. Ga terug naar je Spreadsheet-tabblad: je ziet nu alle **13 tabbladen** onderin staan met opgemaakte kopregels en startgegevens.

---

### Stap 4: HMAC Geheim instellen in Script Properties

1. Klik in Apps Script links in het menu op **Projectinstellingen** (het tandwiel-icoon ⚙️).
2. Scroll naar beneden naar **Scripteigenschappen** (Script Properties).
3. Klik op **Scripteigenschap toevoegen**:
   * **Eigenschap:** `RELAY_SECRET`
   * **Waarde:** Vul een geheim naar keuze in (of neem de testwaarde over uit `.env.example`: `denheuvel-test-secret-2026`).
4. Klik op **Scripteigenschappen opslaan**.

---

### Stap 5: Implementeren als Webapp

1. Klik rechtsboven op de blauwe knop **Implementeren** → **Nieuwe implementatie**.
2. Klik op het tandwiel ⚙️ naast *Type selecteren* en kies **Web-app**.
3. Vul in:
   * **Beschrijving:** `Den Heuvel Gateway Relay v2.1`
   * **Uitvoeren als:** `Mijzelf (jouw-email@domein)` *(execute-as-owner)*
   * **Wie heeft toegang:** `Iedereen` *(Anyone)*.  
     *(Let op: conform de masterprompt verifieert het script binnen `doPost` de HMAC-handtekening en actor; ongeautoriseerde verzoeken worden geweigerd met 401/403).*
4. Klik op **Implementeren**.
5. **Kopieer de Web-app-URL:**  
   Deze ziet eruit als: `https://script.google.com/macros/s/AKfycb.../exec`.

---

### Stap 6: Lokale Gateway koppelen aan Google Sheets

1. Maak in de projectmap een `.env`-bestand aan (of exporteer in je terminal):
   ```bash
   cp .env.example .env
   ```
2. Open `.env` en vul je gekopieerde gegevens in:
   ```env
   APPS_SCRIPT_URL=https://script.google.com/macros/s/AKfycb.../exec
   RELAY_SECRET=denheuvel-test-secret-2026
   ```
3. Start de gateway:
   ```bash
   python3 serve.py
   ```
4. Klik in de webinterface op **⚡ Verbindingsproef uitvoeren**. Je ziet nu dat de antwoorden rechtstreeks uit je Google Spreadsheet komen!

