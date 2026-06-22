import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const EXAMS = ['JEE','NEET','CAT','GATE','SSC','UPSC','IBPS'];

export default function Register() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ email:'', username:'', password:'', full_name:'', target_exam:'' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async e => {
    e.preventDefault();
    setError(''); setLoading(true);
    try {
      await register({ ...form, target_exam: form.target_exam || undefined });
      navigate('/dashboard');
    } catch (err) {
      setError(err.response?.data?.detail || 'Registration failed');
    } finally { setLoading(false); }
  };

  const set = k => e => setForm({...form, [k]: e.target.value});

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px 0' }}>
      <div className="card" style={{ width: '100%', maxWidth: 440 }}>
        <h2 style={{ marginBottom: 6 }}>Create your account</h2>
        <p style={{ color: 'var(--text2)', marginBottom: 24 }}>Start your exam prep today — free</p>
        {error && <div className="alert alert-error">{error}</div>}
        <form onSubmit={submit}>
          <div className="form-group">
            <label className="form-label">Full Name</label>
            <input className="form-input" value={form.full_name} onChange={set('full_name')} placeholder="Optional" />
          </div>
          <div className="form-group">
            <label className="form-label">Email</label>
            <input className="form-input" type="email" required value={form.email} onChange={set('email')} />
          </div>
          <div className="form-group">
            <label className="form-label">Username</label>
            <input className="form-input" required value={form.username} onChange={set('username')} placeholder="Shown on leaderboard" />
          </div>
          <div className="form-group">
            <label className="form-label">Password</label>
            <input className="form-input" type="password" required minLength={6} value={form.password} onChange={set('password')} />
          </div>
          <div className="form-group">
            <label className="form-label">Target Exam (optional)</label>
            <select className="form-select" value={form.target_exam} onChange={set('target_exam')}>
              <option value="">Select exam</option>
              {EXAMS.map(e => <option key={e} value={e}>{e}</option>)}
            </select>
          </div>
          <button className="btn btn-primary btn-full" type="submit" disabled={loading}>
            {loading ? 'Creating account...' : 'Create Account'}
          </button>
        </form>
        <p style={{ marginTop: 16, textAlign: 'center', color: 'var(--text2)', fontSize: 13 }}>
          Already have an account? <Link to="/login">Login</Link>
        </p>
      </div>
    </div>
  );
}
