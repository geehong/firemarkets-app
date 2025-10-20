# Next.js Dockerfile for development
FROM node:20-alpine

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy source code
COPY . .

# Expose port 3000 (Next.js default)
EXPOSE 3000

# Start development server (no build required)
CMD ["npm", "run", "dev", "--", "--hostname", "0.0.0.0", "--port", "3000"]