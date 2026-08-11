import axios from 'axios';

const API_BASE = import.meta.env.VITE_API_BASE || '/api/v1';

const http = axios.create({ baseURL: API_BASE, timeout: 15000 });
const httpMultipart = axios.create({ baseURL: API_BASE, timeout: 30000 });

// Attach JWT + role headers to every request
const attachHeaders = (config) => {
  const token = localStorage.getItem('auth_token');
  const role  = localStorage.getItem('auth_role');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  if (role)  config.headers['X-User-Role'] = role;
  return config;
};
http.interceptors.request.use(attachHeaders);
httpMultipart.interceptors.request.use(attachHeaders);

http.interceptors.response.use(
  r => r,
  e => {
    console.error('[API]', e?.response?.status, e?.config?.url, e?.response?.data?.message || e.message);
    return Promise.reject(e);
  }
);

export const ApiService = {

  // ── Auth ──────────────────────────────────────────────────────────────────
  login: async (email, password) => {
    const res = await http.post('/auth/login', { email, password });
    return res.data;
  },

  // Public: USER self-registration only
  register: async (name, email, password) => {
    const res = await http.post('/auth/register', { name, email, password, role: 'USER' });
    return res.data;
  },

  // Admin only: create an AGENT account
  createAgent: async (name, email, password) => {
    const res = await http.post('/auth/agents', { name, email, password, role: 'AGENT' });
    return res.data;
  },

  // Admin only: list all users
  getUsers: async () => {
    const res = await http.get('/auth/users');
    return res.data;
  },

  // Admin only: list only agents
  getAgents: async () => {
    const res = await http.get('/auth/agents');
    return res.data;
  },

  // Admin only: delete a user/agent
  deleteUser: async (id) => {
    const res = await http.delete(`/auth/users/${id}`);
    return res.data;
  },

  // ── Dashboard ─────────────────────────────────────────────────────────────
  getDashboardSummary: async () => {
    const res = await http.get('/dashboard/summary');
    return res.data;
  },

  // ── Tickets ───────────────────────────────────────────────────────────────
  getTickets: async (params = {}) => {
    const res = await http.get('/tickets', { params });
    return res.data;
  },

  createTicket: async (payload) => {
    const res = await http.post('/tickets', payload);
    return res.data;
  },

  updateStatus: async (id, status) => {
    const res = await http.patch(`/tickets/${id}/status`, { status });
    return res.data;
  },

  assignTicket: async (id, assignedTo) => {
    const res = await http.patch(`/tickets/${id}/assign`, { assignedTo });
    return res.data;
  },

  unassignTicket: async (id) => {
    const res = await http.patch(`/tickets/${id}/assign`, { assignedTo: '' });
    return res.data;
  },

  deleteTicket: async (id) => {
    const res = await http.delete(`/tickets/${id}`);
    return res.data;
  },

  // ── Comments (embedded in ticket-service) ────────────────────────────────
  addComment: async (ticketId, content, author) => {
    const res = await http.post(`/tickets/${ticketId}/comments`, { content, author });
    return res.data;
  },

  // ── Attachments (Items 23 & 24 — Presigned S3 Upload + Lambda event trigger) ─────
  getAttachments: async (ticketId) => {
    const res = await http.get(`/attachments/ticket/${ticketId}`);
    return res.data;
  },

  uploadAttachment: async (ticketId, file) => {
    const contentType = file.type || 'application/octet-stream';

    // Step 1: Request presigned S3 PUT URL from attachment-service
    const presignRes = await http.get('/attachments/presigned-url', {
      params: {
        ticketId,
        fileName: file.name,
        contentType
      }
    });

    const payload = presignRes.data?.data || presignRes.data;
    const { uploadUrl, storageUrl, key } = payload;

    // Step 2: Upload file directly from browser to S3 bucket via presigned URL
    await axios.put(uploadUrl, file, {
      headers: { 'Content-Type': contentType }
    });

    // Step 3: Record metadata in DB (S3 ObjectCreated event also triggers Python Lambda)
    try {
      await http.post('/attachments/record', {
        ticketId: Number(ticketId),
        fileName: file.name,
        originalFileName: file.name,
        storageUrl,
        fileSize: file.size,
        contentType
      });
    } catch (err) {
      console.log('[S3 Presigned Upload] Record endpoint call deferred to S3 Lambda event:', err.message);
    }

    return {
      success: true,
      message: 'File uploaded successfully to S3',
      data: { storageUrl, key, fileName: file.name }
    };
  },

  downloadAttachment: (attachmentId) => `${API_BASE}/attachments/${attachmentId}/download`,

  deleteAttachment: async (attachmentId) => {
    const res = await http.delete(`/attachments/${attachmentId}`);
    return res.data;
  },

  // ── Health ────────────────────────────────────────────────────────────────
  checkHealth: async () => {
    const res = await http.get('/actuator/health');
    return res.data;
  },
};
