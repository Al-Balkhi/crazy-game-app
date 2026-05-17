import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { settingsAPI } from '../lib/api';

const AUTH_SESSION_KEY = 'crazy_game_authenticated';
const TIME_FORMAT_KEY = 'crazy_game_time_format';

const SettingsContext = createContext(null);

export function SettingsProvider({ children }) {
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [timeFormat, setTimeFormat] = useState(() => {
    return localStorage.getItem(TIME_FORMAT_KEY) || '12h';
  });

  const refreshSettings = useCallback(async () => {
    const data = await settingsAPI.get();
    setSettings(data);

    if (!data.password_enabled) {
      sessionStorage.removeItem(AUTH_SESSION_KEY);
      setIsAuthenticated(true);
    } else {
      setIsAuthenticated(sessionStorage.getItem(AUTH_SESSION_KEY) === '1');
    }

    return data;
  }, []);

  useEffect(() => {
    refreshSettings()
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [refreshSettings]);

  const login = useCallback(async (password) => {
    const result = await settingsAPI.auth(password);
    if (!result?.success) {
      throw new Error(result?.message || 'Invalid password');
    }
    sessionStorage.setItem(AUTH_SESSION_KEY, '1');
    setIsAuthenticated(true);
  }, []);

  const setTimeFormatPreference = useCallback((format) => {
    setTimeFormat(format);
    localStorage.setItem(TIME_FORMAT_KEY, format);
  }, []);

  const logout = useCallback(() => {
    sessionStorage.removeItem(AUTH_SESSION_KEY);
    setIsAuthenticated(false);
  }, []);

  const needsLogin = Boolean(settings?.password_enabled) && !isAuthenticated;

  return (
    <SettingsContext.Provider
      value={{
        settings,
        loading,
        isAuthenticated,
        needsLogin,
        timeFormat,
        refreshSettings,
        login,
        logout,
        setTimeFormatPreference,
      }}
    >
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettings() {
  const ctx = useContext(SettingsContext);
  if (!ctx) {
    throw new Error('useSettings must be used within SettingsProvider');
  }
  return ctx;
}
