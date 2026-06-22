import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { getResult, getSession } from '../services/api';
import ReactMarkdown from 'react-markdown';

export default function ResultPage() {
  const { sessionId } = useParams();
  const [result,  setResult]  = useState(null);
  const [session, setSession] = useState(null);
  const [tab, setTab] = useState('overview');
  const [polling, setPolling] = useState(false);

  useEffect(() => {
    getSession(sessionId).then(r => setSession(r.data));
    fetchResult();
  }, [sessionId]);

  const fetchResult = async () => {
    try {
      const { data } = await getResult(sessionId);
      setResult(data);
      if (!data.ai_coach_report) {
        setPolling(true);
        setTimeout(fetchResult, 4000);
      } else {
        setPolling(false);
      }
    } catch (e) { setTimeout(fetchResult, 3000); }
  };

  if (!result) return <div className="container page"><div className="spinner"/><p style={{ textAlign:'center', color:'var(--text2)' }}>Loading your results...</p></div>;

  const pct   = result.percentage;
  const grade = pct >= 90 ? { label:'Excellent', color:'var(--success)' }
              : pct >= 75 ? { label:'Good',      color:'var(--accent)' }
              : pct >= 50 ? { label:'Average',   color:'var(--warning)' }
              :             { label:'Needs Work', color:'var(--danger)' };

  const tabs = ['overview','topics','solutions','coach'];

  return (
    <div className="container page">
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 28 }}>
        <div>
          <h1 style={{ marginBottom: 4 }}>Test Results</h1>
          <p style={{ color: 'var(--text2)' }}>{result.exam_type} · {new Date(result.created_at).toLocaleDateString('en-IN', { day:'numeric', month:'short', year:'numeric', hour:'2-digit', minute:'2-digit' })}</p>
        </div>
        <Link to="/start" className="btn btn-primary">Take Another Test</Link>
      </div>

      {/* Score cards */}
      <div className="grid-4" style={{ marginBottom: 24 }}>
        {[
          { label: 'Score',       val: `${result.raw_score}/${result.max_score}`, color: grade.color },
          { label: 'Percentage',  val: `${pct.toFixed(1)}%`,                     color: grade.color },
          { label: 'Percentile',  val: result.percentile ? `${result.percentile}%ile` : '—', color: 'var(--accent)' },
          { label: 'Grade',       val: grade.label,                               color: grade.color },
        ].map(s => (
          <div key={s.label} className="card" style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 26, fontWeight: 700, color: s.color }}>{s.val}</div>
            <div style={{ fontSize: 12, color: 'var(--text2)', marginTop: 4 }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Stats row */}
      <div className="card" style={{ marginBottom: 24 }}>
        <div style={{ display: 'flex', gap: 32, flexWrap: 'wrap' }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 22, fontWeight: 700, color: 'var(--success)' }}>{result.correct}</div>
            <div style={{ fontSize: 12, color: 'var(--text2)' }}>Correct</div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 22, fontWeight: 700, color: 'var(--danger)' }}>{result.incorrect}</div>
            <div style={{ fontSize: 12, color: 'var(--text2)' }}>Incorrect</div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 22, fontWeight: 700, color: 'var(--text2)' }}>{result.unattempted}</div>
            <div style={{ fontSize: 12, color: 'var(--text2)' }}>Skipped</div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 22, fontWeight: 700, color: 'var(--accent)' }}>{result.time_taken_mins?.toFixed(1)}m</div>
            <div style={{ fontSize: 12, color: 'var(--text2)' }}>Time taken</div>
          </div>
          {result.time_analysis?.avg_time_secs && (
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 22, fontWeight: 700, color: 'var(--warning)' }}>{result.time_analysis.avg_time_secs}s</div>
              <div style={{ fontSize: 12, color: 'var(--text2)' }}>Avg per Q</div>
            </div>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 20, borderBottom: '1px solid var(--border)', paddingBottom: 0 }}>
        {tabs.map(t => (
          <button key={t} onClick={() => setTab(t)}
            style={{
              padding: '10px 18px', border: 'none', cursor: 'pointer', fontSize: 14, fontWeight: 500,
              background: 'transparent', textTransform: 'capitalize',
              color: tab === t ? 'var(--accent)' : 'var(--text2)',
              borderBottom: tab === t ? '2px solid var(--accent)' : '2px solid transparent',
              transition: 'all 0.15s'
            }}>
            {t === 'coach' ? '🤖 AI Coach' : t.charAt(0).toUpperCase() + t.slice(1)}
          </button>
        ))}
      </div>

      {/* Overview */}
      {tab === 'overview' && (
        <div>
          <h3 className="section-title">Accuracy by Topic</h3>
          {result.topic_accuracy && Object.entries(result.topic_accuracy).slice(0, 12).map(([topic, data]) => (
            <div key={topic} style={{ marginBottom: 12 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 4 }}>
                <span>{topic}</span>
                <span style={{ color: data.pct >= 70 ? 'var(--success)' : data.pct >= 40 ? 'var(--warning)' : 'var(--danger)' }}>
                  {data.correct}/{data.total} ({data.pct.toFixed(0)}%)
                </span>
              </div>
              <div className="progress">
                <div className="progress-fill" style={{
                  width: `${data.pct}%`,
                  background: data.pct >= 70 ? 'var(--success)' : data.pct >= 40 ? 'var(--warning)' : 'var(--danger)'
                }}/>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Topics */}
      {tab === 'topics' && (
        <div>
          <h3 className="section-title">🔴 Weak Topics — Fix These First</h3>
          {result.weak_topics?.filter(t => t.score < 60).map((t, i) => (
            <div key={i} className="card card-sm" style={{ marginBottom: 8, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ fontWeight: 500 }}>{t.chapter}</div>
                <div style={{ fontSize: 12, color: 'var(--text2)' }}>{t.subject}</div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ fontSize: 18, fontWeight: 700, color: t.score < 40 ? 'var(--danger)' : 'var(--warning)' }}>
                  {t.score.toFixed(0)}%
                </span>
                <span className={`badge ${t.priority === 'high' ? 'badge-red' : 'badge-yellow'}`}>{t.priority}</span>
              </div>
            </div>
          ))}
          {(!result.weak_topics || result.weak_topics.filter(t => t.score < 60).length === 0) && (
            <div className="alert alert-success">Great work! No major weak areas detected.</div>
          )}
        </div>
      )}

      {/* Solutions */}
      {tab === 'solutions' && (
        <div>
          <h3 className="section-title">Solution Explanations</h3>
          {result.solutions && Object.keys(result.solutions).length > 0 ? (
            Object.entries(result.solutions).map(([idx, sol]) => (
              <div key={idx} className="card" style={{ marginBottom: 12 }}>
                <div style={{ fontSize: 12, color: 'var(--text2)', marginBottom: 6 }}>Question {parseInt(idx)+1}</div>
                <div style={{ marginBottom: 8 }}>
                  <span style={{ color: 'var(--success)', fontWeight: 500 }}>
                    ✓ Correct: ({sol.correct_answer}) {sol.correct_text}
                  </span>
                </div>
                <p style={{ fontSize: 13, color: 'var(--text2)', lineHeight: 1.7 }}>{sol.explanation}</p>
                {sol.trick && (
                  <div style={{ marginTop: 10, padding: '8px 12px', background: '#0c1a3a', borderRadius: 6, fontSize: 13 }}>
                    💡 <strong>Trick:</strong> {sol.trick}
                  </div>
                )}
              </div>
            ))
          ) : (
            <div className="alert alert-info">
              {polling ? '⏳ AI is generating solution explanations...' : 'No solutions available yet.'}
            </div>
          )}
        </div>
      )}

      {/* AI Coach */}
      {tab === 'coach' && (
        <div>
          {result.ai_coach_report ? (
            <div className="card" style={{ lineHeight: 1.8 }}>
              <ReactMarkdown components={{
                h2: ({children}) => <h2 style={{ fontSize: 16, fontWeight: 600, marginBottom: 8, marginTop: 20, color: 'var(--accent)' }}>{children}</h2>,
                h3: ({children}) => <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 6, marginTop: 14 }}>{children}</h3>,
                p:  ({children}) => <p style={{ fontSize: 13, color: 'var(--text2)', marginBottom: 10 }}>{children}</p>,
                ul: ({children}) => <ul style={{ paddingLeft: 20, marginBottom: 10 }}>{children}</ul>,
                li: ({children}) => <li style={{ fontSize: 13, color: 'var(--text2)', marginBottom: 4 }}>{children}</li>,
                strong: ({children}) => <strong style={{ color: 'var(--text)', fontWeight: 600 }}>{children}</strong>,
              }}>
                {result.ai_coach_report}
              </ReactMarkdown>
            </div>
          ) : (
            <div className="alert alert-info">
              ⏳ AI coach is analysing your performance... Check back in a few seconds.
              {polling && <button className="btn btn-sm btn-secondary" style={{ marginLeft: 12 }} onClick={fetchResult}>Refresh</button>}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
