# Piattaforma di Monitoraggio Investimenti — Crypto & Stocks

Applicazione Spring Boot per tracciare un portafoglio finanziario simulato.  
L'utente registra le proprie transazioni di acquisto e il sistema calcola il **Profit & Loss (P&L)** in tempo reale, recuperando i prezzi correnti da API esterne con un sistema di **cache Redis** per evitare di saturare i limiti di frequenza.

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
| API Crypto | CoinGecko API v3 |
| API Azioni | Alpha Vantage |

---

## Prerequisiti

- Java 17+
- Maven 3.8+
- MySQL 8+
- Docker (per Redis)
- Chiave API gratuita su [alphavantage.co](https://www.alphavantage.co)

---

## Avvio

**1. Avvia MySQL e Redis con Docker**
```bash
docker run -d -p 3306:3306 -e MYSQL_ROOT_PASSWORD=root -e MYSQL_DATABASE=portafogliodb mysql:8
docker run -d -p 6379:6379 redis:7
```

**2. Configura le variabili d'ambiente**
```bash
export DB_PASSWORD=root
export ALPHA_VANTAGE_KEY=la_tua_chiave
export JWT_SECRET=chiave_segreta_minimo_256_caratteri
```

**3. Compila e avvia**
```bash
mvn spring-boot:run
```

L'applicazione sarà disponibile su `http://localhost:8080`.

---

## Struttura del Progetto

```
src/main/java/com/portfolio/
│
├── config/
│   ├── CacheConfig.java          ← Redis + TTL 5 minuti
│   ├── SecurityConfig.java       ← SecurityFilterChain
│   └── WebClientConfig.java      ← bean WebClient
│
├── controller/
│   ├── AuthController.java       ← /api/auth/**
│   └── PortfolioController.java  ← /api/transazioni, /api/portafoglio
│
├── service/
│   ├── AuthService.java          ← login, JWT
│   ├── PrezzoService.java        ← API esterne + cache
│   └── PortfolioService.java     ← calcolo P&L
│
├── repository/
│   ├── UtenteRepository.java
│   └── TransazioneRepository.java
│
├── model/
│   ├── Utente.java
│   └── Transazione.java
│
├── dto/
│   ├── LoginRequest.java
│   ├── LoginResponse.java
│   ├── TransazioneRequest.java
│   └── RiepilogoPortafoglio.java
│
├── security/
│   ├── JwtFilter.java
│   └── JwtUtil.java
│
└── PortfolioApplication.java
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
| POST | `/api/auth/registrazione` | Registra un utente |
| POST | `/api/auth/login` | Login |
| POST | `/api/auth/refresh` | Refresh token |
| POST | `/api/auth/logout` | Logout |
| POST | `/api/transazioni` | Aggiunge una transazione |
| GET | `/api/transazioni` | Elenco transazioni dell'utente |
| DELETE | `/api/transazioni/{id}` | Elimina una transazione |
| GET | `/api/portafoglio` | Riepilogo P&L del portafoglio |
| POST | `/api/cache/svuota` | Forza il rinnovo dei prezzi |

### Esempio — Aggiungere una transazione

```json
POST /api/transazioni
Authorization: Bearer <accessToken>

{
  "simbolo": "bitcoin",
  "tipoAsset": "CRYPTO",
  "quantita": 0.5,
  "prezzoDiAcquisto": 62000.00,
  "dataAcquisto": "2024-04-10"
}
```

---

## 🗄️ Configurazione application.properties

```properties
spring.datasource.url=jdbc:mysql://localhost:3306/portafogliodb?useSSL=false&serverTimezone=UTC
spring.datasource.driver-class-name=com.mysql.cj.jdbc.Driver
spring.datasource.username=root
spring.datasource.password=${DB_PASSWORD}
spring.jpa.hibernate.ddl-auto=update
spring.jpa.database-platform=org.hibernate.dialect.MySQLDialect

spring.data.redis.host=localhost
spring.data.redis.port=6379
spring.cache.type=redis

alpha.vantage.api.key=${ALPHA_VANTAGE_KEY}
jwt.secret=${JWT_SECRET}
jwt.scadenza.access=900000
jwt.scadenza.refresh=604800000
```

---

## 📐 Regole di Sviluppo

| Regola | Esempio |
|---|---|
| Variabili e metodi in italiano | `quantita`, `prezzoDiAcquisto`, `calcolaPortafoglio()` |
| Tabelle DB al plurale | `utenti`, `transazioni` |
| Entità JPA al singolare | `Utente`, `Transazione` |
| DTO con suffisso descrittivo | `LoginRequest`, `RiepilogoPortafoglio` |
| I controller non chiamano i repository | Passano sempre dal service |
| Password sempre hashate | `BCryptPasswordEncoder` |
| Il JWT non contiene dati sensibili | Solo `id` e `nomeUtente` nel payload |
| Ogni metodo che chiama API esterne ha `@Cacheable` | `PrezzoService` |

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
