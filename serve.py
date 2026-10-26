#!/usr/bin/env python3
"""
Den Heuvel Gebouw- en Verenigingsbeheer
Opstartscript voor de Gateway en Webinterface
Uitvoeren met: python3 serve.py
"""
import sys
import os

# Voeg project root toe aan path en start gateway server
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from gateway.server import run_server

if __name__ == "__main__":
    run_server()
