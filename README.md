# FreelanceLog

Een eenvoudige webapp om freelance-uren te registreren en op te volgen.

## Wat doet de app?

- Gewerkte uren registreren per project/klant
- Overzicht bekijken zonder login (publiek leesbaar)
- Uren toevoegen, aanpassen en verwijderen na login
- Status bijhouden (concept / definitief / nagekeken)

## Lokaal starten

```
npm install
npm run dev
```

Open daarna http://localhost:5173 in je browser.

## Firebase configuratie

1. Maak een project aan op https://console.firebase.google.com
2. Activeer **Firestore Database** (testmodus is OK voor start)
3. Activeer **Authentication** en zet **E-mail/wachtwoord** aan
4. Ga naar Projectinstellingen > Jouw apps > voeg een web-app toe
5. Kopieer de configuratiesleutels naar het `.env` bestand:

```
VITE_FIREBASE_API_KEY=...
VITE_FIREBASE_AUTH_DOMAIN=...
VITE_FIREBASE_PROJECT_ID=...
VITE_FIREBASE_STORAGE_BUCKET=...
VITE_FIREBASE_MESSAGING_SENDER_ID=...
VITE_FIREBASE_APP_ID=...
```

## Deployen naar Firebase Hosting

```
npm run build
npx firebase deploy
```

## Security rules

Zie `firestore.rules`. Samengevat:
- Iedereen mag uren **bekijken**
- Alleen ingelogde gebruikers mogen uren **toevoegen, aanpassen of verwijderen**
