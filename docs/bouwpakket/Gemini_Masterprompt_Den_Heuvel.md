# GEMINI MASTERPROMPT DEN HEUVEL
Versie 2.1 | 25 oktober 2026 | Nieuwe leidende architectuur met Sheets en Apps Script

## Opdracht en werkwijze
Je bent de uitvoerende senior ontwikkelaar. Bouw voor Den Heuvel een modulair gebouw- en verenigingsbeheerpakket. Lever werkende broncode en configuratie, geen plan-only antwoord. Bouw module voor module in één repository. Begin met de technische integratieproef en vervolgens eerst de Kanban-actielijst en daarna storingen registreren en afhandelen. Lees de hele opdracht vóór je wijzigt. Maak een voortgangsbestand zodat hervatten geen toegang tot een chat vereist. Gebruik deze prompt als leidend boven oude Firestore-documenten.

Vast: Google Workspace; nieuwbouw; circa 10 uur beschikbare gebruikerstijd per week; twee huismeesters en bestuur; Noord, West en Zuid; aantallen circa 129 woningen, 17 bedrijven en 89 garages eerst controleren. Domein denheuvelvelp.nl bij Cloudflare. Voorgestelde productiehost beheer.denheuvelvelp.nl. Bewoners melden via /melden zonder login; interne app onder /beheer met zakelijke Google-aanmelding. Het eigen domein blijft zichtbaar behalve de normale externe Google-aanmeldstap. Geen ledenlogin, videovergaderen, ledenprikbord of bewonerspushapp.

Centraal één Google Sheets-bestand met tabbladen voor registraties. Foto’s/documenten in afgeschermde Google Drive. Personeels- en andere gevoelig afgeschermde gegevens mogen een aparte spreadsheet binnen hetzelfde pakket krijgen: verborgen/beschermde tabbladen zijn geen toegangsbeveiliging. Geen Cloud SQL, Firestore of andere administratieve database toevoegen zonder expliciete nieuwe opdracht. Sheets is gegevensbron; bestaande boekhouding blijft leidend voor financiële boekingen.

## Verplichte architectuur en technische proef
UI: React + TypeScript + Vite, responsief, Nederlands. Firebase Hosting alleen voor interface en eigen domein. Cloud Run-gateway voor geverifieerde API-aanvragen, providerwebhooks, bestandsdoorvoer en zo nodig FTP. Apps Script bevat de administratieve bedrijfslogica, schema-inrichting, enige normale schrijfroutine voor Sheets en geplande taken. Dit is een hybride opzet, geen direct op een eigen domein gehoste Apps Script-webapp. Verstop de Google-webapp niet in een iframe als vervanging van deze architectuur. google.script.run is geen algemeen beschikbare RPC op het eigen domein.

Bouw eerst een spike met fictieve gegevens: browser eigen-host frontend > gateway > Apps Script > test-Sheet > antwoord. Verifieer zakelijke Google-identiteit in gateway (server-gecontroleerde ID-token of sessie), controleer expliciete actieve toelating en rollen, gebruik geen mailadres uit de requestbody als identiteit. Kies Firebase Authentication Google-provider voor sessie-identiteit; dit verplicht geen Firestore. Onbekende accounts geen gegevens. Gebruik CSRF-bescherming bij cookie-sessies, passende cookie-instellingen en beperkte origins.

Voorstel voor de Apps Script-relay: execute-as-owner webapp, server-naar-server POST met JSON-envelope. Zet HMAC-handtekening in de BODY, niet uitsluitend een custom header: Apps Script doPost geeft niet alle inkomende headers vrij. Envelope bevat protocolVersion, audience, issuedAt, requestId, action, trustedActor en payload. Definieer exact welke bytes worden ondertekend, vaste UTF-8 serialisatie/base64url, HMAC-SHA256 en vergelijking zonder vroegtijdige mismatch. Timestamp kort geldig; requestId/nonce en inhoudsdigest onder ScriptLock registreren om replay of een ander payload met hetzelfde ID te weigeren. Vertrouwde actor wordt door gateway afgeleid, nooit uit browser vertrouwd. Relay-geheim in Secret Manager en alleen voor bevoegde Apps Script-editors toegankelijke Script Properties. Server-side allowlist voor actions; geen willekeurige functienaam of spreadsheet-ID uit publieke invoer uitvoeren. Afgehandelde identieke requests geven hetzelfde resultaat; verlopen ondertekende requests vernieuwd ondertekend met hetzelfde logische requestId hervatten, zonder dubbele mutatie. Schrijf geen secrets in logs.

Deze relay is een ontwerpvoorstel, geen aanname dat publieke Apps Script-deployment in de organisatie mag. Controleer domeinbeleid, execute-as-owner identiteit, redirectgedrag van ContentService, JSON-foutantwoorden, tijdlimiet, nonce-opslag, quota en misbruik van de publiek bereikbare relay. Volg Google-redirects alleen in de serverclient; stuur geen geheim naar een onverwachte host. Ongetekende directe relayrequests hebben nooit datarechten, maar kunnen wel quota belasten. Test dit en benoem de grens. Niet als productiegeschikt markeren zonder deze proef.

Gebruik NIET scripts.run met een serviceaccount: Apps Script API-executables vereisen een ondersteunde user-OAuth-configuratie en gezamenlijk standaardproject, en ondersteunen die serviceaccount-route niet. Als het gekozen domeinbeleid of de proef de relay blokkeert, stop de echte koppeling en maak een beslisnotitie met een ondersteund alternatief en gevolgen. Bouw geen open onbeveiligde doPost, fictieve API of onzichtbare parallelle Sheets-writer als noodoplossing. Publiceer geen productiesysteem op basis van een mock-relay.

