#!/usr/bin/env python3
"""
Den Heuvel Gebouw- en Verenigingsbeheer
Cloud Run Gateway & Lokale Test-Relay Server
Versie 2.1

Architectuur:
Browser Frontend -> Gateway (dit bestand) -> Apps Script -> Google Sheets
Biedt tevens een persistente test-database (data/test_sheets.json) conform het 13-tabbladen schema.
"""

import http.server
import socketserver
import json
import os
import sys
import time
import uuid
import hmac
import hashlib
import base64
import urllib.request
import urllib.error
import threading

ROOT_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATA_DIR = os.path.join(ROOT_DIR, "data")
STORAGE_FILE = os.path.join(DATA_DIR, "test_sheets.json")

# Laad .env bestand indien aanwezig
env_file = os.path.join(ROOT_DIR, ".env")
if os.path.exists(env_file):
    try:
        with open(env_file, "r", encoding="utf-8") as f:
            for line in f:
                line = line.strip()
                if not line or line.startswith("#") or "=" not in line:
                    continue
                k, v = line.split("=", 1)
                k = k.strip()
                v = v.strip().strip("'\"")
                if k:
                    os.environ[k] = v
    except Exception as e:
        print("Waarschuwing bij inlezen .env:", e)

PORT = int(os.environ.get("PORT", 3000))

# Configuratie via omgevingsvariabelen of defaults
APPS_SCRIPT_URL = os.environ.get("APPS_SCRIPT_URL", "").strip()
RELAY_SECRET = os.environ.get("RELAY_SECRET", "denheuvel-test-secret-2026").strip()
SCHEMA_VERSION = "2.1.0"

# Mutex voor persistente bestandswijzigingen
storage_lock = threading.Lock()

# Sessiebeheer (standaard ingelogd als Huismeester 1)
CURRENT_ACTOR = {
    "email": "huismeester1@denheuvelvelp.nl",
    "naam": "Huismeester 1",
    "rol": "huismeester",
    "actief": True
}

# ========================================================
# 1. STANDAARD DATA VOOR TEST-ADMINISTRATIE (13 TABBLADEN)
# ========================================================

