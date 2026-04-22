<div align="center">

# KoinSim

### Simulatore di Portafoglio Finanziario con Monte Carlo

[![Spring Boot](https://img.shields.io/badge/Spring_Boot-4.0.5-6DB33F?style=for-the-badge&logo=spring-boot&logoColor=white)](https://spring.io/projects/spring-boot)
[![Angular](https://img.shields.io/badge/Angular-18-DD0031?style=for-the-badge&logo=angular&logoColor=white)](https://angular.io/)
[![Java](https://img.shields.io/badge/Java-21-ED8B00?style=for-the-badge&logo=openjdk&logoColor=white)](https://openjdk.org/)
[![MySQL](https://img.shields.io/badge/MySQL-8.0-4479A1?style=for-the-badge&logo=mysql&logoColor=white)](https://www.mysql.com/)
[![Redis](https://img.shields.io/badge/Redis-7-DC382D?style=for-the-badge&logo=redis&logoColor=white)](https://redis.io/)
[![Docker](https://img.shields.io/badge/Docker-Compose-2496ED?style=for-the-badge&logo=docker&logoColor=white)](https://www.docker.com/)

*Crea scenari di investimento, monitora il tuo portafoglio e proietta il futuro con simulazioni stocastiche.*

</div>

---

## Obiettivi del Progetto

**KoinSim** nasce come piattaforma didattica e decisionale per la gestione di portafogli finanziari. L'applicazione permette di:

- **Simulare investimenti** su azioni e criptovalute senza rischiare denaro reale
- **Analizzare scenari multipli** con budget e composizioni diverse
- **Proiettare rendimenti futuri** attraverso modelli matematici avanzati
- **Esplorare distribuzioni probabilistiche** con il metodo Monte Carlo (moto browniano geometrico)

Il progetto copre l'intero stack applicativo: dalla raccolta di dati di mercato in tempo reale, alla persistenza su database, fino alla visualizzazione interattiva su un frontend Angular.

---

## Tech Stack

| Livello | Tecnologia | Versione | Ruolo |
|--------|-----------|---------|-------|
| **Backend Framework** | Spring Boot | 4.0.5 | API REST e orchestrazione |
| **Linguaggio** | Java | 21 | Runtime backend |
| **ORM** | Spring Data JPA / Hibernate | — | Mapping oggetti-relazionale |
| **Database primario** | MySQL | 8.0 | Persistenza dati |
| **Cache** | Redis | 7 | Cache dati di mercato e sessioni |
| **HTTP Client reattivo** | Spring WebFlux / WebClient | — | Chiamate API non bloccanti |
| **Sicurezza** | Spring Security + JWT | jjwt 0.12.3 | Autenticazione & autorizzazione |
| **Statistica** | Apache Commons Math | 3.6.1 | Simulazione Monte Carlo (GBM) |
| **Boilerplate** | Lombok | — | Annotazioni builder/getter |
| **Frontend** | Angular | 18 | SPA single-page application |
| **UI Components** | Angular Material | 18 | Design system Material |
| **Grafica** | Chart.js | 4.4.x | Grafici e visualizzazioni |
| **Linguaggio Frontend** | TypeScript | 5.4 | JavaScript tipizzato |
| **Web Server** | Nginx | alpine | Reverse proxy e file statici |
| **Containerizzazione** | Docker + Docker Compose | — | Deploy multi-container |
| **API Esterne** | Alpha Vantage, CoinGecko | — | Prezzi azioni e crypto |

---

## Funzionalità

### Gestione Utenti
- Registrazione con username, email e password (hashing bcrypt)
- Login con strategia **dual token** (access token 15 min + refresh token 7 giorni)
- Sessioni stateless via JWT — nessun server-side session

### Scenari di Investimento
- Creazione di scenari con budget iniziale immutabile e data di creazione
- Aggiunta di transazioni (acquisto di asset) con prezzo e quantità
- Modifica nome e descrizione scenario
- Eliminazione con cascade sulle transazioni associate
- Panoramica del budget residuo e del valore corrente del portafoglio

### Dati di Mercato in Tempo Reale
- Prezzi OHLC (Open/High/Low/Close) da **Alpha Vantage** (azioni) e **CoinGecko** (crypto)
- Persistenza progressiva su MySQL per arricchire lo storico nel tempo
- Cache Redis a due livelli (TTL 5 min per prezzi correnti, 24h per parametri statistici)
- Export dati storici in formato **CSV**

### Proiezioni e Performance
- Valore corrente del portafoglio calcolato in tempo reale
- P&L storico (performance rispetto al prezzo di acquisto)
- Proiezioni a **6 mesi, 1 anno e 5 anni**

### Simulazione Monte Carlo (GBM)
- Modello **Geometric Brownian Motion** con 10.000 percorsi indipendenti
- Parametri μ (rendimento medio) e σ (volatilità) calcolati da dati storici reali
- Output: distribuzione percentilare **P10 / P50 / P90** del valore futuro
- Orizzonti temporali: 126 giorni, 252 giorni, 1.260 giorni di trading

---

## Architettura del Database

Il database MySQL è composto da **5 entità** con le seguenti relazioni:

```
┌────────────────────────────────────┐
│              utenti                │
│────────────────────────────────────│
│  id (PK)                           │
│  nomeUtente  UNIQUE                │
│  email       UNIQUE                │
│  passwordHash                      │
└────────────────┬───────────────────┘
                 │ 1:N             1:N
         ┌───────┴───────┐
         │               │
         ▼               ▼
┌────────────────┐   ┌──────────────────────────┐
│  transazioni   │   │         scenari           │
│────────────────│   │──────────────────────────│
│  id (PK)       │   │  id (PK)                  │
│  simbolo       │   │  nome                     │
│  tipoAsset     │   │  descrizione              │
│  quantita      │   │  budgetIniziale (immutable)│
│  prezzoDiAcq.  │   │  dataCreazione (immutable) │
│  dataAcquisto  │   │  utente_id (FK)            │
│  utente_id(FK) │   └────────────┬─────────────┘
└───────┬────────┘                │ 1:N
        │                         │
        └──────────┬──────────────┘
                   ▼
        ┌──────────────────────────┐
        │   transazioni_scenario   │  ← junction table
        │──────────────────────────│
        │  id (PK)                 │
        │  transazione_id (FK)     │
        │  scenario_id (FK)        │
        └──────────────────────────┘

┌────────────────────────────────────┐
│          prezzi_storici            │  (standalone)
│────────────────────────────────────│
│  id (PK)                           │
│  simbolo                           │
│  data                              │
│  open, high, low, close            │
│  fonte  ("ALPHA_VANTAGE"|"COINGECKO")│
│  UNIQUE (simbolo, data, fonte)     │
└────────────────────────────────────┘
```

> **Nota di design:** la tabella `transazioni_scenario` è una *junction table* che disaccoppia le transazioni dagli scenari, permettendo potenzialmente il riutilizzo di transazioni tra scenari diversi e garantendo eliminazioni a cascata corrette.

---

## Sicurezza

### Autenticazione JWT — Dual Token Strategy

| Token | Durata | Scopo |
|-------|--------|-------|
| **Access Token** | 15 minuti | Autorizzare le richieste API |
| **Refresh Token** | 7 giorni | Rinnovare silenziosamente l'access token |

- Firma **HMAC SHA-256** con chiave segreta configurabile
- Filter `JwtFilter` (`OncePerRequestFilter`) intercetta ogni richiesta
- Frontend Angular rileva il 401, chiama `/api/auth/refresh` e ritenta automaticamente

### Controllo degli Accessi

- **CORS** limitato all'origine del frontend (`http://localhost:4200`)
- **CSRF** disabilitato (sessioni stateless, nessun cookie)
- **Ownership Check** su ogni operazione sullo scenario: `scenario.utente.id == authenticatedUser.id`
  → Prevenzione IDOR (Insecure Direct Object Reference — OWASP A01:2021)
- **SessionCreationPolicy.STATELESS** — nessuno stato server-side

### Password

- Hashing con **bcrypt** tramite `PasswordEncoder` di Spring Security
- Mai memorizzate in chiaro — solo `passwordHash` su database

---

## Struttura del Progetto

```
progettofinale/
│
├── koinsim/                          # Backend — Spring Boot
│   ├── src/main/java/com/example/koinsim/
│   │   ├── config/                   # Configurazioni (Security, Redis, WebClient)
│   │   ├── controller/               # Controller REST (Auth, Scenario, MarketData)
│   │   ├── model/                    # Entità JPA (Utente, Scenario, Transazione…)
│   │   ├── repository/               # Spring Data JPA Repositories
│   │   ├── service/                  # Business logic (Auth, Scenario, MonteCarlo…)
│   │   ├── security/                 # JwtUtil, JwtFilter
│   │   ├── dto/                      # Request/Response DTO
│   │   └── exception/                # Eccezioni custom e GlobalExceptionHandler
│   ├── Dockerfile
│   ├── Docker-compose.yaml
│   └── pom.xml
│
├── frontend-koinsim/                 # Frontend — Angular 18
│   ├── src/app/
│   │   ├── core/
│   │   │   ├── guards/               # authGuard (protezione rotte)
│   │   │   ├── interceptors/         # jwtInterceptor (iniezione token + refresh)
│   │   │   ├── models/               # Interfacce TypeScript
│   │   │   └── services/             # Servizi API (Auth, Scenario, MarketData)
│   │   ├── features/
│   │   │   ├── auth/                 # Componente Login / Registrazione
│   │   │   ├── scenario-list/        # Lista scenari utente
│   │   │   ├── scenario-dashboard/   # Dashboard dettaglio scenario
│   │   │   └── dialogs/              # Modali (crea scenario, aggiungi transazione)
│   │   └── app.routes.ts             # Routing con lazy loading
│   ├── nginx.conf
│   ├── Dockerfile
│   └── package.json
│
└── DOCUMENTAZIONE.md
```

---

## Deploy con Docker

L'intera applicazione si avvia con un singolo comando:

```bash
# 1. Compila il backend
cd koinsim
mvn clean package -DskipTests

# 2. Avvia tutti i container
cd ..
docker-compose -f koinsim/Docker-compose.yaml up --build
```

### Servizi Docker Compose

| Container | Immagine | Porta | Ruolo |
|-----------|----------|-------|-------|
| `db-koinsim` | `mysql:8.0` | 3307:3306 | Database primario |
| `redis-koinsim` | `redis:7` | 6379:6379 | Cache e sessioni |
| `app-koinsim` | Build locale | 8080:8080 | Backend Spring Boot |
| `frontend-koinsim` | Build locale | 4200:80 | Angular + Nginx |

Tutti i container comunicano sulla rete bridge `koinsim_net`. Le credenziali e le API key vengono iniettate come variabili d'ambiente nel `docker-compose.yaml`.

---

## Pattern Architetturali e di Design

### Pattern Architetturali

| Pattern | Dove | Beneficio |
|---------|------|-----------|
| **Layered Architecture** | Controller → Service → Repository → DB | Separazione delle responsabilità |
| **MVC** | Spring RestController + JPA + JSON | Controller sottili, logica nei service |
| **REST Client-Server** | API JSON stateless | Interoperabilità e scalabilità |
| **Cache-Aside (Lazy Loading)** | Redis + MySQL fallback | Protezione rate limit, latenza ridotta |
| **12-Factor App** | Config via env vars nel Docker Compose | Deployment portabile e sicuro |
| **SPA (Single Page Application)** | Angular + routing client-side | UX fluida senza reload di pagina |

### Design Patterns — Backend

| Pattern | Classe / Posizione | Scopo |
|---------|-------------------|-------|
| **Repository** | `ScenarioRepository`, `PrezzoStoricoRepository` | Astrazione dell'accesso ai dati |
| **Strategy** | `MarketDataService` switch su `TipoAsset` | Selezione algoritmo runtime (STOCK / CRYPTO) |
| **Builder** | `@Builder` Lombok su entità e DTO | Costruzione fluente degli oggetti |
| **DTO** | `ScenarioRequest`, `ScenarioResponse` | Disaccoppiamento modello interno da contratto API |
| **Chain of Responsibility** | `JwtFilter` → `OncePerRequestFilter` | Catena filtri sequenziale Spring Security |
| **Global Exception Handler** | `@RestControllerAdvice` | Risposte di errore uniformi in JSON |
| **Dependency Inversion** | Interfacce di service | Disaccoppiamento client da implementazione |

### Design Patterns — Frontend

| Pattern | Implementazione | Scopo |
|---------|----------------|-------|
| **Service Singleton** | `@Injectable({ providedIn: 'root' })` | Istanza condivisa in tutta l'app |
| **Interceptor (Decorator)** | `jwtInterceptor` — `HttpInterceptorFn` | Iniezione JWT trasparente e refresh automatico |
| **Guard** | `authGuard` — `CanActivateFn` | Protezione dichiarativa delle rotte |
| **Reactive Forms** | `FormBuilder`, `FormGroup`, validators | Form testabili e basati su stato |
| **Lazy Loading** | `loadComponent()` con dynamic import | Bundle iniziale ridotto |
| **Component Input Binding** | `@Input() id` + `withComponentInputBinding()` | Parametri di rotta come input di componente |

---

## Simulazione Monte Carlo — GBM

Il cuore analitico di KoinSim è il modello **Geometric Brownian Motion**:

```
S(t) = S(t-1) × exp( (μ - σ²/2)·Δt + σ·√Δt·Z )
```

dove `Z ~ N(0,1)` è una variabile casuale normale standard.

**Processo:**
1. Calcolo di μ e σ dai rendimenti logaritmici storici di ogni asset
2. Ponderazione dei parametri per la composizione del portafoglio
3. Esecuzione di **10.000 percorsi** per ciascun orizzonte temporale
4. Calcolo dei percentili **P10 / P50 / P90** tramite Apache Commons Math

Il risultato è una distribuzione di probabilità del valore futuro del portafoglio, non una singola previsione.

---

## Principali Endpoint API

```
POST   /api/auth/registrazione          Registrazione nuovo utente
POST   /api/auth/login                  Login → access + refresh token
POST   /api/auth/refresh                Rinnovo access token

GET    /api/scenari                     Lista scenari dell'utente autenticato
POST   /api/scenari                     Crea nuovo scenario
PUT    /api/scenari/{id}                Modifica scenario
DELETE /api/scenari/{id}                Elimina scenario

POST   /api/scenari/{id}/transazioni    Aggiunge transazione allo scenario
DELETE /api/scenari/{id}/transazioni/{tid}

GET    /api/scenari/{id}/proiezioni     P&L storiche e proiezioni future
GET    /api/scenari/{id}/montecarlo     Simulazione Monte Carlo (GBM)

POST   /api/market-data/fetch           Scarica dati da Alpha Vantage / CoinGecko
```

---

<div align="center">

## Autori

| | Nome | GitHub | LinkedIn |
|---|---|---|---|
| 👩‍💻 | **Maria** | [![GitHub](https://img.shields.io/badge/GitHub-your--username-181717?style=flat&logo=github)](https://github.com/your-username) | [![LinkedIn](https://img.shields.io/badge/LinkedIn-Miriam_Baylon-0A66C2?style=flat&logo=linkedin)](https://linkedin.com/in/your-profile) |
| 👨‍💻 | **Gabriele** | [![GitHub](https://img.shields.io/badge/GitHub-your--username-181717?style=flat&logo=github)](https://github.com/your-username) | [![LinkedIn](https://img.shields.io/badge/LinkedIn-Gabriele-0A66C2?style=flat&logo=linkedin)](https://linkedin.com/in/your-profile) |

Sviluppato come progetto accademico · Stack completo full-stack con focus su finanza quantitativa e architetture moderne

</div>
