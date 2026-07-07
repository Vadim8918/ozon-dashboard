import json
import re
import base64
import csv
import hashlib
import hmac
import os
import secrets
import sys
import threading
import io
import zipfile
from datetime import date, datetime, timedelta, timezone
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from typing import Any
from urllib.parse import parse_qs, urlparse
import xml.etree.ElementTree as ET

import requests
from dotenv import load_dotenv


BASE_URL = "https://api-seller.ozon.ru"
APP_DIR = Path(__file__).resolve().parent
STATIC_DIR = APP_DIR / "dashboard"
CONFIG_PATH = APP_DIR / "dashboard_config.json"
CACHE_DIR = APP_DIR / "cache"
TARIFFS_DIR = CACHE_DIR / "tariff_files"
TARIFFS_META_PATH = CACHE_DIR / "tariffs_meta.json"
SESSION_SECRET = secrets.token_bytes(32)
ADMIN_ROLES = {"owner", "admin"}
TNVED_CACHE_TTL_SECONDS = 5 * 60
REPORT_CACHE_TTL_SECONDS = 30 * 60
REPORT_CACHE_VERSION = 2
APP_TZ = timezone(timedelta(hours=3))
TNVED_CACHE: dict[str, dict[str, Any]] = {}
TNVED_CACHE_LOCK = threading.Lock()
TNVED_REFRESHING: set[str] = set()


def password_hash(password: str, salt: str | None = None) -> str:
    salt = salt or secrets.token_hex(16)
    digest = hashlib.pbkdf2_hmac("sha256", password.encode("utf-8"), salt.encode("utf-8"), 120_000)
    return f"pbkdf2_sha256${salt}${base64.b64encode(digest).decode('ascii')}"


def verify_password(password: str, stored_hash: str) -> bool:
    try:
        algorithm, salt, expected = stored_hash.split("$", 2)
        if algorithm != "pbkdf2_sha256":
            return False
        return hmac.compare_digest(password_hash(password, salt), stored_hash)
    except ValueError:
        return False


def load_config() -> dict[str, Any]:
    load_dotenv(APP_DIR / ".env")
    if CONFIG_PATH.exists():
        config = json.loads(CONFIG_PATH.read_text(encoding="utf-8"))
        return normalize_config(config)

    owner_login = os.getenv("DASHBOARD_OWNER_LOGIN", "owner")
    owner_password = os.getenv("DASHBOARD_OWNER_PASSWORD", "change-me-123")
    viewer_login = os.getenv("DASHBOARD_VIEWER_LOGIN", "viewer")
    viewer_password = os.getenv("DASHBOARD_VIEWER_PASSWORD", "viewer-123")
    config = {
        "ozon": {
            "client_id": os.getenv("OZON_CLIENT_ID", ""),
            "api_key": os.getenv("OZON_API_KEY", ""),
        },
        "users": [
            {
                "login": owner_login,
                "role": "owner",
                "password_hash": password_hash(owner_password),
            },
            {
                "login": viewer_login,
                "role": "viewer",
                "password_hash": password_hash(viewer_password),
            },
        ],
    }
    save_config(config)
    return normalize_config(config)


def save_config(config: dict[str, Any]) -> None:
    CONFIG_PATH.write_text(json.dumps(config, ensure_ascii=False, indent=2), encoding="utf-8")


def normalize_config(config: dict[str, Any]) -> dict[str, Any]:
    accounts = config.get("accounts")
    if not isinstance(accounts, list):
        ozon = config.get("ozon", {}) if isinstance(config.get("ozon"), dict) else {}
        client_id = str(ozon.get("client_id", "")).strip()
        api_key = str(ozon.get("api_key", "")).strip()
        accounts = []
        if client_id or api_key:
            accounts.append(
                {
                    "client_id": client_id,
                    "name": default_account_name(client_id),
                    "api_key": api_key,
                }
            )
        config["accounts"] = accounts

    normalized_accounts = []
    seen_client_ids: set[str] = set()
    for account in accounts:
        if not isinstance(account, dict):
            continue
        client_id = str(account.get("client_id", "")).strip()
        api_key = str(account.get("api_key", "")).strip()
        if not client_id or client_id in seen_client_ids:
            continue
        seen_client_ids.add(client_id)
        normalized_accounts.append(
            {
                "client_id": client_id,
                "name": str(account.get("name") or default_account_name(client_id)).strip(),
                "api_key": api_key,
                "performance": {
                    "client_id": str((account.get("performance") or {}).get("client_id", "")).strip(),
                    "client_secret": str((account.get("performance") or {}).get("client_secret", "")).strip(),
                },
            }
        )
    config["accounts"] = normalized_accounts

    active_client_id = str(config.get("active_client_id", "")).strip()
    if not active_client_id and normalized_accounts:
        active_client_id = normalized_accounts[0]["client_id"]
    if active_client_id and not find_account(config, active_client_id) and normalized_accounts:
        active_client_id = normalized_accounts[0]["client_id"]
    config["active_client_id"] = active_client_id

    if normalized_accounts:
        active = find_account(config, active_client_id) or normalized_accounts[0]
        config["ozon"] = {"client_id": active["client_id"], "api_key": active["api_key"]}
    default_client_id = str(config.get("active_client_id", "")).strip()
    for user in config.get("users", []):
        if not isinstance(user, dict):
            continue
        allowed = user.get("allowed_client_ids")
        if not isinstance(allowed, list):
            user["allowed_client_ids"] = [default_client_id] if default_client_id else []
        else:
            user["allowed_client_ids"] = [str(item).strip() for item in allowed if str(item).strip()]
    return config


def default_account_name(client_id: str) -> str:
    return "Филькина Грамота" if str(client_id).strip() == "3801" else "Ozon аккаунт"


def find_account(config: dict[str, Any], client_id: str | None) -> dict[str, Any] | None:
    target = str(client_id or "").strip()
    for account in config.get("accounts", []):
        if str(account.get("client_id", "")).strip() == target:
            return account
    return None


def active_account(config: dict[str, Any], client_id: str | None = None) -> dict[str, Any] | None:
    return find_account(config, client_id) or find_account(config, str(config.get("active_client_id", "")))


def user_allowed_client_ids(config: dict[str, Any], user: dict[str, str]) -> list[str]:
    if user.get("role") == "owner":
        return [str(account.get("client_id", "")).strip() for account in config.get("accounts", []) if account.get("client_id")]
    stored_user = find_user(config, str(user.get("login", "")))
    allowed = stored_user.get("allowed_client_ids", []) if stored_user else []
    return [str(item).strip() for item in allowed if str(item).strip()]


def user_can_access_client_id(config: dict[str, Any], user: dict[str, str], client_id: str) -> bool:
    return str(client_id).strip() in user_allowed_client_ids(config, user)


def accounts_for_user(config: dict[str, Any], user: dict[str, str]) -> list[dict[str, Any]]:
    allowed = set(user_allowed_client_ids(config, user))
    return [account for account in config.get("accounts", []) if str(account.get("client_id", "")).strip() in allowed]


def public_account(account: dict[str, Any]) -> dict[str, str]:
    api_key = str(account.get("api_key", ""))
    performance = account.get("performance") or {}
    performance_client_id = str(performance.get("client_id", ""))
    performance_client_secret = str(performance.get("client_secret", ""))
    return {
        "client_id": str(account.get("client_id", "")),
        "name": str(account.get("name") or default_account_name(str(account.get("client_id", "")))),
        "api_key_mask": "*" * min(len(api_key), 12) if api_key else "",
        "performance_client_id_mask": mask_secret(performance_client_id),
        "performance_client_secret_mask": mask_secret(performance_client_secret),
    }


def selected_client_id_for_user(user: dict[str, str], config: dict[str, Any]) -> str:
    client_id = str(user.get("client_id", "")).strip()
    if client_id and find_account(config, client_id) and user_can_access_client_id(config, user, client_id):
        return client_id
    allowed = user_allowed_client_ids(config, user)
    return allowed[0] if allowed else str(config.get("active_client_id", "")).strip()


def accounts_payload(config: dict[str, Any], selected_client_id: str, user: dict[str, str] | None = None) -> dict[str, Any]:
    account = active_account(config, selected_client_id)
    accounts = accounts_for_user(config, user) if user else config.get("accounts", [])
    return {
        "accounts": [public_account(item) for item in accounts],
        "active_client_id": selected_client_id,
        "active_account": public_account(account) if account else None,
    }


def mask_secret(value: str, visible_start: int = 4, visible_end: int = 4) -> str:
    if not value:
        return ""
    if visible_start + visible_end <= 0:
        return "*" * len(value)
    if len(value) <= visible_start + visible_end:
        return "*" * len(value)
    return f"{value[:visible_start]}{'*' * (len(value) - visible_start - visible_end)}{value[-visible_end:]}"


def public_user(user: dict[str, Any], client_id: str | None = None) -> dict[str, str]:
    result = {"login": user["login"], "role": user["role"]}
    if client_id:
        result["client_id"] = client_id
    return result


def find_user(config: dict[str, Any], login: str) -> dict[str, Any] | None:
    for user in config.get("users", []):
        if user.get("login") == login:
            return user
    return None


def make_session(login: str, role: str, client_id: str | None = None) -> str:
    payload = {"login": login, "role": role}
    if client_id:
        payload["client_id"] = client_id
    encoded_payload = json.dumps(payload, separators=(",", ":")).encode("utf-8")
    encoded = base64.urlsafe_b64encode(encoded_payload).decode("ascii")
    signature = hmac.new(SESSION_SECRET, encoded.encode("ascii"), hashlib.sha256).hexdigest()
    return f"{encoded}.{signature}"


def read_session(cookie_header: str | None) -> dict[str, str] | None:
    if not cookie_header:
        return None
    cookies = {}
    for part in cookie_header.split(";"):
        if "=" in part:
            key, value = part.strip().split("=", 1)
            cookies[key] = value
    token = cookies.get("ozon_dashboard_session")
    if not token or "." not in token:
        return None
    encoded, signature = token.rsplit(".", 1)
    expected = hmac.new(SESSION_SECRET, encoded.encode("ascii"), hashlib.sha256).hexdigest()
    if not hmac.compare_digest(signature, expected):
        return None
    try:
        payload = base64.urlsafe_b64decode(encoded.encode("ascii"))
        data = json.loads(payload.decode("utf-8"))
        if data.get("role") not in {"owner", "admin", "viewer"}:
            return None
        return {
            "login": str(data.get("login", "")),
            "role": str(data.get("role", "")),
            "client_id": str(data.get("client_id", "")),
        }
    except (ValueError, json.JSONDecodeError):
        return None


class OzonDashboardClient:
    def __init__(self, client_id: str, api_key: str) -> None:
        self.session = requests.Session()
        self.session.headers.update(
            {
                "Client-Id": client_id.strip(),
                "Api-Key": api_key.strip(),
                "Content-Type": "application/json",
            }
        )

    def post(self, path: str, payload: dict[str, Any]) -> dict[str, Any]:
        response = self.session.post(f"{BASE_URL}{path}", json=payload, timeout=30)
        if response.status_code >= 400:
            raise RuntimeError(f"{path}: HTTP {response.status_code}: {response.text}")
        return response.json()

    def finance_transactions(self, date_from: str, date_to: str) -> list[dict[str, Any]]:
        operations: list[dict[str, Any]] = []
        page = 1

        while True:
            data = self.post(
                "/v3/finance/transaction/list",
                {
                    "filter": {
                        "date": {"from": date_from, "to": date_to},
                        "operation_type": [],
                        "posting_number": "",
                        "transaction_type": "all",
                    },
                    "page": page,
                    "page_size": 1000,
                },
            )
            result = data.get("result") or {}
            items = result.get("operations") or []
            operations.extend(items)

            page_count = int(result.get("page_count") or 0)
            if not items or page >= page_count:
                break
            page += 1

        return operations

    def finance_realization_by_day(self, day: date) -> list[dict[str, Any]]:
        data = self.post(
            "/v1/finance/realization/by-day",
            {"year": day.year, "month": day.month, "day": day.day},
        )
        return data.get("rows") or []

    def finance_realization_month(self, year: int, month: int) -> list[dict[str, Any]]:
        data = self.post(
            "/v2/finance/realization",
            {"year": year, "month": month},
        )
        result = data.get("result") or {}
        return result.get("rows") or []

    def fbo_postings(self, date_from: str, date_to: str) -> list[dict[str, Any]]:
        postings: list[dict[str, Any]] = []
        offset = 0
        limit = 1000

        while True:
            data = self.post(
                "/v2/posting/fbo/list",
                {
                    "dir": "ASC",
                    "filter": {
                        "since": date_from,
                        "to": date_to,
                    },
                    "limit": limit,
                    "offset": offset,
                    "translit": False,
                    "with": {"analytics_data": True, "financial_data": True},
                },
            )
            result = data.get("result") or []
            items = result if isinstance(result, list) else result.get("postings", [])
            postings.extend(items)

            if len(items) < limit:
                break
            offset += limit

        return postings

    def fbs_postings(self, date_from: str, date_to: str) -> list[dict[str, Any]]:
        postings: list[dict[str, Any]] = []
        offset = 0
        limit = 1000

        while True:
            data = self.post(
                "/v3/posting/fbs/list",
                {
                    "dir": "ASC",
                    "filter": {
                        "since": date_from,
                        "to": date_to,
                    },
                    "limit": limit,
                    "offset": offset,
                    "with": {
                        "analytics_data": True,
                        "barcodes": False,
                        "financial_data": True,
                        "translit": False,
                    },
                },
            )
            result = data.get("result") or {}
            items = result.get("postings", [])
            postings.extend(items)

            if len(items) < limit:
                break
            offset += limit

        return postings

    def product_list(self, limit: int = 1000) -> list[dict[str, Any]]:
        products: list[dict[str, Any]] = []
        last_id = ""
        while True:
            data = self.post(
                "/v3/product/list",
                {
                    "filter": {"visibility": "ALL"},
                    "last_id": last_id,
                    "limit": limit,
                },
            )
            result = data.get("result") or {}
            items = result.get("items") or []
            products.extend(items)
            last_id = result.get("last_id") or ""
            if not last_id or len(items) < limit:
                break
        return products

    def product_info(self, product_ids: list[int], chunk_size: int = 100) -> list[dict[str, Any]]:
        result: list[dict[str, Any]] = []
        for chunk in chunks(product_ids, chunk_size):
            data = self.post("/v3/product/info/list", {"product_id": chunk})
            result.extend(data.get("items") or data.get("result", {}).get("items", []))
        return result

    def product_prices(self, product_ids: list[int], chunk_size: int = 1000) -> list[dict[str, Any]]:
        result: list[dict[str, Any]] = []
        for chunk in chunks(product_ids, chunk_size):
            data = self.post(
                "/v5/product/info/prices",
                {
                    "filter": {"product_id": chunk, "visibility": "ALL"},
                    "limit": len(chunk),
                },
            )
            result.extend(data.get("items") or data.get("result", {}).get("items", []))
        return result

    def product_stocks(self, product_ids: list[int], chunk_size: int = 1000) -> list[dict[str, Any]]:
        result: list[dict[str, Any]] = []
        for chunk in chunks(product_ids, chunk_size):
            data = self.post(
                "/v4/product/info/stocks",
                {
                    "filter": {"product_id": chunk, "visibility": "ALL"},
                    "limit": len(chunk),
                },
            )
            result.extend(data.get("items") or data.get("result", {}).get("items", []))
        return result

    def product_attributes(self, limit: int = 1000) -> list[dict[str, Any]]:
        attributes: list[dict[str, Any]] = []
        last_id = ""
        while True:
            data = self.post(
                "/v4/product/info/attributes",
                {
                    "filter": {"visibility": "ALL"},
                    "limit": limit,
                    "last_id": last_id,
                },
            )
            items = data.get("result") or []
            attributes.extend(items)
            last_id = data.get("last_id") or ""
            if not last_id or len(items) < limit:
                break
        return attributes

    def description_category_tree(self) -> list[dict[str, Any]]:
        data = self.post("/v1/description-category/tree", {"language": "DEFAULT"})
        return data.get("result", [])


