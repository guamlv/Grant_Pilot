import axios from 'axios';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const api = axios.create({ baseURL: `${BACKEND_URL}/api` });

// Dashboard
export const getDashboard = () => api.get('/dashboard');

// Content Library
export const getContent = (category) => api.get('/content', { params: { category } });
export const createContent = (data) => api.post('/content', data);
export const updateContent = (id, data) => api.put(`/content/${id}`, data);
export const deleteContent = (id) => api.delete(`/content/${id}`);

// Funders
export const getFunders = () => api.get('/funders');
export const getFunder = (id) => api.get(`/funders/${id}`);
export const createFunder = (data) => api.post('/funders', data);
export const updateFunder = (id, data) => api.put(`/funders/${id}`, data);
export const deleteFunder = (id) => api.delete(`/funders/${id}`);

// Grants
export const getGrants = (stage) => api.get('/grants', { params: { stage } });
export const getGrant = (id) => api.get(`/grants/${id}`);
export const createGrant = (data) => api.post('/grants', data);
export const updateGrant = (id, data) => api.put(`/grants/${id}`, data);
export const deleteGrant = (id) => api.delete(`/grants/${id}`);

// Reporting
export const getReporting = (grantId) => api.get('/reporting', { params: { grant_id: grantId } });
export const createReporting = (data) => api.post('/reporting', data);
export const updateReporting = (id, status, submittedDate) => api.put(`/reporting/${id}`, null, { params: { status, submitted_date: submittedDate } });
export const deleteReporting = (id) => api.delete(`/reporting/${id}`);

// Compliance
export const getCompliance = (grantId) => api.get('/compliance', { params: { grant_id: grantId } });
export const createCompliance = (data) => api.post('/compliance', data);
export const updateCompliance = (id, isCompleted) => api.put(`/compliance/${id}`, null, { params: { is_completed: isCompleted } });
export const deleteCompliance = (id) => api.delete(`/compliance/${id}`);

// Budgets
export const getBudgets = (grantId) => api.get('/budgets', { params: { grant_id: grantId } });
export const createBudget = (data) => api.post('/budgets', data);
export const updateBudget = (id, data) => api.put(`/budgets/${id}`, data);
export const deleteBudget = (id) => api.delete(`/budgets/${id}`);

// Budget Templates
export const getBudgetTemplates = () => api.get('/budget-templates');
export const getBudgetTemplate = (id) => api.get(`/budget-templates/${id}`);

// Outcomes
export const getOutcomes = (program) => api.get('/outcomes', { params: { program } });
export const createOutcome = (data) => api.post('/outcomes', data);
export const updateOutcome = (id, data) => api.put(`/outcomes/${id}`, data);
export const deleteOutcome = (id) => api.delete(`/outcomes/${id}`);

// Settings
export const getSettings = () => api.get('/settings');
export const updateSettings = (data) => api.put('/settings', data);

// AI
export const extractAward = (data) => api.post('/ai/extract-award', data);
export const aiDraft = (data) => api.post('/ai/draft', data);

// Calendar
export const getCalendarEvents = () => api.get('/calendar/export');

// Data
export const exportData = () => api.get('/export');
export const importData = (data) => api.post('/import', data);

export default api;
