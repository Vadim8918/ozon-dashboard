# Размещение Ozon Dashboard на VPS

Инструкция рассчитана на Ubuntu 22.04/24.04.

## 1. Что купить

Минимально достаточно:

- 1 vCPU
- 1 GB RAM
- 10-20 GB SSD
- Ubuntu 22.04 или 24.04

После покупки VPS у вас будут:

- IP сервера
- логин, обычно `root`
- пароль или SSH-ключ

## 2. Загрузить проект на сервер

На своем ПК откройте PowerShell из папки проекта:

```powershell
cd C:\Users\Вадим\Documents\Codex\2026-06-11\api\work
scp -r ozon_api_client root@SERVER_IP:/opt/ozon-dashboard
```

Замените `SERVER_IP` на IP вашего VPS.

## 3. Установить зависимости на сервере

Подключитесь к серверу:

```powershell
ssh root@SERVER_IP
```

На сервере выполните:

```bash
apt update
apt install -y python3 python3-venv python3-pip nginx
useradd --system --home /opt/ozon-dashboard --shell /usr/sbin/nologin ozon || true
chown -R ozon:ozon /opt/ozon-dashboard
cd /opt/ozon-dashboard
python3 -m venv .venv
.venv/bin/pip install -r requirements.txt
```

## 4. Настроить сервис

```bash
cp /opt/ozon-dashboard/deploy/ozon-dashboard.service /etc/systemd/system/ozon-dashboard.service
systemctl daemon-reload
systemctl enable --now ozon-dashboard
systemctl status ozon-dashboard
```

## 5. Настроить Nginx

```bash
cp /opt/ozon-dashboard/deploy/nginx-ozon-dashboard.conf /etc/nginx/sites-available/ozon-dashboard
```

Откройте файл:

```bash
nano /etc/nginx/sites-available/ozon-dashboard
```

Замените:

```text
YOUR_DOMAIN_OR_IP
```

на домен или IP сервера.

Затем:

```bash
ln -s /etc/nginx/sites-available/ozon-dashboard /etc/nginx/sites-enabled/ozon-dashboard
nginx -t
systemctl reload nginx
```

После этого сайт будет доступен:

```text
http://SERVER_IP
```

## 6. HTTPS, если есть домен

Если есть домен, направьте A-запись домена на IP сервера.

Потом на сервере:

```bash
apt install -y certbot python3-certbot-nginx
certbot --nginx -d YOUR_DOMAIN
```

После этого сайт будет доступен:

```text
https://YOUR_DOMAIN
```

## 7. Первый вход

Стартовый владелец:

```text
Логин: owner
Пароль: change-me-123
```

Сразу после входа поменяйте пароль владельца в админке.

## 8. Где смотреть ошибки

```bash
journalctl -u ozon-dashboard -f
```

Перезапуск:

```bash
systemctl restart ozon-dashboard
```

