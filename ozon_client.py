import argparse
import json
import os
import sys
import time
from pathlib import Path
from typing import Any

import requests
from dotenv import load_dotenv


BASE_URL = "https://api-seller.ozon.ru"
DEFAULT_LIMIT = 1000


class OzonApiError(RuntimeError):
    pass


class OzonClient:
    def __init__(self, client_id: str, api_key: str, base_url: str = BASE_URL) -> None:
        self.base_url = base_url.rstrip("/")
        self.session = requests.Session()
        self.session.headers.update(
            {
                "Client-Id": client_id,
                "Api-Key": api_key,
                "Content-Type": "application/json",
            }
        )

    def post(self, path: str, payload: dict[str, Any]) -> dict[str, Any]:
        url = f"{self.base_url}{path}"
        response = self.session.post(url, json=payload, timeout=20)
        if response.status_code >= 400:
            raise OzonApiError(f"{path} failed: HTTP {response.status_code}: {response.text}")

        data = response.json()
        if "error" in data and data["error"]:
            raise OzonApiError(f"{path} failed: {data['error']}")

        return data

    def product_list(self, limit: int = DEFAULT_LIMIT) -> list[dict[str, Any]]:
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
            result = data.get("result", {})
            items = result.get("items", [])
            products.extend(items)

            last_id = result.get("last_id") or ""
            if not last_id or len(items) < limit:
                break

            time.sleep(0.2)

        return products

    def product_info(self, product_ids: list[int], chunk_size: int = 100) -> list[dict[str, Any]]:
        result: list[dict[str, Any]] = []
        for chunk in chunks(product_ids, chunk_size):
            data = self.post("/v3/product/info/list", {"product_id": chunk})
            result.extend(data.get("items") or data.get("result", {}).get("items", []))
            time.sleep(0.2)
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
            time.sleep(0.2)
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
            time.sleep(0.2)
        return result

    def product_attributes(self, limit: int = DEFAULT_LIMIT) -> list[dict[str, Any]]:
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
            items = data.get("result", [])
            attributes.extend(items)

            last_id = data.get("last_id") or ""
            if not last_id or len(items) < limit:
                break

            time.sleep(0.2)

        return attributes

    def content_ratings_by_sku(self, skus: list[int], chunk_size: int = 100) -> list[dict[str, Any]]:
        result: list[dict[str, Any]] = []
        for chunk in chunks(skus, chunk_size):
            data = self.post("/v1/product/rating-by-sku", {"skus": chunk})
            result.extend(data.get("products", []))
            time.sleep(0.2)
        return result

    def description_category_tree(self) -> list[dict[str, Any]]:
        data = self.post("/v1/description-category/tree", {"language": "DEFAULT"})
        return data.get("result", [])


def chunks(values: list[int], size: int) -> list[list[int]]:
    return [values[index : index + size] for index in range(0, len(values), size)]


def get_product_ids(products: list[dict[str, Any]]) -> list[int]:
    product_ids: list[int] = []
    for product in products:
        value = product.get("product_id") or product.get("id")
        if value is not None:
            product_ids.append(int(value))
    return product_ids


def save_json(path: Path, data: Any) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(data, ensure_ascii=False, indent=2), encoding="utf-8")


def load_client() -> OzonClient:
    load_dotenv()
    client_id = os.getenv("OZON_CLIENT_ID")
    api_key = os.getenv("OZON_API_KEY")

    if not client_id or not api_key:
        raise SystemExit(
            "Заполните OZON_CLIENT_ID и OZON_API_KEY в .env или переменных окружения."
        )

    return OzonClient(client_id=client_id, api_key=api_key)


def export_data(client: OzonClient, export_dir: Path) -> None:
    print("Получаю список товаров...")
    products = client.product_list()
    save_json(export_dir / "products.json", products)
    print(f"Сохранено товаров: {len(products)}")

    product_ids = get_product_ids(products)
    if not product_ids:
        print("В списке товаров нет product_id, остальные выгрузки пропущены.")
        return

    jobs = [
        ("product_info.json", "детальную информацию", client.product_info),
        ("prices.json", "цены", client.product_prices),
        ("stocks.json", "остатки", client.product_stocks),
    ]

    product_info = []
    for file_name, label, method in jobs:
        print(f"Получаю {label}...")
        try:
            data = method(product_ids)
        except OzonApiError as exc:
            print(f"Не удалось получить {label}: {exc}", file=sys.stderr)
            continue

        save_json(export_dir / file_name, data)
        print(f"Сохранено записей в {file_name}: {len(data)}")
        if file_name == "product_info.json":
            product_info = data

    print("Получаю атрибуты товаров...")
    try:
        attributes = client.product_attributes()
        save_json(export_dir / "product_attributes.json", attributes)
        print(f"Сохранено записей в product_attributes.json: {len(attributes)}")
    except OzonApiError as exc:
        print(f"Не удалось получить атрибуты товаров: {exc}", file=sys.stderr)

    skus = []
    for item in product_info:
        sku = item.get("sku")
        if sku is not None:
            skus.append(int(sku))

    if skus:
        print("Получаю контент-рейтинг товаров...")
        try:
            ratings = client.content_ratings_by_sku(skus)
            save_json(export_dir / "content_ratings.json", ratings)
            print(f"Сохранено записей в content_ratings.json: {len(ratings)}")
        except OzonApiError as exc:
            print(f"Не удалось получить контент-рейтинг: {exc}", file=sys.stderr)

    print("Получаю справочник категорий...")
    try:
        category_tree = client.description_category_tree()
        save_json(export_dir / "description_category_tree.json", category_tree)
        print("Справочник категорий сохранен в description_category_tree.json")
    except OzonApiError as exc:
        print(f"Не удалось получить справочник категорий: {exc}", file=sys.stderr)


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Ozon Seller API helper")
    parser.add_argument("--check", action="store_true", help="Проверить доступ к API")
    parser.add_argument(
        "--export-dir",
        type=Path,
        default=Path("ozon_export"),
        help="Папка для JSON-выгрузок",
    )
    return parser.parse_args()


def main() -> int:
    args = parse_args()
    client = load_client()

    try:
        if args.check:
            print("Проверяю подключение к Ozon API...")
            products = client.product_list(limit=1)
            print(f"Подключение работает. Товаров в первом ответе: {len(products)}")
            return 0

        export_data(client, args.export_dir)
        return 0
    except requests.RequestException as exc:
        print(f"Ошибка сети или таймаут ответа Ozon API: {exc}", file=sys.stderr)
        return 1
    except OzonApiError as exc:
        print(f"Ошибка Ozon API: {exc}", file=sys.stderr)
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