def get_initial_sheets_data():
    return {
        "SchemaVersies": [
            {"id": "VER-001", "versie": "2.1.0", "aangemaakt_op": "2026-10-26T06:00:00Z", "geïnstalleerd_door": "Systeem", "omschrijving": "Initiële inrichting fundament, Kanban en Storingen"}
        ],
        "Gebruikers": [
            {"id": "USR-001", "email": "huismeester1@denheuvelvelp.nl", "naam": "Huismeester 1", "rol": "huismeester", "actief": True, "laatst_ingelogd": "2026-10-26T06:00:00Z", "recordVersion": 1},
            {"id": "USR-002", "email": "huismeester2@denheuvelvelp.nl", "naam": "Huismeester 2", "rol": "huismeester", "actief": True, "laatst_ingelogd": "2026-10-26T06:00:00Z", "recordVersion": 1},
            {"id": "USR-003", "email": "bestuur@denheuvelvelp.nl", "naam": "Bestuur Den Heuvel", "rol": "bestuur", "actief": True, "laatst_ingelogd": "2026-10-26T06:00:00Z", "recordVersion": 1}
        ],
        "Instellingen": [
            {"id": "SET-001", "sleutel": "gebouw_naam", "waarde": "Den Heuvel", "omschrijving": "Naam van het complex", "bijgewerkt_op": "2026-10-26T06:00:00Z"},
            {"id": "SET-002", "sleutel": "beheer_domein", "waarde": "beheer.denheuvelvelp.nl", "omschrijving": "Productiedomein", "bijgewerkt_op": "2026-10-26T06:00:00Z"},
            {"id": "SET-003", "sleutel": "max_upload_mb", "waarde": "10", "omschrijving": "Maximale bestandsgrootte in MB", "bijgewerkt_op": "2026-10-26T06:00:00Z"}
        ],
        "BordKolommen": [
            {"kolom_id": "todo", "titel": "Te doen", "volgorde": 1, "standaard_kolom": True, "actief": True},
            {"kolom_id": "in_progress", "titel": "In uitvoering", "volgorde": 2, "standaard_kolom": True, "actief": True},
            {"kolom_id": "waiting", "titel": "Wacht", "volgorde": 3, "standaard_kolom": True, "actief": True},
            {"kolom_id": "done", "titel": "Gereed", "volgorde": 4, "standaard_kolom": True, "actief": True}
        ],
        "Locaties": [
            {"locatie_id": "LOC-N-BG-01", "vleugel": "Noord", "verdieping": "BG", "omschrijving": "Noord · begane grond · entreedeur", "publiek_zichtbaar": True},
            {"locatie_id": "LOC-N-V2-01", "vleugel": "Noord", "verdieping": "2e verdieping", "omschrijving": "Noord · 2e verdieping hal", "publiek_zichtbaar": True},
            {"locatie_id": "LOC-W-LIFT", "vleugel": "West", "verdieping": "Alle", "omschrijving": "West · lift toren West", "publiek_zichtbaar": True},
            {"locatie_id": "LOC-W-PROM", "vleugel": "West", "verdieping": "BG", "omschrijving": "West · promenade", "publiek_zichtbaar": True},
            {"locatie_id": "LOC-Z-KELD", "vleugel": "Zuid", "verdieping": "Kelder", "omschrijving": "Zuid · kelder", "publiek_zichtbaar": True},
            {"locatie_id": "LOC-Z-PARK", "vleugel": "Zuid", "verdieping": "Kelder/BG", "omschrijving": "Zuid · parkeergarage", "publiek_zichtbaar": True},
            {"locatie_id": "LOC-B-CONT", "vleugel": "Buitenterrein", "verdieping": "Terrein", "omschrijving": "Buitenterrein · containerruimte", "publiek_zichtbaar": True}
        ],
        "Contacten": [
            {"contact_id": "CON-001", "naam": "Dhr. Bakker", "type": "Bewoner", "appartement": "12A", "telefoon": "06-12345678", "email": "b.bakker@email.nl", "notities": "Noord toren"},
            {"contact_id": "CON-002", "naam": "Mw. Van Dijk", "type": "Bewoner", "appartement": "Zuid 04", "telefoon": "06-98765432", "email": "vandijk@email.nl", "notities": "Zuid vleugel"},
            {"contact_id": "CON-003", "naam": "Fam. Willems", "type": "Bewoner", "appartement": "West 31", "telefoon": "06-11223344", "email": "willems@denheuvelvelp.nl", "notities": "West toren"},
            {"contact_id": "CON-004", "naam": "Firma Jansen Deurtechniek BV", "type": "Leverancier", "appartement": "-", "telefoon": "026-3334455", "email": "service@jansendeuren.nl", "notities": "Onderhoudscontract deuren"},
            {"contact_id": "CON-005", "naam": "Loodgietersbedrijf De Boer Velp", "type": "Leverancier", "appartement": "-", "telefoon": "026-4445566", "email": "info@loodgieterdeboer.nl", "notities": "Loodgieter"}
        ],
        "Acties": [
            {
                "id": "ACT-001",
                "title": "Entree Noord controleren",
                "description": "Controleer de dranger en het elektronisch slot van de hoofdentree Noord. Bewoners meldden dat de deur soms op een kier blijft staan bij harde wind.",
                "status": "todo",
                "kolom_id": "todo",
                "sorteervolgorde": 1,
                "owner": "Huismeester 1",
                "priority": "Hoog",
                "deadline": "2026-11-02",
                "label": "Inspectie",
                "checklist": [
                    {"text": "Deurdranger afstellen", "done": True},
                    {"text": "Paslezer en magneetcontact controleren", "done": False},
                    {"text": "Sluiting testen bij tocht", "done": False}
                ],
                "sourceType": "Storing",
                "sourceId": "M-2026-0042",
                "recordVersion": 1,
                "createdAt": "2026-10-26T06:00:00Z",
                "updatedAt": "2026-10-26T06:00:00Z",
                "createdBy": "Huismeester 1",
                "updatedBy": "Huismeester 1",
                "archivedAt": ""
            },
            {
                "id": "ACT-002",
                "title": "Labelvoorraad aanvullen",
                "description": "Bestelling plaatsen voor nieuwe brievenbus- en naambordjes voor de nieuwe bewoners in vleugel West.",
                "status": "todo",
                "kolom_id": "todo",
                "sorteervolgorde": 2,
                "owner": "Huismeester 2",
                "priority": "Normaal",
                "deadline": "2026-11-05",
                "label": "Voorraad",
                "checklist": [
                    {"text": "Huidige voorraad tellen", "done": False},
                    {"text": "Standaardformaat bestellen bij leverancier", "done": False},
                    {"text": "Plaatsen in depot kast A", "done": False}
                ],
                "sourceType": "Handmatig",
                "sourceId": "HANDMATIG-2",
                "recordVersion": 1,
                "createdAt": "2026-10-26T06:00:00Z",
                "updatedAt": "2026-10-26T06:00:00Z",
                "createdBy": "Huismeester 2",
                "updatedBy": "Huismeester 2",
                "archivedAt": ""
            },
            {
                "id": "ACT-003",
                "title": "Werkprocedure bijwerken",
                "description": "Actualiseer de werkinstructie voor het inspecteren en vrijhouden van nooduitgangen conform de recente RI&E-bevindingen.",
                "status": "in_progress",
                "kolom_id": "in_progress",
                "sorteervolgorde": 1,
                "owner": "Huismeester 1",
                "priority": "Normaal",
                "deadline": "2026-11-04",
                "label": "Veiligheid",
                "checklist": [
                    {"text": "Concepttekst doornemen", "done": True},
                    {"text": "Afstemmen met bestuur", "done": False},
                    {"text": "Plamineren en ophangen in werkruimte", "done": False}
                ],
                "sourceType": "Handmatig",
                "sourceId": "HANDMATIG-3",
                "recordVersion": 1,
                "createdAt": "2026-10-26T06:00:00Z",
                "updatedAt": "2026-10-26T06:00:00Z",
                "createdBy": "Huismeester 1",
                "updatedBy": "Huismeester 1",
                "archivedAt": ""
            },
            {
                "id": "ACT-004",
                "title": "Leverancier terugbellen",
                "description": "Contact opnemen met firma Jansen over de jaarlijkse liftkeuring in toren Zuid en de vervanging van de noodverlichting.",
                "status": "in_progress",
                "kolom_id": "in_progress",
                "sorteervolgorde": 2,
                "owner": "Huismeester 2",
                "priority": "Hoog",
                "deadline": "2026-11-03",
                "label": "Onderhoud",
                "checklist": [
                    {"text": "Keuringsrapport erbij pakken", "done": False},
                    {"text": "Datum bevestigen met liftmonteur", "done": False}
                ],
                "sourceType": "Handmatig",
                "sourceId": "HANDMATIG-4",
                "recordVersion": 1,
                "createdAt": "2026-10-26T06:00:00Z",
                "updatedAt": "2026-10-26T06:00:00Z",
                "createdBy": "Huismeester 2",
                "updatedBy": "Huismeester 2",
                "archivedAt": ""
            },
            {
                "id": "ACT-005",
                "title": "Offerte deuronderhoud",
                "description": "Vergelijkingsvoorstel opstellen voor het onderhoudscontract van de automatische schuifdeuren vleugel Oost en garage-entree.",
                "status": "waiting",
                "kolom_id": "waiting",
                "sorteervolgorde": 1,
                "owner": "Bestuur",
                "priority": "Normaal",
                "deadline": "2026-11-06",
                "label": "Wacht op leverancier",
                "checklist": [
                    {"text": "Eerste offerte ontvangen", "done": True},
                    {"text": "Tweede offerte controleren", "done": False},
                    {"text": "Voorleggen in bestuursvergadering", "done": False}
                ],
                "sourceType": "Storing",
                "sourceId": "M-2026-0040",
                "recordVersion": 1,
                "createdAt": "2026-10-26T06:00:00Z",
                "updatedAt": "2026-10-26T06:00:00Z",
                "createdBy": "Bestuur",
                "updatedBy": "Bestuur",
                "archivedAt": ""
            },
            {
                "id": "ACT-006",
                "title": "Ronde West afronden",
                "description": "Wekelijkse controleronde vleugel West: verlichting, vluchtwegen en containerruimte gecontroleerd en schoongemaakt.",
                "status": "done",
                "kolom_id": "done",
                "sorteervolgorde": 1,
                "owner": "Huismeester 2",
                "priority": "Normaal",
                "deadline": "2026-10-24",
                "label": "Afgerond",
                "checklist": [
                    {"text": "Trappenhuisverlichting gecontroleerd", "done": True},
                    {"text": "Containerruimte nagelopen", "done": True},
                    {"text": "Inspectielogboek afgetekend", "done": True}
                ],
                "sourceType": "Handmatig",
                "sourceId": "HANDMATIG-6",
                "recordVersion": 1,
                "createdAt": "2026-10-26T06:00:00Z",
                "updatedAt": "2026-10-26T06:00:00Z",
                "createdBy": "Huismeester 2",
                "updatedBy": "Huismeester 2",
                "archivedAt": ""
            }
        ],
        "ActieHistorie": [
            {"historie_id": "AH-001", "actie_id": "ACT-001", "wijziging_type": "AANGEMAAKT", "oude_waarde": "", "nieuwe_waarde": "todo", "tijdstip": "2026-10-26T06:00:00Z", "gewijzigd_door": "Huismeester 1"}
        ],
        "Meldingen": [
            {
                "id": "M-2026-0042",
                "title": "Entree sluit niet goed",
                "location": "Noord · begane grond · entreedeur",
                "category": "Deuren & Toegang",
                "description": "De automatische entreedeur van toren Noord sluit traag en blijft af en toe op een kier van ca. 5 centimeter openstaan. Daardoor tocht het in de hal en is de nachtelijke toegang onveilig.",
                "status": "Ingepland",
                "waitingReason": "",
                "priority": "Hoog",
                "deadline": "2026-11-03",
                "owner": "Huismeester 1",
                "channel": "Publiek portaal",
                "reporter": "Dhr. Bakker (Appartement 12A)",
                "contact": "b.bakker@email.nl · 06-12345678",
                "photo": "entreedeur_kier_noord.jpg",
                "createdAt": "2026-10-26 08:30",
                "linkedActionId": "ACT-001",
                "recordVersion": 1,
                "updatedAt": "2026-10-26T08:30:00Z",
                "createdBy": "Dhr. Bakker",
                "updatedBy": "Huismeester 1",
                "archivedAt": ""
            },
            {
                "id": "M-2026-0041",
                "title": "Verlichting defect vleugel West",
                "location": "West · promenade",
                "category": "Verlichting & Elektra",
                "description": "Drie opeenvolgende LED-armaturen op de promenade vleugel West knipperen of branden niet meer. Geeft een onveilig gevoel 's avonds.",
                "status": "In uitvoering",
                "waitingReason": "",
                "priority": "Normaal",
                "deadline": "2026-11-04",
                "owner": "Huismeester 1",
                "channel": "Inspectieronde",
                "reporter": "Huismeester 1",
                "contact": "Intern (huismeester@denheuvelvelp.nl)",
                "photo": None,
                "createdAt": "2026-10-25 16:45",
                "linkedActionId": None,
                "recordVersion": 1,
                "updatedAt": "2026-10-25T16:45:00Z",
                "createdBy": "Huismeester 1",
                "updatedBy": "Huismeester 1",
                "archivedAt": ""
            },
            {
                "id": "M-2026-0040",
                "title": "Lekkage onderzocht kelder Zuid",
                "location": "Zuid · kelder",
                "category": "Lekkage & Loodgieter",
                "description": "Vochtplek en druppels waargenomen bij het leidingtracé nabij berging B-14 in de kelder van toren Zuid.",
                "status": "Beoordeeld",
                "waitingReason": "Wacht op leverancier",
                "priority": "Normaal",
                "deadline": "2026-11-06",
                "owner": "Bestuur",
                "channel": "Mondeling / Balie",
                "reporter": "Mw. Van Dijk (Zuid 04)",
                "contact": "06-98765432",
                "photo": "kelder_lekkage.jpg",
                "createdAt": "2026-10-24 11:20",
                "linkedActionId": "ACT-005",
                "recordVersion": 1,
                "updatedAt": "2026-10-24T11:20:00Z",
                "createdBy": "Huismeester 2",
                "updatedBy": "Bestuur",
                "archivedAt": ""
            },
            {
                "id": "M-2026-0039",
                "title": "Intercom ruis toren West",
                "location": "West · lift toren West",
                "category": "Intercom",
                "description": "Bewoners van verdieping 3 melden dat het belsignaal wel overgaat, maar dat het gesprek nauwelijks verstaanbaar is door ernstige ruis.",
                "status": "Nieuw",
                "waitingReason": "",
                "priority": "Laag",
                "deadline": "2026-11-08",
                "owner": "Huismeester 2",
                "channel": "Publiek portaal",
                "reporter": "Fam. Willems (West 31)",
                "contact": "willems@denheuvelvelp.nl",
                "photo": None,
                "createdAt": "2026-10-26 07:15",
                "linkedActionId": None,
                "recordVersion": 1,
                "updatedAt": "2026-10-26T07:15:00Z",
                "createdBy": "Fam. Willems",
                "updatedBy": "Fam. Willems",
                "archivedAt": ""
            },
            {
                "id": "M-2026-0038",
                "title": "Graffiti zijmuur containerruimte",
                "location": "Buitenterrein · containerruimte",
                "category": "Algemeen & Schoonmaak",
                "description": "Tags met zwarte spuitbus aangebracht op de betonnen zijmuur van de afvalopstelplaats.",
                "status": "Gesloten",
                "waitingReason": "",
                "priority": "Normaal",
                "deadline": "2026-10-25",
                "owner": "Huismeester 2",
                "channel": "WhatsApp",
                "reporter": "Bewoner alert (06-55443322)",
                "contact": "06-55443322",
                "photo": None,
                "createdAt": "2026-10-23 09:00",
                "linkedActionId": None,
                "recordVersion": 1,
                "updatedAt": "2026-10-25T15:00:00Z",
                "createdBy": "Huismeester 2",
                "updatedBy": "Huismeester 2",
                "archivedAt": ""
            }
        ],
        "Meldingshistorie": [
            {"historie_id": "MH-001", "melding_id": "M-2026-0042", "actie": "AANGEMAAKT", "details": "Melding ingediend via publiek portaal (/melden).", "tijdstip": "2026-10-26 08:30", "actor": "Dhr. Bakker (Bewoner)"},
            {"historie_id": "MH-002", "melding_id": "M-2026-0042", "actie": "BEOORDEELD", "details": "Melding beoordeeld ter plaatse. Dranger loopt stroef.", "tijdstip": "2026-10-26 09:15", "actor": "Huismeester 1"},
            {"historie_id": "MH-003", "melding_id": "M-2026-0042", "actie": "KANBAN_KOPPELING", "details": "Gekoppelde actie ACT-001 aangemaakt op Kanban-bord.", "tijdstip": "2026-10-26 09:40", "actor": "Huismeester 1"},
            {"historie_id": "MH-004", "melding_id": "M-2026-0042", "actie": "WERKORDER", "details": "Werkorder WO-2026-014 uitgezet naar Firma Jansen Deurtechniek BV. Status naar 'Ingepland'.", "tijdstip": "2026-10-26 10:10", "actor": "Huismeester 1"},
            {"historie_id": "MH-005", "melding_id": "M-2026-0041", "actie": "AANGEMAAKT", "details": "Melding geconstateerd tijdens avondronde.", "tijdstip": "2026-10-25 16:45", "actor": "Huismeester 1"},
            {"historie_id": "MH-006", "melding_id": "M-2026-0041", "actie": "STATUSWIJZIGING", "details": "Nieuwe voorschakelapparaten uit magazijn gehaald. Status naar 'In uitvoering'.", "tijdstip": "2026-10-26 08:00", "actor": "Huismeester 1"},
            {"historie_id": "MH-007", "melding_id": "M-2026-0040", "actie": "AANGEMAAKT", "details": "Mondelinge melding van Mw. Van Dijk genoteerd.", "tijdstip": "2026-10-24 11:20", "actor": "Huismeester 2"},
            {"historie_id": "MH-008", "melding_id": "M-2026-0040", "actie": "BEOORDEELD", "details": "Kelder geïnspecteerd. Geen acute nood, wel inspectie door specialist nodig.", "tijdstip": "2026-10-24 14:00", "actor": "Huismeester 2"},
            {"historie_id": "MH-009", "melding_id": "M-2026-0040", "actie": "STATUSWIJZIGING", "details": "Offerte opgevraagd bij De Boer. Wachtreden ingesteld: 'Wacht op leverancier'.", "tijdstip": "2026-10-25 10:00", "actor": "Bestuur"},
            {"historie_id": "MH-010", "melding_id": "M-2026-0039", "actie": "AANGEMAAKT", "details": "Melding ingezonden via /melden.", "tijdstip": "2026-10-26 07:15", "actor": "Fam. Willems (Bewoner)"},
            {"historie_id": "MH-011", "melding_id": "M-2026-0038", "actie": "AANGEMAAKT", "details": "Melding via WhatsApp binnengekomen.", "tijdstip": "2026-10-23 09:00", "actor": "Huismeester 2"},
            {"historie_id": "MH-012", "melding_id": "M-2026-0038", "actie": "ONDERHOUD", "details": "Muur gereinigd met hogedrukspuit en milieuvriendelijke reiniger.", "tijdstip": "2026-10-24 13:30", "actor": "Huismeester 2"},
            {"historie_id": "MH-013", "melding_id": "M-2026-0038", "actie": "AFSLUITING", "details": "Gecontroleerd en melding afgesloten met status 'Gesloten'.", "tijdstip": "2026-10-25 15:00", "actor": "Huismeester 2"}
        ],
        "Werkorders": [
            {
                "id": "WO-2026-014",
                "melding_id": "M-2026-0042",
                "leverancier": "Firma Jansen Deurtechniek BV",
                "geplande_datum": "2026-11-03",
                "geschatte_kosten": 320,
                "instructie": "Magneetsluiting afstellen en dranger veerspanning controleren.",
                "status": "Ingepland",
                "recordVersion": 1,
                "createdAt": "2026-10-26T10:10:00Z",
                "updatedAt": "2026-10-26T10:10:00Z",
                "createdBy": "Huismeester 1",
                "updatedBy": "Huismeester 1"
            },
            {
                "id": "WO-2026-012",
                "melding_id": "M-2026-0040",
                "leverancier": "Loodgietersbedrijf De Boer Velp",
                "geplande_datum": "2026-11-06",
                "geschatte_kosten": 450,
                "instructie": "Inspectie standleiding met camera en lekkage verhelpen.",
                "status": "Aangevraagd",
                "recordVersion": 1,
                "createdAt": "2026-10-25T10:00:00Z",
                "updatedAt": "2026-10-25T10:00:00Z",
                "createdBy": "Bestuur",
                "updatedBy": "Bestuur"
            }
        ],
        "Verwerkingen": [],
        "Foutenlog": []
    }

