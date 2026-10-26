Lees eerst Gemini_Masterprompt_Den_Heuvel.md. Behoud architectuur, gegevenscontract, rechten en uitvoeringseisen.

Bouw nu module Gemini assistent.

Functies 45, 46
Tabbladen: Kennisbronnen, PublicatieRechten, AIInstructies, AIRequestLog
Velden: taak, model_id, instructieversie, bron_ids, rol, antwoord_status, escalatie_id

Centrale Gemini 3.8 Flash, model-ID gemini-3.8-flash, alleen serverzijde. Interne documenten en bewonerskennisbank strikt scheiden. Bronverwijzingen, geen verzonnen antwoord, minimaal noodzakelijke data. Bewoners via WhatsApp zonder login; privégegevens alleen via geautoriseerde functies. Escaleer onzekerheid/spoed. Akte-, factuur- en MJOP-herkenning maakt voorstellen die een medewerker bevestigt. Geen onbeperkte tools, personeelsinzage, autonome boekingen of juridische besluitvorming.

Verwijs naar schermontwerp screens/assistent.png.

Acceptatie
- Bewoners lezen geen interne bronnen
- Ontbrekende bron leidt tot escalatie
- Instructiemisbruik verandert geen rechten
- Modeluitval laat handmatige processen werken

Lever echte opslag, controles, tests en handleiding. Geen productiepublicatie zonder concrete configuratie en expliciete uitvoeringsstap. Werk voortgang en de functiesmatrix bij.

Werk alleen deze module uit. Behoud de bestaande Kanban-acties en gebruik de centrale Acties-registratie voor gekoppelde vervolgacties. Stop na de oplevering van deze module en wacht op de volgende opdracht.
