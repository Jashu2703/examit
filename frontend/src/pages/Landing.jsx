import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const EXAMS = [
  { name:'JEE',  icon:'⚗️', desc:'Mains + Advanced' },
  { name:'NEET', icon:'🧬', desc:'UG Medical' },
  { name:'CAT',  icon:'📊', desc:'MBA Entrance' },
  { name:'GATE', icon:'💻', desc:'CS / ECE / ME' },
  { name:'SSC',  icon:'🏛️', desc:'CGL + CHSL' },
  { name:'UPSC', icon:'📜', desc:'Civil Services' },
  { name:'IBPS', icon:'🏦', desc:'PO + Clerk' },
];

const FEATURES = [
  { icon:'✨', title:'AI-Generated Questions', desc:'Fresh questions every session — never the same test twice. Powered by Llama 3.1 via OpenRouter.' },
  { icon:'🤖', title:'AI Coach', desc:'Post-test analysis tells you exactly which topics to study and gives a personalised 7-day plan.' },
  { icon:'📈', title:'Progress Dashboard', desc:'Track scores over time, spot trends, and watch your weak topics shrink.' },
  { icon:'🏆', title:'Live Leaderboard', desc:'See where you rank vs other aspirants for your exam — weekly and all-time.' },
  { icon:'💡', title:'Solution Explanations', desc:'AI explains every wrong answer with shortcuts and tricks after you submit.' },
  { icon:'🔥', title:'Daily Streak', desc:'Build a study habit. Your streak keeps you accountable.' },
];

export default function Landing() {
  const { user } = useAuth();

  return (
    <div>
      {/* Hero */}
      <div style={{ textAlign:'center', padding:'80px 24px 60px', maxWidth:700, margin:'0 auto' }}>
        <div className="badge badge-blue" style={{ marginBottom:16, fontSize:13 }}>
          🇮🇳 Built for Indian competitive exams
        </div>
        <h1 style={{ fontSize:48, fontWeight:800, lineHeight:1.15, marginBottom:20 }}>
          Mock tests that actually<br/>
          <span style={{ color:'var(--accent)' }}>prepare you to crack it</span>
        </h1>
        <p style={{ fontSize:18, color:'var(--text2)', lineHeight:1.7, marginBottom:36 }}>
          AI generates fresh questions every session from the real syllabus.
          Get personalised feedback, track progress, and compete on the leaderboard.
        </p>
        <div style={{ display:'flex', gap:12, justifyContent:'center', flexWrap:'wrap' }}>
          {user
            ? <Link to="/start" className="btn btn-primary btn-lg">🚀 Start a Test</Link>
            : <>
                <Link to="/register" className="btn btn-primary btn-lg">Get Started Free</Link>
                <Link to="/login"    className="btn btn-secondary btn-lg">Login</Link>
              </>
          }
        </div>
        <p style={{ fontSize:12, color:'var(--text3)', marginTop:16 }}>Free · No credit card · All 7 major exams</p>
      </div>

      {/* Exams */}
      <div style={{ background:'var(--bg2)', borderTop:'1px solid var(--border)', borderBottom:'1px solid var(--border)', padding:'40px 24px' }}>
        <div className="container">
          <h2 style={{ textAlign:'center', marginBottom:28, fontSize:20 }}>7 major exams, one platform</h2>
          <div style={{ display:'flex', gap:12, justifyContent:'center', flexWrap:'wrap' }}>
            {EXAMS.map(e => (
              <div key={e.name} className="card" style={{ textAlign:'center', padding:'20px 28px', minWidth:110 }}>
                <div style={{ fontSize:28, marginBottom:6 }}>{e.icon}</div>
                <div style={{ fontWeight:700, fontSize:16 }}>{e.name}</div>
                <div style={{ fontSize:11, color:'var(--text2)', marginTop:2 }}>{e.desc}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Features */}
      <div className="container" style={{ padding:'60px 24px' }}>
        <h2 style={{ textAlign:'center', marginBottom:8, fontSize:24 }}>Everything you need to crack your exam</h2>
        <p style={{ textAlign:'center', color:'var(--text2)', marginBottom:40 }}>Not just another question bank</p>
        <div className="grid-3">
          {FEATURES.map(f => (
            <div key={f.title} className="card">
              <div style={{ fontSize:28, marginBottom:12 }}>{f.icon}</div>
              <h3 style={{ fontSize:15, fontWeight:600, marginBottom:8 }}>{f.title}</h3>
              <p style={{ fontSize:13, color:'var(--text2)', lineHeight:1.7 }}>{f.desc}</p>
            </div>
          ))}
        </div>
      </div>

      {/* CTA */}
      <div style={{ background:'var(--bg2)', borderTop:'1px solid var(--border)', padding:'60px 24px', textAlign:'center' }}>
        <h2 style={{ fontSize:28, marginBottom:12 }}>Start your prep today</h2>
        <p style={{ color:'var(--text2)', marginBottom:28 }}>Free. No signup friction. First test in 30 seconds.</p>
        {!user && <Link to="/register" className="btn btn-primary btn-lg">Create Free Account</Link>}
        {user  && <Link to="/start"    className="btn btn-primary btn-lg">🚀 Start a Test</Link>}
      </div>
    </div>
  );
}
