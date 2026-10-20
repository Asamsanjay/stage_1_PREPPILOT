import React, { useState } from 'react';
import { 
  Sparkles, 
  Award, 
  CheckCircle, 
  AlertCircle, 
  BookOpen, 
  MessageSquare, 
  RotateCcw, 
  ChevronDown, 
  ChevronUp, 
  Volume2, 
  Zap, 
  FileText,
  ListOrdered,
  Layers,
  ArrowRight
} from 'lucide-react';

export default function SpeakingAnalysisReport({
  report,
  topic,
  difficulty,
  onRetryTopic,
  onOpenPreviousReports,
  hasOtherReports = false
}) {
  const [activeTab, setActiveTab] = useState('overview'); // 'overview' | 'grammar' | 'fillers' | 'sample'
  const [showTranscript, setShowTranscript] = useState(false);

  if (!report) return null;

  const {
    overall_score,
    category_scores = {},
    strengths = [],
    areas_to_improve = [],
    grammar_corrections = [],
    filler_words = { detected_count: 0, breakdown: {}, is_estimated: false },
    personalized_suggestions = [],
    improved_sample_answer,
    delivery_notes,
    transcript,
    displayTranscript,
    summary,
    status
  } = report;

  const actualTranscript = transcript || displayTranscript || '';

  // Performance Rating Badge
  const getRatingBadge = (score) => {
    if (score === null || score === undefined) return { label: 'Incomplete', color: '#94a3b8' };
    if (score >= 90) return { label: 'Mastery / Advanced', color: '#10b981' };
    if (score >= 75) return { label: 'Proficient', color: '#0066ff' };
    if (score >= 60) return { label: 'Competent', color: '#f59e0b' };
    return { label: 'Developing', color: '#ef4444' };
  };

  const rating = getRatingBadge(overall_score);

  const categories = [
    { key: 'fluency', label: 'Fluency', desc: 'Pace, pauses, and continuous rhythm' },
    { key: 'grammar', label: 'Grammar', desc: 'Syntactic accuracy and sentence structure' },
    { key: 'vocabulary', label: 'Vocabulary', desc: 'Lexical variety, precision, and tone' },
    { key: 'relevance', label: 'Relevance', desc: 'Direct alignment to the prompt topic' },
    { key: 'structure', label: 'Structure', desc: 'Clear introduction, points, and closing' },
    { key: 'clarity', label: 'Clarity', desc: 'Enunciation and message coherence' }
  ];

  return (
    <div className="speaking-report-container">
      {/* 1. Header Banner & Overall Score Card */}
      <div className="report-hero-card">
        <div className="report-hero-left">
          <div className="report-badge-pill">
            <Sparkles size={13} color="#00c6ff" />
            <span>PrepPilot Speaking Coach Report</span>
          </div>
          <h2 className="report-topic-title">"{topic || 'Challenge Topic'}"</h2>
          <div className="report-topic-meta">
            <span className={`pill-diff ${difficulty?.toLowerCase()}`}>{difficulty || 'Beginner'}</span>
            <span className="report-rating-tag" style={{ color: rating.color, borderColor: `${rating.color}40` }}>
              {rating.label}
            </span>
          </div>
          <p className="report-executive-summary">
            {summary || 'Detailed feedback on your speaking challenge performance.'}
          </p>
        </div>

        <div className="report-score-gauge-card">
          <div className="score-circular-badge">
            <span className="score-number-big">
              {overall_score !== null ? overall_score : '—'}
            </span>
            <span className="score-max-sub">/ 100</span>
          </div>
          <span className="score-rubric-note">Documented Rubric Score</span>
        </div>
      </div>

      {/* 2. Navigation Tabs */}
      <div className="report-tabs-bar">
        <button 
          className={`report-tab-btn ${activeTab === 'overview' ? 'active' : ''}`}
          onClick={() => setActiveTab('overview')}
        >
          <Layers size={15} />
          <span>Core Evaluation</span>
        </button>
        <button 
          className={`report-tab-btn ${activeTab === 'grammar' ? 'active' : ''}`}
          onClick={() => setActiveTab('grammar')}
        >
          <BookOpen size={15} />
          <span>Grammar Corrections ({grammar_corrections.length})</span>
        </button>
        <button 
          className={`report-tab-btn ${activeTab === 'fillers' ? 'active' : ''}`}
          onClick={() => setActiveTab('fillers')}
        >
          <Zap size={15} />
          <span>Filler Words ({filler_words?.detected_count ?? 0})</span>
        </button>
        {improved_sample_answer && (
          <button 
            className={`report-tab-btn ${activeTab === 'sample' ? 'active' : ''}`}
            onClick={() => setActiveTab('sample')}
          >
            <Sparkles size={15} />
            <span>Improved Sample Answer</span>
          </button>
        )}
      </div>

      {/* 3. TAB CONTENT */}
      {activeTab === 'overview' && (
        <div className="report-tab-content">
          {/* Category Scores Grid */}
          <div className="report-section-card">
            <h3 className="report-card-heading">
              <Award size={18} color="#0066ff" />
              <span>Category Scores</span>
            </h3>
            <div className="category-scores-grid">
              {categories.map((cat) => {
                const val = category_scores[cat.key];
                const isAssessed = val !== null && val !== undefined;
                return (
                  <div key={cat.key} className="category-score-cell">
                    <div className="cat-cell-top">
                      <span className="cat-cell-name">{cat.label}</span>
                      <span className={`cat-cell-val ${isAssessed ? 'active' : 'muted'}`}>
                        {isAssessed ? `${val}/100` : 'Not assessed'}
                      </span>
                    </div>
                    {isAssessed && (
                      <div className="cat-progress-track">
                        <div 
                          className="cat-progress-bar"
                          style={{
                            width: `${val}%`,
                            background: val >= 80 ? '#10b981' : val >= 60 ? '#0066ff' : '#f59e0b'
                          }}
                        />
                      </div>
                    )}
                    <span className="cat-cell-desc">{cat.desc}</span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Strengths & Areas for Improvement (Side by Side) */}
          <div className="strengths-weaknesses-split">
            {/* Strengths */}
            <div className="report-section-card strengths-card">
              <h3 className="report-card-heading text-emerald">
                <CheckCircle size={18} color="#10b981" />
                <span>Key Strengths ({strengths.length})</span>
              </h3>
              {strengths.length > 0 ? (
                <ul className="feedback-bullets-list">
                  {strengths.map((s, idx) => (
                    <li key={idx} className="strength-item">
                      <span className="bullet-indicator bg-emerald" />
                      <span>{s}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="empty-subtext">No explicit strengths registered for this response.</p>
              )}
            </div>

            {/* Areas to Improve */}
            <div className="report-section-card weaknesses-card">
              <h3 className="report-card-heading text-amber">
                <AlertCircle size={18} color="#f59e0b" />
                <span>Areas to Improve ({areas_to_improve.length})</span>
              </h3>
              {areas_to_improve.length > 0 ? (
                <ul className="feedback-bullets-list">
                  {areas_to_improve.map((a, idx) => (
                    <li key={idx} className="weakness-item">
                      <span className="bullet-indicator bg-amber" />
                      <span>{a}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="empty-subtext">No significant areas for improvement identified.</p>
              )}
            </div>
          </div>

          {/* Personalized Suggestions */}
          {personalized_suggestions.length > 0 && (
            <div className="report-section-card">
              <h3 className="report-card-heading">
                <ListOrdered size={18} color="#0066ff" />
                <span>Personalized Recommendations</span>
              </h3>
              <div className="suggestions-cards-stack">
                {personalized_suggestions.map((sugg, idx) => (
                  <div key={idx} className="suggestion-item-row">
                    <span className="sugg-number-pill">{idx + 1}</span>
                    <span className="sugg-text">{sugg}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Delivery & Pacing Notes */}
          {delivery_notes && (
            <div className="report-section-card delivery-notes-card">
              <h3 className="report-card-heading">
                <Volume2 size={18} color="#6366f1" />
                <span>Speech Delivery & Pronunciation Notes</span>
              </h3>
              <p className="delivery-notes-text">{delivery_notes}</p>
              <span className="accent-disclaimer-pill">
                Note: Accents are natural expressions of language and are never treated as errors.
              </span>
            </div>
          )}
        </div>
      )}

      {/* GRAMMAR CORRECTIONS TAB */}
      {activeTab === 'grammar' && (
        <div className="report-tab-content">
          <div className="report-section-card">
            <h3 className="report-card-heading">
              <BookOpen size={18} color="#0066ff" />
              <span>Grammar & Phrasing Corrections</span>
            </h3>
            {grammar_corrections.length > 0 ? (
              <div className="grammar-cards-list">
                {grammar_corrections.map((item, idx) => (
                  <div key={idx} className="grammar-correction-card">
                    <div className="grammar-diff-row">
                      <div className="grammar-original-box">
                        <span className="grammar-box-tag tag-original">Original Spoken Sentence</span>
                        <p className="grammar-sentence-text">{item.original}</p>
                      </div>
                      <div className="grammar-arrow-icon">
                        <ArrowRight size={18} color="#94a3b8" />
                      </div>
                      <div className="grammar-corrected-box">
                        <span className="grammar-box-tag tag-corrected">Suggested Correction</span>
                        <p className="grammar-sentence-text font-bold text-emerald">{item.corrected}</p>
                      </div>
                    </div>
                    {item.explanation && (
                      <div className="grammar-explanation-box">
                        <span className="explanation-label">Why:</span>
                        <span className="explanation-text">{item.explanation}</span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="empty-subtext-box">
                <CheckCircle size={28} color="#10b981" />
                <p>No major grammatical errors were detected in your speech. Great work!</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* FILLER WORDS TAB */}
      {activeTab === 'fillers' && (
        <div className="report-tab-content">
          <div className="report-section-card">
            <div className="filler-header-flex">
              <div>
                <h3 className="report-card-heading" style={{ marginBottom: '4px' }}>
                  <Zap size={18} color="#0066ff" />
                  <span>Filler Word Analysis</span>
                </h3>
                <p className="filler-meta-subtitle">
                  Count detected from speech transcript. (Count distinction: <strong>Real Detected Counts</strong>, not statistical estimates).
                </p>
              </div>
              <div className="filler-total-badge">
                <span className="filler-total-num">{filler_words?.detected_count ?? 0}</span>
                <span className="filler-total-label">Detected Fillers</span>
              </div>
            </div>

            {/* Breakdown Chips */}
            <div className="filler-chips-grid">
              {Object.entries(filler_words?.breakdown || {}).map(([word, count]) => (
                <div key={word} className={`filler-chip-card ${count > 0 ? 'highlight' : ''}`}>
                  <span className="filler-chip-word">"{word}"</span>
                  <span className="filler-chip-count">{count}</span>
                </div>
              ))}
            </div>

            {filler_words?.impact_note && (
              <div className="filler-impact-note">
                <MessageSquare size={16} color="#64748b" />
                <span>{filler_words.impact_note}</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* IMPROVED SAMPLE ANSWER TAB */}
      {activeTab === 'sample' && improved_sample_answer && (
        <div className="report-tab-content">
          <div className="report-section-card sample-answer-card">
            <div className="sample-answer-header">
              <Sparkles size={18} color="#8b5cf6" />
              <div>
                <h3 className="report-card-heading" style={{ margin: 0 }}>
                  Improved Model Answer
                </h3>
                <p style={{ fontSize: '13px', color: '#64748b', margin: '2px 0 0 0' }}>
                  Demonstrates advanced structure and vocabulary while strictly preserving your authentic thoughts and ideas.
                </p>
              </div>
            </div>

            <div className="sample-answer-body">
              <p className="sample-answer-text">"{improved_sample_answer}"</p>
            </div>
          </div>
        </div>
      )}

      {/* 4. Verbatim Transcript Drawer (Optional Review) */}
      {actualTranscript && (
        <div className="report-section-card transcript-drawer-card">
          <div 
            className="transcript-header-toggle"
            onClick={() => setShowTranscript(prev => !prev)}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <FileText size={16} color="#64748b" />
              <span style={{ fontWeight: 700, fontSize: '14px', color: '#0f172a' }}>
                Verbatim Transcript
              </span>
            </div>
            {showTranscript ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </div>

          {showTranscript && (
            <div className="transcript-content-box">
              <p className="transcript-body-text">{actualTranscript}</p>
            </div>
          )}
        </div>
      )}

      {/* 5. Footer Actions */}
      <div className="report-footer-actions">
        {onRetryTopic && (
          <button className="btn-primary" onClick={onRetryTopic}>
            <RotateCcw size={16} />
            <span>Attempt This Topic Again</span>
          </button>
        )}

        {hasOtherReports && onOpenPreviousReports && (
          <button className="btn-secondary" onClick={onOpenPreviousReports}>
            <Layers size={16} />
            <span>View Previous Reports</span>
          </button>
        )}
      </div>
    </div>
  );
}
