import React, { useState } from 'react';
import { Phone, Lock, Eye, EyeOff, LogIn, ShieldCheck, RefreshCcw } from 'lucide-react';

interface LoginProps {
  onLogin: (phone: string, password: string) => void;
}

const Login: React.FC<LoginProps> = ({ onLogin }) => {
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    // Simulação de delay para efeito visual premium
    setTimeout(() => {
      onLogin(phone, password);
      setLoading(false);
    }, 1200);
  };

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let value = e.target.value.replace(/\D/g, '');
    if (value.length > 11) value = value.slice(0, 11);
    
    // Máscara (00) 00000-0000
    if (value.length > 10) {
      value = value.replace(/^(\d{2})(\d{5})(\d{4}).*/, '($1) $2-$3');
    } else if (value.length > 5) {
      value = value.replace(/^(\d{2})(\d{4})(\d{0,4}).*/, '($1) $2-$3');
    } else if (value.length > 2) {
      value = value.replace(/^(\d{2})(\d{0,5}).*/, '($1) $2');
    } else if (value.length > 0) {
      value = value.replace(/^(\d*)/, '($1');
    }
    
    setPhone(value);
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-slate-950 relative overflow-hidden font-sans">
      {/* Imagem de Fundo Premium */}
      <div className="absolute inset-0 z-0">
        <img 
          src="https://images.unsplash.com/photo-1600585154340-be6161a56a0c?ixlib=rb-4.0.3&auto=format&fit=crop&w=1920&q=80" 
          alt="Alta Decoração" 
          className="w-full h-full object-cover opacity-40 scale-105 animate-slow-zoom"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/60 to-transparent" />
      </div>

      {/* Partículas de Brilho (Efeito Visual) */}
      <div className="absolute inset-0 z-0 pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-blue-500/10 rounded-full blur-[120px] animate-pulse" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-indigo-500/10 rounded-full blur-[120px] animate-pulse" />
      </div>

      {/* Card de Login Glassmorphic */}
      <div className="relative z-10 w-full max-w-md px-6">
        <div className="bg-white/5 backdrop-blur-2xl border border-white/10 rounded-[40px] p-10 shadow-2xl relative overflow-hidden group">
          {/* Luz de Borda Interativa */}
          <div className="absolute inset-0 border border-white/20 rounded-[40px] pointer-events-none group-hover:border-blue-500/40 transition-colors duration-700" />
          
          <div className="mb-10 text-center">
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-3xl bg-gradient-to-br from-blue-600 to-indigo-700 shadow-xl shadow-blue-500/20 mb-6 rotate-3 hover:rotate-0 transition-transform duration-500">
              <ShieldCheck size={40} className="text-white" />
            </div>
            <h1 className="text-4xl font-black text-white tracking-tighter mb-2">Alemão do Gesso</h1>
            <p className="text-slate-400 font-bold uppercase text-[10px] tracking-[0.3em]">Painel Administrativo v2.0</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Telefone de Acesso</label>
              <div className="relative group">
                <div className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-blue-400 transition-colors">
                  <Phone size={18} />
                </div>
                <input 
                  type="text" 
                  required
                  placeholder="(00) 00000-0000"
                  className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 pl-14 pr-5 text-white font-bold placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:bg-white/10 transition-all"
                  value={phone}
                  onChange={handlePhoneChange}
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Senha de Segurança</label>
              <div className="relative group">
                <div className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-blue-400 transition-colors">
                  <Lock size={18} />
                </div>
                <input 
                  type={showPassword ? "text" : "password"} 
                  required
                  placeholder="&bull;&bull;&bull;&bull;&bull;&bull;&bull;&bull;"
                  className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 pl-14 pr-12 text-white font-bold placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:bg-white/10 transition-all"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
                <button 
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white transition-colors"
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <div className="pt-4">
              <button 
                type="submit" 
                disabled={loading}
                className="w-full relative group overflow-hidden bg-gradient-to-r from-blue-600 to-indigo-700 py-4 rounded-2xl text-white font-black uppercase text-xs tracking-widest shadow-xl shadow-blue-600/20 hover:shadow-blue-600/40 transition-all disabled:opacity-50"
              >
                <div className="relative z-10 flex items-center justify-center">
                  {loading ? (
                    <RefreshCcw className="animate-spin mr-2" size={18} />
                  ) : (
                    <>
                      Acessar Sistema
                      <LogIn className="ml-2 group-hover:translate-x-1 transition-transform" size={18} />
                    </>
                  )}
                </div>
                <div className="absolute inset-0 bg-white/20 translate-y-20 group-hover:translate-y-0 transition-transform duration-500" />
              </button>
            </div>
            
            <p className="text-center text-slate-600 text-[9px] font-bold uppercase tracking-widest pt-4">
              Acesso exclusivo para administradores autorizados.
            </p>
          </form>
        </div>
      </div>

      <style>{`
        @keyframes slow-zoom {
          0% { transform: scale(1); }
          50% { transform: scale(1.1); }
          100% { transform: scale(1); }
        }
        .animate-slow-zoom {
          animation: slow-zoom 30s infinite ease-in-out;
        }
      `}</style>
    </div>
  );
};

export default Login;
