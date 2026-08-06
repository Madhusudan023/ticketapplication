FROM eclipse-temurin:17-jdk-alpine AS builder
WORKDIR /build
COPY pom.xml .
COPY src ./src
RUN apk add --no-cache maven && mvn clean package -DskipTests

FROM eclipse-temurin:17-jre-alpine
RUN addgroup -S appgroup && adduser -S appuser -G appgroup
WORKDIR /app
COPY --from=builder /build/target/*.jar app.jar
RUN mkdir -p /app/uploads && chown appuser:appgroup /app/uploads
USER appuser
EXPOSE 8085
ENTRYPOINT ["java", "-jar", "app.jar"]
