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
  res.json({ status: 'ok', message: 'Canton Playbox Backend is running' });
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

// ========== NEW: DPM TEMPLATE ENDPOINTS ==========

// List available DPM templates dynamically
app.get('/api/templates/list', async (req, res) => {
  console.log('Listing available DPM templates...');
  
  try {
    // Run dpm new --list
    const { stdout } = await execWithTimeout('dpm new --list', {}, 30000);
    
    console.log('DPM output:', stdout);
    
    // Parse template names from output
    const templates = [];
    const lines = stdout.split('\n');
    let inTemplateList = false;
    
    for (const line of lines) {
      // Check for header line
      if (line.includes('following templates are available') || 
          line.includes('Available templates:') || 
          line.includes('available templates:')) {
        inTemplateList = true;
        continue;
      }
      
      // Skip empty lines
      if (!line.trim()) {
        continue;
      }
      
      // If we're in the template list and line is indented (starts with spaces)
      if (inTemplateList && line.startsWith('  ') && line.trim().length > 0) {
        const templateName = line.trim();
        if (templateName && !templateName.includes(':')) {
          templates.push({
            id: templateName,
            name: formatTemplateName(templateName),
            description: getTemplateDescription(templateName),
            source: 'dpm'
          });
        }
      }
      
      // Also handle dash-prefixed format (some versions might use this)
      if (inTemplateList && line.trim().startsWith('-')) {
        const templateName = line.trim().substring(1).trim();
        if (templateName) {
          templates.push({
            id: templateName,
            name: formatTemplateName(templateName),
            description: getTemplateDescription(templateName),
            source: 'dpm'
          });
        }
      }
    }
    
    console.log('Parsed templates:', templates.map(t => t.id));
    
    // Always include empty template first
    templates.unshift({
      id: 'empty',
      name: 'Empty Template',
      description: 'Start from scratch with an empty project',
      source: 'built-in'
    });
    
    // Include existing hardcoded token-basic template
    templates.push({
      id: 'token-basic',
      name: 'Basic Token',
      description: 'Simple fungible token with transfer functionality',
      source: 'built-in'
    });
    
    console.log('Found templates:', templates.map(t => t.id));
    
    res.json({
      success: true,
      templates
    });
    
  } catch (error) {
    console.error('Error listing DPM templates:', error);
    
    // Fallback to built-in templates
    res.json({
      success: true,
      templates: [
        {
          id: 'empty',
          name: 'Empty Template',
          description: 'Start from scratch with an empty project',
          source: 'built-in'
        },
        {
          id: 'token-basic',
          name: 'Basic Token',
          description: 'Simple fungible token with transfer functionality',
          source: 'built-in'
        }
      ],
      warning: 'DPM templates unavailable'
    });
  }
});

// Create project from DPM template
app.post('/api/templates/create', async (req, res) => {
  const { template } = req.body;
  const sessionId = uuidv4();
  const projectDir = path.join(TEMP_DIR, sessionId);
  
  console.log(`[${sessionId}] Creating from template: ${template}`);
  
  try {
    // Create temp directory
    await fs.mkdir(projectDir, { recursive: true });
    
    // Run dpm new with template
    console.log(`[${sessionId}] Running: dpm new ${projectDir} --template ${template}`);
    
    const { stdout } = await execWithTimeout(
      `dpm new ${projectDir} --template ${template}`,
      {},
      60000
    );
    
    console.log(`[${sessionId}] Template created:`, stdout);
    
    // Read all files from generated project
    const files = await readProjectFiles(projectDir);
    
    console.log(`[${sessionId}] Read ${Object.keys(files).length} files`);
    
    // Cleanup
    await fs.rm(projectDir, { recursive: true, force: true });
    
    res.json({
      success: true,
      files,
      sessionId,
      template
    });
    
  } catch (error) {
    console.error(`[${sessionId}] Error creating template:`, error);
    
    // Cleanup on error
    try {
      await fs.rm(projectDir, { recursive: true, force: true });
    } catch (cleanupErr) {
      console.error('Cleanup error:', cleanupErr);
    }
    
    res.status(500).json({
      success: false,
      error: error.message,
      sessionId
    });
  }
});

// Helper: Read all files from project directory
async function readProjectFiles(dir, prefix = '') {
  const files = {};
  const entries = await fs.readdir(dir, { withFileTypes: true });
  
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    const relativePath = prefix ? `${prefix}/${entry.name}` : entry.name;
    
    // Skip hidden files and directories
    if (entry.name.startsWith('.')) continue;
    
    if (entry.isDirectory()) {
      const subFiles = await readProjectFiles(fullPath, relativePath);
      Object.assign(files, subFiles);
    } else {
      try {
        const content = await fs.readFile(fullPath, 'utf-8');
        files[relativePath] = content;
      } catch (error) {
        console.error(`Error reading ${relativePath}:`, error);
      }
    }
  }
  
  return files;
}

// Helper: Format template name
function formatTemplateName(templateId) {
  return templateId
    .split('-')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

// Helper: Get template description
function getTemplateDescription(templateId) {
  const descriptions = {
    // Tutorial templates
    'daml-intro-choices': 'Introduction to DAML - Choices',
    'daml-intro-compose': 'Introduction to DAML - Composing Choices',
    'daml-intro-constraints': 'Introduction to DAML - Constraints',
    'daml-intro-contracts': 'Introduction to DAML - Basic Contracts',
    'daml-intro-daml-scripts': 'Introduction to DAML - Scripts',
    'daml-intro-data': 'Introduction to DAML - Data Types',
    'daml-intro-exceptions': 'Introduction to DAML - Exception Handling',
    'daml-intro-functional-101': 'Introduction to DAML - Functional Programming 101',
    'daml-intro-parties': 'Introduction to DAML - Parties and Authority',
    'daml-intro-test': 'Introduction to DAML - Testing',
    
    // Pattern templates
    'daml-patterns': 'Common DAML design patterns',
    
    // Basic templates
    'empty-skeleton': 'Empty project with minimal structure',
    'skeleton': 'Basic DAML project structure',
    
    // Finance templates
    'finance-lifecycling': 'Financial instrument lifecycling patterns',
    'finance-payoff-modeling': 'Financial payoff modeling examples',
    'finance-settlement': 'Settlement workflow patterns',
    'finance-upgrades': 'Upgrading financial contracts',
    'quickstart-finance': 'Financial contract quickstart',
    
    // Other templates
    'quickstart-java': 'Java integration quickstart',
    'multi-package-example': 'Multi-package project example',
    'script-example': 'DAML script examples',
    'upgrades-example': 'Contract upgrade examples',
  };
  
  return descriptions[templateId] || `${formatTemplateName(templateId)} template`;
}

// ========== END NEW ENDPOINTS ==========

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

// Get template (existing endpoint - kept for backwards compatibility)
app.get('/api/templates/:name', (req, res) => {
  const templates = {
    'token-basic': {
      'daml.yaml': `sdk-version: 3.4.10
name: token-basic
version: 1.0.0
source: daml
dependencies:
  - daml-prim
  - daml-stdlib
  - daml3-script`,
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
      'daml.yaml': `sdk-version: 3.4.10
name: nft-simple
version: 1.0.0
source: daml
dependencies:
  - daml-prim
  - daml-stdlib
  - daml3-script`,
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

// List available templates (old endpoint - kept for backwards compatibility)
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
  console.log(`🚀 Canton Playbox Backend running on port ${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
});