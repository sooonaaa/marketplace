import axios from 'axios';
import { API_BASE_URL } from '../constants/api';
import { getAccessToken } from '../utils/authStorage';

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
});

apiClient.interceptors.request.use((config) => {
  const token = getAccessToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});
