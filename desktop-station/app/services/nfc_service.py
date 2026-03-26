from __future__ import annotations

from dataclasses import dataclass, field

try:
    from smartcard.Exceptions import CardConnectionException, NoCardException
    from smartcard.System import readers
except ImportError:  # pragma: no cover - depends on local environment
    CardConnectionException = Exception
    NoCardException = Exception
    readers = None


STATUS_SUCCESS_SW1 = 0x90
STATUS_SUCCESS_SW2 = 0x00
APDU_GET_CARD_UID = [0xFF, 0xCA, 0x00, 0x00, 0x00]
APDU_READ_PAGE_PREFIX = [0xFF, 0xB0, 0x00]
APDU_WRITE_PAGE_PREFIX = [0xFF, 0xD6, 0x00]

TNF_WELL_KNOWN = 0x01
NDEF_TYPE_URI = b"U"

URI_PREFIX_TABLE = [
    "",
    "http://www.",
    "https://www.",
    "http://",
    "https://",
    "tel:",
    "mailto:",
    "ftp://anonymous:anonymous@",
    "ftp://ftp.",
    "ftps://",
    "sftp://",
    "smb://",
    "nfs://",
    "ftp://",
    "dav://",
    "news:",
    "telnet://",
    "imap:",
    "rtsp://",
    "urn:",
    "pop:",
    "sip:",
    "sips:",
    "tftp:",
    "btspp://",
    "btl2cap://",
    "btgoep://",
    "tcpobex://",
    "irdaobex://",
    "file://",
    "urn:epc:id:",
    "urn:epc:tag:",
    "urn:epc:pat:",
    "urn:epc:raw:",
    "urn:epc:",
    "urn:nfc:",
]


@dataclass
class NfcState:
    available_readers: list[str] = field(default_factory=list)
    selected_reader: str = ""
    current_nfc_id: str = ""
    last_status: str = "No NFC reader configured."


class NfcService:
    def __init__(self) -> None:
        self._state = NfcState()
        self.refresh_readers()

    def get_state(self) -> NfcState:
        return self._state

    def get_current_nfc_id(self) -> str:
        return self._state.current_nfc_id

    def list_readers(self) -> list[str]:
        return list(self._state.available_readers)

    def refresh_readers(self) -> NfcState:
        if readers is None:
            self._state.available_readers = []
            self._state.selected_reader = ""
            self._state.last_status = "pyscard is not installed."
            return self._state

        available = [str(reader) for reader in readers()]
        self._state.available_readers = available

        if self._state.selected_reader not in available:
            self._state.selected_reader = available[0] if available else ""

        if available:
            self._state.last_status = f"{len(available)} reader(s) detected."
        else:
            self._state.last_status = "No PC/SC readers detected."

        return self._state

    def set_selected_reader(self, reader_name: str) -> NfcState:
        self._state.selected_reader = reader_name.strip()
        if self._state.selected_reader:
            self._state.last_status = f"Selected reader: {self._state.selected_reader}"
        else:
            self._state.last_status = "No reader selected."
        return self._state

    def set_manual_nfc_id(self, nfc_id: str) -> NfcState:
        self._state.current_nfc_id = nfc_id.strip()
        self._state.last_status = (
            f"Manual NFC id set to {self._state.current_nfc_id}."
            if self._state.current_nfc_id
            else "Manual NFC id cleared."
        )
        return self._state

    def refresh(self) -> NfcState:
        self.refresh_readers()
        if not self._state.selected_reader:
            self._state.current_nfc_id = ""
            return self._state

        try:
            self._state.current_nfc_id = self._read_uid_from_selected_reader()
            if self._state.current_nfc_id:
                self._state.last_status = (
                    f"Read NFC id {self._state.current_nfc_id} from {self._state.selected_reader}."
                )
            else:
                self._state.last_status = (
                    f"No tag detected on {self._state.selected_reader}."
                )
        except (NoCardException, CardConnectionException):  # pragma: no cover - hardware path
            self._state.current_nfc_id = ""
            self._state.last_status = (
                f"No tag detected on {self._state.selected_reader}."
            )
        except Exception as error:  # pragma: no cover - hardware path
            self._state.current_nfc_id = ""
            self._state.last_status = f"Reader error: {error}"

        return self._state

    def write_url(self, url: str) -> str:
        if not url.strip():
            raise RuntimeError("A URL is required before writing to the tag.")

        connection = self._connect_selected_reader()
        ndef_message = build_ndef_message([make_url_record(url.strip())])
        write_ndef_message_to_type2_tag(connection, ndef_message)
        self._state.last_status = (
            f"Wrote URL to tag on {self._state.selected_reader}: {url.strip()}"
        )
        return self._state.last_status

    def _connect_selected_reader(self):
        if readers is None:
            raise RuntimeError("pyscard is not installed.")

        reader_name = self._state.selected_reader.strip()
        if not reader_name:
            raise RuntimeError("No NFC reader is selected.")

        for reader in readers():
            if str(reader) != reader_name:
                continue

            connection = reader.createConnection()
            connection.connect()
            return connection

        raise RuntimeError(f"Reader not found: {reader_name}")

    def _read_uid_from_selected_reader(self) -> str:
        connection = self._connect_selected_reader()
        uid_bytes, sw1, sw2 = connection.transmit(APDU_GET_CARD_UID)
        if (sw1, sw2) != (STATUS_SUCCESS_SW1, STATUS_SUCCESS_SW2):
            return ""
        return "".join(f"{byte:02X}" for byte in uid_bytes)


