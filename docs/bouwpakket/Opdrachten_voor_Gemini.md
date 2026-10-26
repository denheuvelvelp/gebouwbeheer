# Zo geef je Gemini de bouwopdrachten
Versie 2.1 | 25 oktober 2026

## Je hoeft geen opdrachten te bedenken
Het pakket bevat de opdrachten al. Jij geeft Gemini telkens drie dingen: de gezamenlijke bouwafspraken, de opdracht voor één module en het bijbehorende schermbeeld. Kopieer de teksten hieronder letterlijk. Begin geen nieuw project voor iedere module.

De nieuwe startvolgorde is fundament > Kanban-actielijst > storingenbeheer. De overige modules volgen daarna. Kanban is een uitwerking van de bestaande functie 2; het aantal afgesproken functies blijft 62.

## Eerst bepalen wat Gemini kan doen
Gebruik bij voorkeur Gemini als code-assistent in een ontwikkelomgeving met toegang tot de projectmap. Daar kan het bestanden maken, wijzigen en tests uitvoeren. Een gewone Gemini-chat zonder toegang tot je project kan alleen code en instructies geven: die kan niet bewijzen dat jouw app is opgeslagen of gepubliceerd.

Heeft Gemini geen toegang tot bestanden? Upload de genoemde bestanden als de omgeving dit ondersteunt, of plak de volledige tekst. Alleen een bestandsnaam noemen geeft geen toegang tot dat bestand. Werk je uitsluitend in een gewone chat, voeg dan toe: “Geef per stap de exacte bestandsnaam, de volledige bestandsinhoud en waar ik die opsla. Claim geen uitvoering die je niet zelf hebt gedaan.”

## Stap 1 Pak het nieuwe pakket uit
Bewaar de hoofdmap op een herkenbare plek. Daarin staan Gemini_Masterprompt_Den_Heuvel.md, moduleprompts, screens en deze uitleg. Maak één lege projectmap voor de daadwerkelijke app en leg de instructiebestanden daarin onder docs/bouwpakket. De ZIP is ontwerpmateriaal en bevat nog geen werkende app.

## Stap 2 Eenmalige startopdracht voor het fundament
Geef Gemini het bestand Gemini_Masterprompt_Den_Heuvel.md. Als uploaden niet kan, open het als tekst en plak de volledige inhoud. Plak daarna exact deze opdracht:

BEGIN OPDRACHT A
Lees de volledige masterprompt die ik heb toegevoegd. Dit is de leidende scope.
Controleer eerst of je de projectbestanden kunt lezen en wijzigen. Meld eerlijk welke toegang je hebt.
Bouw uitsluitend release 0, het fundament. Maak projectstructuur, veilige configuratievoorbeelden, test-Sheetschema, medewerkersaanmelding en de beveiligde verbindingsproef tussen interface, gateway, Apps Script en Sheets. Gebruik fictieve gegevens.
Bouw nog geen Kanban of storingenmodule. Leg uit welke accountgegevens of IDs nodig zijn en laat mij secrets uitsluitend in de juiste geheime opslag invoeren.
Werk in kleine stappen. Geef na elke stap het zichtbare resultaat en de exacte controle die ik moet uitvoeren. Voer alleen uit wat je werkelijk kunt en leg ontbrekende uitvoering vast.
Eindig met gewijzigde bestanden, testresultaten, open punten en een bijgewerkt docs/VOORTGANG.md. Stop daarna en wacht op mijn volgende moduleopdracht.
EINDE OPDRACHT A

Wat je terug moet krijgen: echte projectbestanden of volledige te plaatsen bestandsinhoud, concrete configuratiestappen en een proef waarmee een toegelaten testregistratie wordt opgeslagen en teruggelezen. Een architectuurtekst of alleen een scherm is geen voltooid fundament.

## Stap 3 Controleopdracht voor het fundament
Plak na de bouw exact dit:

