import React, { useState, useCallback, useEffect, useRef } from 'react';
import { Upload, Check, X, Loader, Download, Camera, AlertTriangle, Sparkles, RefreshCw, Printer } from 'lucide-react';

// Smart API URL detection with connectivity testing
const getApiUrl = () => {
  // If explicitly set via environment variable, use that
  if (process.env.REACT_APP_API_URL) {
    return process.env.REACT_APP_API_URL;
  }
  
  // Auto-detect based on current hostname
  const hostname = window.location.hostname;
  
  if (hostname === 'localhost' || hostname === '127.0.0.1') {
    // Development environment - try local backend first, fallback to different ports
    return 'http://localhost:5001/api';
  } else {
    // Production environment
    return 'http://passport-photo-free.eba-teefmmhg.us-east-1.elasticbeanstalk.com/api';
  }
};

// Test API connectivity and fallback if needed
const testApiConnectivity = async (url) => {
  try {
    const response = await fetch(`${url}/health`, { 
      method: 'GET',
      timeout: 3000 
    });
    return response.ok;
  } catch (error) {
    return false;
  }
};

let API_URL = getApiUrl();

// Enhanced API call with automatic fallback
const makeApiCall = async (endpoint, options = {}) => {
  const attemptCall = async (baseUrl) => {
    const response = await fetch(`${baseUrl}${endpoint}`, options);
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    return response;
  };

  try {
    // Try primary API URL
    return await attemptCall(API_URL);
  } catch (error) {
    console.warn(`Primary API failed (${API_URL}):`, error.message);
    
    // If we're in development and primary failed, try alternative ports
    if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
      const fallbackPorts = ['5000', '5002', '8000'];
      
      for (const port of fallbackPorts) {
        const fallbackUrl = `http://localhost:${port}/api`;
        if (fallbackUrl !== API_URL) {
          try {
            console.log(`Trying fallback API: ${fallbackUrl}`);
            const result = await attemptCall(fallbackUrl);
            console.log(`✅ Fallback API successful: ${fallbackUrl}`);
            API_URL = fallbackUrl; // Update for future calls
            return result;
          } catch (fallbackError) {
            console.warn(`Fallback API failed (${fallbackUrl}):`, fallbackError.message);
          }
        }
      }
    }
    
    // If all attempts failed, throw the original error
    throw error;
  }
};

// Log the API URL being used for debugging
console.log('🔗 Primary API URL:', API_URL);

// --- Analytics Helper ---
const logAnalyticsEvent = (type, status, details) => {
  const payload = {
    event_type: type,
    status: status,
    details: details || {},
    client_timestamp: new Date().toISOString(),
  };
  
  // Use makeApiCall instead of fetch for better error handling
  makeApiCall('/log-event', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  }).catch(err => {
    console.warn('Analytics logging failed:', err);
  });
};


// A single item in the compliance checklist
const ComplianceItem = ({ text, compliant, loading }) => (
  <li className="flex items-center justify-between py-2">
    <span className="text-sm text-gray-600">{text}</span>
    <div className="w-5 h-5 flex items-center justify-center">
      {loading ? (
        <Loader className="w-4 h-4 text-gray-400 animate-spin" />
      ) : compliant === true ? (
        <Check className="w-5 h-5 text-green-500" />
      ) : compliant === false ? (
        <X className="w-5 h-5 text-red-500" />
      ) : (
        <div className="w-2 h-2 bg-gray-300 rounded-full" />
      )}
    </div>
  </li>
);

