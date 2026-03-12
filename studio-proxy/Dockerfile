FROM node:20-alpine

WORKDIR /app

RUN apk add --no-cache openssl

COPY studio-proxy/package.json ./
RUN npm install
RUN npm install prisma@5.22.0 @prisma/client@5.22.0

COPY app/prisma ./prisma
RUN npx prisma generate

COPY studio-proxy/server.mjs ./

EXPOSE 5555

CMD ["node", "server.mjs"]