BEGIN OPDRACHT B
Controleer release 0 tegen de masterprompt. Laat zien hoe een toegelaten gebruiker één fictieve registratie opslaat en terugleest. Test een onbevoegde gebruiker, een ongeldig ondertekend verzoek en een dubbel aangeleverd verzoek. Controleer Drive-toegang en dat sleutels niet in browser of broncode staan.
Voer de beschikbare tests en build uit. Geef voor handmatige stappen een concrete lijst met verwacht resultaat. Noem uitsluitend aantoonbaar uitgevoerde controles als geslaagd. Los blokkerende fouten op en werk docs/VOORTGANG.md bij. Begin nog geen volgende module.
EINDE OPDRACHT B

Ga pas verder wanneer deze proef slaagt. Bij ontbrekende koppelinformatie laat Gemini precies benoemen welk veld of welke beheerinstelling nodig is. Deel geen sleutel in de chat en maak de relay niet onbeveiligd om de proef te laten werken.

## Stap 4 Bouw de Kanban-actielijst
Gebruik hetzelfde project. Geef Gemini moduleprompts/kanban.md en screens/kanban.png. Plak vervolgens:

BEGIN OPDRACHT C
Het fundament is gecontroleerd. Lees docs/VOORTGANG.md en de masterprompt.
Bouw uitsluitend de module uit het bijgevoegde bestand kanban.md. Gebruik kanban.png als schermontwerp. Behoud alle werkende basisfuncties en gegevens.
Ik wil een zelfstandige actielijst met de kolommen Te doen, In uitvoering, Wacht en Gereed. Acties krijgen titel, omschrijving, verantwoordelijke, prioriteit, deadline, labels, checklist en bijlagen. Invoeren en wijzigen via een formulier. Verplaatsen via slepen én via een knop of keuzelijst, ook bruikbaar op mobiel.
Sla acties, kolomvolgorde en historie echt op in de test-spreadsheet. Toon opslagfouten en herstel de kaartpositie als opslaan mislukt. Controleer versieconflicten bij twee gebruikers. Bouw filters en een persoonlijke weergave.
Gebruik één centrale actiesregistratie waarop volgende modules aansluiten. Bouw nu nog geen storingenmodule.
Lever testinstructies, gewijzigde bestanden en bijgewerkte voortgang. Stop na deze module en wacht op mijn volgende opdracht.
EINDE OPDRACHT C

Je eerste praktische proef: maak “Entree Noord controleren”, wijs een huismeester toe, geef een deadline, verplaats de kaart naar In uitvoering en ververs de pagina. De kaart moet daar blijven staan. Controleer daarna afronden en heropenen.

## Stap 5 Test en rond Kanban af
Plak exact dit:

BEGIN OPDRACHT D
Controleer alleen de Kanban-module. Test aanmaken, wijzigen, toewijzen, filters, deadline, checklist, bijlage, verslepen, verplaatsen zonder slepen, afronden, heropenen en archiveren. Test ook een opslagfout en twee gelijktijdige bewerkers.
Bewijs dat status en kaartvolgorde na herladen behouden blijven en een dubbele klik geen tweede actie maakt. Laat onbevoegde toegang weigeren. Geef ontbrekende handmatige proeven met de verwachte uitkomst.
Herstel blokkerende fouten, voer relevante tests en build uit en werk de acceptatiematrix en docs/VOORTGANG.md bij. Geef de opgeslagen versie of commit aan als je die werkelijk hebt gemaakt. Start nog geen andere module.
EINDE OPDRACHT D

Sla de gecontroleerde codeversie op in GitHub. Noteer datum, testresultaten en volgende stap. Is iets niet getest of nog niet aangesloten, laat dat zichtbaar open staan.

## Stap 6 Voeg storingen toe
Geef moduleprompts/storingen.md en screens/storingen.png. Voeg voor het publieke formulier eventueel screens/publiek_mobiel.png toe. Plak:

