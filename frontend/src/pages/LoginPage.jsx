import React, { useState } from 'react';
import { useFormik } from 'formik';
import * as Yup from 'yup';
import {
  Box, Card, CardContent, Typography, TextField,
  Button, CircularProgress, Alert, Tab, Tabs, Chip,
  InputAdornment, IconButton,
} from '@mui/material';

// Google Material Icons
import ConfirmationNumberOutlinedIcon from '@mui/icons-material/ConfirmationNumberOutlined';
import PersonAddIcon from '@mui/icons-material/PersonAdd';
import EmailOutlinedIcon from '@mui/icons-material/EmailOutlined';
import PersonOutlineIcon from '@mui/icons-material/PersonOutline';
import VisibilityIcon from '@mui/icons-material/Visibility';
import VisibilityOffIcon from '@mui/icons-material/VisibilityOff';
import SecurityIcon from '@mui/icons-material/Security';
import SupportAgentIcon from '@mui/icons-material/SupportAgent';
import PersonIcon from '@mui/icons-material/Person';
import EngineeringIcon from '@mui/icons-material/Engineering';
import LoginIcon from '@mui/icons-material/Login';

import { ApiService } from '../services/api';
import { useAuth } from '../context/AuthContext';

// ── Premium Shared Input Styles ───────────────────────────────────────────────
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
    '&.Mui-error fieldset': { borderColor: '#EF4444 !important' },
  },
  '& .MuiInputLabel-root': { color: '#6B7280', fontSize: '0.9rem' },
  '& .MuiInputLabel-root.Mui-focused': { color: '#111827', fontWeight: 500 },
  '& .MuiInputLabel-root.Mui-error': { color: '#EF4444' },
  '& .MuiFormHelperText-root': { color: '#EF4444', marginLeft: '4px', marginTop: '4px' },
};

// ── Password field with show/hide ─────────────────────────────────────────────
function PasswordField({ id, name, label, formik }) {
  const [show, setShow] = useState(false);
  return (
    <TextField
      fullWidth id={id} name={name} label={label} size="small"
      type={show ? 'text' : 'password'}
      sx={inputSx}
      value={formik.values[name]}
      onChange={formik.handleChange}
      onBlur={formik.handleBlur}
      error={formik.touched[name] && Boolean(formik.errors[name])}
      helperText={formik.touched[name] && formik.errors[name]}
      InputProps={{
        endAdornment: (
          <InputAdornment position="end">
            <IconButton 
              size="small" 
              onClick={() => setShow(s => !s)} 
              edge="end"
              sx={{ color: '#9CA3AF', '&:hover': { color: '#111827' } }}
            >
              {show ? <VisibilityOffIcon fontSize="small" /> : <VisibilityIcon fontSize="small" />}
            </IconButton>
          </InputAdornment>
        ),
      }}
    />
  );
}

// ── Login Form ────────────────────────────────────────────────────────────────
function LoginForm({ onError, onSuccess }) {
  const { login } = useAuth();

  const formik = useFormik({
    initialValues: { email: '', password: '' },
    validationSchema: Yup.object({
      email:    Yup.string().email('Enter a valid email address').required('Email is required'),
      password: Yup.string().min(4, 'Password must be at least 4 characters').required('Password is required'),
    }),
    validateOnBlur: true,
    validateOnChange: false,
    onSubmit: async (values, { setSubmitting }) => {
      onError('');
      try {
        const res = await ApiService.login(values.email.trim(), values.password);
        if (res.success) {
          login(res.data);
          onSuccess();
        } else {
          onError(res.message || 'Login failed. Check your credentials.');
        }
      } catch (e) {
        const msg = e?.response?.data?.message;
        if (e?.response?.status === 401) onError('Invalid email or password');
        else if (!e?.response)           onError('Cannot connect to server. Make sure services are running.');
        else                             onError(msg || 'Login failed');
      } finally {
        setSubmitting(false);
      }
    },
  });

  return (
    <form onSubmit={formik.handleSubmit} noValidate>
      <TextField
        fullWidth id="login-email" name="email" label="Email Address" size="small"
        sx={inputSx} value={formik.values.email}
        onChange={formik.handleChange} onBlur={formik.handleBlur}
        error={formik.touched.email && Boolean(formik.errors.email)}
        helperText={formik.touched.email && formik.errors.email}
        InputProps={{ startAdornment: <InputAdornment position="start"><EmailOutlinedIcon sx={{ color: '#9CA3AF', fontSize: '1.1rem' }} /></InputAdornment> }}
      />
      <PasswordField id="login-password" name="password" label="Password" formik={formik} />

      <Button
        type="submit" fullWidth variant="contained"
        disabled={formik.isSubmitting}
        sx={{
          mt: 1, py: 1.6, borderRadius: '14px', fontWeight: 600, fontSize: '1rem', letterSpacing: '0.01em',
          backgroundColor: '#111827', color: '#FFFFFF', textTransform: 'none',
         transition: 'all 0.2s ease-in-out',
          '&:hover': { backgroundColor: '#374151' },
          '&:disabled': { backgroundColor: '#F3F4F6', color: '#9CA3AF'},
        }}
      >
        {formik.isSubmitting ? (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <CircularProgress size={18} color="inherit" />
            <span>Signing in...</span>
          </Box>
        ) : (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <span>Sign In</span>
            <LoginIcon fontSize="small" sx={{ ml: 0.5 }} />
          </Box>
        )}
      </Button>
    </form>
  );
}