## Betrouwbare verwerking en rechten
Alle normale Sheets-mutaties, ook triggers, via dezelfde Apps Script-schrijfroutine en getScriptLock. Apps Script controleert bovendien trustedActor tegen de eigen actieve gebruikers- en rollenregistratie bij elke interne actie; ondertekend zijn vervangt die rolcontrole niet. Publiek melden heeft een aparte beperkt toegestane actor en action. De gateway schrijft niet zelf dezelfde tabellen; beheerders bewerken productie niet rechtstreeks. Locks in Apps Script beschermen geen andere API-writers of handmatige edits. Gebruik vaste UUID’s, recordVersion, requestId, timestamps, actor, archivering en unieke bedrijfsreferenties. Controleer recordVersion onder lock; tweede gelijktijdige bewerker krijgt conflict met herlaadoptie. Locks kort houden: geen AI-, e-mail- of andere netwerkcalls binnen een kritieke lock. Lees/schrijf batchgewijs.

Sheets is geen relationele transactionele database. Maak een verwerkingsjournal met status en herstartbare mutaties, of gebruik een aantoonbaar geschikte atomaire batch waar mogelijk. Een lock alleen is geen rollback. Test een onderbreking tussen hoofdstoring, historie en werkorder. Een hervatte taak vervolgt veilig. Auditlog in hetzelfde bewerkbare bestand is geen onveranderbaar bewijs; beperk rechten en maak periodieke externe archiefkopieën binnen Drive-beheer.

Voor externe verzending precies één logische verzendtaak, externe idempotencykey waar ondersteund, bij onduidelijke timeout eerst bezorgstatus nagaan; geen onbeperkt blind opnieuw sturen. Taken in TaakWachtrij, kleine batches en backoff. Bewaak Apps Script/Workspace/API-quota; geen garantie van realtime of exacte secondeplanning. Geen grote live scans van alle tabbladen voor iedere klik.

Drive: metadata in Sheets, inhoud in Drive. Gateway verstrekt beperkte downloads alleen na autorisatie. Uploads buiten lange scriptrequests verwerken; valideer type, grootte, content en naam; verwijder onnodige metadata. Publieke upload alleen via beperkte route, voorlopige sessie en controle. Geen anybody-with-link voor privéfoto’s. Drive-service-identiteit en Shared Drive-rol expliciet beproeven. Bewonersfoto-opvraag via provider-mediaupload of tijdelijk gecontroleerd endpoint, niet permanente openbare link.

## Gegevenscontract en schema
Elk record minimaal id, createdAt, updatedAt, createdBy, updatedBy, recordVersion, archivedAt waar passend. Geld exact in kleinste munteenheden, verlof in hele minuten; weergave in euro/uren. Tijdopslag eenduidig UTC, gebruikersweergave Europe/Amsterdam, lokale datum zonder fictieve UTC-tijd waar het om kalenderdagen gaat. Gebruik één centrale registerfunctie voor tabbladnamen, kolommen, types, relaties en validatie. Headernamen niet op positie raden. Lever een setup-script met dry-run dat ontbrekende tabs toevoegt, maar niets wist of hernoemt zonder migratie. SchemaVersies en migratielog, backup vóór migratie.

HTTP-contract: gestandaardiseerde responses met requestId, data, validationErrors en errorCode; onderscheid ongeldig, onbevoegd, conflict, niet gevonden, tijdelijk onbeschikbaar en definitieve fout. Apps Script ContentService-fouten hebben een expliciet foutveld in JSON; de gateway vertaalt dit naar passende HTTP-statussen en mag HTTP 200 niet blind als zakelijke success zien. Langdurige taken geven jobId en status; UI toont Bezig, Geslaagd of Opvolging nodig. Onbekende fout toont geen stacktrace of persoonsdata. Openbare routes geven nooit interne contactlijsten terug. Publieke lijst met locaties bevat uitsluitend gepubliceerde meldlocaties.

## Ontwerpcontract
Volg de meegeleverde schermbeelden als visuele specificatie; voorbeelden zijn fictieve ontwerpdata. Donkerblauwe linkernavigatie, lichte pagina, witte panelen, petrolblauwe actieknoppen, afgeronde invoervelden en duidelijke statuslabels. Geen horizontaal scrollend hoofdmenu op mobiel. Desktop: zijmenu, paginatitel, primaire actie, filters, lijst en zo nodig formulierpaneel. Mobiel: compact menu, één kolom en ruime aanraakknoppen. Labels zichtbaar, foutmeldingen bij velden, focusbeheer, toetsenbordbediening, voldoende contrast en tekst naast kleur.

Iedere registratie via formulier/wizard. Nieuwe/bestaande registratie, Terug, Annuleren, Opslaan, duidelijke bevestiging en waarschuwing voor niet-opgeslagen wijzigingen. Dropdowns voor beheerde waardelijsten, zoekvelden voor grote lijsten. Datum/nummer voorgesteld, mens controleert. Lijsten bieden zoeken, filters, paginering, detail en export. Toon leeg-, laad-, fout-, geen-rechten- en verwerkingsstatus; verberg geen fout achter een spinner. Geen dummyknop als afgeronde functie markeren.

## Centrale Gemini-dienst
Model gemini-3.8-flash, uitsluitend serverzijde via geverifieerde actuele Google API. Verbindingstest en instructies per taak. Productiesleutel in Secret Manager; geen sleutelveld met terugleesbare inhoud. Gemini voor meterherkenning, interne assistent, bewonersvragen, meldingsclassificatie en documentvoorstellen. Bevestigde meterstand komt nooit rechtstreeks van modeluitvoer. Juridische/financiële/veiligheidsadviezen met bronnen en menselijke escalatie; geen modelberekening als bron van saldo of stemuitslag. Scheid gepubliceerde bewonerskennis en interne bronnen vóór retrieval. Persoonsgegevens alleen uit gecontroleerde functies met actuele autorisatie. Logging minimaal, model/instructieversie en kostenlimieten instelbaar. Bij uitval blijft handmatig werken mogelijk.

