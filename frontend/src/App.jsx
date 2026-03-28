 
import { useState, useEffect } from 'react';
import axios from 'axios';
import './App.css';
import heroImage from './assets/hero.png';

function App() {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [file, setFile] = useState(null);
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [filesLoading, setFilesLoading] = useState(false);

  const API_BASE = '/api';

  const fetchFiles = async () => {
    setFilesLoading(true);
    try {
      const res = await axios.get(`${API_BASE}/files`);
      setFiles(res.data);
    } catch (error) {
      console.error('Fetch files error:', error);
      if (error.response?.status !== 404) {
        setMessage('Failed to load files: ' + (error.response?.data?.error || error.message));
      }
    } finally {
      setFilesLoading(false);
    }
  };

  useEffect(() => {
    fetchFiles();
  }, []);

  const handleUpload = async (e) => {
    e.preventDefault();
    if (!file || !title) return;

    setLoading(true);
    setMessage('');

    try {
      const formData = new FormData();
      formData.append('file', file);

      // Step 1: Upload file
      const uploadRes = await axios.post(`${API_BASE}/upload-file`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      if (!uploadRes.data.filePath) {
        throw new Error('Upload failed - no filePath');
      }

      // Step 2: Save metadata
      const metadataRes = await axios.post(`${API_BASE}/metadata`, {
        title,
        description,
        filePath: uploadRes.data.filePath
      });

      // Optimistic add
      const newFile = {
        id: metadataRes.data.id,
        title,
        description,
        filePath: uploadRes.data.filePath
      };
      setFiles([newFile, ...files]);

      setTitle('');
      setDescription('');
      setFile(null);
      setMessage('Upload successful!');
      await fetchFiles(); // Refresh list
    } catch (error) {
      setMessage('Upload failed: ' + (error.response?.data?.error || error.message));
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = async (filePath) => {
    if (!filePath) return;
    try {
      const res = await axios.get(`${API_BASE}/get-file/${encodeURIComponent(filePath)}`, {
        responseType: 'blob'
      });
      const url = window.URL.createObjectURL(res.data);
      const a = document.createElement('a');
      a.href = url;
      a.download = (filePath.split('/').pop() || 'download');
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Download error:', error);
    }
  };

  return (

    <div className="app">
      <header className="header" style={{ backgroundPosition: 'center', minHeight: '300px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', textShadow: '2px 2px 4px rgba(0,0,0,0.5)' }}>
        <h1>ConnectDot File Manager</h1>
      </header>

      <main className="main">
        {/* Upload Section */}
        <section className="upload-section">
          <h2>Upload File</h2>
          {message && <div className={`message ${message.includes('successful') ? 'success' : 'error'}`}>{message}</div>}
          <form onSubmit={handleUpload} className="upload-form">
            <input
              type="text"
              placeholder="Title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              className="input"
            />
            <textarea
              placeholder="Description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="textarea"
              rows="3"
            />
            <input
              type="file"
              onChange={(e) => setFile(e.target.files[0])}
              className="file-input"
              required
            />
            <button type="submit" disabled={loading} className="upload-btn">
              {loading ? (
                <span className="loading-spinner">⏳ Uploading...</span>
              ) : (
                'Upload File'
              )}
            </button>
          </form>
        </section>

        {/* Files List */}
        <section className="files-section">
          <h2>Files ({files.length}) {filesLoading && <span className="loading-spinner">⏳</span>}</h2>
          {filesLoading ? (
            <div className="loading">Loading files...</div>
          ) : files.length === 0 ? (
            <div className="no-files">No files available</div>
          ) : (
            <div className="files-grid">
{files
                .filter(item => item.id && item.filePath && typeof item.filePath === 'string')
                .map((item) => (
                  <div key={item.id} className="file-card">
                    <h3>{item.title || 'Untitled'}</h3>
                    <p>{item.description || 'No description'}</p>
                    <p className="file-path">{item.filePath.split('/').pop() || 'unknown'}</p>
                    <div className="file-actions">
                      <button
                        onClick={() => handleDownload(item.filePath)}
                        className="download-btn"
                        disabled={!item.filePath}
                      >
                        📥 Download
                      </button>
                      <button
                        onClick={async () => {
                          if (confirm(`Delete "${item.title || 'file'}"?`)) {
                            try {
                              await axios.delete(`${API_BASE}/file/${item.id}`);
                              setFiles(files.filter(f => f.id !== item.id));
                              setMessage('File deleted!');
                            } catch (error) {
                              setMessage('Delete failed: ' + error.message);
                            }
                          }
                        }}
                        className="delete-btn"
                      >
                        🗑️ Delete
                      </button>
                    </div>
                  </div>
                ))}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}

export default App;




