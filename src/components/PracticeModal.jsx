import React, { useState } from 'react';
import { X, Video, Mic, Check, Play, Clock } from 'lucide-react';

export default function PracticeModal({ isOpen, onClose, mode, initialTopic }) {
  const [selectedRole, setSelectedRole] = useState('Software Developer');
  const [prepTime, setPrepTime] = useState('Immediate');
  const [isSessionActive, setIsSessionActive] = useState(false);

  if (!isOpen) return null;

  const roles = [
    'Software Developer',
    'Data Analyst',
    'Product Manager',
    'UX/UI Designer',
    'Marketing Lead'
  ];

  const handleStart = () => {
    setIsSessionActive(true);
  };

  const handleEndSession = () => {
    setIsSessionActive(false);
    onClose();
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card" onClick={(e) => e.stopPropagation()}>
        <button className="modal-close-btn" onClick={onClose}>
          <X size={18} />
        </button>

        {!isSessionActive ? (
          <>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
              <div className={`mode-icon-box ${mode === 'speaking' ? 'green' : 'blue'}`}>
                {mode === 'speaking' ? <Mic size={24} /> : <Video size={24} />}
              </div>
              <div>
                <h3 style={{ fontSize: '20px', fontWeight: 800, color: '#0f172a' }}>
                  {mode === 'speaking' ? 'Start Speaking Challenge' : 'Configure AI Mock Interview'}
                </h3>
                <p style={{ fontSize: '13px', color: '#64748b' }}>
                  {mode === 'speaking' ? 'Select mode and get ready to speak.' : 'Customize your AI interview environment.'}
                </p>
              </div>
            </div>

            {mode === 'mock' ? (
              <div style={{ margin: '20px 0' }}>
                <label style={{ fontSize: '13px', fontWeight: 700, color: '#0f172a', display: 'block', marginBottom: '8px' }}>
                  Target Professional Role:
                </label>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                  {roles.map((role) => (
                    <button
                      key={role}
                      className={`category-pill-btn ${selectedRole === role ? 'active' : ''}`}
                      onClick={() => setSelectedRole(role)}
                    >
                      {role}
                    </button>
                  ))}
                </div>

                <div style={{ background: '#f8fafc', padding: '16px', borderRadius: '12px', marginTop: '16px', border: '1px solid #e2e8f0' }}>
                  <div style={{ fontSize: '13px', fontWeight: 700, color: '#0f172a', marginBottom: '6px' }}>
                    Included in this session:
                  </div>
                  <div style={{ fontSize: '12.5px', color: '#475569', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <Check size={14} color="#2563eb" /> 1-on-1 video call simulation with AI
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <Check size={14} color="#2563eb" /> Real-time speech clarity & fluency scoring
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <Check size={14} color="#2563eb" /> Detailed transcript and action tips
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div style={{ margin: '20px 0' }}>
                <div style={{ background: '#f0fdf4', padding: '16px', borderRadius: '12px', border: '1px solid #bbf7d0', marginBottom: '16px' }}>
                  <div style={{ fontSize: '11px', fontWeight: 800, color: '#16a34a', marginBottom: '4px' }}>
                    YOUR ASSIGNED TOPIC
                  </div>
                  <p style={{ fontSize: '14px', fontWeight: 700, color: '#0f172a' }}>
                    "{initialTopic || 'How can daily practice build long-term speaking confidence?'}"
                  </p>
                </div>

                <label style={{ fontSize: '13px', fontWeight: 700, color: '#0f172a', display: 'block', marginBottom: '8px' }}>
                  Preparation Time:
                </label>
                <div style={{ display: 'flex', gap: '10px' }}>
                  <button
                    className={`category-pill-btn ${prepTime === 'Immediate' ? 'active' : ''}`}
                    onClick={() => setPrepTime('Immediate')}
                  >
                    ⚡ Immediate (On the Spot)
                  </button>
                  <button
                    className={`category-pill-btn ${prepTime === '5min' ? 'active' : ''}`}
                    onClick={() => setPrepTime('5min')}
                  >
                    ⏱️ 5 Minute Preparation
                  </button>
                </div>
              </div>
            )}

            <button 
              className={mode === 'speaking' ? 'btn-green' : 'btn-primary'} 
              style={{ width: '100%', padding: '14px', fontSize: '15px' }}
              onClick={handleStart}
            >
              <Play size={18} />
              <span>Launch Practice Session</span>
            </button>
          </>
        ) : (
          <div style={{ textAlign: 'center', padding: '10px 0' }}>
            <div style={{ position: 'relative', width: '100%', height: '220px', borderRadius: '16px', overflow: 'hidden', background: '#0f172a', marginBottom: '20px' }}>
              <img 
                src="/assets/ai_interviewer.jpg" 
                alt="Live AI Session" 
                style={{ width: '100%', height: '100%', objectFit: 'cover', opacity: 0.85 }}
              />
              <div style={{ position: 'absolute', top: '12px', left: '12px', background: 'rgba(239, 68, 68, 0.9)', color: '#fff', padding: '4px 10px', borderRadius: '12px', fontSize: '11px', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ width: '8px', height: '8px', background: '#fff', borderRadius: '50%' }}></span>
                LIVE SESSION
              </div>
              <div style={{ position: 'absolute', bottom: '12px', right: '12px', background: 'rgba(15, 23, 42, 0.8)', color: '#fff', padding: '4px 12px', borderRadius: '12px', fontSize: '13px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Clock size={14} /> 02:45
              </div>
            </div>

            <h3 style={{ fontSize: '18px', fontWeight: 800, color: '#0f172a', marginBottom: '6px' }}>
              AI Interviewer is Listening...
            </h3>
            <p style={{ fontSize: '13px', color: '#64748b', marginBottom: '20px' }}>
              Speak clearly into your microphone. AI is analyzing your posture, clarity, and vocabulary in real time.
            </p>

            <button 
              className="btn-primary" 
              style={{ background: '#ef4444', width: '100%', padding: '12px' }}
              onClick={handleEndSession}
            >
              End Session & View AI Feedback
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
