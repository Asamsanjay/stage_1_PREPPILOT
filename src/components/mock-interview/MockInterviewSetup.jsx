import React, { useState, useEffect, useRef } from 'react';
import { 
  ArrowLeft, 
  ArrowRight, 
  Code, 
  Users, 
  Sparkles, 
  Briefcase, 
  User, 
  Award, 
  ShieldCheck, 
  BarChart2, 
  Flame, 
  Clock, 
  Check, 
  Camera, 
  Mic, 
  AlertCircle,
  Edit3
} from 'lucide-react';

import { useMediaStream } from '../../hooks/useMediaStream';

export default function MockInterviewSetup({ config, setConfig, onBackToMain, onStartSession }) {
  const [step, setStep] = useState(1);

  const {
    stream: mediaStream,
    cameraEnabled,
    microphoneEnabled,
    requestMedia,
    stopMedia,
    attachVideo,
    error: mediaHookError,
    isLoading: isTestingMedia
  } = useMediaStream();

  const [cameraChecked, setCameraChecked] = useState(false);
  const [micChecked, setMicChecked] = useState(false);
  const [mediaError, setMediaError] = useState('');
  const [aiConsent, setAiConsent] = useState(false);

  const previewVideoRef = useRef(null);

  // Sync video ref with stream when mediaStream or step changes
  useEffect(() => {
    if (mediaStream && mediaStream.active) {
      const vTracks = mediaStream.getVideoTracks();
      const aTracks = mediaStream.getAudioTracks();
      setCameraChecked(vTracks.length > 0 && vTracks[0].readyState === 'live');
      setMicChecked(aTracks.length > 0 && aTracks[0].readyState === 'live');
    }
    if (previewVideoRef.current && mediaStream) {
      attachVideo(previewVideoRef, mediaStream);
    }
  }, [mediaStream, step, attachVideo]);

  const testMediaDevices = async () => {
    setMediaError('');
    const newStream = await requestMedia();

    if (newStream && newStream.active) {
      const videoTracks = newStream.getVideoTracks();
      const audioTracks = newStream.getAudioTracks();

      setCameraChecked(videoTracks.length > 0 && videoTracks[0].readyState === 'live');
      setMicChecked(audioTracks.length > 0 && audioTracks[0].readyState === 'live');

      if (previewVideoRef.current) {
        attachVideo(previewVideoRef, newStream);
      }
    } else {
      setCameraChecked(false);
      setMicChecked(false);
      setMediaError(
        mediaHookError || 'Unable to access your camera and microphone. Please try again.'
      );
    }
  };

  const handleNextStep = () => {
    if (step < 5) {
      setStep(step + 1);
    }
  };

  const handlePrevStep = () => {
    if (step > 1) {
      setStep(step - 1);
    } else {
      onBackToMain();
    }
  };

  const handleSelectType = (type) => {
    setConfig((prev) => ({ ...prev, interviewType: type }));
  };

  const handleSelectExperience = (exp) => {
    setConfig((prev) => ({ ...prev, experienceLevel: exp }));
  };

  const handleSelectDifficulty = (diff) => {
    setConfig((prev) => ({ ...prev, difficulty: diff }));
  };

  const handleSelectDuration = (dur) => {
    setConfig((prev) => ({ ...prev, duration: dur }));
  };

  const isNextDisabled = () => {
    if (step === 1) return !config.interviewType;
    if (step === 2) return !config.experienceLevel;
    if (step === 3) return !config.difficulty;
    if (step === 4) return !config.duration;
    return false;
  };

  const handleLaunchInterview = () => {
    if (cameraChecked && micChecked && mediaStream && aiConsent) {
      onStartSession(mediaStream);
    }
  };

  const stepsList = [
    { num: 1, label: 'Interview Type' },
    { num: 2, label: 'Experience' },
    { num: 3, label: 'Difficulty' },
    { num: 4, label: 'Duration' },
    { num: 5, label: 'Summary' },
  ];

  return (
    <div className="mock-setup-container">
      {/* Top Stepper Navigation */}
      <div className="setup-nav-bar">
        <button className="back-link-btn" onClick={handlePrevStep}>
          <ArrowLeft size={16} />
          <span>Back</span>
        </button>

        {/* Stepper Progress Bar */}
        <div className="stepper-progress">
          {stepsList.map((s, idx) => {
            const isActive = step === s.num;
            const isCompleted = step > s.num;

            return (
              <React.Fragment key={s.num}>
                <div className={`stepper-step ${isActive ? 'active' : ''} ${isCompleted ? 'completed' : ''}`}>
                  <div className="step-number-circle">
                    {isCompleted ? <Check size={12} /> : s.num}
                  </div>
                  <span className="step-label-text">{s.label}</span>
                </div>
                {idx < stepsList.length - 1 && (
                  <div className={`stepper-line ${step > s.num ? 'completed' : ''}`}></div>
                )}
              </React.Fragment>
            );
          })}
        </div>
      </div>

      {/* STEP 1: INTERVIEW TYPE */}
      {step === 1 && (
        <div className="setup-step-card">
          <div className="step-header">
            <h2 className="step-title">Select Interview Type</h2>
            <p className="step-desc">Choose the type of interview you want to practice.</p>
          </div>

          <div className="option-cards-grid grid-2x2">
            {/* Technical */}
            <div
              className={`option-card ${config.interviewType === 'Technical Interview' ? 'selected' : ''}`}
              onClick={() => handleSelectType('Technical Interview')}
            >
              <div className="option-card-radio">
                {config.interviewType === 'Technical Interview' && <Check size={12} color="#fff" />}
              </div>
              <div className="option-icon-box blue">
                <Code size={24} />
              </div>
              <h3 className="option-title">Technical Interview</h3>
              <p className="option-desc">Code-based and technical problem-solving questions.</p>
            </div>

            {/* HR */}
            <div
              className={`option-card ${config.interviewType === 'HR Interview' ? 'selected' : ''}`}
              onClick={() => handleSelectType('HR Interview')}
            >
              <div className="option-card-radio">
                {config.interviewType === 'HR Interview' && <Check size={12} color="#fff" />}
              </div>
              <div className="option-icon-box purple">
                <Users size={24} />
              </div>
              <h3 className="option-title">HR Interview</h3>
              <p className="option-desc">General HR questions, self-introduction, teamwork and culture.</p>
            </div>

            {/* Behavioral */}
            <div
              className={`option-card ${config.interviewType === 'Behavioral Interview' ? 'selected' : ''}`}
              onClick={() => handleSelectType('Behavioral Interview')}
            >
              <div className="option-card-radio">
                {config.interviewType === 'Behavioral Interview' && <Check size={12} color="#fff" />}
              </div>
              <div className="option-icon-box amber">
                <Sparkles size={24} />
              </div>
              <h3 className="option-title">Behavioral Interview</h3>
              <p className="option-desc">Situational and behavioral questions using the STAR method.</p>
            </div>

            {/* General */}
            <div
              className={`option-card ${config.interviewType === 'General Interview' ? 'selected' : ''}`}
              onClick={() => handleSelectType('General Interview')}
            >
              <div className="option-card-radio">
                {config.interviewType === 'General Interview' && <Check size={12} color="#fff" />}
              </div>
              <div className="option-icon-box sky">
                <Briefcase size={24} />
              </div>
              <h3 className="option-title">General Interview</h3>
              <p className="option-desc">Mix of general and industry-related questions.</p>
            </div>
          </div>

          {/* Optional Job Role / Focus input */}
          <div style={{ marginTop: '20px', padding: '16px', background: '#f8fafc', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, color: '#0f172a', marginBottom: '6px' }}>
              Target Job Role or Specialization (Optional)
            </label>
            <input
              type="text"
              placeholder="e.g. Frontend Engineer, Full Stack Developer, Product Manager, Data Analyst..."
              value={config.jobRole || ''}
              onChange={(e) => setConfig((prev) => ({ ...prev, jobRole: e.target.value }))}
              style={{
                width: '100%',
                padding: '10px 14px',
                borderRadius: '8px',
                border: '1px solid #cbd5e1',
                fontSize: '14px',
                color: '#0f172a',
                outline: 'none',
                background: '#ffffff'
              }}
            />
            <span style={{ display: 'block', marginTop: '6px', fontSize: '12px', color: '#64748b' }}>
              PrepPilot Interviewer Agent will adapt questions and follow-ups specifically for this role.
            </span>
          </div>

          <div className="step-actions">
            <button
              className="btn-primary"
              disabled={isNextDisabled()}
              onClick={handleNextStep}
            >
              <span>Next</span>
              <ArrowRight size={16} />
            </button>
          </div>
        </div>
      )}

      {/* STEP 2: EXPERIENCE LEVEL */}
      {step === 2 && (
        <div className="setup-step-card">
          <div className="step-header">
            <h2 className="step-title">Select Experience Level</h2>
            <p className="step-desc">Choose your current experience level.</p>
          </div>

          <div className="option-cards-grid grid-3col">
            {/* Beginner */}
            <div
              className={`option-card ${config.experienceLevel === 'Beginner' ? 'selected' : ''}`}
              onClick={() => handleSelectExperience('Beginner')}
            >
              <div className="option-card-radio">
                {config.experienceLevel === 'Beginner' && <Check size={12} color="#fff" />}
              </div>
              <div className="option-icon-box blue">
                <User size={24} />
              </div>
              <h3 className="option-title">Beginner</h3>
              <p className="option-desc">0–1 year of experience</p>
            </div>

            {/* Intermediate */}
            <div
              className={`option-card ${config.experienceLevel === 'Intermediate' ? 'selected' : ''}`}
              onClick={() => handleSelectExperience('Intermediate')}
            >
              <div className="option-card-radio">
                {config.experienceLevel === 'Intermediate' && <Check size={12} color="#fff" />}
              </div>
              <div className="option-icon-box purple">
                <Users size={24} />
              </div>
              <h3 className="option-title">Intermediate</h3>
              <p className="option-desc">1–3 years of experience</p>
            </div>

            {/* Advanced */}
            <div
              className={`option-card ${config.experienceLevel === 'Advanced' ? 'selected' : ''}`}
              onClick={() => handleSelectExperience('Advanced')}
            >
              <div className="option-card-radio">
                {config.experienceLevel === 'Advanced' && <Check size={12} color="#fff" />}
              </div>
              <div className="option-icon-box amber">
                <Award size={24} />
              </div>
              <h3 className="option-title">Advanced</h3>
              <p className="option-desc">3+ years of experience</p>
            </div>
          </div>

          <div className="step-actions split">
            <button className="btn-secondary" onClick={handlePrevStep}>
              <ArrowLeft size={16} />
              <span>Back</span>
            </button>
            <button
              className="btn-primary"
              disabled={isNextDisabled()}
              onClick={handleNextStep}
            >
              <span>Next</span>
              <ArrowRight size={16} />
            </button>
          </div>
        </div>
      )}

      {/* STEP 3: DIFFICULTY */}
      {step === 3 && (
        <div className="setup-step-card">
          <div className="step-header">
            <h2 className="step-title">Select Difficulty</h2>
            <p className="step-desc">Choose the difficulty level of questions.</p>
          </div>

          <div className="option-cards-grid grid-3col">
            {/* Easy */}
            <div
              className={`option-card ${config.difficulty === 'Easy' ? 'selected' : ''}`}
              onClick={() => handleSelectDifficulty('Easy')}
            >
              <div className="option-card-radio">
                {config.difficulty === 'Easy' && <Check size={12} color="#fff" />}
              </div>
              <div className="option-icon-box green">
                <ShieldCheck size={24} />
              </div>
              <h3 className="option-title">Easy</h3>
              <p className="option-desc">Basic and fundamental questions</p>
            </div>

            {/* Medium */}
            <div
              className={`option-card ${config.difficulty === 'Medium' ? 'selected' : ''}`}
              onClick={() => handleSelectDifficulty('Medium')}
            >
              <div className="option-card-radio">
                {config.difficulty === 'Medium' && <Check size={12} color="#fff" />}
              </div>
              <div className="option-icon-box blue">
                <BarChart2 size={24} />
              </div>
              <h3 className="option-title">Medium</h3>
              <p className="option-desc">Moderate-level questions</p>
            </div>

            {/* Hard */}
            <div
              className={`option-card ${config.difficulty === 'Hard' ? 'selected' : ''}`}
              onClick={() => handleSelectDifficulty('Hard')}
            >
              <div className="option-card-radio">
                {config.difficulty === 'Hard' && <Check size={12} color="#fff" />}
              </div>
              <div className="option-icon-box amber">
                <Flame size={24} />
              </div>
              <h3 className="option-title">Hard</h3>
              <p className="option-desc">Advanced and complex questions</p>
            </div>
          </div>

          <div className="step-actions split">
            <button className="btn-secondary" onClick={handlePrevStep}>
              <ArrowLeft size={16} />
              <span>Back</span>
            </button>
            <button
              className="btn-primary"
              disabled={isNextDisabled()}
              onClick={handleNextStep}
            >
              <span>Next</span>
              <ArrowRight size={16} />
            </button>
          </div>
        </div>
      )}

      {/* STEP 4: DURATION */}
      {step === 4 && (
        <div className="setup-step-card">
          <div className="step-header">
            <h2 className="step-title">Select Interview Duration</h2>
            <p className="step-desc">Choose how long you want the interview to be.</p>
          </div>

          <div className="option-cards-grid grid-3col">
            {/* 10 minutes */}
            <div
              className={`option-card ${config.duration === '10 minutes' ? 'selected' : ''}`}
              onClick={() => handleSelectDuration('10 minutes')}
            >
              <div className="option-card-radio">
                {config.duration === '10 minutes' && <Check size={12} color="#fff" />}
              </div>
              <div className="option-icon-box blue">
                <Clock size={24} />
              </div>
              <h3 className="option-title">10 minutes</h3>
              <p className="option-desc">Quick practice session</p>
            </div>

            {/* 20 minutes */}
            <div
              className={`option-card ${config.duration === '20 minutes' ? 'selected' : ''}`}
              onClick={() => handleSelectDuration('20 minutes')}
            >
              <div className="option-card-radio">
                {config.duration === '20 minutes' && <Check size={12} color="#fff" />}
              </div>
              <div className="option-icon-box purple">
                <Clock size={24} />
              </div>
              <h3 className="option-title">20 minutes</h3>
              <p className="option-desc">Standard session</p>
            </div>

            {/* 30 minutes */}
            <div
              className={`option-card ${config.duration === '30 minutes' ? 'selected' : ''}`}
              onClick={() => handleSelectDuration('30 minutes')}
            >
              <div className="option-card-radio">
                {config.duration === '30 minutes' && <Check size={12} color="#fff" />}
              </div>
              <div className="option-icon-box amber">
                <Clock size={24} />
              </div>
              <h3 className="option-title">30 minutes</h3>
              <p className="option-desc">Extended session</p>
            </div>
          </div>

          <div className="step-actions split">
            <button className="btn-secondary" onClick={handlePrevStep}>
              <ArrowLeft size={16} />
              <span>Back</span>
            </button>
            <button
              className="btn-primary"
              disabled={isNextDisabled()}
              onClick={handleNextStep}
            >
              <span>Next</span>
              <ArrowRight size={16} />
            </button>
          </div>
        </div>
      )}

      {/* STEP 5: SUMMARY & DEVICE CHECK */}
      {step === 5 && (
        <div className="setup-step-card">
          <div className="step-header flex-between">
            <div>
              <h2 className="step-title">Interview Summary</h2>
              <p className="step-desc">Review your configuration before launching.</p>
            </div>
          </div>

          {/* Summary Details Table */}
          <div className="summary-box">
            <div className="summary-row">
              <span className="summary-label">Interview Type</span>
              <span className="summary-value">{config.interviewType || 'Not selected'}</span>
              <button className="summary-edit-btn" onClick={() => setStep(1)}>
                <Edit3 size={14} />
                <span>Edit</span>
              </button>
            </div>

            <div className="summary-row">
              <span className="summary-label">Experience Level</span>
              <span className="summary-value">{config.experienceLevel || 'Not selected'}</span>
              <button className="summary-edit-btn" onClick={() => setStep(2)}>
                <Edit3 size={14} />
                <span>Edit</span>
              </button>
            </div>

            <div className="summary-row">
              <span className="summary-label">Difficulty</span>
              <span className="summary-value">{config.difficulty || 'Not selected'}</span>
              <button className="summary-edit-btn" onClick={() => setStep(3)}>
                <Edit3 size={14} />
                <span>Edit</span>
              </button>
            </div>

            <div className="summary-row">
              <span className="summary-label">Duration</span>
              <span className="summary-value">{config.duration || 'Not selected'}</span>
              <button className="summary-edit-btn" onClick={() => setStep(4)}>
                <Edit3 size={14} />
                <span>Edit</span>
              </button>
            </div>
          </div>

          {/* Camera & Microphone Check */}
          <div className="device-check-section">
            <div className="step-header">
              <h3 className="device-section-title">Check Your Camera & Microphone</h3>
              <p className="step-desc">Allow camera and microphone access to make sure everything is working properly.</p>
            </div>

            <div className="device-status-grid">
              {/* Camera Status Card */}
              <div className={`device-card ${cameraChecked ? 'connected' : ''}`}>
                <div className="device-icon-box">
                  <Camera size={20} color={cameraChecked ? '#10b981' : '#64748b'} />
                </div>
                <div>
                  <div className="device-title">Camera</div>
                  <div className={`device-status-text ${cameraChecked ? 'connected' : ''}`}>
                    {cameraChecked ? '✓ Connected' : 'Not checked'}
                  </div>
                </div>
              </div>

              {/* Microphone Status Card */}
              <div className={`device-card ${micChecked ? 'connected' : ''}`}>
                <div className="device-icon-box">
                  <Mic size={20} color={micChecked ? '#10b981' : '#64748b'} />
                </div>
                <div>
                  <div className="device-title">Microphone</div>
                  <div className={`device-status-text ${micChecked ? 'connected' : ''}`}>
                    {micChecked ? '✓ Connected' : 'Not checked'}
                  </div>
                </div>
              </div>
            </div>

            {/* Test Media Button */}
            <div style={{ marginTop: '16px', display: 'flex', alignItems: 'center', gap: '12px' }}>
              <button
                className="btn-secondary"
                onClick={testMediaDevices}
                disabled={isTestingMedia}
              >
                <span>{isTestingMedia ? 'Requesting Access...' : (cameraChecked && micChecked ? 'Test Camera & Mic Again' : 'Test Camera & Mic')}</span>
              </button>
            </div>

            {/* Live Camera Preview */}
            {mediaStream && cameraChecked && (
              <div className="video-preview-wrapper" style={{ marginTop: '20px' }}>
                <div className="preview-label">Live Preview</div>
                <video
                  ref={(node) => {
                    previewVideoRef.current = node;
                    if (node && mediaStream) {
                      attachVideo(node, mediaStream);
                    }
                  }}
                  autoPlay
                  playsInline
                  muted
                  className="preview-video-element"
                />
              </div>
            )}

            {/* Media Error Message */}
            {(mediaError || mediaHookError) && (
              <div className="media-error-box">
                <AlertCircle size={18} color="#ef4444" style={{ flexShrink: 0 }} />
                <span>{mediaError || mediaHookError}</span>
              </div>
            )}
          </div>

          {/* Privacy & AI Consent Guarantee */}
          <div style={{
            marginTop: '20px',
            padding: '16px',
            borderRadius: '12px',
            background: '#f8fafc',
            border: '1px solid #e2e8f0',
            display: 'flex',
            flexDirection: 'column',
            gap: '10px'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <ShieldCheck size={18} color="#0066ff" />
              <span style={{ fontSize: '13.5px', fontWeight: 700, color: '#0f172a' }}>
                AI Speech Processing & Privacy Guarantee
              </span>
            </div>
            <p style={{ fontSize: '12.5px', color: '#64748b', lineHeight: 1.5, margin: 0 }}>
              PrepPilot Interviewer Agent converts your spoken answers into text transcripts to generate context-aware questions, follow-ups, and compile your personalized performance evaluation. Your video recording stays private and is stored locally in your browser's IndexedDB.
            </p>
            <label style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', fontSize: '13px', fontWeight: 600, color: '#1e293b', cursor: 'pointer', marginTop: '4px' }}>
              <input
                type="checkbox"
                checked={aiConsent}
                onChange={(e) => setAiConsent(e.target.checked)}
                style={{ marginTop: '2px', cursor: 'pointer', width: '16px', height: '16px' }}
              />
              <span>I consent to AI transcription of my spoken answers for real-time interview questions and performance evaluation.</span>
            </label>
          </div>

          <div className="step-actions split">
            <button className="btn-secondary" onClick={handlePrevStep}>
              <ArrowLeft size={16} />
              <span>Back</span>
            </button>
            <button
              className="btn-primary start-btn-lg"
              disabled={!cameraChecked || !micChecked || !aiConsent}
              onClick={handleLaunchInterview}
            >
              <span>Start Interview →</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
