FROM node:20

WORKDIR /app

# copie séparée pour maximiser le cache
COPY package.json package-lock.json* ./

# si le lockfile existe -> npm ci, sinon -> npm install
RUN if [ -f package-lock.json ]; then npm ci; else npm install; fi

COPY prisma ./prisma
RUN npx prisma generate

COPY src ./src
COPY tsconfig.json ./

RUN npm run build

EXPOSE 8080
CMD ["node", "dist/index.js"]
