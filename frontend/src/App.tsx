import React, { useState, useEffect, useRef } from 'react';

interface Probability {
  class_name: string;
  display_name: string;
  probability: number;
}

interface PredictionResult {
  predicted_class: string;
  quality: string;
  food: string;
  confidence: number;
  probabilities: Probability[];
}

interface ScanHistoryItem {
  id: string;
  timestamp: string;
  food: string;
  quality: string;
  confidence: number;
  imageSrc: string; // Base64 data URI
}

interface ToastMessage {
  text: string;
  type: 'success' | 'error';
}

const API_BASE_URL = 'http://127.0.0.1:8000';

const compressImage = (dataUrl: string, maxWidth = 200, maxHeight = 200): Promise<string> => {
  return new Promise((resolve) => {
    const img = new Image();
    img.src = dataUrl;
    img.onload = () => {
      const canvas = document.createElement('canvas');
      let width = img.width;
      let height = img.height;

      if (width > height) {
        if (width > maxWidth) {
          height = Math.round((height * maxWidth) / width);
          width = maxWidth;
        }
      } else {
        if (height > maxHeight) {
          width = Math.round((width * maxHeight) / height);
          height = maxHeight;
        }
      }

      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/jpeg', 0.7)); // compress as JPEG with 70% quality
      } else {
        resolve(dataUrl);
      }
    };
    img.onerror = () => resolve(dataUrl);
  });
};

