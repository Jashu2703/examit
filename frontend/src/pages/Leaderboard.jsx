import { useState, useEffect } from 'react';
import { getLeaderboard } from '../services/api';

const EXAMS = ['JEE','NEET','CAT','GATE','SSC','UPSC','IBPS'];

export default function Leaderboard() {
  const [exam,    setExam]    = useState('JEE');
  const [period,  setPeriod]  = useState('all');
  const [data,    setData]    = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setLoading(true);
    getLeaderboard(exam, period)
      .then(r => setData(r.data))
      .finally(() => setLoading(false));
  }, [exam, period]);

  return (
    <div className="container page">
      <h1 className="section-title">Leaderboard</h1>

      <div style={{ display:'flex', gap:12, marginBottom:24, flexWrap:'wrap' }}>
        <div style={{ display:'flex', gap:6, flexWrap:'wrap' }}>
          {EXAMS.map(e => (
            <button key={e} onClick={() => setExam(e)}
              className={`btn btn-sm ${exam===e ? 'btn-primary' : 'btn-secondary'}`}>{e}</button>
          ))}
        </div>
        <div style={{ display:'flex', gap:6, marginLeft:'auto' }}>
          {['all','weekly'].map(p => (
            <button key={p} onClick={() => setPeriod(p)}
              className={`btn btn-sm ${period===p ? 'btn-primary' : 'btn-secondary'}`}>
              {p === 'all' ? 'All Time' : 'This Week'}
            </button>
          ))}
        </div>
      </div>

      {data?.your_rank && (
        <div className="alert alert-info" style={{ marginBottom:16 }}>
          🏆 Your rank: <strong>#{data.your_rank}</strong> in {exam} ({period === 'weekly' ? 'this week' : 'all time'})
        </div>
      )}

      {loading ? <div className="spinner"/> : (
        <div className="card">
          <table className="table">
            <thead>
              <tr><th>Rank</th><th>Player</th><th>Best Score</th><th>Tests</th></tr>
            </thead>
            <tbody>
              {data?.leaderboard?.map(entry => (
                <tr key={entry.rank} style={{ background: entry.is_you ? '#0c1a3a' : '' }}>
                  <td>
                    <span style={{ fontWeight:700, color: entry.rank===1?'#FFD700': entry.rank===2?'#C0C0C0': entry.rank===3?'#CD7F32':'var(--text2)' }}>
                      {entry.rank <= 3 ? ['🥇','🥈','🥉'][entry.rank-1] : `#${entry.rank}`}
                    </span>
                  </td>
                  <td>
                    {entry.username}
                    {entry.is_you && <span className="badge badge-blue" style={{ marginLeft:8 }}>You</span>}
                  </td>
                  <td style={{ fontWeight:600, color:'var(--accent)' }}>{entry.best_score}%</td>
                  <td style={{ color:'var(--text2)' }}>{entry.tests_taken}</td>
                </tr>
              ))}
              {(!data?.leaderboard || data.leaderboard.length === 0) && (
                <tr><td colSpan={4} style={{ textAlign:'center', color:'var(--text2)', padding:32 }}>No data yet for {exam}. Be the first!</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
