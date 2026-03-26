from __future__ import annotations

import json
from dataclasses import dataclass
from pathlib import Path


BASE_DIR = Path(__file__).resolve().parents[1]
CONFIG_DIR = BASE_DIR / "config"
SETTINGS_PATH = CONFIG_DIR / "settings.json"
SETTINGS_EXAMPLE_PATH = CONFIG_DIR / "settings.example.json"


@dataclass
class AppConfig:
    api_base_url: str
    station_id: str
    default_points: float
    window_title: str


def _load_json(path: Path) -> dict:
    with path.open("r", encoding="utf-8") as file:
        return json.load(file)


def load_config() -> AppConfig:
    source_path = SETTINGS_PATH if SETTINGS_PATH.exists() else SETTINGS_EXAMPLE_PATH
    data = _load_json(source_path)

    api_base_url = str(data.get("api_base_url", "http://localhost:3000")).rstrip("/")
    station_id = str(data.get("station_id", "station-1")).strip() or "station-1"
    default_points = float(data.get("default_points", 1))
    window_title = str(data.get("window_title", "BackPackChallenge Station")).strip()

    return AppConfig(
        api_base_url=api_base_url,
        station_id=station_id,
        default_points=default_points,
        window_title=window_title or "BackPackChallenge Station",
    )
