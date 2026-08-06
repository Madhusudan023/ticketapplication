import React, { useState, useEffect, useCallback } from 'react';
import {
  Box, Card, CardContent, Typography, TextField, Button,
  Divider, Chip, Avatar, IconButton, Tooltip, CircularProgress,
  Alert, Skeleton, Tab, Tabs, InputAdornment,
} from '@mui/material';
import { useFormik } from 'formik';
import * as Yup from 'yup';

// Google Material Icons
import AdminPanelSettingsIcon from '@mui/icons-material/AdminPanelSettings';
import PersonAddAlt1Icon from '@mui/icons-material/PersonAddAlt1';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import GroupIcon from '@mui/icons-material/Group';
import EngineeringIcon from '@mui/icons-material/Engineering';
import PersonOutlineIcon from '@mui/icons-material/PersonOutline';
import EmailOutlinedIcon from '@mui/icons-material/EmailOutlined';
import VisibilityIcon from '@mui/icons-material/Visibility';
import VisibilityOffIcon from '@mui/icons-material/VisibilityOff';
import SecurityIcon from '@mui/icons-material/Security';
import SupportAgentIcon from '@mui/icons-material/SupportAgent';
import PersonIcon from '@mui/icons-material/Person';
import AddIcon from '@mui/icons-material/Add';
import PeopleAltIcon from '@mui/icons-material/PeopleAlt';

import { ApiService } from '../services/api';

// Premium Input Styling
const inputSx = {
  mb: 2.5,
  '& .MuiOutlinedInput-root': {
    color: '#111827',
    backgroundColor: '#FAFAFA',
    borderRadius: '12px',
    transition: 'all 0.2s ease-in-out',
    fontSize: '0.9rem',
    '& fieldset': { borderColor: '#E5E7EB', borderWidth: '1px' },
    '&:hover fieldset': { borderColor: '#D1D5DB' },
    '&.Mui-focused': { backgroundColor: '#FFFFFF' },
    '&.Mui-focused fieldset': { borderColor: '#111827', borderWidth: '1px' },
  },
  '& .MuiInputLabel-root': { color: '#6B7280', fontSize: '0.9rem' },
  '& .MuiInputLabel-root.Mui-focused': { color: '#111827', fontWeight: 500 },
  '& .MuiFormHelperText-root': { color: '#EF4444', marginLeft: '4px' },
};

const ROLE_CONFIG = {
  ADMIN: { color: '#EF4444', bg: '#FEF2F2', border: '#FCA5A5', icon: <SecurityIcon fontSize="small" sx={{ color: '#EF4444' }} /> },
  AGENT: { color: '#F59E0B', bg: '#FFFBEB', border: '#FDE68A', icon: <SupportAgentIcon fontSize="small" sx={{ color: '#F59E0B' }} /> },
  USER:  { color: '#10B981', bg: '#ECFDF5', border: '#A7F3D0', icon: <PersonIcon fontSize="small" sx={{ color: '#10B981' }} /> },
};

