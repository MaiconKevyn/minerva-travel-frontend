import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import Header from '@/components/Header.jsx';
import { Airplane, Flower } from '@/components/DecorativeElements.jsx';
import { useAuth } from '@/contexts/AuthContext.jsx';
import { KeyRound, Loader2 } from 'lucide-react';

const calculateStrength = (password) => {
  let score = 0;
  if (password.length >= 8) score += 1;
  if (/[A-Z]/.test(password)) score += 1;
  if (/[0-9]/.test(password)) score += 1;
  return score;
};

const ResetPasswordPage = () => {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { updatePassword } = useAuth();
  const navigate = useNavigate();

  const strength = calculateStrength(password);

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (password !== confirmPassword) {
      toast.error('As senhas não coincidem.');
      return;
    }

    if (strength < 3) {
      toast.error('A senha deve ter pelo menos 8 caracteres, uma letra maiúscula e um número.');
      return;
    }

    setIsSubmitting(true);
    const result = await updatePassword(password);

    if (result.success) {
      toast.success('Senha atualizada com sucesso.');
      navigate('/login', { replace: true });
    } else {
      toast.error(result.error || 'Não foi possível atualizar sua senha.');
    }

    setIsSubmitting(false);
  };

  return (
    <>
      <Helmet>
        <title>Redefinir Senha - Aventuras em Família</title>
        <meta name="description" content="Crie uma nova senha para acessar sua conta." />
      </Helmet>

      <div className="min-h-screen bg-background flex flex-col transition-colors duration-200">
        <Header />

        <main className="flex-1 flex items-center justify-center p-4 relative overflow-hidden">
          <Flower className="absolute bottom-20 left-10 w-32 h-32 text-secondary opacity-10" />
          <Airplane className="absolute top-20 right-20 w-24 h-24 text-primary opacity-10" />

          <div className="w-full max-w-md bg-card dark:bg-slate-800 rounded-[40px] p-8 md:p-10 shadow-xl border-4 border-secondary/10 dark:border-slate-700 relative z-10 transition-colors duration-200">
            <div className="text-center mb-8">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-secondary/10 mb-4">
                <KeyRound className="w-8 h-8 text-secondary" />
              </div>
              <h1 className="text-3xl font-serif font-bold text-foreground mb-2">Crie uma Nova Senha</h1>
              <p className="text-muted-foreground font-medium">Use uma senha forte para proteger sua conta.</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label className="block text-sm font-bold text-foreground mb-1">Nova Senha</label>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  className="w-full px-4 py-3 rounded-2xl border-2 border-border bg-background focus:border-secondary focus:ring-4 focus:ring-secondary/20 outline-none transition-all text-foreground"
                  placeholder="Mínimo 8 caracteres"
                />

                {password && (
                  <div className="mt-2 flex gap-1 h-2">
                    <div className={`flex-1 rounded-full ${strength >= 1 ? 'bg-destructive' : 'bg-muted'}`} />
                    <div className={`flex-1 rounded-full ${strength >= 2 ? 'bg-secondary' : 'bg-muted'}`} />
                    <div className={`flex-1 rounded-full ${strength >= 3 ? 'bg-accent' : 'bg-muted'}`} />
                  </div>
                )}
              </div>

              <div>
                <label className="block text-sm font-bold text-foreground mb-1">Confirme a Nova Senha</label>
                <input
                  type="password"
                  required
                  value={confirmPassword}
                  onChange={(event) => setConfirmPassword(event.target.value)}
                  className="w-full px-4 py-3 rounded-2xl border-2 border-border bg-background focus:border-secondary focus:ring-4 focus:ring-secondary/20 outline-none transition-all text-foreground"
                  placeholder="Repita sua nova senha"
                />
              </div>

              <Button
                type="submit"
                disabled={isSubmitting}
                className="w-full rounded-2xl py-6 bg-secondary hover:bg-secondary/90 text-white font-bold text-lg shadow-lg hover:-translate-y-1 transition-all mt-4"
              >
                {isSubmitting ? (
                  <Loader2 className="w-6 h-6 animate-spin" />
                ) : (
                  'Salvar Nova Senha'
                )}
              </Button>
            </form>

            <div className="mt-8 text-center">
              <Link to="/login" className="text-secondary hover:underline font-bold">
                Voltar para o login
              </Link>
            </div>
          </div>
        </main>
      </div>
    </>
  );
};

export default ResetPasswordPage;