def chunks(values: list[int], size: int) -> list[list[int]]:
    return [values[index : index + size] for index in range(0, len(values), size)]


def month_range(month: str) -> tuple[str, str]:
    first = datetime.strptime(f"{month}-01", "%Y-%m-%d").replace(tzinfo=timezone.utc)
    if first.month == 12:
        next_month = first.replace(year=first.year + 1, month=1)
    else:
        next_month = first.replace(month=first.month + 1)
    last = next_month - timedelta(seconds=1)
    return first.isoformat().replace("+00:00", "Z"), last.isoformat().replace("+00:00", "Z")


def date_range(date_from_value: str, date_to_value: str) -> tuple[str, str, str]:
    if not re.fullmatch(r"\d{4}-\d{2}-\d{2}", date_from_value or ""):
        raise ValueError("Выберите дату начала.")
    if not re.fullmatch(r"\d{4}-\d{2}-\d{2}", date_to_value or ""):
        raise ValueError("Выберите дату окончания.")
    start = datetime.strptime(date_from_value, "%Y-%m-%d").replace(tzinfo=timezone.utc)
    end = datetime.strptime(date_to_value, "%Y-%m-%d").replace(hour=23, minute=59, second=59, tzinfo=timezone.utc)
    if end < start:
        raise ValueError("Дата окончания не может быть раньше даты начала.")
    return (
        start.isoformat().replace("+00:00", "Z"),
        end.isoformat().replace("+00:00", "Z"),
        f"{date_from_value} - {date_to_value}",
    )


def parse_ozon_datetime(value: str) -> datetime:
    return datetime.fromisoformat(value.replace("Z", "+00:00"))


def realization_by_day_allowed(date_from: str, date_to: str) -> bool:
    start = parse_ozon_datetime(date_from).date()
    end = parse_ozon_datetime(date_to).date()
    today = datetime.now(timezone.utc).date()
    earliest = today - timedelta(days=31)
    return earliest <= start <= today and earliest <= end <= today


def full_month_period(date_from: str, date_to: str) -> tuple[int, int] | None:
    start = parse_ozon_datetime(date_from)
    end = parse_ozon_datetime(date_to)
    if start.date().day != 1 or start.time() != datetime.min.time():
        return None
    if start.year != end.year or start.month != end.month:
        return None
    expected_from, expected_to = month_range(f"{start.year:04d}-{start.month:02d}")
    if date_from != expected_from or date_to != expected_to:
        return None
    return start.year, start.month


def fallback_sales_breakdown(finance: dict[str, Any]) -> dict[str, float]:
    return {
        "total": finance["revenue"],
        "sales": finance["revenue"],
        "partner_programs": 0.0,
        "discount_points": 0.0,
    }


def is_premium_plus_required_error(exc: Exception) -> bool:
    message = str(exc).lower()
    return "premium plus" in message or "premium_plus" in message


def is_realization_report_not_found_error(exc: Exception) -> bool:
    message = str(exc).lower()
    return "/v2/finance/realization" in message and "report" in message and "not found" in message


def money(value: Any) -> float:
    try:
        return float(value or 0)
    except (TypeError, ValueError):
        return 0.0


def operation_amount(operation: dict[str, Any]) -> float:
    return money(operation.get("amount"))


def operation_service_total(operation: dict[str, Any]) -> float:
    total = 0.0
    for service in operation.get("services") or []:
        total += money(service.get("price"))
    return total


SERVICE_BREAKDOWN_FIELDS = (
    "service_logistics",
    "service_delivery",
    "service_processing",
    "service_mainline",
    "service_last_mile",
    "service_other",
)


def empty_service_breakdown() -> dict[str, float]:
    return {field: 0.0 for field in SERVICE_BREAKDOWN_FIELDS}


def service_breakdown_key(service: dict[str, Any], operation: dict[str, Any]) -> str:
    service_text = " ".join(
        str(value or "")
        for value in (
            service.get("name"),
            service.get("service_name"),
            service.get("type"),
        )
    ).casefold()
    operation_only_text = " ".join(
        str(value or "")
        for value in (
            operation.get("operation_type_name"),
            operation.get("operation_type"),
            operation.get("type"),
        )
    ).casefold()
    text = f"{service_text} {operation_only_text}".strip()
    compact_text = re.sub(r"[^a-z0-9\u0430-\u044f\u0451]+", "", text)
    compact_service_text = re.sub(r"[^a-z0-9\u0430-\u044f\u0451]+", "", service_text)

    if "directflowlogistic" in compact_service_text:
        return "service_mainline"
    if "returnflowlogistic" in compact_service_text:
        return "service_logistics"
    if "redistributionlastmile" in compact_service_text or "lastmilecourier" in compact_service_text:
        return "service_last_mile"
    if "deliverytohandoverplaceozon" in compact_service_text:
        return "service_delivery"
    if "redistributiondropoffapvz" in compact_service_text or "dropoffpvz" in compact_service_text:
        return "service_processing"
    if "redistributionreturnspvz" in compact_service_text:
        return "service_logistics"
    if "sellerreturnscargoassortment" in compact_service_text:
        return "service_processing"
    if "productmovementfromwarehouse" in compact_service_text:
        return "service_logistics"
    if (
        "itemagentservicestarsmembership" in compact_service_text
        or "redistributionofacquiringoperation" in compact_service_text
        or "temporarystorageredistribution" in compact_service_text
        or "packageredistribution" in compact_service_text
        or "packagematerialsprovision" in compact_service_text
        or "disposaldetailed" in compact_service_text
    ):
        return "service_other"

    if (
        re.search(r"\u043f\u043e\u0441\u043b\u0435\u0434\u043d|\u043c\u0438\u043b|last.{0,5}mile|deliv.{0,12}customer|to.{0,5}customer", service_text)
        or re.search(r"lastmile|delivtocustomer|tocustomer|redistributionlastmile", compact_service_text)
    ):
        return "service_last_mile"
    if (
        re.search(r"\u043c\u0430\u0433\u0438\u0441\u0442\u0440|direct.{0,12}flow|mainline|linehaul|trans", service_text)
        or re.search(r"directflow|mainline|linehaul|trans", compact_service_text)
    ):
        return "service_mainline"
    if re.search(r"\u0441\u043e\u0440\u0442\u0438\u0440|sorting|sortation", service_text):
        return "service_other"
    if (
        re.search(r"\u043e\u0431\u0440\u0430\u0431|\u043f\u0440\u0438\u0435\u043c|\u043f\u0440\u0438\u0451\u043c|\u043e\u0442\u043f\u0440\u0430\u0432|\u0433\u0440\u0443\u0437\u043e\u043c\u0435\u0441\u0442|processing|process|fulfill|drop.{0,5}off|handover|pickup|pick.{0,5}up|pvz|sc|warehouse", service_text)
        or re.search(r"processing|process|fulfill|fulfillment|dropoff|handover|pickup|pvz|warehouse|cargoassortment", compact_service_text)
    ):
        return "service_processing"
    if re.search(r"\u0434\u043e\u0441\u0442\u0430\u0432|delivery|deliver|courier", service_text) or re.search(r"delivery|deliver|courier", compact_service_text):
        return "service_delivery"
    if (
        re.search(r"\u043b\u043e\u0433\u0438\u0441\u0442|\u043f\u0435\u0440\u0435\u0432\u043e\u0437|return.{0,12}flow|flow|logistic|transport", service_text)
        or re.search(r"returnflow|logistic|transport|movement", compact_service_text)
    ):
        return "service_logistics"
    return "service_other"


def operation_service_breakdown(operation: dict[str, Any]) -> dict[str, float]:
    breakdown = empty_service_breakdown()
    for service in operation.get("services") or []:
        if not isinstance(service, dict):
            continue
        breakdown[service_breakdown_key(service, operation)] += abs(money(service.get("price")))
    breakdown_total = sum(breakdown.values())
    service_total = abs(operation_service_total(operation))
    if service_total and breakdown_total < 0.01:
        breakdown["service_other"] += service_total
    return breakdown


def operation_commission_amount(operation: dict[str, Any]) -> float:
    return money(operation.get("sale_commission"))


def operation_commission_cost(operation: dict[str, Any]) -> float:
    return -operation_commission_amount(operation)


def operation_text(operation: dict[str, Any]) -> str:
    values = [
        operation.get("operation_type_name", ""),
        operation.get("operation_type", ""),
        operation.get("type", ""),
    ]
    for service in operation.get("services") or []:
        if not isinstance(service, dict):
            continue
        values.extend(
            [
                service.get("name", ""),
                service.get("service_name", ""),
                service.get("type", ""),
            ]
        )
    return " ".join(str(value).lower() for value in values)


def is_ad_operation(operation: dict[str, Any]) -> bool:
    text = operation_text(operation)
    return bool(
        re.search(
            r"реклам|трафарет|продвиж|брендов|оплата за клик|клик|advert|promotion|marketing|cpc|cpa",
            text,
        )
    )


def is_storage_operation(operation: dict[str, Any]) -> bool:
    operation_type = str(operation.get("operation_type") or "")
    if operation_type == "OperationMarketplaceServiceStorage":
        return True
    text = operation_text(operation)
    return bool(
        re.search(
            "\u043f\u043b\u0430\u0442\u043d.{0,20}\u0445\u0440\u0430\u043d"
            "|\u0443\u0441\u043b\u0443\u0433.{0,30}\u0440\u0430\u0437\u043c\u0435\u0449\u0435\u043d\u0438.{0,30}\u0442\u043e\u0432\u0430\u0440.{0,30}\u0441\u043a\u043b\u0430\u0434"
            "|marketplaceservicestorage|storage",
            text,
        )
    )


def paid_storage_total(operations: list[dict[str, Any]]) -> float:
    total = 0.0
    for operation in operations:
        if is_storage_operation(operation):
            amount = operation_amount(operation)
            total += abs(amount) if amount < 0 else -abs(amount)
    return max(total, 0.0)


def product_fbo_stock(product: dict[str, Any]) -> float:
    return max(money(product.get("fbo")), 0.0)


def storage_weighted_products(products: list[dict[str, Any]]) -> tuple[list[tuple[dict[str, Any], float]], float]:
    weighted = [(product, product_fbo_stock(product)) for product in products]
    weighted = [(product, stock) for product, stock in weighted if stock > 0]
    return weighted, sum(stock for _product, stock in weighted)


def iso_to_date(value: str) -> date:
    return datetime.fromisoformat(value.replace("Z", "+00:00")).date()


def days_between(date_from: str, date_to: str) -> list[date]:
    start = iso_to_date(date_from)
    end = min(iso_to_date(date_to), datetime.now(timezone.utc).date())
    if end < start:
        return []
    return [start + timedelta(days=offset) for offset in range((end - start).days + 1)]


def summarize_sales_breakdown(client: OzonDashboardClient, date_from: str, date_to: str) -> dict[str, float]:
    sales = 0.0
    partner_programs = 0.0
    discount_points = 0.0
    total = 0.0

    def add_commission(row: dict[str, Any], key: str, sign: int) -> None:
        nonlocal sales, partner_programs, discount_points, total
        commission = row.get(key)
        if not isinstance(commission, dict):
            return
        quantity = money(commission.get("quantity")) or 1.0
        seller_price = money(row.get("seller_price_per_instance")) * quantity
        sales += sign * money(commission.get("amount"))
        discount_points += sign * money(commission.get("bonus"))
        partner_programs += sign * (
            money(commission.get("bank_coinvestment"))
            + money(commission.get("pick_up_point_coinvestment"))
            + money(commission.get("stars"))
            + money(commission.get("compensation"))
        )
        total += sign * seller_price

    for day in days_between(date_from, date_to):
        try:
            rows = client.finance_realization_by_day(day)
        except RuntimeError as exc:
            if "Report was not found" in str(exc):
                continue
            raise
        for row in rows:
            add_commission(row, "delivery_commission", 1)
            add_commission(row, "return_commission", -1)

    return {
        "total": round(total, 2),
        "sales": round(sales, 2),
        "partner_programs": round(partner_programs, 2),
        "discount_points": round(discount_points, 2),
    }


