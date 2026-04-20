# KOINSIM – Guida al Funzionamento del Progetto

## Cos'è Koinsim?

**Koinsim** (Koin Simulator) è un'applicazione web per la gestione e la simulazione di portafogli finanziari. Permette agli utenti di:

- Creare **scenari simulati** ("e se avessi investito diversamente?") con un budget fisso
- Vedere in tempo reale il **profitto o la perdita** (P&L) delle proprie posizioni simulate

---

## Architettura del Sistema

Il progetto è composto da più componenti che lavorano insieme:

```
 [ Backend Spring Boot ]  ──→  [ MySQL ]
      porta 8080               porta 3306
                                        │
                                   [ Redis Cache ]
                                   porta 6379
                                        │
                          [ API Esterne: CoinGecko / Alpha Vantage ]
```

| Componente | Tecnologia | Scopo |
|---|---|---|
| **Backend** | Spring Boot 4.0, Java 21 | Logica di business e API REST |
| **Database** | MySQL 8.0 | Persistenza dei dati |
| **Cache** | Redis | Velocizzare le risposte, evitare chiamate ridondanti alle API esterne |
| **Avvio** | Docker Compose | Avvia tutto con un solo comando |

---

## Step 1 – Registrazione e Accesso

L'utente deve prima creare un account, poi effettuare il login.

### Registrazione
- L'utente invia `nomeUtente`, `email` e `password`
- Il backend salva l'utente nel database
- La password viene **hashata** con BCrypt (mai salvata in chiaro)

### Login
- L'utente invia `email` e `password`
- Il backend verifica le credenziali e restituisce due **token JWT**:
  - **accessToken** – valido 15 minuti, usato per ogni richiesta
  - **refreshToken** – valido 7 giorni, usato per ottenere un nuovo accessToken senza riloggare

### Come funziona il token JWT
- Ogni richiesta alle API protette deve includere l'header: `Authorization: Bearer <accessToken>`
- Il backend legge il token, verifica che sia valido e identifica l'utente

---

## Step 2 – Portafoglio Reale

Questa sezione rappresenta gli investimenti **reali** dell'utente.

### Aggiungere una transazione
L'utente invia:
```json
{
  "simbolo": "bitcoin",
  "tipoAsset": "CRYPTO",
  "quantita": 0.5,
  "dataAcquisto": "2024-10-01"
}
```
Il backend:
1. Riceve la richiesta
2. Contatta l'API esterna (CoinGecko per crypto, Alpha Vantage per azioni) per ottenere il prezzo storico alla data indicata
3. Salva la transazione nel database con il prezzo di acquisto

### Visualizzare il portafoglio
- Endpoint: `GET /api/portafoglio`
- Il backend raggruppa tutte le transazioni per simbolo
- Per ogni asset calcola:
  - **Valore attuale** = quantità × prezzo corrente
  - **Costo totale** = somma dei prezzi di acquisto
  - **P&L** = valore attuale − costo totale (in % e in valore assoluto)
- Il prezzo corrente viene recuperato dalle API esterne e **messo in cache per 5 minuti** su Redis

---

## Step 3 – Scenari di Simulazione

### Creare uno scenario
- L'utente definisce un nome, una descrizione e un **budget iniziale fisso** (es. 5.000 €)
- Il budget è **immutabile**: una volta impostato, non può essere modificato

### Aggiungere transazioni simulate
- Il sistema verifica che il totale delle transazioni **non superi il budget**
- Se il budget viene superato, la transazione viene rifiutata con errore 422


---

## Step 4 – Proiezioni nel Tempo

Per ogni scenario, il sistema genera una **proiezione in 4 punti temporali**:

| Punto   | Data       | Come viene calcolato   |
| +6 mesi | Tra 6 mesi | simulazione Montecarlo |
| +1 anno | Tra 1 anno | simulazione Montecarlo |
| +5 anni | Tra 5 anni | simulazione Montecarlo |


---

## Step 5 – Dati di Mercato (Market Data)

- Endpoint: `POST /api/market-data/fetch`
- Recupera **365 giorni di dati storici** (OHLC: apertura, massimo, minimo, chiusura) per un simbolo
- I dati vengono salvati in tre posti:
  1. **Database MySQL** – tabella `prezzi_storici`
  2. **Redis** – metadati e parametri statistici (mu e sigma per Monte Carlo)
- Calcola **mu** (media rendimenti) e **sigma** (deviazione standard)
- calcolo effettivo utilizzando la formula di montecarlo con epsilon = 10000
---

## Caching con Redis

Redis serve a non sovraccaricare le API esterne (che hanno limiti di chiamate):

| Dati cachati | Durata | Scopo |
|---|---|---|
| Prezzi correnti crypto/azioni | 5 minuti | Evitare chiamate ripetute a CoinGecko/Alpha Vantage |
| Dati di mercato (mu/sigma) | 24 ore | Evitare re-fetch dello storico nello stesso giorno |


---

## Come Avviare il Progetto

### Prerequisiti
- Docker e Docker Compose installati
- Java 21 e Maven (solo per compilare il JAR manualmente)

### Avvio completo con Docker

```bash
# 1. Compila il progetto (dalla cartella koinsim)
cd koinsim
mvn clean package -DskipTests

# 2. Avvia tutti i servizi con Docker Compose
docker-compose up --build
```

---

## Struttura del Codice (Backend)

```
koinsim/src/main/java/com/example/koinsim/
│
├── controller/       ← Ricevono le richieste HTTP e restituiscono le risposte
├── service/          ← Contengono la logica di business
├── repository/       ← Comunicano con il database tramite JPA
├── model/            ← Entità del database (Utente, Transazione, Scenario, ...)
├── dto/              ← Oggetti di trasferimento dati (Request/Response)
├── security/         ← Filtro JWT e utilità per i token
├── config/           ← Configurazioni (Security, Redis, WebClient)
└── exception/        ← Eccezioni personalizzate
```

---

## Entità Principali

| Entità | Tabella DB | Descrizione |
|---|---|---|
| `Utente` | `utenti` | L'account dell'utente (email unica, password hashata) |
| `Transazione` | `transazioni` | Un acquisto (crypto o azione) |
| `Scenario` | `scenari` | Una simulazione con budget fisso |
| `TransazioneScenario` | `transazioni_scenario` | Collega le transazioni agli scenari |
| `PrezzoStorico` | `prezzi_storici` | Dati OHLC storici scaricati dalle API |
| `TipoAsset` | *(enum)* | CRYPTO oppure STOCK |

---

## Regole di Sviluppo

Il progetto segue queste convenzioni:

1. **Nomi in italiano**: variabili e metodi usano l'italiano (es. `quantita`, `calcolaPortafoglio`)
2. **Tabelle DB al plurale**: `utenti`, `transazioni`, `scenari`
3. **Entità JPA al singolare**: `Utente`, `Transazione`, `Scenario`
4. **I controller non accedono mai al database direttamente**: usano sempre i service
5. **Le password sono sempre hashate** con BCryptPasswordEncoder
6. **Il token JWT contiene solo il nome utente**, nessun dato sensibile
7. **Tutte le chiamate API esterne sono cachate** con `@Cacheable`

---

## Riepilogo Flusso Completo

```
Utente → Registrazione/Login → riceve JWT
        ↓
      Crea scenario → budget fisso → aggiunge transazioni  → verifica budget
        ↓
      Carico transazioni dell'utente → prezzi correnti (da cache Redis o API)
       ↓
      Simulazione Montecarlo → P&L calcolato
```

---

*Progetto sviluppato con Spring Boot 4.0, Java 21, MySQL, Redis e Docker.*
