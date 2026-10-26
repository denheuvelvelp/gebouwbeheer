# Voortgangsbewaking Den Heuvel Portaal
**Project:** Modulair gebouw- en verenigingsbeheer Den Heuvel (Velp)  
**Versie:** 2.1  
**Datum:** 26 oktober 2026  
**Status:** Fundament, Opslag, Cloud Run Dockerfile, Dependabot en GitHub CI/CD gereed

---

## 1. Huidige Stand van Zaken
Het fundament voor Den Heuvel is gereed voor containerisatie en automatische deployment.
* **Databasekeuze (Masterprompt v2.1):** Google Sheets is de leidende administratieve database (13 tabbladen, geopend en beheerd in Google Workspace). Foto's en bijlagen worden opgeslagen in Google Drive. Firebase wordt uitsluitend gebruikt voor **Firebase Authentication** (Google login identity) en **Firebase Hosting** (frontend / eigen domein), conform het besluit om geen Firestore of Cloud SQL te introduceren.
* **Gateway Container:** De gateway is gecontaineriseerd via [`Dockerfile`](file:///home/alberdao/ai_projecten/denheuvel_portaal/Dockerfile) voor Google Cloud Run (`europe-west4`).
* **Beveiligingsscans:** [`dependabot.yml`](file:///home/alberdao/ai_projecten/denheuvel_portaal/.github/dependabot.yml) is ingericht voor wekelijkse geautomatiseerde dependency security checks.
* **Automatische Deployment:** [`deploy.yml`](file:///home/alberdao/ai_projecten/denheuvel_portaal/.github/workflows/deploy.yml) voert bij elke push naar branch `main` automatisch de unittests uit en roept `gcloud run deploy` aan.

---

## 2. Ingerichte CI/CD en Deploymentcomponenten

| Bestand | Doel & Werking |
| :--- | :--- |
| **`Dockerfile`** | Containeriseert de Gateway-server op Python 3.12-slim met `PORT=8080` voor Google Cloud Run. |
| **`.dockerignore`** | Zorgt dat geheimen (`.env`), git-historie en lokale caches niet in de container belanden. |
| **`.gitignore`** | Voorkomt dat `.env` met geheimen ooit naar GitHub wordt gepusht. |
| **`.github/dependabot.yml`** | Automatische wekelijkse scans op kwetsbaarheden in GitHub Actions en dependencies. |
| **`.github/workflows/deploy.yml`** | GitHub Actions pipeline: voert eerst de 12 acceptatietests uit; bij succes wordt de applicatie automatisch gedeployd naar Google Cloud Run. |

---

## 3. GitHub Koppeling

Het lokale project is geïnitialiseerd als git repository op branch `main` met een schone initiële commit (`8978cd5`).  
Om de repository te koppelen aan je eigen GitHub-account:

```bash
git remote add origin https://github.com/JOUW_GEBRUIKERSNAAM/denheuvel_portaal.git
git push -u origin main
```
