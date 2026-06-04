
import React, { createContext, useState, useEffect, useContext } from 'react';
import authClient from '@/lib/authClient.js';
import { toast } from 'sonner';

const AuthContext = createContext({});

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(authClient.model);
  const [isAuthenticated, setIsAuthenticated] = useState(authClient.isValid);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    setIsLoading(false);

    const unsubscribe = authClient.subscribe((model) => {
      setUser(model);
      setIsAuthenticated(authClient.isValid);
    });

    return () => {
      unsubscribe();
    };
  }, []);

  const login = async (email, password) => {
    return authClient.login(email, password);
  };

  const signup = async (email, password, name) => {
    return authClient.signup(email, password, name);
  };

  const logout = () => {
    authClient.logout();
    toast.success('Desconectado com sucesso!');
  };

  return (
    <AuthContext.Provider value={{ user, isAuthenticated, isLoading, login, signup, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