def load_storage():
    with storage_lock:
        if not os.path.exists(STORAGE_FILE):
            os.makedirs(DATA_DIR, exist_ok=True)
            initial = get_initial_sheets_data()
            with open(STORAGE_FILE, "w", encoding="utf-8") as f:
                json.dump(initial, f, indent=2, ensure_ascii=False)
            return initial
        try:
            with open(STORAGE_FILE, "r", encoding="utf-8") as f:
                return json.load(f)
        except Exception:
            initial = get_initial_sheets_data()
            with open(STORAGE_FILE, "w", encoding="utf-8") as f:
                json.dump(initial, f, indent=2, ensure_ascii=False)
            return initial

def save_storage(data):
    with storage_lock:
        os.makedirs(DATA_DIR, exist_ok=True)
        temp_file = STORAGE_FILE + ".tmp"
        with open(temp_file, "w", encoding="utf-8") as f:
            json.dump(data, f, indent=2, ensure_ascii=False)
        os.replace(temp_file, STORAGE_FILE)

# ========================================================
# 2. CRYPTOGRAFISCHE HMAC-SHA256 RELAY CLIENT
# ========================================================

def create_signed_envelope(action, payload, actor, custom_request_id=None, custom_timestamp=None):
    issued_at = int(time.time()) if custom_timestamp is None else custom_timestamp
    request_id = custom_request_id or f"REQ-{uuid.uuid4().hex[:12].upper()}"

    canonical = f"2.1|denheuvel-relay|{issued_at}|{request_id}|{action}|{json.dumps(actor, separators=(',', ':'))}|{json.dumps(payload, separators=(',', ':'))}"
    signature = hmac.new(
        RELAY_SECRET.encode("utf-8"),
        canonical.encode("utf-8"),
        hashlib.sha256
    ).digest()
    sig_b64 = base64.urlsafe_b64encode(signature).decode("utf-8").rstrip("=")

    envelope = {
        "protocolVersion": "2.1",
        "audience": "denheuvel-relay",
        "issuedAt": issued_at,
        "requestId": request_id,
        "action": action,
        "trustedActor": actor,
        "payload": payload,
        "signature": sig_b64
    }
    return envelope

