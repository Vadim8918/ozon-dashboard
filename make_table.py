import csv
import json
import zipfile
from pathlib import Path
from typing import Any
from xml.sax.saxutils import escape


ROOT = Path(__file__).resolve().parents[2]
EXPORT_DIR = ROOT / "outputs" / "ozon_export"
TABLE_PATH = EXPORT_DIR / "ozon_products_table.csv"
XLSX_PATH = EXPORT_DIR / "ozon_products_table.xlsx"
RU_XLSX_PATH = EXPORT_DIR / "Таблица_товаров_Ozon.xlsx"


def load_json(name: str) -> list[dict[str, Any]]:
    path = EXPORT_DIR / name
    return json.loads(path.read_text(encoding="utf-8"))


def load_json_optional(name: str) -> list[dict[str, Any]]:
    path = EXPORT_DIR / name
    if not path.exists():
        return []
    return json.loads(path.read_text(encoding="utf-8"))


def by_product_id(items: list[dict[str, Any]]) -> dict[int, dict[str, Any]]:
    result = {}
    for item in items:
        product_id = item.get("product_id") or item.get("id")
        if product_id is not None:
            result[int(product_id)] = item
    return result


def by_sku(items: list[dict[str, Any]]) -> dict[int, dict[str, Any]]:
    result = {}
    for item in items:
        sku = item.get("sku")
        if sku is not None:
            result[int(sku)] = item
    return result


def stock_totals(item: dict[str, Any]) -> dict[str, int]:
    totals = {
        "fbo_present": 0,
        "fbo_reserved": 0,
        "fbs_present": 0,
        "fbs_reserved": 0,
        "rfbs_present": 0,
        "stock_present_total": 0,
        "stock_reserved_total": 0,
    }

    for stock in item.get("stocks", []):
        stock_type = str(stock.get("type") or stock.get("source") or "").lower()
        present = int(stock.get("present") or 0)
        reserved = int(stock.get("reserved") or 0)
        totals["stock_present_total"] += present
        totals["stock_reserved_total"] += reserved

        if stock_type == "fbo":
            totals["fbo_present"] += present
            totals["fbo_reserved"] += reserved
        elif stock_type == "fbs":
            totals["fbs_present"] += present
            totals["fbs_reserved"] += reserved
        elif stock_type == "rfbs":
            totals["rfbs_present"] += present

    return totals


def first_barcode(item: dict[str, Any]) -> str:
    barcodes = item.get("barcodes") or []
    return str(barcodes[0]) if barcodes else ""


def first_sku(item: dict[str, Any]) -> str:
    sources = item.get("sources") or []
    if not sources:
        return ""
    sku = sources[0].get("sku")
    return str(sku) if sku is not None else ""


def price_value(item: dict[str, Any], key: str) -> Any:
    price = item.get("price") or {}
    return price.get(key, "")


def commission_value(item: dict[str, Any], key: str) -> Any:
    commissions = item.get("commissions") or {}
    if isinstance(commissions, dict):
        return commissions.get(key, "")
    return ""


def attribute_value(item: dict[str, Any], attribute_id: int) -> str:
    for attribute in item.get("attributes") or []:
        if attribute.get("id") != attribute_id:
            continue
        values = attribute.get("values") or []
        return ", ".join(str(value.get("value", "")) for value in values if value.get("value"))
    return ""


def volume_liters(item: dict[str, Any]) -> Any:
    height = item.get("height")
    depth = item.get("depth")
    width = item.get("width")
    unit = item.get("dimension_unit")
    if height is None or depth is None or width is None:
        return ""

    volume = float(height) * float(depth) * float(width)
    if unit == "mm":
        return round(volume / 1_000_000, 2)
    if unit == "cm":
        return round(volume / 1000, 2)
    return round(volume, 2)


def quant_count(product: dict[str, Any]) -> int:
    quants = product.get("quants") or []
    if not quants:
        return 0
    total = 0
    for quant in quants:
        for key in ("quantity", "count", "value"):
            if quant.get(key) is not None:
                total += int(quant[key])
                break
    return total


def join_errors(errors: list[dict[str, Any]], level: str | None = None) -> str:
    messages = []
    for error in errors or []:
        if level and str(error.get("level", "")).lower() != level:
            continue
        message = error.get("message") or error.get("description") or error.get("field")
        if message:
            messages.append(str(message))
    return "; ".join(messages)


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


