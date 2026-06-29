# Ozon Seller API client

Минимальный Python-клиент для подключения к Ozon Seller API.

## Быстрый старт

1. Установите зависимости:

```powershell
pip install -r requirements.txt
```

2. Создайте локальный файл `.env` рядом со скриптом:

```powershell
Copy-Item .env.example .env
```

3. Впишите в `.env` значения из кабинета Ozon Seller:

```text
OZON_CLIENT_ID=...
OZON_API_KEY=...
```

4. Проверьте подключение:

```powershell
python ozon_client.py --check
```

5. Получите базовую выгрузку:

```powershell
python ozon_client.py --export-dir ..\..\outputs\ozon_export
```

## Что выгружается

- `products.json` - список товаров из `/v3/product/list`.
- `product_info.json` - детальная информация по товарам из `/v3/product/info/list`.
- `prices.json` - цены из `/v5/product/info/prices`.
- `stocks.json` - остатки из `/v4/product/info/stocks`.

Если какой-то метод недоступен для кабинета или изменился в Ozon API, скрипт сохранит ошибку в консоль и продолжит остальные выгрузки.

