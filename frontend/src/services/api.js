import axios from 'axios';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const api = axios.create({
  baseURL: API,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Grants
export const getGrants = () => api.get('/grants');
export const getGrant = (id) => api.get(`/grants/${id}`);
export const createGrant = (data) => api.post('/grants', data);
export const updateGrant = (id, data) => api.put(`/grants/${id}`, data);
export const deleteGrant = (id) => api.delete(`/grants/${id}`);

// Tasks
export const getTasks = (grantId) => api.get('/tasks', { params: { grant_id: grantId } });
export const createTask = (data) => api.post('/tasks', data);
export const updateTask = (id, isCompleted) => api.put(`/tasks/${id}`, null, { params: { is_completed: isCompleted } });
export const deleteTask = (id) => api.delete(`/tasks/${id}`);

// Financials
export const getFinancials = (grantId) => api.get('/financials', { params: { grant_id: grantId } });
export const createFinancial = (data) => api.post('/financials', data);
export const deleteFinancial = (id) => api.delete(`/financials/${id}`);

// Risks
export const getRisks = (grantId) => api.get('/risks', { params: { grant_id: grantId } });
export const createRisk = (data) => api.post('/risks', data);
export const deleteRisk = (id) => api.delete(`/risks/${id}`);

// Checklist
export const getChecklist = (grantId) => api.get('/checklist', { params: { grant_id: grantId } });
export const createChecklistItem = (data) => api.post('/checklist', data);
export const updateChecklistItem = (id, isCompleted) => api.put(`/checklist/${id}`, null, { params: { is_completed: isCompleted } });
export const deleteChecklistItem = (id) => api.delete(`/checklist/${id}`);

// Budget Items
export const getBudgetItems = (grantId) => api.get('/budget-items', { params: { grant_id: grantId } });
export const createBudgetItem = (data) => api.post('/budget-items', data);
export const deleteBudgetItem = (id) => api.delete(`/budget-items/${id}`);

// Proposals
export const getProposals = (grantId) => api.get('/proposals', { params: { grant_id: grantId } });
export const createProposal = (data) => api.post('/proposals', data);
export const updateProposal = (id, content) => api.put(`/proposals/${id}`, null, { params: { content } });
export const deleteProposal = (id) => api.delete(`/proposals/${id}`);

// Reports
export const getReports = (grantId) => api.get('/reports', { params: { grant_id: grantId } });
export const createReport = (data) => api.post('/reports', data);
export const deleteReport = (id) => api.delete(`/reports/${id}`);

// Documents
export const getDocuments = (grantId) => api.get('/documents', { params: { grant_id: grantId } });
export const createDocument = (data) => api.post('/documents', data);
export const deleteDocument = (id) => api.delete(`/documents/${id}`);

// Settings
export const getSettings = () => api.get('/settings');
export const updateSettings = (data) => api.put('/settings', data);

// AI Endpoints
export const draftProposal = (data) => api.post('/ai/draft-proposal', data);
export const generateReport = (data) => api.post('/ai/generate-report', data);
export const parseDocument = (data) => api.post('/ai/parse-document', data);
export const analyzeRisks = (data) => api.post('/ai/analyze-risks', data);
export const portfolioAnalysis = (data) => api.post('/ai/portfolio-analysis', data);
export const grantDiscovery = (data) => api.post('/ai/grant-discovery', data);
export const budgetForecast = (data) => api.post('/ai/budget-forecast', data);

// Data Management
export const seedData = () => api.post('/seed');
export const exportData = () => api.get('/export');
export const importData = (data) => api.post('/import', data);
export const clearAllData = () => api.delete('/clear-all');

export default api;
