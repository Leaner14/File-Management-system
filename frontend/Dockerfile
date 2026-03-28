FROM node:20-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install all deps for build
RUN npm ci

# Copy source
COPY . .

# Build React app
RUN npm run build

# Populate shared volume (mounted by docker-compose at /app/dist)
RUN mkdir -p /frontend_dist && cp -r dist/* /frontend_dist/

# Healthcheck optional
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:80', (res) => process.exit(res.statusCode === 200 ? 0 : 1))" || exit 1

EXPOSE 80

CMD ["sh", "-c", "while true; do sleep 30; done"]

