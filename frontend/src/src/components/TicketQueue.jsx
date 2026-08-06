import React, { useState, useEffect, useCallback } from 'react';
import {
  Card, CardContent, Typography, Box, TextField, MenuItem,
  Chip, Button, InputAdornment, Collapse, Divider, Skeleton,
  IconButton, Tooltip, LinearProgress, List, ListItem,
  ListItemText, ListItemSecondaryAction
} from '@mui/material';

// Icons
import SearchIcon from '@mui/icons-material/Search';
import FormatListBulletedIcon from '@mui/icons-material/FormatListBulleted';
import ReplyIcon from '@mui/icons-material/Reply';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import CommentIcon from '@mui/icons-material/Comment';
import AttachFileIcon from '@mui/icons-material/AttachFile';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import FileDownloadIcon from '@mui/icons-material/FileDownload';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import AssignmentIndIcon from '@mui/icons-material/AssignmentInd';
import ConfirmationNumberOutlinedIcon from '@mui/icons-material/ConfirmationNumberOutlined';

import { ApiService } from '../services/api';
import { useAuth } from '../context/AuthContext';

// ── Status / Priority config ──────────────────────────────────────────────────
const STATUS_CONFIG = {
  OPEN:        { color: '#3B82F6', bg: '#EFF6FF', border: '#BFDBFE', label: 'Open' },
  IN_PROGRESS: { color: '#F59E0B', bg: '#FFFBEB', border: '#FDE68A', label: 'In Progress' },
  RESOLVED:    { color: '#10B981', bg: '#ECFDF5', border: '#A7F3D0', label: 'Resolved' },
  CLOSED:      { color: '#64748B', bg: '#F8FAFC', border: '#E2E8F0', label: 'Closed' },
};

const PRIORITY_CONFIG = {
  URGENT: { color: '#EF4444', dot: '#EF4444' },
  HIGH:   { color: '#F97316', dot: '#F97316' },
  MEDIUM: { color: '#3B82F6', dot: '#3B82F6' },
  LOW:    { color: '#94A3B8', dot: '#94A3B8' },
};

const TRANSITIONS = {
  OPEN:        ['IN_PROGRESS'],
  IN_PROGRESS: ['RESOLVED'],
  RESOLVED:    ['CLOSED'],
  CLOSED:      [],
};

// Premium Input Styling
const inputSx = {
  '& .MuiOutlinedInput-root': {
    color: '#111827',
    backgroundColor: '#FAFAFA',
    borderRadius: '12px',
    transition: 'all 0.2s ease-in-out',
    fontSize: '0.875rem',
    '& fieldset': { borderColor: '#E5E7EB', borderWidth: '1px' },
    '&:hover fieldset': { borderColor: '#D1D5DB' },
    '&.Mui-focused': { backgroundColor: '#FFFFFF' },
    '&.Mui-focused fieldset': { borderColor: '#111827', borderWidth: '1px' },
  },
  '& .MuiInputLabel-root': { color: '#6B7280', fontSize: '0.875rem' },
  '& .MuiInputLabel-root.Mui-focused': { color: '#111827', fontWeight: 500 },
};

