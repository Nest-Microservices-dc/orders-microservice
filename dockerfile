# Usa una imagen liviana y moderna de Node.js
FROM node:23-alpine3.20

# Establece el directorio de trabajo
WORKDIR /usr/src/app

# Copia solo los archivos necesarios para instalar dependencias
COPY package*.json ./
COPY package-lock.json ./

# Instala las dependencias
RUN npm install 

# Copia el resto de la aplicación
COPY . .

RUN npx prisma generate

# Expone el puerto de la app
EXPOSE 3000
