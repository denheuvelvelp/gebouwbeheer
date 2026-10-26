Lees eerst Gemini_Masterprompt_Den_Heuvel.md. Behoud architectuur, gegevenscontract, rechten en uitvoeringseisen.

Bouw nu module Gasmeterstanden.

Functies 9, 10, 11, 12, 13, 14, 15, 60
Tabbladen: Meters, Opnamerondes, Meteropnames, Meterwissels, NummerAutorisaties
Velden: meter_id, eenheid_id, ronde_id, opname_id, opgenomen_op, vorige_stand, voorgestelde_stand, bevestigde_stand, eenheid, foto_id, status

Start ronde > scan QR > controleer meter/woning > foto > Gemini-voorstel > medewerker bevestigt > opslaan. Handmatige invoer als terugval. Lagere stand vraagt controle; meterwissel krijgt oude eindstand en nieuwe beginstand. Bewaar originele foto en correctiehistorie. Export maandstanden, afwijkingen en ontbrekende meters. De Sheets-versie werkt online; functie 12 betekent expliciete tijdelijke conceptinvoer op vertrouwde apparaten, niet gegarandeerde volledige offline fotoherkenning of synchronisatie. Proef eerst of lokale conceptopslag met herstel haalbaar is; markeer deze beperkt totdat de toesteltest slaagt.

Verwijs naar schermontwerp screens/meters.png.

Acceptatie
- Tien meters met foto en stand terugvinden
- Onleesbare foto wordt niet automatisch definitief
- Dubbele opname en verkeerde meter geblokkeerd
- Een concept geldt nooit als definitieve bewonerstand

Lever echte opslag, controles, tests en handleiding. Geen productiepublicatie zonder concrete configuratie en expliciete uitvoeringsstap. Werk voortgang en de functiesmatrix bij.

Werk alleen deze module uit. Behoud de bestaande Kanban-acties en gebruik de centrale Acties-registratie voor gekoppelde vervolgacties. Stop na de oplevering van deze module en wacht op de volgende opdracht.
