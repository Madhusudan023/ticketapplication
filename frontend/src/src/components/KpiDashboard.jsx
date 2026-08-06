import React, { useState } from 'react';
import { Grid, Card, CardContent, Typography, Box, Skeleton, IconButton, Tooltip } from '@mui/material';

// Icons
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import PendingActionsIcon from '@mui/icons-material/PendingActions';
import SyncIcon from '@mui/icons-material/Sync';
import VerifiedIcon from '@mui/icons-material/Verified';
import LockIcon from '@mui/icons-material/Lock';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';
import PriorityHighIcon from '@mui/icons-material/PriorityHigh';
import RefreshIcon from '@mui/icons-material/Refresh';
import ArrowUpwardIcon from '@mui/icons-material/ArrowUpward';
import ArrowDownwardIcon from '@mui/icons-material/ArrowDownward';
import RemoveIcon from '@mui/icons-material/Remove';

const CARDS = (stats) => [
  {
    id: 'total',
    title: 'Total Tickets',
    value: stats?.totalTickets ?? 0,
    color: '#0F172A',
    bg: '#F8FAFC',
    iconColor: '#3B82F6',
    icon: <TrendingUpIcon />,
    info: 'Total volume all time',
    trend: 'up',
    trendValue: '12%',
  },
  {
    id: 'open',
    title: 'Open',
    value: stats?.statusCounts?.OPEN ?? 0,
    color: '#2563EB',
    bg: '#EFF6FF',
    iconColor: '#2563EB',
    icon: <PendingActionsIcon />,
    info: 'Awaiting assignment',
    trend: 'up',
    trendValue: '5%',
  },
  {
    id: 'in_progress',
    title: 'In Progress',
    value: stats?.statusCounts?.IN_PROGRESS ?? 0,
    color: '#D97706',
    bg: '#FFFBEB',
    iconColor: '#D97706',
    icon: <SyncIcon />,
    info: 'Currently being worked on',
    trend: 'neutral',
    trendValue: '0%',
  },
  {
    id: 'resolved',
    title: 'Resolved',
    value: stats?.statusCounts?.RESOLVED ?? 0,
    color: '#059669',
    bg: '#ECFDF5',
    iconColor: '#059669',
    icon: <VerifiedIcon />,
    info: 'Pending user confirmation',
    trend: 'up',
    trendValue: '8%',
  },
  {
    id: 'closed',
    title: 'Closed',
    value: stats?.statusCounts?.CLOSED ?? 0,
    color: '#475569',
    bg: '#F1F5F9',
    iconColor: '#475569',
    icon: <LockIcon />,
    info: 'Successfully completed',
    trend: 'up',
    trendValue: '15%',
  },
  {
    id: 'urgent',
    title: 'Urgent',
    value: stats?.priorityCounts?.URGENT ?? 0,
    color: '#DC2626',
    bg: '#FEF2F2',
    iconColor: '#DC2626',
    icon: <ErrorOutlineIcon />,
    info: 'Needs immediate action',
    trend: 'down',
    trendValue: '2%',
  },
  {
    id: 'high',
    title: 'High Priority',
    value: stats?.priorityCounts?.HIGH ?? 0,
    color: '#EA580C',
    bg: '#FFF7ED',
    iconColor: '#EA580C',
    icon: <PriorityHighIcon />,
    info: 'Critical business impact',
    trend: 'down',
    trendValue: '4%',
  },
];

