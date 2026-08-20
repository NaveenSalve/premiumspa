FROM node:20-alpine

WORKDIR /app

# Copy dependency manifests
COPY package*.json ./

# Install dependencies
RUN npm ci

# Copy all source files
COPY . .

# Build Vite frontend and Express server bundle
RUN npm run build

# Prune devDependencies to keep container light
RUN npm prune --production

# Expose port
EXPOSE 3000

ENV PORT=3000
ENV NODE_ENV=production

# Start production server
CMD ["npm", "start"]