## Modulaire bouwvolgorde
Release 0: repo, schema, Google-aanmelding, ondertekende relayproef, Drive-uploadproef en eigen-host routing met fictieve data.
Release 1A: zelfstandige Kanban-actielijst met minimale gebruikersbasis; pilot met twee huismeesters.
Release 1B: locaties/contactbasis plus storingen en werkorders, intern en publiek formulier; koppelen aan Kanban zonder dubbele acties.
Release 2: objecten/labels, meters en WhatsApp, communicatie en onderhoud.
Release 3: documenten/agenda, ALV, MJOP en boekhoudkoppeling.
Release 4: sleutels, RI&E, schoonmaak, VIB, voorraad, narrowcasting en synchronisatie.
Release 5: verlof, uitgebreide assistent en volledige integrale acceptatie.
Beheer, basisrechten, back-ups en foutafhandeling beginnen in release 0 en groeien mee, niet pas aan het einde. Verlof mag eerder na basisrollen, zonder andere afgesproken modules te laten vallen.

Begin na lezen uitsluitend met release 0. Stop na oplevering van de controles en wacht op een expliciete volgende moduleopdracht. Daarna release 1A Kanban, vervolgens release 1B storingen. Begin nooit zelf een volgende module omdat de volledige scope in deze prompt staat. Werk in kleine complete verticale stappen. Maak volgende modules wel als scope zichtbaar maar niet als werkend presenteren. Registreer fase- en moduleacceptatie in repository. Geen chat-afhankelijkheid: geef na iedere stap exacte controle/opstartcommando’s en werk docs/VOORTGANG.md bij. Cloudresources, DNS, verzending en geldacties pas met concrete project-/providergegevens en bewust gekozen uitvoeringsstap.

## Gemeenschappelijke acceptatie en opleverbestanden
Voor iedere module: werkende UI, servervalidatie, echte opslag in test-Sheet, rechtenproef, normale en foutcase, lege toestand, gelijktijdigheids-/herhaaltest waar relevant en bedieninstructie. Laat npm scripts typecheck/test/build echt werk uitvoeren. Test de relay en provideradapter afzonderlijk. Demo-integratie telt niet als production-ready. Bewijs per controle: commando, resultaat, datum en testomgeving. Maak een traceabilitymatrix functies 1-62 > module > tabblad > scherm > test > status.

Repository: /web, /gateway, /appsscript, /shared, /tests, /docs. Lever firebase.json, Cloud Run-config, appsscript.json, veilige .env.example, .gitignore, dependencylock en scripts voor setup/dry-run/migratie/test/deploy. Documenten: README.md, ARCHITECTUUR.md, SCHEMA.md, RECHTEN.md, CONFIGURATIE.md, DEPLOYMENT.md, BEHEER.md, HERSTEL.md, ACCEPTATIE.md en VOORTGANG.md. Maak developersetup reproduceerbaar; expliciete test- en productieproject-ID’s, spreadsheet-ID’s en map-ID’s, geen echte waarden verzinnen.

Cloudflare: alleen subdomein beheer aanpassen na DNS-inventaris. Firebase Hosting geeft exacte TXT/A/AAAA/CNAME-waarden; niet raden. Webrecords voor eerste validatie DNS only, verifieer HTTPS en aanmelding. Laat bestaand hoofddomein en mailrecords intact. Geen cache van geauthenticeerde/persoonlijke API-antwoorden. Normale Google-login mag naar accounts.google.com gaan, daarna terug op eigen domein. Hosting blijft aanvullend naast Apps Script; geen domain-mapping claim voor een script.google.com-deployment.

Geef aan het begin een korte bestanden- en testlijst en start vervolgens de implementatie van release 0. Stel alleen vragen als een ontbrekend gegeven een concrete uitvoeringsstap blokkeert; werk onafhankelijk verder aan fictieve proefdata. Zoek actuele primaire documentatie voor pakketversies en providerprotocollen.


## Module dashboard Dashboard
Functies: 1, 2.
Tabbladen: Taken, Gebruikers, Instellingen.
Specifieke velden naast standaardvelden: titel, eigenaar_id, prioriteit, streefdatum, status, bron_id.
Werking: Toon de persoonlijke en gezamenlijke werkvoorraad, urgente en verlopen meldingen en ontbrekende meteropnames. Open vanuit iedere kaart de bronregistratie. Stuur dagelijks een beperkt takenoverzicht per rol.
Formulieren: Eigenaar, Prioriteit, Streefdatum, Toelichting; voeg relevante detail-, wijzigings- en controleformulieren toe.
Acceptatie:
- Tellingen aansluiten op brongegevens
- Onbevoegde gebruiker ziet geen interne gegevens
- Een afgeronde taak verdwijnt uit open werkvoorraad



