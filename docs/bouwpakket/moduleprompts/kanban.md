Lees eerst Gemini_Masterprompt_Den_Heuvel.md. Bouw uitsluitend module Actielijst Kanban na een geslaagd fundament.

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

Gebruik screens/kanban.png als visuele specificatie. Lever code met echte opslag, acceptatieproeven, bediening en voortgang. Stop na deze module en wacht op de volgende opdracht.
