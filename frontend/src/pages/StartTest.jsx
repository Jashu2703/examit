import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { listExams, getSubjects, getChapters, startTest } from '../services/api';

const DIFFICULTIES = ['mixed','easy','medium','hard'];
const MODES = [
  { value:'full_test',    label:'Full Test',     desc:'Complete exam simulation' },
  { value:'subject_test', label:'Subject Test',  desc:'Focus on one subject' },
  { value:'chapter_test', label:'Chapter Test',  desc:'Drill one chapter' },
  { value:'quick',        label:'Quick Test',    desc:'10 questions, 15 mins' },
];

export default function StartTest() {
  const navigate = useNavigate();
  const [exams,     setExams]     = useState([]);
  const [subjects,  setSubjects]  = useState([]);
  const [chapters,  setChapters]  = useState([]);
  const [form, setForm] = useState({
    exam_type: '', mode: 'subject_test', subject: '',
    chapter: '', difficulty: 'mixed', num_questions: 20, duration_mins: 30
  });
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    listExams().then(r => setExams(r.data));
  }, []);

  useEffect(() => {
    if (!form.exam_type) return;
    setSubjects([]); setChapters([]);
    setForm(f => ({ ...f, subject: '', chapter: '' }));
    getSubjects(form.exam_type).then(r => setSubjects(r.data.subjects || []));
    // Set defaults from exam config
    const ex = exams.find(e => e.exam_type === form.exam_type);
    if (ex) setForm(f => ({ ...f, num_questions: Math.min(20, ex.total_questions), duration_mins: Math.round(ex.duration_mins / 3) }));
  }, [form.exam_type]);

  useEffect(() => {
    if (!form.exam_type || !form.subject) return;
    setChapters([]);
    setForm(f => ({ ...f, chapter: '' }));
    getChapters(form.exam_type, form.subject).then(r => setChapters(r.data.chapters || []));
  }, [form.subject]);

  const set = k => e => setForm(f => ({ ...f, [k]: e.target.value }));

  const submit = async e => {
    e.preventDefault();
    if (!form.exam_type) return setError('Please select an exam');
    setError(''); setGenerating(true);
    try {
      const payload = {
        exam_type:     form.exam_type,
        mode:          form.mode,
        difficulty:    form.difficulty,
        num_questions: parseInt(form.num_questions),
        duration_mins: parseInt(form.duration_mins),
        subject:       form.subject || undefined,
        chapter:       form.chapter || undefined,
      };
      if (form.mode === 'quick') { payload.num_questions = 10; payload.duration_mins = 15; }
      const { data } = await startTest(payload);
      navigate(`/test/${data.id}`);
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to generate test. Try again.');
    } finally { setGenerating(false); }
  };

  return (
    <div className="container page">
      <h1 className="section-title">New Mock Test</h1>
      <p style={{ color: 'var(--text2)', marginBottom: 28 }}>AI generates fresh questions every session</p>

      {error && <div className="alert alert-error">{error}</div>}
      {generating && (
        <div className="alert alert-info" style={{ textAlign: 'center' }}>
          ✨ AI is generating your personalised test... This takes 5–10 seconds
        </div>
      )}

      <form onSubmit={submit}>
        <div className="grid-2" style={{ gap: 24 }}>
          <div>
            {/* Exam */}
            <div className="form-group">
              <label className="form-label">Exam</label>
              <select className="form-select" value={form.exam_type} onChange={set('exam_type')} required>
                <option value="">Select exam</option>
                {exams.map(e => <option key={e.exam_type} value={e.exam_type}>{e.full_name}</option>)}
              </select>
            </div>

            {/* Mode */}
            <div className="form-group">
              <label className="form-label">Test Mode</label>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                {MODES.map(m => (
                  <div key={m.value}
                    onClick={() => setForm(f => ({ ...f, mode: m.value }))}
                    style={{
                      padding: '10px 14px', borderRadius: 8, cursor: 'pointer',
                      border: `1px solid ${form.mode === m.value ? 'var(--accent)' : 'var(--border)'}`,
                      background: form.mode === m.value ? '#0c1a3a' : 'var(--bg3)'
                    }}>
                    <div style={{ fontWeight: 500, fontSize: 13 }}>{m.label}</div>
                    <div style={{ fontSize: 11, color: 'var(--text2)' }}>{m.desc}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Subject */}
            {subjects.length > 0 && form.mode !== 'full_test' && form.mode !== 'quick' && (
              <div className="form-group">
                <label className="form-label">Subject</label>
                <select className="form-select" value={form.subject} onChange={set('subject')}>
                  <option value="">All subjects</option>
                  {subjects.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
            )}

            {/* Chapter */}
            {chapters.length > 0 && form.mode === 'chapter_test' && (
              <div className="form-group">
                <label className="form-label">Chapter</label>
                <select className="form-select" value={form.chapter} onChange={set('chapter')}>
                  <option value="">All chapters</option>
                  {chapters.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
            )}
          </div>

          <div>
            {/* Difficulty */}
            <div className="form-group">
              <label className="form-label">Difficulty</label>
              <div style={{ display: 'flex', gap: 8 }}>
                {DIFFICULTIES.map(d => (
                  <button key={d} type="button"
                    onClick={() => setForm(f => ({ ...f, difficulty: d }))}
                    className={`btn btn-sm ${form.difficulty === d ? 'btn-primary' : 'btn-secondary'}`}
                    style={{ flex: 1, textTransform: 'capitalize' }}>
                    {d}
                  </button>
                ))}
              </div>
            </div>

            {/* Questions */}
            {form.mode !== 'quick' && (
              <>
                <div className="form-group">
                  <label className="form-label">Number of Questions: <strong>{form.num_questions}</strong></label>
                  <input type="range" min={5} max={50} step={5}
                    value={form.num_questions}
                    onChange={set('num_questions')}
                    style={{ width: '100%', accentColor: 'var(--accent)' }} />
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--text3)' }}>
                    <span>5</span><span>50</span>
                  </div>
                </div>
                <div className="form-group">
                  <label className="form-label">Duration: <strong>{form.duration_mins} mins</strong></label>
                  <input type="range" min={10} max={180} step={10}
                    value={form.duration_mins}
                    onChange={set('duration_mins')}
                    style={{ width: '100%', accentColor: 'var(--accent)' }} />
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--text3)' }}>
                    <span>10m</span><span>3h</span>
                  </div>
                </div>
              </>
            )}

            {/* Exam info */}
            {form.exam_type && exams.find(e => e.exam_type === form.exam_type) && (
              <div className="card" style={{ padding: 14, marginTop: 8, background: 'var(--bg3)' }}>
                <div style={{ fontSize: 12, color: 'var(--text2)', lineHeight: 1.8 }}>
                  {(() => {
                    const ex = exams.find(e => e.exam_type === form.exam_type);
                    return <>
                      <div>📋 Real exam: <strong>{ex.total_questions} Qs / {ex.duration_mins} mins</strong></div>
                      <div>📚 Subjects: {ex.subjects.join(', ')}</div>
                    </>;
                  })()}
                </div>
              </div>
            )}
          </div>
        </div>

        <button type="submit" className="btn btn-primary btn-lg" disabled={generating || !form.exam_type}
          style={{ marginTop: 16 }}>
          {generating ? '⏳ Generating test...' : '🚀 Start Test'}
        </button>
      </form>
    </div>
  );
}
