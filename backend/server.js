const express = require('express');
const cors = require('cors');
const { exec } = require('child_process');
const fs = require('fs').promises;
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' }));

// Rate limiting - 10 builds per 10 minutes per IP
const buildLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 10,
  message: { error: 'Too many build requests. Please try again in 10 minutes.' }
});

// Temp directory for user projects
const TEMP_DIR = path.join(__dirname, 'temp');

// Ensure temp directory exists
fs.mkdir(TEMP_DIR, { recursive: true }).catch(console.error);

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', message: 'Canton IDE Backend is running' });
});

// Execute command with timeout
function execWithTimeout(command, options, timeout = 60000) {
  return new Promise((resolve, reject) => {
    const child = exec(command, options, (error, stdout, stderr) => {
      if (error) {
        reject({ error, stdout, stderr });
      } else {
        resolve({ stdout, stderr });
      }
    });

    // Timeout handler
    const timeoutId = setTimeout(() => {
      child.kill();
      reject({ error: 'Command timeout', stdout: '', stderr: 'Execution exceeded 60 seconds' });
    }, timeout);

    child.on('exit', () => clearTimeout(timeoutId));
  });
}

// Build DAML project
app.post('/api/build', buildLimiter, async (req, res) => {
  const sessionId = uuidv4();
  const projectDir = path.join(TEMP_DIR, sessionId);

  try {
    const { files, template } = req.body;

    if (!files || !files['daml.yaml']) {
      return res.status(400).json({ 
        error: 'Missing required files. daml.yaml is required.' 
      });
    }

    // Create project directory
    await fs.mkdir(projectDir, { recursive: true });
    await fs.mkdir(path.join(projectDir, 'daml'), { recursive: true });

    // Write files to disk
    for (const [filename, content] of Object.entries(files)) {
      const filePath = path.join(projectDir, filename);
      await fs.writeFile(filePath, content, 'utf8');
    }

    console.log(`[${sessionId}] Building project...`);

    // Execute dpm build
    const { stdout, stderr } = await execWithTimeout(
      'dpm build',
      { cwd: projectDir },
      60000
    );

    console.log(`[${sessionId}] Build completed`);

    // Clean up
    await fs.rm(projectDir, { recursive: true, force: true });

    res.json({
      success: true,
      output: stdout,
      errors: stderr,
      sessionId
    });

  } catch (err) {
    console.error(`[${sessionId}] Build error:`, err);

    // Clean up on error
    try {
      await fs.rm(projectDir, { recursive: true, force: true });
    } catch (cleanupErr) {
      console.error('Cleanup error:', cleanupErr);
    }

    res.status(500).json({
      success: false,
      error: err.error?.message || 'Build failed',
      output: err.stdout || '',
      errors: err.stderr || err.error || 'Unknown error occurred',
      sessionId
    });
  }
});

// Test DAML project
app.post('/api/test', buildLimiter, async (req, res) => {
  const sessionId = uuidv4();
  const projectDir = path.join(TEMP_DIR, sessionId);

  try {
    const { files } = req.body;

    if (!files || !files['daml.yaml']) {
      return res.status(400).json({ 
        error: 'Missing required files. daml.yaml is required.' 
      });
    }

    // Create project directory
    await fs.mkdir(projectDir, { recursive: true });
    await fs.mkdir(path.join(projectDir, 'daml'), { recursive: true });

    // Write files to disk
    for (const [filename, content] of Object.entries(files)) {
      const filePath = path.join(projectDir, filename);
      await fs.writeFile(filePath, content, 'utf8');
    }

    console.log(`[${sessionId}] Testing project...`);

    // Execute dpm test
    const { stdout, stderr } = await execWithTimeout(
      'dpm test',
      { cwd: projectDir },
      90000 // Tests might take longer
    );

    console.log(`[${sessionId}] Test completed`);

    // Clean up
    await fs.rm(projectDir, { recursive: true, force: true });

    res.json({
      success: true,
      output: stdout,
      errors: stderr,
      sessionId
    });

  } catch (err) {
    console.error(`[${sessionId}] Test error:`, err);

    // Clean up on error
    try {
      await fs.rm(projectDir, { recursive: true, force: true });
    } catch (cleanupErr) {
      console.error('Cleanup error:', cleanupErr);
    }

    res.status(500).json({
      success: false,
      error: err.error?.message || 'Test failed',
      output: err.stdout || '',
      errors: err.stderr || err.error || 'Unknown error occurred',
      sessionId
    });
  }
});

