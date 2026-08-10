import React, { useState } from 'react';
import { AppBar, Toolbar, Box, Typography, Chip, IconButton, Menu, MenuItem } from '@mui/material';
import ConfirmationNumberOutlinedIcon from '@mui/icons-material/ConfirmationNumberOutlined';
import PersonOutlineIcon from '@mui/icons-material/PersonOutline';
import { useAuth } from '../context/AuthContext';

export default function Navbar() {
  const { user, logout } = useAuth();
  const [anchorEl, setAnchorEl] = useState(null);

  const handleMenuOpen = (event) => setAnchorEl(event.currentTarget);
  const handleMenuClose = () => setAnchorEl(null);
  const handleLogout = () => {
    handleMenuClose();
    logout();
  };

  const roleColors = {
    ADMIN: { bg: 'rgba(239,68,68,0.15)', color: '#f87171', border: 'rgba(239,68,68,0.3)' },
    AGENT: { bg: 'rgba(245,158,11,0.15)', color: '#fbbf24', border: 'rgba(245,158,11,0.3)' },
    USER:  { bg: 'rgba(16,185,129,0.15)', color: '#34d399', border: 'rgba(16,185,129,0.3)' },
  };

  const rc = roleColors[user?.role] || roleColors.USER;

  return (
    <AppBar
      position="sticky"
      elevation={0}
      sx={{
        background: '#0a0a0a',
        borderBottom: '1px solid rgba(255,255,255,0.05)',
      }}
    >
      <Toolbar sx={{ justifyContent: 'space-between', minHeight: '32px !important', px: 3 }}>
        {/* Brand */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Box
            sx={{
              background: 'linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%)',
              borderRadius: 1.5,
              p: 0.4,
              display: 'flex',
              boxShadow: '0 2px 8px rgba(59,130,246,0.3)',
            }}
          >
            <ConfirmationNumberOutlinedIcon sx={{ color: 'white', fontSize: '1.2rem' }} />
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <Typography variant="h6" sx={{ fontWeight: 800, color: '#f8fafc', lineHeight: 1, letterSpacing: '-0.5px', fontSize: '1.1rem' }}>
              Ticket<span style={{ color: '#3b82f6' }}>Desk</span>
            </Typography>
            <Typography variant="caption" sx={{ color: '#64748b', letterSpacing: '1px', textTransform: 'uppercase', fontSize: '0.7rem' }}>
              Enterprise Edition
            </Typography>
          </Box>
        </Box>

        {/* User Actions */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 3 }}>
          {user && (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <Box sx={{ display: { xs: 'none', sm: 'flex' }, alignItems: 'center', gap: 1.5 }}>
                <Typography variant="body2" sx={{ fontWeight: 700, color: '#f1f5f9', lineHeight: 1, fontSize: '0.85rem' }}>
                  {user.name}
                </Typography>
                <Chip
                  label={user.role}
                  size="small"
                  sx={{
                    bgcolor: rc.bg, color: rc.color, border: `1px solid ${rc.border}`,
                    fontWeight: 700, fontSize: '0.65rem', height: 20,
                  }}
                />
              </Box>

              <IconButton onClick={handleMenuOpen} size="small" sx={{ color: '#f8fafc', '&:hover': { bgcolor: 'rgba(255,255,255,0.1)' } }}>
                <PersonOutlineIcon sx={{ fontSize: '1.4rem' }} />
              </IconButton>

              <Menu
                anchorEl={anchorEl}
                open={Boolean(anchorEl)}
                onClose={handleMenuClose}
                PaperProps={{
                  sx: {
                    mt: 1,
                    bgcolor: '#ffffff',
                    color: '#0f172a',
                    border: '1px solid #e2e8f0',
                    minWidth: '120px'
                  }
                }}
              >
                <MenuItem onClick={handleLogout} sx={{ fontSize: '0.85rem', '&:hover': { bgcolor: '#f1f5f9' } }}>
                  Logout
                </MenuItem>
              </Menu>
            </Box>
          )}
        </Box>
      </Toolbar>
    </AppBar>
  );
}
