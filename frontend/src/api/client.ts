import axios from 'axios';
import { useAuthStore } from '../store/authStore';

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:8080',
});

// Injeta o token em toda requisição, se existir — assim cada função de
// API não precisa se preocupar em passar o header manualmente. Rotas
// públicas (sem token) simplesmente ignoram esse header.
api.interceptors.request.use((config) => {
  const token = useAuthStore.getState().token;
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Se o token expirou ou foi invalidado, o backend devolve 401 — desloga
// automaticamente em vez de deixar o painel preso em chamadas que nunca
// vão funcionar.
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      useAuthStore.getState().logout();
      if (window.location.pathname.startsWith('/admin')) {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);