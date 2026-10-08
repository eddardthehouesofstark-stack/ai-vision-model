FROM node:22-slim

# Install system dependencies including ffmpeg
RUN apt-get update && apt-get install -y --no-install-recommends ffmpeg && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY package*.json ./
RUN npm install --legacy-peer-deps

COPY . .
RUN npm run build

EXPOSE 3000
ENV NODE_ENV=production
ENV PORT=3000

CMD ["node", "server.ts"]
