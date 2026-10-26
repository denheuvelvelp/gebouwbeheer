Lees eerst Gemini_Masterprompt_Den_Heuvel.md. Behoud architectuur, gegevenscontract, rechten en uitvoeringseisen.

Bouw nu module Contacten en ledenadministratie.

Functies 24, 25, 29, 30, 61
Tabbladen: Contacten, Organisaties, ContactRelaties, Lidmaatschappen, Wijzigingsverzoeken, SyncLog
Velden: contact_id, naam, organisatie_id, email, telefoon, taal, voorkeurskanaal, rol, eenheid_id, geldig_van, geldig_tot

Bewoners, eigenaren, huurders, vertegenwoordigers, leveranciers en relaties in één bron. Meerdere rollen per persoon. Wijziging via formulier of bericht wordt gecontroleerd verwerkt. Verhuizing beëindigt relatie en persoonlijke toegang; historie blijft volgens bewaarbeleid. Medewerkers voegen toe en mogen binnen hun rol wijzigen; beheerder verwijdert/samenvoegt. Gedeeld Google-adresboek apart verifiëren: persoonlijke People API-contacten zijn niet automatisch organisatiebreed gedeeld.

Verwijs naar schermontwerp screens/contacten.png.

Acceptatie
- Verhuizing past doelgroep en toegang aan
- Samenvoegen behoudt gekoppelde historie
- Synchronisatie zichtbaar bij twee bevoegde medewerkers

Lever echte opslag, controles, tests en handleiding. Geen productiepublicatie zonder concrete configuratie en expliciete uitvoeringsstap. Werk voortgang en de functiesmatrix bij.

Werk alleen deze module uit. Behoud de bestaande Kanban-acties en gebruik de centrale Acties-registratie voor gekoppelde vervolgacties. Stop na de oplevering van deze module en wacht op de volgende opdracht.
