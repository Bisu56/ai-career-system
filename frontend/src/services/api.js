import axios from "axios";

const api = axios.create({
  // Configurable so it doesn't collide with other local Laravel apps.
  // Override via frontend/.env -> VITE_API_URL=http://localhost:PORT/api
  baseURL: import.meta.env.VITE_API_URL || "http://localhost:8000/api",
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

const PUBLIC_PATHS = ["/", "/login", "/register"];
let refreshing = null;

const refreshToken = () => {
  refreshing ??= api
    .post("/refresh", null, { skipAuthRefresh: true })
    .then((res) => {
      localStorage.setItem("token", res.data.token);
      return res.data.token;
    })
    .finally(() => {
      refreshing = null;
    });
  return refreshing;
};

// On any 401 the token is missing/expired — clear it and send the user to login.
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const { response, config } = error;
    if (!response || response.status !== 401 || !config) {
      return Promise.reject(error);
    }

    if (!config.skipAuthRefresh && !config.retried && localStorage.getItem("token")) {
      const token = await refreshToken().catch(() => null);
      if (token) {
        config.retried = true;
        config.headers.Authorization = `Bearer ${token}`;
        return api(config);
      }
    }

    const hadSession = Boolean(localStorage.getItem("token"));
    localStorage.removeItem("token");

    const path = window.location.pathname;
    if (hadSession && !PUBLIC_PATHS.includes(path)) {
      const next = encodeURIComponent(path + window.location.search);
      window.location.href = `/login?expired=1&next=${next}`;
    }
    return Promise.reject(error);
  }
);

export default api;
