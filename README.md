## Zwei Doofe, ein Gedanke – Web Edition

Eine kleine FastAPI-App, die das Partyspiel "Zwei Doofe, ein Gedanke" digitalisiert. Auf Knopfdruck erscheint eine zufällige Frage, ein 5-Sekunden-Countdown startet und alle Spieler versuchen, unabhängig voneinander dieselbe Antwort wie der Rest der Runde zu finden.

### Features
- 🧑‍🤝‍🧑 Beliebig viele Teams mit automatischer Runden-Reihenfolge & Scoreboard
- 🚀 Sofort neues Prompt per Button + automatischer Countdown für das aktive Team
- ✅ Rundenabschluss-Buttons (Erfolg/Misserfolg) zählen Punkte automatisch
- ➕ Eigene Prompts lassen sich per UI speichern und überstehen Server-Neustarts
- 🎨 Minimalistisches, responsives UI ohne großes Framework-Overhead
- 🌐 Über `uvicorn` auf jedem Server oder im lokalen Netzwerk ausspielbar

### Voraussetzungen
- Python 3.11+
- [uv](https://github.com/astral-sh/uv) (wird bereits im Projekt genutzt)

### Installation
```bash
uv sync
```
(Legt das virtuelle Environment an und installiert die Abhängigkeiten aus `pyproject.toml`.)

### Entwicklung & Start
```bash
uv run uvicorn main:app --reload --host 0.0.0.0 --port 8000
```
- `--reload` für Auto-Reload beim lokalen Entwickeln
- `--host 0.0.0.0` macht die App für andere Geräte im Netzwerk erreichbar

### Produktion / Deployment
```bash
uv run uvicorn main:app --host 0.0.0.0 --port 80
```
Pack die App hinter einen Prozessmanager (systemd, supervisord) oder nutze einen ASGI-Server wie `gunicorn` mit `uvicorn.workers.UvicornWorker` für mehr Prozesse.

### Docker (z. B. Hetzner Cloud)
1. Image bauen
    ```bash
    docker build -t zdeg:latest .
    ```
2. Container starten (persistente Prompts via Named Volume)
    ```bash
    docker run -d \
      --name zdeg \
      -p 80:8000 \
      -v zdeg-prompts:/app/data \
      zdeg:latest
    ```
3. Alternativ `docker compose up -d` nutzen – `compose.yaml` publisht Port 8000 und hängt das Volume automatisch ein.

Tipp: Kombiniere den Container mit einem Reverse Proxy (Nginx/Caddy/Traefik) für TLS-Zertifikate und betreibe alles via `systemd` oder Watchtower für Auto-Updates.

### Spielfluss
1. Auf der Startseite Teams benennen und hinzufügen.
2. "Jetzt los" zieht eine Frage und startet den 5-Sekunden-Timer für das aktuelle Team.
3. Nach der Denkzeit klickst Du auf "Runde erfolgreich" (1 Punkt) oder "Keine Übereinstimmung".
4. Die App springt automatisch zum nächsten Team.
5. Eigene Fragen unten hinzufügen – sie landen persistent in `data/custom_prompts.json`.

### Anpassungen
- Weitere Default-Fragen: Liste `PROMPTS` in `main.py`
- Timer-Länge: Konstante `TIMER_SECONDS` in `main.py`
- Styling/Layouts: `static/style.css`
- Persistente Zusatzfragen: `data/custom_prompts.json`

### Struktur
```
.
├── Dockerfile          # Container-Build mit uv
├── compose.yaml        # Docker-Compose Service + Volume
├── .dockerignore
├── main.py              # FastAPI-App + Prompt-API
├── data/
│   └── custom_prompts.json # Persistente User-Prompts
├── static/
│   ├── app.js           # Frontend-Logik (Teams, Timer, API)
│   └── style.css        # UI-Styling
└── templates/
    └── index.html       # Oberfläche
```

Viel Spaß beim nächsten Spieleabend! 🧠⚡