def summarize_month_sales_breakdown(client: OzonDashboardClient, year: int, month: int) -> dict[str, float]:
    sales = 0.0
    partner_programs = 0.0
    discount_points = 0.0
    total = 0.0

    def add_commission(row: dict[str, Any], key: str, sign: int) -> None:
        nonlocal sales, partner_programs, discount_points, total
        commission = row.get(key)
        if not isinstance(commission, dict):
            return
        quantity = money(commission.get("quantity")) or 1.0
        seller_price = money(row.get("seller_price_per_instance")) * quantity
        sales += sign * money(commission.get("amount"))
        discount_points += sign * money(commission.get("bonus"))
        partner_programs += sign * (
            money(commission.get("bank_coinvestment"))
            + money(commission.get("pick_up_point_coinvestment"))
            + money(commission.get("stars"))
            + money(commission.get("compensation"))
        )
        total += sign * seller_price

    for row in client.finance_realization_month(year, month):
        add_commission(row, "delivery_commission", 1)
        add_commission(row, "return_commission", -1)

    return {
        "total": round(total, 2),
        "sales": round(sales, 2),
        "partner_programs": round(partner_programs, 2),
        "discount_points": round(discount_points, 2),
    }


def operation_month_key(operation: dict[str, Any], fallback: datetime) -> tuple[int, int]:
    raw = str(operation.get("operation_date") or "").strip()
    if raw:
        for fmt in ("%Y-%m-%d %H:%M:%S", "%Y-%m-%dT%H:%M:%S%z", "%Y-%m-%dT%H:%M:%S"):
            try:
                parsed = datetime.strptime(raw.replace("Z", "+0000"), fmt)
                return parsed.year, parsed.month
            except ValueError:
                continue
    return fallback.year, fallback.month


def build_realization_match_index(
    client: OzonDashboardClient,
    year: int,
    month: int,
) -> dict[tuple[str, float, int], list[dict[str, float]]]:
    index: dict[tuple[str, float, int], list[dict[str, float]]] = {}

    for row in client.finance_realization_month(year, month):
        sku = clean_key((row.get("item") or {}).get("sku"))
        if not sku:
            continue
        seller_price = round(money(row.get("seller_price_per_instance")), 2)

        for key, sign in (("delivery_commission", 1), ("return_commission", -1)):
            commission = row.get(key)
            if not isinstance(commission, dict):
                continue
            quantity = money(commission.get("quantity")) or 1.0
            if quantity <= 0:
                quantity = 1.0
            partner_programs = (
                money(commission.get("bank_coinvestment"))
                + money(commission.get("pick_up_point_coinvestment"))
                + money(commission.get("stars"))
                + money(commission.get("compensation"))
            )
            record = {
                "sales_per_item": money(commission.get("amount")) / quantity,
                "discount_points_per_item": money(commission.get("bonus")) / quantity,
                "partner_programs_per_item": partner_programs / quantity,
                "standard_fee_per_item": money(commission.get("standard_fee")) / quantity,
                "left": max(round(quantity), 1),
            }
            index.setdefault((sku, seller_price, sign), []).append(record)

    return index


def summarize_matched_month_sales_breakdown(
    client: OzonDashboardClient,
    operations: list[dict[str, Any]],
    date_from: str,
) -> dict[str, float]:
    fallback_month = parse_ozon_datetime(date_from)
    indexes: dict[tuple[int, int], dict[tuple[str, float, int], list[dict[str, float]]]] = {}
    sales = 0.0
    partner_programs = 0.0
    discount_points = 0.0
    total = 0.0
    matched_items = 0
    unmatched_items = 0

    def month_index(year: int, month: int) -> dict[tuple[str, float, int], list[dict[str, float]]]:
        key = (year, month)
        if key not in indexes:
            indexes[key] = build_realization_match_index(client, year, month)
        return indexes[key]

    for operation in operations:
        operation_total = money(operation.get("accruals_for_sale"))
        if abs(operation_total) < 0.01:
            continue
        items = operation_items(operation) or [{}]
        item_count = max(len(items), 1)
        sign = 1 if operation_total >= 0 else -1
        item_price = round(abs(operation_total) / item_count, 2)
        item_standard_fee = round(abs(operation_commission_amount(operation)) / item_count, 2)
        year, month = operation_month_key(operation, fallback_month)
        index = month_index(year, month)

        for item in items:
            sku = clean_key(item.get("sku"))
            candidates = [record for record in index.get((sku, item_price, sign), []) if record["left"] > 0]
            matching_fee = [
                record
                for record in candidates
                if abs(record["standard_fee_per_item"] - item_standard_fee) < 0.011
            ]
            if matching_fee:
                candidates = matching_fee

            if not candidates:
                unmatched_items += 1
                fallback_part = operation_total / item_count
                sales += fallback_part
                total += fallback_part
                continue

            record = candidates[0]
            record["left"] -= 1
            matched_items += 1
            sales += sign * record["sales_per_item"]
            partner_programs += sign * record["partner_programs_per_item"]
            discount_points += sign * record["discount_points_per_item"]
            total += sign * item_price

    return {
        "total": round(total, 2),
        "sales": round(sales, 2),
        "partner_programs": round(partner_programs, 2),
        "discount_points": round(discount_points, 2),
        "matched_items": matched_items,
        "unmatched_items": unmatched_items,
        "source": "month_realization_match",
    }


GENERAL_COST_TITLES = {
    "OperationMarketplaceSupplyAdditional": "Обработка грузоместа FBO",
    "MarketplaceServiceItemCrossdocking": "Кросс-докинг",
    "OperationMarketplaceItemAdditionalPackagingAtWarehouse": "Доп. упаковка на складе",
    "MarketplaceRedistributionOfAcquiringOperation": "Корректировка эквайринга",
}


OPERATION_TITLES = {
    **GENERAL_COST_TITLES,
    "MarketplaceRedistributionOfAcquiringOperation": "Эквайринг",
    "MarketplaceServiceItemDirectFlowLogistic": "Магистральная логистика",
    "MarketplaceServiceItemRedistributionLastMileCourier": "Последняя миля курьером",
    "MarketplaceServiceItemRedistributionDropOffApvz": "Прием отправления в ПВЗ",
    "MarketplaceServiceItemDropoffPVZ": "Обработка отправления в ПВЗ",
    "MarketplaceServiceItemDeliveryToHandoverPlaceOzon": "Доставка до места передачи Ozon",
    "MarketplaceServiceItemRedistributionReturnsPVZ": "Возврат через ПВЗ",
    "MarketplaceServiceItemReturnFlowLogistic": "Обратная логистика",
    "MarketplaceServiceSellerReturnsCargoAssortment": "Обработка возвратного грузоместа",
    "MarketplaceServiceProductMovementFromWarehouse": "Перемещение товара со склада",
    "MarketplaceServiceItemDisposalDetailed": "Утилизация товара",
    "MarketplaceServiceItemPackageMaterialsProvision": "Предоставление упаковочных материалов",
    "MarketplaceServiceItemPackageRedistribution": "Упаковка товара партнерами",
    "OperationMarketplaceCostPerClick": "Оплата за клик",
    "OperationMarketplacePackageMaterialsProvision": "Предоставление упаковочных материалов",
    "OperationMarketplacePackageRedistribution": "Упаковка товара партнерами",
    "OperationMarketplaceServiceStorage": "Услуга размещения товаров на складе",
    "OperationAgentDeliveredToCustomer": "Доставка покупателю",
    "OperationItemReturn": "Возврат товара",
    "OperationReturnGoodsFBSofRMS": "Возврат FBS",
    "OperationSellerReturnsCargoAssortmentValid": "Возвратное грузоместо",
    "SellerReturnsDeliveryToPickupPoint": "Доставка возврата до ПВЗ",
    "DisposalAutomaticForCancellationAndReturns": "Утилизация после отмены или возврата",
}


def readable_operation_title(value: Any) -> str:
    raw = str(value or "").strip()
    return OPERATION_TITLES.get(raw, raw)


def summarize_general_extra_costs(operations: list[dict[str, Any]]) -> dict[str, Any]:
    rows: dict[str, dict[str, Any]] = {}

    for operation in operations:
        amount = operation_amount(operation)
        operation_type = str(operation.get("operation_type") or "")
        operation_name = str(operation.get("operation_type_name") or operation_type or operation.get("type") or "Расход")
        service_total = abs(operation_service_total(operation))
        formula_amount = (
            money(operation.get("accruals_for_sale"))
            - operation_commission_cost(operation)
            - service_total
            - (abs(amount) if is_ad_operation(operation) else 0.0)
            - (abs(amount) if is_storage_operation(operation) else 0.0)
        )
        missing_amount = formula_amount - amount
        if abs(missing_amount) < 0.01:
            continue

        title = GENERAL_COST_TITLES.get(operation_type, operation_name)
        row = rows.setdefault(
            title,
            {
                "name": title,
                "operation_type": operation_type,
                "amount": 0.0,
            },
        )
        row["amount"] += missing_amount

    items = sorted(rows.values(), key=lambda item: abs(item["amount"]), reverse=True)
    for item in items:
        item["amount"] = round(item["amount"], 2)

    return {
        "items": items,
        "total": round(sum(item["amount"] for item in items), 2),
    }


def operation_service_name(service: dict[str, Any], fallback: str) -> str:
    for key in ("name", "service_name", "type"):
        value = str(service.get(key) or "").strip()
        if value:
            return readable_operation_title(value)
    return fallback


def operation_display_name(operation: dict[str, Any]) -> str:
    raw = str(
        operation.get("operation_type_name")
        or operation.get("operation_type")
        or operation.get("type")
        or "Операция"
    ).strip()
    return readable_operation_title(raw)


def is_return_operation(operation: dict[str, Any]) -> bool:
    text = operation_text(operation)
    operation_type = str(operation.get("operation_type") or "").casefold()
    return bool(re.search(r"\u0432\u043e\u0437\u0432\u0440\u0430\u0442|return|storno", text)) or "return" in operation_type


def is_sale_operation(operation: dict[str, Any]) -> bool:
    text = operation_text(operation)
    operation_type = str(operation.get("operation_type") or "").casefold()
    has_sale_accrual = abs(money(operation.get("accruals_for_sale"))) >= 0.01
    return (
        has_sale_accrual
        or "deliveredtocustomer" in operation_type
        or bool(re.search(r"\u043f\u0440\u043e\u0434\u0430\u0436|\u0434\u043e\u0441\u0442\u0430\u0432\u043a.{0,20}\u043f\u043e\u043a\u0443\u043f\u0430\u0442\u0435\u043b", text))
    )


def operation_group_name(name: str, operation: dict[str, Any]) -> str:
    text = f"{name} {operation_text(operation)}".casefold()
    if re.search(r"\u0445\u0440\u0430\u043d|\u0440\u0430\u0437\u043c\u0435\u0449\u0435\u043d", text):
        return "Платное хранение"
    if is_ad_operation(operation) or re.search(r"\u0440\u0435\u043a\u043b\u0430\u043c|\u043f\u0440\u043e\u0434\u0432\u0438\u0436|\u0442\u0440\u0430\u0444\u0430\u0440\u0435\u0442|\u043a\u043b\u0438\u043a|advert|promotion|marketing|cpc|cpa", text):
        return "Продвижение и реклама"
    if re.search(r"fbo|\u0441\u043a\u043b\u0430\u0434|\u0431\u0440\u043e\u043d\u0438\u0440|\u043f\u043e\u0441\u0442\u0430\u0432\u043a|\u0433\u0440\u0443\u0437\u043e\u043c\u0435\u0441\u0442", text):
        return "Услуги FBO"
    if re.search(r"\u0434\u043e\u0441\u0442\u0430\u0432|\u043b\u043e\u0433\u0438\u0441\u0442|\u043c\u0430\u0433\u0438\u0441\u0442\u0440|\u0441\u043e\u0440\u0442\u0438\u0440|\u043f\u0435\u0440\u0435\u0432\u043e\u0437|\u043a\u0440\u043e\u0441\u0441|crossdock|flex|fbs|logistic|delivery", text):
        return "Услуги доставки"
    if re.search(r"\u044d\u043a\u0432\u0430\u0439\u0440|acquir|\u0443\u043f\u0430\u043a\u043e\u0432|\u0437\u0432\u0435\u0437\u0434|\u043f\u0430\u0440\u0442\u043d\u0435\u0440|\u043c\u0435\u0436\u0434\u0443\u043d\u0430\u0440\u043e\u0434", text):
        return "Услуги партнера"
    if re.search(r"\u0448\u0442\u0440\u0430\u0444|penalt", text):
        return "Штрафы"
    if re.search(r"\u0434\u0435\u043a\u043e\u043c\u043f\u0435\u043d\u0441|decompens", text):
        return "Декомпенсации"
    if re.search(r"\u043a\u043e\u043c\u043f\u0435\u043d\u0441|compens", text):
        return "Компенсации"
    return "Прочие начисления"


def add_operation_summary_row(
    groups: dict[str, dict[str, Any]],
    group_name: str,
    item_name: str,
    amount: float,
) -> None:
    if abs(amount) < 0.01:
        return
    group = groups.setdefault(
        group_name,
        {
            "name": group_name,
            "amount": 0.0,
            "count": 0.0,
            "items": {},
        },
    )
    item_key = item_name.strip() or group_name
    item = group["items"].setdefault(
        item_key,
        {
            "name": item_key,
            "amount": 0.0,
            "count": 0.0,
        },
    )
    item["amount"] += amount
    item["count"] += 1
    group["amount"] += amount
    group["count"] += 1


