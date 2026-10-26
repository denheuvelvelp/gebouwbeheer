Lees eerst Gemini_Masterprompt_Den_Heuvel.md. Behoud architectuur, gegevenscontract, rechten en uitvoeringseisen.

Bouw nu module Storingen en werkorders.

Functies 16, 17, 18, 19, 20, 21, 22, 23
Tabbladen: Meldingen, Meldingshistorie, Werkorders, Incidentkoppelingen
Velden: melding_id, kanaal, locatie_id, melder_id, omschrijving, prioriteit, eigenaar_id, status, streefdatum, afsluitreden

Alle kanalen schrijven naar dezelfde registratie. Nieuw > beoordeeld > ingepland > in uitvoering > opgelost > gesloten; wachtreden apart. Heropenen mogelijk. Koppel dubbele meldingen aan een incident. Registreer mondelinge meldingen namens de bewoner. Maak gekoppelde werkorders met planning, leverancier, uren, materialen en kosten. Bewoners krijgen gecontroleerde statusberichten; interne notities blijven intern.

Verwijs naar schermontwerp screens/storingen.png.

Acceptatie
- Formulier maakt één melding
- Werkorder en status blijven na herladen bestaan
- Onbevoegde inzage en dubbele inzending geblokkeerd
- Afsluiten en heropenen zichtbaar in historie

Lever echte opslag, controles, tests en handleiding. Geen productiepublicatie zonder concrete configuratie en expliciete uitvoeringsstap. Werk voortgang en de functiesmatrix bij.

Werk alleen deze module uit. Behoud de bestaande Kanban-acties en gebruik de centrale Acties-registratie voor gekoppelde vervolgacties. Stop na de oplevering van deze module en wacht op de volgende opdracht.
