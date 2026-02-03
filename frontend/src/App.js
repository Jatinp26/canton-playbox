import React, { useState, useEffect } from 'react';
import Editor from '@monaco-editor/react';
import axios from 'axios';
import { FaPlay, FaCheckCircle, FaCog, FaCode, FaDownload, FaPlus, FaTrash } from 'react-icons/fa';
import './App.css';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001';

const TEMPLATES = {
  'empty': {
    name: 'Empty Template',
    description: 'Start from scratch with an empty project'
  },
  'token-basic': {
    name: 'Basic Token',
    description: 'Simple fungible token with transfer functionality'
  },
  'nft-simple': {
    name: 'Simple NFT',
    description: 'Basic NFT implementation'
  }
};

// Empty template structure
const EMPTY_TEMPLATE = {
  'daml.yaml': `sdk-version: 3.4.10
name: my-project
version: 1.0.0
source: daml
dependencies:
  - daml-prim
  - daml-stdlib
build-options:
  - --target=3.4`,
  'daml/Main.daml': `module Main where

import Daml.Script

-- Your code here

setup : Script ()
setup = script do
  return ()
`
};

function App() {
  const [selectedTemplate, setSelectedTemplate] = useState('empty');
  const [files, setFiles] = useState(() => {
    // Try to load from localStorage first
    const saved = localStorage.getItem('canton-ide-files');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error('Failed to load saved files:', e);
      }
    }
    return EMPTY_TEMPLATE;
  });
  const [currentFile, setCurrentFile] = useState(() => {
    const saved = localStorage.getItem('canton-ide-current-file');
    return saved || 'daml/Main.daml';
  });
  const [output, setOutput] = useState('Welcome to Canton IDE! Your code auto-saves locally.');
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState('idle');

  // Auto-save files to localStorage whenever they change
  useEffect(() => {
    localStorage.setItem('canton-ide-files', JSON.stringify(files));
  }, [files]);

  // Auto-save current file selection
  useEffect(() => {
    localStorage.setItem('canton-ide-current-file', currentFile);
  }, [currentFile]);

  // Load template on change
  useEffect(() => {
    if (selectedTemplate === 'empty') {
      // Don't override if user has custom content
      const hasCustomContent = localStorage.getItem('canton-ide-files');
      if (!hasCustomContent) {
        setFiles(EMPTY_TEMPLATE);
        setCurrentFile('daml/Main.daml');
        setOutput('Empty template loaded. Start coding!');
        setStatus('idle');
      }
    } else {
      loadTemplate(selectedTemplate);
    }
  }, [selectedTemplate]);

  const loadTemplate = async (templateName) => {
    try {
      setLoading(true);
      setOutput('Loading template...');
      
      console.log('Loading template:', templateName);
      console.log('API URL:', API_URL);
      
      const response = await axios.get(`${API_URL}/api/templates/${templateName}`);
      
      console.log('Raw response:', response);
      console.log('Response data:', response.data);
      console.log('Response data type:', typeof response.data);
      console.log('Is array?', Array.isArray(response.data));
      
      // Validate response is an object
      if (!response.data || typeof response.data !== 'object' || Array.isArray(response.data)) {
        console.error('Invalid template format:', response.data);
        throw new Error(`Invalid template format. Expected object, got ${typeof response.data}`);
      }
      
      // Check if we have files
      const fileKeys = Object.keys(response.data);
      console.log('File keys:', fileKeys);
      
      if (fileKeys.length === 0) {
        throw new Error('Template has no files');
      }
      
      // Verify files have content
      const firstKey = fileKeys[0];
      const firstValue = response.data[firstKey];
      console.log('First file:', firstKey, '=', typeof firstValue);
      
      if (typeof firstValue !== 'string') {
        throw new Error(`Invalid file content. Expected string, got ${typeof firstValue}`);
      }
      
      setFiles(response.data);
      
      // Set first DAML file as current
      const damlFiles = fileKeys.filter(f => f.endsWith('.daml'));
      
      if (damlFiles.length > 0) {
        setCurrentFile(damlFiles[0]);
      } else if (fileKeys.length > 0) {
        setCurrentFile(fileKeys[0]);
      }
      
      setOutput('Template loaded successfully!');
      setStatus('idle');
    } catch (error) {
      console.error('Error loading template:', error);
      console.error('Error response:', error.response);
      
      let errorMessage = `❌ Error loading template:\n\n${error.message}`;
      
      if (error.response) {
        errorMessage += `\n\nHTTP Status: ${error.response.status}`;
        errorMessage += `\nResponse: ${JSON.stringify(error.response.data, null, 2)}`;
      }
      
      if (!navigator.onLine) {
        errorMessage += '\n\n⚠️ No internet connection!';
      }
      
      if (API_URL.includes('localhost')) {
        errorMessage += '\n\n⚠️ Backend running on localhost. Make sure it\'s started!';
      }
      
      errorMessage += '\n\nCheck browser console (F12) for more details.';
      
      setOutput(errorMessage);
      setStatus('error');
      
      // Fallback to empty template
      setFiles(EMPTY_TEMPLATE);
      setCurrentFile('daml/Main.daml');
    } finally {
      setLoading(false);
    }
  };

  const handleEditorChange = (value) => {
    setFiles({
      ...files,
      [currentFile]: value || ''
    });
  };

  const handleBuild = async () => {
    setLoading(true);
    setStatus('building');
    setOutput('Building project...\n');

    try {
      console.log('Sending build request...');
      console.log('Files to build:', Object.keys(files));
      console.log('API URL:', `${API_URL}/api/build`);
      
      const response = await axios.post(`${API_URL}/api/build`, {
        files,
        template: selectedTemplate
      });

      console.log('Build response:', response.data);

      if (response.data.success) {
        setOutput(`✅ Build successful!\n\n${response.data.output}`);
        setStatus('success');
      } else {
        setOutput(`❌ Build failed\n\n${response.data.errors}`);
        setStatus('error');
      }
    } catch (error) {
      console.error('Build error:', error);
      console.error('Error response:', error.response);
      
      let errorMsg = '❌ Build failed\n\n';
      
      if (error.response?.data?.errors) {
        errorMsg += error.response.data.errors;
      } else if (error.response?.data?.error) {
        errorMsg += error.response.data.error;
      } else if (error.message) {
        errorMsg += error.message;
      } else {
        errorMsg += 'Unknown error';
      }
      
      errorMsg += '\n\nCheck browser console (F12) for details.';
      
      setOutput(errorMsg);
      setStatus('error');
    } finally {
      setLoading(false);
    }
  };

  const handleTest = async () => {
    setLoading(true);
    setStatus('testing');
    setOutput('Running tests...\n');

    try {
      console.log('Sending test request...');
      console.log('Files to test:', Object.keys(files));
      
      const response = await axios.post(`${API_URL}/api/test`, {
        files
      });

      console.log('Test response:', response.data);

      if (response.data.success) {
        setOutput(`✅ Tests passed!\n\n${response.data.output}`);
        setStatus('success');
      } else {
        setOutput(`❌ Tests failed\n\n${response.data.errors}`);
        setStatus('error');
      }
    } catch (error) {
      console.error('Test error:', error);
      console.error('Error response:', error.response);
      
      let errorMsg = '❌ Tests failed\n\n';
      
      if (error.response?.data?.errors) {
        errorMsg += error.response.data.errors;
      } else if (error.response?.data?.error) {
        errorMsg += error.response.data.error;
      } else if (error.message) {
        errorMsg += error.message;
      } else {
        errorMsg += 'Unknown error';
      }
      
      errorMsg += '\n\nCheck browser console (F12) for details.';
      
      setOutput(errorMsg);
      setStatus('error');
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = () => {
    let content = '# Canton IDE Project Export\n\n';
    content += `## Project: ${selectedTemplate}\n\n`;
    content += '## Files:\n\n';
    
    Object.entries(files).forEach(([filename, fileContent]) => {
      content += `### ${filename}\n\`\`\`\n${fileContent}\n\`\`\`\n\n`;
    });

    const blob = new Blob([content], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${selectedTemplate}-project.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleReset = () => {
    if (window.confirm('Clear all code and reset to empty template? This cannot be undone.')) {
      localStorage.removeItem('canton-ide-files');
      localStorage.removeItem('canton-ide-current-file');
      setFiles(EMPTY_TEMPLATE);
      setCurrentFile('daml/Main.daml');
      setOutput('Reset to empty template. Code cleared.');
      setStatus('idle');
    }
  };

  const handleAddFile = () => {
    const filename = prompt('Enter filename (e.g., daml/NewModule.daml):');
    if (filename && filename.trim()) {
      setFiles({
        ...files,
        [filename.trim()]: '-- New file\n'
      });
      setCurrentFile(filename.trim());
    }
  };

  // Safely get file list
  const fileList = React.useMemo(() => {
    if (!files || typeof files !== 'object' || Array.isArray(files)) {
      console.error('Invalid files object:', files);
      return [];
    }
    return Object.keys(files);
  }, [files]);

  // Debug info in console
  useEffect(() => {
    console.log('Current state:');
    console.log('- selectedTemplate:', selectedTemplate);
    console.log('- files type:', typeof files);
    console.log('- files is array?', Array.isArray(files));
    console.log('- fileList:', fileList);
    console.log('- currentFile:', currentFile);
  }, [selectedTemplate, files, fileList, currentFile]);

  return (
    <div className="app">
      {/* Header */}
      <header className="header">
        <div className="header-left">
          <h1>🏛️ Canton IDE</h1>
          <span className="subtitle">Build DAML apps in your browser</span>
        </div>
        <div className="header-right">
          <a 
            href="https://docs.canton.network" 
            target="_blank" 
            rel="noopener noreferrer"
            className="link"
          >
            Docs
          </a>
          <a 
            href="https://canton.foundation" 
            target="_blank" 
            rel="noopener noreferrer"
            className="link"
          >
            Canton Foundation
          </a>
        </div>
      </header>

      {/* Main Content */}
      <div className="main">
        {/* Sidebar */}
        <aside className="sidebar">
          <div className="section">
            <h3>Templates</h3>
            <select 
              value={selectedTemplate}
              onChange={(e) => setSelectedTemplate(e.target.value)}
              className="template-select"
              disabled={loading}
            >
              {Object.entries(TEMPLATES).map(([key, template]) => (
                <option key={key} value={key}>
                  {template.name}
                </option>
              ))}
            </select>
            <p className="template-description">
              {TEMPLATES[selectedTemplate]?.description || 'No description'}
            </p>
          </div>

          <div className="section">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
              <h3 style={{ margin: 0 }}>Files</h3>
              <button
                onClick={handleAddFile}
                className="btn-icon"
                title="Add new file"
              >
                <FaPlus size={12} />
              </button>
            </div>
            <div className="file-list">
              {fileList.length === 0 ? (
                <div className="file-item" style={{ opacity: 0.5 }}>
                  No files
                </div>
              ) : (
                fileList.map(filename => (
                  <div
                    key={filename}
                    className={`file-item ${currentFile === filename ? 'active' : ''}`}
                    onClick={() => setCurrentFile(filename)}
                  >
                    <FaCode size={12} />
                    <span>{filename}</span>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="section">
            <h3>Actions</h3>
            <button
              onClick={handleBuild}
              disabled={loading}
              className="btn btn-primary"
            >
              <FaCog className={loading && status === 'building' ? 'spin' : ''} />
              Build
            </button>
            <button
              onClick={handleTest}
              disabled={loading}
              className="btn btn-success"
            >
              <FaPlay />
              Test
            </button>
            <button
              onClick={handleDownload}
              className="btn btn-secondary"
              disabled={loading}
            >
              <FaDownload />
              Download
            </button>
            <button
              onClick={handleReset}
              className="btn btn-danger"
              disabled={loading}
            >
              <FaTrash />
              Reset
            </button>
          </div>

          {/* Debug Info */}
          <div className="section" style={{ fontSize: '0.7rem', opacity: 0.7 }}>
            <h3>Status</h3>
            <div>Files: {fileList.length}</div>
            <div>Backend: {API_URL.includes('localhost') ? '🔴 Local' : '🟢 Remote'}</div>
            <div>💾 Auto-save: Enabled</div>
          </div>
        </aside>

        {/* Editor */}
        <div className="editor-container">
          <div className="editor-header">
            <span>{currentFile || 'No file selected'}</span>
          </div>
          <Editor
            height="100%"
            language="typescript"
            theme="vs-dark"
            value={files[currentFile] || ''}
            onChange={handleEditorChange}
            options={{
              minimap: { enabled: false },
              fontSize: 14,
              lineNumbers: 'on',
              roundedSelection: false,
              scrollBeyondLastLine: false,
              automaticLayout: true,
            }}
          />
        </div>

        {/* Output Panel */}
        <div className="output-container">
          <div className="output-header">
            <span>Output</span>
            {status === 'success' && <FaCheckCircle className="status-icon success" />}
            {status === 'error' && <FaCheckCircle className="status-icon error" />}
          </div>
          <pre className="output-content">
            {output || 'Output will appear here...'}
          </pre>
        </div>
      </div>
    </div>
  );
}

export default App;