def summarize_all_operations(operations: list[dict[str, Any]]) -> list[dict[str, Any]]:
    groups: dict[str, dict[str, Any]] = {}

    for operation in operations:
        operation_name = operation_display_name(operation)
        sale_commission = operation_commission_amount(operation)
        if abs(sale_commission) >= 0.01:
            add_operation_summary_row(groups, "Комиссии", "Вознаграждение Ozon", sale_commission)

        if is_return_operation(operation):
            continue

        services = [service for service in (operation.get("services") or []) if isinstance(service, dict)]
        for service in services:
            service_name = operation_service_name(service, operation_name)
            add_operation_summary_row(
                groups,
                operation_group_name(service_name, operation),
                service_name,
                money(service.get("price")),
            )

        if services or abs(sale_commission) >= 0.01 or is_sale_operation(operation):
            continue

        amount = operation_amount(operation)
        add_operation_summary_row(groups, operation_group_name(operation_name, operation), operation_name, amount)

    result: list[dict[str, Any]] = []
    for group in groups.values():
        children = sorted(group["items"].values(), key=lambda item: abs(item["amount"]), reverse=True)
        result.append(
            {
                "name": group["name"],
                "amount": round(group["amount"], 2),
                "count": round(group["count"], 1),
                "items": [
                    {
                        "name": item["name"],
                        "amount": round(item["amount"], 2),
                        "count": round(item["count"], 1),
                    }
                    for item in children
                ],
            }
        )

    return sorted(result, key=lambda item: abs(item["amount"]), reverse=True)


def summarize_finance(operations: list[dict[str, Any]]) -> dict[str, Any]:
    accruals = 0.0
    commissions = 0.0
    services = 0.0
    expenses = 0.0
    ad_expenses = 0.0
    returns = 0.0
    by_type: dict[str, float] = {}

    for operation in operations:
        amount = operation_amount(operation)
        operation_type = operation.get("operation_type_name") or operation.get("operation_type") or "Без типа"
        by_type[operation_type] = by_type.get(operation_type, 0.0) + amount

        accruals += money(operation.get("accruals_for_sale"))
        commissions += operation_commission_cost(operation)
        services += abs(operation_service_total(operation))

        if amount < 0:
            expenses += abs(amount)
        if is_ad_operation(operation):
            ad_expenses += abs(amount)
        if "возврат" in operation_text(operation) or "return" in operation_text(operation):
            returns += abs(amount)

    return {
        "operations_count": len(operations),
        "revenue": round(accruals, 2),
        "commission": round(commissions, 2),
        "services": round(services, 2),
        "expenses": round(expenses, 2),
        "ad_expenses": round(ad_expenses, 2),
        "returns": round(returns, 2),
        "paid_storage": round(paid_storage_total(operations), 2),
        "extra_costs": summarize_general_extra_costs(operations),
        "profit_before_cost": round(sum(operation_amount(op) for op in operations), 2),
        "all_operations": summarize_all_operations(operations),
        "by_type": sorted(
            [{"name": key, "amount": round(value, 2)} for key, value in by_type.items()],
            key=lambda item: abs(item["amount"]),
            reverse=True,
        )[:12],
    }


def clean_key(value: Any) -> str:
    return str(value or "").strip()


def product_category_indexes(products: list[dict[str, Any]]) -> tuple[dict[str, dict[str, str]], dict[str, dict[str, str]], dict[str, dict[str, str]]]:
    by_sku: dict[str, dict[str, str]] = {}
    by_offer_id: dict[str, dict[str, str]] = {}
    by_product_id: dict[str, dict[str, str]] = {}

    for product in products:
        category = clean_key(product.get("category")) or "Без категории"
        info = {
            "category": category,
            "type": clean_key(product.get("type")),
            "offer_id": clean_key(product.get("offer_id")),
            "sku": clean_key(product.get("sku")),
            "product_id": clean_key(product.get("product_id")),
            "name": clean_key(product.get("name")),
            "cost_price": clean_key(product.get("cost_price")),
            "quantity": "",
        }
        sku = clean_key(product.get("sku"))
        offer_id = clean_key(product.get("offer_id"))
        product_id = clean_key(product.get("product_id"))
        if sku:
            by_sku[sku] = info
        if offer_id:
            by_offer_id[offer_id] = info
        if product_id:
            by_product_id[product_id] = info

    return by_sku, by_offer_id, by_product_id


def product_item_key(product: dict[str, Any]) -> str:
    return (
        clean_key(product.get("sku"))
        or clean_key(product.get("offer_id"))
        or clean_key(product.get("product_id"))
        or clean_key(product.get("name"))
    )


def operation_items(operation: dict[str, Any]) -> list[dict[str, Any]]:
    items = operation.get("items")
    if isinstance(items, list) and items:
        return [item for item in items if isinstance(item, dict)]

    item = operation.get("item")
    if isinstance(item, dict):
        return [item]

    posting = operation.get("posting")
    if isinstance(posting, dict):
        for key in ("products", "items"):
            posting_items = posting.get(key)
            if isinstance(posting_items, list) and posting_items:
                return [item for item in posting_items if isinstance(item, dict)]

    if any(operation.get(key) for key in ("sku", "offer_id", "product_id")):
        return [operation]

    return []


def operation_item_category(
    item: dict[str, Any],
    by_sku: dict[str, dict[str, str]],
    by_offer_id: dict[str, dict[str, str]],
    by_product_id: dict[str, dict[str, str]],
) -> tuple[dict[str, str], str]:
    sku = clean_key(item.get("sku"))
    offer_id = clean_key(item.get("offer_id"))
    product_id = clean_key(item.get("product_id"))

    info = by_sku.get(sku) or by_offer_id.get(offer_id) or by_product_id.get(product_id)
    if info:
        item_info = dict(info)
        item_info["quantity"] = clean_key(item.get("quantity") or item.get("qty") or item.get("items_count"))
        return item_info, sku or offer_id or product_id

    category = clean_key(item.get("category")) or clean_key(item.get("category_name")) or "Без категории"
    return {
        "category": category,
        "type": clean_key(item.get("type") or item.get("type_name")),
        "offer_id": offer_id,
        "sku": sku,
        "product_id": product_id,
        "name": clean_key(item.get("name") or item.get("product_name")),
        "cost_price": clean_key(item.get("cost_price")),
        "quantity": clean_key(item.get("quantity") or item.get("qty") or item.get("items_count")),
    }, sku or offer_id or product_id



def parse_cost_price(value: Any) -> float:
    text = str(value or "").strip().replace("\u00a0", " ").replace(" ", "").replace(",", ".")
    if not text:
        return 0.0
    try:
        return max(float(text), 0.0)
    except ValueError:
        cleaned = re.sub(r"[^0-9.]", "", text)
        if not cleaned:
            return 0.0
        try:
            return max(float(cleaned), 0.0)
        except ValueError:
            return 0.0


def operation_item_buyout_cost(operation: dict[str, Any], item_info: dict[str, str]) -> float:
    if not is_sale_operation(operation) or is_return_operation(operation):
        return 0.0
    quantity = abs(money(item_info.get("quantity"))) or 1.0
    return parse_cost_price(item_info.get("cost_price")) * quantity


def summarize_finance_by_category(operations: list[dict[str, Any]], products: list[dict[str, Any]]) -> list[dict[str, Any]]:
    by_sku, by_offer_id, by_product_id = product_category_indexes(products)
    rows: dict[str, dict[str, Any]] = {}

    def get_category_row(category_name: str) -> dict[str, Any]:
        return rows.setdefault(
            category_name,
            {
                "category": category_name,
                "types": set(),
                "items": set(),
                "operations_count": 0.0,
                "revenue": 0.0,
                "commission": 0.0,
                "services": 0.0,
                **empty_service_breakdown(),
                "expenses": 0.0,
                "returns": 0.0,
                "paid_storage": 0.0,
                "profit_before_cost": 0.0,
                "buyout_cost": 0.0,
                "net_profit": 0.0,
            },
        )

    for operation in operations:
        items = operation_items(operation)
        categories: list[tuple[dict[str, str], str]] = [
            operation_item_category(item, by_sku, by_offer_id, by_product_id) for item in items
        ]
        if not categories:
            continue

        weight = 1 / max(len(categories), 1)
        amount = operation_amount(operation) * weight
        revenue = money(operation.get("accruals_for_sale")) * weight
        commission = operation_commission_cost(operation) * weight
        services = abs(operation_service_total(operation)) * weight
        service_breakdown = operation_service_breakdown(operation)
        expenses = abs(operation_amount(operation)) * weight if operation_amount(operation) < 0 else 0.0
        returns = abs(operation_amount(operation)) * weight if "возврат" in operation_text(operation) or "return" in operation_text(operation) else 0.0
        paid_storage = 0.0

        for category_info, item_key in categories:
            buyout_cost = operation_item_buyout_cost(operation, category_info)
            category_name = category_info["category"] or "Без категории"
            row = get_category_row(category_name)
            if category_info.get("type"):
                row["types"].add(category_info["type"])
            if item_key:
                row["items"].add(item_key)
            row["operations_count"] += weight
            row["revenue"] += revenue
            row["commission"] += commission
            row["services"] += services
            for service_field, service_amount in service_breakdown.items():
                row[service_field] += service_amount * weight
            row["expenses"] += expenses
            row["returns"] += returns
            row["paid_storage"] += paid_storage
            row["profit_before_cost"] += amount
            row["buyout_cost"] += buyout_cost
            row["net_profit"] += amount - buyout_cost

    storage_total = paid_storage_total(operations)
    weighted_products, total_fbo_stock = storage_weighted_products(products)
    if storage_total and total_fbo_stock:
        for product, fbo_stock in weighted_products:
            storage_amount = storage_total * fbo_stock / total_fbo_stock
            category_name = clean_key(product.get("category")) or "Без категории"
            item_key = product_item_key(product)
            row = get_category_row(category_name)
            product_type = clean_key(product.get("type"))
            if product_type:
                row["types"].add(product_type)
            if item_key:
                row["items"].add(item_key)
            row["paid_storage"] += storage_amount
            row["profit_before_cost"] -= storage_amount
            row["net_profit"] -= storage_amount

    for product in products:
        category_name = clean_key(product.get("category")) or "Без категории"
        row = get_category_row(category_name)
        product_type = clean_key(product.get("type"))
        if product_type:
            row["types"].add(product_type)
        item_key = product_item_key(product)
        if item_key:
            row["items"].add(item_key)

    result = []
    for row in rows.values():
        result.append(
            {
                "category": row["category"],
                "types_count": len(row["types"]),
                "items_count": len(row["items"]),
                "operations_count": round(row["operations_count"], 1),
                "revenue": round(row["revenue"], 2),
                "commission": round(row["commission"], 2),
                "services": round(row["services"], 2),
                **{field: round(row[field], 2) for field in SERVICE_BREAKDOWN_FIELDS},
                "expenses": round(row["expenses"], 2),
                "returns": round(row["returns"], 2),
                "paid_storage": round(row["paid_storage"], 2),
                "profit_before_cost": round(row["profit_before_cost"], 2),
                "buyout_cost": round(row["buyout_cost"], 2),
                "net_profit": round(row["net_profit"], 2),
            }
        )

    return sorted(result, key=lambda item: abs(item["profit_before_cost"]), reverse=True)


def summarize_finance_by_type(operations: list[dict[str, Any]], products: list[dict[str, Any]]) -> list[dict[str, Any]]:
    by_sku, by_offer_id, by_product_id = product_category_indexes(products)
    rows: dict[str, dict[str, Any]] = {}

    def get_type_row(type_name: str) -> dict[str, Any]:
        return rows.setdefault(
            type_name,
            {
                "type": type_name,
                "categories": set(),
                "items": set(),
                "operations_count": 0.0,
                "revenue": 0.0,
                "commission": 0.0,
                "services": 0.0,
                **empty_service_breakdown(),
                "expenses": 0.0,
                "returns": 0.0,
                "paid_storage": 0.0,
                "profit_before_cost": 0.0,
                "buyout_cost": 0.0,
                "net_profit": 0.0,
            },
        )

    for operation in operations:
        items = operation_items(operation)
        product_types: list[tuple[dict[str, str], str]] = [
            operation_item_category(item, by_sku, by_offer_id, by_product_id) for item in items
        ]
        if not product_types:
            continue

        weight = 1 / max(len(product_types), 1)
        amount = operation_amount(operation) * weight
        revenue = money(operation.get("accruals_for_sale")) * weight
        commission = operation_commission_cost(operation) * weight
        services = abs(operation_service_total(operation)) * weight
        service_breakdown = operation_service_breakdown(operation)
        expenses = abs(operation_amount(operation)) * weight if operation_amount(operation) < 0 else 0.0
        returns = abs(operation_amount(operation)) * weight if "возврат" in operation_text(operation) or "return" in operation_text(operation) else 0.0
        paid_storage = 0.0

        for type_info, item_key in product_types:
            buyout_cost = operation_item_buyout_cost(operation, type_info)
            type_name = type_info.get("type") or "Без типа"
            row = get_type_row(type_name)
            if type_info.get("category"):
                row["categories"].add(type_info["category"])
            if item_key:
                row["items"].add(item_key)
            row["operations_count"] += weight
            row["revenue"] += revenue
            row["commission"] += commission
            row["services"] += services
            for service_field, service_amount in service_breakdown.items():
                row[service_field] += service_amount * weight
            row["expenses"] += expenses
            row["returns"] += returns
            row["paid_storage"] += paid_storage
            row["profit_before_cost"] += amount
            row["buyout_cost"] += buyout_cost
            row["net_profit"] += amount - buyout_cost

    storage_total = paid_storage_total(operations)
    weighted_products, total_fbo_stock = storage_weighted_products(products)
    if storage_total and total_fbo_stock:
        for product, fbo_stock in weighted_products:
            storage_amount = storage_total * fbo_stock / total_fbo_stock
            type_name = clean_key(product.get("type")) or "Без типа"
            item_key = product_item_key(product)
            row = get_type_row(type_name)
            category_name = clean_key(product.get("category"))
            if category_name:
                row["categories"].add(category_name)
            if item_key:
                row["items"].add(item_key)
            row["paid_storage"] += storage_amount
            row["profit_before_cost"] -= storage_amount
            row["net_profit"] -= storage_amount

    for product in products:
        type_name = clean_key(product.get("type")) or "Без типа"
        row = get_type_row(type_name)
        category_name = clean_key(product.get("category"))
        if category_name:
            row["categories"].add(category_name)
        item_key = product_item_key(product)
        if item_key:
            row["items"].add(item_key)

    result = []
    for row in rows.values():
        result.append(
            {
                "type": row["type"],
                "categories_count": len(row["categories"]),
                "items_count": len(row["items"]),
                "operations_count": round(row["operations_count"], 1),
                "revenue": round(row["revenue"], 2),
                "commission": round(row["commission"], 2),
                "services": round(row["services"], 2),
                **{field: round(row[field], 2) for field in SERVICE_BREAKDOWN_FIELDS},
                "expenses": round(row["expenses"], 2),
                "returns": round(row["returns"], 2),
                "paid_storage": round(row["paid_storage"], 2),
                "profit_before_cost": round(row["profit_before_cost"], 2),
                "buyout_cost": round(row["buyout_cost"], 2),
                "net_profit": round(row["net_profit"], 2),
            }
        )

    return sorted(result, key=lambda item: abs(item["profit_before_cost"]), reverse=True)