// Get template
app.get('/api/templates/:name', (req, res) => {
  const templates = {
    'token-basic': {
      'daml.yaml': `sdk-version: 3.4.0
name: token-basic
version: 1.0.0
source: daml
dependencies:
  - daml-prim
  - daml-stdlib
build-options:
  - --target=3.4`,
      'daml/Token.daml': `module Token where

import Daml.Script

template Token
  with
    issuer : Party
    owner : Party
    symbol : Text
    amount : Decimal
  where
    signatory issuer
    observer owner
    
    ensure amount > 0.0
    
    choice Transfer : ContractId Token
      with
        newOwner : Party
      controller owner
      do
        create this with owner = newOwner

setup : Script ()
setup = script do
  alice <- allocatePartyWithHint "Alice" (PartyIdHint "Alice")
  bob <- allocatePartyWithHint "Bob" (PartyIdHint "Bob")
  
  token <- submit alice do
    createCmd Token with
      issuer = alice
      owner = alice
      symbol = "ACME"
      amount = 100.0
  
  submit alice do
    exerciseCmd token Transfer with newOwner = bob
  
  return ()`
    },
    'nft-simple': {
      'daml.yaml': `sdk-version: 3.4.0
name: nft-simple
version: 1.0.0
source: daml
dependencies:
  - daml-prim
  - daml-stdlib
build-options:
  - --target=3.4`,
      'daml/NFT.daml': `module NFT where

import Daml.Script

template NFT
  with
    issuer : Party
    owner : Party
    tokenId : Int
    name : Text
  where
    signatory issuer
    observer owner
    
    choice TransferNFT : ContractId NFT
      with
        newOwner : Party
      controller owner
      do
        create this with owner = newOwner

setup : Script ()
setup = script do
  creator <- allocatePartyWithHint "Creator" (PartyIdHint "Creator")
  alice <- allocatePartyWithHint "Alice" (PartyIdHint "Alice")
  
  nft <- submit creator do
    createCmd NFT with
      issuer = creator
      owner = alice
      tokenId = 1
      name = "Cool NFT #1"
  
  return ()`
    }
  };

  const template = templates[req.params.name];
  if (!template) {
    return res.status(404).json({ error: 'Template not found' });
  }

  res.json(template);
});

// List available templates
app.get('/api/templates', (req, res) => {
  res.json({
    templates: [
      {
        id: 'token-basic',
        name: 'Basic Token',
        description: 'Simple fungible token with transfer functionality',
        category: 'tokens'
      },
      {
        id: 'nft-simple',
        name: 'Simple NFT',
        description: 'Basic NFT implementation',
        category: 'nft'
      }
    ]
  });
});

// Cleanup old temp directories (runs every hour)
setInterval(async () => {
  try {
    const files = await fs.readdir(TEMP_DIR);
    const now = Date.now();
    
    for (const file of files) {
      const filePath = path.join(TEMP_DIR, file);
      const stats = await fs.stat(filePath);
      
      // Delete directories older than 1 hour
      if (now - stats.mtimeMs > 60 * 60 * 1000) {
        await fs.rm(filePath, { recursive: true, force: true });
        console.log(`Cleaned up old directory: ${file}`);
      }
    }
  } catch (err) {
    console.error('Cleanup error:', err);
  }
}, 60 * 60 * 1000);

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Canton IDE Backend running on port ${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
});
