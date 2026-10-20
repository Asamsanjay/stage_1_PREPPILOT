import React from 'react';
import { ArrowRight, Video, Cpu, ShieldCheck } from 'lucide-react';

export default function HeroBanner({ onStartPractice }) {
  return (
    <div className="hero-banner-card">
      <div>
        <div className="welcome-tag">
          WELCOME BACK, SAM 👋
        </div>
        <h1 className="hero-title">
          Better Communication. <br />
          <span>Bigger Opportunities.</span>
        </h1>
        <p className="hero-subtitle">
          Practice with AI, get real-time feedback, and build the confidence you need for interviews and beyond.
        </p>

        <button className="btn-primary" onClick={onStartPractice}>
          <span>Start Practice</span>
          <ArrowRight size={16} />
        </button>
      </div>

      <div className="hero-image-wrapper">
        <div className="handwritten-overlay">
          Practice<br/>Learn<br/>Grow ✨
        </div>
        <img 
          src="/assets/hero_student.jpg" 
          alt="Student practicing interview" 
        />
      </div>

      <div className="hero-features-bar">
        <div className="feature-pill">
          <div className="feature-pill-icon">
            <Video size={18} />
          </div>
          <div>
            <div className="feature-pill-title">Video-Native Sessions</div>
            <div className="feature-pill-sub">Real conversations, real progress</div>
          </div>
        </div>

        <div className="feature-pill">
          <div className="feature-pill-icon">
            <Cpu size={18} />
          </div>
          <div>
            <div className="feature-pill-title">Adaptive AI Reasoning</div>
            <div className="feature-pill-sub">Personalized feedback & tips</div>
          </div>
        </div>

        <div className="feature-pill">
          <div className="feature-pill-icon">
            <ShieldCheck size={18} />
          </div>
          <div>
            <div className="feature-pill-title">Privacy-First Design</div>
            <div className="feature-pill-sub">Your data stays on your device</div>
          </div>
        </div>
      </div>
    </div>
  );
}
