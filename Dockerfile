FROM node:18-alpine AS builder

WORKDIR /app

# Copiar archivos de dependencias
COPY package*.json ./

# Instalar dependencias
RUN npm ci

# Copiar el código fuente
COPY . .

# Compilar la aplicación
RUN npm run build

# Etapa de producción
FROM node:18-alpine

WORKDIR /app

# Copiar archivos de dependencias
COPY package*.json ./

# Instalar solo dependencias de producción
RUN npm ci --only=production

# Copiar el código compilado desde la etapa builder
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules

# Crear directorios para logs y uploads
RUN mkdir -p logs uploads && \
    chmod -R 777 logs uploads

# Exponer puerto (aunque es un microservicio RabbitMQ, esto es por claridad)
EXPOSE 3004

# Comando para iniciar la aplicación
CMD ["node", "dist/main"]