def summarize_finance_by_article(operations: list[dict[str, Any]], products: list[dict[str, Any]]) -> list[dict[str, Any]]:
    by_sku, by_offer_id, by_product_id = product_category_indexes(products)
    rows: dict[str, dict[str, Any]] = {}

    for operation in operations:
        items = operation_items(operation)
        article_items: list[tuple[dict[str, str], str]] = [
            operation_item_category(item, by_sku, by_offer_id, by_product_id) for item in items
        ]
        if not article_items:
            continue

        weight = 1 / max(len(article_items), 1)
        amount = operation_amount(operation) * weight
        revenue = money(operation.get("accruals_for_sale")) * weight
        commission = operation_commission_cost(operation) * weight
        services = abs(operation_service_total(operation)) * weight
        service_breakdown = operation_service_breakdown(operation)
        expenses = abs(operation_amount(operation)) * weight if operation_amount(operation) < 0 else 0.0
        returns = abs(operation_amount(operation)) * weight if "возврат" in operation_text(operation) or "return" in operation_text(operation) else 0.0
        paid_storage = 0.0

        for article_info, item_key in article_items:
            buyout_cost = operation_item_buyout_cost(operation, article_info)
            article = article_info.get("offer_id") or article_info.get("sku") or item_key
            if not article:
                continue

            row = rows.setdefault(
                article,
                {
                    "article": article,
                    "sku": article_info.get("sku", ""),
                    "name": article_info.get("name", ""),
                    "category": article_info.get("category", ""),
                    "type": article_info.get("type", ""),
                    "items": set(),
                    "operations_count": 0.0,
                    "revenue": 0.0,
                    "commission": 0.0,
                    "services": 0.0,
                    **empty_service_breakdown(),
                    "expenses": 0.0,
                    "returns": 0.0,
                    "paid_storage": 0.0,
                    "profit_before_cost": 0.0,
                    "buyout_cost": 0.0,
                    "net_profit": 0.0,
                },
            )
            row["sku"] = row["sku"] or article_info.get("sku", "")
            row["name"] = row["name"] or article_info.get("name", "")
            row["category"] = row["category"] or article_info.get("category", "")
            row["type"] = row["type"] or article_info.get("type", "")
            row["items"].add(item_key or article)
            row["operations_count"] += weight
            row["revenue"] += revenue
            row["commission"] += commission
            row["services"] += services
            for service_field, service_amount in service_breakdown.items():
                row[service_field] += service_amount * weight
            row["expenses"] += expenses
            row["returns"] += returns
            row["paid_storage"] += paid_storage
            row["profit_before_cost"] += amount
            row["buyout_cost"] += buyout_cost
            row["net_profit"] += amount - buyout_cost

    storage_total = paid_storage_total(operations)
    weighted_products, total_fbo_stock = storage_weighted_products(products)
    if storage_total and total_fbo_stock:
        for product, fbo_stock in weighted_products:
            storage_amount = storage_total * fbo_stock / total_fbo_stock
            article = clean_key(product.get("offer_id")) or clean_key(product.get("sku")) or clean_key(product.get("product_id"))
            if not article:
                continue
            item_key = clean_key(product.get("sku")) or article
            row = rows.setdefault(
                article,
                {
                    "article": article,
                    "sku": clean_key(product.get("sku")),
                    "name": clean_key(product.get("name")),
                    "category": clean_key(product.get("category")),
                    "type": clean_key(product.get("type")),
                    "items": set(),
                    "operations_count": 0.0,
                    "revenue": 0.0,
                    "commission": 0.0,
                    "services": 0.0,
                    **empty_service_breakdown(),
                    "expenses": 0.0,
                    "returns": 0.0,
                    "paid_storage": 0.0,
                    "profit_before_cost": 0.0,
                    "buyout_cost": 0.0,
                    "net_profit": 0.0,
                },
            )
            row["sku"] = row["sku"] or clean_key(product.get("sku"))
            row["name"] = row["name"] or clean_key(product.get("name"))
            row["category"] = row["category"] or clean_key(product.get("category"))
            row["type"] = row["type"] or clean_key(product.get("type"))
            row["items"].add(item_key)
            row["paid_storage"] += storage_amount
            row["profit_before_cost"] -= storage_amount
            row["net_profit"] -= storage_amount

    result = []
    for row in rows.values():
        result.append(
            {
                "article": row["article"],
                "sku": row["sku"],
                "name": row["name"],
                "category": row["category"] or "Без категории",
                "type": row["type"] or "Без типа",
                "items_count": len(row["items"]),
                "operations_count": round(row["operations_count"], 1),
                "revenue": round(row["revenue"], 2),
                "commission": round(row["commission"], 2),
                "services": round(row["services"], 2),
                **{field: round(row[field], 2) for field in SERVICE_BREAKDOWN_FIELDS},
                "expenses": round(row["expenses"], 2),
                "returns": round(row["returns"], 2),
                "paid_storage": round(row["paid_storage"], 2),
                "profit_before_cost": round(row["profit_before_cost"], 2),
                "buyout_cost": round(row["buyout_cost"], 2),
                "net_profit": round(row["net_profit"], 2),
            }
        )

    return sorted(result, key=lambda item: abs(item["profit_before_cost"]), reverse=True)


def posting_products(posting: dict[str, Any]) -> list[dict[str, Any]]:
    products = posting.get("products") or []
    if products:
        return products
    financial = posting.get("financial_data") or {}
    return financial.get("products") or []


def posting_status_count(postings: list[dict[str, Any]], pattern: str) -> int:
    return sum(1 for posting in postings if re.search(pattern, str(posting.get("status") or ""), re.IGNORECASE))


def return_posting_counts_by_schema(operations: list[dict[str, Any]]) -> dict[str, int]:
    seen: dict[str, set[str]] = {"FBO": set(), "FBS": set()}
    fallback = 0

    for operation in operations:
        if not is_return_operation(operation):
            continue
        posting = operation.get("posting") or {}
        schema = str(posting.get("delivery_schema") or "").upper()
        if schema not in seen:
            continue
        posting_number = str(posting.get("posting_number") or "").strip()
        if not posting_number:
            fallback += 1
            posting_number = f"fallback-{schema}-{fallback}"
        seen[schema].add(posting_number)

    return {schema: len(values) for schema, values in seen.items()}


def summarize_postings(fbo: list[dict[str, Any]], fbs: list[dict[str, Any]], operations: list[dict[str, Any]] | None = None) -> dict[str, Any]:
    status_counts: dict[str, int] = {}
    ordered_units = 0
    ordered_sum = 0.0
    return_counts = return_posting_counts_by_schema(operations or [])

    for posting in fbo + fbs:
        status = posting.get("status") or "unknown"
        status_counts[status] = status_counts.get(status, 0) + 1
        for product in posting_products(posting):
            qty = int(product.get("quantity") or 1)
            ordered_units += qty
            ordered_sum += money(product.get("price")) * qty

    return {
        "orders_count": len(fbo) + len(fbs),
        "fbo_orders": len(fbo),
        "fbs_orders": len(fbs),
        "fbo_ordered": len(fbo),
        "fbo_delivered": posting_status_count(fbo, r"delivered"),
        "fbo_returns": return_counts.get("FBO", 0),
        "fbo_cancelled": posting_status_count(fbo, r"cancel"),
        "fbs_ordered": len(fbs),
        "fbs_delivered": posting_status_count(fbs, r"delivered"),
        "fbs_returns": return_counts.get("FBS", 0),
        "fbs_cancelled": posting_status_count(fbs, r"cancel"),
        "ordered_units": ordered_units,
        "ordered_sum": round(ordered_sum, 2),
        "status_counts": [
            {"name": order_status_title(key), "code": key, "count": value}
            for key, value in sorted(status_counts.items(), key=lambda item: item[1], reverse=True)
        ],
    }


ORDER_STATUS_TITLES = {
    "delivered": "Доставлено",
    "delivering": "Доставляется",
    "cancelled": "Отменено",
    "awaiting_deliver": "Ожидает отгрузки",
    "awaiting_packaging": "Ожидает сборки",
    "posting_created": "Создано",
    "acceptance_in_progress": "Приемка",
    "arbitration": "Арбитраж",
    "client_arbitration": "Арбитраж клиента",
    "driver_pickup": "Передано водителю",
    "not_accepted": "Не принято",
    "sent_by_seller": "Отправлено продавцом",
    "unknown": "Неизвестно",
}


def order_status_title(status: str) -> str:
    normalized = str(status or "unknown").strip()
    return ORDER_STATUS_TITLES.get(normalized, normalized.replace("_", " "))


def by_product_id(items: list[dict[str, Any]]) -> dict[int, dict[str, Any]]:
    result = {}
    for item in items:
        product_id = item.get("product_id") or item.get("id")
        if product_id is not None:
            result[int(product_id)] = item
    return result


def attribute_value(item: dict[str, Any], attribute_id: int) -> str:
    for attribute in item.get("attributes") or []:
        if attribute.get("id") != attribute_id:
            continue
        values = attribute.get("values") or []
        return ", ".join(str(value.get("value", "")) for value in values if value.get("value"))
    return ""


def stock_totals(item: dict[str, Any]) -> dict[str, int]:
    totals = {"fbo": 0, "fbs": 0}
    for stock in item.get("stocks") or []:
        stock_type = str(stock.get("type") or stock.get("source") or "").lower()
        present = int(stock.get("present") or 0)
        if stock_type == "fbo":
            totals["fbo"] += present
        elif stock_type == "fbs":
            totals["fbs"] += present
    return totals


def first_sku(item: dict[str, Any]) -> str:
    sku = item.get("sku")
    if sku is not None:
        return str(sku)
    sources = item.get("sources") or []
    if sources and sources[0].get("sku") is not None:
        return str(sources[0]["sku"])
    return ""


def price_value(item: dict[str, Any], key: str) -> Any:
    price = item.get("price") or {}
    return price.get(key, "")


def flatten_category_tree(tree: list[dict[str, Any]]) -> dict[tuple[int, int], dict[str, str]]:
    result: dict[tuple[int, int], dict[str, str]] = {}

    def walk(node: dict[str, Any], category_id: int | None = None, category_name: str = "") -> None:
        current_category_id = node.get("description_category_id", category_id)
        current_category_name = node.get("category_name", category_name)
        type_id = node.get("type_id")
        if current_category_id is not None and type_id is not None:
            result[(int(current_category_id), int(type_id))] = {
                "category": current_category_name,
                "type": node.get("type_name", ""),
            }
        for child in node.get("children") or []:
            walk(child, current_category_id, current_category_name)

    for item in tree:
        walk(item)
    return result


def get_ozon_credentials(client_id: str | None = None) -> tuple[str, str, str]:
    config = load_config()
    account = active_account(config, client_id)
    selected_client_id = str(account.get("client_id", "") if account else "").strip()
    api_key = str(account.get("api_key", "") if account else "").strip()
    name = str(account.get("name", "") if account else "").strip()
    if not selected_client_id or not api_key:
        raise ValueError("Владелец еще не настроил Client ID и API Key в админке.")
    return selected_client_id, api_key, name


def get_ozon_client_from_config(client_id: str | None = None) -> OzonDashboardClient:
    selected_client_id, api_key, _name = get_ozon_credentials(client_id)
    return OzonDashboardClient(selected_client_id, api_key)


def build_tnved_products_uncached(client_id: str | None = None) -> dict[str, Any]:
    started = datetime.now(timezone.utc)
    client = get_ozon_client_from_config(client_id)
    products = client.product_list()
    product_ids = [
        int(item.get("product_id") or item.get("id"))
        for item in products
        if item.get("product_id") is not None or item.get("id") is not None
    ]
    info_by_id = by_product_id(client.product_info(product_ids)) if product_ids else {}
    prices_by_id = by_product_id(client.product_prices(product_ids)) if product_ids else {}
    stocks_by_id = by_product_id(client.product_stocks(product_ids)) if product_ids else {}
    attrs_by_id = by_product_id(client.product_attributes())
    categories = flatten_category_tree(client.description_category_tree())

    rows = []
    for product in products:
        product_id_value = product.get("product_id") or product.get("id")
        if product_id_value is None:
            continue
        product_id = int(product_id_value)
        info = info_by_id.get(product_id, {})
        price = prices_by_id.get(product_id, {})
        stock = stocks_by_id.get(product_id, {})
        attrs = attrs_by_id.get(product_id, {})
        totals = stock_totals(stock)
        category_key = (
            int(attrs.get("description_category_id") or info.get("description_category_id") or 0),
            int(attrs.get("type_id") or info.get("type_id") or 0),
        )
        category_info = categories.get(category_key, {})
        statuses = info.get("statuses") or {}
        image = attrs.get("primary_image") or info.get("primary_image") or ""
        if not image:
            images = attrs.get("images") or info.get("images") or []
            image = images[0] if images else ""

        rows.append(
            {
                "photo": image,
                "offer_id": product.get("offer_id") or info.get("offer_id", ""),
                "product_id": product_id,
                "sku": first_sku(info),
                "name": info.get("name") or attrs.get("name", ""),
                "status": statuses.get("status_name") or ("В архиве" if product.get("archived") else ""),
                "category": category_info.get("category", ""),
                "type": category_info.get("type", ""),
                "tnved": attribute_value(attrs, 22232) or "-",
                "fbo": totals["fbo"],
                "fbs": totals["fbs"],
                "price": price_value(price, "price") or info.get("price", ""),
                "discount_price": price_value(price, "marketing_seller_price") or "",
                "old_price": price_value(price, "old_price") or info.get("old_price", ""),
            }
        )

    finished = datetime.now(timezone.utc)
    return {
        "items": rows,
        "count": len(rows),
        "updated_at": finished.isoformat(),
        "duration_sec": round((finished - started).total_seconds(), 1),
        "next_update_at": (finished + timedelta(minutes=5)).isoformat(),
    }


