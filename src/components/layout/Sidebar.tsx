import { NavLink } from 'react-router-dom';
import {
    LayoutDashboard,
    Dumbbell,
    ClipboardList,
    Play,
    History,
    TrendingUp,
    Link,
    LogOut,
    Flame,
    ChevronLeft,
    ChevronRight,
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useState } from 'react';
import './Sidebar.css';

const navItems = [
    { to: '/', icon: LayoutDashboard, label: 'Dashboard' },
    { to: '/exercises', icon: Dumbbell, label: 'Exercises' },
    { to: '/templates', icon: ClipboardList, label: 'Templates' },
    { to: '/workout', icon: Play, label: 'Workout' },
    { to: '/history', icon: History, label: 'History' },
    { to: '/progress', icon: TrendingUp, label: 'Progress' },
    { to: '/import', icon: Link, label: 'Import Workout' },
];

export default function Sidebar() {
    const { user, signOut } = useAuth();
    const [collapsed, setCollapsed] = useState(false);


    return (
        <aside className={`sidebar ${collapsed ? 'collapsed' : ''}`}>
            <div className="sidebar-header">
                <div className="sidebar-logo">
                    <div className="logo-icon">
                        <Flame size={24} />
                    </div>
                    {!collapsed && <span className="logo-text">Chud2Chad</span>}
                </div>
                <button
                    className="btn btn-ghost btn-icon collapse-btn"
                    onClick={() => setCollapsed(!collapsed)}
                >
                    {collapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
                </button>
            </div>

            <nav className="sidebar-nav">
                {navItems.map(item => (
                    <NavLink
                        key={item.to}
                        to={item.to}
                        className={({ isActive }) =>
                            `nav-item ${isActive ? 'active' : ''}`
                        }
                        end={item.to === '/'}
                    >
                        <item.icon size={20} />
                        {!collapsed && <span>{item.label}</span>}
                    </NavLink>
                ))}
            </nav>

            <div className="sidebar-footer">
                {!collapsed && user && (
                    <div className="user-info">
                        <div className="user-avatar">
                            {user.email?.[0]?.toUpperCase() || 'U'}
                        </div>
                        <div className="user-details">
                            <span className="user-name">{user.user_metadata?.display_name || user.email?.split('@')[0]}</span>
                            <span className="user-email">{user.email}</span>
                        </div>
                    </div>
                )}
                <button className="btn btn-ghost nav-item" onClick={signOut}>
                    <LogOut size={20} />
                    {!collapsed && <span>Sign Out</span>}
                </button>
            </div>
        </aside>
    );
}
