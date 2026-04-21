# KoinSim — Documentazione Tecnica

**Simulatore di portafoglio finanziario** per azioni (stock) e criptovalute, con proiezioni storiche e simulazione Monte Carlo.

---

## Indice

1. [Panoramica del sistema](#1-panoramica-del-sistema)
2. [Stack tecnologico](#2-stack-tecnologico)
3. [Architettura generale](#3-architettura-generale)
4. [Distinzione tra pattern architetturali e di design](#4-distinzione-tra-pattern-architetturali-e-di-design)
5. [Backend — Pattern architetturali](#5-backend--pattern-architetturali)
6. [Backend — Pattern di design](#6-backend--pattern-di-design)
7. [Frontend — Pattern architetturali](#7-frontend--pattern-architetturali)
8. [Frontend — Pattern di design](#8-frontend--pattern-di-design)
9. [Modello dei dati](#9-modello-dei-dati)
10. [API REST](#10-api-rest)
11. [Sicurezza](#11-sicurezza)
12. [Caching e persistenza](#12-caching-e-persistenza)
13. [Algoritmo Monte Carlo](#13-algoritmo-monte-carlo)
14. [Deployment con Docker](#14-deployment-con-docker)
15. [Motivazione delle scelte tecnologiche](#15-motivazione-delle-scelte-tecnologiche)

---

## 1. Panoramica del sistema

KoinSim consente a utenti registrati di creare **scenari di investimento virtuali** con un budget predefinito, popolarli con transazioni simulate su stock e crypto, e analizzarne le proiezioni di valore nel tempo tramite:

- **Proiezioni deterministiche**: valore del portafoglio a oggi, +6 mesi, +1 anno, +5 anni calcolato con prezzi reali (storici o correnti).
- **Simulazione Monte Carlo (GBM)**: distribuzione probabilistica del valore futuro su 10.000 percorsi simulati con Geometric Brownian Motion, restituendo i percentili 10°/50°/90°.

Fonti dati esterne:
- **Alpha Vantage** — dati storici OHLC e prezzo corrente per le azioni (STOCK).
- **CoinGecko** — dati storici OHLC e prezzo corrente per le criptovalute (CRYPTO).

---

## 2. Stack tecnologico

| Layer | Tecnologia | Versione |
|---|---|---|
| Backend | Spring Boot | 4.0.5 |
| Linguaggio backend | Java | 21 |
| Build tool | Maven | — |
| ORM | Spring Data JPA / Hibernate | — |
| Database | MySQL | 8.0 |
| Cache | Redis | 7 |
| Client HTTP reattivo | Spring WebFlux / WebClient | — |
| Sicurezza | Spring Security + JWT (jjwt 0.12.3) | — |
| Calcolo statistico | Apache Commons Math 3 | 3.6.1 |
| Boilerplate | Lombok | — |
| Frontend | Angular | 18 |
| UI Components | Angular Material | 18 |
| Grafici | Chart.js | 4.4.x |
| Linguaggio frontend | TypeScript | 5.4 |
| Web server (prod) | Nginx | alpine |
| Containerizzazione | Docker + Docker Compose | — |

---

## 3. Architettura generale

L'applicazione segue un'architettura **client-server a tre tier** containerizzata:

```
┌─────────────────────────────────────────────────────┐
│                  Docker Network: koinsim_net         │
│                                                      │
│  ┌──────────────┐    /api/*    ┌──────────────────┐ │
│  │  Angular SPA │ ──────────► │  Spring Boot API  │ │
│  │  (Nginx :80) │  proxy_pass  │  (Java :8080)    │ │
│  └──────────────┘             └────────┬─────────┘ │
│                                        │            │
│                          ┌─────────────┼──────────┐ │
│                          │             │          │ │
│                   ┌──────▼───┐   ┌────▼──────┐   │ │
│                   │  MySQL   │   │   Redis   │   │ │
│                   │  :3306   │   │   :6379   │   │ │
│                   └──────────┘   └───────────┘   │ │
│                                                   │ │
│                     ┌──────────────────────────┐  │ │
│                     │  Alpha Vantage / CoinGecko│  │ │
│                     │  (API esterne via HTTPS)  │  │ │
│                     └──────────────────────────┘  │ │
└─────────────────────────────────────────────────────┘
```

Nginx funge da **reverse proxy**: serve i file statici Angular e inoltra le richieste `/api/*` al backend Spring Boot nello stesso network Docker, eliminando i problemi CORS in produzione e nascondendo l'indirizzo del backend al client.

---

## 4. Distinzione tra pattern architetturali e di design

Prima di entrare nel dettaglio è fondamentale chiarire la differenza tra le due categorie, poiché spesso vengono confuse.

### Pattern architetturali

Un **pattern architetturale** definisce la struttura ad alto livello dell'intero sistema o di un sottosistema rilevante. Risponde alla domanda: *"Come è organizzato il sistema nel suo complesso?"*

- Agisce a livello di sistema o macrocomponente.
- Riguarda come i moduli principali si relazionano tra loro, come fluiscono i dati, dove risiede la logica.
- Esempi classici: Layered Architecture, MVC, Client-Server, Microservices, Event-Driven.

### Pattern di design

Un **pattern di design** (o design pattern) è una soluzione riutilizzabile a un problema ricorrente a livello di codice, all'interno di un singolo componente o tra pochi componenti. Risponde alla domanda: *"Come risolvo questo specifico problema di implementazione?"*

- Agisce a livello di classi, oggetti e collaborazioni locali.
- Non prescrive la struttura dell'intero sistema, ma suggerisce come costruire una singola parte in modo flessibile e manutenibile.
- Esempi classici (GoF — Gang of Four): Builder, Strategy, Repository, Decorator, Singleton, Chain of Responsibility.

In sintesi:

| Aspetto | Pattern architetturale | Pattern di design |
|---|---|---|
| Granularità | Sistema / macrocomponente | Classe / oggetto / collaborazione locale |
| Visibilità | Visibile nella struttura delle cartelle e dei moduli | Visibile nell'implementazione delle classi |
| Scopo | Organizzare l'intero sistema | Risolvere un problema ricorrente nel codice |
| Esempi in questo progetto | Layered Architecture, MVC, Client-Server, Cache-Aside | Builder, Strategy, Repository, Filter Chain, DTO |

---

## 5. Backend — Pattern architetturali

### 5.1 Layered Architecture (Architettura a strati)

Il backend è organizzato in strati orizzontali con dipendenze unidirezionali, dall'alto verso il basso. Ogni strato dipende solo dallo strato immediatamente inferiore e non conosce quello superiore.

```
┌──────────────────────────────────────┐
│          Controller Layer            │  ← riceve HTTP, delega, risponde
├──────────────────────────────────────┤
│           Service Layer              │  ← logica di business e orchestrazione
├──────────────────────────────────────┤
│         Repository Layer             │  ← accesso al dato (JPA/SQL)
├──────────────────────────────────────┤
│       Database (MySQL / Redis)       │  ← persistenza
└──────────────────────────────────────┘
```

Ogni strato ha una responsabilità esclusiva:

| Strato | Package | Responsabilità |
|---|---|---|
| **Controller** | `controller/` | Riceve richieste HTTP, delega al Service, restituisce `ResponseEntity` |
| **Service** | `service/` | Logica di business, orchestrazione, validazioni semantiche |
| **Repository** | `repository/` | Accesso al database tramite Spring Data JPA |
| **Model** | `model/` | Entità JPA — mapping oggetto-relazionale |
| **DTO** | `dto/` | Oggetti di trasferimento dati tra strati e verso il client |
| **Config** | `config/` | Configurazione bean Spring (Security, Cache, WebClient) |
| **Security** | `security/` | Filtro JWT e utility per token |

**Motivazione**: la separazione in strati garantisce bassa dipendenza e alta coesione. Ogni strato può essere testato in isolamento e sostituito (es. cambiare database) senza impatti sugli strati superiori.

---

### 5.2 MVC (Model-View-Controller)

Spring Boot implementa MVC nello strato web. Il **Controller** gestisce le richieste HTTP, il **Model** è la logica nei Service, la **View** è la rappresentazione JSON prodotta da Jackson.

```
HTTP Request → @RestController (C) → @Service (M) → JSON Response (V)
```

I controller non contengono logica: ricevono input, delegano al service, restituiscono output. Questo principio viene chiamato **Thin Controller, Fat Service** ed è una specializzazione di MVC.

```java
// ScenarioController.java — il controller si limita a delegare
@GetMapping("/{id}")
public ResponseEntity<ScenarioResponse> dettaglio(
        @PathVariable Long id,
        @AuthenticationPrincipal UserDetails utente) {
    return ResponseEntity.ok(scenarioService.dettaglio(id, utente.getUsername()));
}
```

**Motivazione**: separare la logica HTTP dalla logica di business rende i controller testabili (mock del service), mantiene i service riusabili (possono essere chiamati da più controller o da task schedulati), e il codice leggibile.

---

### 5.3 Client-Server con API REST

Il sistema adotta il paradigma **Client-Server** con interfaccia **REST** (Representational State Transfer):

- Comunicazione stateless: ogni richiesta è autonoma e contiene tutte le informazioni necessarie (token JWT nell'header).
- Risorse identificate da URI (`/api/scenari/{id}`).
- Operazioni espresse tramite verbi HTTP (`GET`, `POST`, `PUT`, `DELETE`).
- Formato di scambio: JSON.

**Motivazione**: REST è uno standard de facto per le API web, interoperabile con qualsiasi client (browser, app mobile, strumenti di test). La statelessness consente di scalare orizzontalmente il backend senza condividere stato di sessione.

---

### 5.4 Cache-Aside (Lazy Loading Cache)

La gestione dei dati di mercato segue il pattern architetturale **Cache-Aside**, in cui l'applicazione governa direttamente la cache invece di delegarne la gestione all'infrastruttura:

```
Request
   │
   ▼
Cache hit? ──Yes──► leggi da Redis → risposta (nessuna API call)
   │No
   ▼
Chiama API esterna (Alpha Vantage / CoinGecko)
   │
   ▼
Persisti su MySQL + CSV
   │
   ▼
Scrivi in Redis (TTL 24h)
   │
   ▼
Risposta
```

I prezzi correnti usano `@Cacheable` di Spring Cache (TTL 5 minuti). I parametri mu/sigma per Monte Carlo usano chiavi Redis esplicite (TTL 24 ore).

**Motivazione**: le API esterne hanno rate-limit severi (Alpha Vantage: 25 req/giorno nel piano gratuito). La cache evita chiamate ridondanti, riduce la latenza e protegge dall'esaurimento della quota.

---

### 5.5 Persistenza multi-livello (Tri-store)

I dati storici vengono persistiti su tre livelli con ruoli complementari:

```
API Esterna
    │
    ▼
MySQL (fonte autoritativa, accumulo storico)
    │
    ├── CSV (backup/export per analytics offline)
    │
    └── Redis (cache a breve termine, evita ri-fetch)
```

**Motivazione**: MySQL accumula dati nel tempo migliorando progressivamente la qualità delle stime statistiche (mu/sigma). Il CSV è un formato portabile per audit e analisi esterna. Redis riduce costi API e latenza.

---

## 6. Backend — Pattern di design

### 6.1 Repository Pattern

Tutti gli accessi al database passano attraverso interfacce `Repository` che estendono `JpaRepository`. Spring Data JPA genera automaticamente le implementazioni a runtime.

```java
// ScenarioRepository.java
public interface ScenarioRepository extends JpaRepository<Scenario, Long> {
    List<Scenario> findByUtenteIdOrderByDataCreazioneDesc(Long utenteId);
    boolean existsByIdAndUtenteId(Long id, Long utenteId);
}
```

Il Service usa l'interfaccia `ScenarioRepository` senza sapere nulla di SQL o di JPA: lavora solo con oggetti Java.

**Motivazione**: il Repository astrae il meccanismo di persistenza. Permette di sostituire il database (es. da MySQL a PostgreSQL) o usare repository mock nei test unitari senza toccare i Service. È un pattern fondamentale della Domain-Driven Design (DDD).

---

### 6.2 Strategy Pattern

La selezione della fonte dati (Alpha Vantage per STOCK, CoinGecko per CRYPTO) segue il pattern **Strategy**: l'algoritmo da eseguire viene scelto a runtime in base al tipo di asset, senza condizionali sparsi nel codice.

```java
// MarketDataService.java — dispatch per tipo di asset
List<PrezzoStorico> nuovi = switch (type) {
    case STOCK  -> fetchAlphaVantage(sym);   // strategia A
    case CRYPTO -> fetchCoinGecko(sym);       // strategia B
};
```

L'enum `TipoAsset { CRYPTO, STOCK }` funge da selettore di strategia. Lo stesso pattern è replicato in `PrezzoService` per i prezzi correnti e storici.

**Motivazione**: l'aggiunta di un nuovo tipo di asset (es. ETF, commodity) richiede solo un nuovo `case` e un nuovo metodo privato, senza modificare il contratto pubblico del servizio né il codice dei client. Rispetta il principio Open/Closed (OCP).

---

### 6.3 Builder Pattern

Tutte le entità JPA e i DTO usano il pattern **Builder** generato da Lombok (`@Builder`). Rende la costruzione di oggetti con molti campi leggibile, esplicita e immune all'ordine dei parametri:

```java
// ScenarioServiceImpl.java
Scenario scenario = Scenario.builder()
    .nome(richiesta.getNome())
    .descrizione(richiesta.getDescrizione())
    .budgetIniziale(richiesta.getBudgetIniziale())
    .dataCreazione(LocalDateTime.now())
    .utente(utente)
    .build();
```

**Motivazione**: le entità JPA hanno 5-8 campi; i DTO ne hanno anche di più. I costruttori telescopici (tanti parametri posizionali) sono fragili: aggiungere un campo cambia la firma del costruttore e rompe tutti i siti di chiamata. Il Builder rende ogni campo opzionale per nome e isola il client da variazioni interne.

---

### 6.4 Interface + Implementation (Dependency Inversion)

`ScenarioService` è definito come interfaccia Java; `ScenarioServiceImpl` ne è l'unica implementazione. I Controller dipendono dall'interfaccia, non dalla classe concreta.

```
ScenarioController
       │ dipende da
       ▼
ScenarioService          ← interfaccia (contratto + Javadoc)
       ▲ implementa
ScenarioServiceImpl      ← classe concreta (logica)
```

**Motivazione**: rispetta il principio **DIP** (Dependency Inversion Principle). Il Controller può essere testato iniettando un mock dell'interfaccia. L'implementazione può essere sostituita (es. versione con cache, versione asincrona) senza modificare il Controller.

---

### 6.5 Chain of Responsibility — Filter Chain

[JwtFilter.java](koinsim/src/main/java/com/example/koinsim/security/JwtFilter.java) implementa il pattern **Chain of Responsibility** estendendo `OncePerRequestFilter`. Ogni richiesta percorre una catena di filtri; ogni filtro può processarla o passarla al successivo tramite `filterChain.doFilter()`.

```
HTTP Request
     │
     ▼
JwtFilter (estrae e valida token, imposta SecurityContext)
     │  filterChain.doFilter()
     ▼
UsernamePasswordAuthenticationFilter
     │
     ▼
... altri filtri Spring Security ...
     │
     ▼
DispatcherServlet → Controller
```

Se il token è assente o non valido, il filtro passa la richiesta al successivo senza impostare l'autenticazione. Il livello di autorizzazione (`authorizeHttpRequests`) blocca la richiesta se non autenticata, restituendo 401.

**Motivazione**: separare la logica JWT in un filtro dedicato rispetta il principio **Single Responsibility**: il filtro sa solo come validare un token; i controller non sanno nulla di autenticazione.

---

### 6.6 DTO Pattern (Data Transfer Object)

Il progetto usa DTO distinti per request e response, impedendo l'esposizione diretta delle entità JPA al client.

| DTO | Direzione | Scopo |
|---|---|---|
| `LoginRequest` | Client → Server | Credenziali di accesso |
| `LoginResponse` | Server → Client | Access + Refresh token |
| `ScenarioRequest` | Client → Server | Creazione/aggiornamento scenario |
| `ScenarioResponse` | Server → Client | Scenario con `budgetRimanente` calcolato |
| `TransazioneRequest` | Bidirezionale | Dati transazione (con `id` opzionale) |
| `MarketDataResponse` | Server → Client | mu, sigma, dataPoints per Monte Carlo |
| `ProiezioneScenario` | Server → Client | P&L a 4 orizzonti temporali |
| `ProiezioneMonteCarlo` | Server → Client | Percentili 10/50/90 per 3 orizzonti |

**Motivazione**: le entità JPA non devono mai essere serializzate direttamente (rischio di serializzazione ciclica, esposizione di `passwordHash`, accoppiamento tra struttura interna e contratto API). I DTO permettono di modellare la risposta diversamente dall'entità (`budgetRimanente` è calcolato, non persistito) e di mantenere il contratto API stabile anche se il modello interno cambia.

---

### 6.7 Global Exception Handler (Facade per la gestione degli errori)

[GlobalExceptionHandler.java](koinsim/src/main/java/com/example/koinsim/controller/GlobalExceptionHandler.java) usa `@RestControllerAdvice` per centralizzare la gestione di tutte le eccezioni applicative in un unico punto, presentando al client un'interfaccia uniforme (Facade):

```java
@ExceptionHandler(ApiLimitException.class)
public ResponseEntity<Map<String, String>> handleApiLimit(ApiLimitException ex) {
    return ResponseEntity.status(HttpStatus.TOO_MANY_REQUESTS)
            .body(Map.of("error", "API_LIMIT_REACHED", "message", ex.getMessage()));
}
```

| Eccezione | HTTP Status |
|---|---|
| `ApiLimitException` | 429 Too Many Requests |
| `SymbolNotFoundException` | 404 Not Found |
| `DataPersistenceException` | 500 Internal Server Error |
| `EntityNotFoundException` | 404 Not Found |
| `AccessDeniedException` | 403 Forbidden |
| `MethodArgumentNotValidException` | 400 Bad Request |
| `IllegalStateException` | 422 Unprocessable Entity |

**Motivazione**: centralizzare la gestione degli errori evita duplicazioni nei controller, garantisce un formato di risposta JSON uniforme per il client Angular, e mantiene i controller focalizzati solo sul "percorso felice".

---

## 7. Frontend — Pattern architetturali

### 7.1 Single Page Application (SPA)

KoinSim è una **SPA**: il browser carica un unico documento HTML (`index.html`) e Angular gestisce tutte le navigazioni lato client senza ricaricare la pagina. Il server (Nginx) risponde sempre con `index.html` per qualsiasi route Angular:

```nginx
location / {
    try_files $uri $uri/ /index.html;
}
```

**Motivazione**: la SPA offre una UX fluida (nessun reload), gestione dello stato condiviso tra viste, e comunicazione con il backend esclusivamente via API REST (disaccoppiamento netto tra frontend e backend).

---

### 7.2 Component-Based Architecture

L'interfaccia è decomposta in componenti autonomi, ognuno responsabile della propria vista e logica locale:

```
AppComponent (root, solo router-outlet)
├── AuthComponent          → login + registrazione
├── ScenarioListComponent  → lista degli scenari
└── ScenarioDashboardComponent → dettaglio scenario
    ├── CreateScenarioDialogComponent (dialog modale)
    └── AddTransactionDialogComponent (dialog modale)
```

Ogni componente è **standalone** (Angular 18): dichiara esplicitamente le proprie dipendenze nell'array `imports` senza necessità di NgModule condivisi.

**Motivazione**: la decomposizione in componenti rende l'interfaccia manutenibile (ogni componente è modificabile in isolamento) e riusabile (i dialog sono componenti indipendenti richiamabili da più punti dell'applicazione).

---

### 7.3 Feature-Based Structure (Screaming Architecture)

La struttura delle cartelle è organizzata per **dominio funzionale**, non per tipo tecnico. Guardando la cartella si capisce immediatamente cosa fa l'applicazione:

```
src/app/
├── core/               ← infrastruttura condivisa (un'unica istanza in tutta la app)
│   ├── guards/         ← protezione route
│   ├── interceptors/   ← middleware HTTP
│   ├── models/         ← contratti TypeScript
│   └── services/       ← servizi singleton
└── features/           ← funzionalità utente
    ├── auth/           ← autenticazione
    ├── scenario-list/  ← lista scenari
    ├── scenario-dashboard/ ← dettaglio e analisi
    └── dialogs/        ← dialog modali
```

**Motivazione**: la struttura feature-based scala meglio man mano che l'applicazione cresce. Aggiungere una nuova funzionalità significa aggiungere una cartella in `features/`, senza toccare il codice esistente.

---

### 7.4 Lazy Loading (Code Splitting)

Tutte le route caricano i componenti con dynamic import tramite `loadComponent()`. Il bundle JavaScript viene suddiviso in chunk separati per ogni route:

```typescript
// app.routes.ts
{
  path: 'scenari/:id',
  canActivate: [authGuard],
  loadComponent: () =>
    import('./features/scenario-dashboard/scenario-dashboard.component')
      .then(m => m.ScenarioDashboardComponent),
}
```

**Motivazione**: il bundle iniziale scaricato all'avvio è minimo (solo `AppComponent` e le route). Il codice del dashboard viene trasferito dal server solo quando l'utente naviga verso uno scenario. Migliora sensibilmente il tempo di primo caricamento (First Contentful Paint).

---

## 8. Frontend — Pattern di design

### 8.1 Service Pattern (Singleton)

I servizi Angular sono registrati con `providedIn: 'root'`, il che li rende **singleton** condivisi nell'intera applicazione. Ogni servizio incapsula le chiamate HTTP verso un dominio specifico:

| Servizio | Responsabilità |
|---|---|
| `AuthService` | Login, registrazione, refresh token, logout, stato autenticazione |
| `ScenarioService` | CRUD scenari, transazioni, proiezioni, Monte Carlo |
| `MarketDataService` | Fetch dati di mercato |

L'injection avviene tramite la funzione `inject()` (Angular 14+), preferita al costruttore per i componenti standalone:

```typescript
export class ScenarioListComponent {
  private scenarioSvc = inject(ScenarioService);
  private dialog = inject(MatDialog);
}
```

**Motivazione**: il Singleton garantisce che tutti i componenti condividano la stessa istanza del servizio, incluso lo stato (es. il token in `AuthService`). L'uso di `inject()` rende la dipendenza esplicita e permette l'inizializzazione in field initializer (non solo nel costruttore).

---

### 8.2 Interceptor Pattern (Decorator)

[jwt.interceptor.ts](frontend-koinsim/src/app/core/interceptors/jwt.interceptor.ts) è un interceptor funzionale che implementa il pattern **Decorator**: aggiunge comportamento (autenticazione, refresh) alle richieste HTTP senza modificare i servizi che le emettono.

```typescript
export const jwtInterceptor: HttpInterceptorFn = (req, next) => {
  // 1. Decora la richiesta aggiungendo il token
  const authReq = token
    ? req.clone({ setHeaders: { Authorization: `Bearer ${token}` } })
    : req;

  return next(authReq).pipe(
    catchError(err => {
      // 2. In caso di 401, tenta il refresh e riprova
      if (err.status === 401) {
        return auth.refresh().pipe(
          switchMap(res => next(req.clone({ setHeaders: { ... } }))),
          catchError(() => { router.navigate(['/auth']); ... })
        );
      }
    })
  );
};
```

**Motivazione**: il Decorator è il pattern corretto qui perché aggiunge responsabilità (token, retry) a un oggetto esistente (la richiesta HTTP) senza modificarne l'interfaccia. Il componente chiama il servizio ignorando completamente la logica di autenticazione.

---

### 8.3 Guard Pattern (protezione dichiarativa delle route)

[auth.guard.ts](frontend-koinsim/src/app/core/guards/auth.guard.ts) è una funzione `CanActivateFn` che impedisce l'accesso alle route protette se l'utente non è autenticato:

```typescript
export const authGuard: CanActivateFn = () => {
  if (inject(AuthService).isLoggedIn()) return true;
  inject(Router).navigate(['/auth']);
  return false;
};
```

La protezione è dichiarata nelle route (`canActivate: [authGuard]`) e non nei componenti.

**Motivazione**: separare la logica di protezione dalla logica del componente rispetta il principio Single Responsibility. Il componente non deve verificare autonomamente se l'utente è autenticato: il router non lo istanzia se il guard restituisce `false`.

---

### 8.4 Reactive Forms Pattern

I form di login, registrazione, creazione scenario e aggiunta transazione usano `ReactiveFormsModule` con `FormBuilder` e `Validators`:

```typescript
// auth.component.ts
loginForm = this.fb.group({
  nomeUtente: ['', Validators.required],
  password:   ['', Validators.required],
});

registerForm = this.fb.group({
  nomeUtente: ['', Validators.required],
  email:      ['', [Validators.required, Validators.email]],
  password:   ['', [Validators.required, Validators.minLength(6)]],
});
```

**Motivazione**: i Reactive Form sono oggetti TypeScript puri, quindi completamente testabili senza rendering del DOM. La validazione è dichiarativa e composibile. Lo stato del form (`valid`, `dirty`, `touched`) è sempre sincronamente disponibile, a differenza dei Template-driven Form che sono asincroni.

---

### 8.5 Dialog Pattern (Command + Result)

Le operazioni di creazione scenario e aggiunta transazione aprono dialog modali via `MatDialog`. Il dialog raccoglie l'input e lo restituisce al chiamante tramite `afterClosed()`, senza che il chiamante acceda allo stato interno del dialog:

```typescript
// scenario-list.component.ts
this.dialog
  .open(CreateScenarioDialogComponent, { width: '420px' })
  .afterClosed()
  .subscribe((req: ScenarioRequest | undefined) => {
    if (!req) return;          // utente ha annullato
    this.scenarioSvc.crea(req).subscribe(...);
  });
```

Il dialog chiude se stesso con il risultato:
```typescript
// create-scenario-dialog.component.ts
this.dialogRef.close(req);   // passa il risultato al chiamante
```

**Motivazione**: il dialog incapsula la raccolta dell'input e restituisce solo il risultato finale. Il componente chiamante non conosce la struttura interna del form del dialog: dipende solo dal tipo restituito (`ScenarioRequest`). Questo è il principio di **Tell, Don't Ask** applicato alla UI.

---

### 8.6 Component Input Binding (Route Parameters come Input)

`ScenarioDashboardComponent` riceve l'ID dello scenario direttamente come `@Input()` grazie a `withComponentInputBinding()` nel router, senza dover iniettare `ActivatedRoute`:

```typescript
// app.config.ts
provideRouter(routes, withComponentInputBinding())

// scenario-dashboard.component.ts
@Input() id!: string;   // popolato automaticamente dal parametro :id nella route
```

**Motivazione**: questo pattern Angular 16+ rende il componente più testabile (basta passare `id` come input) e più dichiarativo (il componente non sa di essere associato a una route; dipende solo da un valore stringa).

---

## 9. Modello dei dati

### Schema relazionale

```
┌──────────────────────────────────────────────────────────┐
│  utenti                                                   │
│  ─────────────────────────────────────────────────────── │
│  id (PK)  │  nomeUtente (UNIQUE)  │  email (UNIQUE)      │
│  passwordHash                                             │
└──────────────────────────────────────────────────────────┘
       │ 1                                    │ 1
       │                                      │
       │ N                                    │ N
┌──────────────────────┐          ┌───────────────────────┐
│  transazioni         │          │  scenari              │
│  ──────────────────  │          │  ───────────────────  │
│  id (PK)             │          │  id (PK)              │
│  simbolo             │          │  nome                 │
│  tipoAsset (ENUM)    │          │  descrizione          │
│  quantita            │          │  budgetIniziale       │
│  prezzoDiAcquisto    │          │  dataCreazione        │
│  dataAcquisto        │          │  utente_id (FK)       │
│  utente_id (FK)      │          └───────────────────────┘
└──────────────────────┘                     │ 1
       │ 1                                   │ N
       │ N                        ┌──────────────────────┐
       └──────────────────────────│  transazioni_scenario│
                                  │  ──────────────────  │
                                  │  id (PK)             │
                                  │  transazione_id (FK) │
                                  │  scenario_id (FK)    │
                                  └──────────────────────┘

┌──────────────────────────────────────────────────────────┐
│  prezzi_storici                                           │
│  ─────────────────────────────────────────────────────── │
│  id (PK)  │  simbolo  │  data  │  fonte                  │
│  open  │  high  │  low  │  close                         │
│  UNIQUE(simbolo, data, fonte)                             │
└──────────────────────────────────────────────────────────┘
```

La tabella `transazioni_scenario` è una **join table** tra `transazioni` e `scenari`. Una `Transazione` è un'entità indipendente appartenente all'utente; uno `Scenario` la "include" tramite `TransazioneScenario`. Questo permette in futuro di condividere la stessa transazione tra più scenari senza duplicare i dati.

---

## 10. API REST

### Autenticazione (`/api/auth`)

| Metodo | Endpoint | Auth | Descrizione |
|---|---|---|---|
| POST | `/api/auth/registrazione` | No | Crea un nuovo utente |
| POST | `/api/auth/login` | No | Restituisce access + refresh token |
| POST | `/api/auth/refresh` | No | Rinnova l'access token |
| POST | `/api/auth/logout` | No | Logout client-side (stateless) |

### Market Data (`/api/market-data`)

| Metodo | Endpoint | Auth | Descrizione |
|---|---|---|---|
| POST | `/api/market-data/fetch` | JWT | Recupera e persiste dati storici; restituisce mu, sigma |

Body: `{ "symbol": "AAPL", "type": "STOCK" }` oppure `{ "symbol": "bitcoin", "type": "CRYPTO" }`

### Scenari (`/api/scenari`)

| Metodo | Endpoint | Auth | Descrizione |
|---|---|---|---|
| GET | `/api/scenari` | JWT | Lista scenari dell'utente autenticato |
| POST | `/api/scenari` | JWT | Crea uno scenario |
| GET | `/api/scenari/{id}` | JWT | Dettaglio scenario (con ownership check) |
| PUT | `/api/scenari/{id}` | JWT | Aggiorna nome/descrizione |
| DELETE | `/api/scenari/{id}` | JWT | Elimina scenario (cascade transazioni) |
| POST | `/api/scenari/{id}/transazioni` | JWT | Aggiunge una transazione allo scenario |
| DELETE | `/api/scenari/{id}/transazioni/{tId}` | JWT | Rimuove una transazione |
| GET | `/api/scenari/{id}/proiezioni` | JWT | Proiezioni P&L (storico + futuro) |
| GET | `/api/scenari/{id}/montecarlo` | JWT | Simulazione Monte Carlo (GBM) |

---

## 11. Sicurezza

### JWT — Dual Token Strategy

Il sistema usa due token distinti:

| Token | Durata | Scopo |
|---|---|---|
| **Access Token** | 15 minuti | Autenticazione delle API |
| **Refresh Token** | 7 giorni | Rinnovo dell'access token senza re-login |

**Flusso**:
1. Login → backend emette access + refresh token.
2. Ogni richiesta include `Authorization: Bearer <accessToken>`.
3. Alla scadenza (401), l'interceptor Angular usa il refresh token per ottenere un nuovo access token.
4. Se il refresh fallisce, l'utente viene reindirizzato al login.

**Motivazione**: i token di breve durata limitano la finestra di vulnerabilità in caso di furto. Il refresh token evita all'utente di effettuare il login ogni 15 minuti.

### Ownership Check (IDOR Prevention)

Ogni operazione sugli scenari verifica che l'utente autenticato ne sia il proprietario:

```java
private Scenario trovaConOwnership(Long scenarioId, String nomeUtente) {
    Scenario scenario = scenarioRepository.findById(scenarioId)
        .orElseThrow(() -> new EntityNotFoundException(...));
    if (!scenario.getUtente().getId().equals(utente.getId())) {
        throw new AccessDeniedException("Non autorizzato");
    }
    return scenario;
}
```

**Motivazione**: impedisce che un utente legga o modifichi scenari altrui anche conoscendo l'ID (Insecure Direct Object Reference — OWASP A01).

### Sessione Stateless

```java
.sessionManagement(sess -> sess.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
```

Il server non mantiene sessioni HTTP. Ogni richiesta è autenticata esclusivamente dal token JWT.

**Motivazione**: l'approccio stateless è scalabile orizzontalmente e semplifica il deployment: più istanze server possono gestire le richieste senza condividere stato di sessione.

---

## 12. Caching e persistenza

### Redis Cache a due livelli

| Cache | TTL | Meccanismo | Contenuto |
|---|---|---|---|
| `prezziCrypto` | 5 minuti | `@Cacheable` Spring Cache | Prezzo corrente CoinGecko |
| `prezziStock` | 5 minuti | `@Cacheable` Spring Cache | Prezzo corrente Alpha Vantage |
| `mkt:params:<simbolo>:<tipo>` | 24 ore | Redis esplicito | mu, sigma serializzati in JSON |
| `mkt:fetched:<simbolo>:<tipo>` | 24 ore | Redis esplicito | Flag "già fetchato oggi" |

### Deduplicazione MySQL (Read-before-Write)

Prima di inserire nuovi prezzi storici, il service legge le date già presenti:

```java
Set<LocalDate> esistenti = repository.findExistingDates(symbol, fonte);
List<PrezzoStorico> daSalvare = nuovi.stream()
    .filter(p -> !esistenti.contains(p.getData()))
    .toList();
```

Questo previene violazioni del vincolo univoco `(simbolo, data, fonte)` senza affidarsi esclusivamente alle eccezioni del database.

---

## 13. Algoritmo Monte Carlo

### Geometric Brownian Motion (GBM)

Il `MonteCarloService` implementa la simulazione GBM per modellare l'evoluzione stocastica del prezzo di un asset finanziario.

**Formula per ogni step giornaliero**:

```
S_t = S_{t-1} · exp( (μ - σ²/2) + σ · Z )
```

dove:
- `S_t` = prezzo al giorno t
- `μ` (mu) = rendimento medio giornaliero (media dei log-return storici)
- `σ` (sigma) = deviazione standard giornaliera (dev. std. campionaria dei log-return)
- `Z ~ N(0,1)` = numero casuale da distribuzione normale standard

**Log-return** calcolato su prezzi di chiusura storici accumulati in MySQL:
```
r_t = ln(P_t / P_{t-1})
```

**Parametri della simulazione**:

| Orizzonte | Giorni di borsa | N. simulazioni |
|---|---|---|
| 6 mesi | 126 | 10.000 |
| 1 anno | 252 | 10.000 |
| 5 anni | 1.260 | 10.000 |

**Output per ogni orizzonte**: percentile 10° (scenario pessimistico), 50° (mediano), 90° (ottimistico) e P&L mediano rispetto al costo di acquisto.

**Portafoglio multi-asset**: per ogni simulazione, il valore del portafoglio è la somma `prezzo_simulato(i) × quantità(i)` su tutti gli asset. I percorsi per asset diversi sono indipendenti (nessuna correlazione modellata).

**Motivazione del GBM**: è il modello standard di riferimento in finanza quantitativa (usato nel modello Black-Scholes). Assume prezzi log-normalmente distribuiti (prezzi mai negativi) e log-return normalmente distribuiti. È matematicamente tractable ed educativamente corretto.

---

## 14. Deployment con Docker

### Multi-stage build — Frontend

```dockerfile
# Stage 1: build del bundle Angular con Node
FROM node:20-alpine AS builder
RUN npm ci && npm run build -- --configuration production

# Stage 2: serve con Nginx (immagine finale molto più piccola)
FROM nginx:alpine
COPY --from=builder /app/dist/frontend-koinsim/browser /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
```

**Motivazione**: il container finale contiene solo Nginx e i file statici (poche decine di MB), non Node.js e le dipendenze di sviluppo (centinaia di MB).

### Docker Compose — Orchestrazione

```yaml
services:
  db-koinsim:       # MySQL 8.0 — database principale
  redis-koinsim:    # Redis 7 — cache
  app-koinsim:      # Spring Boot — API backend
  frontend-koinsim: # Angular + Nginx — SPA

networks:
  koinsim_net:      # Network isolata bridge
```

**Dipendenze con `depends_on` + `healthcheck`**: il backend attende che MySQL risponda a `mysqladmin ping` prima di avviarsi, prevenendo errori di connessione al boot.

**Configurazione via environment variables**: tutte le credenziali e configurazioni di produzione sono iniettate come variabili d'ambiente nel `docker-compose.yaml`, sovrascrivendo `application.properties`. Questo segue il principio **12-Factor App** (configurazione esternalizzata dall'artefatto).

---

## 15. Motivazione delle scelte tecnologiche

| Scelta | Alternativa considerata | Motivazione |
|---|---|---|
| **Spring Boot 4 / Java 21** | Node.js Express, Python FastAPI | Ecosistema maturo, forte integrazione con Spring Security e JPA, virtual threads in Java 21 per migliore concorrenza |
| **Angular 18** | React, Vue | Framework opinionato con routing, DI, forms e HTTP client integrati; TypeScript first; ottima integrazione con Angular Material |
| **Angular standalone components** | NgModule-based | Meno boilerplate, migliore tree-shaking, pattern raccomandato da Angular 17+ |
| **Angular Material** | Tailwind CSS, Bootstrap | Component library coerente con Material Design; include dialog, table, snackbar pronti all'uso |
| **MySQL** | PostgreSQL, H2 | Ampio supporto, robusta gestione delle transazioni, compatibilità con lo stack Spring |
| **Redis** | Caffeine (in-memory), EhCache | Cache distribuita: sopravvive al riavvio dell'applicazione, condivisibile tra più istanze; usato sia per Session che per Cache |
| **WebClient (reactive)** | RestTemplate | Non bloccante per le chiamate alle API esterne; RestTemplate è deprecato in Spring 6+ |
| **JWT stateless** | Spring Session (stateful) | Scalabilità orizzontale senza condivisione di stato server-side |
| **GBM per Monte Carlo** | Modelli GARCH, regressione | Modello standard finanza quantitativa, matematicamente corretto, implementabile con Apache Commons Math |
| **Apache Commons Math 3** | Implementazione manuale | Libreria matura con `DescriptiveStatistics`, `NormalDistribution`, `Percentile` già testate |
| **Lombok** | Record Java, codice manuale | Riduce il boilerplate di getter/setter/builder, mantenendo la leggibilità del modello |
| **Docker multi-stage** | Build singolo stage | Il container finale non include Node.js né le dipendenze di build: immagine ~20x più piccola |
| **Nginx come reverse proxy** | Serve diretto Spring Boot | Disaccoppia frontend da backend; gestisce SPA fallback e proxy trasparente in produzione |

---

*Documentazione generata il 21 aprile 2026.*
