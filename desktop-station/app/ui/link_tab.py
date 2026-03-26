from __future__ import annotations

from PyQt5.QtCore import Qt
from PyQt5.QtWidgets import (
    QComboBox,
    QFormLayout,
    QGroupBox,
    QLabel,
    QLineEdit,
    QPushButton,
    QTextEdit,
    QVBoxLayout,
    QWidget,
)


class LinkTab(QWidget):
    def __init__(self, main_window) -> None:
        super().__init__()
        self.main_window = main_window
        self.last_linked_participant_id = ""
        self.last_loaded_nfc_id = ""
        self._build_ui()
        self._wire_events()

    def _build_ui(self) -> None:
        layout = QVBoxLayout(self)

        form_group = QGroupBox("Link Current NFC ID")
        form_layout = QFormLayout(form_group)

        self.current_nfc_label = QLabel(self.main_window.get_current_nfc_id() or "No NFC id selected")
        self.current_nfc_label.setTextInteractionFlags(Qt.TextSelectableByMouse)
        self.group_combo = QComboBox()
        self.group_combo.setMinimumWidth(220)
        self.participant_combo = QComboBox()
        self.first_name_input = QLineEdit()
        self.last_name_input = QLineEdit()

        form_layout.addRow("Current NFC", self.current_nfc_label)
        form_layout.addRow("Group", self.group_combo)
        form_layout.addRow("Participant", self.participant_combo)
        form_layout.addRow("First Name", self.first_name_input)
        form_layout.addRow("Last Name", self.last_name_input)

        self.public_link_label = QLabel("No public link loaded")
        self.public_link_label.setTextInteractionFlags(Qt.TextSelectableByMouse)

        self.link_button = QPushButton("Link NFC and Write Stats Link")

        self.status_output = QTextEdit()
        self.status_output.setReadOnly(True)
        self.status_output.setMinimumHeight(220)

        layout.addWidget(form_group)
        layout.addWidget(self.public_link_label)
        layout.addWidget(self.link_button)
        layout.addWidget(self.status_output)

    def _wire_events(self) -> None:
        self.group_combo.currentIndexChanged.connect(self._load_participants_for_group)
        self.participant_combo.currentIndexChanged.connect(self._handle_participant_selection_change)
        self.link_button.clicked.connect(self._link_current_nfc)

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
        current_nfc_id = self.main_window.get_current_nfc_id()
        self.current_nfc_label.setText(current_nfc_id or "No NFC id selected")
        self._sync_selection_from_current_nfc(current_nfc_id)

    def refresh_participant_from_cache(self, participant_id: str) -> None:
        if not participant_id:
            return

        updated_participant = self.main_window.participant_cache_by_id.get(participant_id)
        if not updated_participant:
            return

        for index in range(1, self.participant_combo.count()):
            participant = self.participant_combo.itemData(index)
            if isinstance(participant, dict) and str(participant.get("_id", "")) == participant_id:
                full_name = f"{updated_participant.get('firstName', '')} {updated_participant.get('lastName', '')}".strip()
                label_name = full_name or "(No name yet)"
                label = f"{label_name} - {updated_participant.get('participantCode', '')}"
                self.participant_combo.setItemData(index, updated_participant)
                self.participant_combo.setItemText(index, label)
                current_participant = self.participant_combo.currentData()
                if (
                    isinstance(current_participant, dict)
                    and str(current_participant.get("_id", "")) == participant_id
                ):
                    self._populate_name_fields(updated_participant)
                break

    def _clear_participants(self, placeholder: str) -> None:
        self.participant_combo.clear()
        self.participant_combo.addItem(placeholder, "")
        self._populate_name_fields(None)

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
            participants = self.main_window.get_cached_participants_by_group(group_id)
            self.participant_combo.blockSignals(True)
            self.participant_combo.clear()
            if not participants:
                self.participant_combo.addItem("No participants found", "")
                self.participant_combo.blockSignals(False)
                return

            self.participant_combo.addItem("Select a participant", "")
            for participant in participants:
                full_name = f"{participant.get('firstName', '')} {participant.get('lastName', '')}".strip()
                label_name = full_name or "(No name yet)"
                label = f"{label_name} - {participant.get('participantCode', '')}"
                self.participant_combo.addItem(label, participant)

            if preferred_participant_id:
                for index in range(1, self.participant_combo.count()):
                    participant = self.participant_combo.itemData(index)
                    if isinstance(participant, dict) and str(participant.get("_id", "")) == preferred_participant_id:
                        self.participant_combo.setCurrentIndex(index)
                        break

            self.participant_combo.blockSignals(False)
        except Exception as error:  # pragma: no cover - UI feedback path
            self._clear_participants("Unable to load participants")
            self.status_output.append(f"Error loading participants: {error}")

    def _handle_participant_selection_change(self) -> None:
        participant = self.participant_combo.currentData()
        if not isinstance(participant, dict):
            self._populate_name_fields(None)
            return

        self._populate_name_fields(participant)
        self.main_window.set_shared_participant_selection(
            self.group_combo.currentData() or "",
            str(participant.get("_id", "")),
            source=self,
        )

    def _populate_name_fields(self, participant: dict | None) -> None:
        if not isinstance(participant, dict):
            self.first_name_input.clear()
            self.last_name_input.clear()
            return

        self.first_name_input.setText(str(participant.get("firstName", "") or ""))
        self.last_name_input.setText(str(participant.get("lastName", "") or ""))

    def _sync_selection_from_current_nfc(self, nfc_id: str) -> None:
        normalized_nfc = (nfc_id or "").strip()
        if normalized_nfc == self.last_loaded_nfc_id:
            return

        self.last_loaded_nfc_id = normalized_nfc
        if not normalized_nfc:
            self.public_link_label.setText("No public link loaded")
            return

        try:
            participant = self.main_window.get_cached_participant_by_nfc(normalized_nfc)
        except Exception:
            self.public_link_label.setText("No public link loaded")
            return

        if not isinstance(participant, dict):
            return

        group_id = str(participant.get("groupId", "")).strip()
        participant_id = str(participant.get("_id", "")).strip()
        if group_id and participant_id:
            self.main_window.set_shared_participant_selection(
                group_id,
                participant_id,
                source=self,
            )
            self.apply_shared_selection()
            self._populate_name_fields(participant)

    def _link_current_nfc(self) -> None:
        participant = self.participant_combo.currentData()
        nfc_id = self.main_window.get_current_nfc_id()

        if not nfc_id:
            self.status_output.append("No current NFC id is set.")
            return

        if not isinstance(participant, dict):
            self.status_output.append("Choose a participant before linking.")
            return

        try:
            participant_id = str(participant["_id"])
            first_name = self.first_name_input.text().strip()
            last_name = self.last_name_input.text().strip()
            current_first = str(participant.get("firstName", "") or "").strip()
            current_last = str(participant.get("lastName", "") or "").strip()

            if first_name != current_first or last_name != current_last:
                updated_participant = self.main_window.api_client.patch_participant(
                    participant_id=participant_id,
                    payload={
                        "firstName": first_name,
                        "lastName": last_name,
                    },
                )
                if isinstance(updated_participant, dict):
                    participant = updated_participant.get("participant", updated_participant)
                    self.main_window.update_cached_participant(participant)
                    self.status_output.append(
                        f"Updated participant name to {first_name or '-'} {last_name or '-'}."
                    )

            result = self.main_window.api_client.link_nfc(
                participant_id=participant_id,
                nfc_id=nfc_id,
            )
            resolved_count = result.get("resolvedPendingEvents", 0)
            updated = result.get("participant", {})
            self.main_window.update_cached_participant(updated)
            self.last_linked_participant_id = str(updated.get("_id", participant["_id"]))
            public_link = result.get("publicLink", "")
            self.public_link_label.setText(public_link or "No public link loaded")
            full_name = f"{updated.get('firstName', '')} {updated.get('lastName', '')}".strip()
            display_name = full_name or updated.get("participantCode", "participant")
            self._populate_name_fields(updated)
            self.status_output.append(
                f"Linked NFC id {nfc_id} to {display_name}. "
                f"Resolved pending events: {resolved_count}."
            )
            if not public_link:
                self.status_output.append("Participant linked, but no public link was returned.")
                return

            write_status = self.main_window.nfc_service.write_url(public_link)
            self.main_window.refresh_nfc_context()
            self.status_output.append(f"Public stats link: {public_link}")
            self.status_output.append(write_status)
        except Exception as error:  # pragma: no cover - UI feedback path
            self.status_output.append(f"Error linking NFC id or writing stats link: {error}")
