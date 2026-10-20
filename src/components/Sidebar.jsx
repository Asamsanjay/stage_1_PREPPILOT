import React from 'react';
import { 
  Home, 
  Video, 
  Mic, 
  Trophy, 
  BarChart2, 
  Settings, 
  Send,
  Crown,
  ChevronRight
} from 'lucide-react';

export default function Sidebar({ activeTab, setActiveTab, onOpenPro }) {
  const menuItems = [
    { id: 'home', label: 'Home', icon: Home },
    { id: 'mock', label: 'Mock Interview', icon: Video },
    { id: 'speaking', label: 'Speaking Challenge', icon: Mic },
    { id: 'contests', label: 'Contests & Events', icon: Trophy, badge: 'New' },
    { id: 'progress', label: 'Progress', icon: BarChart2 },
    { id: 'settings', label: 'Settings', icon: Settings },
  ];

  return (
    <aside className="sidebar">
      <div>
        <div className="sidebar-brand">
          <div className="brand-logo-icon">
            <Send size={20} />
          </div>
          <span className="brand-name">PrepPilot</span>
        </div>

        <ul className="nav-menu">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <li 
                key={item.id} 
                className={`nav-item ${isActive ? 'active' : ''}`}
                onClick={() => setActiveTab(item.id)}
              >
                <div className="nav-item-left">
                  <Icon size={18} />
                  <span>{item.label}</span>
                </div>
                {item.badge && <span className="nav-badge-new">{item.badge}</span>}
              </li>
            );
          })}
        </ul>
      </div>

      <div className="sidebar-pro-card">
        <div className="pro-card-header">
          <Crown size={18} color="#fbbf24" />
          <span>Upgrade to Pro</span>
        </div>
        <p className="pro-card-desc">
          Unlock advanced features, more practice sessions and personalized AI feedback.
        </p>
        <button className="btn-pro" onClick={onOpenPro}>
          <span>Go Pro</span>
          <ChevronRight size={16} />
        </button>
      </div>
    </aside>
  );
}
