# KoinSim Frontend

Frontend Angular 17 per l'applicazione **KoinSim** — simulatore di portafoglio crypto & stock con proiezioni Monte Carlo.

---

## Requisiti

| Strumento | Versione minima |
|-----------|----------------|
| Node.js   | 18+            |
| npm       | 9+             |
| Docker    | 24+            |
| Docker Compose | 2+        |

---

## Avvio rapido

### Opzione 1 — Docker (consigliata, tutto insieme)

Avvia backend + frontend + MySQL + Redis con un solo comando:

```bash
cd koinsim          # entra nella cartella del backend
docker-compose up --build
```

| Servizio   | URL                        |
|------------|----------------------------|
| Frontend   | http://localhost:4200      |
| Backend    | http://localhost:8080      |
| MySQL      | localhost:3306             |
| Redis      | localhost:6379             |

> Il frontend usa nginx che fa da **reverse proxy** verso il backend: tutte le chiamate `/api/*` vengono inoltrate automaticamente a `http://app-koinsim:8080`, senza problemi CORS.

Per fermare tutto:
```bash
docker-compose down
```

Per ricostruire solo il frontend dopo modifiche:
```bash
docker-compose up --build frontend-koinsim
```

---

### Opzione 2 — Sviluppo locale (hot reload)

Assicurati che il backend Spring Boot sia già in esecuzione su `localhost:8080`.

```bash
# 1. Entra nella cartella frontend
cd koinsim-frontend

# 2. Installa le dipendenze (solo la prima volta)
npm install

# 3. Avvia il dev server con proxy verso il backend
npm start
```

L'app sarà disponibile su **http://localhost:4200**

Il file `proxy.conf.json` reindirizza automaticamente tutte le chiamate `/api/*` al backend su `localhost:8080`, quindi non servono configurazioni CORS.

---

## Struttura del progetto

```
koinsim-frontend/
├── Dockerfile              # Build multi-stage: Node (build) → Nginx (serve)
├── nginx.conf              # Config Nginx: SPA routing + proxy /api → backend
├── proxy.conf.json         # Proxy dev server → localhost:8080
├── angular.json            # Config Angular CLI
├── package.json
├── tsconfig.json
└── src/
    ├── index.html
    ├── main.ts
    ├── styles.scss          # Variabili CSS globali, dark theme
    └── app/
        ├── app.component.ts
        ├── app.config.ts    # Provider: Router, HttpClient, Animations
        ├── app.routes.ts    # Routing con lazy loading
        ├── core/
        │   ├── guards/
        │   │   └── auth.guard.ts          # Blocca rotte se non loggato
        │   ├── interceptors/
        │   │   └── auth.interceptor.ts    # Aggiunge Bearer token + refresh auto
        │   ├── models/
        │   │   └── models.ts              # Tutti i tipi TypeScript
        │   └── services/
        │       ├── auth.service.ts        # Login, registrazione, logout, refresh
        │       ├── portfolio.service.ts   # Transazioni e portafoglio reale
        │       ├── scenario.service.ts    # CRUD scenari + proiezioni
        │       └── market-data.service.ts # Fetch dati storici
        ├── shared/
        │   └── navbar/
        │       └── navbar.component.ts   # Navbar desktop + bottom nav mobile
        └── pages/
            ├── login/
            ├── register/
            ├── dashboard/        # KPI cards + grafico allocazione (Doughnut)
            ├── transactions/     # Portafoglio reale: aggiungi/elimina asset
            ├── scenarios/
            │   ├── scenario-list.component.ts    # Lista scenari + crea nuovo
            │   └── scenario-detail.component.ts  # Asset + proiezioni (Line chart)
            └── market-data/      # Recupero μ/σ per simulazione Monte Carlo
```

---

## Pagine dell'applicazione

### Login / Register
- Form con validazione
- JWT salvato in `localStorage` (`accessToken`, `refreshToken`)
- Refresh automatico del token su risposta 401

### Dashboard
- Valore totale, costo, P&L, numero posizioni
- Grafico Doughnut con allocazione del portafoglio
- Lista delle posizioni con P&L colorato

### Portafoglio (Transazioni reali)
- Aggiunta transazioni: simbolo, tipo (CRYPTO/STOCK), quantità
- Il prezzo di acquisto viene recuperato automaticamente dal backend
- Tabella con eliminazione singola

### Scenari di Simulazione
- Crea scenari virtuali con budget iniziale
- Barra di avanzamento budget rimanente
- Naviga al dettaglio di ogni scenario

### Dettaglio Scenario
- Aggiunta asset con data di acquisto personalizzata
- Calcolo proiezioni Monte Carlo con un click
- Grafico Line chart: Oggi → 6 Mesi → 1 Anno → 5 Anni
- KPI stimati con indicatore P&L colorato

### Market Data
- Recupera dati storici da CoinGecko (crypto) o Alpha Vantage (azioni)
- Mostra μ (mu), σ (sigma), Sharpe Ratio stimato
- Indica se il risultato proviene dalla cache Redis
- Esempi cliccabili per popolamento rapido del form

---

## Autenticazione

Il flusso JWT funziona così:

```
Login → accessToken + refreshToken salvati in localStorage
       ↓
Ogni richiesta → header "Authorization: Bearer <accessToken>"
       ↓
Se 401 → tenta refresh automatico con refreshToken
       ↓
Se refresh fallisce → logout forzato e redirect a /login
```

---

## Build di produzione

```bash
cd koinsim-frontend
npm run build
# Output in dist/koinsim-frontend/browser/
```

---

## Comandi utili

```bash
# Avvia tutto con Docker
docker-compose up --build

# Solo il frontend (se il backend è già up)
docker-compose up --build frontend-koinsim

# Ferma tutto e rimuovi i container
docker-compose down

# Ferma tutto e rimuovi anche i volumi (reset DB)
docker-compose down -v

# Vedi i log del frontend
docker logs angular_app -f

# Vedi i log del backend
docker logs spring_app -f

# Dev locale con hot reload
cd koinsim-frontend && npm start
```

---

## Tecnologie utilizzate

| Libreria | Versione | Scopo |
|----------|----------|-------|
| Angular | 17.3 | Framework UI, standalone components |
| Angular Material | 17.3 | Componenti UI (form, tabelle, snackbar) |
| Chart.js | 4.4 | Grafici (Doughnut, Line) |
| RxJS | 7.8 | Gestione asincrona, interceptor |
| Nginx | alpine | Serve SPA + reverse proxy in produzione |
