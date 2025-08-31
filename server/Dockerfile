FROM node:20
WORKDIR /app

# 1) Déps
COPY package*.json ./
RUN npm ci

# 2) Sources  
COPY tsconfig.json ./
COPY prisma ./prisma
COPY src ./src

# 3) Générer le client Prisma AVANT de compiler TS
RUN npx prisma generate

# 4) Build TS
RUN npm run build

EXPOSE 8080
CMD ["node","dist/index.js"]