## Module kanban Actielijst Kanban
Functies: 2.
Tabbladen: Acties, ActieHistorie, BordKolommen, ActieLabels, ActieKoppelingen.
Velden: actie_id, titel, omschrijving, status, kolom_id, sorteervolgorde, eigenaar_id, prioriteit, deadline, label_ids, checklist, bijlage_ids, bron_type, bron_id, afgerond_op.
Werking: Bouw direct na het fundament, vóór storingenbeheer, een zelfstandige Kanban-actielijst. Standaardkolommen Te doen, In uitvoering, Wacht en Gereed; kolommen beheersbaar. Kaarten met titel, eigenaar, prioriteit, deadline, labels en bronverwijzing. Nieuw/wijzigen via formulier met omschrijving, checklist en bijlagen. Verslepen én toegankelijke knop Verplaats naar met bevestigde opslag, terugdraaien bij fout en conflictcontrole. Op mobiel kolomkeuze en kaartlijst, geen verplicht horizontaal schuiven. Filters op eigenaar, prioriteit, label en termijn; persoonlijke en gezamenlijke weergave. Verlopen taken zichtbaar, herinneringen en dagsamenvatting; afronden, heropenen en archiveren met historie. Handmatige acties zijn direct bruikbaar met fictieve gebruikers. Latere storingen/inspecties/ALV mogen via dezelfde actie_id koppelen, niet dezelfde actie dupliceren. Een kaart verplaatsen wijzigt niet stilzwijgend de status van een gekoppelde storing; daarvoor bestaat een afzonderlijke expliciete, bevoegde actie.
Acceptatie:
- Kaart maken, wijzigen, verplaatsen en na herladen terugvinden
- Bij opslagfout kaart terug naar oorspronkelijke kolom met foutmelding
- Twee bewerkers: versieconflict zonder verlies
- Mobiel verplaatsen zonder slepen
- Afronden en heropenen herleidbaar
- Bronkoppeling maakt geen duplicaat en wijzigt bronstatus niet onbedoeld

## Module storingen Storingen en werkorders
Functies: 16, 17, 18, 19, 20, 21, 22, 23.
Tabbladen: Meldingen, Meldingshistorie, Werkorders, Incidentkoppelingen.
Specifieke velden naast standaardvelden: melding_id, kanaal, locatie_id, melder_id, omschrijving, prioriteit, eigenaar_id, status, streefdatum, afsluitreden.
Werking: Alle kanalen schrijven naar dezelfde registratie. Nieuw > beoordeeld > ingepland > in uitvoering > opgelost > gesloten; wachtreden apart. Heropenen mogelijk. Koppel dubbele meldingen aan een incident. Registreer mondelinge meldingen namens de bewoner. Maak gekoppelde werkorders met planning, leverancier, uren, materialen en kosten. Bewoners krijgen gecontroleerde statusberichten; interne notities blijven intern.
Formulieren: Locatie, Categorie, Omschrijving, Foto toevoegen; voeg relevante detail-, wijzigings- en controleformulieren toe.
Acceptatie:
- Formulier maakt één melding
- Werkorder en status blijven na herladen bestaan
- Onbevoegde inzage en dubbele inzending geblokkeerd
- Afsluiten en heropenen zichtbaar in historie


## Module locaties Gebouwen en objecten
Functies: 3, 4, 5.
Tabbladen: Gebouwen, Verdiepingen, Eenheden, Ruimtes, Objecten, CodeTellers, QRVerwijzingen.
Specifieke velden naast standaardvelden: gebouw_id, verdieping_id, ruimte_id, eenheid_id, object_id, labelcode, type, merk, model, serienummer, garantiedatum, sfb_code.
Werking: Modelleer Noord, West en Zuid met configureerbare verdiepingen inclusief kelder en promenade. Woningen, bedrijven en garages zijn eenheden. Objecten hebben een vaste identiteit, locatie, korte labelcode en QR. Ruimtes twee cijfers, objecten vier cijfers per afgesproken gebouw/type-scope; de beheerder bevestigt bestaande afkortingen vóór nummeruitgifte. NL-SfB is classificatie, niet verplicht in label. Voeg verplaatsing, foto en onderhoudshistorie toe.
Formulieren: Gebouw, Verdieping, Ruimte, Objecttype; voeg relevante detail-, wijzigings- en controleformulieren toe.
Acceptatie:
- Twee gelijktijdige registraties leveren unieke codes
- QR verandert niet bij verplaatsing
- Verwijderen breekt geen historie


## Module meters Gasmeterstanden
Functies: 9, 10, 11, 12, 13, 14, 15, 60.
Tabbladen: Meters, Opnamerondes, Meteropnames, Meterwissels, NummerAutorisaties.
Specifieke velden naast standaardvelden: meter_id, eenheid_id, ronde_id, opname_id, opgenomen_op, vorige_stand, voorgestelde_stand, bevestigde_stand, eenheid, foto_id, status.
Werking: Start ronde > scan QR > controleer meter/woning > foto > Gemini-voorstel > medewerker bevestigt > opslaan. Handmatige invoer als terugval. Lagere stand vraagt controle; meterwissel krijgt oude eindstand en nieuwe beginstand. Bewaar originele foto en correctiehistorie. Export maandstanden, afwijkingen en ontbrekende meters. De Sheets-versie werkt online; functie 12 betekent expliciete tijdelijke conceptinvoer op vertrouwde apparaten, niet gegarandeerde volledige offline fotoherkenning of synchronisatie. Proef eerst of lokale conceptopslag met herstel haalbaar is; markeer deze beperkt totdat de toesteltest slaagt.
Formulieren: Meter, Foto uploaden, Herkenningsvoorstel, Stand bevestigen; voeg relevante detail-, wijzigings- en controleformulieren toe.
Acceptatie:
- Tien meters met foto en stand terugvinden
- Onleesbare foto wordt niet automatisch definitief
- Dubbele opname en verkeerde meter geblokkeerd
- Een concept geldt nooit als definitieve bewonerstand


