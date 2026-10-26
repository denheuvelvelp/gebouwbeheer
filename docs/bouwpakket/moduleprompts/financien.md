Lees eerst Gemini_Masterprompt_Den_Heuvel.md. Behoud architectuur, gegevenscontract, rechten en uitvoeringseisen.

Bouw nu module Boekhouding en bijdragen.

Functies 41, 42, 43, 44
Tabbladen: FinancieleReferenties, BijdrageInstellingen, FactuurKoppelingen, BankSyncLog, Budgetten
Velden: extern_boeking_id, extern_factuur_id, contact_id, bedrag_cent, valuta, periode, betaalstatus, sync_status

Koppel bestaande boekhoudmotor: grootboek, beginbalans, bijdragen/facturen, open posten, deelbetalingen, herinneringen, banktransacties, begroting, balans, resultaat en jaarafsluiting. Boekhoudmotor blijft leidend. Sheets bewaart gecontroleerde referenties en rapportkopieën; geen zelfverzonnen bank-API. Incasso/betaling alleen na aparte bevoegdheid en opdracht. Kascommissie krijgt beperkte leesinzage.

Verwijs naar schermontwerp screens/financien.png.

Acceptatie
- Beginbalans en bank gereconcilieerd
- Dubbele import en factuur verhinderd
- Deelbetaling/credit correct
- Financieel verantwoordelijke accepteert jaarproef

Lever echte opslag, controles, tests en handleiding. Geen productiepublicatie zonder concrete configuratie en expliciete uitvoeringsstap. Werk voortgang en de functiesmatrix bij.

Werk alleen deze module uit. Behoud de bestaande Kanban-acties en gebruik de centrale Acties-registratie voor gekoppelde vervolgacties. Stop na de oplevering van deze module en wacht op de volgende opdracht.
