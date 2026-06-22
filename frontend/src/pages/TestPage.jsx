import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getSession, submitTest } from '../services/api';

export default function TestPage() {
  const { sessionId } = useParams();
  const navigate = useNavigate();
  const [session,  setSession]  = useState(null);
  const [current,  setCurrent]  = useState(0);
  const [answers,  setAnswers]  = useState({});
  const [flagged,  setFlagged]  = useState(new Set());
  const [timeLeft, setTimeLeft] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const startTimes = useRef({});
  const timePerQ   = useRef({});

  useEffect(() => {
    getSession(sessionId).then(r => {
      setSession(r.data);
      setTimeLeft(r.data.duration_mins * 60);
    });
  }, [sessionId]);

  // Timer
  useEffect(() => {
    if (!session) return;
    const id = setInterval(() => {
      setTimeLeft(t => {
        if (t <= 1) { clearInterval(id); handleSubmit(true); return 0; }
        return t - 1;
      });
    }, 1000);
    return () => clearInterval(id);
  }, [session]);

  // Track time per question
  useEffect(() => {
    startTimes.current[current] = Date.now();
    return () => {
      const elapsed = (Date.now() - (startTimes.current[current] || Date.now())) / 1000;
      timePerQ.current[current] = (timePerQ.current[current] || 0) + elapsed;
    };
  }, [current]);

  const handleAnswer = (qIdx, option) => {
    setAnswers(a => ({ ...a, [qIdx]: option }));
  };

  const handleSubmit = useCallback(async (auto = false) => {
    if (!auto && !showConfirm) { setShowConfirm(true); return; }
    setSubmitting(true);
    // Record final time for current question
    const elapsed = (Date.now() - (startTimes.current[current] || Date.now())) / 1000;
    timePerQ.current[current] = (timePerQ.current[current] || 0) + elapsed;

    try {
      await submitTest({
        session_id: sessionId,
        answers: Object.fromEntries(Object.entries(answers).map(([k,v]) => [String(k), v])),
        time_per_q: Object.fromEntries(Object.entries(timePerQ.current).map(([k,v]) => [String(k), Math.round(v)]))
      });
      navigate(`/result/${sessionId}`);
    } catch (e) {
      console.error(e);
      setSubmitting(false);
      setShowConfirm(false);
    }
  }, [answers, sessionId, showConfirm, current, navigate]);

  if (!session) return <div className="container page"><div className="spinner"/></div>;

  const questions = session.questions || [];
  const q = questions[current];
  const fmt = s => `${Math.floor(s/60).toString().padStart(2,'0')}:${(s%60).toString().padStart(2,'0')}`;
  const answered   = Object.keys(answers).length;
  const unattempted = questions.length - answered;
  const pct = Math.round((timeLeft / (session.duration_mins * 60)) * 100);
  const timerColor = timeLeft < 300 ? 'var(--danger)' : timeLeft < 600 ? 'var(--warning)' : 'var(--success)';

  const qStatus = i => {
    if (flagged.has(i)) return '#451a03';
    if (answers[i])     return '#052e16';
    if (i === current)  return '#0c1a3a';
    return 'var(--bg3)';
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh' }}>

      {/* Top bar */}
      <div style={{ background: 'var(--bg2)', borderBottom: '1px solid var(--border)', padding: '10px 24px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
        <div style={{ fontWeight: 600 }}>{session.exam_type} Mock Test</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 24 }}>
          <div style={{ fontSize: 13, color: 'var(--text2)' }}>
            <span style={{ color: 'var(--success)' }}>✓ {answered}</span>
            {' · '}
            <span style={{ color: 'var(--text2)' }}>— {unattempted}</span>
            {' · '}
            <span style={{ color: 'var(--warning)' }}>⚑ {flagged.size}</span>
          </div>
          <div style={{ fontSize: 22, fontWeight: 700, color: timerColor, fontVariantNumeric: 'tabular-nums' }}>
            {fmt(timeLeft)}
          </div>
          <button className="btn btn-danger btn-sm" onClick={() => setShowConfirm(true)} disabled={submitting}>
            Submit
          </button>
        </div>
      </div>

      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>

        {/* Question area */}
        <div style={{ flex: 1, overflow: 'auto', padding: '28px 32px' }}>
          <div style={{ fontSize: 13, color: 'var(--text2)', marginBottom: 12 }}>
            Question {current + 1} of {questions.length}
            {q?.subject && <> · <span className="badge badge-blue" style={{ marginLeft: 6 }}>{q.subject}</span></>}
            {q?.chapter && <> · <span style={{ color: 'var(--text3)' }}>{q.chapter}</span></>}
            {q?.difficulty && (
              <span className={`badge ${q.difficulty === 'easy' ? 'badge-green' : q.difficulty === 'hard' ? 'badge-red' : 'badge-yellow'}`}
                style={{ marginLeft: 8 }}>
                {q.difficulty}
              </span>
            )}
          </div>

          <div style={{ fontSize: 17, lineHeight: 1.7, marginBottom: 28, fontWeight: 400 }}>
            {q?.question}
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {q && Object.entries(q.options).map(([opt, text]) => {
              const selected = answers[current] === opt;
              return (
                <div key={opt} onClick={() => handleAnswer(current, opt)}
                  style={{
                    padding: '14px 18px', borderRadius: 10, cursor: 'pointer',
                    border: `1.5px solid ${selected ? 'var(--accent)' : 'var(--border)'}`,
                    background: selected ? '#0c1a3a' : 'var(--bg2)',
                    display: 'flex', alignItems: 'flex-start', gap: 12, transition: 'all 0.1s'
                  }}>
                  <span style={{
                    width: 28, height: 28, borderRadius: '50%', flexShrink: 0,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    background: selected ? 'var(--accent)' : 'var(--bg3)',
                    color: selected ? '#fff' : 'var(--text2)', fontWeight: 600, fontSize: 13
                  }}>{opt}</span>
                  <span style={{ lineHeight: 1.6, paddingTop: 3 }}>{text}</span>
                </div>
              );
            })}
          </div>

          {/* Nav buttons */}
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 28, alignItems: 'center' }}>
            <button className="btn btn-secondary" onClick={() => setCurrent(c => Math.max(0, c-1))} disabled={current === 0}>
              ← Previous
            </button>
            <button
              className={`btn btn-sm ${flagged.has(current) ? 'btn-danger' : 'btn-secondary'}`}
              onClick={() => setFlagged(f => { const n = new Set(f); n.has(current) ? n.delete(current) : n.add(current); return n; })}>
              {flagged.has(current) ? '⚑ Flagged' : '⚑ Flag for review'}
            </button>
            <button className="btn btn-secondary" onClick={() => setCurrent(c => Math.min(questions.length-1, c+1))} disabled={current === questions.length-1}>
              Next →
            </button>
          </div>
        </div>

        {/* Question palette */}
        <div style={{ width: 200, background: 'var(--bg2)', borderLeft: '1px solid var(--border)',
          padding: 16, overflow: 'auto', flexShrink: 0 }}>
          <div style={{ fontSize: 12, color: 'var(--text3)', marginBottom: 12, fontWeight: 600 }}>QUESTION PALETTE</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 6 }}>
            {questions.map((_, i) => (
              <button key={i} onClick={() => setCurrent(i)}
                style={{
                  width: 32, height: 32, borderRadius: 6, border: `1px solid ${i === current ? 'var(--accent)' : 'var(--border)'}`,
                  background: qStatus(i), color: 'var(--text)', fontSize: 12, cursor: 'pointer', fontWeight: i === current ? 700 : 400
                }}>
                {i+1}
              </button>
            ))}
          </div>
          <div style={{ marginTop: 20, fontSize: 11, color: 'var(--text3)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
              <span style={{ width: 12, height: 12, borderRadius: 3, background: '#052e16', display: 'inline-block' }}/> Answered
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
              <span style={{ width: 12, height: 12, borderRadius: 3, background: '#451a03', display: 'inline-block' }}/> Flagged
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ width: 12, height: 12, borderRadius: 3, background: 'var(--bg3)', display: 'inline-block' }}/> Not visited
            </div>
          </div>
        </div>
      </div>

      {/* Confirm modal */}
      {showConfirm && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex',
          alignItems: 'center', justifyContent: 'center', zIndex: 200 }}>
          <div className="card" style={{ maxWidth: 400, width: '90%' }}>
            <h3 style={{ marginBottom: 12 }}>Submit test?</h3>
            <div style={{ fontSize: 13, color: 'var(--text2)', marginBottom: 20 }}>
              <div>✅ Answered: <strong>{answered}</strong></div>
              <div>❌ Unattempted: <strong>{unattempted}</strong></div>
              <div>⚑ Flagged: <strong>{flagged.size}</strong></div>
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <button className="btn btn-secondary" style={{ flex: 1 }} onClick={() => setShowConfirm(false)}>
                Cancel
              </button>
              <button className="btn btn-primary" style={{ flex: 1 }} onClick={() => handleSubmit(true)} disabled={submitting}>
                {submitting ? 'Submitting...' : 'Submit Test'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
