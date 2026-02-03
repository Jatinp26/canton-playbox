FROM node:18-slim

# Install required dependencies including Java (needed for dpm test)
RUN apt-get update && apt-get install -y \
    curl \
    ca-certificates \
    wget \
    gnupg \
    openjdk-17-jdk \
    && rm -rf /var/lib/apt/lists/*

# Set JAVA_HOME
ENV JAVA_HOME=/usr/lib/jvm/java-17-openjdk-amd64
ENV PATH="${JAVA_HOME}/bin:${PATH}"

# Install DPM with verbose output and error checking
RUN echo "=== Installing DPM ===" && \
    curl -sSL https://get.digitalasset.com/install/install.sh > /tmp/install-dpm.sh && \
    cat /tmp/install-dpm.sh && \
    sh /tmp/install-dpm.sh && \
    echo "=== DPM Installation Complete ===" && \
    ls -la /root/.dpm/bin/ || echo "DPM bin directory not found!"

# Add DPM to PATH
ENV PATH="/root/.dpm/bin:${PATH}"

# Verify DPM is installed
RUN echo "=== Verifying DPM Installation ===" && \
    which dpm || echo "DPM not in PATH!" && \
    dpm version --active || echo "DPM version command failed!"

# Verify Java is installed
RUN echo "=== Verifying Java Installation ===" && \
    java -version && \
    echo "Java installed successfully!"

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