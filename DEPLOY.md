# Deployment: Mac → GitHub → Synology NAS (Docker)

So fließt der Code ab jetzt:

```
Mac (entwickeln) → git push → GitHub (baut Docker-Image) → NAS (zieht fertiges Image)
```

Auf dem NAS wird nichts mehr gebaut und kein Code mehr gepflegt — es zieht nur noch
das fertige Image `ghcr.io/udgowe2/baahi-bixiye:latest`.

---

## 1. Einmalige Vorbereitung auf GitHub

1. **Repo auf privat stellen** (Settings → General → Danger Zone → Change visibility).
   Wichtig, weil der alte Gemini-Key und das DB-Passwort in der Git-History stehen.
2. **Gemini-Key rotieren**: alten Key auf https://aistudio.google.com/apikey löschen,
   neuen erstellen. Der neue Key kommt NUR in die `.env` auf dem NAS — nie in den Code.
3. Nach dem ersten `git push` baut die GitHub Action automatisch das Image.
   Fortschritt: Repo → Tab "Actions".
4. **Personal Access Token (PAT) für das NAS erstellen** (nötig, weil das Repo privat ist):
   GitHub → Settings → Developer settings → Personal access tokens → Tokens (classic) →
   Generate new token → Haken nur bei `read:packages` → Token kopieren.

## 2. Einmalige Einrichtung auf dem NAS

Per SSH aufs NAS (oder über Container Manager, siehe unten):

```bash
# Bei der GitHub Container Registry anmelden (PAT als Passwort)
docker login ghcr.io -u udgowe2

# Projektordner anlegen
mkdir -p /volume1/docker/baahi-bixiye
cd /volume1/docker/baahi-bixiye
```

Dann zwei Dateien in diesen Ordner legen:
- `docker-compose.yml` (aus diesem Repo)
- `.env` mit echten Werten:

```env
GEMINI_API_KEY=dein-NEUER-key
DB_PASSWORD=ein-sicheres-passwort
DB_ROOT_PASSWORD=ein-anderes-sicheres-passwort
```

Starten:

```bash
docker compose up -d
```

Die App läuft dann auf `http://<NAS-IP>:3001` bzw. über deine Tailscale-Adresse.

**Alternative ohne SSH:** Container Manager → Projekt → Erstellen → Ordner wählen →
`docker-compose.yml` einfügen. Die `.env` muss trotzdem im selben Ordner liegen
(z. B. über File Station hochladen). Das `docker login` für das private Image geht
nur per SSH — einmalig nötig.

## 3. Daten aus der alten Installation übernehmen

Die App legt leere Tabellen selbst an. Um die bestehenden Rezepte mitzunehmen:

```bash
# 1. Dump aus der alten Synology-MariaDB (Port 3447) ziehen
mysqldump -h 127.0.0.1 -P 3447 -u root -p Baahi > baahi-backup.sql

# 2. In den neuen DB-Container einspielen
docker exec -i baahi-db mariadb -u root -p"DEIN_DB_ROOT_PASSWORD" Baahi < baahi-backup.sql

# 3. Vorhandene Rezeptfotos in das Upload-Volume kopieren
docker cp /pfad/zur/alten/app/public/uploads/. baahi-app:/data/uploads/
```

Danach kurz prüfen: App öffnen → Rezepte und Bilder da? Dann kann die alte
Node-Installation und der alte Task-Scheduler-Eintrag weg.

## 4. Updates einspielen (der neue Alltag)

Auf dem Mac:

```bash
git add -A && git commit -m "Beschreibung der Änderung"
git push
```

Warten bis die Action grün ist (~3–5 Min), dann auf dem NAS:

```bash
cd /volume1/docker/baahi-bixiye
docker compose pull && docker compose up -d
```

(Oder im Container Manager: Projekt auswählen → Aktion → "Erstellen" mit
"Image neu abrufen".)

## 5. Lokal entwickeln (auf dem Mac)

Wie bisher: `.env` im Projektordner (siehe `.env.example`), dann `npm run dev`.
Du brauchst dafür eine lokale MySQL/MariaDB **oder** du startest nur die Datenbank
aus dem Compose-Setup: `docker compose up -d db` und setzt in der `.env`
`DB_HOST=127.0.0.1`.

## Wo liegen jetzt die Daten?

| Was | Wo | Backup |
|-----|----|--------|
| Rezepte, Plan, Listen, Aufgaben | Docker-Volume `dbdata` | Hyper Backup: `/volume1/@docker/volumes/` oder regelmäßiger `mysqldump` |
| Hochgeladene Fotos | Docker-Volume `uploads` | dito |
| Geheimnisse (Keys, Passwörter) | `.env` auf dem NAS | nicht in Git! |
| Code | GitHub | — |
