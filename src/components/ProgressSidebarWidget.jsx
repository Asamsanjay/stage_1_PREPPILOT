import React from 'react';

export default function ProgressSidebarWidget({ onViewAll }) {
  const skills = [
    { name: 'Fluency', value: 86, colorClass: 'blue' },
    { name: 'Clarity', value: 84, colorClass: 'teal' },
    { name: 'Confidence', value: 78, colorClass: 'purple' },
    { name: 'Vocabulary', value: 72, colorClass: 'orange' },
  ];

  return (
    <div className="sidebar-widgets-column">
      {/* Widget 1: Your Progress */}
      <div className="widget-card">
        <div className="widget-header">
          <h3 className="widget-title">Your Progress</h3>
          <span className="link-view-all" onClick={onViewAll}>View All</span>
        </div>

        <div className="progress-gauge-container">
          <div className="circle-progress-ring">
            <div className="circle-progress-inner">
              68%
            </div>
          </div>
          <div>
            <div style={{ fontSize: '14px', fontWeight: 800, color: '#0f172a' }}>Overall Rating</div>
            <div style={{ fontSize: '12px', color: '#64748b' }}>+8% improvement this week</div>
          </div>
        </div>

        <div className="skills-list">
          {skills.map((skill) => (
            <div key={skill.name} className="skill-row">
              <div className="skill-info">
                <span>{skill.name}</span>
                <span>{skill.value}%</span>
              </div>
              <div className="skill-bar-track">
                <div 
                  className={`skill-bar-fill ${skill.colorClass}`} 
                  style={{ width: `${skill.value}%` }}
                ></div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Widget 2: Mountain Quote Card */}
      <div className="quote-mountain-card">
        <img src="/assets/mountain_bg.jpg" alt="Mountain Landscape" />
        <div className="quote-overlay-content">
          <p className="quote-text">
            "Small steps every day lead to big results."
          </p>
          <span className="quote-subtext">
            Keep going, Sam! 🏔️
          </span>
        </div>
      </div>
    </div>
  );
}
