
import React from 'react';
import { Route, Routes, BrowserRouter as Router } from 'react-router-dom';
import { Toaster } from 'sonner';
import ScrollToTop from './components/ScrollToTop';
import { AuthProvider } from './contexts/AuthContext.jsx';
import { ConversationalGuideProvider } from './contexts/ConversationalGuideContext.jsx';
import { ThemeProvider } from './contexts/ThemeContext.jsx';
import HomePage from './pages/HomePage.jsx';
import SignupPage from './pages/SignupPage.jsx';
import LoginPage from './pages/LoginPage.jsx';
import ResetPasswordPage from './pages/ResetPasswordPage.jsx';
import DashboardPage from './pages/DashboardPage.jsx';
import PricingPage from './pages/PricingPage.jsx';
import ProtectedCreateGuidePage from './pages/ProtectedCreateGuidePage.jsx';
import ProtectedRoute from './components/ProtectedRoute.jsx';

function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <Router>
          <ScrollToTop />
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/pricing" element={<PricingPage />} />
            <Route path="/signup" element={<SignupPage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/reset-password" element={<ResetPasswordPage />} />

            <Route path="/dashboard" element={
              <ProtectedRoute>
                <DashboardPage />
              </ProtectedRoute>
            } />

            <Route path="/create" element={
              <ConversationalGuideProvider>
                <ProtectedCreateGuidePage />
              </ConversationalGuideProvider>
            } />

            {/* Catch-all route for 404s */}
            <Route path="*" element={
              <div className="min-h-screen flex flex-col items-center justify-center bg-background text-center p-4 transition-colors duration-200">
                <h1 className="text-6xl font-serif font-bold text-primary mb-4">404</h1>
                <p className="text-xl text-muted-foreground mb-8 font-medium">Ops! Parece que você se perdeu nesta aventura.</p>
                <a href="/" className="px-8 py-4 bg-secondary text-white rounded-full font-medium hover:bg-secondary/90 transition-colors">
                  Voltar ao Início
                </a>
              </div>
            } />
          </Routes>
          <Toaster
            toastOptions={{
              className: 'bg-card font-medium border-2 border-primary/20 text-foreground rounded-2xl shadow-xl',
            }}
          />
        </Router>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;
