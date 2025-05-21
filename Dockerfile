# Use official Node.js LTS image
FROM node:20-alpine

# Set working directory
WORKDIR /app

# Copy package.json and package-lock.json (if present)
COPY package.json tsconfig.json ./

# Install dependencies (including devDependencies for build)
RUN npm install

# Copy source code
COPY src ./src
COPY public ./public

# Build TypeScript
RUN npx tsc

# Expose port
EXPOSE 3000

# Start the app
CMD ["node", "dist/index.js"]
