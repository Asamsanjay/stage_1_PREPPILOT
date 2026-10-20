import React, { useState } from 'react';
import { 
  Sparkles, 
  ShieldCheck, 
  AlertTriangle, 
  Lock, 
  Loader2, 
  X, 
  FileText,
  Volume2
} from 'lucide-react';

export default function SpeakingAnalysisModal({
  isOpen,
  onClose,
  onConfirm,
  isAnalyzing,
  analysisProgress,
  analysisError
}) {
  const [hasConsentedAudio, setHasConsentedAudio] = useState(false);
  const [allowSaveTranscript, setAllowSaveTranscript] = useState(true);

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={() => !isAnalyzing && onClose()}>
      <div 
        className="speaking-analysis-modal-card" 
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="analysis-modal-header">
          <div className="analysis-modal-icon-badge">
            <Sparkles size={24} color="#ffffff" />
          </div>
          <div>
            <h3 className="analysis-modal-title">PrepPilot Speaking Coach</h3>
            <p className="analysis-modal-subtitle">AI-Powered Speech Evaluation & Actionable Feedback</p>
          </div>
          {!isAnalyzing && (
            <button className="modal-close-btn" onClick={onClose} aria-label="Close">
              <X size={18} />
            </button>
          )}
        </div>

        {/* Modal Body */}
        <div className="analysis-modal-body">
          {isAnalyzing ? (
            /* Analysis Progress State */
            <div className="analysis-progress-container">
              <div className="analysis-spinner-box">
                <Loader2 size={44} className="spin-animate" color="#0066ff" />
              </div>
              <h4 className="analysis-progress-title">Analyzing Your Speech</h4>
              <p className="analysis-progress-desc">
                {analysisProgress?.label || 'Processing your speech with PrepPilot Speaking Coach...'}
              </p>

              <div className="analysis-steps-list">
                <div className={`analysis-step-item ${analysisProgress?.stage === 'extracting_audio' ? 'current' : 'done'}`}>
                  <div className="step-bullet-icon">
                    <Volume2 size={13} />
                  </div>
                  <span>Extracting audio track on local device</span>
                </div>
                <div className={`analysis-step-item ${analysisProgress?.stage === 'encoding_audio' ? 'current' : (analysisProgress?.stage === 'extracting_audio' ? 'pending' : 'done')}`}>
                  <div className="step-bullet-icon">
                    <Lock size={13} />
                  </div>
                  <span>Securing speech payload</span>
                </div>
                <div className={`analysis-step-item ${analysisProgress?.stage === 'calling_ai' ? 'current' : (analysisProgress?.stage === 'processing_report' ? 'done' : 'pending')}`}>
                  <div className="step-bullet-icon">
                    <Sparkles size={13} />
                  </div>
                  <span>Evaluating fluency, grammar, vocabulary & fillers</span>
                </div>
                <div className={`analysis-step-item ${analysisProgress?.stage === 'processing_report' ? 'current' : 'pending'}`}>
                  <div className="step-bullet-icon">
                    <FileText size={13} />
                  </div>
                  <span>Generating personalized improvements report</span>
                </div>
              </div>
            </div>
          ) : (
            /* Consent & Privacy Form */
            <div className="analysis-consent-content">
              {analysisError && (
                <div className="analysis-error-banner">
                  <AlertTriangle size={20} color="#ef4444" style={{ flexShrink: 0 }} />
                  <div>
                    <h5 style={{ fontWeight: 700, color: '#991b1b', marginBottom: '2px', fontSize: '14px' }}>
                      {analysisError.code === 'AI_NOT_CONFIGURED' ? 'AI Service Setup Required' : 'Analysis Request Failed'}
                    </h5>
                    <p style={{ fontSize: '13px', color: '#b91c1c', margin: 0, lineHeight: 1.4 }}>
                      {analysisError.message || 'An error occurred during evaluation.'}
                    </p>
                    {analysisError.code === 'AI_NOT_CONFIGURED' && (
                      <div className="config-help-box">
                        <span style={{ fontWeight: 600 }}>Setup Instructions:</span>
                        <p style={{ margin: '4px 0 0 0', fontSize: '12px' }}>
                          Add <code>GEMINI_API_KEY=your_key_here</code> to your backend environment (.env file or Supabase Edge Function secrets).
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              <div className="privacy-guarantee-card">
                <div className="privacy-card-title-row">
                  <ShieldCheck size={18} color="#10b981" />
                  <span style={{ fontWeight: 700, fontSize: '13.5px', color: '#0f172a' }}>
                    Local Privacy Protection
                  </span>
                </div>
                <ul className="privacy-bullets">
                  <li>Your video recording is stored locally on this device and is <strong>never uploaded</strong>.</li>
                  <li>Only the separated audio track will be sent to the AI evaluation service.</li>
                  <li>Evaluation is conducted securely via our authenticated server/Edge Function.</li>
                </ul>
              </div>

              <div className="consent-checkbox-group">
                <label className="consent-checkbox-label">
                  <input
                    type="checkbox"
                    className="styled-checkbox"
                    checked={hasConsentedAudio}
                    onChange={(e) => setHasConsentedAudio(e.target.checked)}
                  />
                  <span className="checkbox-text">
                    <strong>I consent</strong> to extracting and sending the audio from this challenge to PrepPilot Speaking Coach for AI analysis.
                  </span>
                </label>

                <label className="consent-checkbox-label">
                  <input
                    type="checkbox"
                    className="styled-checkbox"
                    checked={allowSaveTranscript}
                    onChange={(e) => setAllowSaveTranscript(e.target.checked)}
                  />
                  <span className="checkbox-text">
                    Allow saving the generated transcript with my private report in Supabase.
                  </span>
                </label>
              </div>

              <div className="analysis-scope-summary">
                <span className="scope-tag">Fluency & Pacing</span>
                <span className="scope-tag">Filler Word Count</span>
                <span className="scope-tag">Grammar Correction</span>
                <span className="scope-tag">Vocabulary Quality</span>
                <span className="scope-tag">Answer Structure</span>
                <span className="scope-tag">Sample Answer</span>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        {!isAnalyzing && (
          <div className="analysis-modal-footer">
            <button className="btn-secondary" onClick={onClose}>
              Cancel
            </button>
            <button
              className="btn-primary"
              disabled={!hasConsentedAudio}
              onClick={() => onConfirm({ allowSaveTranscript })}
              style={{
                opacity: hasConsentedAudio ? 1 : 0.6,
                cursor: hasConsentedAudio ? 'pointer' : 'not-allowed'
              }}
            >
              <Sparkles size={16} />
              <span>Confirm & Analyze Speech</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
