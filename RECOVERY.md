# Piky (Wishly) — Documento di ricostruzione completo

> Aggiornato al 19/06/2026. Questo file serve come "manuale di emergenza":
> se perdi la chat con Claude o l'accesso al computer, con questo documento
> + l'accesso al repository GitHub puoi ricostruire l'app identica.
>
> **Importante**: questo file NON contiene segreti/password reali (chiavi
> API, password email, ecc.) di proposito — sono cose che non vanno mai
> salvate in chiaro in un file. Per ognuna trovi sotto dove recuperarla o
> come rigenerarla. Le password dei vari servizi (Railway, Vercel, Supabase,
> GitHub) restano nel tuo gestore password.

---

## 1. Cos'è l'app

**Piky** (nome di progetto: Wishly) è un'app per organizzare feste di
compleanno per bambini: l'organizzatore crea un evento con una lista
regali, condivide un link con gli invitati, riceve le conferme di
presenza (RSVP), gli invitati prenotano i regali per evitare doppioni, e
c'è anche un "fondo regalo collettivo" per raccogliere contributi in
denaro (via PayPal) per un regalo più grande.

Sito pubblico: **pikyapp.it**

---

## 2. Dove si trova il codice

- **Repository GitHub**: `arrigoni1976-sketch/wishly`
- Branch principale (quello in produzione): `main`
- Tutto il codice è già su GitHub — è la vera "copia di sicurezza", più
  importante di questo file. Se perdi il computer ma hai accesso a GitHub,
  hai tutto.

---

## 3. Stack tecnologico

| Parte | Tecnologia |
|---|---|
| Frontend | React 18 + Vite + Tailwind CSS, PWA (installabile su telefono) |
| Backend | Node.js + Express (ESM, `type: "module"`) |
| Database | Supabase (Postgres gestito) |
| Email | Nodemailer via SMTP (Gmail con App Password) |
| Notifiche push | Web Push (VAPID), chiavi generate e salvate su Supabase |
| Job pianificati | `node-cron`, fuso orario `Europe/Rome` |

---

## 4. Architettura di deploy

```
Browser utente
   │
   ├─► Frontend su Vercel (pikyapp.it / www.pikyapp.it)
   │      build statica React, fatta da "npm run build" in frontend/
   │
   └─► Backend su Railway (api.pikyapp.it → dominio custom puntato al
          servizio Railway "Wishly", progetto "passionate-flexibility")
             │
             └─► Supabase (database Postgres + storage chiavi VAPID)
```

- **Vercel**: progetto collegato alla repo GitHub, branch `main`. Ogni
  push su `main` triggera un deploy automatico. Le variabili d'ambiente si
  impostano in *Project Settings → Environments → Production →
  Environment Variables* — dopo averle cambiate serve un **Redeploy**
  manuale (Vite "cuoce" le env var dentro al build, non sono dinamiche a
  runtime).
- **Railway**: stesso discorso, collegato a GitHub branch `main`, deploy
  automatico ad ogni push. Variabili nel tab **Variables** del servizio
  "Wishly". Il tab **Console** dà una shell interattiva nel container in
  produzione, utile per diagnosticare problemi senza dover loggare
  segreti.
- **Supabase**: progetto unico, sia per dev che produzione (non c'è un
  ambiente di staging separato — tenerlo a mente quando si fanno test).

---

## 5. Struttura del repository

```
wishly/
├── frontend/
│   ├── src/
│   │   ├── components/      ← GiftCard, ProgressBar, PaymentModal, ecc.
│   │   ├── pages/            ← HomePage, CreateEventPage, ParentDashboardPage,
│   │   │                       GuestWishlistPage, CollectiveGiftPage, AdminPage...
│   │   ├── lib/               ← api.js (chiamate HTTP), supabase.js
│   │   ├── App.jsx            ← router (react-router-dom)
│   │   └── sw.js              ← service worker PWA
│   └── vite.config.js
│
├── backend/
│   └── src/
│       ├── routes/            ← events, gifts, rsvp, payments, userkeys, admin, push
│       ├── services/          ← email.js (template + cron), adminStats.js,
│       │                        push.js, retention.js
│       ├── lib/                ← supabase.js, utils.js, rateLimit.js
│       └── index.js            ← entrypoint Express + scheduler cron
│
└── supabase/
    ├── schema.sql              ← schema completo e consolidato del DB
    └── migrations/             ← storico migrazioni (già incorporate in schema.sql)
```

---

## 6. Variabili d'ambiente