const formatBytes = (bytes) => {
  if (!bytes) return '';
  if (bytes < 1024)        return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

// ── TicketCard ────────────────────────────────────────────────────────────────
function TicketCard({ ticket, agents, onRefresh, onToast }) {
  const { user, isAdmin, isAgent } = useAuth();
  const [expanded,    setExpanded]   = useState(false);
  const [activeTab,   setActiveTab]  = useState('comments'); 
  const [comment,     setComment]    = useState('');
  const [submitting,  setSubmitting] = useState(false);
  const [attachments, setAttachments] = useState([]);
  const [attachLoad,  setAttachLoad] = useState(false);
  const [uploading,   setUploading]  = useState(false);
  const [uploadPct,   setUploadPct]  = useState(0);
  const [assignedAgent, setAssignedAgent] = useState(ticket.assignedTo || '');

  const sc = STATUS_CONFIG[ticket.status] || STATUS_CONFIG.OPEN;
  const pc = PRIORITY_CONFIG[ticket.priority] || PRIORITY_CONFIG.MEDIUM;
  const transitions = TRANSITIONS[ticket.status] || [];

  const handleExpand = useCallback(async () => {
    const next = !expanded;
    setExpanded(next);
    if (next && activeTab === 'attachments') await loadAttachments();
  }, [expanded, activeTab, ticket.id]);

  const loadAttachments = useCallback(async () => {
    setAttachLoad(true);
    try {
      const res = await ApiService.getAttachments(ticket.id);
      if (res.success) setAttachments(res.data || []);
    } catch {
      /* silently fail */
    } finally {
      setAttachLoad(false);
    }
  }, [ticket.id]);

  const handleTabChange = async (tab) => {
    setActiveTab(tab);
    if (tab === 'attachments') await loadAttachments();
  };

  const handleStatusChange = async (newStatus) => {
    try {
      await ApiService.updateStatus(ticket.id, newStatus);
      onToast(`Ticket #${ticket.id} → ${newStatus}`, 'success');
      onRefresh();
    } catch {
      onToast('Failed to update status', 'error');
    }
  };

  const handleAssignAgent = async (agentEmail) => {
    setAssignedAgent(agentEmail);
    try {
      await ApiService.assignTicket(ticket.id, agentEmail);
      onToast(`Ticket #${ticket.id} assigned to ${agentEmail}`, 'success');
      onRefresh();
    } catch {
      onToast('Failed to assign agent', 'error');
    }
  };

  const handleDeleteTicket = async () => {
    if (!window.confirm(`Are you sure you want to delete ticket #${ticket.id}?`)) return;
    try {
      await ApiService.deleteTicket(ticket.id);
      onToast(`Ticket #${ticket.id} deleted`, 'info');
      onRefresh();
    } catch {
      onToast('Failed to delete ticket', 'error');
    }
  };

  const handleComment = async () => {
    if (!comment.trim()) return;
    setSubmitting(true);
    try {
      await ApiService.addComment(ticket.id, comment.trim(), user?.name || user?.email || 'User');
      setComment('');
      onToast('Comment added', 'success');
      onRefresh();
    } catch {
      onToast('Failed to add comment', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 10 * 1024 * 1024) {
      onToast('File must be smaller than 10 MB', 'error');
      return;
    }

    setUploading(true);
    setUploadPct(0);
    const timer = setInterval(() => setUploadPct(p => Math.min(p + 15, 90)), 200);

    try {
      const res = await ApiService.uploadAttachment(ticket.id, file);
      clearInterval(timer);
      setUploadPct(100);
      if (res.success) {
        onToast(`"${file.name}" uploaded successfully`, 'success');
        await loadAttachments();
      } else {
        onToast(res.message || 'Upload failed', 'error');
      }
    } catch (err) {
      clearInterval(timer);
      onToast(err?.response?.data?.message || 'Upload failed', 'error');
    } finally {
      setTimeout(() => { setUploading(false); setUploadPct(0); }, 600);
      e.target.value = '';
    }
  };

  const handleDeleteAttachment = async (attachId, fileName) => {
    try {
      await ApiService.deleteAttachment(attachId);
      onToast(`"${fileName}" deleted`, 'info');
      setAttachments(a => a.filter(x => x.id !== attachId));
    } catch {
      onToast('Delete failed', 'error');
    }
  };

  const formatDate = (d) =>
    d ? new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '';

  return (
    <Box
      sx={{
        bgcolor: '#FFFFFF',
        border: '1px solid #F3F4F6',
        borderRadius: '16px',
        mb: 2.5,
        overflow: 'hidden',
        transition: 'all 0.25s ease',
        '&:hover': { 
          borderColor: '#E5E7EB',  
        },
      }}
    >
      <Box sx={{ p: 2.5 }}>
        {/* Top Row */}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1.5 }}>
          <Box sx={{ flex: 1, mr: 2 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1, flexWrap: 'wrap' }}>
              <Typography variant="caption" sx={{ color: '#6B7280', fontWeight: 600, fontFamily: 'monospace', letterSpacing: '0.05em' }}>
                #{String(ticket.id).padStart(4, '0')}
              </Typography>
              <Box sx={{ width: 4, height: 4, borderRadius: '50%', bgcolor: '#D1D5DB' }} />
              <Typography variant="caption" sx={{ color: '#6B7280', fontWeight: 500 }}>{ticket.category}</Typography>
              <Box sx={{ width: 4, height: 4, borderRadius: '50%', bgcolor: '#D1D5DB' }} />
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                <Box sx={{ width: 6, height: 6, borderRadius: '50%', bgcolor: pc.dot }} />
                <Typography variant="caption" sx={{ color: pc.color, fontWeight: 600 }}>{ticket.priority}</Typography>
              </Box>
              
              {ticket.assignedTo && (
                <>
                  <Box sx={{ width: 4, height: 4, borderRadius: '50%', bgcolor: '#D1D5DB' }} />
                  <Chip
                    icon={<AssignmentIndIcon sx={{ fontSize: '0.75rem !important', color: '#F59E0B' }} />}
                    label={`Assigned: ${ticket.assignedTo}`}
                    size="small"
                    sx={{ height: 22, bgcolor: '#FFFBEB', color: '#D97706', border: '1px solid #FDE68A', fontSize: '0.7rem', fontWeight: 600 }}
                  />
                </>
              )}
            </Box>
            <Typography variant="body1" sx={{ fontWeight: 700, color: '#111827', lineHeight: 1.3, fontSize: '1.1rem' }}>
              {ticket.title}
            </Typography>
          </Box>

          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Chip
              label={sc.label}
              size="small"
              sx={{ bgcolor: sc.bg, color: sc.color, border: `1px solid ${sc.border}`, fontWeight: 700, fontSize: '0.7rem' }}
            />
            {isAdmin && (
              <Tooltip title="Delete ticket (Admin)">
                <IconButton size="small" onClick={handleDeleteTicket} sx={{ color: '#9CA3AF', '&:hover': { color: '#EF4444', bgcolor: '#FEF2F2' } }}>
                  <DeleteOutlineIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            )}
            <Tooltip title={expanded ? 'Collapse' : 'Expand details'}>
              <IconButton size="small" onClick={handleExpand} sx={{ color: '#9CA3AF', '&:hover': { color: '#111827', bgcolor: '#F3F4F6' } }}>
                {expanded ? <ExpandLessIcon fontSize="small" /> : <ExpandMoreIcon fontSize="small" />}
              </IconButton>
            </Tooltip>
          </Box>
        </Box>

        {/* Description */}
        <Typography variant="body2" sx={{ color: '#4B5563', lineHeight: 1.6, mb: 2 }}>
          {ticket.description}
        </Typography>

        {/* Admin Assign Agent Controls & Created Date */}
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 1.5 }}>
          <Typography variant="caption" sx={{ color: '#9CA3AF' }}>
            Created by: <span style={{ fontWeight: 500, color: '#6B7280' }}>{ticket.createdBy || 'User'}</span> · {formatDate(ticket.createdAt)}
          </Typography>

          {/* Admin Assign Agent Dropdown */}
          {isAdmin && (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Typography variant="caption" sx={{ color: '#6B7280', fontWeight: 600 }}>Assign to:</Typography>
              <TextField
                select
                size="small"
                value={assignedAgent}
                onChange={e => handleAssignAgent(e.target.value)}
                sx={{ width: 180, ...inputSx, '& .MuiOutlinedInput-root': { height: 32, fontSize: '0.75rem' } }}
                SelectProps={{ MenuProps: { PaperProps: { sx: { bgcolor: '#ffffff', color: '#111827', borderRadius: '12px', mt: 0.5 } } } }}
              >
                <MenuItem value="" sx={{ fontSize: '0.85rem' }}>Unassigned</MenuItem>
                {agents.map(ag => (
                  <MenuItem key={ag.id} value={ag.email} sx={{ fontSize: '0.85rem' }}>
                    {ag.name}
                  </MenuItem>
                ))}
              </TextField>
            </Box>
          )}
        </Box>

        {/* Status Transitions — AGENT and ADMIN only */}
        {(isAdmin || isAgent) && transitions.length > 0 && (
          <Box sx={{ display: 'flex', gap: 1, mt: 2, flexWrap: 'wrap' }}>
            {transitions.map(t => {
              const tc = STATUS_CONFIG[t];
              return (
                <Button
                  key={t}
                  size="small"
                  variant="outlined"
                  onClick={() => handleStatusChange(t)}
                  sx={{
                    fontSize: '0.75rem', fontWeight: 600, borderRadius: '8px', textTransform: 'none', py: 0.4, px: 1.5,
                    borderColor: tc?.border, color: tc?.color,
                    '&:hover': { bgcolor: tc?.bg, borderColor: tc?.color },
                  }}
                >
                  Move to {tc?.label}
                </Button>
              );
            })}
          </Box>
        )}

        {/* Expandable Panel */}
        <Collapse in={expanded}>
          <Divider sx={{ borderColor: '#F3F4F6', mt: 2.5, mb: 2.5 }} />

          {/* Tab Switcher */}
          <Box sx={{ display: 'flex', gap: 1.5, mb: 3 }}>
            {[
              { key: 'comments',    icon: <CommentIcon sx={{ fontSize: '1rem' }} />,    label: `Comments (${ticket.comments?.length || 0})` },
              { key: 'attachments', icon: <AttachFileIcon sx={{ fontSize: '1rem' }} />, label: `Attachments (${attachments.length})` },
            ].map(tab => (
              <Button
                key={tab.key}
                size="small"
                startIcon={tab.icon}
                onClick={() => handleTabChange(tab.key)}
                sx={{
                  textTransform: 'none', fontSize: '0.85rem',
                  fontWeight: activeTab === tab.key ? 600 : 500,
                  borderRadius: '8px', px: 2, py: 0.5,
                  color: activeTab === tab.key ? '#111827' : '#6B7280',
                  bgcolor: activeTab === tab.key ? '#F3F4F6' : 'transparent',
                  '&:hover': { bgcolor: '#F3F4F6' },
                }}
              >
                {tab.label}
              </Button>
            ))}
          </Box>

          {/* ── COMMENTS TAB ─────────────────────────────────────────────── */}
          {activeTab === 'comments' && (
            <Box>
              {ticket.comments?.length > 0 ? (
                ticket.comments.map((c, idx) => (
                  <Box
                    key={idx}
                    sx={{
                      bgcolor: '#F9FAFB',
                      borderLeft: '3px solid #D1D5DB',
                      borderRadius: '0 12px 12px 0',
                      p: 2, mb: 1.5,
                    }}
                  >
                    <Typography variant="caption" sx={{ color: '#111827', fontWeight: 700 }}>{c.author}</Typography>
                    <Typography variant="body2" sx={{ color: '#4B5563', mt: 0.5, lineHeight: 1.5 }}>{c.content}</Typography>
                  </Box>
                ))
              ) : (
                <Typography variant="body2" sx={{ color: '#9CA3AF', mb: 2 }}>
                  No comments yet. Be the first to start the conversation.
                </Typography>
              )}

              <Box sx={{ display: 'flex', gap: 1.5, mt: 2 }}>
                <TextField
                  fullWidth size="small" placeholder="Write a comment..."
                  value={comment}
                  onChange={e => setComment(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && !e.shiftKey && handleComment()}
                  sx={inputSx}
                />
                <Button
                  variant="contained" 
                  disabled={submitting || !comment.trim()}
                  onClick={handleComment}
                  sx={{
                    borderRadius: '12px', textTransform: 'none', fontWeight: 600, px: 3,
                    backgroundColor: '#111827',
                    color: '#FFFFFF',
                    '&:hover': { backgroundColor: '#374151' },
                    '&:disabled': { backgroundColor: '#F3F4F6', color: '#9CA3AF' },
                  }}
                >
                  Reply
                </Button>
              </Box>
            </Box>
          )}

          {/* ── ATTACHMENTS TAB ──────────────────────────────────────────── */}
          {activeTab === 'attachments' && (
            <Box>
              {/* Upload Button */}
              <Box sx={{ mb: 2.5 }}>
                <Button
                  component="label"
                  variant="outlined"
                  size="small"
                  startIcon={<CloudUploadIcon />}
                  disabled={uploading}
                  sx={{
                    borderRadius: '10px', textTransform: 'none', fontWeight: 600, fontSize: '0.85rem',
                    borderColor: '#E5E7EB', color: '#111827', px: 2, py: 0.8,
                    '&:hover': { bgcolor: '#F9FAFB', borderColor: '#D1D5DB' },
                  }}
                >
                  {uploading ? 'Uploading...' : 'Upload File'}
                  <input type="file" hidden onChange={handleFileUpload} />
                </Button>
                <Typography variant="caption" sx={{ ml: 2, color: '#9CA3AF' }}>
                  Max 10 MB per file
                </Typography>
              </Box>

              {/* Upload Progress */}
              {uploading && (
                <Box sx={{ mb: 2 }}>
                  <LinearProgress
                    variant="determinate"
                    value={uploadPct}
                    sx={{
                      borderRadius: 2, height: 6,
                      bgcolor: '#F3F4F6',
                      '& .MuiLinearProgress-bar': { bgcolor: '#111827' },
                    }}
                  />
                  <Typography variant="caption" sx={{ color: '#6B7280', mt: 0.5, display: 'block' }}>
                    {uploadPct}% Uploaded
                  </Typography>
                </Box>
              )}

              {/* Attachment List */}
              {attachLoad ? (
                <Skeleton variant="rounded" height={60} sx={{ bgcolor: '#F9FAFB', borderRadius: 2 }} />
              ) : attachments.length > 0 ? (
                <List dense disablePadding>
                  {attachments.map(a => (
                    <ListItem
                      key={a.id}
                      sx={{
                        bgcolor: '#FFFFFF',
                        borderRadius: '12px', mb: 1,
                        border: '1px solid #F3F4F6',
                        '&:hover': { borderColor: '#E5E7EB', bgcolor: '#F9FAFB' },
                      }}
                    >
                      <AttachFileIcon sx={{ color: '#6B7280', fontSize: '1.1rem', mr: 1.5 }} />
                      <ListItemText
                        primary={
                          <Typography variant="body2" sx={{ color: '#111827', fontWeight: 600, fontSize: '0.85rem' }}>
                            {a.originalFileName}
                          </Typography>
                        }
                        secondary={
                          <Typography variant="caption" sx={{ color: '#6B7280' }}>
                            {formatBytes(a.fileSize)} · {a.contentType}
                          </Typography>
                        }
                      />
                      <ListItemSecondaryAction>
                        <Tooltip title="Download">
                          <IconButton
                            size="small"
                            href={ApiService.downloadAttachment(a.id)}
                            target="_blank"
                            rel="noopener noreferrer"
                            sx={{ color: '#6B7280', '&:hover': { color: '#111827', bgcolor: '#F3F4F6' }, mr: 0.5 }}
                          >
                            <FileDownloadIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Delete">
                          <IconButton
                            size="small"
                            onClick={() => handleDeleteAttachment(a.id, a.originalFileName)}
                            sx={{ color: '#9CA3AF', '&:hover': { color: '#EF4444', bgcolor: '#FEF2F2' } }}
                          >
                            <DeleteOutlineIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      </ListItemSecondaryAction>
                    </ListItem>
                  ))}
                </List>
              ) : (
                <Typography variant="body2" sx={{ color: '#9CA3AF' }}>
                  No attachments yet. Upload a file to provide more context.
                </Typography>
              )}
            </Box>
          )}
        </Collapse>
      </Box>
    </Box>
  );
}

