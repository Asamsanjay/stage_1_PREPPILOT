import React, { useState } from 'react';
import { Search, Bell, ChevronDown, LogOut } from 'lucide-react';

export default function TopHeader({ searchQuery, setSearchQuery, isMobileView, user, onLogout }) {
  const [showMenu, setShowMenu] = useState(false);
  const displayName = user?.name || 'User';
  const avatarUrl = user?.avatar_url;

  return (
    <header className="top-header">
      <div className="search-container">
        <Search size={18} color="#64748b" />
        <input 
          type="text" 
          className="search-input"
          placeholder="Search topics, skills, or anything..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>

      <div className="header-actions">
        <button className="icon-btn" title="Notifications">
          <Bell size={18} />
          <span className="notification-badge"></span>
        </button>

        <div style={{ position: 'relative' }}>
          <div 
            className="user-profile-btn"
            onClick={() => setShowMenu(!showMenu)}
            style={{ cursor: 'pointer' }}
          >
            {avatarUrl ? (
              <img 
                src={avatarUrl} 
                alt={displayName} 
                className="user-avatar"
                style={{ width: '32px', height: '32px', borderRadius: '50%', objectFit: 'cover' }}
              />
            ) : (
              <div style={{
                width: '32px',
                height: '32px',
                borderRadius: '50%',
                background: 'linear-gradient(135deg, #0052cc, #00c6ff)',
                color: '#fff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '14px',
                fontWeight: 'bold'
              }}>
                {displayName.charAt(0).toUpperCase()}
              </div>
            )}
            {!isMobileView && <span className="user-name">{displayName}</span>}
            <ChevronDown size={14} color="#64748b" />
          </div>

          {showMenu && (
            <div style={{
              position: 'absolute',
              top: '100%',
              right: 0,
              marginTop: '8px',
              background: '#ffffff',
              borderRadius: '12px',
              boxShadow: '0 10px 25px rgba(0,0,0,0.1)',
              border: '1px solid #e2e8f0',
              padding: '8px',
              zIndex: 100,
              minWidth: '160px'
            }}>
              <button
                onClick={() => { setShowMenu(false); if (onLogout) onLogout(); }}
                style={{
                  width: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '8px 12px',
                  background: 'none',
                  border: 'none',
                  borderRadius: '6px',
                  color: '#ef4444',
                  fontSize: '13px',
                  fontWeight: 600,
                  cursor: 'pointer'
                }}
              >
                <LogOut size={14} />
                <span>Sign Out</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