## Module whatsapp WhatsApp en bewonersvragen
Functies: 13, 14, 16, 28, 60.
Tabbladen: Gesprekken, Berichten, NummerAutorisaties, Activaties, VerzendWachtrij.
Specifieke velden naast standaardvelden: provider_message_id, afzender, contact_id, eenheid_id, intentie, autorisatiestatus, bezorgstatus, template_id.
Werking: Behoud de bestaande Voys-nummeromgeving als uitgangspunt. Bevestig eerst de echte berichtenprovider/API. Scheid storing, algemene vraag en eigen meteropvraag. Eerste koppeling via onafhankelijke bekende contactroute en tijdelijke gehashte activatiecode; ieder verzoek controleert actieve woningrelatie. Stuur laatste bevestigde stand, datum en foto; trek toegang in bij verhuizing. Automatisch opnamebericht alleen na voorkeur/toestemming en vereiste template. Registreer bezorgfouten en ontdubbeling.
Formulieren: Contact, Woning, Verificatiestatus, Antwoord; voeg relevante detail-, wijzigings- en controleformulieren toe.
Acceptatie:
- Onbekend en verhuisd nummer krijgen geen persoonlijke gegevens
- Dubbele providerlevering geeft geen dubbele actie
- Ontbrekende stand en verzendfout hebben duidelijke opvolging


## Module contacten Contacten en ledenadministratie
Functies: 24, 25, 29, 30, 61.
Tabbladen: Contacten, Organisaties, ContactRelaties, Lidmaatschappen, Wijzigingsverzoeken, SyncLog.
Specifieke velden naast standaardvelden: contact_id, naam, organisatie_id, email, telefoon, taal, voorkeurskanaal, rol, eenheid_id, geldig_van, geldig_tot.
Werking: Bewoners, eigenaren, huurders, vertegenwoordigers, leveranciers en relaties in één bron. Meerdere rollen per persoon. Wijziging via formulier of bericht wordt gecontroleerd verwerkt. Verhuizing beëindigt relatie en persoonlijke toegang; historie blijft volgens bewaarbeleid. Medewerkers voegen toe en mogen binnen hun rol wijzigen; beheerder verwijdert/samenvoegt. Gedeeld Google-adresboek apart verifiëren: persoonlijke People API-contacten zijn niet automatisch organisatiebreed gedeeld.
Formulieren: Naam, E-mailadres, Telefoonnummer, Woningrelatie; voeg relevante detail-, wijzigings- en controleformulieren toe.
Acceptatie:
- Verhuizing past doelgroep en toegang aan
- Samenvoegen behoudt gekoppelde historie
- Synchronisatie zichtbaar bij twee bevoegde medewerkers


## Module communicatie Mailinglijsten en communicatie
Functies: 26, 27, 28, 29.
Tabbladen: Mailinglijsten, LijstLeden, Verzendingen, Ontvangers, BerichtTemplates.
Specifieke velden naast standaardvelden: lijst_id, selectiecriteria, bericht_id, onderwerp, inhoud, kanaal, ontvangers_snapshot, status.
Werking: Handmatige en dynamische doelgroepen, bijvoorbeeld actuele bewoners Noord of garagegebruikers. Preview aantallen, ontbrekende adressen en dubbele ontvangers. Testverzending vooraf. Individuele of afgeschermde verzending met bijlagen via Workspace-mail of WhatsApp. Scheid beheercommunicatie van nieuwsbrief. Bewaar inhoudsversie, ontvangerssnapshot en bezorgstatus; inkomende antwoorden bij dossier.
Formulieren: Mailinglijst, Onderwerp, Bericht, Bijlage; voeg relevante detail-, wijzigings- en controleformulieren toe.
Acceptatie:
- Ontvangers zien geen andere privé-adressen
- Dynamische lijst volgt actuele relaties
- Opnieuw starten veroorzaakt geen dubbele verzending


## Module onderhoud Onderhoud en inspecties
Functies: 6, 7, 8.
Tabbladen: Onderhoudsplannen, Onderhoudstaken, Inspecties, Leveranciers, Contracten.
Specifieke velden naast standaardvelden: object_id, taaktype, frequentie, volgende_datum, verantwoordelijke, leverancier_id, contract_id, opzegdatum, bewijs_id.
Werking: Plan periodiek onderhoud en inspecties aan objecten. Leg eigenaar, deadline, bewijs en vervolgactie vast. Contracten bevatten looptijd en opzegtermijn. Herhaalde geplande verwerking maakt dezelfde taak niet nogmaals. Inspectiebevinding kan een storing of RI&E-actie worden.
Formulieren: Object, Werkzaamheid, Herhaling, Bewijs toevoegen; voeg relevante detail-, wijzigings- en controleformulieren toe.
Acceptatie:
- Herhaalde trigger genereert maar één taak
- Afwijking levert opvolgactie op
- Opzegwaarschuwing verschijnt op tijd


## Module documenten Documenten en contractdossiers
Functies: 31, 32.
Tabbladen: Documenten, DocumentVersies, MapRechten, DeelLinks.
Specifieke velden naast standaardvelden: document_id, drive_id, titel, categorie, versie, classificatie, publicatiestatus, gekoppeld_type, gekoppeld_id.
Werking: Drive is bestandbron; Sheets bewaart metadata. Mappen, versies, publicatie en downloadrechten. Koppel aan object, melding, contract of vergadering. Deel alleen geselecteerd document via bijlage of beperkte servergecontroleerde link. Geen openbare Drive-link als vervanging van rechten. Appscriptsysteem en Drive moeten dezelfde beperkingen respecteren.
Formulieren: Titel, Categorie, Bestand, Toegangsrol; voeg relevante detail-, wijzigings- en controleformulieren toe.
Acceptatie:
- Bestandsdownload controleert actuele rechten
- Oude versie blijft herleidbaar
- Verlopen deellink geeft geen toegang


