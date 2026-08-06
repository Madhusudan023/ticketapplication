import React, { useState, useEffect, useCallback } from 'react';
import {
  ThemeProvider, createTheme, CssBaseline,
  Container, Box, Snackbar, Alert, GlobalStyles, Typography, Tab, Tabs,
} from '@mui/material';
import DashboardIcon          from '@mui/icons-material/Dashboard';
import FormatListBulletedIcon from '@mui/icons-material/FormatListBulleted';
import AdminPanelSettingsIcon from '@mui/icons-material/AdminPanelSettings';
import AddCircleOutlineIcon   from '@mui/icons-material/AddCircleOutline';

import Navbar           from './components/Navbar';
import KpiDashboard     from './components/KpiDashboard';
import CreateTicketForm from './components/CreateTicketForm';
import TicketQueue      from './components/TicketQueue';
import AdminPanel       from './components/AdminPanel';
import LoginPage        from './pages/LoginPage';

import { AuthProvider, useAuth } from './context/AuthContext';
import { ApiService }            from './services/api';

// ── Light Theme ────────────────────────────────────────────────────────────────
const lightTheme = createTheme({
  palette: {
    mode: 'light',
    background: { default: '#f4f7f6', paper: '#ffffff' },
    primary:    { main: '#3b82f6' },
    secondary:  { main: '#8b5cf6' },
    text:       { primary: '#0f172a', secondary: '#475569' },
  },
  typography: {
    fontFamily: '"Inter", "Roboto", "Helvetica Neue", sans-serif',
    h6: { fontWeight: 700 },
  },
  components: {
    MuiCard:    { styleOverrides: { root: { backgroundImage: 'none' } } },
    MuiDivider: { styleOverrides: { root: { borderColor: 'rgba(15,23,42,0.1)' } } },
  },
});

const globalStyles = {
  body: {
    background: '#f4f7f6',
    minHeight: '100vh',
    color: '#0f172a',
  },
  '*::-webkit-scrollbar':       { width: '6px' },
  '*::-webkit-scrollbar-track': { background: 'rgba(0,0,0,0.05)' },
  '*::-webkit-scrollbar-thumb': { background: 'rgba(59,130,246,0.3)', borderRadius: '3px' },
  '*::-webkit-scrollbar-thumb:hover': { background: 'rgba(59,130,246,0.5)' },
};