def build_tnved_products(client_id: str | None = None, force_refresh: bool = False) -> dict[str, Any]:
    selected_client_id, api_key, account_name = get_ozon_credentials(client_id)
    now = datetime.now(timezone.utc)
    cached = read_tnved_cache_record(selected_client_id, api_key)
    if cached and not force_refresh:
        expires_at = parse_iso_datetime(cached.get("expires_at"))
        refresh_started = False
        if expires_at <= now:
            refresh_started = start_tnved_background_refresh(selected_client_id, api_key)
        return cache_payload(cached, selected_client_id, account_name, hit=True, refresh_started=refresh_started)

    if cached and force_refresh:
        refresh_started = start_tnved_background_refresh(selected_client_id, api_key)
        return cache_payload(cached, selected_client_id, account_name, hit=True, refresh_started=refresh_started)

    refresh_started = start_tnved_background_refresh(selected_client_id, api_key)
    return empty_tnved_loading_payload(selected_client_id, account_name, refresh_started)


def clear_tnved_cache(client_id: str | None = None) -> None:
    if client_id:
        TNVED_CACHE.pop(f"ozon:{client_id}", None)
        return
    TNVED_CACHE.clear()


def tnved_cache_file(client_id: str) -> Path:
    safe_client_id = re.sub(r"[^0-9A-Za-z_.-]", "_", str(client_id).strip())
    return CACHE_DIR / f"tnved_{safe_client_id}.json"


def costs_file(client_id: str) -> Path:
    safe_client_id = re.sub(r"[^0-9A-Za-z_.-]", "_", str(client_id).strip())
    return CACHE_DIR / f"costs_{safe_client_id}.json"


def safe_upload_filename(file_name: str, default: str = "tariffs.xlsx") -> str:
    name = Path(str(file_name or default)).name.strip() or default
    return re.sub(r"[^0-9A-Za-zА-Яа-яЁё_.() -]", "_", name)


def load_tariffs_meta() -> dict[str, Any]:
    if not TARIFFS_META_PATH.exists():
        return {}
    try:
        data = json.loads(TARIFFS_META_PATH.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError):
        return {}
    return data if isinstance(data, dict) else {}


def save_tariffs_upload(file_name: str, file_type: str, file_size: Any, file_data: str) -> dict[str, Any]:
    if not file_data:
        raise ValueError("Файл тарифов не передан.")
    safe_name = safe_upload_filename(file_name)
    suffix = Path(safe_name).suffix.lower()
    if suffix not in {".xlsx", ".csv"}:
        raise ValueError("Загрузите файл тарифов в формате Excel .xlsx или CSV.")
    content = base64.b64decode(file_data)
    try:
        TARIFFS_DIR.mkdir(parents=True, exist_ok=True)
        file_path = TARIFFS_DIR / safe_name
    except OSError:
        CACHE_DIR.mkdir(parents=True, exist_ok=True)
        file_path = CACHE_DIR / f"tariffs_{safe_name}"
    file_path.write_bytes(content)
    meta = {
        "name": safe_name,
        "path": str(file_path),
        "type": str(file_type or ""),
        "size": int(file_size or len(content)),
        "uploaded_at": datetime.now(timezone.utc).isoformat(),
    }
    TARIFFS_META_PATH.write_text(json.dumps(meta, ensure_ascii=False, indent=2), encoding="utf-8")
    return meta


def xlsx_rows_from_bytes(content: bytes, max_rows: int = 200, max_columns: int = 40) -> list[list[str]]:
    namespace = "{http://schemas.openxmlformats.org/spreadsheetml/2006/main}"
    with zipfile.ZipFile(io.BytesIO(content)) as archive:
        shared_strings: list[str] = []
        if "xl/sharedStrings.xml" in archive.namelist():
            shared_root = ET.fromstring(archive.read("xl/sharedStrings.xml"))
            for item in shared_root.iter(f"{namespace}si"):
                shared_strings.append("".join(text.text or "" for text in item.iter(f"{namespace}t")))
        sheet_name = "xl/worksheets/sheet1.xml"
        if sheet_name not in archive.namelist():
            worksheet_names = [name for name in archive.namelist() if name.startswith("xl/worksheets/sheet") and name.endswith(".xml")]
            if not worksheet_names:
                raise ValueError("Excel worksheet was not found.")
            sheet_name = sorted(worksheet_names)[0]
        sheet_root = ET.fromstring(archive.read(sheet_name))
    raw_rows: list[tuple[int, dict[int, str]]] = []
    min_column: int | None = None
    max_column = 0
    for row in sheet_root.iter(f"{namespace}row"):
        values: dict[int, str] = {}
        for cell in row.iter(f"{namespace}c"):
            column = xlsx_column_index(cell.attrib.get("r", ""))
            if column is not None:
                text = xlsx_cell_text(cell, shared_strings)
                if text:
                    values[column] = text
                    min_column = column if min_column is None else min(min_column, column)
                    max_column = max(max_column, column)
        if not any(str(value).strip() for value in values.values()):
            continue
        row_number = int(row.attrib.get("r") or "0")
        raw_rows.append((row_number, values))
        if len(raw_rows) >= max_rows:
            break
    if min_column is None:
        return []
    columns = list(range(min_column, min(max_column + 1, min_column + max_columns)))
    rows: list[list[str]] = []
    for _, values in raw_rows:
        rows.append([format_tariff_preview_value(values.get(column, ""), column) for column in columns])
    return rows


def csv_rows_from_bytes(content: bytes, max_rows: int = 200, max_columns: int = 40) -> list[list[str]]:
    for encoding in ("utf-8-sig", "cp1251"):
        try:
            text = content.decode(encoding)
            break
        except UnicodeDecodeError:
            text = ""
    rows: list[list[str]] = []
    for row in csv.reader(io.StringIO(text), delimiter=";"):
        rows.append([str(value) for value in row[:max_columns]])
        if len(rows) >= max_rows:
            break
    return rows


def load_tariffs_preview() -> dict[str, Any]:
    meta = load_tariffs_meta()
    if not meta:
        return {"file": None, "rows": []}
    file_path = Path(str(meta.get("path") or ""))
    if not file_path.exists():
        return {"file": meta, "rows": [], "error": "Файл тарифов не найден на диске."}
    content = file_path.read_bytes()
    suffix = file_path.suffix.lower()
    rows = csv_rows_from_bytes(content) if suffix == ".csv" else xlsx_rows_from_bytes(content)
    return {"file": meta, "rows": rows, "limited": len(rows) >= 200}


def load_costs(client_id: str) -> dict[str, str]:
    path = costs_file(client_id)
    if not path.exists():
        return {}
    try:
        data = json.loads(path.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError):
        return {}
    if not isinstance(data, dict):
        return {}
    return {str(key).strip(): str(value).strip() for key, value in data.items() if str(key).strip()}


def save_costs(client_id: str, costs: dict[str, Any]) -> int:
    CACHE_DIR.mkdir(parents=True, exist_ok=True)
    def clean_cost(value: Any) -> str:
        text = str(value).strip().replace(",", ".")
        text = re.sub(r"[^0-9.\-]", "", text)
        if text.count(".") > 1:
            head, *tail = text.split(".")
            text = f"{head}.{''.join(tail)}"
        return text

    cleaned = {
        str(key).strip(): clean_cost(value)
        for key, value in costs.items()
        if str(key).strip() and clean_cost(value)
    }
    costs_file(client_id).write_text(json.dumps(cleaned, ensure_ascii=False, indent=2), encoding="utf-8")
    return len(cleaned)


def normalize_cost_rows(rows: Any) -> list[dict[str, str]]:
    if not isinstance(rows, list):
        raise ValueError("Invalid cost file format.")
    normalized: list[dict[str, str]] = []
    for row in rows:
        if not isinstance(row, dict):
            continue
        sku = str(row.get("sku") or "").strip()
        raw_cost_price = row.get("cost_price")
        cost_price = "" if raw_cost_price is None else str(raw_cost_price).strip()
        if sku and cost_price != "":
            normalized.append({"sku": sku, "cost_price": cost_price})
    return normalized


def xlsx_column_index(cell_ref: str) -> int | None:
    letters = re.match(r"([A-Z]+)", str(cell_ref).upper())
    if not letters:
        return None
    index = 0
    for char in letters.group(1):
        index = index * 26 + (ord(char) - ord("A") + 1)
    return index - 1


def xlsx_cell_text(cell: ET.Element, shared_strings: list[str]) -> str:
    namespace = "{http://schemas.openxmlformats.org/spreadsheetml/2006/main}"
    cell_type = cell.attrib.get("t")
    if cell_type == "inlineStr":
        inline = cell.find(f"{namespace}is")
        if inline is None:
            return ""
        return "".join(text.text or "" for text in inline.iter(f"{namespace}t")).strip()
    value = cell.find(f"{namespace}v")
    if value is None or value.text is None:
        return ""
    text = value.text.strip()
    if cell_type == "s":
        try:
            return shared_strings[int(text)].strip()
        except (ValueError, IndexError):
            return ""
    return text


def format_tariff_preview_value(value: str, column: int) -> str:
    text = str(value or "").strip()
    if column < 3 or not text:
        return text
    try:
        number = float(text)
    except ValueError:
        return text
    if 0 <= number <= 1:
        return f"{number * 100:.2f}%".replace(".", ",")
    return text


def cost_rows_from_xlsx_bytes(content: bytes) -> list[dict[str, str]]:
    namespace = "{http://schemas.openxmlformats.org/spreadsheetml/2006/main}"
    with zipfile.ZipFile(io.BytesIO(content)) as archive:
        shared_strings: list[str] = []
        if "xl/sharedStrings.xml" in archive.namelist():
            shared_root = ET.fromstring(archive.read("xl/sharedStrings.xml"))
            for item in shared_root.iter(f"{namespace}si"):
                shared_strings.append("".join(text.text or "" for text in item.iter(f"{namespace}t")))
        sheet_name = "xl/worksheets/sheet1.xml"
        if sheet_name not in archive.namelist():
            worksheet_names = [name for name in archive.namelist() if name.startswith("xl/worksheets/sheet") and name.endswith(".xml")]
            if not worksheet_names:
                raise ValueError("Excel worksheet was not found.")
            sheet_name = sorted(worksheet_names)[0]
        sheet_root = ET.fromstring(archive.read(sheet_name))
    rows: list[dict[str, str]] = []
    for row in sheet_root.iter(f"{namespace}row"):
        row_number = int(row.attrib.get("r") or "0")
        if row_number <= 1:
            continue
        values: dict[int, str] = {}
        for cell in row.iter(f"{namespace}c"):
            column = xlsx_column_index(cell.attrib.get("r", ""))
            if column is not None:
                values[column] = xlsx_cell_text(cell, shared_strings)
        sku = values.get(2, "").strip()
        cost_price = values.get(6, "").strip()
        if sku and cost_price:
            rows.append({"sku": sku, "cost_price": cost_price})
    return rows


def apply_costs_to_tnved_payload(payload: dict[str, Any], client_id: str) -> dict[str, Any]:
    costs = load_costs(client_id)
    if not costs:
        return payload
    items = payload.get("items")
    if not isinstance(items, list):
        return payload
    for item in items:
        if not isinstance(item, dict):
            continue
        sku = str(item.get("sku") or "").strip()
        if sku in costs:
            item["cost_price"] = costs[sku]
    return payload


def api_key_fingerprint(api_key: str) -> str:
    return hashlib.sha256(api_key.encode("utf-8")).hexdigest()[:12]


def parse_iso_datetime(value: Any) -> datetime:
    if isinstance(value, datetime):
        return value
    try:
        return datetime.fromisoformat(str(value))
    except ValueError:
        return datetime.fromtimestamp(0, timezone.utc)


def read_tnved_cache_record(client_id: str, api_key: str) -> dict[str, Any] | None:
    cache_key = f"ozon:{client_id}"
    fingerprint = api_key_fingerprint(api_key)
    cached = TNVED_CACHE.get(cache_key)
    if cached and cached.get("api_key_fingerprint") == fingerprint:
        return cached

    path = tnved_cache_file(client_id)
    if not path.exists():
        return None
    try:
        record = json.loads(path.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError):
        return None
    if record.get("api_key_fingerprint") != fingerprint or not isinstance(record.get("payload"), dict):
        return None

    record["expires_at"] = parse_iso_datetime(record.get("expires_at"))
    TNVED_CACHE[cache_key] = record
    return record


def write_tnved_cache_record(client_id: str, api_key: str, payload: dict[str, Any]) -> dict[str, Any]:
    CACHE_DIR.mkdir(parents=True, exist_ok=True)
    expires_at = datetime.now(timezone.utc) + timedelta(seconds=TNVED_CACHE_TTL_SECONDS)
    record = {
        "api_key_fingerprint": api_key_fingerprint(api_key),
        "expires_at": expires_at,
        "payload": payload,
    }
    TNVED_CACHE[f"ozon:{client_id}"] = record
    disk_record = {
        "api_key_fingerprint": record["api_key_fingerprint"],
        "expires_at": expires_at.isoformat(),
        "payload": payload,
    }
    tnved_cache_file(client_id).write_text(json.dumps(disk_record, ensure_ascii=False), encoding="utf-8")
    return record


