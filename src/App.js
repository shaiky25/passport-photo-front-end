import React, { useState, useCallback, useEffect, useRef } from 'react';
import { Upload, Check, X, Loader, Download, Camera, AlertTriangle, Sparkles, RefreshCw, Printer } from 'lucide-react';

const API_URL = 'http://localhost:5000/api';

// --- Analytics Helper ---
const logAnalyticsEvent = (type, status, details) => {
  const payload = {
    event_type: type,
    status: status,
    details: details || {},
    client_timestamp: new Date().toISOString(),
  };
  navigator.sendBeacon(`${API_URL}/log-event`, JSON.stringify(payload));
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
  const fileInputRef = useRef(null);

  const resetState = () => {
    setFile(null);
    setPreview(null);
    setLoading(false);
    setAnalysis(null);
    setProcessedImage(null);
    setError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const processImage = useCallback(async (selectedFile) => {
    if (!selectedFile) return;

    setLoading(true);
    setError(null);
    setAnalysis(null);
    setProcessedImage(null);

    const formData = new FormData();
    formData.append('image', selectedFile);
    formData.append('remove_background', removeBackground);
    formData.append('use_ai', true);

    try {
      const response = await fetch(`${API_URL}/full-workflow`, { method: 'POST', body: formData });
      const data = await response.json();

      if (!response.ok) throw new Error(data.message || data.error || `Server error: ${response.status}`);
      
      const normalizedAnalysis = {
        face_detection: data.analysis?.face_detection || null,
        ai_analysis: data.analysis?.ai_analysis?.ai_analysis || null,
      };
      setAnalysis(normalizedAnalysis);

      if (data.success && data.processed_image) {
        setProcessedImage(`data:image/jpeg;base64,${data.processed_image}`);
        const isFullyCompliant = normalizedAnalysis.face_detection?.valid && normalizedAnalysis.ai_analysis?.compliant;
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
  }, [removeBackground]);

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile) {
      setFile(selectedFile);
      const reader = new FileReader();
      reader.onload = (e) => setPreview(e.target.result);
      reader.readAsDataURL(selectedFile);
    }
  };
  
  useEffect(() => {
    if (file) {
      processImage(file);
    }
  }, [file, processImage]);

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
      ctx.strokeStyle = '#cccccc';
      ctx.lineWidth = 1;
      ctx.setLineDash([5, 3]);
  
      positions.forEach(pos => {
        // Draw a box around each photo
        ctx.strokeRect(pos.x, pos.y, photoSizePx, photoSizePx);
      });
  
      const link = document.createElement('a');
      link.href = canvas.toDataURL('image/jpeg');
      link.download = `passport_photos_${paperSize}.jpg`;
      link.click();
    };
    img.src = processedImage;
  };

  const isFullyCompliant = analysis && analysis.face_detection?.valid && analysis.ai_analysis?.compliant;

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
                  {preview && <img src={preview} alt="Original" className="w-full h-full object-contain" />}
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
                        <button onClick={downloadSinglePhoto} className="w-full mt-3 flex items-center justify-center gap-2 px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700">
                            <Download className="w-4 h-4" />
                            Download Single Photo
                        </button>
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