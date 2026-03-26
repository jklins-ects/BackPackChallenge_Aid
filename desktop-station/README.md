# Desktop Station

This is the local PyQt5 station app for BackPackChallenge.

It is intended to run on a local Windows machine with direct NFC hardware
access. The Node/Express app remains the API and MongoDB system of record.

## Features in this scaffold

- PyQt5 desktop window
- Tabs generated from `/api/activities/metadata`
- One scoring tab per activity
- An associate tab for participant info updates and NFC linking
- Global station configuration
- Global current-NFC display
- API client for the existing Express routes
- `pyscard`-based NFC service layer
- Shared branded app icon/favicon assets
- Windows packaging script for `PyInstaller`

## Quick start

Prerequisites:

- Python 3.11+ installed locally
- PC/SC-compatible NFC reader available locally
- The BackPackChallenge Node API running and reachable
- MongoDB running for the Node API

The desktop app does not talk to MongoDB directly. It calls the existing
Express API, so start the backend first from the repository root:

```powershell
npm start
```

By default the desktop app expects the API at `http://localhost:3000`.

Create a virtual environment and install dependencies:

```powershell
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
```

Copy the example config:

```powershell
Copy-Item .\config\settings.example.json .\config\settings.json
```

Config fields:

- `api_base_url`: URL for the running Node/Express API
- `api_key`: station API key used to authenticate desktop requests
- `station_id`: default station id sent with score submissions
- `default_points`: initial value placed in the score field
- `window_title`: desktop window title

Environment variable overrides:

- `BACKPACK_API_BASE_URL`
- `BACKPACK_API_KEY`
- `BACKPACK_STATION_ID`
- `BACKPACK_DEFAULT_POINTS`
- `BACKPACK_WINDOW_TITLE`

Configuration precedence is:

1. environment variables
2. `config/settings.json`
3. `config/settings.example.json`

Run the app:

```powershell
python .\main.py
```

Current scaffold behavior:

- Activity tabs are loaded from `/api/activities/metadata`
- Each activity tab can set a score by group and participant code or by the current
  NFC id
- The desktop app polls automatically for reader/tag changes
- The `Associate` tab can save participant first and last name updates without
  writing to a chip
- The `Associate` tab can also link the current NFC id to a participant and then
  write the participant stats URL to the tag
- If the current NFC tag is already linked, the desktop app loads the known
  participant and prefills any saved name data for editing
- NFC reader support now uses `pyscard` in
  `app/services/nfc_service.py`
- The app defaults to the first detected PC/SC reader
- The app can read a tag UID from the active reader and write a public
  stats URL to a Type 2 tag as NDEF URL data
- Writing assumes a compatible PC/SC reader and a writable Type 2 tag

## Packaging

```powershell
.\build_exe.ps1
```

This produces a Windows desktop build using `PyInstaller`.

If you add a real NFC library later, you may need to update
`build_exe.ps1` to include extra binaries or data files required by that
library.
