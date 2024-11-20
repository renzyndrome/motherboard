FROM node:18-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy configuration files
COPY vite.config.js ./
COPY postcss.config.js ./
COPY tailwind.config.js ./

# Copy source files
COPY src ./src
COPY index.html ./

# Expose port
EXPOSE 3000

# Start the application
CMD ["npm", "run", "dev"]