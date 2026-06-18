# Wishly 🎁

Wishlist condivisa per compleanni — React + Vite + Tailwind + Node/Express + Supabase.

---

## Setup iniziale (da fare una volta)

### 1. Installa Node.js

Apri il Terminale e installa Node via Homebrew (se non hai Homebrew: https://brew.sh):

```bash
brew install node
```

Verifica:
```bash
node --version   # v20+
npm --version
```

---

### 2. Installa le dipendenze

```bash
# Frontend
cd ~/wishly/frontend
npm install

# Backend
cd ~/wishly/backend
npm install
```

---

### 3. Configura Supabase

1. Vai su https://supabase.com → crea un nuovo progetto
2. Nel SQL Editor, incolla e lancia tutto il contenuto di `supabase/schema.sql`
3. In **Settings → API Keys** copia:
   - `Project URL` → `SUPABASE_URL`
   - `Publishable key` (`sb_publishable_...`) → `VITE_SUPABASE_ANON_KEY`
   - `Secret key` (`sb_secret_...`, sezione "Secret keys" — crea la tua se non esiste) → `SUPABASE_SERVICE_KEY`

---

### 4. Crea i file .env

**Frontend** — crea `frontend/.env`:
```env
VITE_SUPABASE_URL=https://xxxx.supabase.co
VITE_SUPABASE_ANON_KEY=sb_publishable_...
```

**Backend** — crea `backend/.env` (copia da `.env.example` e compila):
```env
PORT=4000
FRONTEND_URL=http://localhost:3000
SUPABASE_URL=https://xxxx.supabase.co
SUPABASE_SERVICE_KEY=sb_secret_...  # secret key, accesso privilegiato!

SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=tuaemail@gmail.com
SMTP_PASS=app-password-gmail
```

> Per Gmail: attiva "App password" in sicurezza account Google.

---

### 5. Avvia il progetto

Apri **due** finestre del Terminale:

```bash
# Finestra 1 — Backend
cd ~/wishly/backend
npm run dev

# Finestra 2 — Frontend
cd ~/wishly/frontend
npm run dev
```

Apri il browser su **http://localhost:3000**

---

## Struttura del progetto

```
wishly/
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── Layout.jsx
│   │   │   ├── Navbar.jsx
│   │   │   ├── GiftCard.jsx          ← card regalo con prenotazione
│   │   │   ├── GiftCard.jsx
│   │   │   ├── ProgressBar.jsx       ← barra collettivo
│   │   │   ├── RSVPSelector.jsx      ← selezione presenza
│   │   │   ├── CopyLink.jsx          ← copia link
│   │   │   ├── PaymentModal.jsx      ← modale pagamento
│   │   │   └── StepIndicator.jsx     ← wizard step
│   │   ├── pages/
│   │   │   ├── HomePage.jsx          ← landing page
│   │   │   ├── CreateEventPage.jsx   ← wizard creazione (5 step)
│   │   │   ├── ParentDashboardPage.jsx ← dashboard genitore
│   │   │   ├── GuestWishlistPage.jsx ← lista invitati
│   │   │   ├── CollectiveGiftPage.jsx ← regalo collettivo
│   │   │   └── NotFoundPage.jsx
│   │   ├── lib/
│   │   │   ├── api.js               ← tutte le chiamate API
│   │   │   └── supabase.js
│   │   ├── App.jsx                  ← router
│   │   ├── main.jsx
│   │   └── index.css                ← Tailwind + classi custom
│   ├── tailwind.config.js           ← palette cipria/salvia/avorio
│   ├── vite.config.js
│   └── index.html
│
├── backend/
│   └── src/
│       ├── routes/
│       │   ├── events.js    ← crea evento, token, view tracking, RSVP
│       │   ├── gifts.js     ← CRUD regali, prenotazione/cancellazione
│       │   ├── rsvp.js      ← aggiorna risposta
│       │   └── payments.js  ← Stripe, PayPal, Satispay
│       ├── services/
│       │   └── email.js     ← tutti i template email + cron job
│       ├── lib/
│       │   └── supabase.js
│       └── index.js         ← Express + cron scheduler
│
└── supabase/
    └── schema.sql           ← tabelle + RLS + indici + RPC
```

---

## Flusso URL

| URL | Chi la usa |
|-----|-----------|
| `/` | Landing page pubblica |
| `/crea` | Genitore — wizard creazione |
| `/dashboard/:parentToken` | Genitore — dashboard privato |
| `/lista/:guestToken` | Invitati — wishlist + RSVP |
| `/collettivo/:collectiveToken` | Tutti — regalo collettivo |

---

## Pagamenti

- **Stripe**: integrazione completa con PaymentIntent + webhook
- **PayPal**: link personale (paypal.me) + conferma manuale dell'organizzatore
- **Satispay**: placeholder — richiede setup chiave RSA da pannello Satispay Business

Per i test usa la sandbox di Stripe.

---

## Prossimi step suggeriti

- [ ] Aggiungere autenticazione genitore via magic link (Supabase Auth)
- [ ] Pagina "Ringraziamenti" con invio email di massa post-festa
- [ ] Drag & drop per riordinare i regali
- [ ] Preview immagine regalo da URL Amazon (Open Graph)
- [ ] Realtime updates con Supabase subscriptions