def forward_to_apps_script(envelope):
    if not APPS_SCRIPT_URL:
        raise ValueError("Geen APPS_SCRIPT_URL geconfigureerd.")

    body_bytes = json.dumps(envelope).encode("utf-8")
    req = urllib.request.Request(
        APPS_SCRIPT_URL,
        data=body_bytes,
        headers={"Content-Type": "application/json"},
        method="POST"
    )

    # Google Apps Script volgt ContentService redirects
    with urllib.request.urlopen(req, timeout=15) as resp:
        content = resp.read().decode("utf-8")
        return json.loads(content)

# ========================================================
# 3. LOKALE PERSISTENTE UITVOERING (TEST-SHEETS ENGINE)
# ========================================================

NONCE_REGISTRY = {}

def execute_local_relay(envelope):
    # Verifieer HMAC
    issued_at = envelope.get("issuedAt", 0)
    now = int(time.time())
    if abs(now - issued_at) > 300:
        return {"requestId": envelope.get("requestId"), "data": None, "errorCode": "TIMESTAMP_EXPIRED", "statusCode": 401, "message": "Aanvraag is verlopen (> 5 min)."}

    canonical = f"2.1|denheuvel-relay|{issued_at}|{envelope.get('requestId')}|{envelope.get('action')}|{json.dumps(envelope.get('trustedActor'), separators=(',', ':'))}|{json.dumps(envelope.get('payload'), separators=(',', ':'))}"
    expected_sig = hmac.new(RELAY_SECRET.encode("utf-8"), canonical.encode("utf-8"), hashlib.sha256).digest()
    expected_b64 = base64.urlsafe_b64encode(expected_sig).decode("utf-8").rstrip("=")
    provided_b64 = envelope.get("signature", "").rstrip("=")

    if not hmac.compare_digest(expected_b64, provided_b64):
        return {"requestId": envelope.get("requestId"), "data": None, "errorCode": "UNAUTHORIZED_SIGNATURE", "statusCode": 401, "message": "HMAC-handtekening ongeldig."}

    # Replay controle
    req_id = envelope.get("requestId")
    if req_id in NONCE_REGISTRY:
        return {"requestId": req_id, "data": None, "errorCode": "REPLAY_DETECTED", "statusCode": 409, "message": "Replay gedetecteerd: dit requestId is reeds verwerkt."}
    NONCE_REGISTRY[req_id] = now

    actor = envelope.get("trustedActor", {})
    action = envelope.get("action")
    payload = envelope.get("payload", {})

    # Autorisatie
    if action == "storing_public_report":
        pass # Publiek toegestaan
    else:
        if not actor.get("actief") or actor.get("rol") not in ["huismeester", "bestuur"]:
            return {"requestId": req_id, "data": None, "errorCode": "FORBIDDEN_ROLE", "statusCode": 403, "message": f"Toegang geweigerd voor account {actor.get('email')} (inactief of onbevoegde rol)."}

    storage = load_storage()
    now_iso = time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())

    if action == "relay_test":
        return {
            "requestId": req_id,
            "data": {
                "pong": True,
                "actor": actor,
                "engine": "local_persistent_sheets",
                "schemaVersion": SCHEMA_VERSION,
                "spreadsheetName": "Den Heuvel Testadministratie (Sheets Model)",
                "totalTabs": len(storage),
                "serverTimeUtc": now_iso
            },
            "statusCode": 200,
            "errorCode": None
        }

    elif action == "acties_list":
        active_actions = [a for a in storage["Acties"] if not a.get("archivedAt")]
        return {"requestId": req_id, "data": active_actions, "statusCode": 200, "errorCode": None}

    elif action == "acties_save":
        actie = payload
        existing_idx = next((i for i, a in enumerate(storage["Acties"]) if a["id"] == actie.get("id")), None)

        if existing_idx is not None:
            current = storage["Acties"][existing_idx]
            current_ver = current.get("recordVersion", 1)
            client_ver = actie.get("recordVersion")
            if client_ver and client_ver != current_ver:
                return {"requestId": req_id, "data": None, "errorCode": "CONFLICT_409", "statusCode": 409, "message": f"CONFLICT_409: Actie is inmiddels gewijzigd door een andere beheerder (versie {current_ver} vs {client_ver})."}

            new_ver = current_ver + 1
            current.update(actie)
            current["recordVersion"] = new_ver
            current["updatedAt"] = now_iso
            current["updatedBy"] = actor.get("email")
            save_storage(storage)
            return {"requestId": req_id, "data": current, "statusCode": 200, "errorCode": None}
        else:
            new_id = actie.get("id") or f"ACT-{str(len(storage['Acties']) + 1).zfill(3)}"
            actie["id"] = new_id
            actie["recordVersion"] = 1
            actie["createdAt"] = now_iso
            actie["updatedAt"] = now_iso
            actie["createdBy"] = actor.get("email")
            actie["updatedBy"] = actor.get("email")
            storage["Acties"].insert(0, actie)
            save_storage(storage)
            return {"requestId": req_id, "data": actie, "statusCode": 200, "errorCode": None}

    elif action == "acties_move":
        card_id = payload.get("cardId")
        target_col = payload.get("targetColumnId")
        client_ver = payload.get("recordVersion")

        action_item = next((a for a in storage["Acties"] if a["id"] == card_id), None)
        if not action_item:
            return {"requestId": req_id, "data": None, "errorCode": "NOT_FOUND", "statusCode": 404, "message": f"Actie {card_id} niet gevonden."}

        current_ver = action_item.get("recordVersion", 1)
        if client_ver and client_ver != current_ver:
            return {"requestId": req_id, "data": None, "errorCode": "CONFLICT_409", "statusCode": 409, "message": f"CONFLICT_409: Versieconflict bij verplaatsen. De kaart is tussentijds bewerkt. Positie hersteld."}

        old_status = action_item.get("status")
        action_item["status"] = target_col
        action_item["kolom_id"] = target_col
        action_item["recordVersion"] = current_ver + 1
        action_item["updatedAt"] = now_iso
        action_item["updatedBy"] = actor.get("email")

        storage["ActieHistorie"].append({
            "historie_id": f"AH-{uuid.uuid4().hex[:6]}",
            "actie_id": card_id,
            "wijziging_type": "VERPLAATST",
            "oude_waarde": old_status,
            "nieuwe_waarde": target_col,
            "tijdstip": now_iso,
            "gewijzigd_door": actor.get("email")
        })

        save_storage(storage)
        return {
            "requestId": req_id,
            "data": {
                "cardId": card_id,
                "newColumn": target_col,
                "recordVersion": action_item["recordVersion"],
                "updatedAt": now_iso
            },
            "statusCode": 200,
            "errorCode": None
        }

    elif action == "storingen_list":
        return {"requestId": req_id, "data": storage["Meldingen"], "statusCode": 200, "errorCode": None}

    elif action in ["storingen_save", "storing_public_report"]:
        storing = payload
        is_pub = (action == "storing_public_report")
        new_num = len(storage["Meldingen"]) + 40
        new_id = storing.get("id") or f"M-2026-{str(new_num).zfill(4)}"
        storing["id"] = new_id
        storing["status"] = storing.get("status") or "Nieuw"
        storing["recordVersion"] = 1
        storing["createdAt"] = storing.get("createdAt") or now_iso
        storing["updatedAt"] = now_iso
        storing["createdBy"] = storing.get("reporter") if is_pub else actor.get("email")
        storing["updatedBy"] = storing["createdBy"]

        storage["Meldingen"].insert(0, storing)
        storage["Meldingshistorie"].append({
            "historie_id": f"MH-{uuid.uuid4().hex[:6]}",
            "melding_id": new_id,
            "actie": "AANGEMAAKT",
            "details": f"Melding geregistreerd via {storing.get('channel', 'Portaal')}",
            "tijdstip": now_iso,
            "actor": storing["createdBy"]
        })
        save_storage(storage)
        return {"requestId": req_id, "data": storing, "statusCode": 200, "errorCode": None}

    elif action == "storingen_status":
        storing_id = payload.get("storingId")
        new_status = payload.get("newStatus")
        waiting_reason = payload.get("waitingReason", "")
        client_ver = payload.get("recordVersion")

        storing = next((s for s in storage["Meldingen"] if s["id"] == storing_id), None)
        if not storing:
            return {"requestId": req_id, "data": None, "errorCode": "NOT_FOUND", "statusCode": 404, "message": "Storing niet gevonden."}

        current_ver = storing.get("recordVersion", 1)
        if client_ver and client_ver != current_ver:
            return {"requestId": req_id, "data": None, "errorCode": "CONFLICT_409", "statusCode": 409, "message": "CONFLICT_409: Storing is tussentijds gewijzigd door een andere beheerder."}

        old_status = storing.get("status")
        storing["status"] = new_status
        storing["waitingReason"] = waiting_reason
        storing["recordVersion"] = current_ver + 1
        storing["updatedAt"] = now_iso
        storing["updatedBy"] = actor.get("email")

        storage["Meldingshistorie"].append({
            "historie_id": f"MH-{uuid.uuid4().hex[:6]}",
            "melding_id": storing_id,
            "actie": "STATUSWIJZIGING",
            "details": f"Status gewijzigd van '{old_status}' naar '{new_status}'" + (f" (Wachtreden: {waiting_reason})" if waiting_reason else ""),
            "tijdstip": now_iso,
            "actor": actor.get("email")
        })

        save_storage(storage)
        return {
            "requestId": req_id,
            "data": {
                "storingId": storing_id,
                "status": new_status,
                "waitingReason": waiting_reason,
                "recordVersion": storing["recordVersion"],
                "updatedAt": now_iso
            },
            "statusCode": 200,
            "errorCode": None
        }

    elif action == "werkorders_save":
        wo = payload
        wo_id = wo.get("id") or f"WO-2026-{str(len(storage['Werkorders']) + 15).zfill(3)}"
        wo["id"] = wo_id
        wo["recordVersion"] = 1
        wo["createdAt"] = now_iso
        wo["updatedAt"] = now_iso
        wo["createdBy"] = actor.get("email")
        wo["updatedBy"] = actor.get("email")

        storage["Werkorders"].append(wo)
        if wo.get("melding_id"):
            storage["Meldingshistorie"].append({
                "historie_id": f"MH-{uuid.uuid4().hex[:6]}",
                "melding_id": wo["melding_id"],
                "actie": "WERKORDER",
                "details": f"Werkorder {wo_id} aangemaakt voor {wo.get('leverancier')}",
                "tijdstip": now_iso,
                "actor": actor.get("email")
            })

        save_storage(storage)
        return {"requestId": req_id, "data": wo, "statusCode": 200, "errorCode": None}

    return {"requestId": req_id, "data": None, "errorCode": "UNKNOWN_ACTION", "statusCode": 400, "message": f"Onbekende actie: {action}"}

