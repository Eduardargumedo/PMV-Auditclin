import { useState } from 'react';
import Reviewer from './components/Reviewer';
import History from './components/History';
import { AuthProvider, useAuth } from './lib/AuthProvider';
import { LayoutDashboard, History as HistoryIcon, LogOut, User as UserIcon, ShieldCheck, Menu, X } from 'lucide-react';
import { cn } from './lib/utils';

function AppContent() {
  const { user, logout, loading } = useAuth();
  const [activeTab, setActiveTab] = useState<'new' | 'history'>('new');
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-blue-600/20 border-t-blue-600 rounded-full animate-spin" />
          <p className="text-slate-500 font-medium animate-pulse">Iniciando sistema...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC] font-sans text-slate-900 selection:bg-blue-100 selection:text-blue-900">
      {/* Navigation Bar */}
      <nav className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-slate-100 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 items-center">
            <div className="flex items-center gap-2">
              <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center text-white shadow-lg shadow-blue-200">
                <ShieldCheck className="w-6 h-6" />
              </div>
              <span className="text-xl font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-slate-900 to-slate-600">
                AuditClin
              </span>
            </div>

            {/* Desktop Menu */}
            {user && (
              <div className="hidden md:flex items-center gap-6">
                <div className="flex bg-slate-100 p-1 rounded-full border border-slate-200">
                  <button
                    onClick={() => setActiveTab('new')}
                    className={cn(
                      "flex items-center gap-2 px-4 py-1.5 rounded-full text-sm font-bold transition-all",
                      activeTab === 'new' ? "bg-white text-blue-600 shadow-sm" : "text-slate-500 hover:text-slate-700"
                    )}
                  >
                    <LayoutDashboard className="w-4 h-4" />
                    Nueva Auditoría
                  </button>
                  <button
                    onClick={() => setActiveTab('history')}
                    className={cn(
                      "flex items-center gap-2 px-4 py-1.5 rounded-full text-sm font-bold transition-all",
                      activeTab === 'history' ? "bg-white text-blue-600 shadow-sm" : "text-slate-500 hover:text-slate-700"
                    )}
                  >
                    <HistoryIcon className="w-4 h-4" />
                    Histórico
                  </button>
                </div>

                <div className="h-6 w-px bg-slate-200" />

                <div className="flex items-center gap-3">
                  <div className="text-right">
                    <p className="text-xs font-bold text-slate-900 truncate max-w-[120px]">{user.displayName}</p>
                    <p className="text-[10px] text-slate-400 font-medium">Médico Auditor</p>
                  </div>
                  {user.photoURL ? (
                    <img src={user.photoURL} alt={user.displayName || ''} className="w-8 h-8 rounded-full border border-slate-200" referrerPolicy="no-referrer" />
                  ) : (
                    <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center border border-slate-200">
                      <UserIcon className="w-4 h-4 text-slate-400" />
                    </div>
                  )}
                  <button 
                    onClick={logout}
                    className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                    title="Cerrar Sesión"
                  >
                    <LogOut className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}

            {/* Mobile menu button */}
            <div className="md:hidden">
              <button 
                onClick={() => setIsMenuOpen(!isMenuOpen)}
                className="p-2 rounded-lg text-slate-600 hover:bg-slate-100"
              >
                {isMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile menu */}
        {isMenuOpen && user && (
          <div className="md:hidden bg-white border-t border-slate-50 p-4 space-y-4 animate-in slide-in-from-top-4">
            <div className="grid gap-2">
              <button
                onClick={() => { setActiveTab('new'); setIsMenuOpen(false); }}
                className={cn(
                  "flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold w-full",
                  activeTab === 'new' ? "bg-blue-50 text-blue-600" : "text-slate-600 hover:bg-slate-50"
                )}
              >
                <LayoutDashboard className="w-5 h-5" />
                Nueva Auditoría
              </button>
              <button
                onClick={() => { setActiveTab('history'); setIsMenuOpen(false); }}
                className={cn(
                  "flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold w-full",
                  activeTab === 'history' ? "bg-blue-50 text-blue-600" : "text-slate-600 hover:bg-slate-50"
                )}
              >
                <HistoryIcon className="w-5 h-5" />
                Histórico de Consultas
              </button>
            </div>
            <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <img src={user.photoURL || ''} className="w-10 h-10 rounded-full border border-slate-100" />
                <div>
                  <p className="text-sm font-bold text-slate-900">{user.displayName}</p>
                  <p className="text-xs text-slate-500 truncate max-w-[150px]">{user.email}</p>
                </div>
              </div>
              <button onClick={logout} className="p-2 text-red-500 bg-red-50 rounded-xl">
                <LogOut className="w-5 h-5" />
              </button>
            </div>
          </div>
        )}
      </nav>

      {/* Main Content Area */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="relative">
          {activeTab === 'new' ? <Reviewer /> : <History />}
        </div>
      </main>

      {/* Footer Info */}
      <footer className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 border-t border-slate-100">
        <div className="flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="flex items-center gap-2 opacity-40 grayscale">
            <ShieldCheck className="w-5 h-5" />
            <span className="text-sm font-bold tracking-tight">AuditClin System v1.0</span>
          </div>
          <div className="flex gap-8 text-[10px] uppercase tracking-[0.2em] font-bold text-slate-400">
            <span className="hover:text-blue-500 cursor-pointer transition-colors">Seguridad de Datos</span>
            <span className="hover:text-blue-500 cursor-pointer transition-colors">Privacidad Médica</span>
            <span className="hover:text-blue-500 cursor-pointer transition-colors">Soporte Técnico</span>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}