## Module agenda Agenda en planning
Functies: 33.
Tabbladen: AgendaItems, Herhalingsregels, Uitnodigingen.
Specifieke velden naast standaardvelden: item_id, titel, start, einde, locatie_id, deelnemers, bron_id, herhaling.
Werking: Eén interne agenda voor werkzaamheden, deadlines en fysieke vergaderingen. Google Calendar-koppeling met afgesproken bron/richting. Bewoners krijgen uitnodiging via e-mail/WhatsApp en eventueel ICS-bestand. Wijzigingen expliciet opnieuw communiceren. Privéfeedlinks zijn intrekbaar.
Formulieren: Titel, Datum en tijd, Locatie, Herhaling; voeg relevante detail-, wijzigings- en controleformulieren toe.
Acceptatie:
- Terugkerende afspraak correct aangemaakt
- Wijziging veroorzaakt duidelijke update
- Afgeschermde afspraak niet zichtbaar voor onbevoegde


## Module alv ALV en stemregistratie
Functies: 34, 35, 36, 37.
Tabbladen: Vergaderingen, Agendapunten, Presentie, Volmachten, Stemrechten, Stemrondes, Stemmen, Besluiten.
Specifieke velden naast standaardvelden: vergadering_id, agenda_id, eenheid_id, stemgewicht, vertegenwoordiger_id, volmachtstatus, aanwezig, stemkeuze, besluit.
Werking: Fysieke ALV; geen ledenlogin, video of persoonlijke stemlinks. Oproeptermijnsignalering en agenda/stukken versturen. Medewerker registreert presentie, volmacht en fysiek uitgebrachte stemmen. Configureer gecontroleerde statuten/rechtsvorm, quorum, meerderheden en gewichten; bewaar momentopname per ronde. Notulen, besluiten en acties naar gecontroleerd PDF-verslag.
Formulieren: Vergadering, Agendapunt, Stemrecht controleren, Keuze registreren; voeg relevante detail-, wijzigings- en controleformulieren toe.
Acceptatie:
- Onafhankelijke berekening van gewogen uitslag
- Dubbele vertegenwoordiging wordt verhinderd
- Latere verhuizing wijzigt uitslag niet


## Module mjop MJOP en reservefonds
Functies: 38, 39, 40.
Tabbladen: MJOPPosten, MJOPVersies, Scenarios, FondsJaren, Offertes, Onderhoudsbeurten.
Specifieke velden naast standaardvelden: post_id, object_id, hoeveelheid, eenheidsprijs, prijspeil, cyclus, planjaar, scenario_id, inflatie, rente, beginfonds, reservering.
Werking: Plan onderhoud tot 30 jaar. Scenario’s 5/10/15/30 jaar met inflatie/rente per jaar, beginsaldo, reservering en uitgaven. Houd concept en vastgesteld apart. Offertes, facturen, uitvoerder en correspondentie per beurt; geen vaste leverancier voor altijd. Koppel werkelijke uitvoering één keer. PDF/Excel met peildatum en aannames.
Formulieren: Onderhoudspost, Planjaar, Raming, Cyclus; voeg relevante detail-, wijzigings- en controleformulieren toe.
Acceptatie:
- Voorbeeld onafhankelijk nagerekend
- Concept overschrijft vastgesteld plan niet
- Verschoven beurt en kosten correct verwerkt


## Module financien Boekhouding en bijdragen
Functies: 41, 42, 43, 44.
Tabbladen: FinancieleReferenties, BijdrageInstellingen, FactuurKoppelingen, BankSyncLog, Budgetten.
Specifieke velden naast standaardvelden: extern_boeking_id, extern_factuur_id, contact_id, bedrag_cent, valuta, periode, betaalstatus, sync_status.
Werking: Koppel bestaande boekhoudmotor: grootboek, beginbalans, bijdragen/facturen, open posten, deelbetalingen, herinneringen, banktransacties, begroting, balans, resultaat en jaarafsluiting. Boekhoudmotor blijft leidend. Sheets bewaart gecontroleerde referenties en rapportkopieën; geen zelfverzonnen bank-API. Incasso/betaling alleen na aparte bevoegdheid en opdracht. Kascommissie krijgt beperkte leesinzage.
Formulieren: Administratie, Periode, Referentie, Goedkeuring; voeg relevante detail-, wijzigings- en controleformulieren toe.
Acceptatie:
- Beginbalans en bank gereconcilieerd
- Dubbele import en factuur verhinderd
- Deelbetaling/credit correct
- Financieel verantwoordelijke accepteert jaarproef


## Module sleutels Sleutelbeheer
Functies: 54.
Tabbladen: Sleutels, SleutelUitgiftes.
Specifieke velden naast standaardvelden: sleutel_id, code, deur_id, houder_id, uitgegeven_op, retour_op, ontvangstbewijs_id, status.
Werking: Registreer sleuteltype en deurkoppeling, houder, uitgifte en retour, ontvangstbevestiging en vermissing. Beperk inzage in gevoelige sleutelrelaties. Gebruik historie in plaats van houder onzichtbaar overschrijven.
Formulieren: Sleutel, Ontvanger, Uitgiftedatum, Ontvangstbevestiging; voeg relevante detail-, wijzigings- en controleformulieren toe.
Acceptatie:
- Uitgifte en retour herleidbaar
- Vermissing veroorzaakt actie
- Onbevoegde gebruiker ziet geen sleutelplan


## Module rie RI E en incidenten
Functies: 55.
Tabbladen: Risicos, Maatregelen, Incidenten, Bewijsstukken.
Specifieke velden naast standaardvelden: risico_id, locatie_id, omschrijving, score, maatregel, verantwoordelijke, deadline, bewijs_id, controle_status.
Werking: Registreer risico, beoordeling, maatregel en eigenaar. Plan opvolging en keur bewijs vóór sluiten. Incidenten hebben beperkte toegang en zo min mogelijk persoonsgegevens; koppel relevante storingen/inspecties. Maak voortgangsrapport met open maatregelen.
Formulieren: Locatie, Risico, Maatregel, Verantwoordelijke; voeg relevante detail-, wijzigings- en controleformulieren toe.
Acceptatie:
- Actie niet zonder vereiste controle sluiten
- Incidentgegevens afgeschermd
- Achterstallige maatregel zichtbaar


