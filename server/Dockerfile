FROM node:20
WORKDIR /app

# deps
COPY package*.json ./
RUN npm ci

# sources
COPY tsconfig.json ./
COPY prisma ./prisma
COPY src ./src

# build TS + prisma client
RUN npx tsc
RUN npx prisma generate

EXPOSE 8080
CMD ["node","dist/index.js"]