# ========================================================
# 4. DISPATCHER: APPS SCRIPT OF LOKAAL
# ========================================================

def dispatch_relay_request(action, payload, actor, custom_req_id=None, custom_ts=None):
    envelope = create_signed_envelope(action, payload, actor, custom_req_id, custom_ts)
    if APPS_SCRIPT_URL:
        try:
            return forward_to_apps_script(envelope)
        except Exception as err:
            return {"requestId": envelope["requestId"], "data": None, "errorCode": "APPS_SCRIPT_ERROR", "statusCode": 502, "message": f"Fout bij doorsturen naar Apps Script: {str(err)}"}
    else:
        return execute_local_relay(envelope)

# ========================================================
# 5. HTTP SERVER HANDLER
# ========================================================

class GatewayHandler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=ROOT_DIR, **kwargs)

    def do_OPTIONS(self):
        self.send_response(204)
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type, X-Requested-With, X-Actor-Email")
        self.end_headers()

    def send_json(self, status_code, data):
        self.send_response(status_code)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Cache-Control", "no-store, no-cache, must-revalidate")
        self.end_headers()
        self.wfile.write(json.dumps(data, ensure_ascii=False).encode("utf-8"))

    def read_json_body(self):
        length = int(self.headers.get("Content-Length", 0))
        if length == 0:
            return {}
        raw = self.rfile.read(length).decode("utf-8")
        try:
            return json.loads(raw)
        except Exception:
            return {}

    def get_current_actor(self):
        # Controleer eventuele gesimuleerde sessie header voor testdoeleinden
        override_email = self.headers.get("X-Actor-Email")
        if override_email:
            storage = load_storage()
            found = next((u for u in storage["Gebruikers"] if u["email"].lower() == override_email.lower()), None)
            if found:
                return found
            return {"email": override_email, "naam": override_email, "rol": "onbekend", "actief": False}
        return CURRENT_ACTOR

    def do_GET(self):
        path = self.path.split("?")[0]

        if path == "/api/health":
            storage = load_storage()
            mode = "apps_script_relay" if APPS_SCRIPT_URL else "local_persistent_sheets"
            self.send_json(200, {
                "status": "UP",
                "mode": mode,
                "schemaVersion": SCHEMA_VERSION,
                "totalTabs": len(storage),
                "appsScriptConfigured": bool(APPS_SCRIPT_URL),
                "serverTime": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())
            })
            return

        elif path == "/api/session":
            actor = self.get_current_actor()
            self.send_json(200, {
                "actor": actor,
                "allowed": actor.get("actief") and actor.get("rol") in ["huismeester", "bestuur"]
            })
            return

        elif path == "/api/acties":
            actor = self.get_current_actor()
            res = dispatch_relay_request("acties_list", {}, actor)
            self.send_json(res.get("statusCode", 200), res)
            return

        elif path == "/api/storingen":
            actor = self.get_current_actor()
            res = dispatch_relay_request("storingen_list", {}, actor)
            self.send_json(res.get("statusCode", 200), res)
            return

        # Statische bestanden serveren
        super().do_GET()

    def do_POST(self):
        path = self.path.split("?")[0]
        body = self.read_json_body()

        if path == "/api/session/switch":
            global CURRENT_ACTOR
            storage = load_storage()
            target_email = body.get("email", "")
            found = next((u for u in storage["Gebruikers"] if u["email"].lower() == target_email.lower()), None)
            if found:
                CURRENT_ACTOR = found
                self.send_json(200, {"success": True, "actor": CURRENT_ACTOR})
            elif target_email == "onbevoegd":
                CURRENT_ACTOR = {"email": "onbekend@extern.nl", "naam": "Onbevoegde Gebruiker", "rol": "geen", "actief": False}
                self.send_json(200, {"success": True, "actor": CURRENT_ACTOR})
            else:
                self.send_json(400, {"error": "Onbekende gebruiker"})
            return

        elif path == "/api/relay/probe":
            actor = self.get_current_actor()
            res = dispatch_relay_request("relay_test", {"probe": True}, actor)
            self.send_json(res.get("statusCode", 200), res)
            return

        elif path == "/api/acties":
            actor = self.get_current_actor()
            res = dispatch_relay_request("acties_save", body, actor)
            self.send_json(res.get("statusCode", 200), res)
            return

        elif path == "/api/acties/move":
            actor = self.get_current_actor()
            res = dispatch_relay_request("acties_move", body, actor)
            self.send_json(res.get("statusCode", 200), res)
            return

        elif path == "/api/storingen":
            actor = self.get_current_actor()
            res = dispatch_relay_request("storingen_save", body, actor)
            self.send_json(res.get("statusCode", 200), res)
            return

        elif path == "/api/storingen/status":
            actor = self.get_current_actor()
            res = dispatch_relay_request("storingen_status", body, actor)
            self.send_json(res.get("statusCode", 200), res)
            return

        elif path == "/api/storingen/werkorder":
            actor = self.get_current_actor()
            res = dispatch_relay_request("werkorders_save", body, actor)
            self.send_json(res.get("statusCode", 200), res)
            return

        elif path == "/api/public/melden":
            # Bewoner meldformulier: rate limiting & specifieke actor
            public_actor = {"email": "publiek@denheuvelvelp.nl", "naam": body.get("reporter", "Publieke Bewoner"), "rol": "bewoner_publiek", "actief": True}
            res = dispatch_relay_request("storing_public_report", body, public_actor)
            self.send_json(res.get("statusCode", 200), res)
            return

        self.send_json(404, {"error": "Endpoint niet gevonden: " + path})