// The checklist for the ORIGINAL photo
const ComplianceChecklist = ({ analysis, loading, removeBackground }) => {
  if (!analysis && !loading) return null;

  const ai = analysis?.ai_analysis;
  const face = analysis?.face_detection;
  const faceDetectionFailed = face && !face.valid;

  const getAiCompliance = (detailKey) => {
    if (faceDetectionFailed) return false; // AI checks can't pass if no face is found
    if (ai?.analysis_details && ai.analysis_details[detailKey] !== undefined) {
      return ai.analysis_details[detailKey];
    }
    if (ai?.compliant === true) return true;
    return null;
  };

  const checks = [
    { id: 'resolution', text: "High-resolution", compliant: face?.image_dimensions ? (face.image_dimensions.width >= 600 && face.image_dimensions.height >= 600) : null },
    { id: 'centered', text: "Head centered", compliant: faceDetectionFailed ? false : face?.horizontally_centered },
    { id: 'headsize', text: "Correct head size", compliant: faceDetectionFailed ? false : face?.head_height_valid },
    { id: 'background', text: "Plain background", compliant: getAiCompliance('background_ok') },
    { id: 'expression', text: "Neutral expression", compliant: getAiCompliance('expression_neutral') },
    { id: 'eyes', text: "Eyes open", compliant: getAiCompliance('eyes_open') },
    { id: 'shadows', text: "No shadows", compliant: getAiCompliance('lighting_ok') },
    { id: 'obstructions', text: "No obstructions", compliant: getAiCompliance('no_obstructions') },
  ];

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 h-full">
      <h3 className="text-md font-semibold text-gray-800 mb-2">Compliance Analysis</h3>
      {faceDetectionFailed && (
        <div className="bg-red-50 text-red-800 text-sm p-3 rounded-md mb-3 font-semibold flex items-center gap-2">
          <AlertTriangle className="w-4 h-4" />
          <span>{face.error}</span>
        </div>
      )}
      <ul className="divide-y divide-gray-100">
        {checks.map((check) => {
          if (check.id === 'background' && removeBackground && check.compliant === false) {
            return (
              <li key={check.id} className="flex items-center justify-between py-2">
                <span className="text-sm text-gray-600">{check.text}</span>
                <div className="flex items-center gap-1.5 text-xs text-blue-600 font-medium">
                  <Sparkles className="w-4 h-4" />
                  <span>Will be replaced</span>
                </div>
              </li>
            );
          }
          return <ComplianceItem key={check.id} text={check.text} compliant={check.compliant} loading={loading && !analysis} />;
        })}
      </ul>
      {ai && !ai.compliant && ai.issues?.length > 0 && (
        <div className="mt-3 bg-yellow-50 border border-yellow-200 rounded-md p-3">
            <h4 className="text-sm font-semibold text-yellow-800 mb-1">Issues to Fix:</h4>
            <ul className="list-disc list-inside text-xs text-yellow-700">
                {ai.issues.map((issue, i) => <li key={i}>{issue}</li>)}
            </ul>
        </div>
      )}
    </div>
  );
};

// The confirmation checklist for the FINAL photo
const FinalChecks = ({ analysis, removeBackground }) => {
    if (!analysis) return null;
    const faceDetected = analysis.face_detection?.valid;

    return (
        <div className="mt-3 bg-green-50 border border-green-200 rounded-md p-3">
            <h4 className="text-sm font-semibold text-green-800 mb-2">Final Photo Compliance</h4>
            <ul className="space-y-1 text-xs text-green-700">
                <li className="flex items-center gap-2"><Check className="w-4 h-4" /> Correct 2x2 inch proportions (600x600px)</li>
                {faceDetected && <li className="flex items-center gap-2"><Check className="w-4 h-4" /> Head correctly sized and positioned</li>}
                {removeBackground && <li className="flex items-center gap-2"><Check className="w-4 h-4" /> Background is plain white</li>}
            </ul>
        </div>
    );
};