def _transmit_ok(sw1: int, sw2: int) -> bool:
    return (sw1, sw2) == (STATUS_SUCCESS_SW1, STATUS_SUCCESS_SW2)


def read_type2_memory_pages(card_connection, start_page_inclusive: int, end_page_inclusive: int) -> bytes | None:
    dump = bytearray()
    for page in range(start_page_inclusive, end_page_inclusive + 1):
        apdu_read_page = APDU_READ_PAGE_PREFIX + [page & 0xFF, 0x04]
        page_bytes, sw1, sw2 = card_connection.transmit(apdu_read_page)
        if not _transmit_ok(sw1, sw2) or len(page_bytes) != 4:
            return None
        dump.extend(page_bytes)
    return bytes(dump)


def get_type2_data_area_capacity_bytes(card_connection) -> int:
    page3 = read_type2_memory_pages(card_connection, 3, 3)
    if page3 is None or len(page3) != 4:
        raise RuntimeError("Could not read tag capability container.")

    cc0, _, cc2, _ = page3[0], page3[1], page3[2], page3[3]
    if cc0 != 0xE1:
        raise RuntimeError(f"Unexpected CC0 byte: 0x{cc0:02X}")

    return int(cc2) * 8


def _write_type2_pages(card_connection, start_page: int, data_bytes: bytes) -> None:
    if len(data_bytes) % 4 != 0:
        raise ValueError("Type 2 writes must be page aligned.")

    page_count = len(data_bytes) // 4
    for offset in range(page_count):
        page = start_page + offset
        chunk = data_bytes[offset * 4 : (offset + 1) * 4]
        apdu = APDU_WRITE_PAGE_PREFIX + [page & 0xFF, 0x04] + list(chunk)
        _, sw1, sw2 = card_connection.transmit(apdu)
        if not _transmit_ok(sw1, sw2):
            raise RuntimeError(f"Write failed at page {page} (SW={sw1:02X}{sw2:02X}).")


def write_ndef_message_to_type2_tag(
    card_connection,
    ndef_message: bytes,
    *,
    data_area_start_page: int = 4,
    pad_with_zeros: bool = True,
) -> None:
    tlv = _wrap_ndef_tlv(ndef_message)
    capacity = get_type2_data_area_capacity_bytes(card_connection)

    if len(tlv) > capacity:
        raise ValueError(
            f"NDEF TLV ({len(tlv)} bytes) exceeds tag capacity ({capacity} bytes)."
        )

    data = bytearray(tlv)
    if pad_with_zeros:
        data.extend(b"\x00" * (capacity - len(data)))

    if len(data) % 4 != 0:
        data.extend(b"\x00" * (4 - (len(data) % 4)))

    max_pages = (capacity + 3) // 4
    max_len = max_pages * 4
    _write_type2_pages(card_connection, data_area_start_page, bytes(data[:max_len]))


def _encode_ndef_record(
    tnf: int,
    type_bytes: bytes,
    payload_bytes: bytes,
    *,
    record_id: bytes = b"",
    mb: bool = False,
    me: bool = False,
) -> bytes:
    if payload_bytes is None:
        payload_bytes = b""

    il = 1 if record_id else 0
    sr = 1 if len(payload_bytes) < 256 else 0

    header = 0
    header |= 0x80 if mb else 0
    header |= 0x40 if me else 0
    header |= 0x10 if sr else 0
    header |= 0x08 if il else 0
    header |= tnf & 0x07

    output = bytearray([header, len(type_bytes)])
    if sr:
        output.append(len(payload_bytes))
    else:
        payload_len = len(payload_bytes)
        output.extend(
            [
                (payload_len >> 24) & 0xFF,
                (payload_len >> 16) & 0xFF,
                (payload_len >> 8) & 0xFF,
                payload_len & 0xFF,
            ]
        )

    if il:
        output.append(len(record_id))

    output.extend(type_bytes)
    if il:
        output.extend(record_id)
    output.extend(payload_bytes)
    return bytes(output)


def _best_uri_prefix(url: str) -> tuple[int, str]:
    best_code = 0
    best_length = 0
    for code, prefix in enumerate(URI_PREFIX_TABLE):
        if prefix and url.startswith(prefix) and len(prefix) > best_length:
            best_code = code
            best_length = len(prefix)
    return best_code, url[best_length:] if best_length else url


def make_url_record(url: str) -> bytes:
    prefix_code, remainder = _best_uri_prefix(url)
    payload = bytes([prefix_code]) + remainder.encode("utf-8")
    return _encode_ndef_record(TNF_WELL_KNOWN, NDEF_TYPE_URI, payload)


def build_ndef_message(record_bytes_list: list[bytes]) -> bytes:
    if not record_bytes_list:
        return b""

    output = bytearray()
    for index, record in enumerate(record_bytes_list):
        if not record:
            continue
        first_byte = record[0] & 0x3F
        if index == 0:
            first_byte |= 0x80
        if index == len(record_bytes_list) - 1:
            first_byte |= 0x40
        output.append(first_byte)
        output.extend(record[1:])
    return bytes(output)


def _wrap_ndef_tlv(ndef_message: bytes) -> bytes:
    length = len(ndef_message)
    tlv = bytearray([0x03])
    if length < 0xFF:
        tlv.append(length)
    else:
        tlv.extend([0xFF, (length >> 8) & 0xFF, length & 0xFF])
    tlv.extend(ndef_message)
    tlv.append(0xFE)
    return bytes(tlv)