### Backend (`backend/.env`, mai committato in git)

| Variabile | A cosa serve | Dove recuperarla/rigenerarla |
|---|---|---|
| `PORT` | Porta locale (default 4000) | — |
| `FRONTEND_URL` | URL frontend usato nei link delle email | `https://www.pikyapp.it` in produzione |
| `SUPABASE_URL` | URL progetto Supabase | Supabase → Settings → API |
| `SUPABASE_SERVICE_KEY` | Chiave **segreta** con accesso pieno al DB (bypassa le regole di sicurezza) | Supabase → Settings → API Keys → tab "Publishable and secret API keys" → sezione Secret keys. **Non esporla mai lato frontend.** |
| `ADMIN_KEY` | Password per entrare in `/admin` | Generala tu: stringa lunga e casuale (es. `openssl rand -base64 24`) |
| `ADMIN_EMAIL` | Email a cui arriva il resoconto settimanale (cron lunedì 8:00) | — |
| `SMTP_HOST` / `SMTP_PORT` / `SMTP_USER` / `SMTP_PASS` | Invio email (conferme, reminder, ringraziamenti) | Per Gmail: account Google → Sicurezza → "Password per le app" |
| `PAYPAL_CLIENT_ID` / `PAYPAL_CLIENT_SECRET` / `PAYPAL_MODE` | Placeholder, non collegati a codice funzionante (vedi §11) | — |
| `SATISPAY_ENV` | Placeholder, l'integrazione Satispay non è implementata (vedi §11) | — |
| `LAUNCH_DATE` | (opzionale) Data ISO di lancio ufficiale; le statistiche admin contano solo gli eventi creati da questa data in poi. Default se non impostata: `2026-06-20T00:00:00.000Z` | — |

### Frontend (`frontend/.env`, mai committato in git)

| Variabile | A cosa serve | Dove recuperarla |
|---|---|---|
| `VITE_SUPABASE_URL` | Stesso URL del backend | Supabase → Settings → API |
| `VITE_SUPABASE_ANON_KEY` | Chiave **pubblica** "publishable" (`sb_publishable_...`) — sicura da esporre nel browser | Supabase → Settings → API Keys → Publishable key |
| `VITE_API_URL` | URL base del backend | `https://api.pikyapp.it` in produzione |

> Riferimento completo con placeholder: `backend/.env.example` e
> `frontend/.env.example` nel repository.

---

## 7. Schema del database

Tutto lo schema è in **`supabase/schema.sql`** — è il file consolidato,
basta eseguirlo una volta nel SQL Editor di un progetto Supabase nuovo per
ricreare tutto da zero (tabelle, indici, funzione RPC, RLS). Non serve
rieseguire i file in `supabase/migrations/`, sono già incorporati.

Tabelle principali:

- **`events`** — un record per festa: dati del bambino/a, data/luogo,
  email genitore, i 3 token di accesso (`parent_token`, `guest_token`,
  `collective_token`), dati del fondo collettivo, campi di analytics
  (utm, referral, timestamp di prima RSVP/primo regalo prenotato).
- **`gifts`** — regali della lista, con `reserved_by` per la prenotazione.
- **`rsvp`** — risposte degli invitati (yes/maybe/no), con vincoli unique
  per evitare doppioni anche case-insensitive.
- **`contributions`** — contributi al fondo collettivo, con `edit_token`
  per permettere a chi ha contribuito di modificare il proprio contributo.
- **`link_views`** — tracking visualizzazioni (device/os/browser) per le
  statistiche admin.
- **`user_keys`** / **`user_key_links`** — codice personale anonimo che
  permette a un genitore di ritrovare le proprie liste da un altro
  dispositivo, senza account/login.
- **`push_subscriptions`** — sottoscrizioni alle notifiche push.
- **`app_settings`** — coppie chiave/valore generiche (qui vengono
  salvate le chiavi VAPID generate automaticamente al primo avvio del
  backend).

Punti di sicurezza/robustezza importanti incorporati nello schema:

- **`increment_collective_amount(event_id, amount)`** — funzione RPC che
  incrementa il fondo collettivo e applica il tetto massimo
  (`collective_goal`) in un'unica operazione atomica, eliminando il
  rischio di race condition tra contributi simultanei.
