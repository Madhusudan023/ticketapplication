import React from 'react';
import { useFormik } from 'formik';
import * as Yup from 'yup';
import {
  Card, CardContent, Typography, TextField, MenuItem,
  Button, Box, Divider, Chip, CircularProgress,
} from '@mui/material';

// Google Material Icons
import ComputerIcon from '@mui/icons-material/Computer';
import CodeIcon from '@mui/icons-material/Code';
import RouterIcon from '@mui/icons-material/Router';
import VpnKeyIcon from '@mui/icons-material/VpnKey';
import AssignmentIcon from '@mui/icons-material/Assignment';
import ConfirmationNumberOutlinedIcon from '@mui/icons-material/ConfirmationNumberOutlined';
import SendIcon from '@mui/icons-material/Send';

import { ApiService } from '../services/api';
import { useAuth } from '../context/AuthContext';

const CATEGORIES = [
  { value: 'HARDWARE',  label: 'Hardware Issue',       icon: <ComputerIcon fontSize="small" sx={{ color: '#6B7280' }} /> },
  { value: 'SOFTWARE',  label: 'Software & Apps',      icon: <CodeIcon fontSize="small" sx={{ color: '#6B7280' }} /> },
  { value: 'NETWORK',   label: 'Network & VPN',        icon: <RouterIcon fontSize="small" sx={{ color: '#6B7280' }} /> },
  { value: 'ACCESS',    label: 'Access & Permissions', icon: <VpnKeyIcon fontSize="small" sx={{ color: '#6B7280' }} /> },
  { value: 'OTHER',     label: 'Other Request',        icon: <AssignmentIcon fontSize="small" sx={{ color: '#6B7280' }} /> },
];

const PRIORITIES = [
  { value: 'LOW',    label: 'Low',    color: '#9CA3AF' }, 
  { value: 'MEDIUM', label: 'Medium', color: '#3B82F6' }, 
  { value: 'HIGH',   label: 'High',   color: '#F59E0B' }, 
  { value: 'URGENT', label: 'Urgent', color: '#EF4444' }, 
];

// Premium Input Styling
const inputSx = {
  mb: 2.5,
  '& .MuiOutlinedInput-root': {
    color: '#111827',
    backgroundColor: '#FAFAFA',
    borderRadius: '12px',
    transition: 'all 0.2s ease-in-out',
    '& fieldset': { 
      borderColor: '#E5E7EB',
      borderWidth: '1px',
    },
    '&:hover fieldset': { 
      borderColor: '#D1D5DB' 
    },
    '&.Mui-focused': {
      backgroundColor: '#FFFFFF',
    },
    '&.Mui-focused fieldset': { 
      borderColor: '#111827',
      borderWidth: '1px' 
    },
  },
  '& .MuiInputLabel-root': { 
    color: '#6B7280',
    fontSize: '0.95rem',
  },
  '& .MuiInputLabel-root.Mui-focused': { 
    color: '#111827',
    fontWeight: 500,
  },
  '& .MuiFormHelperText-root': { 
    color: '#EF4444',
    marginLeft: '4px',
  },
  // Ensure the select text doesn't overlap the arrow icon
  '& .MuiSelect-select': {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    paddingRight: '32px !important', 
  }
};