def main() -> None:
    products = load_json("products.json")
    product_info = by_product_id(load_json("product_info.json"))
    prices = by_product_id(load_json("prices.json"))
    stocks = by_product_id(load_json("stocks.json"))
    attributes = by_product_id(load_json_optional("product_attributes.json"))
    content_ratings = by_sku(load_json_optional("content_ratings.json"))
    categories = flatten_category_tree(load_json_optional("description_category_tree.json"))

    columns = [
        ("offer_id", "Артикул"),
        ("product_id", "Ozon Product ID"),
        ("sku", "SKU"),
        ("quant_count", "Количество товара в кванте"),
        ("barcode", "Barcode"),
        ("name", "Название товара"),
        ("content_rating", "Контент-рейтинг"),
        ("brand", "Бренд"),
        ("status_name", "Статус товара"),
        ("tags", "Метки"),
        ("reviews_count", "Отзывы"),
        ("product_rating", "Рейтинг"),
        ("hidden_reasons", "Причины скрытия"),
        ("created_at", "Дата создания"),
        ("category", "Категория"),
        ("type", "Тип"),
        ("volume_liters", "Объем товара, л"),
        ("volume_weight", "Объемный вес, кг"),
        ("fbo_present", "Доступно к продаже по схеме FBO, шт."),
        ("fbo_reserved", "Зарезервировано, шт"),
        ("fbs_present", "Доступно к продаже по схеме FBS, шт."),
        ("rfbs_present", "Доступно к продаже по схеме realFBS, шт."),
        ("fbs_reserved", "Зарезервировано на моих складах, шт"),
        ("price", "Текущая цена с учетом скидки, ₽"),
        ("old_price", "Цена до скидки (перечеркнутая цена), ₽"),
        ("premium_price", "Цена Premium, ₽"),
        ("vat_percent", "Размер НДС, %"),
        ("errors", "Ошибки"),
        ("warnings", "Предупреждения"),
    ]
    headers = [key for key, _title in columns]
    display_headers = [title for _key, title in columns]

    rows = []
    for product in products:
        product_id = int(product.get("product_id") or product.get("id"))
        info = product_info.get(product_id, {})
        price = prices.get(product_id, {})
        stock = stocks.get(product_id, {})
        attribute = attributes.get(product_id, {})
        totals = stock_totals(stock)
        sku = info.get("sku") or first_sku(info)
        rating_info = content_ratings.get(int(sku), {}) if sku else {}
        category_info = categories.get(
            (
                int(attribute.get("description_category_id") or info.get("description_category_id") or 0),
                int(attribute.get("type_id") or info.get("type_id") or 0),
            ),
            {},
        )
        statuses = info.get("statuses") or {}
        errors = info.get("errors") or []
        price_block = price.get("price") or {}
        vat = price_value(price, "vat") or info.get("vat", "")
        vat_percent = float(vat) * 100 if vat not in ("", None) and float(vat) <= 1 else vat

        rows.append(
            {
                "offer_id": product.get("offer_id") or info.get("offer_id") or price.get("offer_id", ""),
                "product_id": product_id,
                "sku": sku,
                "quant_count": quant_count(product),
                "barcode": attribute.get("barcode") or first_barcode(info),
                "name": info.get("name", ""),
                "content_rating": rating_info.get("rating", ""),
                "brand": attribute_value(attribute, 85),
                "status_name": statuses.get("status_name", ""),
                "tags": "",
                "reviews_count": "",
                "product_rating": "",
                "hidden_reasons": statuses.get("status_description", ""),
                "created_at": info.get("created_at", ""),
                "category": category_info.get("category", ""),
                "type": category_info.get("type", ""),
                "volume_liters": volume_liters(attribute),
                "volume_weight": price.get("volume_weight", info.get("volume_weight", "")),
                "fbo_present": totals["fbo_present"],
                "fbo_reserved": totals["fbo_reserved"],
                "fbs_present": totals["fbs_present"],
                "rfbs_present": totals["rfbs_present"],
                "fbs_reserved": totals["fbs_reserved"],
                "price": price_value(price, "price") or info.get("price", ""),
                "old_price": price_value(price, "old_price") or info.get("old_price", ""),
                "premium_price": price_block.get("premium_price", ""),
                "vat_percent": vat_percent,
                "errors": join_errors(errors, "error") or join_errors(errors, None),
                "warnings": join_errors(errors, "warning"),
            }
        )

    with TABLE_PATH.open("w", newline="", encoding="utf-8-sig") as file:
        writer = csv.writer(file, delimiter=";")
        writer.writerow(display_headers)
        for row in rows:
            writer.writerow([row.get(header, "") for header in headers])

    write_xlsx(XLSX_PATH, headers, display_headers, rows)
    write_xlsx(RU_XLSX_PATH, headers, display_headers, rows)
    print(f"Saved {len(rows)} rows to {TABLE_PATH}")
    print(f"Saved {len(rows)} rows to {XLSX_PATH}")
    print(f"Saved {len(rows)} rows to {RU_XLSX_PATH}")


