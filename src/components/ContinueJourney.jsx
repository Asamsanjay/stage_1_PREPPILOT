import React, { useState } from 'react';
import { 
  Video, 
  Mic, 
  TrendingUp, 
  ChevronRight, 
  Rocket, 
  Send,
  Sparkles,
  ArrowRight 
} from 'lucide-react';

export default function ContinueJourney({ onSelectTopic }) {
  const [activeCategory, setActiveCategory] = useState('Career');

  const categories = ['Career', 'Technology', 'Education', 'Health', 'Lifestyle'];

  const topicPrompts = {
    Career: "Should organizations prioritize productivity over employee well-being?",
    Technology: "Will Generative AI fundamentally transform remote software development?",
    Education: "Should university degrees be replaced by skill-based certifications?",
    Health: "How does daily mindfulness practice impact cognitive leadership performance?",
    Lifestyle: "Is digital minimalism achievable in modern hyper-connected cities?"
  };

  const activities = [
    {
      id: 1,
      type: 'Mock Interview',
      icon: Video,
      time: '2 days ago',
      detail: '68% overall rating',
      color: '#2563eb'
    },
    {
      id: 2,
      type: 'Speaking Challenge',
      icon: Mic,
      time: '3 days ago',
      detail: 'Topic: Health & Wellness',
      color: '#10b981'
    },
    {
      id: 3,
      type: 'Progress Update',
      icon: TrendingUp,
      time: '5 days ago',
      detail: '+12% fluency improvement',
      color: '#8b5cf6'
    }
  ];

  return (
    <section>
      <div className="section-header">
        <h2 className="section-title">Continue Your Journey</h2>
        <p className="section-subtitle">Pick up where you left off or try something new.</p>
      </div>

      <div className="continue-journey-grid">
        {/* Recent Activity */}
        <div className="widget-card">
          <div className="widget-header">
            <h3 className="widget-title">Recent Activity</h3>
            <span className="link-view-all">View All</span>
          </div>

          <div className="activity-list">
            {activities.map((act) => {
              const Icon = act.icon;
              return (
                <div key={act.id} className="activity-item">
                  <div className="activity-item-left">
                    <div className="activity-icon" style={{ color: act.color }}>
                      <Icon size={16} />
                    </div>
                    <div>
                      <div className="activity-title">{act.type}</div>
                      <div className="activity-time">{act.time} • {act.detail}</div>
                    </div>
                  </div>
                  <ChevronRight size={16} color="#94a3b8" />
                </div>
              );
            })}
          </div>
        </div>

        {/* Recommended For You */}
        <div className="recommended-card">
          <div className="widget-header">
            <h3 className="widget-title" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Sparkles size={16} color="#2563eb" />
              <span>Recommended for You</span>
            </h3>
          </div>

          <div className="category-pills-row">
            {categories.map((cat) => (
              <button
                key={cat}
                className={`category-pill-btn ${activeCategory === cat ? 'active' : ''}`}
                onClick={() => setActiveCategory(cat)}
              >
                {cat}
              </button>
            ))}
          </div>

          <div className="topic-prompt-box">
            <div style={{ fontSize: '11px', fontWeight: 800, color: '#2563eb', marginBottom: '4px' }}>
              ⭐ TRENDING TOPIC
            </div>
            <p className="topic-prompt-title">
              "{topicPrompts[activeCategory]}"
            </p>
          </div>

          <button 
            className="btn-primary" 
            style={{ width: '100%', padding: '10px 18px', fontSize: '13px' }}
            onClick={() => onSelectTopic(topicPrompts[activeCategory])}
          >
            <span>Start Now</span>
            <ArrowRight size={14} />
          </button>
        </div>

        {/* Motivational Rocket Banner */}
        <div className="widget-card" style={{ background: 'linear-gradient(135deg, #eff6ff, #dbeafe)', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
          <div style={{ width: '42px', height: '42px', borderRadius: '12px', background: '#2563eb', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '12px' }}>
            <Rocket size={22} />
          </div>
          <h4 style={{ fontSize: '15px', fontWeight: 800, color: '#0f172a', marginBottom: '6px' }}>
            Confidence Booster
          </h4>
          <p style={{ fontSize: '12.5px', color: '#475569', lineHeight: '1.4' }}>
            Your confidence is your greatest asset. Keep practicing every day!
          </p>
        </div>
      </div>

      <div className="footer-banner" style={{ marginTop: '24px' }}>
        <div className="footer-left">
          <Rocket size={18} color="#2563eb" />
          <span>Your confidence is your greatest asset. Keep practicing!</span>
        </div>
        <div className="footer-logo">
          <Send size={16} />
          <span>PrepPilot</span>
        </div>
      </div>
    </section>
  );
}
