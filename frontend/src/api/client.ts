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
