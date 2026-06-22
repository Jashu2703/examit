import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { getDashboard, getHistory } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';

export default function Dashboard() {
  const { user }  = useAuth();
  const [stats,   setStats]   = useState(null);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([getDashboard(), getHistory()])
      .then(([s, h]) => { setStats(s.data); setHistory(h.data); })
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="container page"><div className="spinner"/></div>;

  return (
    <div className="container page">
      {/* Welcome */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 28 }}>
        <div>
          <h1>Welcome back, {user?.username} 👋</h1>
          <p style={{ color: 'var(--text2)', marginTop: 4 }}>
            {user?.target_exam ? `Preparing for ${user.target_exam}` : 'Keep up the practice!'}
            {stats?.streak > 0 && <span style={{ marginLeft: 12 }}>🔥 {stats.streak} day streak</span>}
          </p>
        </div>
        <Link to="/start" className="btn btn-primary btn-lg">🚀 New Test</Link>
      </div>

      {/* Stat cards */}
      {stats && (
        <div className="grid-4" style={{ marginBottom: 24 }}>
          {[
            { label:'Tests Taken',  val: stats.total_tests,                color:'var(--accent)' },
            { label:'Average Score', val: `${stats.avg_score}%`,           color:'var(--success)' },
            { label:'Best Score',    val: `${stats.best_score}%`,          color:'var(--warning)' },
            { label:'Questions Done', val: stats.total_questions_attempted, color:'var(--text)' },
          ].map(s => (
            <div key={s.label} className="card" style={{ textAlign:'center', padding: '20px' }}>
              <div style={{ fontSize:28, fontWeight:700, color:s.color }}>{s.val}</div>
              <div style={{ fontSize:12, color:'var(--text2)', marginTop:4 }}>{s.label}</div>
            </div>
          ))}
        </div>
      )}

      {/* Score trend chart */}
      {stats?.recent_scores?.length > 1 && (
        <div className="card" style={{ marginBottom: 24 }}>
          <h3 className="section-title">Score Trend</h3>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={stats.recent_scores}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)"/>
              <XAxis dataKey="date" stroke="var(--text3)" tick={{ fontSize: 11 }}/>
              <YAxis domain={[0,100]} stroke="var(--text3)" tick={{ fontSize: 11 }}/>
              <Tooltip
                contentStyle={{ background:'var(--bg2)', border:'1px solid var(--border)', borderRadius:8, fontSize:12 }}
                labelStyle={{ color:'var(--text2)' }}
              />
              <Line type="monotone" dataKey="percentage" stroke="var(--accent)" strokeWidth={2} dot={{ r:4, fill:'var(--accent)' }}/>
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      <div className="grid-2">
        {/* Weak topics */}
        <div className="card">
          <h3 className="section-title">🔴 Weak Topics</h3>
          {stats?.weak_topics_overall?.length > 0 ? (
            stats.weak_topics_overall.slice(0,6).map((t, i) => (
              <div key={i} style={{ marginBottom: 12 }}>
                <div style={{ display:'flex', justifyContent:'space-between', fontSize:13, marginBottom:4 }}>
                  <span>{t.topic.split(' — ')[1] || t.topic}</span>
                  <span style={{ color: t.avg_score < 40 ? 'var(--danger)' : 'var(--warning)', fontWeight:500 }}>
                    {t.avg_score}%
                  </span>
                </div>
                <div className="progress">
                  <div className="progress-fill" style={{ width:`${t.avg_score}%`, background: t.avg_score < 40 ? 'var(--danger)' : 'var(--warning)' }}/>
                </div>
              </div>
            ))
          ) : (
            <p style={{ color:'var(--text2)', fontSize:13 }}>Complete a test to see your weak areas.</p>
          )}
        </div>

        {/* Exam breakdown */}
        <div className="card">
          <h3 className="section-title">📊 Exam Breakdown</h3>
          {stats?.exam_breakdown && Object.keys(stats.exam_breakdown).length > 0 ? (
            Object.entries(stats.exam_breakdown).map(([exam, data]) => (
              <div key={exam} style={{ marginBottom:14 }}>
                <div style={{ display:'flex', justifyContent:'space-between', fontSize:13, marginBottom:4 }}>
                  <strong>{exam}</strong>
                  <span style={{ color:'var(--text2)' }}>{data.tests} tests · best {data.best}%</span>
                </div>
                <div className="progress">
                  <div className="progress-fill" style={{ width:`${data.avg}%`, background:'var(--accent)' }}/>
                </div>
              </div>
            ))
          ) : (
            <p style={{ color:'var(--text2)', fontSize:13 }}>No tests yet. <Link to="/start">Start your first test →</Link></p>
          )}
        </div>
      </div>

      {/* History table */}
      {history.length > 0 && (
        <div className="card" style={{ marginTop: 24 }}>
          <h3 className="section-title">Recent Tests</h3>
          <table className="table">
            <thead>
              <tr>
                <th>Exam</th><th>Score</th><th>Correct</th><th>Wrong</th><th>Time</th><th>Percentile</th><th></th>
              </tr>
            </thead>
            <tbody>
              {history.slice(0,10).map(r => (
                <tr key={r.result_id}>
                  <td><span className="badge badge-blue">{r.exam_type}</span></td>
                  <td style={{ color: r.percentage >= 70 ? 'var(--success)' : r.percentage >= 50 ? 'var(--warning)' : 'var(--danger)', fontWeight:600 }}>
                    {r.percentage.toFixed(1)}%
                  </td>
                  <td style={{ color:'var(--success)' }}>{r.correct}</td>
                  <td style={{ color:'var(--danger)' }}>{r.incorrect}</td>
                  <td style={{ color:'var(--text2)' }}>{r.time_mins?.toFixed(0)}m</td>
                  <td>{r.percentile ? `${r.percentile}%ile` : '—'}</td>
                  <td><Link to={`/result/${r.session_id}`} className="btn btn-secondary btn-sm">View</Link></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Empty state */}
      {stats?.total_tests === 0 && (
        <div className="card" style={{ textAlign:'center', padding:'60px 24px', marginTop:24 }}>
          <div style={{ fontSize:48, marginBottom:16 }}>🎯</div>
          <h2 style={{ marginBottom:8 }}>Ready to start your prep?</h2>
          <p style={{ color:'var(--text2)', marginBottom:24 }}>Take your first mock test. AI generates fresh questions every time.</p>
          <Link to="/start" className="btn btn-primary btn-lg">Start First Test</Link>
        </div>
      )}
    </div>
  );
}
