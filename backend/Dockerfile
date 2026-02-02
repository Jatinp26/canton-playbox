FROM node:18-slim

# Install required dependencies for DPM
RUN apt-get update && apt-get install -y \
    curl \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*

# Install DPM (Digital Asset Package Manager)
RUN curl -sSL https://get.digitalasset.com/install/install.sh | sh -s

# Add DPM to PATH
ENV PATH="/root/.dpm/bin:${PATH}"

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install Node dependencies
RUN npm install --production

# Copy application code
COPY . .

# Create temp directory for builds
RUN mkdir -p /app/temp

# Expose port
EXPOSE 3001

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3001/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

# Start server
CMD ["npm", "start"]
