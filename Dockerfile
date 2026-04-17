# 1. Scegliamo un'immagine base con la Java Runtime Environment (JRE)
# Usiamo 'eclipse-temurin' che è lo standard open-source attuale. 
# 'alpine' indica una distribuzione Linux ultra-leggera (circa 5MB).
FROM eclipse-temurin:21-jre-alpine

# 2. Creiamo una directory di lavoro per l'applicazione
WORKDIR /app

# 3. Copiamo il JAR che abbiamo generato prima dal nostro computer al container.
# NOTA: Assicurati che il nome del file JAR corrisponda a quello in target/
COPY target/*.jar koinsim-0.0.1-SNAPSHOT.jar

# 4. Esponiamo la porta tipica di Spring Boot (8080)
EXPOSE 8080

# 5. Definiamo il comando per avviare l'applicazione.
# Usiamo la forma 'exec' (array di stringhe) per gestire correttamente i segnali di stop.
ENTRYPOINT ["java", "-jar", "koinsim-0.0.1-SNAPSHOT.jar"]