from __future__ import annotations

import sys

from PyQt5.QtCore import QTimer
from PyQt5.QtGui import QIcon
from PyQt5.QtWidgets import (
    QApplication,
    QFormLayout,
    QHBoxLayout,
    QLabel,
    QLineEdit,
    QMainWindow,
    QMessageBox,
    QPushButton,
    QTabWidget,
    QVBoxLayout,
    QWidget,
)

from app.config import load_config
from app.resources import asset_path
from app.services.api_client import ApiClient, ApiError
from app.services.nfc_service import NfcService
from app.ui.activity_tab import ActivityTab
from app.ui.link_tab import LinkTab


class MainWindow(QMainWindow):
    def __init__(self) -> None:
        super().__init__()
        self.config = load_config()
        self.api_client = ApiClient(self.config.api_base_url, self.config.api_key)
        self.nfc_service = NfcService()
        self.activity_tabs: list[ActivityTab] = []
        self.link_tab: LinkTab | None = None
        self.activities: list[dict] = []
        self.activity_title_by_key: dict[str, str] = {}
        self.shared_group_id = ""
        self.shared_participant_id = ""
        self.group_participants_cache: dict[str, list[dict]] = {}
        self.participant_cache_by_id: dict[str, dict] = {}
        self.participant_cache_by_nfc: dict[str, dict] = {}
        self._last_nfc_signature = ""
        self.nfc_timer = QTimer(self)

        self._build_shell()
        self._configure_nfc_timer()
        self._load_remote_metadata()

    def _build_shell(self) -> None:
        self.setWindowTitle(self.config.window_title)
        self.resize(1080, 760)
        self.setWindowIcon(QIcon(asset_path("app-icon.svg")))

        central = QWidget()
        central_layout = QVBoxLayout(central)
        self.setCentralWidget(central)

        top_panel = QWidget()
        top_layout = QHBoxLayout(top_panel)

        station_form = QFormLayout()
        self.api_url_label = QLabel(self.config.api_base_url)
        self.station_id_input = QLineEdit(self.config.station_id)
        self.current_nfc_label = QLabel("No NFC id selected")
        self.nfc_status_label = QLabel(self.nfc_service.get_state().last_status)
        self.nfc_status_label.setWordWrap(True)

        station_form.addRow("API Base URL", self.api_url_label)
        station_form.addRow("Station ID", self.station_id_input)
        station_form.addRow("Current NFC", self.current_nfc_label)
        station_form.addRow("NFC Status", self.nfc_status_label)

        button_column = QVBoxLayout()
        self.read_uid_button = QPushButton("Read Current Tag UID")
        self.refresh_nfc_button = QPushButton("Refresh NFC State")
        button_column.addWidget(self.read_uid_button)
        button_column.addWidget(self.refresh_nfc_button)
        button_column.addStretch(1)

        top_layout.addLayout(station_form, 1)
        top_layout.addLayout(button_column)

        self.tabs = QTabWidget()

        central_layout.addWidget(top_panel)
        central_layout.addWidget(self.tabs, 1)

        self.read_uid_button.clicked.connect(self._read_current_uid)
        self.refresh_nfc_button.clicked.connect(self._refresh_nfc_state)
        self.station_id_input.textChanged.connect(self._refresh_tab_context)
        self.setStyleSheet(
            """
            QTabWidget::pane {
                border: 1px solid #cfded7;
                top: -1px;
                background: #f9fcfb;
            }
            QTabBar::tab {
                background: #dfeee7;
                color: #23473d;
                border: 1px solid #c0d6cc;
                padding: 10px 18px;
                margin-right: 4px;
                border-top-left-radius: 8px;
                border-top-right-radius: 8px;
            }
            QTabBar::tab:selected {
                background: #1f7a5c;
                color: white;
            }
            QGroupBox {
                font-weight: 700;
                border: 1px solid #d4e1db;
                border-radius: 10px;
                margin-top: 10px;
                padding-top: 12px;
                background: white;
            }
            QGroupBox::title {
                subcontrol-origin: margin;
                left: 12px;
                padding: 0 4px;
                color: #23473d;
            }
            QPushButton {
                background: #1f7a5c;
                color: white;
                border: 0;
                border-radius: 8px;
                padding: 8px 12px;
            }
            QPushButton:hover {
                background: #19654d;
            }
            """
        )

    def _configure_nfc_timer(self) -> None:
        self.nfc_timer.setInterval(500)
        self.nfc_timer.timeout.connect(self._poll_nfc_state)
        self.nfc_timer.start()

    def _load_remote_metadata(self) -> None:
        try:
            metadata = self.api_client.get_activity_metadata()
            groups = self.api_client.get_groups()
        except ApiError as error:
            QMessageBox.critical(
                self,
                "Startup Error",
                f"Could not load station data from the API.\n\n{error}",
            )
            metadata = {
                "activities": [
                    {"key": f"activity{index}", "title": f"Temp Activity Title {index}"}
                    for index in range(1, 10)
                ]
            }
            groups = []

        self.activities = metadata.get("visibleActivities") or [
            activity
            for activity in metadata.get("activities", [])
            if isinstance(activity.get("title"), str) and activity["title"].strip()
        ]
        self.activity_title_by_key = {
            activity["key"]: activity["title"] for activity in self.activities
        }
        self._build_tabs(self.activities, groups)
        self._refresh_nfc_state()

    def _poll_nfc_state(self) -> None:
        state = self.nfc_service.refresh()
        signature = "|".join(
            [
                ",".join(state.available_readers),
                state.selected_reader,
                state.current_nfc_id,
                state.last_status,
            ]
        )

        if signature == self._last_nfc_signature:
            return

        self._last_nfc_signature = signature
        self._apply_nfc_state(state)
        self._refresh_tab_context()

    def _build_tabs(self, activities: list[dict], groups: list[str]) -> None:
        self.tabs.clear()
        self.activity_tabs = []

        for activity in activities:
            tab = ActivityTab(activity=activity, main_window=self)
            tab.initialize_groups(groups)
            self.tabs.addTab(tab, activity["title"])
            self.activity_tabs.append(tab)

        self.link_tab = LinkTab(main_window=self)
        self.link_tab.initialize_groups(groups)
        self.tabs.addTab(self.link_tab, "Associate")

    def _refresh_nfc_state(self) -> None:
        state = self.nfc_service.refresh()
        self._last_nfc_signature = "|".join(
            [
                ",".join(state.available_readers),
                state.selected_reader,
                state.current_nfc_id,
                state.last_status,
            ]
        )
        self._apply_nfc_state(state)
        self._refresh_tab_context()

    def _read_current_uid(self) -> None:
        self._refresh_nfc_state()

    def _apply_nfc_state(self, state) -> None:
        self.current_nfc_label.setText(state.current_nfc_id or "No NFC id selected")
        self.nfc_status_label.setText(state.last_status)

    def _refresh_tab_context(self) -> None:
        for tab in self.activity_tabs:
            tab.refresh_context()
        if self.link_tab:
            self.link_tab.refresh_context()

    def refresh_nfc_context(self) -> None:
        self._refresh_nfc_state()

    def set_shared_group_selection(self, group_id: str, source=None) -> None:
        normalized = (group_id or "").strip()
        if self.shared_group_id == normalized:
            return

        self.shared_group_id = normalized
        self.shared_participant_id = ""
        self._propagate_shared_selection(source=source)

    def set_shared_participant_selection(self, group_id: str, participant_id: str, source=None) -> None:
        normalized_group = (group_id or "").strip()
        normalized_participant = (participant_id or "").strip()
        self.shared_group_id = normalized_group
        self.shared_participant_id = normalized_participant
        self._propagate_shared_selection(source=source)

    def _propagate_shared_selection(self, source=None) -> None:
        for tab in self.activity_tabs:
            if tab is source:
                continue
            tab.apply_shared_selection()
        if self.link_tab and self.link_tab is not source:
            self.link_tab.apply_shared_selection()

    def get_cached_participants_by_group(self, group_id: str, force_refresh: bool = False) -> list[dict]:
        normalized_group = (group_id or "").strip()
        if not normalized_group:
            return []

        if not force_refresh and normalized_group in self.group_participants_cache:
            return self.group_participants_cache[normalized_group]

        participants = self.api_client.get_participants_by_group(normalized_group)
        self.group_participants_cache[normalized_group] = participants
        for participant in participants:
            self._store_participant_in_cache(participant)
        return participants

    def get_cached_participant_by_nfc(self, nfc_id: str, force_refresh: bool = False) -> dict:
        normalized_nfc = (nfc_id or "").strip()
        if not normalized_nfc:
            raise ValueError("nfc_id is required")

        if not force_refresh and normalized_nfc in self.participant_cache_by_nfc:
            return self.participant_cache_by_nfc[normalized_nfc]

        participant = self.api_client.get_participant_by_nfc(normalized_nfc)
        self._store_participant_in_cache(participant)
        return participant

    def update_cached_participant(self, participant: dict | None) -> None:
        if not isinstance(participant, dict):
            return
        self._store_participant_in_cache(participant)
        self._refresh_participant_views(str(participant.get("_id", "")).strip())

    def _store_participant_in_cache(self, participant: dict) -> None:
        participant_id = str(participant.get("_id", "")).strip()
        group_id = str(participant.get("groupId", "")).strip()
        nfc_id = str(participant.get("nfcId", "")).strip()

        if participant_id:
            self.participant_cache_by_id[participant_id] = participant
        if nfc_id:
            self.participant_cache_by_nfc[nfc_id] = participant

        if group_id:
            existing = self.group_participants_cache.get(group_id, [])
            replaced = False
            updated_group = []
            for existing_participant in existing:
                existing_id = str(existing_participant.get("_id", "")).strip()
                if participant_id and existing_id == participant_id:
                    updated_group.append(participant)
                    replaced = True
                else:
                    updated_group.append(existing_participant)

            if not replaced:
                updated_group.append(participant)

            if updated_group:
                self.group_participants_cache[group_id] = updated_group

    def _refresh_participant_views(self, participant_id: str) -> None:
        if not participant_id:
            return

        for tab in self.activity_tabs:
            tab.refresh_participant_from_cache(participant_id)
        if self.link_tab:
            self.link_tab.refresh_participant_from_cache(participant_id)

    def get_station_id(self) -> str:
        value = self.station_id_input.text().strip()
        return value or self.config.station_id

    def get_current_nfc_id(self) -> str:
        return self.nfc_service.get_current_nfc_id()

    def get_nfc_status(self) -> str:
        return self.nfc_service.get_state().last_status


def run() -> None:
    app = QApplication(sys.argv)
    app.setWindowIcon(QIcon(asset_path("app-icon.svg")))
    window = MainWindow()
    window.show()
    sys.exit(app.exec_())
