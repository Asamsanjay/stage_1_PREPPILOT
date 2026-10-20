import React from 'react';
import { 
  Video, 
  Mic, 
  CheckCircle2, 
  ArrowRight, 
  Flame, 
  Zap
} from 'lucide-react';

export default function PracticeModes({ onStartMock, onStartSpeaking }) {
  return (
    <section>
      <div className="section-header">
        <h2 className="section-title">Choose Your Practice Mode</h2>
        <p className="section-subtitle">Two powerful modules to improve your communication skills.</p>
      </div>

      <div className="practice-modes-grid">
        {/* Card 1: AI Mock Interview */}
        <div className="mode-card">
          <div className="popular-tag">
            <Flame size={14} color="#ea580c" />
            <span>Most Popular</span>
          </div>

          <div>
            <div className="mode-card-header">
              <div className="mode-icon-box blue">
                <Video size={24} />
              </div>
              <div>
                <h3 className="mode-title">AI Mock Interview</h3>
                <p className="mode-desc">One-on-one video interviews with an adaptive AI Interviewer.</p>
              </div>
            </div>

            <ul className="mode-checklist">
              <li className="checklist-item">
                <CheckCircle2 size={16} />
                <span>Real interview experience</span>
              </li>
              <li className="checklist-item">
                <CheckCircle2 size={16} />
                <span>Instant feedback & tips</span>
              </li>
              <li className="checklist-item">
                <CheckCircle2 size={16} />
                <span>Track your progress</span>
              </li>
            </ul>

            <div className="mock-preview-container">
              <img src="/assets/ai_interviewer.jpg" alt="AI Mock Interviewer" />
              <div className="mock-overlay-tip">
                ✨ Adaptive AI Feedback
              </div>
            </div>
          </div>

          <div>
            <button className="btn-primary" style={{ width: '100%' }} onClick={onStartMock}>
              <span>Start Interview</span>
              <ArrowRight size={16} />
            </button>

            <div className="mode-stats-bar">
              <div>
                <div className="stat-item-num">12</div>
                <div className="stat-item-label">Avg. Questions</div>
              </div>
              <div>
                <div className="stat-item-num">8</div>
                <div className="stat-item-label">Min. Per Session</div>
              </div>
              <div>
                <div className="stat-item-num">92%</div>
                <div className="stat-item-label">User Satisfaction</div>
              </div>
            </div>
          </div>
        </div>

        {/* Card 2: Random Topic Speaking Challenge */}
        <div className="mode-card">
          <div className="popular-tag" style={{ background: '#f0fdf4', color: '#16a34a', borderColor: '#dcfce7' }}>
            <Zap size={14} color="#16a34a" />
            <span>Build Confidence</span>
          </div>

          <div>
            <div className="mode-card-header">
              <div className="mode-icon-box green">
                <Mic size={24} />
              </div>
              <div>
                <h3 className="mode-title">Random Topic Speaking Challenge</h3>
                <p className="mode-desc">Get random topics and speak on the spot or take 5 minutes to prepare. Improve your fluency and vocabulary.</p>
              </div>
            </div>

            <ul className="mode-checklist">
              <li className="checklist-item">
                <CheckCircle2 size={16} style={{ color: '#10b981' }} />
                <span>Instant or prepared mode</span>
              </li>
              <li className="checklist-item">
                <CheckCircle2 size={16} style={{ color: '#10b981' }} />
                <span>Timed speaking sessions</span>
              </li>
              <li className="checklist-item">
                <CheckCircle2 size={16} style={{ color: '#10b981' }} />
                <span>AI evaluation & feedback</span>
              </li>
            </ul>

            <div className="wheel-graphic-box">
              <div className="wheel-circle">
                <div className="wheel-center-mic">
                  <Mic size={22} />
                </div>
              </div>
            </div>
          </div>

          <div>
            <button className="btn-green" style={{ width: '100%' }} onClick={onStartSpeaking}>
              <span>Start Challenge</span>
              <ArrowRight size={16} />
            </button>

            <div className="mode-stats-bar">
              <div>
                <div className="stat-item-num">100+</div>
                <div className="stat-item-label">Topics</div>
              </div>
              <div>
                <div className="stat-item-num">4</div>
                <div className="stat-item-label">Difficulty Levels</div>
              </div>
              <div>
                <div className="stat-item-num">∞</div>
                <div className="stat-item-label">Practice Anytime</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