BEGIN OPDRACHT E
Kanban is afgerond. Lees de masterprompt en docs/VOORTGANG.md.
Bouw nu uitsluitend storingenbeheer volgens de bijgevoegde moduleprompt en schermbeelden. Behoud de Kanban-module. Voeg alleen de noodzakelijke locatie- en contactbasis toe.
Maak het openbare meldformulier, het interne overzicht en afhandelen via werkorders werkend met de test-spreadsheet. Gebruik voor gekoppelde opvolgacties de bestaande centrale Acties-registratie; maak geen tweede actielijst.
Een Kanban-kaart verplaatsen mag de gekoppelde storing niet zonder expliciete bevoegde handeling sluiten. Test de hele keten en het voorkomen van duplicaten.
Lever bediening, tests en bijgewerkte voortgang. Stop na deze module.
EINDE OPDRACHT E

## Stap 7 Iedere volgende module op dezelfde manier
Je kiest een bestaand bestand uit moduleprompts en het gelijknamige PNG-bestand in screens. Voeg beide echt toe aan Gemini. Plak onderstaande opdracht; omdat de bestanden zijn toegevoegd hoef je geen technische specificatie te schrijven.

BEGIN OPDRACHT F
Lees de masterprompt en docs/VOORTGANG.md.
Bouw uitsluitend de module uit het zojuist toegevoegde modulebestand. Het toegevoegde schermbeeld is de visuele specificatie. Behoud bestaande functies, rechten, gegevens en de centrale Kanban-actielijst.
Controleer vooraf de afhankelijkheden. Voeg alleen een minimaal noodzakelijk basisdeel toe; bouw niet ongevraagd andere volledige modules.
Lever werkende code, opslag, validatie, rechten en foutafhandeling. Voer de moduleproeven en relevante tests/build uit. Geef handmatige controles met verwacht resultaat en benoem nog niet aangesloten externe diensten.
Werk voortgang en acceptatiematrix bij. Stop na deze module en wacht op mijn volgende opdracht.
EINDE OPDRACHT F

Voorbeeld: voor contacten voeg je contacten.md en contacten.png toe. Voor meters voeg je meters.md en meters.png toe. Begin bij een module die gegevens uit een andere module nodig heeft pas nadat de betreffende basis aanwezig is.

## Als er iets misgaat
Plak de volgende opdracht en vul alleen de twee gewone zinnen aan. Verwijder sleutels en persoonsgegevens uit foutmeldingen.

BEGIN HERSTELOPDRACHT
Ik werk aan de huidige module. Ik verwacht: [beschrijf wat je wilde doen].
Er gebeurt: [beschrijf wat je ziet en plak de eerste foutmelding zonder geheimen].
Onderzoek de kleinste oorzaak in de bestaande code. Behoud gegevens en beveiliging. Herstel de fout, herhaal dezelfde proef en werk docs/VOORTGANG.md bij. Begin geen volgende module en verberg de fout niet achter voorbeeldgegevens.
EINDE HERSTELOPDRACHT

## Een nieuwe Gemini-sessie beginnen
Geef toegang tot dezelfde projectmap en voeg bij twijfel de masterprompt opnieuw toe. Plak:

BEGIN HERVATOPDRACHT
Lees de masterprompt en docs/VOORTGANG.md. Bekijk eerst de bestaande bestanden en eventuele niet-opgeslagen wijzigingen. Vat kort samen welke module gereed is en wat de eerstvolgende open taak is. Ga alleen met die taak verder. Begin geen nieuw project, wis geen bestaande code en maak geen tweede administratie.
EINDE HERVATOPDRACHT

## Wat je steeds controleert
Vraag steeds om vier uitkomsten: wat is gebouwd, wat is werkelijk getest, wat moet jij nog doen en wat is de eerstvolgende stap. “Het is klaar” zonder opslagproef en rechtencontrole is onvoldoende. Een gewone chat zonder uitvoeringstoegang levert instructies en code, geen bewijs van een draaiende app.
