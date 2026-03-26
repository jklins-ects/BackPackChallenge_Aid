from __future__ import annotations

import json
import urllib.error
import urllib.parse
import urllib.request


class ApiError(Exception):
    pass


class ApiClient:
    def __init__(self, base_url: str) -> None:
        self.base_url = base_url.rstrip("/")

    def _request(self, method: str, path: str, payload: dict | None = None):
        url = f"{self.base_url}{path}"
        headers = {"Content-Type": "application/json"}
        data = None

        if payload is not None:
            data = json.dumps(payload).encode("utf-8")

        request = urllib.request.Request(url, data=data, headers=headers, method=method)

        try:
            with urllib.request.urlopen(request, timeout=15) as response:
                body = response.read().decode("utf-8")
                return json.loads(body) if body else None
        except urllib.error.HTTPError as error:
            body = error.read().decode("utf-8")
            try:
                parsed = json.loads(body)
                message = parsed.get("error") or parsed.get("message") or str(error)
            except json.JSONDecodeError:
                message = body or str(error)
            raise ApiError(message) from error
        except urllib.error.URLError as error:
            raise ApiError(f"Could not reach API: {error.reason}") from error

    def get_activity_metadata(self) -> dict:
        return self._request("GET", "/api/activities/metadata")

    def get_groups(self) -> list[str]:
        return self._request("GET", "/api/participants/groups")

    def get_participants_by_group(self, group_id: str) -> list[dict]:
        safe_group = urllib.parse.quote(group_id, safe="")
        return self._request("GET", f"/api/participants/group/{safe_group}")

    def get_participant_by_nfc(self, nfc_id: str) -> dict:
        safe_nfc = urllib.parse.quote(nfc_id, safe="")
        return self._request("GET", f"/api/participants/nfc/{safe_nfc}")

    def award_by_code(
        self,
        group_id: str,
        participant_code: str,
        activity_key: str,
        points: int,
        station_id: str,
    ) -> dict:
        return self._request(
            "POST",
            "/api/activities/award-by-code",
            {
                "groupId": group_id,
                "participantCode": participant_code,
                "activityKey": activity_key,
                "points": points,
                "stationId": station_id,
            },
        )

    def award_by_nfc(
        self,
        nfc_id: str,
        activity_key: str,
        points: int,
        station_id: str,
    ) -> dict:
        return self._request(
            "POST",
            "/api/activities/award-by-nfc",
            {
                "nfcId": nfc_id,
                "activityKey": activity_key,
                "points": points,
                "stationId": station_id,
            },
        )

    def link_nfc(self, participant_id: str, nfc_id: str) -> dict:
        safe_id = urllib.parse.quote(participant_id, safe="")
        return self._request(
            "PATCH",
            f"/api/participants/{safe_id}/link-nfc",
            {"nfcId": nfc_id},
        )

    def get_public_link(self, participant_id: str) -> dict:
        safe_id = urllib.parse.quote(participant_id, safe="")
        return self._request("GET", f"/api/participants/{safe_id}/public-link")