// ── TicketQueue ───────────────────────────────────────────────────────────────
export default function TicketQueue({ tickets, loading, onRefresh, onToast }) {
  const { user, isAdmin, isAgent, isUser } = useAuth();
  const [search,         setSearch]   = useState('');
  const [filterStatus,   setFilter]   = useState('');
  const [filterPriority, setFilterP]  = useState('');
  const [agents,         setAgents]   = useState([]);

  useEffect(() => {
    if (isAdmin) {
      ApiService.getUsers()
        .then(res => {
          if (res.success && Array.isArray(res.data)) {
            setAgents(res.data.filter(u => u.role === 'AGENT'));
          }
        })
        .catch(() => {});
    }
  }, [isAdmin]);

  const filtered = tickets.filter(t => {
    const q = search.toLowerCase();
    const matchesSearch = t.title.toLowerCase().includes(q) || t.description.toLowerCase().includes(q);
    const matchesStatus = filterStatus ? t.status === filterStatus : true;
    const matchesPriority = filterPriority ? t.priority === filterPriority : true;

    let matchesRole = true;
    if (isAgent) {
      matchesRole = t.assignedTo === user?.email || t.assignedTo === user?.name;
    } else if (isUser) {
      matchesRole = t.createdBy === user?.email || t.createdBy === user?.name;
    }

    return matchesSearch && matchesStatus && matchesPriority && matchesRole;
  });

  return (
    <Card
      elevation={0}
      sx={{
        background: '#FFFFFF',
        border: '1px solid #F3F4F6',
        borderRadius: '24px'
      }}
    >
      <CardContent sx={{ p: { xs: 3, sm: 4 } }}>
        {/* Header */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 4 }}>
          <Box 
            sx={{ 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center',
              width: 48, 
              height: 48, 
              bgcolor: '#F9FAFB', 
              borderRadius: '14px',
              border: '1px solid #F3F4F6',
              color: '#111827'
            }}
          >
            <ConfirmationNumberOutlinedIcon />
          </Box>
          <Box>
            <Typography variant="h5" sx={{ fontWeight: 800, color: '#111827', letterSpacing: '-0.02em', mb: 0.5 }}>
              {isAgent ? 'Assigned Ticket Queue' : isUser ? 'My Created Tickets' : 'Live Ticket Queue'}
            </Typography>
            <Typography variant="body2" sx={{ color: '#6B7280', fontSize: '0.9rem' }}>
              {filtered.length} ticket{filtered.length !== 1 ? 's' : ''} showing
            </Typography>
          </Box>
          {filterStatus && (
            <Chip
              label={STATUS_CONFIG[filterStatus]?.label || filterStatus} 
              size="small" 
              onDelete={() => setFilter('')}
              sx={{ 
                ml: 'auto', 
                bgcolor: STATUS_CONFIG[filterStatus]?.bg, 
                color: STATUS_CONFIG[filterStatus]?.color,
                fontWeight: 600,
                borderRadius: '8px'
              }}
            />
          )}
        </Box>

        {/* Filter Toolbar */}
        <Box sx={{ display: 'flex', gap: 2, mb: 4, flexWrap: 'wrap' }}>
          <TextField
            size="small" placeholder="Search tickets..."
            value={search} onChange={e => setSearch(e.target.value)}
            sx={{ flex: 1, minWidth: 200, ...inputSx }}
            InputProps={{ startAdornment: <InputAdornment position="start"><SearchIcon sx={{ color: '#9CA3AF', fontSize: '1.2rem' }} /></InputAdornment> }}
          />
          <TextField
            select size="small" value={filterStatus} onChange={e => setFilter(e.target.value)}
            sx={{ width: 160, ...inputSx }}
            SelectProps={{ MenuProps: { PaperProps: { sx: { bgcolor: '#ffffff', color: '#111827', borderRadius: '12px', mt: 0.5 } } } }}
            label="Status"
          >
            <MenuItem value="" sx={{ fontSize: '0.9rem' }}>All Status</MenuItem>
            {Object.keys(STATUS_CONFIG).map(s => <MenuItem key={s} value={s} sx={{ fontSize: '0.9rem' }}>{STATUS_CONFIG[s].label}</MenuItem>)}
          </TextField>
          <TextField
            select size="small" value={filterPriority} onChange={e => setFilterP(e.target.value)}
            sx={{ width: 160, ...inputSx }}
            SelectProps={{ MenuProps: { PaperProps: { sx: { bgcolor: '#ffffff', color: '#111827', borderRadius: '12px', mt: 0.5 } } } }}
            label="Priority"
          >
            <MenuItem value="" sx={{ fontSize: '0.9rem' }}>All Priority</MenuItem>
            {Object.keys(PRIORITY_CONFIG).map(p => <MenuItem key={p} value={p} sx={{ fontSize: '0.9rem' }}>{p}</MenuItem>)}
          </TextField>
        </Box>

        <Divider sx={{ borderColor: '#F3F4F6', mb: 4 }} />

        {/* Ticket List */}
        {loading ? (
          [...Array(3)].map((_, i) => (
            <Skeleton key={i} variant="rounded" height={140} sx={{ bgcolor: '#F9FAFB', mb: 2.5, borderRadius: '16px' }} />
          ))
        ) : filtered.length === 0 ? (
          <Box sx={{ textAlign: 'center', py: 8, bgcolor: '#F9FAFB', borderRadius: '16px', border: '1px dashed #E5E7EB' }}>
            <Typography variant="h6" sx={{ color: '#4B5563', mb: 1, fontWeight: 600 }}>No tickets found</Typography>
            <Typography variant="body2" sx={{ color: '#9CA3AF' }}>
              {isAgent
                ? 'No tickets currently assigned to you.'
                : isUser
                ? 'You have not created any IT support tickets yet.'
                : 'Try adjusting your search filters to find what you are looking for.'}
            </Typography>
          </Box>
        ) : (
          filtered.map(t => (
            <TicketCard key={t.id} ticket={t} agents={agents} onRefresh={onRefresh} onToast={onToast} />
          ))
        )}
      </CardContent>
    </Card>
  );
}