def run_server():
    load_storage() # Initialiseer test-database
    socketserver.TCPServer.allow_reuse_address = True
    
    selected_port = PORT
    httpd = None
    for p in [selected_port, 3001, 3002, 8080]:
        try:
            httpd = socketserver.TCPServer(("", p), GatewayHandler)
            selected_port = p
            break
        except OSError as e:
            if e.errno == 98:
                continue
            raise

    if not httpd:
        print("Geen beschikbare poort gevonden.")
        sys.exit(1)

    with httpd:
        print("=" * 70)
        print("  DEN HEUVEL GEBOUWBEHEER - GATEWAY & TEST-ADMINISTRATIE")
        print("=" * 70)
        print(f"  Status: Gateway actief op poort {selected_port}")
        print(f"  👉 Webinterface:       http://localhost:{selected_port}")
        print(f"  👉 API Health:          http://localhost:{selected_port}/api/health")
        print(f"  👉 Opslagmodus:        {'Google Apps Script Relay' if APPS_SCRIPT_URL else 'Lokale Test-Sheets (data/test_sheets.json)'}")
        print(f"  👉 Actieve Actor:      {CURRENT_ACTOR['naam']} ({CURRENT_ACTOR['email']})")
        print("=" * 70)
        httpd.serve_forever()

if __name__ == "__main__":
    run_server()