// ── Create Agent Form ─────────────────────────────────────────────────────────
function CreateAgentForm({ onSuccess, onToast }) {
  const [showPw, setShowPw] = useState(false);

  const formik = useFormik({
    initialValues: { name: '', email: '', password: '' },
    validationSchema: Yup.object({
      name:     Yup.string().trim().min(2, 'Min 2 characters').max(60).required('Name is required'),
      email:    Yup.string().email('Enter a valid email').required('Email is required'),
      password: Yup.string().min(6, 'Min 6 characters').required('Password is required'),
    }),
    validateOnBlur: true,
    validateOnChange: false,
    onSubmit: async (values, { resetForm, setSubmitting }) => {
      try {
        const res = await ApiService.createAgent(values.name.trim(), values.email.trim(), values.password);
        if (res.success) {
          onToast(`Agent "${values.name}" created successfully`, 'success');
          resetForm();
          onSuccess();
        } else {
          onToast(res.message || 'Failed to create agent', 'error');
        }
      } catch (e) {
        const msg = e?.response?.data?.message;
        if (e?.response?.status === 409) onToast('Email already registered', 'error');
        else if (e?.response?.status === 403) onToast('Only Admin can create agents', 'error');
        else onToast(msg || 'Failed to create agent — check connection', 'error');
      } finally {
        setSubmitting(false);
      }
    },
  });

  return (
    <Box component="form" onSubmit={formik.handleSubmit} noValidate>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 4, p: 2.5, bgcolor: '#F9FAFB', borderRadius: '16px', border: '1px solid #F3F4F6' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 44, height: 44, bgcolor: '#FFFFFF', borderRadius: '12px' }}>
          <EngineeringIcon sx={{ color: '#111827', fontSize: '1.4rem' }} />
        </Box>
        <Box>
          <Typography variant="body1" sx={{ fontWeight: 700, color: '#111827', mb: 0.25 }}>Agent Provisioning</Typography>
          <Typography variant="caption" sx={{ color: '#6B7280', fontSize: '0.8rem' }}>Create a new agent to handle and resolve IT support tickets.</Typography>
        </Box>
      </Box>

      <TextField
        fullWidth size="small" id="agent-name" name="name" label="Full Name" sx={inputSx}
        value={formik.values.name} onChange={formik.handleChange} onBlur={formik.handleBlur}
        error={formik.touched.name && Boolean(formik.errors.name)}
        helperText={formik.touched.name && formik.errors.name}
        InputProps={{ startAdornment: <InputAdornment position="start"><PersonOutlineIcon sx={{ color: '#9CA3AF', fontSize: '1.1rem' }} /></InputAdornment> }}
      />
      <TextField
        fullWidth size="small" id="agent-email" name="email" label="Email Address" sx={inputSx}
        value={formik.values.email} onChange={formik.handleChange} onBlur={formik.handleBlur}
        error={formik.touched.email && Boolean(formik.errors.email)}
        helperText={formik.touched.email && formik.errors.email}
        InputProps={{ startAdornment: <InputAdornment position="start"><EmailOutlinedIcon sx={{ color: '#9CA3AF', fontSize: '1.1rem' }} /></InputAdornment> }}
      />
      <TextField
        fullWidth size="small" id="agent-password" name="password" label="Temporary Password"
        type={showPw ? 'text' : 'password'} sx={inputSx}
        value={formik.values.password} onChange={formik.handleChange} onBlur={formik.handleBlur}
        error={formik.touched.password && Boolean(formik.errors.password)}
        helperText={formik.touched.password && formik.errors.password}
        InputProps={{
          endAdornment: (
            <InputAdornment position="end">
              <IconButton size="small" onClick={() => setShowPw(s => !s)} sx={{ color: '#9CA3AF', '&:hover': { color: '#111827' } }}>
                {showPw ? <VisibilityOffIcon fontSize="small" /> : <VisibilityIcon fontSize="small" />}
              </IconButton>
            </InputAdornment>
          ),
        }}
      />

      <Button
        type="submit" variant="contained" fullWidth
        disabled={formik.isSubmitting}
        sx={{
          mt: 1, py: 1.6, borderRadius: '14px', fontWeight: 600, fontSize: '1rem', letterSpacing: '0.01em',
          backgroundColor: '#111827', color: '#FFFFFF', textTransform: 'none',
          transition: 'all 0.2s ease-in-out',
          '&:hover': { backgroundColor: '#374151' },
          '&:disabled': { backgroundColor: '#F3F4F6', color: '#9CA3AF' },
        }}
      >
        {formik.isSubmitting ? (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <CircularProgress size={18} color="inherit" />
            <span>Provisioning...</span>
          </Box>
        ) : (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <PersonAddAlt1Icon fontSize="small" />
            <span>Create Agent Account</span>
          </Box>
        )}
      </Button>
    </Box>
  );
}