function App() {
  // Navigation & Theme
  const [activeTab, setActiveTab] = useState<'home' | 'history' | 'tech'>('home');
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    const saved = localStorage.getItem('theme');
    if (saved === 'dark' || saved === 'light') return saved;
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  });

  // Analyzer State
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [result, setResult] = useState<PredictionResult | null>(null);
  
  // Drag & Drop State
  const [dragActive, setDragActive] = useState<boolean>(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // History State
  const [history, setHistory] = useState<ScanHistoryItem[]>(() => {
    try {
      const saved = localStorage.getItem('scan_history');
      return saved ? JSON.parse(saved) : [];
    } catch (e) {
      console.error('Failed to parse scan history:', e);
      return [];
    }
  });

  // Notifications State
  const [toast, setToast] = useState<ToastMessage | null>(null);

  // Show toast notification
  const showToast = (text: string, type: 'success' | 'error') => {
    setToast({ text, type });
    setTimeout(() => {
      setToast(null);
    }, 4000);
  };

  // Theme Sync
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
  }, [theme]);

  // History Persist
  useEffect(() => {
    try {
      localStorage.setItem('scan_history', JSON.stringify(history));
    } catch (e) {
      console.error('Failed to save scan history to localStorage:', e);
      setTimeout(() => {
        showToast('Storage quota exceeded. Clear some records to save new scans.', 'error');
      }, 0);
    }
  }, [history]);

  // Scroll to Analyzer
  const scrollToAnalyzer = () => {
    setActiveTab('home');
    setTimeout(() => {
      const element = document.getElementById('analyzer-section');
      if (element) {
        element.scrollIntoView({ behavior: 'smooth' });
      }
    }, 100);
  };

  // Handle Drag Over
  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  // Handle Drop
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      validateAndSetFile(file);
    }
  };

  // File Input Change
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      validateAndSetFile(file);
    }
  };

  // Check file type
  const validateAndSetFile = (file: File) => {
    if (!file.type.startsWith('image/')) {
      showToast('Please upload an image file (PNG, JPG, or JPEG).', 'error');
      return;
    }
    setSelectedFile(file);
    const reader = new FileReader();
    reader.onloadend = () => {
      setPreviewUrl(reader.result as string);
    };
    reader.readAsDataURL(file);
    setResult(null); // Reset results
  };

  // Remove selected image
  const removeImage = () => {
    setSelectedFile(null);
    setPreviewUrl(null);
    setResult(null);
  };

  // Handle Form Submission / API Prediction call
  const analyzeImage = async () => {
    if (!selectedFile) {
      showToast('Please select or drop an image first.', 'error');
      return;
    }

    setLoading(true);
    setResult(null);

    const formData = new FormData();
    formData.append('file', selectedFile);

    try {
      const response = await fetch(`${API_BASE_URL}/api/predict`, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.detail || 'Failed to analyze the image.');
      }

      const data: PredictionResult = await response.json();
      setResult(data);
      showToast('Image analyzed successfully!', 'success');

      // Add to history list (convert preview URL to data URL to save image thumbnail)
      if (previewUrl) {
        const thumbnail = await compressImage(previewUrl);
        const newItem: ScanHistoryItem = {
          id: Date.now().toString(),
          timestamp: new Date().toLocaleString(),
          food: data.food,
          quality: data.quality,
          confidence: data.confidence,
          imageSrc: thumbnail,
        };
        setHistory((prev) => [newItem, ...prev.slice(0, 19)]); // Cap history at 20 items
      }
    } catch (err) {
      const error = err as Error;
      console.error(error);
      showToast(error.message || 'Error connecting to the API server.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const deleteHistoryItem = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setHistory((prev) => prev.filter((item) => item.id !== id));
    showToast('Record deleted.', 'success');
  };

  const clearAllHistory = () => {
    if (window.confirm('Are you sure you want to clear all history?')) {
      setHistory([]);
      showToast('History cleared.', 'success');
    }
  };

  // Load history item back into analyzer
  const loadHistoryItem = (item: ScanHistoryItem) => {
    setPreviewUrl(item.imageSrc);
    // Convert base64 back to file mock
    fetch(item.imageSrc)
      .then((res) => res.blob())
      .then((blob) => {
        const file = new File([blob], `${item.food.toLowerCase()}_history.jpg`, { type: 'image/jpeg' });
        setSelectedFile(file);
      });
    
    // Construct predicted class name formatted prediction result
    const simulatedResult: PredictionResult = {
      predicted_class: `${item.quality}_${item.food.toLowerCase()}`,
      quality: item.quality,
      food: item.food,
      confidence: item.confidence,
      probabilities: [
        {
          class_name: `${item.quality}_${item.food.toLowerCase()}`,
          display_name: `${item.quality.toUpperCase()} ${item.food}`,
          probability: item.confidence,
        },
      ],
    };
    setResult(simulatedResult);
    setActiveTab('home');
    showToast('Loaded scan details from history!', 'success');
  };

  return (
    <>
      {/* Toast Notification */}
      {toast && (
        <div className={`toast ${toast.type}`}>
          <span style={{ display: 'inline-flex', alignItems: 'center' }}>
            {toast.type === 'success' ? (
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12" />
              </svg>
            ) : (
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            )}
          </span>
          <p>{toast.text}</p>
        </div>
      )}

      {/* Header & Navbar */}
      <header className="app-header">
        <div className="container navbar">
          <div className="logo" onClick={() => setActiveTab('home')} style={{ cursor: 'pointer' }}>
            <span style={{ display: 'inline-flex', marginRight: '4px', color: 'var(--accent-primary)' }}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 7V5a2 2 0 0 1 2-2h2M17 3h2a2 2 0 0 1 2 2v2M21 17v2a2 2 0 0 1-2 2h-2M7 21H5a2 2 0 0 1-2-2v-2" />
                <circle cx="12" cy="12" r="3.5" />
              </svg>
            </span>
            <div className="logo-text">
              Fresh<span>Scan</span> AI
            </div>
          </div>
          <nav>
            <ul className="nav-links">
              <li>
                <a 
                  href="#home" 
                  className={activeTab === 'home' ? 'active' : ''} 
                  onClick={(e) => { e.preventDefault(); setActiveTab('home'); }}
                >
                  Scanner
                </a>
              </li>
              <li>
                <a 
                  href="#history" 
                  className={activeTab === 'history' ? 'active' : ''} 
                  onClick={(e) => { e.preventDefault(); setActiveTab('history'); }}
                >
                  History
                </a>
              </li>
              <li>
                <a 
                  href="#tech" 
                  className={activeTab === 'tech' ? 'active' : ''} 
                  onClick={(e) => { e.preventDefault(); setActiveTab('tech'); }}
                >
                  Technology
                </a>
              </li>
            </ul>
          </nav>
          <div className="nav-actions">
            <button 
              className="theme-toggle" 
              onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}
              aria-label="Toggle Light/Dark Theme"
              style={{ display: 'inline-flex', alignContent: 'center', justifyContent: 'center' }}
            >
              {theme === 'light' ? (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
                </svg>
              ) : (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="5" />
                  <line x1="12" y1="1" x2="12" y2="3" />
                  <line x1="12" y1="21" x2="12" y2="23" />
                  <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
                  <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
                  <line x1="1" y1="12" x2="3" y2="12" />
                  <line x1="21" y1="12" x2="23" y2="12" />
                  <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
                  <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
                </svg>
              )}
            </button>
          </div>
        </div>
      </header>

      <main className="container">
        {activeTab === 'home' && (
          <>
            {/* Hero Section */}
            <section className="hero-section">
              <div className="hero-content">
                <div className="hero-tag">AI Food Quality Inspector</div>
                <h1 className="hero-title">
                  Verify Freshness <span>Instantly</span> using AI
                </h1>
                <p className="hero-description">
                  Ensure food quality and minimize waste. Upload images of fruits or vegetables to receive instant quality reports powered by deep neural networks.
                </p>
                <div className="hero-actions">
                  <button className="btn btn-primary" onClick={scrollToAnalyzer}>
                    Start Scanning
                  </button>
                  <button className="btn btn-secondary" onClick={() => setActiveTab('tech')}>
                    Learn How It Works
                  </button>
                </div>
              </div>
              <div className="hero-image-wrapper">
                <img 
                  src="/hero-image.jpg" 
                  alt="Food Inspection Illustration" 
                  className="hero-image"
                  onError={(e) => {
                    // Fallback if image fails to load
                    e.currentTarget.src = 'https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&q=80&w=1000';
                  }}
                />
                <div className="hero-image-overlay"></div>
              </div>
            </section>

            {/* Analyzer Section */}
            <section id="analyzer-section" style={{ padding: '60px 0' }}>
              <div className="section-title-wrapper">
                <h2 className="section-title">Scan Food Specimen</h2>
                <p className="section-subtitle">
                  Upload an image from your device or drop it in the container below to analyze freshness.
                </p>
              </div>

              <div className="analyzer-grid">
                {/* Upload Card */}
                <div className="card">
                  <h3 className="card-title">
                    <span style={{ display: 'inline-flex', marginRight: '8px', color: 'var(--text-secondary)' }}>
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
                        <circle cx="12" cy="13" r="4" />
                      </svg>
                    </span>
                    Image Specimen
                  </h3>
                  
                  {previewUrl ? (
                    <div>
                      <div className="preview-container">
                        <img src={previewUrl} alt="Specimen Preview" className="preview-image" />
                        <button className="btn-remove-image" onClick={removeImage} title="Remove image">
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                          </svg>
                        </button>
                      </div>
                      <button 
                        className="btn btn-primary" 
                        onClick={analyzeImage} 
                        style={{ width: '100%', justifyContent: 'center' }}
                        disabled={loading}
                      >
                        {loading ? 'Analyzing...' : 'Run Quality Analysis'}
                      </button>
                    </div>
                  ) : (
                    <div 
                      className={`upload-zone ${dragActive ? 'drag-active' : ''}`}
                      onDragEnter={handleDrag}
                      onDragOver={handleDrag}
                      onDragLeave={handleDrag}
                      onDrop={handleDrop}
                      onClick={() => fileInputRef.current?.click()}
                    >
                      <input 
                        type="file" 
                        ref={fileInputRef} 
                        className="file-input" 
                        accept="image/*" 
                        onChange={handleFileChange} 
                      />
                      <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="var(--accent-primary)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ marginBottom: '8px' }}>
                        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M17 8l-5-5-5 5M12 3v12"/>
                      </svg>
                      <div className="upload-text">
                        <h3>Drag and drop your image here</h3>
                        <p>Supports PNG, JPG, JPEG files</p>
                      </div>
                      <button className="btn btn-secondary" style={{ marginTop: '8px' }}>
                        Browse Files
                      </button>
                    </div>
                  )}
                </div>

                {/* Results Card */}
                <div className="card" style={{ display: 'flex', flexDirection: 'column' }}>
                  <h3 className="card-title">
                    <span style={{ display: 'inline-flex', marginRight: '8px', color: 'var(--text-secondary)' }}>
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                        <line x1="18" y1="20" x2="18" y2="10" />
                        <line x1="12" y1="20" x2="12" y2="4" />
                        <line x1="6" y1="20" x2="6" y2="14" />
                      </svg>
                    </span>
                    Analysis Report
                  </h3>

                  {loading && (
                    <div className="loading-spinner-wrapper">
                      <div className="spinner"></div>
                      <p style={{ fontWeight: 500 }}>Scanning specimen with neural networks...</p>
                    </div>
                  )}

                  {!loading && !result && (
                    <div className="status-placeholder">
                      <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ marginBottom: '16px', opacity: 0.7 }}>
                        <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                        <path d="M12 2v2M5 11V9a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v2M9 16h.01M15 16h.01" />
                      </svg>
                      <h3>Awaiting Specimen</h3>
                      <p>Upload and analyze an image to view quality metrics and confidence scores.</p>
                    </div>
                  )}

                  {!loading && result && (
                    <div style={{ flexGrow: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                      <div className="results-header">
                        <div>
                          <h4 style={{ fontSize: '0.85rem', textTransform: 'uppercase', color: 'var(--text-muted)', letterSpacing: '0.5px' }}>
                            Identified Item
                          </h4>
                          <h3 className="food-type-name">{result.food}</h3>
                        </div>
                        <span className={`result-badge ${result.quality}`}>
                          {result.quality}
                        </span>
                      </div>

                      <div className="confidence-ring-container">
                        <span className="confidence-label">Confidence Score</span>
                        <div className={`confidence-value ${result.quality}`}>
                          {(result.confidence * 100).toFixed(1)}%
                        </div>
                      </div>

                      <div className="probabilities-list">
                        <h4 style={{ fontSize: '0.9rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '8px', marginBottom: '4px' }}>
                          Model Class Probabilities
                        </h4>
                        {result.probabilities.map((prob, idx) => (
                          <div key={idx} className="probability-item">
                            <div className="probability-info">
                              <span className="probability-class">{prob.display_name}</span>
                              <span className="probability-value">{(prob.probability * 100).toFixed(1)}%</span>
                            </div>
                            <div className="progress-bar-bg">
                              <div 
                                className={`progress-bar-fill ${prob.class_name.startsWith('fresh') ? 'fresh' : 'rotten'}`} 
                                style={{ width: `${prob.probability * 100}%` }}
                              ></div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </section>
          </>
        )}

        {/* History Tab */}
        {activeTab === 'history' && (
          <section className="history-section">
            <div className="section-title-wrapper" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', textAlign: 'left', marginBottom: '32px' }}>
              <div>
                <h2 className="section-title" style={{ margin: 0 }}>Recent Inspection Records</h2>
                <p className="section-subtitle" style={{ margin: 0 }}>Locally cached scan metrics and classifications.</p>
              </div>
              {history.length > 0 && (
                <button className="btn btn-secondary" onClick={clearAllHistory}>
                  Clear All
                </button>
              )}
            </div>

            {history.length === 0 ? (
              <div className="card empty-history">
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ marginBottom: '16px', opacity: 0.7 }}>
                  <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
                </svg>
                <h3>No History Records</h3>
                <p>Scanned food quality assessments will appear here for easy comparison.</p>
                <button className="btn btn-primary" onClick={() => setActiveTab('home')} style={{ marginTop: '20px' }}>
                  Analyze an Image
                </button>
              </div>
            ) : (
              <div className="table-container">
                <table className="history-table">
                  <thead>
                    <tr>
                      <th>Specimen</th>
                      <th>Classified Food</th>
                      <th>Quality State</th>
                      <th>Confidence Score</th>
                      <th>Scan Timestamp</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {history.map((item) => (
                      <tr key={item.id} onClick={() => loadHistoryItem(item)} style={{ cursor: 'pointer' }}>
                        <td>
                          <img src={item.imageSrc} alt={item.food} className="history-img-thumb" />
                        </td>
                        <td style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                          {item.food}
                        </td>
                        <td>
                          <span className={`quality-badge ${item.quality}`}>
                            {item.quality}
                          </span>
                        </td>
                        <td style={{ fontFamily: 'var(--font-heading)', fontWeight: 700 }}>
                          {(item.confidence * 100).toFixed(1)}%
                        </td>
                        <td style={{ fontSize: '0.85rem' }}>
                          {item.timestamp}
                        </td>
                        <td>
                          <button 
                            className="btn-icon" 
                            onClick={(e) => deleteHistoryItem(item.id, e)}
                            title="Delete record"
                            style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}
                          >
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <polyline points="3 6 5 6 21 6" />
                              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                            </svg>
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        )}

        {/* Technology Tab */}
        {activeTab === 'tech' && (
          <section className="tech-section" style={{ border: 'none', background: 'transparent' }}>
            <div className="section-title-wrapper">
              <h2 className="section-title">Deep Learning Architecture</h2>
              <p className="section-subtitle">
                Understanding the underlying transfer learning model and image processing pipeline.
              </p>
            </div>

            <div className="tech-grid">
              <div className="tech-card">
                <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="var(--accent-primary)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ marginBottom: '16px' }}>
                  <path d="M9.5 2A2.5 2.5 0 0 1 12 4.5v15a2.5 2.5 0 0 1-4.96-.44 2.5 2.5 0 0 1 0-3.12 3 3 0 0 1 0-3.88 2.5 2.5 0 0 1 0-3.12A2.5 2.5 0 0 1 9.5 2zM14.5 2A2.5 2.5 0 0 0 12 4.5v15a2.5 2.5 0 0 0 4.96-.44 2.5 2.5 0 0 0 0-3.12 3 3 0 0 0 0-3.88 2.5 2.5 0 0 0 0-3.12A2.5 2.5 0 0 0 14.5 2z" />
                </svg>
                <h3>MobileNetV2 Model</h3>
                <p>
                  Built upon the light-weight MobileNetV2 architecture pretrained on ImageNet. Re-engineered to identify freshness indicators of 14 categories of produce.
                </p>
              </div>
              <div className="tech-card">
                <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="var(--accent-primary)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ marginBottom: '16px' }}>
                  <path d="M5 3v18h18" />
                  <path d="M5 17h4M5 13h8M5 9h12M5 5h14" />
                </svg>
                <h3>Resolution Rescaling</h3>
                <p>
                  Images are normalized and resized dynamically to 224 x 224 pixels with 3 color channels (RGB) to match the expected input layer dimensions of the neural net.
                </p>
              </div>
              <div className="tech-card">
                <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="var(--accent-primary)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ marginBottom: '16px' }}>
                  <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
                </svg>
                <h3>Sustainability Impact</h3>
                <p>
                  By enabling simple visual quality categorization, this system assists suppliers and households in minimizing waste, optimizing storage, and utilizing fresh items.
                </p>
              </div>
            </div>

            <div className="card" style={{ marginTop: '48px', textAlign: 'left' }}>
              <h3 style={{ marginBottom: '16px' }}>Model Classification Capabilities</h3>
              <p style={{ marginBottom: '20px' }}>
                The AI model distinguishes between <strong>Fresh</strong> and <strong>Rotten</strong> variants for the following food specimens:
              </p>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '16px' }}>
                <div style={{ padding: '12px', borderRadius: '8px', backgroundColor: 'var(--bg-primary)' }}>Apple</div>
                <div style={{ padding: '12px', borderRadius: '8px', backgroundColor: 'var(--bg-primary)' }}>Banana</div>
                <div style={{ padding: '12px', borderRadius: '8px', backgroundColor: 'var(--bg-primary)' }}>Bell Pepper</div>
                <div style={{ padding: '12px', borderRadius: '8px', backgroundColor: 'var(--bg-primary)' }}>Carrot</div>
                <div style={{ padding: '12px', borderRadius: '8px', backgroundColor: 'var(--bg-primary)' }}>Cucumber</div>
                <div style={{ padding: '12px', borderRadius: '8px', backgroundColor: 'var(--bg-primary)' }}>Grape</div>
                <div style={{ padding: '12px', borderRadius: '8px', backgroundColor: 'var(--bg-primary)' }}>Mango</div>
                <div style={{ padding: '12px', borderRadius: '8px', backgroundColor: 'var(--bg-primary)' }}>Orange</div>
                <div style={{ padding: '12px', borderRadius: '8px', backgroundColor: 'var(--bg-primary)' }}>Potato</div>
                <div style={{ padding: '12px', borderRadius: '8px', backgroundColor: 'var(--bg-primary)' }}>Strawberry</div>
                <div style={{ padding: '12px', borderRadius: '8px', backgroundColor: 'var(--bg-primary)' }}>Tomato</div>
                <div style={{ padding: '12px', borderRadius: '8px', backgroundColor: 'var(--bg-primary)' }}>Other Produce</div>
              </div>
            </div>
          </section>
        )}
      </main>

      {/* Footer */}
      <footer className="app-footer">
        <div className="container footer-content">
          <p>© {new Date().getFullYear()} FreshScan AI. Minimal, aesthetic quality checking tool.</p>
          <div className="tech-badges">
            <span className="tech-badge">React</span>
            <span className="tech-badge">TypeScript</span>
            <span className="tech-badge">FastAPI</span>
            <span className="tech-badge">TensorFlow</span>
            <span className="tech-badge">MobileNetV2</span>
          </div>
        </div>
      </footer>
    </>
  );
}

export default App;
