import React, { useState, useEffect } from 'react';
import Editor from '@monaco-editor/react';
import axios from 'axios';
import { FaPlay, FaCheckCircle, FaCog, FaCode, FaDownload } from 'react-icons/fa';
import './App.css';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001';

const TEMPLATES = {
  'token-basic': {
    name: 'Basic Token',
    description: 'Simple fungible token with transfer functionality'
  },
  'nft-simple': {
    name: 'Simple NFT',
    description: 'Basic NFT implementation'
  }
};

function App() {
  const [selectedTemplate, setSelectedTemplate] = useState('token-basic');
  const [files, setFiles] = useState({});
  const [currentFile, setCurrentFile] = useState('daml/Token.daml');
  const [output, setOutput] = useState('');
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState('idle'); // idle, building, testing, success, error

  // Load template on mount or template change
  useEffect(() => {
    loadTemplate(selectedTemplate);
  }, [selectedTemplate]);

  const loadTemplate = async (templateName) => {
    try {
      setLoading(true);
      const response = await axios.get(`${API_URL}/api/templates/${templateName}`);
      setFiles(response.data);
      
      // Set first DAML file as current
      const damlFiles = Object.keys(response.data).filter(f => f.endsWith('.daml'));
      if (damlFiles.length > 0) {
        setCurrentFile(damlFiles[0]);
      }
      
      setOutput('');
      setStatus('idle');
    } catch (error) {
      console.error('Error loading template:', error);
      setOutput(`Error loading template: ${error.message}`);
      setStatus('error');
    } finally {
      setLoading(false);
    }
  };

  const handleEditorChange = (value) => {
    setFiles({
      ...files,
      [currentFile]: value
    });
  };

  const handleBuild = async () => {
    setLoading(true);
    setStatus('building');
    setOutput('Building project...\n');

    try {
      const response = await axios.post(`${API_URL}/api/build`, {
        files,
        template: selectedTemplate
      });

      if (response.data.success) {
        setOutput(`✅ Build successful!\n\n${response.data.output}`);
        setStatus('success');
      } else {
        setOutput(`❌ Build failed\n\n${response.data.errors}`);
        setStatus('error');
      }
    } catch (error) {
      const errorMsg = error.response?.data?.errors || error.message;
      setOutput(`❌ Build failed\n\n${errorMsg}`);
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
      const response = await axios.post(`${API_URL}/api/test`, {
        files
      });

      if (response.data.success) {
        setOutput(`✅ Tests passed!\n\n${response.data.output}`);
        setStatus('success');
      } else {
        setOutput(`❌ Tests failed\n\n${response.data.errors}`);
        setStatus('error');
      }
    } catch (error) {
      const errorMsg = error.response?.data?.errors || error.message;
      setOutput(`❌ Tests failed\n\n${errorMsg}`);
      setStatus('error');
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = () => {
    // Create zip-like structure as text files
    let content = '# Canton IDE Project Export\n\n';
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

  const fileList = Object.keys(files);

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
            >
              {Object.entries(TEMPLATES).map(([key, template]) => (
                <option key={key} value={key}>
                  {template.name}
                </option>
              ))}
            </select>
            <p className="template-description">
              {TEMPLATES[selectedTemplate].description}
            </p>
          </div>

          <div className="section">
            <h3>Files</h3>
            <div className="file-list">
              {fileList.map(filename => (
                <div
                  key={filename}
                  className={`file-item ${currentFile === filename ? 'active' : ''}`}
                  onClick={() => setCurrentFile(filename)}
                >
                  <FaCode size={12} />
                  <span>{filename}</span>
                </div>
              ))}
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
            >
              <FaDownload />
              Download
            </button>
          </div>
        </aside>

        {/* Editor */}
        <div className="editor-container">
          <div className="editor-header">
            <span>{currentFile}</span>
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