def cache_payload(record: dict[str, Any], client_id: str, account_name: str, *, hit: bool, refresh_started: bool) -> dict[str, Any]:
    now = datetime.now(timezone.utc)
    expires_at = parse_iso_datetime(record.get("expires_at"))
    payload = dict(record.get("payload") or {})
    apply_costs_to_tnved_payload(payload, client_id)
    payload["next_update_at"] = expires_at.isoformat()
    payload["cache"] = {
        "client_id": client_id,
        "name": account_name,
        "hit": hit,
        "persisted": True,
        "stale": expires_at <= now,
        "refresh_started": refresh_started,
        "expires_at": expires_at.isoformat(),
    }
    return payload


def refresh_tnved_cache(client_id: str, api_key: str) -> None:
    try:
        payload = build_tnved_products_uncached(client_id)
        write_tnved_cache_record(client_id, api_key, payload)
    finally:
        with TNVED_CACHE_LOCK:
            TNVED_REFRESHING.discard(client_id)


def start_tnved_background_refresh(client_id: str, api_key: str) -> bool:
    with TNVED_CACHE_LOCK:
        if client_id in TNVED_REFRESHING:
            return False
        TNVED_REFRESHING.add(client_id)
    thread = threading.Thread(target=refresh_tnved_cache, args=(client_id, api_key), daemon=True)
    thread.start()
    return True


def empty_tnved_loading_payload(client_id: str, account_name: str, refresh_started: bool) -> dict[str, Any]:
    now = datetime.now(timezone.utc)
    return {
        "items": [],
        "count": 0,
        "updated_at": now.isoformat(),
        "duration_sec": 0,
        "next_update_at": (now + timedelta(seconds=TNVED_CACHE_TTL_SECONDS)).isoformat(),
        "cache": {
            "client_id": client_id,
            "name": account_name,
            "hit": False,
            "persisted": False,
            "stale": True,
            "loading": True,
            "refresh_started": refresh_started,
        },
    }


def tnved_cache_status(account: dict[str, Any]) -> dict[str, Any]:
    client_id = str(account.get("client_id", "")).strip()
    api_key = str(account.get("api_key", ""))
    record = read_tnved_cache_record(client_id, api_key) if client_id and api_key else None
    payload = record.get("payload", {}) if record else {}
    expires_at = parse_iso_datetime(record.get("expires_at")) if record else None
    return {
        "client_id": client_id,
        "name": str(account.get("name", "")),
        "items_count": len(payload.get("items") or []),
        "updated_at": payload.get("updated_at", ""),
        "expires_at": expires_at.isoformat() if expires_at else "",
        "stale": bool(expires_at and expires_at <= datetime.now(timezone.utc)),
        "refreshing": client_id in TNVED_REFRESHING,
        "has_cache": bool(record),
    }


def report_cache_file(client_id: str) -> Path:
    safe_client_id = re.sub(r"[^0-9A-Za-z_-]+", "_", client_id or "default")
    return CACHE_DIR / f"report_{safe_client_id}.json"


def default_report_periods() -> dict[str, dict[str, str]]:
    today = datetime.now(APP_TZ).date()
    current_day = today - timedelta(days=1)
    compare_day = today - timedelta(days=2)
    return {
        "current": {
            "from": current_day.isoformat(),
            "to": current_day.isoformat(),
            "label": current_day.isoformat(),
        },
        "compare": {
            "from": compare_day.isoformat(),
            "to": compare_day.isoformat(),
            "label": compare_day.isoformat(),
        },
    }


def read_report_cache_record(client_id: str, api_key: str) -> dict[str, Any] | None:
    path = report_cache_file(client_id)
    if not path.exists():
        return None
    try:
        record = json.loads(path.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError):
        return None
    if record.get("api_key_fingerprint") != api_key_fingerprint(api_key):
        return None
    if record.get("cache_version") != REPORT_CACHE_VERSION:
        return None
    if not isinstance(record.get("current"), dict) or not isinstance(record.get("compare"), dict):
        return None
    return record


def write_report_cache_record(
    client_id: str,
    api_key: str,
    periods: dict[str, dict[str, str]],
    current_summary: dict[str, Any],
    compare_summary: dict[str, Any],
) -> dict[str, Any]:
    CACHE_DIR.mkdir(parents=True, exist_ok=True)
    now = datetime.now(timezone.utc)
    expires_at = now + timedelta(seconds=REPORT_CACHE_TTL_SECONDS)
    record = {
        "cache_version": REPORT_CACHE_VERSION,
        "api_key_fingerprint": api_key_fingerprint(api_key),
        "updated_at": now.isoformat(),
        "expires_at": expires_at.isoformat(),
        "periods": periods,
        "current": current_summary,
        "compare": compare_summary,
    }
    report_cache_file(client_id).write_text(json.dumps(record, ensure_ascii=False), encoding="utf-8")
    return record


def build_summary(date_from: str, date_to: str, client_id: str | None = None, period_label: str = "") -> dict[str, Any]:
    selected_client_id, api_key, account_name = get_ozon_credentials(client_id)
    if not selected_client_id or not api_key:
        raise ValueError("Владелец еще не настроил Client ID и API Key в админке.")
    client = OzonDashboardClient(selected_client_id, api_key)

    errors: list[str] = []
    operations: list[dict[str, Any]] = []
    fbo: list[dict[str, Any]] = []
    fbs: list[dict[str, Any]] = []
    category_products: list[dict[str, Any]] = []
    notes = [
        "Реклама считается по финансовым операциям, где Ozon отдает рекламный/маркетинговый тип операции.",
        "Для отдельного кабинета Ozon Performance может понадобиться отдельный рекламный токен.",
    ]

    try:
        operations = client.finance_transactions(date_from, date_to)
    except Exception as exc:
        errors.append(f"Финансы: {exc}")

    try:
        fbo = client.fbo_postings(date_from, date_to)
    except Exception as exc:
        errors.append(f"Заказы FBO: {exc}")

    try:
        fbs = client.fbs_postings(date_from, date_to)
    except Exception as exc:
        errors.append(f"Заказы FBS: {exc}")

    try:
        product_payload = build_tnved_products(selected_client_id)
        category_products = product_payload.get("items") or []
        if (product_payload.get("cache") or {}).get("loading"):
            notes.append("Кэш товаров еще обновляется, поэтому часть операций может попасть в строку без категории.")
    except Exception as exc:
        errors.append(f"Категории товаров: {exc}")

    finance = summarize_finance(operations)
    month_period = full_month_period(date_from, date_to)
    if month_period:
        try:
            sales_breakdown = summarize_month_sales_breakdown(client, month_period[0], month_period[1])
            finance["sales_breakdown"] = sales_breakdown if sales_breakdown["total"] else fallback_sales_breakdown(finance)
        except Exception as exc:
            if not is_premium_plus_required_error(exc) and not is_realization_report_not_found_error(exc):
                errors.append(f"Детализация выручки за месяц: {exc}")
            finance["sales_breakdown"] = fallback_sales_breakdown(finance)
    elif realization_by_day_allowed(date_from, date_to):
        try:
            sales_breakdown = summarize_sales_breakdown(client, date_from, date_to)
            finance["sales_breakdown"] = sales_breakdown if sales_breakdown["total"] else fallback_sales_breakdown(finance)
        except Exception as exc:
            if not is_premium_plus_required_error(exc):
                errors.append(f"Детализация выручки: {exc}")
            finance["sales_breakdown"] = fallback_sales_breakdown(finance)
    else:
        finance["sales_breakdown"] = fallback_sales_breakdown(finance)
        notes.append("Детализация выручки недоступна за выбранный период, поэтому выручка показана общей суммой.")
        try:
            if notes:
                notes.pop()
            sales_breakdown = summarize_matched_month_sales_breakdown(client, operations, date_from)
            finance["sales_breakdown"] = sales_breakdown if sales_breakdown["total"] else fallback_sales_breakdown(finance)
        except Exception as exc:
            if not is_premium_plus_required_error(exc) and not is_realization_report_not_found_error(exc):
                errors.append(f"����������� ������� �� ��������� ����������: {exc}")
            finance["sales_breakdown"] = fallback_sales_breakdown(finance)
    finance["by_category"] = summarize_finance_by_category(operations, category_products)
    finance["by_product_type"] = summarize_finance_by_type(operations, category_products)
    finance["by_article"] = summarize_finance_by_article(operations, category_products)
    postings = summarize_postings(fbo, fbs, operations)

    return {
        "period": {"label": period_label, "from": date_from, "to": date_to},
        "account": {"client_id": selected_client_id, "name": account_name},
        "finance": finance,
        "orders": postings,
        "errors": errors,
        "notes": notes,
    }


def report_cache_response(record: dict[str, Any], *, hit: bool) -> dict[str, Any]:
    now = datetime.now(timezone.utc)
    expires_at = parse_iso_datetime(record.get("expires_at"))
    return {
        "current": record.get("current") or {},
        "compare": record.get("compare") or {},
        "periods": record.get("periods") or default_report_periods(),
        "cache": {
            "hit": hit,
            "updated_at": str(record.get("updated_at") or ""),
            "expires_at": expires_at.isoformat(),
            "stale": expires_at <= now,
            "ttl_seconds": REPORT_CACHE_TTL_SECONDS,
        },
    }


def build_default_report(client_id: str | None = None) -> dict[str, Any]:
    selected_client_id, api_key, _account_name = get_ozon_credentials(client_id)
    if not selected_client_id or not api_key:
        raise ValueError("Владелец еще не настроил Client ID и API Key в админке.")

    periods = default_report_periods()
    record = read_report_cache_record(selected_client_id, api_key)
    now = datetime.now(timezone.utc)
    if record and record.get("periods") == periods and parse_iso_datetime(record.get("expires_at")) > now:
        return report_cache_response(record, hit=True)

    current_period = periods["current"]
    compare_period = periods["compare"]
    current_from, current_to, current_label = date_range(current_period["from"], current_period["to"])
    compare_from, compare_to, compare_label = date_range(compare_period["from"], compare_period["to"])
    current_summary = build_summary(
        current_from,
        current_to,
        selected_client_id,
        current_label,
    )
    compare_summary = build_summary(
        compare_from,
        compare_to,
        selected_client_id,
        compare_label,
    )
    record = write_report_cache_record(selected_client_id, api_key, periods, current_summary, compare_summary)
    return report_cache_response(record, hit=False)


def report_cache_status(account: dict[str, Any]) -> dict[str, Any]:
    client_id = str(account.get("client_id", "")).strip()
    api_key = str(account.get("api_key", ""))
    periods = default_report_periods()
    record = read_report_cache_record(client_id, api_key) if client_id and api_key else None
    expires_at = parse_iso_datetime(record.get("expires_at")) if record else None
    period_mismatch = bool(record and record.get("periods") != periods)
    stale = bool(period_mismatch or (expires_at and expires_at <= datetime.now(timezone.utc)))
    record_periods = record.get("periods") if record else periods
    return {
        "client_id": client_id,
        "name": str(account.get("name", "")),
        "has_cache": bool(record),
        "stale": stale,
        "updated_at": str(record.get("updated_at") or "") if record else "",
        "expires_at": expires_at.isoformat() if expires_at else "",
        "current_period": (record_periods or periods).get("current", periods["current"]),
        "compare_period": (record_periods or periods).get("compare", periods["compare"]),
        "expected_current_period": periods["current"],
        "expected_compare_period": periods["compare"],
    }