def excel_column(index: int) -> str:
    name = ""
    while index:
        index, remainder = divmod(index - 1, 26)
        name = chr(65 + remainder) + name
    return name


def cell_ref(row_number: int, column_number: int) -> str:
    return f"{excel_column(column_number)}{row_number}"


def xml_text(value: Any) -> str:
    if value is None:
        return ""
    return escape(str(value), {"'": "&apos;", '"': "&quot;"})


def sheet_row(row_number: int, values: list[Any], style_id: int) -> str:
    cells = []
    for column_number, value in enumerate(values, start=1):
        reference = cell_ref(row_number, column_number)
        cells.append(
            f'<c r="{reference}" t="inlineStr" s="{style_id}">'
            f"<is><t>{xml_text(value)}</t></is></c>"
        )
    return f'<row r="{row_number}">{"".join(cells)}</row>'


def write_xlsx(
    path: Path, headers: list[str], display_headers: list[str], rows: list[dict[str, Any]]
) -> None:
    last_column = excel_column(len(headers))
    last_row = len(rows) + 1
    data_ref = f"A1:{last_column}{last_row}"

    column_widths = {
        "product_id": 16,
        "offer_id": 18,
        "sku": 14,
        "barcode": 16,
        "name": 60,
        "created_at": 22,
    }
    cols_xml = []
    for index, header in enumerate(headers, start=1):
        width = column_widths.get(header, 14)
        cols_xml.append(f'<col min="{index}" max="{index}" width="{width}" customWidth="1"/>')

    sheet_rows = [sheet_row(1, display_headers, 1)]
    for row_number, row in enumerate(rows, start=2):
        sheet_rows.append(sheet_row(row_number, [row.get(header, "") for header in headers], 2))

    worksheet_xml = f"""<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
  <dimension ref="{data_ref}"/>
  <sheetViews>
    <sheetView workbookViewId="0">
      <pane ySplit="1" topLeftCell="A2" activePane="bottomLeft" state="frozen"/>
      <selection pane="bottomLeft"/>
    </sheetView>
  </sheetViews>
  <cols>{''.join(cols_xml)}</cols>
  <sheetData>{''.join(sheet_rows)}</sheetData>
  <autoFilter ref="{data_ref}"/>
</worksheet>"""

    files = {
        "[Content_Types].xml": """<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>
  <Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>
  <Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>
</Types>""",
        "_rels/.rels": """<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>
</Relationships>""",
        "xl/workbook.xml": """<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
  <sheets>
    <sheet name="Ozon products" sheetId="1" r:id="rId1"/>
  </sheets>
</workbook>""",
        "xl/_rels/workbook.xml.rels": """<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/>
  <Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>
</Relationships>""",
        "xl/styles.xml": """<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
  <fonts count="2">
    <font><sz val="11"/><name val="Calibri"/></font>
    <font><b/><sz val="11"/><name val="Calibri"/></font>
  </fonts>
  <fills count="2">
    <fill><patternFill patternType="none"/></fill>
    <fill><patternFill patternType="gray125"/></fill>
  </fills>
  <borders count="1"><border><left/><right/><top/><bottom/><diagonal/></border></borders>
  <cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>
  <cellXfs count="3">
    <xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/>
    <xf numFmtId="0" fontId="1" fillId="0" borderId="0" xfId="0" applyAlignment="1"><alignment wrapText="1" vertical="top"/></xf>
    <xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0" applyAlignment="1"><alignment wrapText="1" vertical="top"/></xf>
  </cellXfs>
  <cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles>
</styleSheet>""",
        "xl/worksheets/sheet1.xml": worksheet_xml,
    }

    with zipfile.ZipFile(path, "w", compression=zipfile.ZIP_DEFLATED) as archive:
        for file_name, content in files.items():
            archive.writestr(file_name, content)


if __name__ == "__main__":
    main()
