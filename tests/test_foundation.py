#!/usr/bin/env python3
"""
Den Heuvel Gebouw- en Verenigingsbeheer
Integratie- en Acceptatietests voor het Fundament, Kanban en Storingen
Versie 2.1
"""

import unittest
import os
import sys
import time
import json
import uuid

# Voeg project root toe aan path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from gateway.server import (
    load_storage,
    save_storage,
    create_signed_envelope,
    execute_local_relay,
    dispatch_relay_request,
    STORAGE_FILE,
    get_initial_sheets_data,
    SCHEMA_VERSION
)

class TestFoundationAndStorage(unittest.TestCase):

    def setUp(self):
        # Reset storage naar standaard teststatus vóór elke test
        save_storage(get_initial_sheets_data())
        self.huismeester = {
            "email": "huismeester1@denheuvelvelp.nl",
            "naam": "Huismeester 1",
            "rol": "huismeester",
            "actief": True
        }
        self.onbevoegd = {
            "email": "onbekend@extern.nl",
            "naam": "Onbekende Bezoeker",
            "rol": "geen",
            "actief": False
        }

    # ----------------------------------------------------
    # 1. TEST SCHEMA & 13 TABBLADEN
    # ----------------------------------------------------
    def test_01_all_13_tabs_present(self):
        """Controleer of alle 13 vereiste tabbladen aanwezig zijn."""
        storage = load_storage()
        required_tabs = [
            "Gebruikers", "Instellingen", "Locaties", "Contacten",
            "Acties", "ActieHistorie", "BordKolommen",
            "Meldingen", "Meldingshistorie", "Werkorders",
            "Verwerkingen", "Foutenlog", "SchemaVersies"
        ]
        for tab in required_tabs:
            self.assertIn(tab, storage, f"Tabblad {tab} ontbreekt in testadministratie!")
        self.assertEqual(len(required_tabs), 13)

    # ----------------------------------------------------
    # 2. TEST CRYPTOGRAFISCHE RELAY PROEF (HMAC-SHA256)
    # ----------------------------------------------------
    def test_02_hmac_relay_probe_success(self):
        """Voer de technische verbindingsproef uit met geldige HMAC-handtekening."""
        res = dispatch_relay_request("relay_test", {"probe": True}, self.huismeester)
        self.assertEqual(res.get("statusCode"), 200)
        self.assertTrue(res.get("data", {}).get("pong"))
        self.assertEqual(res.get("data", {}).get("schemaVersion"), SCHEMA_VERSION)

    def test_03_hmac_tampered_signature_rejected(self):
        """Controleer dat een gemanipuleerde of ontbrekende handtekening wordt geweigerd (401)."""
        env = create_signed_envelope("relay_test", {"probe": True}, self.huismeester)
        env["signature"] = "gemanipuleerde_ongeldige_handtekening"
        res = execute_local_relay(env)
        self.assertEqual(res.get("statusCode"), 401)
        self.assertEqual(res.get("errorCode"), "UNAUTHORIZED_SIGNATURE")

    def test_04_expired_timestamp_rejected(self):
        """Controleer dat een aanvraag ouder dan 5 minuten (replay) wordt geweigerd."""
        expired_ts = int(time.time()) - 400 # 400 seconden geleden
        env = create_signed_envelope("relay_test", {"probe": True}, self.huismeester, custom_timestamp=expired_ts)
        res = execute_local_relay(env)
        self.assertEqual(res.get("statusCode"), 401)
        self.assertEqual(res.get("errorCode"), "TIMESTAMP_EXPIRED")

    def test_05_replayed_request_id_rejected(self):
        """Controleer dat het herhaald aanbieden van hetzelfde requestId wordt geweigerd (409)."""
        fixed_req_id = f"REQ-TEST-REPLAY-{uuid.uuid4().hex[:6]}"
        env1 = create_signed_envelope("relay_test", {"probe": True}, self.huismeester, custom_request_id=fixed_req_id)
        res1 = execute_local_relay(env1)
        self.assertEqual(res1.get("statusCode"), 200)

        # Tweede keer aanbieden met exact hetzelfde requestId
        env2 = create_signed_envelope("relay_test", {"probe": True}, self.huismeester, custom_request_id=fixed_req_id)
        res2 = execute_local_relay(env2)
        self.assertEqual(res2.get("statusCode"), 409)
        self.assertEqual(res2.get("errorCode"), "REPLAY_DETECTED")

    # ----------------------------------------------------
    # 3. TEST ONBEVOEGDE TOEGANG (ROLCONTROLE)
    # ----------------------------------------------------
    def test_06_unauthorized_user_forbidden(self):
        """Onbevoegde gebruiker mag geen interne acties of storingen inzien of wijzigen (403)."""
        res = dispatch_relay_request("acties_list", {}, self.onbevoegd)
        self.assertEqual(res.get("statusCode"), 403)
        self.assertEqual(res.get("errorCode"), "FORBIDDEN_ROLE")

        res_store = dispatch_relay_request("storingen_list", {}, self.onbevoegd)
        self.assertEqual(res_store.get("statusCode"), 403)

    # ----------------------------------------------------
    # 4. TEST KANBAN OPSLAG, VERPLAATSEN & PERSISTENTIE
    # ----------------------------------------------------
    def test_07_kanban_action_persists_after_reload(self):
        """Een nieuwe actie blijft na opslaan en herladen van de administratie bestaan."""
        test_actie = {
            "title": "Dakgoot vleugel West inspecteren",
            "description": "Bladafval verwijderen voor de herfst",
            "status": "todo",
            "kolom_id": "todo",
            "owner": "Huismeester 1",
            "priority": "Normaal",
            "deadline": "2026-11-10",
            "label": "Onderhoud",
            "checklist": [{"text": "Ladder plaatsen", "done": False}]
        }
        res = dispatch_relay_request("acties_save", test_actie, self.huismeester)
        self.assertEqual(res.get("statusCode"), 200)
        created_id = res["data"]["id"]

        # Herlaad direct uit persistent bestand
        reloaded_storage = load_storage()
        found = next((a for a in reloaded_storage["Acties"] if a["id"] == created_id), None)
        self.assertIsNotNone(found, "Opgeslagen actie is niet gevonden na herladen!")
        self.assertEqual(found["title"], "Dakgoot vleugel West inspecteren")
        self.assertEqual(found["recordVersion"], 1)

    def test_08_kanban_card_move_persists_column(self):
        """Een verplaatste kaart bewaart de nieuwe kolom en verhoogt het versienummer."""
        res_move = dispatch_relay_request("acties_move", {
            "cardId": "ACT-001",
            "targetColumnId": "in_progress",
            "recordVersion": 1
        }, self.huismeester)
        self.assertEqual(res_move.get("statusCode"), 200)
        self.assertEqual(res_move["data"]["newColumn"], "in_progress")
        self.assertEqual(res_move["data"]["recordVersion"], 2)

        # Controleer herladen toestand
        reloaded = load_storage()
        card = next((a for a in reloaded["Acties"] if a["id"] == "ACT-001"), None)
        self.assertEqual(card["status"], "in_progress")
        self.assertEqual(card["kolom_id"], "in_progress")

        # Controleer historie
        hist = next((h for h in reloaded["ActieHistorie"] if h["actie_id"] == "ACT-001" and h["wijziging_type"] == "VERPLAATST"), None)
        self.assertIsNotNone(hist, "Verplaatsing niet geregistreerd in ActieHistorie!")

    def test_09_kanban_optimistic_concurrency_conflict_409(self):
        """Tweede gelijktijdige bewerker krijgt conflict 409 wanneer recordVersion achterloopt."""
        # Gebruiker A verplaatst kaart naar 'in_progress' (versie gaat naar 2)
        dispatch_relay_request("acties_move", {
            "cardId": "ACT-002",
            "targetColumnId": "in_progress",
            "recordVersion": 1
        }, self.huismeester)

        # Gebruiker B probeert tegelijkertijd dezelfde kaart te bewerken op basis van oude versie 1
        res_conflict = dispatch_relay_request("acties_move", {
            "cardId": "ACT-002",
            "targetColumnId": "done",
            "recordVersion": 1 # Verouderde versie!
        }, self.huismeester)

        self.assertEqual(res_conflict.get("statusCode"), 409)
        self.assertEqual(res_conflict.get("errorCode"), "CONFLICT_409")

    # ----------------------------------------------------
    # 5. TEST STORINGEN OPSLAG & KOPPELING
    # ----------------------------------------------------
    def test_10_storing_persists_and_updates_status(self):
        """Storing blijft na herladen bestaan en statuswijziging wordt gelogd."""
        res_status = dispatch_relay_request("storingen_status", {
            "storingId": "M-2026-0041",
            "newStatus": "Opgelost",
            "waitingReason": "",
            "recordVersion": 1
        }, self.huismeester)

        self.assertEqual(res_status.get("statusCode"), 200)
        self.assertEqual(res_status["data"]["status"], "Opgelost")

        reloaded = load_storage()
        storing = next((s for s in reloaded["Meldingen"] if s["id"] == "M-2026-0041"), None)
        self.assertEqual(storing["status"], "Opgelost")

        # Controleer meldingshistorie
        hist = [h for h in reloaded["Meldingshistorie"] if h["melding_id"] == "M-2026-0041"]
        self.assertTrue(len(hist) >= 1)

    def test_11_moving_kanban_card_does_not_close_linked_storing(self):
        """Een gekoppelde Kanban-kaart verplaatsen mag de storing NIET stilzwijgend afsluiten."""
        storage = load_storage()
        storing_before = next(s for s in storage["Meldingen"] if s["id"] == "M-2026-0042")
        status_before = storing_before["status"]

        # Verplaats gekoppelde kaart ACT-001 naar 'done'
        dispatch_relay_request("acties_move", {
            "cardId": "ACT-001",
            "targetColumnId": "done",
            "recordVersion": 1
        }, self.huismeester)

        storage_after = load_storage()
        storing_after = next(s for s in storage_after["Meldingen"] if s["id"] == "M-2026-0042")
        self.assertEqual(storing_after["status"], status_before, "Storing mag niet stilzwijgend gesloten worden bij kaartverplaatsing!")

    def test_12_public_resident_report_allowed_without_auth(self):
        """Bewoners kunnen zonder inlogaccount een melding indienen via /melden."""
        public_actor = {"email": "publiek@denheuvelvelp.nl", "naam": "M. Jansen (14C)", "rol": "bewoner_publiek", "actief": True}
        res = dispatch_relay_request("storing_public_report", {
            "title": "Waterdruk laag op 4e etage",
            "location": "Noord · 4e verdieping",
            "category": "Lekkage & Loodgieter",
            "description": "Er komt nauwelijks water uit de kranen.",
            "channel": "Publiek portaal",
            "reporter": "M. Jansen (14C)",
            "contact": "06-11112222"
        }, public_actor)

        self.assertEqual(res.get("statusCode"), 200)
        new_id = res["data"]["id"]

        reloaded = load_storage()
        found = next((s for s in reloaded["Meldingen"] if s["id"] == new_id), None)
        self.assertIsNotNone(found)
        self.assertEqual(found["status"], "Nieuw")

if __name__ == "__main__":
    unittest.main()

