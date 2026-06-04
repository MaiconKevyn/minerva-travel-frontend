
import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Helmet } from 'react-helmet';
import { useAuth } from '@/contexts/AuthContext.jsx';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import Header from '@/components/Header.jsx';
import { Airplane, Flower } from '@/components/DecorativeElements.jsx';
import { Loader2, Key } from 'lucide-react';

const LoginPage = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isResetting, setIsResetting] = useState(false);

  const { login, requestPasswordReset } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const from = location.state?.from?.pathname || '/dashboard';

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);

    const result = await login(email, password);

    if (result.success) {
      toast.success('Bem-vindo de volta às aventuras!');
      navigate(from, { replace: true });
    } else {
      toast.error(result.error || 'Email ou senha incorretos. Tente novamente!');
    }

    setIsSubmitting(false);
  };

  const handlePasswordReset = async () => {
    const cleanEmail = email.trim();

    if (!cleanEmail) {
      toast.error('Digite seu email primeiro para recuperar a senha.');
      return;
    }

    setIsResetting(true);
    const redirectTo = `${window.location.origin}/reset-password`;
    const result = await requestPasswordReset(cleanEmail, redirectTo);

    if (result.success) {
      toast.success('Enviamos um link de recuperação para o seu email.');
    } else {
      toast.error(result.error || 'Não foi possível enviar o email de recuperação.');
    }

    setIsResetting(false);
  };

  return (
    <>
      <Helmet>
        <title>Entrar - Aventuras em Família</title>
        <meta name="description" content="Faça login para acessar seus guias de viagem mágicos." />
      </Helmet>

      <div className="min-h-screen bg-background flex flex-col transition-colors duration-200">
        <Header />

        <main className="flex-1 flex items-center justify-center p-4 relative overflow-hidden">
          <Flower className="absolute bottom-20 left-10 w-32 h-32 text-secondary opacity-10" />
          <Airplane className="absolute top-20 right-20 w-24 h-24 text-primary opacity-10" />

          <div className="w-full max-w-md bg-card dark:bg-slate-800 rounded-[40px] p-8 md:p-10 shadow-xl border-4 border-secondary/10 dark:border-slate-700 relative z-10 transition-colors duration-200">
            <div className="text-center mb-8">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-secondary/10 mb-4">
                <Key className="w-8 h-8 text-secondary" />
              </div>
              <h1 className="text-3xl font-serif font-bold text-foreground mb-2">Bem-vindo de Volta!</h1>
              <p className="text-muted-foreground font-medium">Suas próximas aventuras aguardam.</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label className="block text-sm font-bold text-foreground mb-1">Email Mágico</label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-4 py-3 rounded-2xl border-2 border-border bg-background focus:border-secondary focus:ring-4 focus:ring-secondary/20 outline-none transition-all text-foreground"
                  placeholder="seu@email.com"
                />
              </div>

              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="block text-sm font-bold text-foreground">Senha Secreta</label>
                  <button
                    type="button"
                    onClick={handlePasswordReset}
                    disabled={isResetting}
                    className="text-xs text-secondary hover:underline font-bold disabled:opacity-60 disabled:no-underline"
                  >
                    {isResetting ? 'Enviando...' : 'Esqueceu a senha?'}
                  </button>
                </div>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-4 py-3 rounded-2xl border-2 border-border bg-background focus:border-secondary focus:ring-4 focus:ring-secondary/20 outline-none transition-all text-foreground"
                  placeholder="••••••••"
                />
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="remember"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="w-4 h-4 rounded border-border text-secondary focus:ring-secondary"
                />
                <label htmlFor="remember" className="text-sm font-medium text-foreground cursor-pointer">
                  Lembrar de mim
                </label>
              </div>

              <Button
                type="submit"
                disabled={isSubmitting}
                className="w-full rounded-2xl py-6 bg-secondary hover:bg-secondary/90 text-white font-bold text-lg shadow-lg hover:-translate-y-1 transition-all mt-4"
              >
                {isSubmitting ? (
                  <Loader2 className="w-6 h-6 animate-spin" />
                ) : (
                  'Entrar na Aventura'
                )}
              </Button>
            </form>

            <div className="mt-8 text-center">
              <p className="text-muted-foreground font-medium">
                Primeira vez por aqui?{' '}
                <Link to="/signup" className="text-secondary hover:underline font-bold">
                  Criar Conta
                </Link>
              </p>
            </div>
          </div>
        </main>
      </div>
    </>
  );
};

export default LoginPage;
