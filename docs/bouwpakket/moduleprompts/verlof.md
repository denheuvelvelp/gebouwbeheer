Lees eerst Gemini_Masterprompt_Den_Heuvel.md. Behoud architectuur, gegevenscontract, rechten en uitvoeringseisen.

Bouw nu module Verlofregistratie.

Functies 62
Tabbladen: Afspraken, Werkroosters, VerlofPotjes, VerlofAanvragen, VerlofMutaties, TermijnBeoordelingen
Velden: medewerker_id, soort, opbouwjaar, toegekend_minuten, gereserveerd_minuten, opgenomen_minuten, kandidaat_afloop, afspraak_id, beoordelaar_id

Gebruik afzonderlijk personeelsbestand achter dezelfde app als niet iedereen inzage mag hebben. Wettelijke uren standaard kandidaat-verval 1 juli volgend jaar; bovenwettelijk verjaring vijf jaar na opbouwjaar. Voor 2026: 1 juli 2027 respectievelijk beoordeling 1 januari 2032. Geen automatische afboeking zonder beoordeling van uitzonderingen/informatieplicht. Wettelijk in beginsel 4 maal weekuren per jaar, naar rato. Instelbare cao/contract, rooster, jaarpotjes, gunstiger termijn, herkomst afspraak en ingangsdatum. Aanvraag, bevoegde goedkeurder/vervanger, overlap huismeesters, waarschuwingen en toepasselijke reactietermijn zichtbaar. Andere verlofsoorten eigen regels. Annulering herstelt oorspronkelijke potjes en termijnen. Geen medische details.

Verwijs naar schermontwerp screens/verlof.png.

Acceptatie
- Grensdata 2027 en 2032 getest
- Deeltijd en roosterwijziging nagerekend
- Annulering behoudt termijnen
- Bijzondere afspraak werkt en is herleidbaar
- Onbevoegde collega ziet geen saldi of redenen

Lever echte opslag, controles, tests en handleiding. Geen productiepublicatie zonder concrete configuratie en expliciete uitvoeringsstap. Werk voortgang en de functiesmatrix bij.

Werk alleen deze module uit. Behoud de bestaande Kanban-acties en gebruik de centrale Acties-registratie voor gekoppelde vervolgacties. Stop na de oplevering van deze module en wacht op de volgende opdracht.
