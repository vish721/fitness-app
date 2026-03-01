import { NavLink, useLocation } from 'react-router-dom';
import {
    LayoutDashboard,
    Dumbbell,
    ClipboardList,
    Play,
    History,
    Users,
    TrendingUp,
    Link,
    LogOut,
    Flame,
    ChevronLeft,
    ChevronRight,
    Menu,
    X,
    Sun,
    Moon,
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';
import { useState, useEffect } from 'react';
import './Sidebar.css';

const navItems = [
    { to: '/', icon: LayoutDashboard, label: 'Dashboard' },
    { to: '/exercises', icon: Dumbbell, label: 'Exercises' },
    { to: '/templates', icon: ClipboardList, label: 'Templates' },
    { to: '/workout', icon: Play, label: 'Workout' },
    { to: '/history', icon: History, label: 'History' },
    { to: '/progress', icon: TrendingUp, label: 'Progress' },
    { to: '/import', icon: Link, label: 'Import' },
    { to: '/social', icon: Users, label: 'Social' },
];

// Bottom nav shows these items (most used)
const bottomNavItems = [
    { to: '/', icon: LayoutDashboard, label: 'Home' },
    { to: '/workout', icon: Play, label: 'Workout' },
    { to: '/exercises', icon: Dumbbell, label: 'Exercises' },
    { to: '/history', icon: History, label: 'History' },
    { to: '/progress', icon: TrendingUp, label: 'Progress' },
    { to: '/social', icon: Users, label: 'Social' },
];

export default function Sidebar() {
    const { user, profile, signOut } = useAuth();
    const { theme, toggleTheme } = useTheme();
    const [collapsed, setCollapsed] = useState(false);
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
    const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);
    const location = useLocation();

    useEffect(() => {
        const handleResize = () => setIsMobile(window.innerWidth <= 768);
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    // Close mobile menu on route change
    useEffect(() => {
        setMobileMenuOpen(false);
    }, [location.pathname]);

    // Mobile layout: bottom nav + slide-out drawer for more items
    if (isMobile) {
        return (
            <>
                {/* Mobile Top Header */}
                <header className="mobile-header">
                    <div className="mobile-header-logo">
                        <div className="logo-icon logo-icon-sm">
                            <Flame size={18} />
                        </div>
                        <span className="logo-text logo-text-sm">Chud2Chad</span>
                    </div>
                    <div className="flex items-center gap-sm">
                        <button
                            className="btn btn-ghost btn-icon theme-toggle-btn"
                            onClick={toggleTheme}
                            aria-label="Toggle theme"
                        >
                            {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
                        </button>
                        <button
                            className="btn btn-ghost btn-icon mobile-menu-btn"
                            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                            aria-label="Menu"
                        >
                            {mobileMenuOpen ? <X size={22} /> : <Menu size={22} />}
                        </button>
                    </div>
                </header>

                {/* Mobile Drawer Overlay */}
                {mobileMenuOpen && (
                    <div className="mobile-drawer-overlay" onClick={() => setMobileMenuOpen(false)}>
                        <div className="mobile-drawer" onClick={e => e.stopPropagation()}>
                            <div className="mobile-drawer-header">
                                <div className="sidebar-logo">
                                    <div className="logo-icon">
                                        <Flame size={24} />
                                    </div>
                                    <span className="logo-text">Chud2Chad</span>
                                </div>
                                <button className="btn btn-ghost btn-icon" onClick={() => setMobileMenuOpen(false)}>
                                    <X size={20} />
                                </button>
                            </div>
                            <nav className="mobile-drawer-nav">
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
                                        <span>{item.label}</span>
                                    </NavLink>
                                ))}
                            </nav>
                            <div className="mobile-drawer-footer">
                                {user && (
                                    <div className="user-info">
                                        <div className="user-avatar">
                                            {user.email?.[0]?.toUpperCase() || 'U'}
                                        </div>
                                        <div className="user-details">
                                            <span className="user-name">{profile?.display_name || user.user_metadata?.display_name || user.email?.split('@')[0]}</span>
                                            {profile?.username && <span className="user-username">@{profile.username}</span>}
                                            <span className="user-email">{user.email}</span>
                                        </div>
                                    </div>
                                )}
                                <button className="btn btn-ghost nav-item" onClick={signOut}>
                                    <LogOut size={20} />
                                    <span>Sign Out</span>
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* Bottom Navigation Bar */}
                <nav className="mobile-bottom-nav">
                    {bottomNavItems.map(item => (
                        <NavLink
                            key={item.to}
                            to={item.to}
                            className={({ isActive }) =>
                                `bottom-nav-item ${isActive ? 'active' : ''}`
                            }
                            end={item.to === '/'}
                        >
                            <item.icon size={20} />
                            <span>{item.label}</span>
                        </NavLink>
                    ))}
                </nav>
            </>
        );
    }

    // Desktop layout: classic sidebar
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
                {/* Theme Toggle */}
                <button
                    className="btn btn-ghost nav-item theme-toggle-btn"
                    onClick={toggleTheme}
                    title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
                >
                    {theme === 'dark' ? <Sun size={20} /> : <Moon size={20} />}
                    {!collapsed && <span>{theme === 'dark' ? 'Light Mode' : 'Dark Mode'}</span>}
                </button>

                {!collapsed && user && (
                    <div className="user-info">
                        <div className="user-avatar">
                            {user.email?.[0]?.toUpperCase() || 'U'}
                        </div>
                        <div className="user-details">
                            <span className="user-name">{profile?.display_name || user.user_metadata?.display_name || user.email?.split('@')[0]}</span>
                            {profile?.username && <span className="user-username">@{profile.username}</span>}
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
