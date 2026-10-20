import React from 'react';
import { Home, Video, Mic, BarChart2, Settings } from 'lucide-react';

export default function BottomMobileNav({ activeTab, setActiveTab }) {
  const tabs = [
    { id: 'home', label: 'Home', icon: Home },
    { id: 'mock', label: 'Mock Interview', icon: Video },
    { id: 'speaking', label: 'Speaking', icon: Mic },
    { id: 'progress', label: 'Progress', icon: BarChart2 },
    { id: 'settings', label: 'Settings', icon: Settings },
  ];

  return (
    <nav className="bottom-mobile-nav">
      {tabs.map((tab) => {
        const Icon = tab.icon;
        const isActive = activeTab === tab.id;
        return (
          <div 
            key={tab.id} 
            className={`mobile-nav-item ${isActive ? 'active' : ''}`}
            onClick={() => setActiveTab(tab.id)}
          >
            <Icon size={20} />
            <span>{tab.label}</span>
          </div>
        );
      })}
    </nav>
  );
}