class DashboardHandler(BaseHTTPRequestHandler):
    def log_message(self, format: str, *args: Any) -> None:
        print(f"{self.address_string()} - {format % args}")

    def send_json(self, status: int, payload: dict[str, Any]) -> None:
        body = json.dumps(payload, ensure_ascii=False).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def send_session(self, status: int, payload: dict[str, Any], token: str | None = None) -> None:
        body = json.dumps(payload, ensure_ascii=False).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        if token:
            self.send_header("Set-Cookie", f"ozon_dashboard_session={token}; HttpOnly; SameSite=Lax; Path=/")
        self.end_headers()
        self.wfile.write(body)

    def current_user(self) -> dict[str, str] | None:
        return read_session(self.headers.get("Cookie"))

    def require_user(self) -> dict[str, str] | None:
        user = self.current_user()
        if not user:
            self.send_json(401, {"error": "Нужно войти в систему."})
            return None
        return user

    def do_POST(self) -> None:
        path = urlparse(self.path).path
        length = int(self.headers.get("Content-Length") or 0)

        if path == "/api/login":
            try:
                payload = json.loads(self.rfile.read(length).decode("utf-8"))
                login = str(payload.get("login", "")).strip()
                password = str(payload.get("password", ""))
                config = load_config()
                user = find_user(config, login)
                if not user or not verify_password(password, str(user.get("password_hash", ""))):
                    self.send_json(401, {"error": "Неверный логин или пароль."})
                    return
                selected_client_id = str(config.get("active_client_id", "")).strip()
                public = public_user(user, selected_client_id)
                self.send_session(200, {"user": public}, make_session(public["login"], public["role"], selected_client_id))
            except Exception as exc:
                self.send_json(400, {"error": str(exc)})
            return

        if path == "/api/logout":
            self.send_response(204)
            self.send_header("Set-Cookie", "ozon_dashboard_session=; Max-Age=0; HttpOnly; SameSite=Lax; Path=/")
            self.end_headers()
            return

        if path == "/api/summary":
            user = self.require_user()
            if not user:
                return
            try:
                payload = json.loads(self.rfile.read(length).decode("utf-8"))
                date_from_value = str(payload.get("date_from", "")).strip()
                date_to_value = str(payload.get("date_to", "")).strip()
                if date_from_value or date_to_value:
                    date_from, date_to, period_label = date_range(date_from_value, date_to_value)
                else:
                    month = str(payload.get("month", "")).strip()
                    if not re.fullmatch(r"\d{4}-\d{2}", month):
                        raise ValueError("Select a period.")
                    date_from, date_to = month_range(month)
                    period_label = month
                config = load_config()
                self.send_json(
                    200,
                    build_summary(date_from, date_to, selected_client_id_for_user(user, config), period_label),
                )
            except Exception as exc:
                self.send_json(400, {"error": str(exc)})
            return

        if path == "/api/accounts/select":
            user = self.require_user()
            if not user:
                return
            try:
                payload = json.loads(self.rfile.read(length).decode("utf-8"))
                client_id = str(payload.get("client_id", "")).strip()
                config = load_config()
                account = find_account(config, client_id)
                if not account:
                    raise ValueError("Account not found.")
                if not user_can_access_client_id(config, user, client_id):
                    raise ValueError("No access to this account.")
                public = {"login": user["login"], "role": user["role"], "client_id": client_id}
                self.send_session(
                    200,
                    {"user": public, **accounts_payload(config, client_id, user)},
                    make_session(user["login"], user["role"], client_id),
                )
            except Exception as exc:
                self.send_json(400, {"error": str(exc)})
            return

        if path == "/api/accounts":
            if not self.require_user():
                return
            try:
                payload = json.loads(self.rfile.read(length).decode("utf-8"))
                login = str(payload.get("login", "")).strip()
                password = str(payload.get("password", ""))
                client_id = str(payload.get("client_id", "")).strip()
                if not client_id.isdigit():
                    raise ValueError("Client ID must be a number.")
                config = load_config()
                account = find_account(config, client_id)
                verified_user = find_user(config, login)
                if not account or not verified_user or not verify_password(password, str(verified_user.get("password_hash", ""))):
                    raise ValueError("Account with this login, password and ID was not found.")
                allowed = verified_user.setdefault("allowed_client_ids", [])
                if client_id not in [str(item).strip() for item in allowed]:
                    allowed.append(client_id)
                    save_config(config)
                    config = load_config()
                public = public_user(verified_user, client_id)
                self.send_session(
                    200,
                    {"user": public, **accounts_payload(config, client_id, public)},
                    make_session(public["login"], public["role"], client_id),
                )
            except Exception as exc:
                self.send_json(400, {"error": str(exc)})
            return

        if path == "/api/costs/upload":
            user = self.require_user()
            if not user:
                return
            try:
                payload = json.loads(self.rfile.read(length).decode("utf-8"))
                rows = payload.get("items") or []
                file_name = str(payload.get("file_name") or "").lower()
                file_data = str(payload.get("file_data") or "").strip()
                if file_data and file_name.endswith(".xlsx"):
                    rows = cost_rows_from_xlsx_bytes(base64.b64decode(file_data))
                if not isinstance(rows, list):
                    raise ValueError("Неверный формат файла себестоимости.")
                rows = normalize_cost_rows(rows)
                if not rows:
                    raise ValueError("В файле не найдено заполненных себестоимостей в столбце G.")
                config = load_config()
                client_id = selected_client_id_for_user(user, config)
                existing = load_costs(client_id)
                for row in rows:
                    if not isinstance(row, dict):
                        continue
                    sku = str(row.get("sku") or "").strip()
                    raw_cost = row.get("cost_price")
                    cost = "" if raw_cost is None else str(raw_cost).strip()
                    if sku and cost != "":
                        existing[sku] = cost
                saved_count = save_costs(client_id, existing)
                self.send_json(200, {"ok": True, "saved": saved_count, "items": rows})
            except Exception as exc:
                self.send_json(400, {"error": str(exc)})
            return

        if path == "/api/tariffs/upload":
            user = self.require_user()
            if not user:
                return
            try:
                payload = json.loads(self.rfile.read(length).decode("utf-8"))
                meta = save_tariffs_upload(
                    str(payload.get("file_name") or ""),
                    str(payload.get("file_type") or ""),
                    payload.get("file_size"),
                    str(payload.get("file_data") or ""),
                )
                self.send_json(200, {"ok": True, "file": meta})
            except Exception as exc:
                self.send_json(400, {"error": str(exc)})
            return

        if path == "/api/admin/config":
            user = self.require_user()
            if not user:
                return
            if user["role"] not in ADMIN_ROLES:
                self.send_json(403, {"error": "Owner only."})
                return
            try:
                payload = json.loads(self.rfile.read(length).decode("utf-8"))
                client_id = str(payload.get("client_id", "")).strip()
                name = str(payload.get("name", "")).strip() or default_account_name(client_id)
                api_key = str(payload.get("api_key", "")).strip()
                if not client_id.isdigit():
                    raise ValueError("Client ID must be a number.")
                config = load_config()
                selected_client_id = selected_client_id_for_user(user, config)
                account = find_account(config, selected_client_id) or active_account(config)
                if not account:
                    raise ValueError("Add an account first.")
                old_client_id = str(account.get("client_id", "")).strip()
                account["client_id"] = client_id
                account["name"] = name
                if api_key:
                    account["api_key"] = api_key
                    clear_tnved_cache(old_client_id)
                    clear_tnved_cache(client_id)
                config["active_client_id"] = client_id
                config["ozon"] = {"client_id": client_id, "api_key": str(account.get("api_key", ""))}
                save_config(config)
                public = {"login": user["login"], "role": user["role"], "client_id": client_id}
                self.send_session(
                    200,
                    {"ok": True, "user": public, **accounts_payload(load_config(), client_id, public)},
                    make_session(user["login"], user["role"], client_id),
                )
            except Exception as exc:
                self.send_json(400, {"error": str(exc)})
            return

        if path == "/api/admin/config/clear":
            user = self.require_user()
            if not user:
                return
            if user["role"] not in ADMIN_ROLES:
                self.send_json(403, {"error": "Owner only."})
                return
            try:
                config = load_config()
                selected_client_id = selected_client_id_for_user(user, config)
                account = find_account(config, selected_client_id)
                if not account:
                    raise ValueError("Account not found.")
                account["api_key"] = ""
                if str(config.get("active_client_id", "")) == selected_client_id:
                    config["ozon"] = {"client_id": selected_client_id, "api_key": ""}
                save_config(config)
                clear_tnved_cache(selected_client_id)
                self.send_json(200, {"ok": True, **accounts_payload(load_config(), selected_client_id, user)})
            except Exception as exc:
                self.send_json(400, {"error": str(exc)})
            return

        if path == "/api/admin/performance":
            user = self.require_user()
            if not user:
                return
            if user["role"] not in ADMIN_ROLES:
                self.send_json(403, {"error": "Owner only."})
                return
            try:
                payload = json.loads(self.rfile.read(length).decode("utf-8"))
                performance_client_id = str(payload.get("client_id", "")).strip()
                performance_client_secret = str(payload.get("client_secret", "")).strip()
                config = load_config()
                selected_client_id = selected_client_id_for_user(user, config)
                account = find_account(config, selected_client_id)
                if not account:
                    raise ValueError("Account not found.")
                performance = account.setdefault("performance", {})
                if performance_client_id:
                    performance["client_id"] = performance_client_id
                if performance_client_secret:
                    performance["client_secret"] = performance_client_secret
                save_config(config)
                self.send_json(200, {"ok": True, **accounts_payload(load_config(), selected_client_id, user)})
            except Exception as exc:
                self.send_json(400, {"error": str(exc)})
            return

        if path == "/api/admin/performance/clear":
            user = self.require_user()
            if not user:
                return
            if user["role"] not in ADMIN_ROLES:
                self.send_json(403, {"error": "Owner only."})
                return
            try:
                config = load_config()
                selected_client_id = selected_client_id_for_user(user, config)
                account = find_account(config, selected_client_id)
                if not account:
                    raise ValueError("Account not found.")
                account["performance"] = {"client_id": "", "client_secret": ""}
                save_config(config)
                self.send_json(200, {"ok": True, **accounts_payload(load_config(), selected_client_id, user)})
            except Exception as exc:
                self.send_json(400, {"error": str(exc)})
            return

        if path == "/api/admin/users":
            user = self.require_user()
            if not user:
                return
            if user["role"] not in ADMIN_ROLES:
                self.send_json(403, {"error": "Доступно только владельцу."})
                return
            try:
                payload = json.loads(self.rfile.read(length).decode("utf-8"))
                login = str(payload.get("login", "")).strip()
                password = str(payload.get("password", ""))
                if not re.fullmatch(r"[A-Za-z0-9_.-]{3,40}", login):
                    raise ValueError("Логин: 3-40 символов, латиница/цифры/._-.")
                if len(password) < 6:
                    raise ValueError("Пароль должен быть не короче 6 символов.")
                config = load_config()
                existing = find_user(config, login)
                role = existing.get("role", "viewer") if existing else "viewer"
                new_user = {"login": login, "role": role, "password_hash": password_hash(password)}
                if existing:
                    existing.update(new_user)
                else:
                    config.setdefault("users", []).append(new_user)
                save_config(config)
                self.send_json(200, {"users": [public_user(item) for item in config.get("users", [])]})
            except Exception as exc:
                self.send_json(400, {"error": str(exc)})
            return

        self.send_error(404)

    def do_DELETE(self) -> None:
        path = urlparse(self.path).path
        if path != "/api/admin/users":
            self.send_error(404)
            return

        user = self.require_user()
        if not user:
            return
        if user["role"] not in ADMIN_ROLES:
            self.send_json(403, {"error": "Доступно только владельцу."})
            return
        try:
            login = (parse_qs(urlparse(self.path).query).get("login") or [""])[0]
            if login == user["login"]:
                raise ValueError("Нельзя удалить текущего владельца.")
            config = load_config()
            config["users"] = [item for item in config.get("users", []) if item.get("login") != login]
            save_config(config)
            self.send_json(200, {"users": [public_user(item) for item in config.get("users", [])]})
        except Exception as exc:
            self.send_json(400, {"error": str(exc)})

    def do_GET(self) -> None:
        parsed = urlparse(self.path)
        path = parsed.path

        if path == "/api/me":
            user = self.current_user()
            self.send_json(200, {"user": user})
            return

        if path == "/api/accounts":
            user = self.require_user()
            if not user:
                return
            config = load_config()
            selected_client_id = selected_client_id_for_user(user, config)
            self.send_json(200, accounts_payload(config, selected_client_id, user))
            return

        if path == "/api/admin/config":
            user = self.require_user()
            if not user:
                return
            if user["role"] not in ADMIN_ROLES:
                self.send_json(403, {"error": "Owner only."})
                return
            config = load_config()
            selected_client_id = selected_client_id_for_user(user, config)
            account = active_account(config, selected_client_id)
            data = accounts_payload(config, selected_client_id, user)
            data.update(
                {
                    "client_id": account.get("client_id", "") if account else "",
                    "name": account.get("name", "") if account else "",
                    "api_key_mask": mask_secret(str(account.get("api_key", ""))) if account else "",
                    "performance_client_id_mask": public_account(account).get("performance_client_id_mask", "") if account else "",
                    "performance_client_secret_mask": public_account(account).get("performance_client_secret_mask", "") if account else "",
                    "users": [public_user(item) for item in config.get("users", [])],
                }
            )
            self.send_json(200, data)
            return

        if path == "/api/config":
            user = self.require_user()
            if not user:
                return
            config = load_config()
            selected_client_id = selected_client_id_for_user(user, config)
            account = active_account(config, selected_client_id)
            self.send_json(
                200,
                {
                    "client_id": account.get("client_id", "") if account else "",
                    "name": account.get("name", "") if account else "",
                    "api_key": mask_secret(str(account.get("api_key", "")), 0, 0) if account else "",
                },
            )
            return

        if path == "/api/cache":
            user = self.require_user()
            if not user:
                return
            config = load_config()
            selected_client_id = selected_client_id_for_user(user, config)
            accounts = accounts_for_user(config, user)
            self.send_json(
                200,
                {
                    "active_client_id": selected_client_id,
                    "ttl_seconds": TNVED_CACHE_TTL_SECONDS,
                    "report_ttl_seconds": REPORT_CACHE_TTL_SECONDS,
                    "items": [tnved_cache_status(account) for account in accounts],
                    "report_items": [report_cache_status(account) for account in accounts],
                },
            )
            return

        if path == "/api/default-summary":
            user = self.require_user()
            if not user:
                return
            try:
                config = load_config()
                self.send_json(200, build_default_report(selected_client_id_for_user(user, config)))
            except Exception as exc:
                self.send_json(400, {"error": str(exc)})
            return

        if path == "/api/tariffs":
            user = self.require_user()
            if not user:
                return
            meta = load_tariffs_meta()
            self.send_json(200, {"file": meta or None})
            return

        if path == "/api/tariffs/preview":
            user = self.require_user()
            if not user:
                return
            try:
                self.send_json(200, load_tariffs_preview())
            except Exception as exc:
                self.send_json(400, {"error": str(exc)})
            return

        if path == "/api/tnved":
            user = self.require_user()
            if not user:
                return
            try:
                config = load_config()
                force_refresh = (parse_qs(parsed.query).get("refresh") or [""])[0] == "1"
                self.send_json(200, build_tnved_products(selected_client_id_for_user(user, config), force_refresh=force_refresh))
            except Exception as exc:
                self.send_json(400, {"error": str(exc)})
            return

        if path == "/":
            path = "/index.html"
        target = (STATIC_DIR / path.lstrip("/")).resolve()
        if not str(target).startswith(str(STATIC_DIR.resolve())) or not target.exists():
            self.send_error(404)
            return

        content_type = "text/html; charset=utf-8"
        if target.suffix == ".css":
            content_type = "text/css; charset=utf-8"
        elif target.suffix == ".js":
            content_type = "application/javascript; charset=utf-8"
        elif target.suffix == ".svg":
            content_type = "image/svg+xml"

        data = target.read_bytes()
        self.send_response(200)
        self.send_header("Content-Type", content_type)
        self.send_header("Content-Length", str(len(data)))
        self.end_headers()
        self.wfile.write(data)


def main() -> int:
    port = int(sys.argv[1]) if len(sys.argv) > 1 else 8765
    host = sys.argv[2] if len(sys.argv) > 2 else "127.0.0.1"
    server = ThreadingHTTPServer((host, port), DashboardHandler)
    visible_host = "127.0.0.1" if host in {"0.0.0.0", ""} else host
    print(f"Ozon dashboard: http://{visible_host}:{port}")
    print("Ключи вводятся в браузере и не сохраняются на диск.")
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\nОстановлено.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
