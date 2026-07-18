FROM node:22-alpine

ENV NODE_ENV=production
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci --omit=dev && npm cache clean --force

COPY server ./server
COPY src/multiplayer/protocol.js ./src/multiplayer/protocol.js

USER node
EXPOSE 8080
CMD ["npm", "run", "start:colyseus"]