export default function CreateTicketForm({ onTicketCreated, onToast }) {
  const { user } = useAuth();

  const formik = useFormik({
    initialValues: { title: '', description: '', category: 'SOFTWARE', priority: 'MEDIUM' },
    validationSchema: Yup.object({
      title:       Yup.string().min(5, 'Minimum 5 characters').max(100).required('Title is required'),
      description: Yup.string().min(10, 'Minimum 10 characters').required('Description is required'),
      category:    Yup.string().required('Select a category'),
      priority:    Yup.string().required('Select a priority'),
    }),
    onSubmit: async (values, { resetForm, setSubmitting }) => {
      try {
        const payload = { ...values, status: 'OPEN', createdBy: user?.email || user?.name || 'User' };
        const res = await ApiService.createTicket(payload);
        if (res.success) {
          onToast('Ticket created successfully!', 'success');
          resetForm();
          if (onTicketCreated) onTicketCreated();
        } else {
          onToast(res.message || 'Failed to create ticket', 'error');
        }
      } catch {
        onToast('Cannot connect to backend API. Is the server running?', 'error');
      } finally {
        setSubmitting(false);
      }
    },
  });

  const selectedPriority = PRIORITIES.find(p => p.value === formik.values.priority);

  return (
    <Card
      elevation={0}
      sx={{
        background: '#FFFFFF',
        border: '1px solid #F3F4F6',
        borderRadius: '24px',
        overflow: 'visible',
        maxWidth: '600px',
        margin: '0 auto',
      }}
    >
      <CardContent sx={{ p: { xs: 3, sm: 5 } }}>
        
        {/* Fixed Header Layout */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2.5, mb: 3 }}>
          <Box 
            sx={{ 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center',
              width: 52, 
              height: 52, 
              bgcolor: '#F9FAFB', 
              borderRadius: '16px',
              border: '1px solid #F3F4F6',
              color: '#111827',
              flexShrink: 0 // Prevent icon from shrinking
            }}
          >
            <ConfirmationNumberOutlinedIcon sx={{ fontSize: '1.6rem' }} />
          </Box>
          <Box sx={{ flexGrow: 1, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <Typography sx={{ fontWeight: 800, color: '#111827', letterSpacing: '-0.03em', fontSize: '1.25rem', whiteSpace: 'wrap' }}>
              Create Support Request
            </Typography>
            {selectedPriority && (
              <Chip
                label={selectedPriority.label}
                size="small"
                sx={{ 
                  bgcolor: `${selectedPriority.color}15`, 
                  color: selectedPriority.color, 
                  fontWeight: 700, 
                  fontSize: '0.85rem',
                  borderRadius: '8px',
                  px: 1,
                  py: 1.8,
                }}
              />
            )}
          </Box>
        </Box>
        
        {/* Subtitle placed perfectly below */}
        <Typography sx={{ color: '#6B7280', fontSize: '0.95rem', lineHeight: 1.5, mb: 2, pl: '' }}>
          Please provide the details of your issue below.
        </Typography>

        <Divider sx={{ borderColor: '#F3F4F6', mb: 4 }} />

        <form onSubmit={formik.handleSubmit}>
          {/* Title */}
          <TextField
            fullWidth
            id="title"
            name="title"
            label="Issue Title"
            placeholder="e.g. VPN not connecting from home office"
            sx={inputSx}
            value={formik.values.title}
            onChange={formik.handleChange}
            onBlur={formik.handleBlur}
            error={formik.touched.title && Boolean(formik.errors.title)}
            helperText={formik.touched.title && formik.errors.title}
          />

          <Box sx={{ display: 'flex', gap: 2.5, flexDirection: { xs: 'column', sm: 'row' } }}>
            {/* Category */}
            <TextField
              fullWidth select id="category" name="category" label="Category" sx={inputSx}
              value={formik.values.category} onChange={formik.handleChange}
              SelectProps={{ 
                renderValue: (value) => {
                  const selected = CATEGORIES.find(c => c.value === value);
                  return selected ? (
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, overflow: 'hidden' }}>
                      {selected.icon}
                      <Typography sx={{ fontWeight: 500, fontSize: '0.9rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {selected.label}
                      </Typography>
                    </Box>
                  ) : null;
                },
                MenuProps: { PaperProps: { sx: { borderRadius: '12px', mt: 1 } } } 
              }}
            >
              {CATEGORIES.map(c => (
                <MenuItem key={c.value} value={c.value} sx={{ py: 1.5, borderRadius: '8px', mx: 1 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                    {c.icon}
                    <Typography>{c.label}</Typography>
                  </Box>
                </MenuItem>
              ))}
            </TextField>

            {/* Priority */}
            <TextField
              fullWidth select id="priority" name="priority" label="Priority" sx={inputSx}
              value={formik.values.priority} onChange={formik.handleChange}
              SelectProps={{ 
                renderValue: (value) => {
                  const selected = PRIORITIES.find(p => p.value === value);
                  return selected ? (
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: selected.color }} />
                      <Typography sx={{ fontWeight: 500, fontSize: '0.9rem' }}>{selected.label}</Typography>
                    </Box>
                  ) : null;
                },
                MenuProps: { PaperProps: { sx: { borderRadius: '12px', mt: 1 } } } 
              }}
            >
              {PRIORITIES.map(p => (
                <MenuItem key={p.value} value={p.value} sx={{ py: 1.5, borderRadius: '8px', mx: 1 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                    <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: p.color }} />
                    <Typography sx={{ fontWeight: 500 }}>{p.label}</Typography>
                  </Box>
                </MenuItem>
              ))}
            </TextField>
          </Box>

          {/* Description */}
          <TextField
            fullWidth multiline rows={5} id="description" name="description"
            label="Detailed Description"
            placeholder="Describe the issue step-by-step, including any error messages..."
            sx={{ ...inputSx, mb: 4 }}
            value={formik.values.description}
            onChange={formik.handleChange}
            onBlur={formik.handleBlur}
            error={formik.touched.description && Boolean(formik.errors.description)}
            helperText={formik.touched.description && formik.errors.description}
          />

          {/* Submit Button */}
          <Button
            type="submit"
            fullWidth
            variant="contained"
            disabled={formik.isSubmitting}
            sx={{
              py: 1.6,
              borderRadius: '14px',
              fontWeight: 600,
              fontSize: '1rem',
              letterSpacing: '0.01em',
              backgroundColor: '#111827',
              color: '#FFFFFF',
              textTransform: 'none',
              transition: 'all 0.2s ease-in-out',
              '&:hover': { 
                backgroundColor: '#374151'
              },
              '&:disabled': { 
                backgroundColor: '#F3F4F6',
                color: '#9CA3AF'
              },
            }}
          >
            {formik.isSubmitting ? (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <CircularProgress size={18} color="inherit" />
                <span>Submitting...</span>
              </Box>
            ) : (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <span>Submit Ticket</span>
                <SendIcon fontSize="small" sx={{ ml: 0.5 }} />
              </Box>
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}