Lees eerst Gemini_Masterprompt_Den_Heuvel.md. Behoud architectuur, gegevenscontract, rechten en uitvoeringseisen.

Bouw nu module Voorraad en materialen.

Functies 58
Tabbladen: Artikelen, VoorraadMutaties, BestelAdviezen
Velden: artikel_id, omschrijving, eenheid, opslaglocatie, mutatie_id, aantal, werkorder_id, minimumvoorraad

Boek ontvangst, verbruik, correctie en minimumvoorraad. Koppel materialen aan werkorders. Beheer saldo uit herleidbare mutaties; geen stil overschrijven. Besteladvies is geen automatische bestelling.

Verwijs naar schermontwerp screens/voorraad.png.

Acceptatie
- Verbruik sluit aan op werkorder
- Dubbele mutatie wordt verhinderd
- Minimumsignaal werkt

Lever echte opslag, controles, tests en handleiding. Geen productiepublicatie zonder concrete configuratie en expliciete uitvoeringsstap. Werk voortgang en de functiesmatrix bij.

Werk alleen deze module uit. Behoud de bestaande Kanban-acties en gebruik de centrale Acties-registratie voor gekoppelde vervolgacties. Stop na de oplevering van deze module en wacht op de volgende opdracht.
