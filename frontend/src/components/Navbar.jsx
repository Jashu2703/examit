import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Navbar() {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const active = path => location.pathname === path ? 'nav-link active' : 'nav-link';

  const handleLogout = () => { logout(); navigate('/login'); };

  return (
    <nav className="nav">
      <Link to="/" className="nav-logo">Exam<span>It</span></Link>
      {user ? (
        <div className="nav-links">
          <Link to="/dashboard" className={active('/dashboard')}>Dashboard</Link>
          <Link to="/start"     className={active('/start')}>New Test</Link>
          <Link to="/leaderboard" className={active('/leaderboard')}>Leaderboard</Link>
          <button onClick={handleLogout} className="btn btn-secondary btn-sm">Logout</button>
        </div>
      ) : (
        <div className="nav-links">
          <Link to="/login"    className="btn btn-secondary btn-sm">Login</Link>
          <Link to="/register" className="btn btn-primary btn-sm">Sign Up Free</Link>
        </div>
      )}
    </nav>
  );
}
