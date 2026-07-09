# Deploy REG.RU: Ozon Dashboard 3801

Эта копия подготовлена для аккаунта:

```text
Пользователь: filkina-gramota3801
Ozon Client ID: 3801
Аккаунт: Филькина Грамота
```

В `dashboard_config.json` оставлен только этот пользователь и только аккаунт `3801`.

## Обновление на сервере

Скопируйте содержимое этой папки на сервер в `/opt/ozon-dashboard`, затем выполните:

```bash
cd /opt/ozon-dashboard
python3 -m venv .venv
.venv/bin/pip install -r requirements.txt
systemctl restart ozon-dashboard
systemctl status ozon-dashboard
```

Если сервис или nginx еще не настроены, используйте файлы из папки `deploy/`.

## Проверка

```bash
journalctl -u ozon-dashboard -f
```
