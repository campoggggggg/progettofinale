# Koinsim — Simulatore di Portafoglio Crypto & Azioni

Applicazione Spring Boot per tracciare un portafoglio finanziario e creare **scenari di simulazione** (what-if).  
L'utente registra transazioni reali o simulate e il sistema calcola il **Profit & Loss (P&L)** in tempo reale, recuperando i prezzi correnti e storici da API esterne con un sistema di **cache Redis** per limitare le chiamate.

---

## Stack Tecnologico

| Componente | Tecnologia |
|---|---|
| Backend | Spring Boot 3.x |
| Persistenza | Spring Data JPA + MySQL 8 |
| HTTP Client | WebClient (WebFlux) |
| Cache | Spring Cache + Redis (TTL 5 min) |
| Sicurezza | Spring Security + JWT |
| Build | Maven |
| Deploy | Docker + Docker Compose |
| API Crypto | CoinGecko API v3 |
| API Azioni | Alpha Vantage |

---

## Prerequisiti

- Java 17+
- Maven 3.8+
- Docker e Docker Compose
- Chiave API gratuita su [alphavantage.co](https://www.alphavantage.co)
- Chiave API gratuita (Demo) su [coingecko.com](https://www.coingecko.com/en/api)

---

## Avvio

**1. Compila il JAR**
```bash
.\mvnw.cmd package -DskipTests
```

**2. Avvia tutti i servizi con Docker Compose**
```bash
docker-compose up --build
```

L'applicazione sarà disponibile su `http://localhost:8080`.  
MySQL e Redis vengono avviati automaticamente dai container.

---

## Limiti delle API esterne (piano gratuito)

> **Importante:** le funzionalità di prezzo storico funzionano solo entro i seguenti intervalli di date.

| API | Endpoint | Limite piano gratuito |
|---|---|---|
| CoinGecko (Demo) | `/market_chart/range` (storico crypto) | Ultimi **365 giorni** |
| Alpha Vantage (Free) | `TIME_SERIES_DAILY` compact (storico azioni) | Ultimi **100 giorni di borsa (~5 mesi)** |

Usare date precedenti a questi limiti causerà un errore `500`. Per storico più ampio è necessario sottoscrivere un piano premium.

---

## Struttura del Progetto

```
src/main/java/com/example/koinsim/
│
├── config/
│   ├── AppConfig.java              ← BCryptPasswordEncoder bean
│   ├── CacheConfig.java            ← Redis + TTL 5 minuti
│   ├── SecurityConfig.java         ← SecurityFilterChain + JWT filter
│   └── WebClientConfig.java        ← bean WebClient
│
├── controller/
│   ├── AuthController.java         ← /api/auth/**
│   ├── PortfolioController.java    ← /api/transazioni, /api/portafoglio
│   └── ScenarioController.java     ← /api/scenari/**
│
├── service/
│   ├── AuthService.java            ← registrazione, login, refresh token
│   ├── PrezzoService.java          ← API esterne + cache
│   ├── PortfolioService.java       ← calcolo P&L portafoglio reale
│   ├── ScenarioService.java        ← interfaccia simulazioni
│   └── ScenarioServiceImpl.java    ← implementazione simulazioni + proiezioni
│
├── repository/
│   ├── UtenteRepository.java
│   ├── TransazioneRepository.java
│   ├── ScenarioRepository.java
│   └── TransazioneScenarioRepository.java
│
├── model/
│   ├── Utente.java
│   ├── Transazione.java            ← enum TipoAsset { CRYPTO, STOCK }
│   ├── Scenario.java
│   └── TransazioneScenario.java
│
├── dto/
│   ├── LoginRequest.java
│   ├── LoginResponse.java
│   ├── TransazioneRequest.java
│   ├── PosizioneSingola.java
│   ├── RiepilogoPortafoglio.java
│   ├── ScenarioRequest.java
│   ├── ScenarioResponse.java
│   ├── TransazioneScenarioRequest.java
│   ├── TransazioneScenarioResponse.java
│   └── ProiezioneScenario.java
│
├── security/
│   ├── JwtFilter.java
│   └── JwtUtil.java
│
└── KoinsimApplication.java
```

---

## Autenticazione (JWT)

Il sistema è **stateless**: nessuna sessione server-side. Ogni richiesta protetta deve includere il token nell'header HTTP.

```
Authorization: Bearer <accessToken>
```

| Flusso | Endpoint | Descrizione |
|---|---|---|
| Registrazione | `POST /api/auth/registrazione` | Crea un nuovo account |
| Login | `POST /api/auth/login` | Restituisce `accessToken` (15 min) e `refreshToken` (7 giorni) |
| Refresh | `POST /api/auth/refresh` | Rinnova l'access token scaduto |
| Logout | `POST /api/auth/logout` | Invalida la sessione lato client |

---

## Endpoint REST

| Metodo | URL | Auth | Descrizione |
|---|---|---|---|
| POST | `/api/auth/registrazione` | No | Registra un utente |
| POST | `/api/auth/login` | No | Login |
| POST | `/api/auth/refresh` | No | Refresh token |
| POST | `/api/auth/logout` | No | Logout |
| POST | `/api/transazioni` | Sì | Aggiunge una transazione al portafoglio reale |
| GET | `/api/transazioni` | Sì | Elenco transazioni dell'utente |
| DELETE | `/api/transazioni/{id}` | Sì | Elimina una transazione |
| GET | `/api/portafoglio` | Sì | Riepilogo P&L del portafoglio reale |
| POST | `/api/cache/svuota` | Sì | Forza il rinnovo dei prezzi in cache |
| POST | `/api/scenari` | Sì | Crea un nuovo scenario di simulazione |
| GET | `/api/scenari` | Sì | Elenco scenari dell'utente |
| GET | `/api/scenari/{id}` | Sì | Dettaglio scenario |
| PUT | `/api/scenari/{id}` | Sì | Aggiorna nome/descrizione scenario |
| DELETE | `/api/scenari/{id}` | Sì | Elimina scenario e tutte le sue transazioni |
| POST | `/api/scenari/{id}/transazioni` | Sì | Aggiunge una transazione simulata allo scenario |
| DELETE | `/api/scenari/{id}/transazioni/{tid}` | Sì | Rimuove una transazione dallo scenario |
| GET | `/api/scenari/{id}/proiezioni` | Sì | P&L a oggi, +6 mesi, +1 anno, +5 anni |

### Esempio — Aggiungere una transazione al portafoglio reale

```json
POST /api/transazioni
Authorization: Bearer <accessToken>

{
  "simbolo": "bitcoin",
  "tipoAsset": "CRYPTO",
  "quantita": 0.5,
  "dataAcquisto": "2024-10-01"
}
```

> Il campo `prezzoDiAcquisto` **non va incluso**: viene calcolato automaticamente dal server tramite il prezzo storico dell'API.

### Esempio — Creare uno scenario di simulazione

```json
POST /api/scenari
Authorization: Bearer <accessToken>

{
  "nome": "Sim Bitcoin 2024",
  "descrizione": "Cosa sarebbe successo comprando BTC a inizio 2024",
  "budgetIniziale": 5000.00
}
```

### Esempio — Aggiungere una transazione a uno scenario

```json
POST /api/scenari/1/transazioni
Authorization: Bearer <accessToken>

{
  "simbolo": "bitcoin",
  "tipoAsset": "CRYPTO",
  "quantita": 0.1,
  "dataAcquisto": "2024-10-01"
}
```

---

## Configurazione application.properties

```properties
spring.application.name=koinsim

# MySQL
spring.datasource.url=jdbc:mysql://localhost:3306/koinsim_db?useSSL=false&serverTimezone=UTC
spring.datasource.username=root
spring.datasource.password=root
spring.datasource.driver-class-name=com.mysql.cj.jdbc.Driver
spring.jpa.hibernate.ddl-auto=update
spring.jpa.properties.hibernate.dialect=org.hibernate.dialect.MySQLDialect

# JWT
jwt.secret=mysupersecretkey1234567890abcdef

# Redis
spring.data.redis.host=localhost
spring.data.redis.port=6379

# API Keys
coingecko.api.key=la_tua_chiave_demo
alpha.vantage.api.key=la_tua_chiave
```

---

## Regole di Sviluppo

| Regola | Esempio |
|---|---|
| Variabili e metodi in italiano | `quantita`, `prezzoUnitario`, `calcolaPortafoglio()` |
| Tabelle DB al plurale | `utenti`, `transazioni`, `scenari`, `transazioni_scenario` |
| Entità JPA al singolare | `Utente`, `Transazione`, `Scenario`, `TransazioneScenario` |
| DTO con suffisso descrittivo | `LoginRequest`, `RiepilogoPortafoglio`, `ProiezioneScenario` |
| I controller non chiamano i repository | Passano sempre dal service |
| Password sempre hashate | `BCryptPasswordEncoder` |
| Il JWT non contiene dati sensibili | Solo `nomeUtente` nel payload (subject) |
| Ogni metodo che chiama API esterne ha `@Cacheable` | `PrezzoService` |
| Il budget iniziale di uno scenario è immutabile | `@Column(updatable = false)` |

---

## Dipendenze principali (pom.xml)

```xml
<dependency>
    <groupId>com.mysql</groupId>
    <artifactId>mysql-connector-j</artifactId>
    <scope>runtime</scope>
</dependency>
<dependency>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-starter-data-redis</artifactId>
</dependency>
<dependency>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-starter-cache</artifactId>
</dependency>
<dependency>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-starter-security</artifactId>
</dependency>
<dependency>
    <groupId>io.jsonwebtoken</groupId>
    <artifactId>jjwt-api</artifactId>
    <version>0.12.3</version>
</dependency>
<dependency>
    <groupId>io.jsonwebtoken</groupId>
    <artifactId>jjwt-impl</artifactId>
    <version>0.12.3</version>
    <scope>runtime</scope>
</dependency>
<dependency>
    <groupId>io.jsonwebtoken</groupId>
    <artifactId>jjwt-jackson</artifactId>
    <version>0.12.3</version>
    <scope>runtime</scope>
</dependency>
```