// ── Register Form (USER only) ─────────────────────────────────────────────────
function RegisterForm({ onError, onSuccess }) {
  const { login } = useAuth();

  const formik = useFormik({
    initialValues: { name: '', email: '', password: '', confirmPassword: '' },
    validationSchema: Yup.object({
      name: Yup.string()
        .trim().min(2, 'Name must be at least 2 characters').max(60, 'Name cannot exceed 60 characters')
        .matches(/^[a-zA-Z\s]+$/, 'Name can only contain letters and spaces').required('Full name is required'),
      email: Yup.string().email('Enter a valid email address').required('Email is required'),
      password: Yup.string()
        .min(6, 'Password must be at least 6 characters')
        .matches(/[A-Z]/, 'Must contain at least one uppercase letter')
        .matches(/[0-9]/, 'Must contain at least one number')
        .required('Password is required'),
      confirmPassword: Yup.string()
        .oneOf([Yup.ref('password')], 'Passwords do not match').required('Please confirm your password'),
    }),
    validateOnBlur: true,
    validateOnChange: false,
    onSubmit: async (values, { setSubmitting }) => {
      onError('');
      try {
        const res = await ApiService.register(values.name.trim(), values.email.trim(), values.password);
        if (res.success) {
          login(res.data);
          onSuccess();
        } else {
          onError(res.message || 'Registration failed');
        }
      } catch (e) {
        const msg = e?.response?.data?.message;
        if (e?.response?.status === 409) onError('This email is already registered');
        else if (!e?.response)           onError('Cannot connect to server. Make sure services are running.');
        else                             onError(msg || 'Registration failed');
      } finally {
        setSubmitting(false);
      }
    },
  });

  return (
    <form onSubmit={formik.handleSubmit} noValidate>
      {/* Role badge — fixed to USER */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 3, p: 2, bgcolor: '#ECFDF5', borderRadius: '12px', border: '1px solid #D1FAE5' }}>
        <PersonIcon sx={{ color: '#10B981', fontSize: '1.4rem' }} />
        <Box>
          <Typography variant="body2" sx={{ color: '#065F46', fontWeight: 700, display: 'block', lineHeight: 1.2 }}>
            Standard User Account
          </Typography>
          <Typography variant="caption" sx={{ color: '#047857', fontSize: '0.75rem' }}>
            Submit & track your own IT support tickets
          </Typography>
        </Box>
      </Box>

      <TextField
        fullWidth id="reg-name" name="name" label="Full Name" size="small"
        sx={inputSx} value={formik.values.name}
        onChange={formik.handleChange} onBlur={formik.handleBlur}
        error={formik.touched.name && Boolean(formik.errors.name)}
        helperText={formik.touched.name && formik.errors.name}
        InputProps={{ startAdornment: <InputAdornment position="start"><PersonOutlineIcon sx={{ color: '#9CA3AF', fontSize: '1.1rem' }} /></InputAdornment> }}
      />
      <TextField
        fullWidth id="reg-email" name="email" label="Email Address" size="small"
        sx={inputSx} value={formik.values.email}
        onChange={formik.handleChange} onBlur={formik.handleBlur}
        error={formik.touched.email && Boolean(formik.errors.email)}
        helperText={formik.touched.email && formik.errors.email}
        InputProps={{ startAdornment: <InputAdornment position="start"><EmailOutlinedIcon sx={{ color: '#9CA3AF', fontSize: '1.1rem' }} /></InputAdornment> }}
      />
      <PasswordField id="reg-password"  name="password"        label="Password"         formik={formik} />
      <PasswordField id="reg-confirm"   name="confirmPassword" label="Confirm Password" formik={formik} />

      {/* Password hints */}
      <Box sx={{ mb: 3, display: 'flex', gap: 1, flexWrap: 'wrap' }}>
        {['Min 6 chars', 'One uppercase', 'One number'].map(hint => (
          <Typography key={hint} variant="caption" sx={{ color: '#6B7280', bgcolor: '#F3F4F6', px: 1.2, py: 0.4, borderRadius: '6px', fontSize: '0.7rem', fontWeight: 500 }}>
            ✓ {hint}
          </Typography>
        ))}
      </Box>

      <Button
        type="submit" fullWidth variant="contained"
        disabled={formik.isSubmitting}
        sx={{
          py: 1.6, borderRadius: '14px', fontWeight: 600, fontSize: '1rem', letterSpacing: '0.01em',
          backgroundColor: '#111827', color: '#FFFFFF', textTransform: 'none', transition: 'all 0.2s ease-in-out',
          '&:hover': { backgroundColor: '#374151' },
          '&:disabled': { backgroundColor: '#F3F4F6', color: '#9CA3AF' },
        }}
      >
        {formik.isSubmitting ? (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <CircularProgress size={18} color="inherit" />
            <span>Creating account...</span>
          </Box>
        ) : (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <PersonAddIcon fontSize="small" />
            <span>Create Account</span>
          </Box>
        )}
      </Button>

      {/* Admin Notice for Agents */}
      <Box sx={{ mt: 3, p: 2, bgcolor: '#F9FAFB', borderRadius: '12px', border: '1px solid #F3F4F6', display: 'flex', gap: 1.5, alignItems: 'center' }}>
        <EngineeringIcon sx={{ color: '#9CA3AF' }} />
        <Typography variant="caption" sx={{ color: '#6B7280', lineHeight: 1.5 }}>
          <strong style={{ color: '#111827' }}>Agent accounts</strong> are provisioned by the Administrator from inside the dashboard.
        </Typography>
      </Box>
    </form>
  );
}