// The main App component
export default function PassportPhotoApp() {
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [loading, setLoading] = useState(false);
  const [analysis, setAnalysis] = useState(null);
  const [processedImage, setProcessedImage] = useState(null);
  const [error, setError] = useState(null);
  const [removeBackground, setRemoveBackground] = useState(true);
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [emailVerified, setEmailVerified] = useState(false);
  const [showOtpInput, setShowOtpInput] = useState(false);
  const [emailLoading, setEmailLoading] = useState(false);
  const [previewLoading, setPreviewLoading] = useState(false);
  const fileInputRef = useRef(null);

  const resetState = () => {
    setFile(null);
    setPreview(null);
    setLoading(false);
    setAnalysis(null);
    setProcessedImage(null);
    setError(null);
    setEmail('');
    setOtp('');
    setEmailVerified(false);
    setShowOtpInput(false);
    setEmailLoading(false);
    setPreviewLoading(false);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const sendOtp = async () => {
    if (!email || !email.includes('@')) {
      alert('Please enter a valid email address');
      return;
    }

    setEmailLoading(true);
    try {
      const response = await makeApiCall('/send-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      });
      
      const data = await response.json();
      if (response.ok) {
        setShowOtpInput(true);
        alert('OTP sent to your email! Check your inbox.');
      } else {
        alert(data.error || 'Failed to send OTP');
      }
    } catch (err) {
      alert('Network error. Please try again.');
    } finally {
      setEmailLoading(false);
    }
  };

  const verifyOtp = async () => {
    if (!otp || otp.length !== 6) {
      alert('Please enter the 6-digit OTP');
      return;
    }

    setEmailLoading(true);
    try {
      const response = await makeApiCall('/verify-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, otp })
      });
      
      const data = await response.json();
      if (response.ok) {
        console.log('OTP verified successfully, reprocessing image...');
        setEmailVerified(true);
        setShowOtpInput(false);
        // Reprocess image without watermark - pass email directly to ensure verification
        if (file) {
          console.log('Reprocessing image without watermark');
          processImageWithVerifiedEmail(file, email);
        } else {
          console.log('No file to reprocess');
        }
      } else {
        alert(data.error || 'Invalid OTP');
      }
    } catch (err) {
      alert('Network error. Please try again.');
    } finally {
      setEmailLoading(false);
    }
  };

  const processImage = useCallback(async (selectedFile, verifiedEmail = null) => {
    if (!selectedFile) return;

    setLoading(true);
    setError(null);
    setAnalysis(null);
    setProcessedImage(null);

    const formData = new FormData();
    formData.append('image', selectedFile);
    formData.append('remove_background', removeBackground);
    formData.append('use_ai', true);
    
    // Use verifiedEmail parameter if provided, otherwise check state
    const emailToUse = verifiedEmail || (emailVerified ? email : null);
    console.log('Email verification status:', emailVerified, 'Email:', email, 'Verified email param:', verifiedEmail);
    if (emailToUse) {
      console.log('Adding verified email to request:', emailToUse);
      formData.append('email', emailToUse);
    } else {
      console.log('Email not verified, watermark will be added. emailVerified:', emailVerified, 'email:', email);
    }

    try {
      const response = await makeApiCall('/full-workflow', { method: 'POST', body: formData });
      const data = await response.json();

      if (!response.ok) throw new Error(data.message || data.error || `Server error: ${response.status}`);
      
      const normalizedAnalysis = {
        face_detection: data.analysis?.face_detection || null,
        ai_analysis: data.analysis?.ai_analysis?.ai_analysis || data.analysis?.ai_analysis || null,
      };
      
      // Debug logging
      console.log('Raw API response:', data);
      console.log('Normalized analysis:', normalizedAnalysis);
      console.log('Face valid:', normalizedAnalysis.face_detection?.valid);
      console.log('AI compliant:', normalizedAnalysis.ai_analysis?.compliant);
      console.log('Face detection result:', normalizedAnalysis.face_detection);
      
      setAnalysis(normalizedAnalysis);

      if (data.success && data.processed_image) {
        setProcessedImage(`data:image/jpeg;base64,${data.processed_image}`);
        const isFullyCompliant = !!data.processed_image; // Show print sheets when image is processed
        console.log('Is fully compliant:', isFullyCompliant);
        logAnalyticsEvent('processing', isFullyCompliant ? 'success' : 'partial_success', {
          face_detected: normalizedAnalysis.face_detection?.valid,
          ai_compliant: normalizedAnalysis.ai_analysis?.compliant,
          ai_issues: normalizedAnalysis.ai_analysis?.issues,
        });
      } else {
        setError(data.message || "Processing failed.");
        logAnalyticsEvent('processing', 'failure', {
          error_message: data.message,
          face_error: normalizedAnalysis.face_detection?.error,
        });
      }

    } catch (err) {
      console.error("API Error:", err);
      setError(err.message || "An unknown error occurred.");
      logAnalyticsEvent('processing', 'error', { error_message: err.message });
    } finally {
      setLoading(false);
    }
  }, [removeBackground, emailVerified]);

  const processImageWithVerifiedEmail = useCallback(async (selectedFile, verifiedEmail) => {
    await processImage(selectedFile, verifiedEmail);
  }, [processImage]);

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile) {
      console.log('File selected:', selectedFile.name, selectedFile.size, 'bytes');
      
      // Clear any previous errors
      setError(null);
      setPreviewLoading(true);
      
      const reader = new FileReader();
      reader.onload = (e) => {
        console.log('FileReader loaded, setting preview');
        const result = e.target.result;
        
        // Check if it's a HEIC file and handle accordingly
        if (selectedFile.name.toLowerCase().endsWith('.heic')) {
          console.log('HEIC file detected, preview may not work in all browsers');
          // For HEIC files, we'll show a placeholder and let the backend handle conversion
          setPreview(null);
          setPreviewLoading(false);
          setFile(selectedFile);
          // Show a message that preview isn't available for HEIC
          console.log('HEIC preview not supported, proceeding with processing');
        } else {
          setPreview(result);
          setPreviewLoading(false);
          // Set file after preview is ready to avoid timing issues
          setFile(selectedFile);
        }
      };
      reader.onerror = (e) => {
        console.error('FileReader error:', e);
        setPreview(null);
        setPreviewLoading(false);
        
        // For HEIC files, this is expected - just proceed without preview
        if (selectedFile.name.toLowerCase().endsWith('.heic')) {
          console.log('HEIC preview failed as expected, proceeding with processing');
          setFile(selectedFile);
        } else {
          setError('Failed to load image preview. Please try a different image.');
        }
      };
      
      // Start reading the file
      reader.readAsDataURL(selectedFile);
    }
  };
  
  useEffect(() => {
    if (file) {
      processImage(file);
    }
  }, [file]); // Only depend on file, not processImage to prevent reprocessing when email changes

  const downloadSinglePhoto = () => {
    if (!processedImage) return;
    logAnalyticsEvent('download', 'single_photo');
    const link = document.createElement('a');
    link.href = processedImage;
    link.download = 'passport_photo_2x2.jpg';
    link.click();
  };

  const downloadPrintSheet = (paperSize) => {
    if (!processedImage) return;
    logAnalyticsEvent('download', 'print_sheet', { paper_size: paperSize });
  
    const DPI = 300;
    const PHOTO_SIZE_INCHES = 2;
    const photoSizePx = PHOTO_SIZE_INCHES * DPI; // 600px
  
    const paperDimensions = {
      '4x6': { width: 6 * DPI, height: 4 * DPI },
      '5x7': { width: 7 * DPI, height: 5 * DPI },
    };
  
    const { width, height } = paperDimensions[paperSize];
    
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
  
    ctx.fillStyle = 'white';
    ctx.fillRect(0, 0, width, height);
  
    const img = new Image();
    img.onload = () => {
      const positions = [];
      if (paperSize === '4x6') {
        const marginX = (width - (2 * photoSizePx)) / 3;
        const marginY = (height - photoSizePx) / 2;
        positions.push({ x: marginX, y: marginY });
        positions.push({ x: (2 * marginX) + photoSizePx, y: marginY });
      } else if (paperSize === '5x7') {
        const marginX = (width - (2 * photoSizePx)) / 3;
        const marginY = (height - (2 * photoSizePx)) / 3;
        positions.push({ x: marginX, y: marginY });
        positions.push({ x: (2 * marginX) + photoSizePx, y: marginY });
        positions.push({ x: marginX, y: (2 * marginY) + photoSizePx });
        positions.push({ x: (2 * marginX) + photoSizePx, y: (2 * marginY) + photoSizePx });
      }
  
      positions.forEach(pos => {
        ctx.drawImage(img, pos.x, pos.y, photoSizePx, photoSizePx);
      });
  
      // Draw grid lines
      ctx.strokeStyle = '#000000';  // Pure black for easy visibility
      ctx.lineWidth = 3;            // Much thicker lines for cutting
      ctx.setLineDash([8, 4]);      // Longer dashes, easier to see
  
      positions.forEach(pos => {
        // Draw a box around each photo
        ctx.strokeRect(pos.x, pos.y, photoSizePx, photoSizePx);
      });

      // Add measurement indicators to show 2x2 inch scale for ALL photos
      ctx.setLineDash([]); // Solid lines for measurements
      ctx.strokeStyle = '#000000';
      ctx.lineWidth = 2;
      ctx.fillStyle = '#000000';
      ctx.font = 'bold 20px Arial';
      ctx.textAlign = 'center';

      // Add measurements for each photo
      positions.forEach((pos, index) => {
        // Top measurement line (2 inches)
        const topY = pos.y - 25;
        ctx.beginPath();
        ctx.moveTo(pos.x, topY);
        ctx.lineTo(pos.x + photoSizePx, topY);
        ctx.stroke();
        
        // Top measurement ticks
        ctx.beginPath();
        ctx.moveTo(pos.x, topY - 4);
        ctx.lineTo(pos.x, topY + 4);
        ctx.moveTo(pos.x + photoSizePx, topY - 4);
        ctx.lineTo(pos.x + photoSizePx, topY + 4);
        ctx.stroke();
        
        // Top measurement text
        ctx.fillText('2"', pos.x + photoSizePx/2, topY - 8);
        
        // Left measurement line (2 inches)
        const leftX = pos.x - 25;
        ctx.beginPath();
        ctx.moveTo(leftX, pos.y);
        ctx.lineTo(leftX, pos.y + photoSizePx);
        ctx.stroke();
        
        // Left measurement ticks
        ctx.beginPath();
        ctx.moveTo(leftX - 4, pos.y);
        ctx.lineTo(leftX + 4, pos.y);
        ctx.moveTo(leftX - 4, pos.y + photoSizePx);
        ctx.lineTo(leftX + 4, pos.y + photoSizePx);
        ctx.stroke();
        
        // Left measurement text (rotated)
        ctx.save();
        ctx.translate(leftX - 12, pos.y + photoSizePx/2);
        ctx.rotate(-Math.PI/2);
        ctx.fillText('2"', 0, 0);
        ctx.restore();
      });
  
      const link = document.createElement('a');
      link.href = canvas.toDataURL('image/jpeg');
      link.download = `passport_photos_${paperSize}.jpg`;
      link.click();
    };
    img.src = processedImage;
  };

  // Only show advanced features (watermark removal, print sheets) if face was detected
  const faceDetected = analysis?.face_detection?.valid === true;
  const isFullyCompliant = !!processedImage && faceDetected;
  
  // Debug logging for face detection status
  console.log('=== FACE DETECTION DEBUG ===');
  console.log('analysis:', analysis);
  console.log('analysis?.face_detection:', analysis?.face_detection);
  console.log('analysis?.face_detection?.valid:', analysis?.face_detection?.valid);
  console.log('faceDetected (computed):', faceDetected);
  console.log('isFullyCompliant (computed):', isFullyCompliant);
  console.log('processedImage exists:', !!processedImage);
  console.log('=== END DEBUG ===');
  
  if (analysis?.face_detection) {
    console.log('Face detection status:', {
      valid: analysis.face_detection.valid,
      error: analysis.face_detection.error,
      faces_detected: analysis.face_detection.faces_detected
    });
  }

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-gray-800">
      <header className="bg-white border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Camera className="w-7 h-7 text-indigo-600" />
            <h1 className="text-xl font-bold text-slate-800">AI Passport Photo Tool</h1>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {!file ? (
          <div className="text-center">
            <h2 className="text-3xl font-extrabold text-slate-900 tracking-tight">Get your U.S. visa photo in seconds</h2>
            <p className="mt-3 text-lg text-slate-600 max-w-2xl mx-auto">Our AI ensures your photo meets all official requirements for free.</p>
            <div className="mt-8">
              <label htmlFor="file-upload" className="w-full max-w-lg mx-auto flex flex-col items-center justify-center px-6 py-12 border-2 border-dashed border-gray-300 rounded-xl cursor-pointer hover:bg-gray-100 transition-colors">
                <Upload className="w-12 h-12 text-gray-400" />
                <span className="mt-4 text-lg font-medium text-indigo-600">Click to Upload a Photo</span>
                <span className="mt-1 text-sm text-gray-500">PNG, JPG, or HEIC files accepted</span>
              </label>
              <input id="file-upload" name="file-upload" type="file" className="sr-only" accept="image/png, image/jpeg, image/heic" onChange={handleFileChange} />
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Column 1: Original & Controls */}
            <div className="lg:col-span-1 space-y-4">
              <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
                <h3 className="text-md font-semibold text-gray-800 mb-3">Original Photo</h3>
                <div className="aspect-square bg-slate-100 rounded-md flex items-center justify-center overflow-hidden">
                  {preview ? (
                    <img 
                      src={preview} 
                      alt="Original" 
                      className="w-full h-full object-contain"
                      onError={(e) => {
                        console.error('Preview image failed to load');
                        setError('Failed to display image preview');
                      }}
                    />
                  ) : previewLoading ? (
                    <div className="flex flex-col items-center justify-center text-gray-500">
                      <Loader className="w-8 h-8 animate-spin mb-2" />
                      <span className="text-sm">Loading preview...</span>
                    </div>
                  ) : file && file.name.toLowerCase().endsWith('.heic') ? (
                    <div className="flex flex-col items-center justify-center text-gray-600 p-4 text-center">
                      <Camera className="w-12 h-12 mb-2" />
                      <span className="text-sm font-medium">{file.name}</span>
                      <span className="text-xs text-gray-500 mt-1">HEIC preview not supported</span>
                      <span className="text-xs text-gray-500">Processing will convert to JPEG</span>
                    </div>
                  ) : file ? (
                    <div className="flex flex-col items-center justify-center text-gray-600 p-4 text-center">
                      <Camera className="w-12 h-12 mb-2" />
                      <span className="text-sm font-medium">{file.name}</span>
                      <span className="text-xs text-gray-500 mt-1">Preview not available</span>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center text-gray-400">
                      <Camera className="w-12 h-12 mb-2" />
                      <span className="text-sm">No image selected</span>
                    </div>
                  )}
                </div>
              </div>
              <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200 space-y-3">
                <button onClick={resetState} className="w-full flex items-center justify-center gap-2 px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50">
                  <RefreshCw className="w-4 h-4" />
                  Start Over
                </button>
                <div className="flex items-center justify-between p-2 bg-slate-50 rounded-md">
                  <span className="text-sm font-medium text-slate-700">Remove Background</span>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input type="checkbox" checked={removeBackground} onChange={() => setRemoveBackground(!removeBackground)} className="sr-only peer" disabled={loading} />
                    <div className="w-11 h-6 bg-gray-200 rounded-full peer peer-focus:ring-2 peer-focus:ring-indigo-300 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
                  </label>
                </div>
              </div>
            </div>

            {/* Column 2: Analysis Checklist */}
            <div className="lg:col-span-1">
              <div className="h-full flex flex-col space-y-4">
                <ComplianceChecklist analysis={analysis} loading={loading} removeBackground={removeBackground} />
                {error && (
                  <div className="bg-red-50 border-l-4 border-red-400 text-red-800 p-3 rounded-r-lg" role="alert">
                    <p className="font-bold text-sm">Processing Error</p>
                    <p className="text-xs">{error}</p>
                  </div>
                )}
              </div>
            </div>

            {/* Column 3: Processed Image */}
            <div className="lg:col-span-1">
              <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200 h-full flex flex-col">
                <h3 className="text-md font-semibold text-gray-800 mb-3 flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-indigo-500" />
                  Processed Photo
                  {analysis?.face_detection && (
                    <span className={`text-xs px-2 py-1 rounded ${
                      faceDetected ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                    }`}>
                      {faceDetected ? 'Face ✓' : 'No Face ✗'}
                    </span>
                  )}
                </h3>
                <div className="aspect-square bg-slate-100 rounded-md flex-grow flex items-center justify-center overflow-hidden relative">
                  {loading ? (
                    <div className="w-full h-full">
                      {preview && <img src={preview} alt="Processing" className="w-full h-full object-contain opacity-40" />}
                      <div className="absolute inset-0 bg-black/10 flex flex-col items-center justify-center text-white">
                        <div className="scanning-line"></div>
                        <Loader className="w-8 h-8 animate-spin drop-shadow-lg" />
                        <p className="mt-2 font-semibold drop-shadow-lg">Processing...</p>
                      </div>
                    </div>
                  ) : error ? (
                    <AlertTriangle className="w-10 h-10 text-red-400" />
                  ) : processedImage ? (
                    <img src={processedImage} alt="Processed" className="w-full h-full object-contain" />
                  ) : null}
                </div>
                {processedImage && !loading && !error && (
                    <div>
                        {faceDetected ? (
                            <>
                                {!emailVerified && (
                                    <div className="mt-3 p-3 bg-yellow-50 border border-yellow-200 rounded-md">
                                        <p className="text-xs text-yellow-800 mb-2">⚠️ Watermark will be removed after email verification</p>
                                        {!showOtpInput ? (
                                            <div className="space-y-2">
                                                <input
                                                    type="email"
                                                    placeholder="Enter your email"
                                                    value={email}
                                                    onChange={(e) => setEmail(e.target.value)}
                                                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                                />
                                                <button
                                                    onClick={sendOtp}
                                                    disabled={emailLoading}
                                                    className="w-full px-3 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 rounded-md"
                                                >
                                                    {emailLoading ? 'Sending...' : 'Send Verification Code'}
                                                </button>
                                            </div>
                                        ) : (
                                            <div className="space-y-2">
                                                <input
                                                    type="text"
                                                    placeholder="Enter 6-digit code"
                                                    value={otp}
                                                    onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                                                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                                />
                                                <button
                                                    onClick={verifyOtp}
                                                    disabled={emailLoading}
                                                    className="w-full px-3 py-2 text-sm font-medium text-white bg-green-600 hover:bg-green-700 disabled:bg-gray-400 rounded-md"
                                                >
                                                    {emailLoading ? 'Verifying..' : 'Verify Code'}
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                )}
                                
                                <button onClick={downloadSinglePhoto} className="w-full mt-3 flex items-center justify-center gap-2 px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700">
                                    <Download className="w-4 h-4" />
                                    Download Single Photo {emailVerified ? '(No Watermark)' : '(With Watermark)'}
                                </button>
                            </>
                        ) : (
                            <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-md">
                                <p className="text-sm text-red-800 font-medium mb-2">⚠️ No Face Detected</p>
                                <p className="text-xs text-red-700 mb-3">
                                    A passport photo requires a clearly visible face. Please upload a different image with:
                                </p>
                                <ul className="text-xs text-red-700 list-disc list-inside space-y-1">
                                    <li>Clear, frontal view of face</li>
                                    <li>Good lighting without shadows</li>
                                    <li>Face taking up 50-69% of image height</li>
                                    <li>Plain background</li>
                                </ul>
                                <button onClick={downloadSinglePhoto} className="w-full mt-3 flex items-center justify-center gap-2 px-4 py-2 border border-red-300 text-sm font-medium rounded-md text-red-700 bg-red-50 hover:bg-red-100">
                                    <Download className="w-4 h-4" />
                                    Download Processed Image (Not Passport Ready)
                                </button>
                            </div>
                        )}
                        {isFullyCompliant && (
                            <div className="mt-4">
                                <h4 className="text-sm font-semibold text-center text-gray-600 mb-2">Print Sheets</h4>
                                <div className="flex gap-2">
                                    <button onClick={() => downloadPrintSheet('4x6')} className="w-full flex items-center justify-center gap-2 px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50">
                                        <Printer className="w-4 h-4" />
                                        4x6
                                    </button>
                                    <button onClick={() => downloadPrintSheet('5x7')} className="w-full flex items-center justify-center gap-2 px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50">
                                        <Printer className="w-4 h-4" />
                                        5x7
                                    </button>
                                </div>
                            </div>
                        )}
                        {isFullyCompliant && <FinalChecks analysis={analysis} removeBackground={removeBackground} />}
                    </div>
                )}
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}