## Module schoonmaak Schoonmaakrondes
Functies: 56.
Tabbladen: SchoonmaakPlannen, Rondes, RondeItems.
Specifieke velden naast standaardvelden: ronde_id, locatie_id, taak, gepland_op, uitvoerder_id, uitkomst, foto_id, vervolgactie_id.
Werking: Locatiechecklists, herhaalplanning, afvinken en bewijsfoto. Afwijking wordt een taak of melding; controleur beoordeelt uitvoering. Houd historische checklistversie vast per uitgevoerde ronde.
Formulieren: Ronde, Checklistitem, Uitkomst, Foto; voeg relevante detail-, wijzigings- en controleformulieren toe.
Acceptatie:
- Ronde compleet en afwijking gekoppeld
- Herhaalde trigger geen dubbele ronde
- Bewijs en controle terugvindbaar


## Module vib VIB en werkinstructies
Functies: 57.
Tabbladen: Middelen, VIBDocumenten, GebruiksLocaties, Werkinstructies.
Specifieke velden naast standaardvelden: middel_id, naam, leverancier_id, vib_drive_id, versiedatum, gebruikslocatie, instructie_id.
Werking: Bewaar actuele veiligheidsinformatiebladen, historie, leverancier en gebruikslocatie. Koppel middelen aan schoonmaaktaken en relevante beschermingsinstructies. AI mag samenvatten maar het originele blad blijft bron; geen autonome veiligheidsinstructie zonder controle.
Formulieren: Middel, Versiedatum, VIB uploaden, Gebruiksinstructie; voeg relevante detail-, wijzigings- en controleformulieren toe.
Acceptatie:
- Actuele versie herkenbaar
- Oude versie blijft herleidbaar
- Middel vindbaar vanuit ronde


## Module voorraad Voorraad en materialen
Functies: 58.
Tabbladen: Artikelen, VoorraadMutaties, BestelAdviezen.
Specifieke velden naast standaardvelden: artikel_id, omschrijving, eenheid, opslaglocatie, mutatie_id, aantal, werkorder_id, minimumvoorraad.
Werking: Boek ontvangst, verbruik, correctie en minimumvoorraad. Koppel materialen aan werkorders. Beheer saldo uit herleidbare mutaties; geen stil overschrijven. Besteladvies is geen automatische bestelling.
Formulieren: Artikel, Mutatiesoort, Aantal, Werkorder; voeg relevante detail-, wijzigings- en controleformulieren toe.
Acceptatie:
- Verbruik sluit aan op werkorder
- Dubbele mutatie wordt verhinderd
- Minimumsignaal werkt


## Module schermen Narrowcasting
Functies: 59.
Tabbladen: Schermen, Publicaties, PlaylistItems, PublicatieLog.
Specifieke velden naast standaardvelden: scherm_id, publicatie_id, titel, pdf_id, start, einde, playlist_positie, status.
Werking: Maak mededeling met start/einde en doelgroep-scherm. Exporteer naar PDF vanuit sjabloon/Slides. Bevestig echte Philips-playlist en pad /philips/pdf tijdens apparaattest. FTP gaat via een geschikte gateway met netwerkbereik; Apps Script heeft geen native FTP. Upload publicatie veilig en controleer werkelijke weergave. Privégegevens nooit automatisch op scherm.
Formulieren: Titel, Schermgroep, Start en einde, PDF of sjabloon; voeg relevante detail-, wijzigings- en controleformulieren toe.
Acceptatie:
- Scherm geeft juiste publicatie weer
- Verlopen item verdwijnt
- Mislukte upload zichtbaar en herstelbaar


## Module verlof Verlofregistratie
Functies: 62.
Tabbladen: Afspraken, Werkroosters, VerlofPotjes, VerlofAanvragen, VerlofMutaties, TermijnBeoordelingen.
Specifieke velden naast standaardvelden: medewerker_id, soort, opbouwjaar, toegekend_minuten, gereserveerd_minuten, opgenomen_minuten, kandidaat_afloop, afspraak_id, beoordelaar_id.
Werking: Gebruik afzonderlijk personeelsbestand achter dezelfde app als niet iedereen inzage mag hebben. Wettelijke uren standaard kandidaat-verval 1 juli volgend jaar; bovenwettelijk verjaring vijf jaar na opbouwjaar. Voor 2026: 1 juli 2027 respectievelijk beoordeling 1 januari 2032. Geen automatische afboeking zonder beoordeling van uitzonderingen/informatieplicht. Wettelijk in beginsel 4 maal weekuren per jaar, naar rato. Instelbare cao/contract, rooster, jaarpotjes, gunstiger termijn, herkomst afspraak en ingangsdatum. Aanvraag, bevoegde goedkeurder/vervanger, overlap huismeesters, waarschuwingen en toepasselijke reactietermijn zichtbaar. Andere verlofsoorten eigen regels. Annulering herstelt oorspronkelijke potjes en termijnen. Geen medische details.
Formulieren: Verlofsoort, Van en tot, Aantal uren, Goedkeurder; voeg relevante detail-, wijzigings- en controleformulieren toe.
Acceptatie:
- Grensdata 2027 en 2032 getest
- Deeltijd en roosterwijziging nagerekend
- Annulering behoudt termijnen
- Bijzondere afspraak werkt en is herleidbaar
- Onbevoegde collega ziet geen saldi of redenen