// ── User Row ──────────────────────────────────────────────────────────────────
function UserRow({ user, onDelete }) {
  const rc = ROLE_CONFIG[user.role] || ROLE_CONFIG.USER;

  return (
    <Box sx={{
      display: 'flex', alignItems: 'center', gap: 2,
      p: 1.5, mb: 1.5,
      bgcolor: '#FFFFFF',
      border: '1px solid #F3F4F6',
      borderRadius: '12px',
      transition: 'all 0.2s',
      '&:hover': { borderColor: '#E5E7EB', bgcolor: '#FAFAFA' },
    }}>
      <Avatar sx={{ width: 40, height: 40, bgcolor: rc.bg }}>
        {rc.icon}
      </Avatar>
      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Typography variant="body2" sx={{ fontWeight: 600, color: '#111827', lineHeight: 1.2, mb: 0.25, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {user.name}
        </Typography>
        <Typography variant="caption" sx={{ color: '#6B7280', fontSize: '0.8rem' }}>
          {user.email}
        </Typography>
      </Box>
      <Chip
        label={user.role}
        size="small"
        sx={{ bgcolor: rc.bg, color: rc.color, border: `1px solid ${rc.border}`, fontWeight: 700, fontSize: '0.7rem', height: 24, borderRadius: '6px' }}
      />
      {user.role !== 'ADMIN' && (
        <Tooltip title={`Delete ${user.role.toLowerCase()} account`}>
          <IconButton
            size="small"
            onClick={() => onDelete(user)}
            sx={{ color: '#9CA3AF', '&:hover': { color: '#EF4444', bgcolor: '#FEF2F2' } }}
          >
            <DeleteOutlineIcon fontSize="small" />
          </IconButton>
        </Tooltip>
      )}
    </Box>
  );
}

// ── AdminPanel ────────────────────────────────────────────────────────────────
export default function AdminPanel({ onToast }) {
  const [tab,     setTab]     = useState(0);
  const [users,   setUsers]   = useState([]);
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState('');

  const loadUsers = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await ApiService.getUsers();
      if (res.success) setUsers(Array.isArray(res.data) ? res.data : []);
      else setError(res.message || 'Failed to load users');
    } catch (e) {
      setError(e?.response?.data?.message || 'Cannot connect to auth service');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadUsers(); }, [loadUsers]);

  const handleDelete = async (targetUser) => {
    if (!window.confirm(`Delete ${targetUser.role} account "${targetUser.name}" (${targetUser.email})?`)) return;
    try {
      const res = await ApiService.deleteUser(targetUser.id);
      if (res.success) {
        onToast(`"${targetUser.name}" deleted`, 'info');
        loadUsers();
      } else {
        onToast(res.message || 'Delete failed', 'error');
      }
    } catch (e) {
      onToast(e?.response?.data?.message || 'Delete failed', 'error');
    }
  };

  const agents = users.filter(u => u.role === 'AGENT');
  const regularUsers = users.filter(u => u.role === 'USER');
  const allUsers = users;

  return (
    <Card 
      elevation={0}
      sx={{
        background: '#FFFFFF',
        border: '1px solid #F3F4F6',
        borderRadius: '24px',
        maxWidth: '700px',
        margin: '0 auto'
      }}
    >
      <CardContent sx={{ p: { xs: 3, sm: 4 } }}>
        
        {/* Header */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 4, flexWrap: 'wrap' }}>
          <Box 
            sx={{ 
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              width: 48, height: 48, bgcolor: '#F9FAFB', 
              borderRadius: '14px', border: '1px solid #F3F4F6', color: '#111827'
            }}
          >
            <AdminPanelSettingsIcon />
          </Box>
          <Box sx={{ flexGrow: 1 }}>
            <Typography variant="h5" sx={{ fontWeight: 800, color: '#111827', letterSpacing: '-0.02em', mb: 0.5 }}>
              Admin Panel
            </Typography>
            <Typography variant="body2" sx={{ color: '#6B7280', fontSize: '0.9rem' }}>
              Manage system access and team provisioning.
            </Typography>
          </Box>

          <Box sx={{ display: 'flex', gap: 1 }}>
            <Chip icon={<EngineeringIcon sx={{ fontSize: '0.9rem !important' }} />} label={`${agents.length} Agents`} size="small"
              sx={{ bgcolor: '#FFFBEB', color: '#D97706', border: '1px solid #FDE68A', fontWeight: 600, borderRadius: '8px', py: 1.5 }} />
            <Chip icon={<GroupIcon sx={{ fontSize: '0.9rem !important' }} />} label={`${regularUsers.length} Users`} size="small"
              sx={{ bgcolor: '#ECFDF5', color: '#059669', border: '1px solid #A7F3D0', fontWeight: 600, borderRadius: '8px', py: 1.5 }} />
          </Box>
        </Box>

        <Tabs
          value={tab} onChange={(_, v) => setTab(v)}
          sx={{
            mb: 4,
            minHeight: '44px',
            borderBottom: '1px solid #F3F4F6',
            '& .MuiTab-root': { color: '#6B7280', fontWeight: 600, textTransform: 'none', fontSize: '0.95rem', minHeight: '44px', py: 1, px: 3 },
            '& .Mui-selected': { color: '#111827 !important' },
            '& .MuiTabs-indicator': { backgroundColor: '#111827', height: '3px', borderRadius: '3px 3px 0 0' },
          }}
        >
          <Tab 
            icon={<AddIcon fontSize="small" />} 
            iconPosition="start" 
            id="admin-tab-create" 
            label="Create Agent" 
          />
          <Tab 
            icon={<PeopleAltIcon fontSize="small" />} 
            iconPosition="start" 
            id="admin-tab-users" 
            label={`Directory (${users.length})`} 
          />
        </Tabs>

        {/* ── Tab 0: Create Agent ─────────────────────────────────────────── */}
        {tab === 0 && (
          <CreateAgentForm onSuccess={loadUsers} onToast={onToast} />
        )}

        {/* ── Tab 1: All Users ────────────────────────────────────────────── */}
        {tab === 1 && (
          <Box sx={{ maxHeight: '600px', overflowY: 'auto', pr: 1 }}>
            {error && (
              <Alert severity="error" sx={{ mb: 3, borderRadius: '12px', bgcolor: '#FEF2F2', color: '#EF4444', border: '1px solid #FCA5A5' }}>
                {error}
              </Alert>
            )}

            {loading ? (
              [...Array(4)].map((_, i) => (
                <Skeleton key={i} variant="rounded" height={72} sx={{ bgcolor: '#F9FAFB', mb: 1.5, borderRadius: '12px' }} />
              ))
            ) : allUsers.length === 0 ? (
              <Box sx={{ textAlign: 'center', py: 6, bgcolor: '#F9FAFB', borderRadius: '16px', border: '1px dashed #E5E7EB' }}>
                <Typography variant="body1" sx={{ color: '#4B5563', fontWeight: 600 }}>No accounts found</Typography>
                <Typography variant="body2" sx={{ color: '#9CA3AF', mt: 1 }}>The system directory is currently empty.</Typography>
              </Box>
            ) : (
              <>
                {/* Admins */}
                {allUsers.filter(u => u.role === 'ADMIN').length > 0 && (
                  <Box sx={{ mb: 4 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5, pl: 0.5 }}>
                      <SecurityIcon sx={{ color: '#9CA3AF', fontSize: '1rem' }} />
                      <Typography variant="caption" sx={{ color: '#6B7280', fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase' }}>
                        Administrators
                      </Typography>
                    </Box>
                    {allUsers.filter(u => u.role === 'ADMIN').map(u => <UserRow key={u.id} user={u} onDelete={handleDelete} />)}
                  </Box>
                )}
                
                {/* Agents */}
                {agents.length > 0 && (
                  <Box sx={{ mb: 4 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5, pl: 0.5 }}>
                      <SupportAgentIcon sx={{ color: '#9CA3AF', fontSize: '1rem' }} />
                      <Typography variant="caption" sx={{ color: '#6B7280', fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase' }}>
                        Support Agents
                      </Typography>
                    </Box>
                    {agents.map(u => <UserRow key={u.id} user={u} onDelete={handleDelete} />)}
                  </Box>
                )}
                
                {/* Users */}
                {regularUsers.length > 0 && (
                  <Box sx={{ mb: 2 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5, pl: 0.5 }}>
                      <PersonIcon sx={{ color: '#9CA3AF', fontSize: '1rem' }} />
                      <Typography variant="caption" sx={{ color: '#6B7280', fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase' }}>
                        Standard Users
                      </Typography>
                    </Box>
                    {regularUsers.map(u => <UserRow key={u.id} user={u} onDelete={handleDelete} />)}
                  </Box>
                )}
              </>
            )}
          </Box>
        )}
      </CardContent>
    </Card>
  );
}