export default function KpiDashboard({ stats, loading, onRefreshData }) {
  const cards = CARDS(stats);
  const [refreshingId, setRefreshingId] = useState(null);

  // Handle individual card refresh animation
  const handleRefresh = (id) => {
    setRefreshingId(id);
    if (onRefreshData) onRefreshData(id);
    
    // Remove rotation class after animation completes (approx 1s)
    setTimeout(() => setRefreshingId(null), 1000);
  };

  const getTrendIcon = (trend) => {
    if (trend === 'up') return <ArrowUpwardIcon sx={{ fontSize: '0.85rem' }} />;
    if (trend === 'down') return <ArrowDownwardIcon sx={{ fontSize: '0.85rem' }} />;
    return <RemoveIcon sx={{ fontSize: '0.85rem' }} />;
  };

  const getTrendColor = (trend) => {
    if (trend === 'up') return '#059669'; // Green
    if (trend === 'down') return '#DC2626'; // Red
    return '#64748B'; // Gray
  };

  return (
    <Grid container spacing={2.5} sx={{ mb: 4 }}>
      {cards.map((card, i) => (
        <Grid item xs={12} sm={6} md={4} lg={3} key={card.id || i}>
          <Card
            elevation={0}
            sx={{
              background: '#FFFFFF',
              border: '1px solid #E2E8F0',
              borderRadius: '16px',
              height: '100%',
              display: 'flex',
              flexDirection: 'column',
              transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
              '&:hover': {
                transform: 'translateY(-4px)',
                borderColor: `${card.iconColor}50`,
              },
            }}
          >
            <CardContent sx={{ p: 2.5, flexGrow: 1, display: 'flex', flexDirection: 'column', '&:last-child': { pb: 2.5 } }}>
              
              {/* Header: Title & Refresh Action */}
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                <Typography variant="subtitle2" sx={{ color: '#64748B', fontWeight: 600, fontSize: '0.8rem' }}>
                  {card.title}
                </Typography>
                
                <Tooltip title="Refresh metric" arrow placement="top">
                  <IconButton 
                    size="small" 
                    onClick={() => handleRefresh(card.id)}
                    sx={{ 
                      p: 0.5, 
                      mt: -0.5,
                      mr: -0.5,
                      color: '#94A3B8',
                      '&:hover': { color: card.iconColor, background: card.bg },
                      '& .MuiSvgIcon-root': {
                        fontSize: '1.1rem',
                        transition: 'transform 0.5s ease',
                        transform: refreshingId === card.id ? 'rotate(180deg)' : 'rotate(0deg)'
                      }
                    }}
                  >
                    <RefreshIcon />
                  </IconButton>
                </Tooltip>
              </Box>

              {/* Body: Value & Icon */}
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', mb: 2 }}>
                {loading ? (
                  <Skeleton variant="rounded" width={80} height={40} sx={{ bgcolor: '#F1F5F9', borderRadius: 2 }} />
                ) : (
                  <Typography variant="h3" sx={{ fontWeight: 700, color: card.color, lineHeight: 1 }}>
                    {card.value}
                  </Typography>
                )}
                
                <Box
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    width: 44,
                    height: 44,
                    borderRadius: '12px',
                    backgroundColor: card.bg,
                    color: card.iconColor,
                    '& svg': { fontSize: '1.5rem' },
                  }}
                >
                  {card.icon}
                </Box>
              </Box>

              <Box sx={{ flexGrow: 1 }} /> {/* Spacer to push footer to bottom */}

              {/* Footer: Small Info & Trend */}
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', pt: 1.5, borderTop: '1px dashed #E2E8F0' }}>
                <Typography variant="caption" sx={{ color: '#94A3B8', fontSize: '0.7rem' }}>
                  {card.info}
                </Typography>
                
                {!loading && (
                  <Box 
                    sx={{ 
                      display: 'flex', 
                      alignItems: 'center', 
                      gap: 0.2, 
                      color: getTrendColor(card.trend),
                      backgroundColor: `${getTrendColor(card.trend)}15`,
                      px: 0.8,
                      py: 0.2,
                      borderRadius: '4px',
                      fontWeight: 600,
                      fontSize: '0.7rem'
                    }}
                  >
                    {getTrendIcon(card.trend)}
                    {card.trendValue}
                  </Box>
                )}
              </Box>

            </CardContent>
          </Card>
        </Grid>
      ))}
    </Grid>
  );
}