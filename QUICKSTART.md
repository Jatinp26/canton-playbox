# 🏃 QUICK START - Test Canton IDE Locally

## Prerequisites

- Node.js 18+ installed
- Docker installed (for backend)
- DPM installed (optional, for testing without Docker)

---

## Option 1: Full Stack with Docker (Recommended)

### 1. Start Backend (with Docker)

```bash
cd backend

# Build Docker image (includes DPM)
docker build -t canton-ide-backend .

# Run container
docker run -d -p 3001:3001 --name canton-backend canton-ide-backend

# Check if it's running
curl http://localhost:3001/health
# Should return: {"status":"ok","message":"Canton IDE Backend is running"}
```

### 2. Start Frontend

```bash
cd frontend

# Install dependencies
npm install

# Create .env file
echo "REACT_APP_API_URL=http://localhost:3001" > .env

# Start development server
npm start

# Opens http://localhost:3000 automatically
```

### 3. Test It!

1. Browser opens at http://localhost:3000
2. Select "Basic Token" template
3. Code appears in Monaco Editor
4. Click **Build** button
5. Wait 5-10 seconds
6. See build output! ✅

---

## Option 2: Without Docker (If you have DPM installed)

### 1. Start Backend (without Docker)

```bash
cd backend

# Install dependencies
npm install

# Start server
npm start

# Server runs on http://localhost:3001
```

**Note:** This requires DPM to be installed and available in PATH.

### 2. Start Frontend (same as above)

```bash
cd frontend
npm install
echo "REACT_APP_API_URL=http://localhost:3001" > .env
npm start
```

---

## Testing the Build Functionality

### Test 1: Build Token Template

1. Select "Basic Token" from dropdown
2. Click "Build"
3. Expected output:
   ```
   ✅ Build successful!
   
   Created .daml/dist/token-basic-1.0.0.dar
   ```

### Test 2: Run Tests

1. Keep "Basic Token" selected
2. Click "Test"
3. Expected output:
   ```
   ✅ Tests passed!
   
   Running tests...
   setup: ok
   testTokenTransfer: ok
   ```

### Test 3: Edit Code

1. Make a change in the editor (e.g., change "ACME" to "TEST")
2. Click "Build" again
3. Should rebuild with your changes

### Test 4: Switch Templates

1. Select "Simple NFT" from dropdown
2. Files should update
3. Click "Build"
4. Should build NFT template

---

## Troubleshooting Local Setup

### Backend Issues

**"Cannot connect" error:**
```bash
# Check if backend is running
curl http://localhost:3001/health

# Check Docker logs
docker logs canton-backend

# Restart container
docker restart canton-backend
```

**"DPM not found" error (without Docker):**
```bash
# Install DPM
curl -sSL https://get.digitalasset.com/install/install.sh | sh -s

# Add to PATH
export PATH="$HOME/.dpm/bin:$PATH"

# Verify
dpm version --active
```

### Frontend Issues

**"CORS error":**
- Make sure backend is running
- Check .env file has correct API_URL
- Restart frontend: Ctrl+C, then `npm start`

**"Module not found":**
```bash
# Delete node_modules and reinstall
rm -rf node_modules package-lock.json
npm install
```

---

## Stop Everything

### Stop Backend (Docker)
```bash
docker stop canton-backend
docker rm canton-backend
```

### Stop Frontend
Just press `Ctrl+C` in the terminal

---

## Quick Test Script

Run this to test everything quickly:

```bash
#!/bin/bash

echo "🔍 Testing Canton IDE Setup..."

# Test backend
echo "Testing backend..."
HEALTH=$(curl -s http://localhost:3001/health)
if [[ $HEALTH == *"ok"* ]]; then
    echo "✅ Backend is running"
else
    echo "❌ Backend is not responding"
fi

# Test frontend
echo "Testing frontend..."
if curl -s http://localhost:3000 > /dev/null; then
    echo "✅ Frontend is running"
else
    echo "❌ Frontend is not running"
fi

echo "
🎉 Setup complete! Open http://localhost:3000"
```

Save as `test-setup.sh`, make executable with `chmod +x test-setup.sh`, then run `./test-setup.sh`

---

## Ready to Deploy?

Once everything works locally, follow [DEPLOYMENT.md](./DEPLOYMENT.md) to push to Railway + Vercel.

**Local testing complete! Now you can deploy! 🚀**