// ── Main App Content (shown when logged in) ───────────────────────────────────
function MainContent() {
  const { user, isAdmin, isAgent, isUser } = useAuth();
  const [activeTab, setActiveTab] = useState(0);
  const [stats,     setStats]     = useState(null);
  const [tickets,   setTickets]   = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [toast,     setToast]     = useState({ open: false, message: '', severity: 'success' });

  const showToast = useCallback((message, severity = 'success') =>
    setToast({ open: true, message, severity }), []);

  const loadData = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const [dashRes, tickRes] = await Promise.allSettled([
        ApiService.getDashboardSummary(),
        ApiService.getTickets(),
      ]);

      if (dashRes.status === 'fulfilled' && dashRes.value?.success) {
        setStats(dashRes.value.data);
      }

      if (tickRes.status === 'fulfilled' && tickRes.value?.success) {
        setTickets(Array.isArray(tickRes.value.data) ? tickRes.value.data : []);
      }
    } catch (e) {
      console.error('Data load error:', e);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => { loadData(); }, [loadData]);

  // Build tabs per role
  // ADMIN:  Dashboard | Ticket Queue | Admin Panel
  // AGENT:  Dashboard | My Assigned Tickets
  // USER:   Dashboard | Create Ticket | My Tickets
  const tabs = isAdmin
    ? [
        { icon: <DashboardIcon sx={{ fontSize: '1rem' }} />, label: 'Dashboard' },
        { icon: <FormatListBulletedIcon sx={{ fontSize: '1rem' }} />, label: 'All Tickets' },
        { icon: <AdminPanelSettingsIcon sx={{ fontSize: '1rem' }} />, label: 'Admin Panel' },
      ]
    : isAgent
    ? [
        { icon: <DashboardIcon sx={{ fontSize: '1rem' }} />, label: 'Dashboard' },
        { icon: <FormatListBulletedIcon sx={{ fontSize: '1rem' }} />, label: 'Assigned Tickets' },
      ]
    : [
        { icon: <DashboardIcon sx={{ fontSize: '1rem' }} />, label: 'Dashboard' },
        { icon: <AddCircleOutlineIcon sx={{ fontSize: '1rem' }} />, label: 'Create Ticket' },
        { icon: <FormatListBulletedIcon sx={{ fontSize: '1rem' }} />, label: 'My Tickets' },
      ];

  return (
    <>
      <Navbar onRefresh={loadData} />

      {/* White Secondary Nav Bar */}
      <Box sx={{ bgcolor: '#ffffff', width: '100%', borderBottom: '1px solid #e2e8f0', mb: 3, boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }}>
        <Container maxWidth="xl">
          <Tabs
            value={activeTab}
            onChange={(_, v) => setActiveTab(v)}
            sx={{
              minHeight: 64,
              '& .MuiTab-root': {
                color: '#475569', fontWeight: 600, textTransform: 'none', fontSize: '1.05rem',
                minHeight: 64, mr: 3, px: 1,
                '&:hover': { color: '#0f172a', bgcolor: 'rgba(15,23,42,0.04)' },
              },
              '& .Mui-selected':      { color: '#000000 !important' },
              '& .MuiTabs-indicator': { bgcolor: '#ef4444', height: '4px', borderRadius: '4px 4px 0 0' },
            }}
          >
            {tabs.map((t, i) => (
              <Tab key={i} label={t.label} id={`main-tab-${i}`} disableRipple />
            ))}
          </Tabs>
        </Container>
      </Box>

      <Container maxWidth="xl" sx={{ pb: 8 }}>

        {/* ── ADMIN TABS ────────────────────────────────────────────────────── */}
        {isAdmin && (
          <>
            {activeTab === 0 && <KpiDashboard stats={stats} loading={loading} />}

            {activeTab === 1 && (
              <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', lg: '400px 1fr' }, gap: 3, alignItems: 'start' }}>
                <Box sx={{ position: { lg: 'sticky' }, top: { lg: 80 } }}>
                  <CreateTicketForm onTicketCreated={loadData} onToast={showToast} />
                </Box>
                <TicketQueue tickets={tickets} loading={loading} onRefresh={loadData} onToast={showToast} />
              </Box>
            )}

            {activeTab === 2 && (
              <AdminPanel onToast={showToast} />
            )}
          </>
        )}

        {/* ── AGENT TABS ────────────────────────────────────────────────────── */}
        {isAgent && (
          <>
            {activeTab === 0 && <KpiDashboard stats={stats} loading={loading} />}
            {activeTab === 1 && (
              <TicketQueue tickets={tickets} loading={loading} onRefresh={loadData} onToast={showToast} />
            )}
          </>
        )}

        {/* ── USER TABS ─────────────────────────────────────────────────────── */}
        {isUser && (
          <>
            {activeTab === 0 && <KpiDashboard stats={stats} loading={loading} />}
            {activeTab === 1 && (
              <CreateTicketForm onTicketCreated={() => { loadData(); setActiveTab(2); }} onToast={showToast} />
            )}
            {activeTab === 2 && (
              <TicketQueue tickets={tickets} loading={loading} onRefresh={loadData} onToast={showToast} />
            )}
          </>
        )}

      </Container>

      {/* Toast */}
      <Snackbar
        open={toast.open}
        autoHideDuration={4000}
        onClose={() => setToast(t => ({ ...t, open: false }))}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert
          onClose={() => setToast(t => ({ ...t, open: false }))}
          severity={toast.severity}
          variant="filled"
          sx={{ borderRadius: 2, fontWeight: 500 }}
        >
          {toast.message}
        </Alert>
      </Snackbar>
    </>
  );
}

// ── Root App ──────────────────────────────────────────────────────────────────
function AppRouter() {
  const { user } = useAuth();
  return user ? <MainContent /> : <LoginPage />;
}

export default function App() {
  return (
    <ThemeProvider theme={lightTheme}>
      <CssBaseline />
      <GlobalStyles styles={globalStyles} />
      <AuthProvider>
        <AppRouter />
      </AuthProvider>
    </ThemeProvider>
  );
}
