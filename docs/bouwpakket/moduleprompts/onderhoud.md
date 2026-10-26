Lees eerst Gemini_Masterprompt_Den_Heuvel.md. Behoud architectuur, gegevenscontract, rechten en uitvoeringseisen.

Bouw nu module Onderhoud en inspecties.

Functies 6, 7, 8
Tabbladen: Onderhoudsplannen, Onderhoudstaken, Inspecties, Leveranciers, Contracten
Velden: object_id, taaktype, frequentie, volgende_datum, verantwoordelijke, leverancier_id, contract_id, opzegdatum, bewijs_id

Plan periodiek onderhoud en inspecties aan objecten. Leg eigenaar, deadline, bewijs en vervolgactie vast. Contracten bevatten looptijd en opzegtermijn. Herhaalde geplande verwerking maakt dezelfde taak niet nogmaals. Inspectiebevinding kan een storing of RI&E-actie worden.

Verwijs naar schermontwerp screens/onderhoud.png.

Acceptatie
- Herhaalde trigger genereert maar één taak
- Afwijking levert opvolgactie op
- Opzegwaarschuwing verschijnt op tijd

Lever echte opslag, controles, tests en handleiding. Geen productiepublicatie zonder concrete configuratie en expliciete uitvoeringsstap. Werk voortgang en de functiesmatrix bij.

Werk alleen deze module uit. Behoud de bestaande Kanban-acties en gebruik de centrale Acties-registratie voor gekoppelde vervolgacties. Stop na de oplevering van deze module en wacht op de volgende opdracht.