// ── LoginPage ─────────────────────────────────────────────────────────────────
export default function LoginPage() {
  const [tab,   setTab]   = useState(0);
  const [error, setError] = useState('');

  const handleTabChange = (_, v) => { setTab(v); setError(''); };

  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'radial-gradient(ellipse at top, #F9FAFB, #F3F4F6)', // Clean SaaS mesh
        p: 2,
      }}
    >
      <Box sx={{ width: '100%', maxWidth: 460 }}>

        {/* Brand Header */}
        <Box sx={{ textAlign: 'center', mb: 4 }}>
          <Box 
            sx={{ 
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
              width: 56, height: 56, bgcolor: '#FFFFFF', 
              borderRadius: '16px', border: '1px solid #E5E7EB', color: '#111827', mb: 2,
             
            }}
          >
            <ConfirmationNumberOutlinedIcon sx={{ fontSize: '2rem' }} />
          </Box>
          <Typography variant="h4" sx={{ fontWeight: 800, color: '#111827', letterSpacing: '-0.03em' }}>
            TicketDesk
          </Typography>
          <Typography variant="body2" sx={{ color: '#6B7280', mt: 0.5, fontSize: '0.95rem' }}>
            Enterprise IT Support Platform
          </Typography>
        </Box>

        {/* Roles info */}
       

        {/* Login/Register Card */}
        <Card 
          elevation={0}
          sx={{
            background: '#FFFFFF',
            border: '1px solid #F3F4F6',
            borderRadius: '24px',
           
          }}
        >
          <CardContent sx={{ p: { xs: 3, sm: 4 } }}>
            <Tabs
              value={tab} onChange={handleTabChange}
              variant="fullWidth"
              sx={{
                mb: 4,
                minHeight: '44px',
                borderBottom: '1px solid #F3F4F6',
                '& .MuiTab-root': { color: '#9CA3AF', fontWeight: 600, textTransform: 'none', fontSize: '0.95rem', minHeight: '44px' },
                '& .Mui-selected': { color: '#111827 !important' },
                '& .MuiTabs-indicator': { backgroundColor: '#111827', height: '3px', borderRadius: '3px 3px 0 0' },
              }}
            >
              <Tab id="tab-login"    label="Sign In"      disableRipple />
              <Tab id="tab-register" label="Register"     disableRipple />
            </Tabs>

            {error && (
              <Alert
                severity="error"
                sx={{
                  mb: 3, borderRadius: '12px', fontSize: '0.85rem',
                  bgcolor: '#FEF2F2', color: '#EF4444',
                  border: '1px solid #FCA5A5',
                  '& .MuiAlert-icon': { color: '#EF4444' },
                }}
              >
                {error}
              </Alert>
            )}

            {tab === 0
              ? <LoginForm  onError={setError} onSuccess={() => setError('')} />
              : <RegisterForm onError={setError} onSuccess={() => setError('')} />
            }

          </CardContent>
        </Card>
      </Box>
    </Box>
  );
}