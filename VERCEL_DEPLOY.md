# Деплой на Vercel

## Швидкий старт

### 1. Реєстрація на Vercel
- Перейди на [vercel.com](https://vercel.com)
- Зареєструйся через GitHub (рекомендовано)

### 2. Імпорт проекту
- Натисни "Add New Project"
- Імпортуй репозиторій з GitHub
- Або завантаж код через `vercel` CLI

### 3. Налаштування Environment Variables
У налаштуваннях проекту на Vercel додай ці змінні оточення:

```
VITE_FIREBASE_API_KEY=AIzaSyAZEqsrQXXTWKxFnNl6aqnfPYgCCn1bdKI
VITE_FIREBASE_AUTH_DOMAIN=mainstage-96485.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=mainstage-96485
VITE_FIREBASE_STORAGE_BUCKET=mainstage-96485.firebasestorage.app
VITE_FIREBASE_MESSAGING_SENDER_ID=592401500647
VITE_FIREBASE_APP_ID=1:592401500647:web:6d040e35521af3e6e69542
VITE_CALENDAR_STANDART_EMAIL=tkb2ruijc0qk1daluisq2op9kg@group.calendar.google.com
VITE_CALENDAR_MAIN_EMAIL=mstagestudio@gmail.com
```

### 4. Налаштування Build
Vercel автоматично розпізнає Vite, але переконайся що:
- **Framework Preset:** Vite
- **Build Command:** `npm run build` (або `npm run vercel-build`)
- **Output Directory:** `dist`

### 5. Деплой
Натисни "Deploy" і чекай на завершення збірки.

---

## Деплой через CLI

```bash
# Встановлення Vercel CLI
npm i -g vercel

# Логін
vercel login

# Деплой
vercel --prod
```

---

## Після деплою

### Firebase Auth домен
Додай домен Vercel в налаштування Firebase:
1. Firebase Console → Authentication → Settings → Authorized domains
2. Додай: `your-project.vercel.app`

### Google Calendar OAuth
Якщо використовуєш Google Calendar:
1. Google Cloud Console → APIs & Services → Credentials
2. Додай URI: `https://your-project.vercel.app`
3. Додай redirect URI: `https://your-project.vercel.app`

---

## Файли конфігурації

- `vercel.json` - конфігурація Vercel
- `vite.config.ts` - конфігурація Vite
- `.env.example` - приклад змінних оточення
- `package.json` - скрипти для збірки
