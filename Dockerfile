# Build stage: compile the React PWA
FROM node:20-alpine AS build
WORKDIR /app
COPY package*.json ./
COPY server/package.json ./server/
COPY client/package.json ./client/
RUN npm ci
COPY . .
RUN npm run build

# Runtime stage: API + static client on a single port
FROM node:20-alpine
WORKDIR /app
ENV NODE_ENV=production
COPY package*.json ./
COPY server/package.json ./server/
COPY client/package.json ./client/
RUN npm ci --omit=dev
COPY --from=build /app/client/dist ./client/dist
COPY server/src ./server/src
EXPOSE 5050
WORKDIR /app/server
CMD ["node", "src/index.js"]