- Prenotazione regalo: l'`UPDATE` su `gifts` usa `.is('reserved_by',
  null)` come guardia direttamente nella query — due richieste
  concorrenti non possono mai prenotare lo stesso regalo entrambe.
- RSVP: vincolo unique sia case-sensitive che case-insensitive su
  `(event_id, guest_name)`, più `idempotency_key` per evitare submit
  duplicati da retry di rete.
- RLS (Row Level Security) attiva su tutte le tabelle: l'accesso pubblico
  passa sempre dal backend (che usa la service key e bypassa le RLS), non
  c'è accesso diretto dal frontend al database.

---

## 8. Endpoint API principali

Tutti sotto il prefisso `/api`.

| Endpoint | Cosa fa |
|---|---|
| `POST /events` | Crea un nuovo evento |
| `GET /events/parent/:token` | Dashboard organizzatore |
| `GET /events/guest/:token` | Vista invitati (lista regali + RSVP) |
| `GET /events/collective/:token` | Pagina pubblica fondo collettivo |
| `PUT /events/:id` | Modifica dettagli evento / fondo collettivo |
| `POST /events/:id/gifts` | Aggiunge un regalo |
| `POST /events/:id/rsvp` | Invia una conferma di presenza |
| `POST /events/:id/contributions` | Contributo al fondo collettivo |
| `PATCH /events/:id/contributions/:cid/confirm` | Conferma manuale contributo (organizzatore) |
| `POST /events/:id/thank-you` | Invio email di ringraziamento agli invitati |
| `PUT /gifts/:id` · `DELETE /gifts/:id` | Modifica/elimina un regalo |
| `POST /gifts/:id/reserve` · `DELETE /gifts/:id/reserve` | Prenota/annulla prenotazione |
| `PUT /rsvp/:id` | Modifica una RSVP esistente |
| `POST /payments/satispay/init` | **Placeholder**, non funzionante (§11) |
| `POST /user-keys/register` | Crea un codice personale anonimo |
| `GET /user-keys/:key` | Recupera le liste collegate a un codice |
| `POST /push/subscribe` | Sottoscrizione notifiche push |
| `GET /admin/stats?key=ADMIN_KEY` | Statistiche dashboard admin |
| `GET /health` | Health check |

---

## 9. Job pianificati (cron, fuso `Europe/Rome`)

| Orario | Cosa fa |
|---|---|
| Ogni giorno 08:00 | Notifica push "follow-up" il giorno dopo la festa |
| Ogni giorno 09:00 | Email reminder 2 giorni prima della festa |
| Ogni giorno 19:01 | Riepilogo di chiusura lista (la lista chiude alle 19:00) + push |
| Ogni giorno 04:00 | Pulizia dati: elimina eventi più vecchi di 3 mesi (retention/privacy) |
| Ogni lunedì 08:00 | Resoconto settimanale via email a `ADMIN_EMAIL` (se impostata) |

---

## 10. Cose da ricordare sulla logica di business

- **`LAUNCH_DATE`**: le statistiche admin (`/admin/stats`) contano solo
  gli eventi con `created_at >= LAUNCH_DATE`. Di default è il 20/06/2026
  (data di lancio). Utile per non far apparire dati di test nelle
  statistiche "ufficiali", ma da ricordare se si fanno verifiche prima del
  lancio: un evento creato il 18 o 19 giugno **non comparirà** nei numeri
  admin finché non si cambia/rimuove questa variabile.
- **Token di accesso**: non c'è login/password per gli utenti. Tutto si
  basa su 3 UUID generati alla creazione evento (`parent_token` per
  l'organizzatore, `guest_token` per gli invitati, `collective_token` per
  il fondo collettivo) — chi ha il link ha accesso. Sono trattati come
  "capability token": vanno protetti come una password nei link condivisi.
- **`/admin`** è protetto da una singola chiave statica (`ADMIN_KEY`) in
  query string — adeguato per un solo amministratore, non scalabile a più
  utenti con permessi diversi.

---

## 11. Cose NON implementate / placeholder

- **Satispay**: l'endpoint `POST /payments/satispay/init` esiste ma è
  solo un placeholder che richiede setup di chiavi RSA — non fa nessuna
  vera chiamata a Satispay. **Non è comunque raggiungibile dal frontend**
  (nessun componente lo chiama), quindi non è un problema per gli utenti
  reali, è codice predisposto per il futuro.
- **Stripe**: il vecchio README menzionava un'integrazione Stripe
  "completa" — non è vero, non esiste alcun codice Stripe nel backend
  attuale. L'unico metodo di pagamento realmente funzionante oggi è
  **PayPal** (link personale `paypal.me` + conferma manuale
  dell'organizzatore).
- **Monetizzazione eventi** (prezzo dal secondo evento in poi): la logica
  di calcolo esiste già nelle statistiche admin (`pricePerEvent`,
  `potentialRevenue`), ma `paymentActive` è sempre `false` — è solo una
  stima, non c'è ancora un sistema di pagamento collegato alla creazione
  di nuovi eventi.

---

## 12. Come ricostruire tutto da zero

1. **Clona il repository**: `git clone` di `arrigoni1976-sketch/wishly`,
   branch `main`.
2. **Crea un nuovo progetto Supabase** (o riusa quello esistente se è
   ancora accessibile) → esegui `supabase/schema.sql` nel SQL Editor.
3. **Recupera/genera le chiavi Supabase** (§6) e compila `backend/.env` e
   `frontend/.env` partendo dai rispettivi `.env.example`.
4. **Backend**: `cd backend && npm install && npm run dev` (porta 4000
   di default).
5. **Frontend**: `cd frontend && npm install && npm run dev` (porta 5173
   o 3000 secondo config Vite).
6. **Deploy produzione**:
   - Railway: crea un servizio collegato al repo GitHub, root directory
     `backend/`, branch `main`, imposta le variabili d'ambiente (§6),
     collega il dominio `api.pikyapp.it`.
   - Vercel: crea un progetto collegato al repo GitHub, root directory
     `frontend/`, branch `main`, imposta le variabili d'ambiente (§6),
     collega i domini `pikyapp.it` / `www.pikyapp.it`.
7. **DNS**: i domini vanno puntati rispettivamente a Vercel (frontend) e
   Railway (backend, sottodominio `api.`) — controlla la configurazione
   attuale sul tuo provider DNS se devi rifare tutto da capo.

---

## 13. Cronologia bug critici risolti (per non ripeterli)

- **Bug `.gte()` in `adminStats.js`**: in supabase-js v2, i metodi filtro
  (`.gte()`, `.eq()`, ecc.) si possono chiamare solo **dopo** `.select()`,
  non direttamente su `.from(tabella)`. Un refactor aveva introdotto
  questo errore, mai notato perché `ADMIN_KEY` non era mai stato
  impostato in produzione (le richieste fallivano prima con 401,
  mascherando il vero errore 500 sottostante). Risolto ristrutturando le
  query in `adminStats.js`.
- **Deploy "fantasma"**: il backend Railway è collegato al branch `main`,
  ma per un periodo i fix erano stati pushati solo su un branch di
  lavoro separato senza mai fare merge in `main` — quindi Railway
  continuava a girare con codice vecchio nonostante i commit fossero su
  GitHub. Lezione: dopo ogni push importante, verificare sempre che sia
  arrivato anche su `main` (o sul branch effettivamente collegato al
  deploy).
- **Modale "Aggiungi/Modifica regalo" senza gestione errori**: se il
  salvataggio falliva, lo spinner di caricamento restava bloccato
  all'infinito senza nessun messaggio per l'utente. Risolto aggiungendo
  try/catch con messaggio di errore visibile in `ParentDashboardPage.jsx`.
- **`.env` finiti per errore nel tracking Git**: file con segreti reali
  erano committati nonostante il `.gitignore` (problema preesistente da
  prima che le regole fossero aggiunte). Rimossi dal tracking; la chiave
  Supabase esposta nello storico Git è stata ruotata per sicurezza
  (vecchio sistema di chiavi JWT disabilitato, migrato al nuovo sistema
  `sb_publishable_...` / `sb_secret_...`).

---

## 14. Dove sono le credenziali reali

Di proposito **non in questo file**. Le password/chiavi attuali dei
servizi (Railway, Vercel, Supabase, account Gmail per SMTP, `ADMIN_KEY`,
`SUPABASE_SERVICE_KEY`) vivono solo:

- nei pannelli di controllo dei rispettivi servizi (Railway → Variables,
  Vercel → Environment Variables, Supabase → Settings → API Keys);
- nel tuo gestore password personale, se le hai salvate lì.

Se le perdi tutte, ogni chiave/password in questa lista si può
**rigenerare da zero** dal pannello del servizio corrispondente — è il
motivo per cui questo documento dice "dove recuperarla" invece di
scriverla. Le uniche cose che *non* si possono rigenerare se perse per
sempre sono i dati già nel database Supabase (eventi, regali, RSVP
reali) — per quelli serve un backup separato del database stesso
(Supabase → Database → Backups), che è fuori dallo scopo di questo file.
