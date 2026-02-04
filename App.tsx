
import React, { useState, useEffect, useRef } from 'react';
import { AppState, Category, Theme, PortfolioData } from './types';
import { CATEGORIES, INITIAL_DATA } from './constants';
import CategoryCard from './components/CategoryCard';
import EditorForm from './components/EditorForm';
import PortfolioPreview from './components/PortfolioPreview';
import ThemeSelector from './components/ThemeSelector';
import { supabase } from './services/supabase';
import { 
  ArrowLeft, 
  Sparkles, 
  Rocket, 
  Monitor, 
  Eye, 
  EyeOff,
  Download,
  Share2,
  Check,
  Zap,
  Lock,
  Mail,
  ArrowRight,
  ShieldCheck,
  Loader2,
  LogOut,
  AlertTriangle,
  UserCheck,
  Palette,
  LayoutDashboard,
  Edit3,
  User,
  Activity,
  X,
  ChevronRight
} from 'lucide-react';

export default function App() {
  const [state, setState] = useState<AppState>({
    view: 'login', // App starts with login page
    data: INITIAL_DATA,
    theme: 'minimal',
  });
  
  const [isInitializing, setIsInitializing] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [isSignUp, setIsSignUp] = useState(false);
  const [loginName, setLoginName] = useState('');
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPass, setLoginPass] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [isAuthLoading, setIsAuthLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [syncStatus, setSyncStatus] = useState<'idle' | 'syncing' | 'synced' | 'error'>('idle');
  const [isPublishing, setIsPublishing] = useState(false);
  const [hasPublished, setHasPublished] = useState(false);
  const [copied, setCopied] = useState(false);
  
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [pendingAction, setPendingAction] = useState<'theme-selection' | 'preview' | null>(null);

  const isInitialLoad = useRef(true);

  const fetchUserPortfolio = async (uid: string) => {
    setSyncStatus('syncing');
    setErrorMessage(null);
    try {
      const { data, error } = await supabase
        .from('portfolios')
        .select('content, theme')
        .eq('user_id', uid)
        .maybeSingle();

      if (error) {
        setErrorMessage(error.message);
        setSyncStatus('error');
      } else if (data && data.content) {
        setState(prev => ({
          ...prev,
          data: data.content || INITIAL_DATA,
          theme: (data.theme as Theme) || 'minimal'
        }));
        setSyncStatus('synced');
        setTimeout(() => setSyncStatus('idle'), 2000);
      }
    } catch (err: any) {
      setSyncStatus('error');
    } finally {
      isInitialLoad.current = false;
    }
  };

  useEffect(() => {
    const checkSession = async () => {
      const params = new URLSearchParams(window.location.search);
      const shared = params.get('p');
      if (shared) {
        try {
          const decoded = JSON.parse(decodeURIComponent(escape(atob(shared))));
          if (decoded.data) {
            setState(prev => ({
              ...prev,
              data: decoded.data,
              theme: decoded.theme || 'minimal',
              view: 'preview'
            }));
            setIsInitializing(false);
            return;
          }
        } catch (e) {
          console.error("Link decode error", e);
        }
      }

      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        setUserId(session.user.id);
        setUserEmail(session.user.email ?? null);
        await fetchUserPortfolio(session.user.id);
        setState(prev => ({ ...prev, view: 'landing' }));
      }
      setIsInitializing(false);
    };

    checkSession();
  }, []);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (session) {
        setUserId(session.user.id);
        setUserEmail(session.user.email ?? null);
        
        if (event === 'SIGNED_IN') {
          await fetchUserPortfolio(session.user.id);
          
          setState(prev => {
            if (pendingAction === 'theme-selection') return { ...prev, view: 'theme-selection' };
            if (pendingAction === 'preview') return { ...prev, view: 'preview' };
            if (prev.view === 'login') return { ...prev, view: 'landing' };
            return prev;
          });
          
          setPendingAction(null);
          setShowAuthModal(false);
        }
      } else {
        setUserId(null);
        setUserEmail(null);
        isInitialLoad.current = true;
      }
    });

    return () => subscription.unsubscribe();
  }, [pendingAction]);

  useEffect(() => {
    if (isInitialLoad.current || !userId || state.view === 'preview') return;

    const timer = setTimeout(() => {
      performSync();
    }, 1500);

    return () => clearTimeout(timer);
  }, [state.data, state.theme, userId, state.view]);

  const performSync = async () => {
    if (!userId) return;
    setSyncStatus('syncing');
    try {
      const { error } = await supabase.from('portfolios').upsert({
        user_id: userId,
        content: state.data,
        theme: state.theme,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'user_id' });

      if (error) throw error;
      setSyncStatus('synced');
      setTimeout(() => setSyncStatus('idle'), 3000);
      return true;
    } catch (err: any) {
      setSyncStatus('error');
      return false;
    }
  };

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsAuthLoading(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      if (isSignUp) {
        const { error } = await supabase.auth.signUp({
          email: loginEmail,
          password: loginPass,
          options: {
            data: {
              full_name: loginName,
            }
          }
        });
        if (error) throw error;
        setSuccessMessage("Account created! Please verify your email.");
        if (!state.data.fullName && loginName) {
           updateData({...state.data, fullName: loginName});
        }
        setIsSignUp(false);
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email: loginEmail,
          password: loginPass,
        });
        if (error) throw error;
      }
    } catch (err: any) {
      setErrorMessage(err.message || "Authentication failed.");
    } finally {
      setIsAuthLoading(false);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setState(prev => ({ ...prev, view: 'login', data: INITIAL_DATA }));
  };

  const updateData = (data: PortfolioData) => setState(prev => ({ ...prev, data }));
  const setTheme = (theme: Theme) => setState(prev => ({ ...prev, theme }));
  
  const goToProfile = () => {
    if (!userId) {
      setShowAuthModal(true);
      return;
    }
    setState(prev => ({ ...prev, view: 'profile' }));
  };

  const handleGenerateClick = () => {
    if (!userId) {
      setPendingAction('theme-selection');
      setShowAuthModal(true);
      return;
    }
    goToThemeSelection();
  };

  const goToThemeSelection = () => setState(prev => ({ ...prev, view: 'theme-selection' }));
  const handlePreviewClick = () => {
    if (!userId) {
      setPendingAction('preview');
      setShowAuthModal(true);
      return;
    }
    goToPreview();
  };

  const goToPreview = () => setState(prev => ({ ...prev, view: 'preview' }));
  const goToEditor = () => setState(prev => ({ ...prev, view: 'editor' }));
  const backToEditor = () => setState(prev => ({ ...prev, view: 'editor' }));
  const backToLanding = () => setState(prev => ({ ...prev, view: 'landing' }));

  // Added handleShare function to create and copy a shareable URL
  const handleShare = () => {
    const shareData = {
      data: state.data,
      theme: state.theme
    };
    const encoded = btoa(unescape(encodeURIComponent(JSON.stringify(shareData))));
    const url = `${window.location.origin}${window.location.pathname}?p=${encoded}`;
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Added handlePublish function to persist state to Supabase
  const handlePublish = async () => {
    if (!userId) {
      setShowAuthModal(true);
      return;
    }
    setIsPublishing(true);
    const success = await performSync();
    if (success) {
      setHasPublished(true);
    } else {
      setErrorMessage("Failed to publish your portfolio. Please try again.");
    }
    setIsPublishing(false);
  };

  // Added handleDownload function to export portfolio as static HTML
  const handleDownload = () => {
    const htmlContent = `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>${state.data.fullName || 'Professional Portfolio'}</title>
        <script src="https://cdn.tailwindcss.com"></script>
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap" rel="stylesheet">
        <style>
          body { font-family: 'Inter', sans-serif; background-color: #f9fafb; }
          .container { max-width: 56rem; margin: 0 auto; padding: 5rem 2rem; }
        </style>
      </head>
      <body>
        <div class="bg-indigo-600 text-white text-center py-2 text-[10px] font-black uppercase tracking-widest">
          Exported via FreelancePortfolio
        </div>
        <div class="container">
          <header class="text-center mb-16">
            <h1 class="text-6xl font-black tracking-tighter mb-4">${state.data.fullName || 'Your Name'}</h1>
            <p class="text-xl text-gray-500 font-medium">${state.data.tagline || 'Your tagline...'}</p>
          </header>
          <section class="mb-16">
            <h2 class="text-sm font-bold uppercase tracking-widest text-gray-400 mb-6">Narrative</h2>
            <p class="text-lg leading-relaxed text-gray-700 whitespace-pre-wrap">${state.data.about || 'Bio content...'}</p>
          </section>
          <section>
            <h2 class="text-sm font-bold uppercase tracking-widest text-gray-400 mb-8">Works</h2>
            <div class="grid grid-cols-1 md:grid-cols-2 gap-8">
              ${state.data.projects.map(p => `
                <div class="bg-white p-8 rounded-[2rem] border border-gray-100 shadow-sm">
                  <h3 class="text-2xl font-black mb-2">${p.title}</h3>
                  <p class="text-gray-500 mb-6">${p.description}</p>
                  ${p.link ? `<a href="${p.link}" target="_blank" class="text-indigo-600 font-black text-[10px] uppercase tracking-widest">Explore Project →</a>` : ''}
                </div>
              `).join('')}
            </div>
          </section>
        </div>
      </body>
      </html>
    `;
    const blob = new Blob([htmlContent], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'portfolio-export.html';
    a.click();
    URL.revokeObjectURL(url);
  };

  if (isInitializing) {
    return (
      <div className="min-h-screen bg-white flex flex-col items-center justify-center">
        <div className="w-20 h-20 bg-gradient-to-tr from-indigo-600 to-purple-600 text-white rounded-3xl flex items-center justify-center animate-bounce shadow-[0_20px_40px_rgba(79,70,229,0.3)]">
          <Rocket size={40} />
        </div>
        <p className="mt-8 text-sm font-black uppercase tracking-[0.4em] text-indigo-500 animate-pulse">Initializing Portal</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen selection:bg-rose-100 selection:text-rose-900">
      {/* Decorative Rainbow Background Blobs */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none z-[-1]">
        <div className="absolute top-[-15%] left-[-10%] w-[50%] h-[50%] bg-indigo-500/10 rounded-full blur-[120px] animate-pulse"></div>
        <div className="absolute top-[20%] right-[-10%] w-[40%] h-[40%] bg-rose-500/10 rounded-full blur-[140px] animate-pulse" style={{ animationDelay: '3s' }}></div>
        <div className="absolute bottom-[-10%] left-[20%] w-[40%] h-[40%] bg-amber-500/10 rounded-full blur-[130px] animate-pulse" style={{ animationDelay: '6s' }}></div>
        <div className="absolute bottom-[20%] right-[10%] w-[35%] h-[35%] bg-emerald-500/10 rounded-full blur-[120px] animate-pulse" style={{ animationDelay: '9s' }}></div>
      </div>

      {showAuthModal && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-6 bg-slate-900/40 backdrop-blur-md">
          <div className="max-w-md w-full bg-white rounded-[3rem] p-12 shadow-2xl relative">
            <button 
              onClick={() => { setShowAuthModal(false); setPendingAction(null); }}
              className="absolute top-10 right-10 text-gray-400 hover:text-indigo-600 transition-colors"
            >
              <X size={28} />
            </button>
            <div className="text-center mb-10">
              <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-indigo-600 to-purple-600 text-white rounded-[1.5rem] mb-8 shadow-xl">
                <Lock size={36} />
              </div>
              <h2 className="text-4xl font-black tracking-tighter text-gray-900 mb-3">Secure Progress</h2>
              <p className="text-gray-400 font-medium">Authentication required to finalize your creative studio.</p>
            </div>
            <div className="flex gap-4 mb-10 p-1.5 bg-gray-50 rounded-[1.5rem]">
              <button onClick={() => setIsSignUp(false)} className={`flex-1 py-4 rounded-2xl text-xs font-black uppercase tracking-widest transition-all ${!isSignUp ? 'bg-white text-indigo-600 shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}>Sign In</button>
              <button onClick={() => setIsSignUp(true)} className={`flex-1 py-4 rounded-2xl text-xs font-black uppercase tracking-widest transition-all ${isSignUp ? 'bg-white text-indigo-600 shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}>Register</button>
            </div>
            <form onSubmit={handleAuth} className="space-y-6">
              {isSignUp && (
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-3">Professional Name</label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-5 flex items-center pointer-events-none text-gray-400"><User size={20} /></div>
                    <input type="text" required value={loginName} onChange={(e) => setLoginName(e.target.value)} className="w-full pl-14 pr-6 py-5 rounded-[1.5rem] border border-gray-100 bg-gray-50 focus:bg-white focus:ring-4 focus:ring-indigo-500/5 outline-none transition-all font-semibold" placeholder="e.g. Elena Vasilev"/>
                  </div>
                </div>
              )}
              <div className="space-y-2">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-3">Identity Email</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-5 flex items-center pointer-events-none text-gray-400"><Mail size={20} /></div>
                  <input type="email" required value={loginEmail} onChange={(e) => setLoginEmail(e.target.value)} className="w-full pl-14 pr-6 py-5 rounded-[1.5rem] border border-gray-100 bg-gray-50 focus:bg-white focus:ring-4 focus:ring-indigo-500/5 outline-none transition-all font-semibold" placeholder="hello@domain.com"/>
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-3">Encrypted Key</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-5 flex items-center pointer-events-none text-gray-400"><Lock size={20} /></div>
                  <input type={showPass ? "text" : "password"} required value={loginPass} onChange={(e) => setLoginPass(e.target.value)} className="w-full pl-14 pr-16 py-5 rounded-[1.5rem] border border-gray-100 bg-gray-50 focus:bg-white focus:ring-4 focus:ring-indigo-500/5 outline-none transition-all font-semibold" placeholder="••••••••"/>
                  <button type="button" onClick={() => setShowPass(!showPass)} className="absolute inset-y-0 right-0 pr-6 flex items-center text-gray-300 hover:text-indigo-600">{showPass ? <EyeOff size={22} /> : <Eye size={22} />}</button>
                </div>
              </div>
              <button type="submit" disabled={isAuthLoading} className="w-full bg-indigo-600 text-white py-5 rounded-[1.5rem] font-black uppercase tracking-widest text-sm shadow-[0_20px_40px_rgba(79,70,229,0.3)] hover:bg-indigo-700 disabled:opacity-70 transition-all flex items-center justify-center gap-3 mt-4">
                {isAuthLoading ? <Loader2 className="animate-spin" size={24} /> : (isSignUp ? "INITIALIZE ACCOUNT" : "AUTHENTICATE")}
              </button>
            </form>
          </div>
        </div>
      )}

      {state.view === 'login' ? (
        <div className="min-h-screen flex items-center justify-center p-6 relative overflow-hidden">
          <div className="max-w-xl w-full z-10 flex flex-col items-center">
            <div className="text-center mb-16">
              <div className="inline-flex items-center justify-center w-32 h-32 bg-gradient-to-tr from-indigo-600 via-purple-600 to-rose-600 text-white rounded-[3rem] shadow-[0_32px_64px_-16px_rgba(79,70,229,0.4)] mb-12 group cursor-pointer animate-in fade-in zoom-in-50 slide-in-from-top-12 duration-1000 ease-out fill-mode-forwards">
                <Rocket size={64} className="group-hover:rotate-12 group-hover:scale-110 transition-all duration-500" />
              </div>
              <h1 className="text-7xl md:text-8xl font-black tracking-tighter text-slate-900 mb-8 animate-in fade-in slide-in-from-bottom-12 duration-1000 delay-300 ease-out fill-mode-forwards">
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 via-rose-500 to-amber-500">FreelancePortfolio</span>
              </h1>
              <p className="text-2xl text-slate-500 font-medium max-w-md mx-auto animate-in fade-in duration-1000 delay-700 fill-mode-forwards">
                Craft a vibrant, high-performance portal for your professional soul.
              </p>
            </div>

            <div className="bg-white/70 backdrop-blur-3xl p-12 md:p-14 rounded-[4rem] shadow-[0_40px_120px_-30px_rgba(0,0,0,0.1)] border border-white relative overflow-hidden w-full animate-in fade-in slide-in-from-bottom-8 duration-1000 delay-1000 fill-mode-forwards">
              <div className="flex gap-4 mb-12 p-2 bg-slate-100/50 rounded-[2rem]">
                <button onClick={() => { setIsSignUp(false); setErrorMessage(null); setSuccessMessage(null); }} className={`flex-1 py-5 rounded-[1.5rem] text-xs font-black uppercase tracking-[0.2em] transition-all duration-300 ${!isSignUp ? 'bg-white text-indigo-600 shadow-[0_8px_16px_rgba(0,0,0,0.05)]' : 'text-slate-400 hover:text-slate-600'}`}>Sign In</button>
                <button onClick={() => { setIsSignUp(true); setErrorMessage(null); setSuccessMessage(null); }} className={`flex-1 py-5 rounded-[1.5rem] text-xs font-black uppercase tracking-[0.2em] transition-all duration-300 ${isSignUp ? 'bg-white text-indigo-600 shadow-[0_8px_16px_rgba(0,0,0,0.05)]' : 'text-slate-400 hover:text-slate-600'}`}>Join Studio</button>
              </div>

              {errorMessage && <div className="mb-8 p-6 border rounded-[1.5rem] flex flex-col gap-2 text-xs font-bold uppercase bg-rose-50 border-rose-100 text-rose-600 animate-in fade-in zoom-in-95"><div className="flex items-start gap-3"><AlertTriangle size={20} /><span>{errorMessage}</span></div></div>}
              {successMessage && <div className="mb-8 p-6 bg-emerald-50 border border-emerald-100 text-emerald-600 rounded-[1.5rem] flex items-start gap-3 text-xs font-bold uppercase animate-in fade-in zoom-in-95"><UserCheck size={20} />{successMessage}</div>}
              
              <form onSubmit={handleAuth} className="space-y-8">
                {isSignUp && (
                  <div className="space-y-3">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] px-4">Full Identity</label>
                    <div className="relative group">
                      <div className="absolute inset-y-0 left-0 pl-6 flex items-center pointer-events-none text-slate-400 group-focus-within:text-indigo-600 transition-colors"><User size={24} /></div>
                      <input type="text" required value={loginName} onChange={(e) => setLoginName(e.target.value)} className="w-full pl-16 pr-8 py-6 rounded-[2rem] border border-slate-100 bg-white/50 focus:bg-white focus:ring-12 focus:ring-indigo-600/5 outline-none transition-all font-semibold text-xl" placeholder="Elena Vasilev"/>
                    </div>
                  </div>
                )}
                <div className="space-y-3">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] px-4">Contact Channel</label>
                  <div className="relative group">
                    <div className="absolute inset-y-0 left-0 pl-6 flex items-center pointer-events-none text-slate-400 group-focus-within:text-indigo-600 transition-colors"><Mail size={24} /></div>
                    <input type="email" required value={loginEmail} onChange={(e) => setLoginEmail(e.target.value)} className="w-full pl-16 pr-8 py-6 rounded-[2rem] border border-slate-100 bg-white/50 focus:bg-white focus:ring-12 focus:ring-indigo-600/5 outline-none transition-all font-semibold text-xl" placeholder="hello@domain.com"/>
                  </div>
                </div>
                <div className="space-y-3">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] px-4">Secret Key</label>
                  <div className="relative group">
                    <div className="absolute inset-y-0 left-0 pl-6 flex items-center pointer-events-none text-slate-400 group-focus-within:text-indigo-600 transition-colors"><Lock size={24} /></div>
                    <input type={showPass ? "text" : "password"} required value={loginPass} onChange={(e) => setLoginPass(e.target.value)} className="w-full pl-16 pr-16 py-6 rounded-[2rem] border border-slate-100 bg-white/50 focus:bg-white focus:ring-12 focus:ring-indigo-600/5 outline-none transition-all font-semibold text-xl" placeholder="••••••••"/>
                    <button type="button" onClick={() => setShowPass(!showPass)} className="absolute inset-y-0 right-0 pr-8 flex items-center text-slate-300 hover:text-indigo-600 transition-colors">{showPass ? <EyeOff size={26} /> : <Eye size={26} />}</button>
                  </div>
                </div>
                <button type="submit" disabled={isAuthLoading} className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 text-white py-6 rounded-[2rem] font-black uppercase tracking-[0.3em] text-sm shadow-[0_24px_48px_-12px_rgba(79,70,229,0.4)] hover:shadow-indigo-500/50 hover:-translate-y-1 active:scale-[0.98] disabled:opacity-70 transition-all flex items-center justify-center gap-4">
                  {isAuthLoading ? <Loader2 className="animate-spin" size={28} /> : (isSignUp ? "INITIALIZE" : "AUTHENTICATE")}
                </button>
                <div className="relative my-14">
                  <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-slate-100"></div></div>
                  <div className="relative flex justify-center text-[11px] uppercase font-black tracking-[0.4em]"><span className="bg-white px-8 text-slate-300">OR GUEST MODE</span></div>
                </div>
                <button type="button" onClick={() => setState(prev => ({ ...prev, view: 'landing' }))} className="w-full group py-6 rounded-[2rem] border-2 border-indigo-50 text-indigo-600 font-black uppercase tracking-[0.3em] text-xs hover:bg-indigo-50 hover:border-indigo-100 transition-all flex items-center justify-center gap-5">
                  START CREATING <ChevronRight size={22} className="group-hover:translate-x-3 transition-transform" />
                </button>
              </form>
            </div>
          </div>
        </div>
      ) : (
        <>
          {state.view !== 'preview' && (
            <header className="bg-white/80 backdrop-blur-2xl border-b border-slate-100 sticky top-0 z-[60]">
              <div className="max-w-7xl mx-auto px-8 h-24 flex items-center justify-between">
                <div className="flex items-center gap-4 cursor-pointer group" onClick={backToLanding}>
                  <div className="w-12 h-12 bg-gradient-to-tr from-indigo-600 to-purple-600 text-white rounded-[1.2rem] flex items-center justify-center shadow-lg group-hover:scale-110 group-hover:rotate-3 transition-all duration-300">
                    <Rocket size={26} />
                  </div>
                  <h1 className="text-2xl font-black tracking-tighter text-slate-900 leading-none">FreelancePortfolio</h1>
                </div>
                <div className="flex items-center gap-8">
                  {userId && syncStatus !== 'idle' && (
                    <div className={`hidden md:flex items-center gap-2 px-4 py-2 rounded-full text-[10px] font-black uppercase tracking-widest transition-all ${syncStatus === 'syncing' ? 'bg-indigo-50 text-indigo-600' : syncStatus === 'synced' ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}>
                      {syncStatus === 'syncing' ? <Loader2 className="animate-spin" size={14} /> : syncStatus === 'synced' ? <Check size={14} /> : <AlertTriangle size={14} />}
                      {syncStatus}
                    </div>
                  )}
                  <div className="flex items-center gap-4 border-l border-slate-100 pl-8">
                    {userId ? (
                      <>
                        <button onClick={goToProfile} className={`w-12 h-12 rounded-full flex items-center justify-center transition-all ${state.view === 'profile' ? 'bg-indigo-600 text-white shadow-lg' : 'bg-slate-50 text-slate-400 hover:bg-indigo-50 hover:text-indigo-600'}`} title="Dashboard"><User size={24} /></button>
                        <button onClick={handleLogout} className="w-12 h-12 flex items-center justify-center text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-full transition-all" title="Sign Out"><LogOut size={22} /></button>
                      </>
                    ) : (
                      <button onClick={() => setShowAuthModal(true)} className="px-8 py-3 bg-gradient-to-r from-indigo-600 to-indigo-700 text-white rounded-2xl text-xs font-black uppercase tracking-widest shadow-xl hover:shadow-indigo-200 transition-all active:scale-95">Sign In</button>
                    )}
                  </div>
                </div>
              </div>
            </header>
          )}

          <main className={state.view === 'preview' ? '' : 'max-w-7xl mx-auto px-8 py-20 lg:py-28'}>
            {state.view === 'profile' && userId && (
              <div>
                <div className="flex flex-col lg:flex-row justify-between items-start gap-12 mb-20">
                  <div className="flex-1">
                    <h2 className="text-6xl font-black text-slate-900 mb-5 tracking-tighter italic uppercase flex items-center gap-6"><LayoutDashboard size={48} className="text-indigo-600" />Studio Dashboard</h2>
                    <p className="text-2xl text-slate-400 font-medium leading-relaxed">Managing portfolio for <span className="text-indigo-600 font-black italic">{state.data.fullName || userEmail?.split('@')[0]}</span>.</p>
                  </div>
                  <div className="flex items-center gap-6 bg-white px-8 py-6 rounded-[2.5rem] border border-slate-100 shadow-sm">
                    <div className="w-14 h-14 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center"><Activity size={28} className="animate-pulse" /></div>
                    <div><span className="text-[11px] font-black uppercase tracking-[0.3em] text-slate-400">Live Status</span><p className="text-sm font-black text-slate-900 uppercase italic">Authenticated</p></div>
                  </div>
                </div>
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
                  <div className="lg:col-span-8 space-y-10">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                      <button onClick={goToEditor} className="group flex flex-col items-start p-12 bg-white rounded-[3rem] border-4 border-transparent hover:border-indigo-600 shadow-2xl shadow-slate-100 transition-all duration-500 text-left hover:-translate-y-2"><div className="w-20 h-20 bg-indigo-50 text-indigo-600 rounded-[2rem] flex items-center justify-center mb-10 group-hover:scale-110 group-hover:rotate-6 transition-all shadow-sm"><Edit3 size={40} /></div><h3 className="text-3xl font-black uppercase tracking-tighter italic mb-4">Edit Core</h3><p className="text-slate-400 text-base font-medium leading-relaxed">Refine your projects, narrative, and skills.</p></button>
                      <button onClick={goToThemeSelection} className="group flex flex-col items-start p-12 bg-white rounded-[3rem] border-4 border-transparent hover:border-rose-500 shadow-2xl shadow-slate-100 transition-all duration-500 text-left hover:-translate-y-2"><div className="w-20 h-20 bg-rose-50 text-rose-500 rounded-[2rem] flex items-center justify-center mb-10 group-hover:scale-110 group-hover:rotate-6 transition-all shadow-sm"><Palette size={40} /></div><h3 className="text-3xl font-black uppercase tracking-tighter italic mb-4">Aesthetics</h3><p className="text-slate-400 text-base font-medium leading-relaxed">Switch themes and vibrant color palettes.</p></button>
                      <button onClick={goToPreview} className="group md:col-span-2 flex items-center justify-between p-12 bg-gradient-to-r from-indigo-600 via-purple-600 to-indigo-600 bg-[length:200%_auto] hover:bg-right transition-all duration-700 text-white rounded-[3.5rem] shadow-3xl hover:shadow-indigo-500/40"><div className="flex items-center gap-10"><div className="w-24 h-24 bg-white/10 rounded-[2.5rem] flex items-center justify-center backdrop-blur-md border border-white/20"><Monitor size={48} /></div><div><h3 className="text-4xl font-black uppercase tracking-tighter italic mb-2">Public Studio</h3><p className="text-indigo-100 text-base font-medium">Export HTML or share your secure portal link.</p></div></div><ArrowRight size={40} className="group-hover:translate-x-6 transition-transform" /></button>
                    </div>
                  </div>
                  <div className="lg:col-span-4">
                    <div className="bg-white p-10 rounded-[4rem] border border-slate-100 shadow-3xl sticky top-36">
                      <p className="text-[11px] font-black text-slate-400 uppercase tracking-[0.4em] mb-2">Active Theme</p>
                      <h4 className="text-3xl font-black uppercase tracking-tighter italic mb-10 text-indigo-600">{state.theme}</h4>
                      <div className="aspect-[3/4] rounded-[2.5rem] overflow-hidden border-8 border-slate-900 bg-slate-50 relative shadow-2xl group cursor-pointer" onClick={goToPreview}>
                        <div className="scale-[0.38] origin-top-left w-[263%] h-[263%]"><PortfolioPreview data={state.data} theme={state.theme} /></div>
                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors z-20 flex items-center justify-center"><div className="bg-white p-4 rounded-full opacity-0 group-hover:opacity-100 scale-50 group-hover:scale-100 transition-all text-indigo-600"><Eye size={32} /></div></div>
                      </div>
                      <button onClick={handleShare} className={`w-full mt-10 py-6 rounded-3xl font-black uppercase tracking-widest text-sm flex items-center justify-center gap-4 transition-all active:scale-95 ${copied ? 'bg-emerald-500 text-white' : 'bg-slate-900 text-white hover:bg-slate-800'}`}>{copied ? <Check size={20} /> : <Share2 size={20} />}{copied ? 'Link Copied' : 'Share Portal'}</button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {state.view === 'landing' && (
              <div>
                <div className="text-center max-w-5xl mx-auto mb-24 relative">
                  <div className="inline-flex items-center gap-3 px-6 py-2 bg-rose-50 text-rose-600 rounded-full text-[11px] font-black tracking-[0.4em] uppercase mb-10 border border-rose-100"><Sparkles size={16} /> Professional Expression</div>
                  <h2 className="text-7xl md:text-9xl font-black text-slate-900 mb-10 tracking-tighter leading-[0.9] italic">Choose your <br/><span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 via-rose-500 to-amber-500">creative domain.</span></h2>
                  <p className="text-2xl text-slate-400 font-medium max-w-3xl mx-auto leading-relaxed">Select the industry that matches your expertise to begin crafting your high-end portfolio studio.</p>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-10">
                  {CATEGORIES.map((cat) => (
                    <CategoryCard 
                      key={cat.id} 
                      id={cat.id} 
                      icon={cat.icon} 
                      description={cat.description} 
                      color={cat.color}
                      bgLight={cat.bgLight}
                      selected={state.data.category === cat.id} 
                      onSelect={(id) => { 
                        setState(prev => ({ ...prev, data: { ...prev.data, category: id }, view: 'editor' })); 
                        window.scrollTo(0,0); 
                      }} 
                    />
                  ))}
                </div>
              </div>
            )}

            {state.view === 'editor' && (
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-16">
                <div className="lg:col-span-8">
                  <button onClick={backToLanding} className="group inline-flex items-center gap-4 text-sm font-bold text-slate-400 hover:text-indigo-600 mb-14 transition-colors"><ArrowLeft size={20} className="group-hover:-translate-x-2 transition-transform" /><span className="uppercase tracking-[0.4em] text-[11px] font-black">Back to Domain</span></button>
                  <EditorForm data={state.data} onChange={updateData} onNext={handleGenerateClick} />
                </div>
                <div className="lg:col-span-4 hidden lg:block">
                  <div className="sticky top-40">
                    <div className="bg-white/80 backdrop-blur-3xl p-10 rounded-[3.5rem] border border-white shadow-3xl">
                      <h4 className="font-black text-slate-900 uppercase tracking-tighter flex items-center gap-4 italic mb-10 text-xl"><Monitor size={28} className="text-indigo-600" /> Multi-Device Studio</h4>
                      <div className="aspect-[3/4] rounded-[2rem] overflow-hidden border-8 border-slate-900 bg-slate-50 relative shadow-2xl"><div className="scale-[0.38] origin-top-left w-[263%] h-[263%]"><PortfolioPreview data={state.data} theme={state.theme} /></div></div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {state.view === 'theme-selection' && (
              <div>
                <button onClick={backToEditor} className="group inline-flex items-center gap-4 text-sm font-bold text-slate-400 hover:text-indigo-600 mb-14 transition-colors"><ArrowLeft size={20} /><span className="uppercase tracking-[0.4em] text-[11px] font-black">Back to Narrative</span></button>
                <div className="mb-24">
                  <h2 className="text-7xl font-black text-slate-900 mb-6 tracking-tighter italic uppercase flex items-center gap-8"><Palette size={64} className="text-indigo-600" />Visual Aesthetic</h2>
                  <p className="text-2xl text-slate-400 font-medium">Choose a layout that resonates with your personal brand identity.</p>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-12 mb-24">
                  {(['minimal', 'modern', 'glass', 'bold', 'classic', 'vibrant'] as Theme[]).map((t) => (
                    <div key={t} onClick={() => setTheme(t)} className={`group cursor-pointer p-10 rounded-[3.5rem] border-4 transition-all duration-500 overflow-hidden relative ${state.theme === t ? 'border-indigo-600 bg-white shadow-3xl scale-[1.03]' : 'border-white bg-white/40 hover:bg-white hover:border-slate-100'}`}><div className="flex justify-between items-start mb-12"><h3 className="text-3xl font-black uppercase tracking-tighter italic">{t}</h3>{state.theme === t && <div className="w-10 h-10 bg-indigo-600 text-white rounded-full flex items-center justify-center shadow-lg"><Check size={20} /></div>}</div><div className="aspect-[4/3] rounded-[2rem] overflow-hidden border-2 border-slate-100 bg-slate-50 relative"><div className="scale-[0.25] origin-top-left w-[400%] h-[400%]"><PortfolioPreview data={state.data} theme={t} /></div></div></div>
                  ))}
                </div>
                <div className="flex justify-center"><button onClick={handlePreviewClick} className="group bg-slate-900 text-white px-24 py-8 rounded-[2.5rem] font-black uppercase tracking-[0.3em] text-sm shadow-3xl hover:shadow-indigo-500/30 hover:-translate-y-2 transition-all active:scale-95 flex items-center gap-6">LAUNCH PREVIEW <Eye size={24} className="group-hover:scale-110 transition-transform" /></button></div>
              </div>
            )}

            {state.view === 'preview' && (
              <div className="relative">
                <div className="fixed bottom-12 left-1/2 -translate-x-1/2 z-[100] bg-white/95 backdrop-blur-3xl px-12 py-10 rounded-[4rem] shadow-[0_40px_100px_rgba(0,0,0,0.2)] border border-white/50 w-[95%] max-w-5xl flex flex-col gap-10">
                  <div className="flex flex-col md:flex-row items-center justify-between w-full gap-8">
                    <div className="flex items-center gap-6">
                      <button onClick={goToThemeSelection} className="w-16 h-16 flex items-center justify-center bg-slate-50 hover:bg-slate-100 rounded-[1.8rem] text-slate-500 transition-all hover:scale-105 active:scale-95"><ArrowLeft size={32} /></button>
                      <div><h5 className="font-black uppercase tracking-tighter text-3xl leading-none italic">Publish Studio</h5><p className="text-[12px] font-black text-slate-400 uppercase tracking-[0.4em] mt-3 italic">Finalize your professional portal</p></div>
                    </div>
                    <div className="flex items-center gap-4">
                      {!hasPublished ? (
                        <button onClick={handlePublish} disabled={isPublishing} className="flex items-center gap-4 px-12 py-5 bg-gradient-to-r from-indigo-600 to-indigo-700 text-white rounded-[1.8rem] text-sm font-black uppercase tracking-[0.2em] shadow-3xl hover:shadow-indigo-500/40 hover:-translate-y-1 active:scale-95 disabled:opacity-50">{isPublishing ? <Loader2 size={24} className="animate-spin" /> : <Zap size={24} />}SAVE & GO LIVE</button>
                      ) : (
                        <div className="flex items-center gap-4">
                          <button onClick={handleDownload} className="flex items-center gap-4 px-10 py-5 bg-slate-900 text-white rounded-[1.8rem] text-sm font-black uppercase tracking-[0.2em] shadow-2xl hover:-translate-y-1 active:scale-95"><Download size={24} /> EXPORT HTML</button>
                          <button onClick={handleShare} className={`flex items-center gap-4 px-10 py-5 rounded-[1.8rem] text-sm font-black uppercase tracking-[0.2em] shadow-2xl hover:-translate-y-1 active:scale-95 transition-all ${copied ? 'bg-emerald-500 text-white' : 'bg-indigo-600 text-white'}`}>{copied ? <Check size={24} /> : <Share2 size={24} />}{copied ? 'COPIED' : 'SHARE LINK'}</button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
                <div className="min-h-screen"><PortfolioPreview data={state.data} theme={state.theme} /></div>
                <div className="h-64"></div>
              </div>
            )}
          </main>
          
          {state.view !== 'preview' && (
            <footer className="bg-white border-t border-slate-100 py-32 px-8 text-center">
              <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-16">
                <div className="flex items-center gap-5">
                  <div className="w-14 h-14 bg-gradient-to-tr from-indigo-600 to-purple-600 text-white rounded-[1.2rem] flex items-center justify-center shadow-xl"><Rocket size={28} /></div>
                  <h1 className="text-3xl font-black tracking-tighter leading-none text-slate-900 italic">FreelancePortfolio</h1>
                </div>
                <div className="flex flex-col md:flex-row items-center gap-12">
                  <div className="flex items-center gap-3 text-[11px] font-black uppercase tracking-[0.4em] text-slate-400"><ShieldCheck size={18} className="text-emerald-500" /> AES-256 PORTAL ENCRYPTION</div>
                  <p className="text-xs font-black text-slate-300 uppercase tracking-[0.4em] italic">© {new Date().getFullYear()} PORTFOLIO STUDIO.</p>
                </div>
              </div>
            </footer>
          )}
        </>
      )}
    </div>
  );
}
