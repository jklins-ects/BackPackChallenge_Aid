from __future__ import annotations

from PyQt5.QtCore import Qt
from PyQt5.QtGui import QDoubleValidator
from PyQt5.QtWidgets import (
    QComboBox,
    QFormLayout,
    QGroupBox,
    QHBoxLayout,
    QLabel,
    QLineEdit,
    QPushButton,
    QRadioButton,
    QTextEdit,
    QVBoxLayout,
    QWidget,
)


class ActivityTab(QWidget):
    def __init__(self, activity: dict, main_window) -> None:
        super().__init__()
        self.activity = activity
        self.main_window = main_window
        self.participants: list[dict] = []
        self.current_preview_participant: dict | None = None
        self._build_ui()
        self._wire_events()

    def _build_ui(self) -> None:
        layout = QVBoxLayout(self)

        mode_group = QGroupBox("Scoring Mode")
        mode_layout = QHBoxLayout(mode_group)
        self.by_code_radio = QRadioButton("Score by group and participant")
        self.by_nfc_radio = QRadioButton("Score by current NFC id")
        self.by_code_radio.setChecked(True)
        mode_layout.addWidget(self.by_code_radio)
        mode_layout.addWidget(self.by_nfc_radio)

        self.group_panel = QGroupBox("Group Selection")
        group_form = QFormLayout(self.group_panel)
        self.group_combo = QComboBox()
        self.group_combo.setMinimumWidth(240)
        self.participant_combo = QComboBox()
        group_form.addRow("Group", self.group_combo)
        group_form.addRow("Participant", self.participant_combo)

        self.nfc_panel = QGroupBox("Current NFC")
        nfc_form = QFormLayout(self.nfc_panel)
        self.nfc_label = QLabel("No NFC id selected")
        self.nfc_label.setTextInteractionFlags(Qt.TextSelectableByMouse)
        self.nfc_status_label = QLabel("No NFC reader status available")
        self.nfc_status_label.setWordWrap(True)
        nfc_form.addRow("NFC ID", self.nfc_label)
        nfc_form.addRow("Reader Status", self.nfc_status_label)

        score_group = QGroupBox("Set Score")
        score_form = QFormLayout(score_group)
        self.points_input = QLineEdit()
        self.points_input.setText(str(self.main_window.config.default_points))
        self.points_input.setValidator(QDoubleValidator(bottom=-999999999, top=999999999, decimals=2))
        self.station_label = QLabel(self.main_window.get_station_id())
        self.station_label.setTextInteractionFlags(Qt.TextSelectableByMouse)
        score_form.addRow("Score Value", self.points_input)
        score_form.addRow("Station ID", self.station_label)

        preview_group = QGroupBox("Known Participant Stats")
        preview_layout = QVBoxLayout(preview_group)
        self.preview_name_label = QLabel("No participant loaded")
        self.preview_name_label.setStyleSheet("font-weight: 700; color: #204d45;")
        self.preview_stats_html = QTextEdit()
        self.preview_stats_html.setReadOnly(True)
        self.preview_stats_html.setMinimumHeight(170)
        preview_layout.addWidget(self.preview_name_label)
        preview_layout.addWidget(self.preview_stats_html)

        self.submit_button = QPushButton(f"Set {self.activity['title']} Score")
        self.status_output = QTextEdit()
        self.status_output.setReadOnly(True)
        self.status_output.setMinimumHeight(160)

        layout.addWidget(mode_group)
        layout.addWidget(self.group_panel)
        layout.addWidget(self.nfc_panel)
        layout.addWidget(score_group)
        layout.addWidget(preview_group)
        layout.addWidget(self.submit_button)
        layout.addWidget(self.status_output)

        self._set_mode_state()

    def _wire_events(self) -> None:
        self.by_code_radio.toggled.connect(self._set_mode_state)
        self.by_nfc_radio.toggled.connect(self._set_mode_state)
        self.group_combo.currentIndexChanged.connect(self._load_participants_for_group)
        self.participant_combo.currentIndexChanged.connect(self._preview_selected_participant)
        self.submit_button.clicked.connect(self._submit_score)

    def initialize_groups(self, groups: list[str]) -> None:
        self.group_combo.blockSignals(True)
        self.group_combo.clear()
        self.group_combo.addItem("Select a group", "")
        for group_id in groups:
            self.group_combo.addItem(group_id, group_id)
        self.group_combo.blockSignals(False)
        self._clear_participants("Select a group first")
        self.apply_shared_selection()

    def apply_shared_selection(self) -> None:
        shared_group_id = self.main_window.shared_group_id
        shared_participant_id = self.main_window.shared_participant_id

        index = self.group_combo.findData(shared_group_id)
        self.group_combo.blockSignals(True)
        self.group_combo.setCurrentIndex(index if index >= 0 else 0)
        self.group_combo.blockSignals(False)

        if shared_group_id:
            self._load_participants_for_group(
                preferred_participant_id=shared_participant_id,
                announce_group_change=False,
            )
        else:
            self._clear_participants("Select a group first")

    def refresh_context(self) -> None:
        self.station_label.setText(self.main_window.get_station_id())
        self.nfc_label.setText(self.main_window.get_current_nfc_id() or "No NFC id selected")
        self.nfc_status_label.setText(self.main_window.get_nfc_status())
        if self.by_nfc_radio.isChecked():
            self._preview_current_nfc_participant()

    def _set_mode_state(self) -> None:
        by_code = self.by_code_radio.isChecked()
        self.group_panel.setVisible(by_code)
        self.nfc_panel.setVisible(not by_code)
        if by_code:
            self._preview_selected_participant()
        else:
            self._preview_current_nfc_participant()

    def _clear_participants(self, placeholder: str) -> None:
        self.participants = []
        self.participant_combo.clear()
        self.participant_combo.addItem(placeholder, "")
        self.current_preview_participant = None
        self._render_preview(None)

    def _load_participants_for_group(
        self,
        preferred_participant_id: str | None = None,
        announce_group_change: bool = True,
    ) -> None:
        group_id = self.group_combo.currentData()
        if not group_id:
            self._clear_participants("Select a group first")
            if announce_group_change:
                self.main_window.set_shared_group_selection("", source=self)
            return

        if announce_group_change:
            self.main_window.set_shared_group_selection(group_id, source=self)

        try:
            participants = self.main_window.api_client.get_participants_by_group(group_id)
            self.participants = participants
            self.participant_combo.blockSignals(True)
            self.participant_combo.clear()

            if not participants:
                self.participant_combo.addItem("No participants found", "")
                self.participant_combo.blockSignals(False)
                self._render_preview(None)
                return

            self.participant_combo.addItem("Select a participant", "")
            for participant in participants:
                self.participant_combo.addItem(self._participant_label(participant), participant)

            target_participant_id = preferred_participant_id
            if target_participant_id:
                for index in range(1, self.participant_combo.count()):
                    participant = self.participant_combo.itemData(index)
                    if isinstance(participant, dict) and str(participant.get("_id", "")) == target_participant_id:
                        self.participant_combo.setCurrentIndex(index)
                        break

            self.participant_combo.blockSignals(False)
            self._preview_selected_participant(announce_selection=False)
        except Exception as error:  # pragma: no cover - UI feedback path
            self._clear_participants("Unable to load participants")
            self._append_status(f"Error loading participants: {error}")

    def _preview_selected_participant(self, announce_selection: bool = True) -> None:
        participant = self.participant_combo.currentData()
        self.current_preview_participant = participant if isinstance(participant, dict) else None
        if announce_selection and self.current_preview_participant:
            self.main_window.set_shared_participant_selection(
                self.group_combo.currentData() or "",
                str(self.current_preview_participant.get("_id", "")),
                source=self,
            )
        self._render_preview(self.current_preview_participant)

    def _preview_current_nfc_participant(self) -> None:
        nfc_id = self.main_window.get_current_nfc_id()
        if not nfc_id:
            self.current_preview_participant = None
            self._render_preview(None, "No NFC id is currently loaded.")
            return

        try:
            participant = self.main_window.api_client.get_participant_by_nfc(nfc_id)
            self.current_preview_participant = participant
            self._render_preview(participant)
        except Exception:
            self.current_preview_participant = None
            self._render_preview(None, f"No participant is linked to NFC id {nfc_id}.")

    def _render_preview(self, participant: dict | None, fallback: str | None = None) -> None:
        if not participant:
            self.preview_name_label.setText("No participant loaded")
            self.preview_stats_html.setHtml(
                f"<div style='color:#5c766d;'>{fallback or 'Load a participant by group or NFC to preview stats.'}</div>",
            )
            return

        self.preview_name_label.setText(self._participant_label(participant))
        self.preview_stats_html.setHtml(
            self._format_stats_html(participant.get("stats", {})),
        )

    def _submit_score(self) -> None:
        points_text = self.points_input.text().strip()
        if not points_text:
            self._append_status("Enter a score value before submitting.")
            return

        try:
            points_value = float(points_text)
        except ValueError:
            self._append_status("Score value must be numeric.")
            return

        station_id = self.main_window.get_station_id()

        if self.by_code_radio.isChecked():
            participant = self.participant_combo.currentData()
            group_id = self.group_combo.currentData()

            if not group_id or not isinstance(participant, dict):
                self._append_status("Choose a group and participant before scoring.")
                return

            try:
                result = self.main_window.api_client.award_by_code(
                    group_id=group_id,
                    participant_code=participant.get("participantCode", ""),
                    activity_key=self.activity["key"],
                    points=points_value,
                    station_id=station_id,
                )
                updated = result.get("participant")
                self.current_preview_participant = updated
                self._render_preview(updated)
                self._append_status(
                    f"Set {self.activity['title']} to {points_value:g} for "
                    f"{self._participant_name(updated)}."
                )
            except Exception as error:  # pragma: no cover - UI feedback path
                self._append_status(f"Error setting score by participant: {error}")
            return

        nfc_id = self.main_window.get_current_nfc_id()
        if not nfc_id:
            self._append_status("No current NFC id is set.")
            return

        try:
            result = self.main_window.api_client.award_by_nfc(
                nfc_id=nfc_id,
                activity_key=self.activity["key"],
                points=points_value,
                station_id=station_id,
            )
            if result.get("status") == "pending":
                self.current_preview_participant = None
                self._render_preview(
                    None,
                    f"NFC id {nfc_id} is not linked yet. The latest score will apply when linked.",
                )
                self._append_status(
                    f"Stored pending score {points_value:g} for {self.activity['title']} "
                    f"on NFC id {nfc_id}."
                )
            else:
                updated = result.get("participant")
                self.current_preview_participant = updated
                self._render_preview(updated)
                self._append_status(
                    f"Set {self.activity['title']} to {points_value:g} for "
                    f"{self._participant_name(updated)} via NFC."
                )
        except Exception as error:  # pragma: no cover - UI feedback path
            self._append_status(f"Error setting score by NFC: {error}")

    def _participant_label(self, participant: dict) -> str:
        full_name = f"{participant.get('firstName', '')} {participant.get('lastName', '')}".strip()
        label_name = full_name or "(No name yet)"
        return f"{label_name} - {participant.get('participantCode', '')}"

    def _participant_name(self, participant: dict | None) -> str:
        if not participant:
            return "Unknown participant"
        full_name = f"{participant.get('firstName', '')} {participant.get('lastName', '')}".strip()
        return full_name or participant.get("participantCode", "Unknown participant")

    def _format_stats_html(self, stats: dict) -> str:
        title_by_key = self.main_window.activity_title_by_key
        rows = []
        for activity in self.main_window.activities:
            value = stats.get(activity["key"], 0)
            is_selected = activity["key"] == self.activity["key"]
            title = title_by_key.get(activity["key"], "")
            if not title:
                continue
            rows.append(
                f"""
                <div style="
                    margin: 0 0 4px 0;
                    padding: 4px 8px;
                    border-radius: 6px;
                    background: {'#e5f4ee' if is_selected else 'transparent'};
                ">
                    <span style="font-weight:{'700' if is_selected else '400'}; color:#204d45;">{title}:</span>
                    <span style="color:#1f7a5c; font-weight:{'700' if is_selected else '400'};"> {value}</span>
                </div>
                """
            )
        return "".join(rows) or "<div style='color:#5c766d;'>No visible stats configured.</div>"

    def _append_status(self, message: str) -> None:
        self.status_output.append(message)
