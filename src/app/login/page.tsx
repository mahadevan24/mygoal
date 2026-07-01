'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase, isSupabaseConfigured } from '@/lib/supabaseClient';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { CheckCircle2, AlertTriangle, KeyRound, Mail, Sparkles, Flame } from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [mode, setMode] = useState<'login' | 'signup'>('login');

  useEffect(() => {
    // Direct redirect to home if already authenticated
    const checkSession = async () => {
      if (!isSupabaseConfigured) return;
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        router.push('/');
      }
    };
    checkSession();
  }, [router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    if (!isSupabaseConfigured) {
      setErrorMsg('Supabase credentials are not configured. Check .env.local file.');
      return;
    }

    if (!email || !password) {
      setErrorMsg('Please enter both email and password.');
      return;
    }

    setLoading(true);

    try {
      if (mode === 'login') {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        router.push('/');
        router.refresh();
      } else {
        const { error, data } = await supabase.auth.signUp({
          email,
          password,
        });
        if (error) throw error;
        
        if (data.user && data.user.identities && data.user.identities.length === 0) {
          setSuccessMsg('Account already exists! Try signing in.');
        } else {
          setSuccessMsg('Registration successful! You can now log in.');
          setMode('login');
        }
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Authentication failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center p-4 relative overflow-hidden">
      {/* Visual background accents */}
      <div className="absolute top-[-20%] left-[-20%] w-[60%] h-[60%] rounded-full bg-orange-600/10 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-20%] right-[-20%] w-[60%] h-[60%] rounded-full bg-emerald-600/10 blur-[120px] pointer-events-none" />

      <div className="w-full max-w-md relative z-10">
        {/* Brand header */}
        <div className="flex flex-col items-center mb-8">
          <div className="flex items-center gap-2 mb-2">
            <div className="p-2 rounded-xl bg-orange-600/20 text-orange-400 border border-orange-500/20">
              <Flame className="w-8 h-8 animate-pulse" />
            </div>
            <span className="text-3xl font-extrabold font-orbitron tracking-wider bg-gradient-to-r from-orange-400 to-amber-200 bg-clip-text text-transparent">
              MyGoal
            </span>
          </div>
          <p className="text-slate-400 text-sm text-center">
            One year of relentless consistency to land your dream role.
          </p>
        </div>

        {/* Supabase Warning Banner */}
        {!isSupabaseConfigured && (
          <div className="mb-6 p-4 rounded-xl border border-amber-500/30 bg-amber-500/10 text-amber-200 text-sm flex gap-3 items-start shadow-lg shadow-amber-950/20">
            <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
            <div>
              <span className="font-semibold block mb-0.5">Configuration Required</span>
              Supabase credentials are not configured. To enable authentication and data storage:
              <code className="block mt-2 p-1.5 rounded bg-slate-900 text-slate-300 font-mono text-xs border border-slate-800">
                1. Set values in .env.local<br/>
                2. Run SQL in supabase_schema.sql<br/>
                3. Restart the server.
              </code>
            </div>
          </div>
        )}

        <Card className="bg-slate-900/40 border border-slate-800/80 backdrop-blur-xl shadow-2xl">
          <CardHeader>
            <CardTitle className="text-xl text-slate-100 flex items-center gap-2 font-orbitron tracking-wide">
              <Sparkles className="w-5 h-5 text-orange-400" />
              {mode === 'login' ? 'Sign In to Your Dashboard' : 'Create Your Account'}
            </CardTitle>
            <CardDescription className="text-slate-400">
              {mode === 'login' 
                ? 'Enter your credentials to access your daily trackers and vision board.' 
                : 'Start your 365-day challenge today. Track your DSA, LLD, and System Design hours.'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email" className="text-slate-300 text-[10px] font-semibold uppercase tracking-widest font-audiowide">Email Address</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-2.5 h-5 w-5 text-slate-500" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="you@domain.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="pl-10 bg-slate-950/60 border-slate-800/80 text-slate-100 focus:border-orange-500 focus:ring-orange-500/25 placeholder-slate-600"
                    required
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="password" className="text-slate-300 text-[10px] font-semibold uppercase tracking-widest font-audiowide">Password</Label>
                <div className="relative">
                  <KeyRound className="absolute left-3 top-2.5 h-5 w-5 text-slate-500" />
                  <Input
                    id="password"
                    type="password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="pl-10 bg-slate-950/60 border-slate-800/80 text-slate-100 focus:border-orange-500 focus:ring-orange-500/25 placeholder-slate-600"
                    required
                  />
                </div>
              </div>

              {errorMsg && (
                <div className="p-3 rounded-lg border border-red-500/20 bg-red-500/10 text-red-400 text-xs flex gap-2 items-center font-mono">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  <span>{errorMsg}</span>
                </div>
              )}

              {successMsg && (
                <div className="p-3 rounded-lg border border-emerald-500/20 bg-emerald-500/10 text-emerald-400 text-xs flex gap-2 items-center font-mono">
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  <span>{successMsg}</span>
                </div>
              )}

              <Button
                type="submit"
                className="w-full bg-orange-600/90 hover:bg-orange-500/90 text-orange-50 font-medium py-2 rounded-[4px] transition-all shadow-sm border border-orange-400 font-audiowide tracking-wider"
                disabled={loading}
              >
                {loading ? 'Processing...' : mode === 'login' ? 'Sign In' : 'Sign Up'}
              </Button>
            </form>
          </CardContent>
          <CardFooter className="flex flex-col items-center gap-2 border-t border-slate-800/40 pt-4">
            <span className="text-slate-400 text-xs">
              {mode === 'login' ? "Don't have an account?" : 'Already have an account?'}
            </span>
            <Button
              variant="link"
              onClick={() => {
                setMode(mode === 'login' ? 'signup' : 'login');
                setErrorMsg(null);
                setSuccessMsg(null);
              }}
              className="text-orange-400 hover:text-orange-300 text-xs font-semibold p-0 h-auto font-audiowide tracking-wider"
            >
              {mode === 'login' ? 'Register Now' : 'Log In Instead'}
            </Button>
          </CardFooter>
        </Card>
      </div>
    </main>
  );
}