## Module assistent Gemini assistent
Functies: 45, 46.
Tabbladen: Kennisbronnen, PublicatieRechten, AIInstructies, AIRequestLog.
Specifieke velden naast standaardvelden: taak, model_id, instructieversie, bron_ids, rol, antwoord_status, escalatie_id.
Werking: Centrale Gemini 3.8 Flash, model-ID gemini-3.8-flash, alleen serverzijde. Interne documenten en bewonerskennisbank strikt scheiden. Bronverwijzingen, geen verzonnen antwoord, minimaal noodzakelijke data. Bewoners via WhatsApp zonder login; privégegevens alleen via geautoriseerde functies. Escaleer onzekerheid/spoed. Akte-, factuur- en MJOP-herkenning maakt voorstellen die een medewerker bevestigt. Geen onbeperkte tools, personeelsinzage, autonome boekingen of juridische besluitvorming.
Formulieren: Vraag, Kennisbank, Bronverwijzing, Doorzetten naar medewerker; voeg relevante detail-, wijzigings- en controleformulieren toe.
Acceptatie:
- Bewoners lezen geen interne bronnen
- Ontbrekende bron leidt tot escalatie
- Instructiemisbruik verandert geen rechten
- Modeluitval laat handmatige processen werken


## Module beheer Beheer en rapportages
Functies: 47, 48, 49, 50, 51, 52, 53.
Tabbladen: Gebruikers, Rollen, Instellingen, Wijzigingslog, Foutenlog, TaakWachtrij, Verwerkingen, Backups, SchemaVersies.
Specifieke velden naast standaardvelden: gebruiker_id, rol, actief, module, actie, record_id, request_id, versie, foutcode.
Werking: Interne accounts met expliciete actieve toelating; rollen voor beheerder, huismeester, bestuur, boekhouder en kascommissie. Rechten serverzijdig. Alleen beheerder verwijderen/samenvoegen; liever archiveren. Configureer categorieën, objecttypen, codes, berichten en termijnen. Log actor/tijd/voor-na zonder sleutels. Export per module, foutopvolging, quota-monitoring, automatische back-up en herstelproef. Responsive webapp voor computer/Chromebook/tablet/telefoon.
Formulieren: Gebruiker of rol, Module, Bevoegdheid, Instelling; voeg relevante detail-, wijzigings- en controleformulieren toe.
Acceptatie:
- Rechten op elke actie getest
- Herstel naar aparte bestemming gecontroleerd
- Export sluit aan op bron
- Kwetsbare gegevens/sleutels niet in browser of logs


## Volledige functieslijst
1. Dashboard
2. Taken en actielijsten in Kanban stijl
3. Gebouwenstructuur
4. Objecten en apparatuur
5. Codes en QR-labels
6. Periodiek onderhoud
7. Keuringen en inspecties
8. Leveranciers en contracten
9. Gasmeteropnameronde
10. Herkenning en menselijke bevestiging
11. Metercontrole en historie
12. Tijdelijke conceptinvoer bij slecht bereik met expliciete beperking
13. Eigen meterstand via WhatsApp
14. Gecontroleerde toegang tot metergegevens
15. Meteroverzichten en export
16. Storingen via WhatsApp
17. Storingen via QR
18. Storingen via formulier
19. Mondelinge en telefonische melding intern registreren
20. Centrale storingenlijst
21. Afhandeling en terugkoppeling
22. Samenhangende meldingen
23. Werkorders
24. Contactenregister
25. Woning- en ledenadministratie intern
26. Mailinglijsten
27. Berichten met bijlagen versturen
28. Communicatiehistorie
29. Voorkeuren en privacy
30. Wijzigingsverzoeken
31. Documentenbeheer
32. Documentverstrekking
33. Gedeelde agenda
34. ALV voorbereiden
35. Presentie en volmachten
36. Interne stemregistratie
37. Notulen en besluiten
38. MJOP
39. Reservefondsprognose
40. Onderhoudsdossiers
41. Boekhoudintegratie
42. Bijdragen en open posten
43. Bankverwerking
44. Financiële controle
45. Interne AI-assistent en bewonerskanaal
46. Gegevensherkenning uit documenten
47. Rapportages
48. Zoeken en export
49. Interne gebruikers en rechten
50. Instellingen
51. Wijzigingshistorie
52. Back-up en continuïteit
53. Responsive bediening
54. Sleutelbeheer
55. RI&E en incidenten
56. Schoonmaakrondes
57. VIB-dossiers
58. Voorraad
59. Narrowcasting
60. Automatisch meterbericht
61. Gedeelde contactensynchronisatie
62. Verlofregistratie

## Specifieke verlofproeven
2026 wettelijke uren: kandidaat-verval 1 juli 2027; bovenwettelijk uit 2026: vijf jaar na opbouwjaar, beoordelen op 1 januari 2032. Test dag vóór en op datum, ruimere schriftelijke afspraak, tijdig waarschuwen, redelijkerwijs niet kunnen opnemen en menselijke uitzonderingsbeoordeling. Instellingen mogen geen dwingend wettelijk recht beperken. Verschillende verlofsoorten niet automatisch van vakantie afboeken. Beoordeling bewaart herkomst en reden, zonder medische details. Toepasselijke reactietermijn bij aanvraag signaleren en juridische gevolgstatus zichtbaar maken, geen eindeloos wachtende aanvraag.

## Externe afhankelijkheden en stopcriteria
Voys is nummeromgeving; de daadwerkelijke WhatsApp-berichten-API nog bevestigen. Geen belplanwebhook als berichten-API. Bank en boekhoudmotor nog selecteren. Schermprotocol en netwerktoegang nog bevestigen. Workspace gedeeld adresboek nog beproeven. Gemini API-toegang zakelijk testen. Geen productiegereedverklaring bij ontbrekende koppeling; maak dan duidelijk gelabelde testadapter en gerichte beslisnotitie. Oude plannen met Firestore en 363 vaste sessies zijn niet de architectuur of bindende bouwplanning van dit pakket.
