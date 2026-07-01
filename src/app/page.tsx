'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { supabase, isSupabaseConfigured } from '@/lib/supabaseClient';
import ContributionGrid from '@/components/ContributionGrid';
import FocusTimer from '@/components/FocusTimer';
import VisionBoard from '@/components/VisionBoard';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Flame, LogOut, Target, Loader2, Trash2 } from 'lucide-react';
import { differenceInDays, parseISO } from 'date-fns';

interface StudyLog {
  date: string;
  dsa_minutes: number;
  lld_minutes: number;
  system_design_minutes: number;
  notes?: string;
}

export default function DashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [loadingSession, setLoadingSession] = useState<boolean>(true);
  const [logs, setLogs] = useState<StudyLog[]>([]);
  const [loadingLogs, setLoadingLogs] = useState<boolean>(false);

  // Mock data for preview when Supabase is not configured yet
  const mockLogs: StudyLog[] = [];

  // Protected route check
  useEffect(() => {
    const checkUser = async () => {
      if (!isSupabaseConfigured) {
        setLoadingSession(false);
        return;
      }

      const { data: { session } } = await supabase.auth.getSession();

      if (!session) {
        router.push('/login');
      } else {
        setUser(session.user);
        setLoadingSession(false);
      }
    };
    checkUser();

    // Set up auth state change listener
    if (isSupabaseConfigured) {
      const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
        if (!session) {
          router.push('/login');
        } else {
          setUser(session.user);
        }
      });
      return () => subscription.unsubscribe();
    }
  }, [router]);

  // Fetch logged data from DB
  const fetchStudyLogs = useCallback(async () => {
    if (!isSupabaseConfigured || !user) return;
    setLoadingLogs(true);
    try {
      const { data, error } = await supabase
        .from('study_logs')
        .select('*')
        .order('date', { ascending: true });

      if (error) throw error;
      setLogs(data || []);
    } catch (err: any) {
      console.error('Error fetching logs:', err.message);
    } finally {
      setLoadingLogs(false);
    }
  }, [user]);

  useEffect(() => {
    if (user) {
      fetchStudyLogs();
    }
  }, [user, fetchStudyLogs]);

  // Handle manual logout
  const handleLogout = async () => {
    if (!isSupabaseConfigured) return;
    await supabase.auth.signOut();
    router.push('/login');
    router.refresh();
  };

  // Clear all study logs
  const handleClearLogs = async () => {
    if (!confirm('Are you sure you want to clear all your logged preparation counts? This cannot be undone.')) {
      return;
    }

    if (!isSupabaseConfigured) {
      setLogs([]);
      alert('Mock counts cleared!');
      return;
    }

    setLoadingLogs(true);
    try {
      const { error } = await supabase
        .from('study_logs')
        .delete()
        .eq('user_id', user.id);

      if (error) throw error;
      setLogs([]);
      alert('All counts have been successfully cleared! You are ready to start fresh from today.');
    } catch (err: any) {
      console.error('Error clearing logs:', err.message);
      alert('Failed to clear counts: ' + err.message);
    } finally {
      setLoadingLogs(false);
    }
  };

  // Metrics calculations
  const displayLogs = isSupabaseConfigured ? logs : mockLogs;

  const summary = React.useMemo(() => {
    let totalDsa = 0;
    let totalLld = 0;
    let totalSd = 0;

    displayLogs.forEach((l) => {
      totalDsa += l.dsa_minutes || 0;
      totalLld += l.lld_minutes || 0;
      totalSd += l.system_design_minutes || 0;
    });

    const totalHours = ((totalDsa + totalLld + totalSd) / 60).toFixed(1);
    return {
      dsaHours: (totalDsa / 60).toFixed(1),
      lldHours: (totalLld / 60).toFixed(1),
      sdHours: (totalSd / 60).toFixed(1),
      totalHours
    };
  }, [displayLogs]);

  // Countdown calculations (Target: July 1, 2027)
  const daysRemaining = React.useMemo(() => {
    const targetDate = parseISO('2027-07-01');
    const today = new Date();
    const diff = differenceInDays(targetDate, today);
    return Math.max(0, diff);
  }, []);

  if (loadingSession) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-slate-100 gap-3">
        <Loader2 className="w-8 h-8 text-violet-500 animate-spin" />
        <span className="text-sm font-semibold tracking-wider text-slate-400">Loading Dashboard...</span>
      </div>
    );
  }

  // Fallback visual display for offline/unconfigured mode
  const currentUserId = user?.id || 'mock-user-id';

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100 pb-16 relative overflow-hidden">
      {/* Visual background accents */}
      <div className="absolute top-[-10%] right-[-10%] w-[50%] h-[50%] rounded-full bg-violet-600/5 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[20%] left-[-10%] w-[50%] h-[50%] rounded-full bg-indigo-600/5 blur-[120px] pointer-events-none" />

      {/* Unconfigured Demo Notice */}
      {!isSupabaseConfigured && (
        <div className="bg-amber-500/10 border-b border-amber-500/20 text-amber-200 text-xs py-2 px-4 flex items-center justify-between gap-3 relative z-50">
          <div className="flex items-center gap-2">
            <span className="bg-amber-500 text-slate-950 font-bold px-1.5 py-0.5 rounded text-[10px]">DEMO PREVIEW</span>
            <span>Local DB is inactive. Configure your credentials in <code className="bg-slate-950/60 px-1 rounded py-0.5">.env.local</code> to store logs.</span>
          </div>
          <Button
            variant="link"
            onClick={() => router.push('/login')}
            className="text-amber-300 font-bold text-xs h-auto p-0 hover:text-amber-200"
          >
            Setup Guide
          </Button>
        </div>
      )}

      {/* Dashboard Top Header */}
      <header className="border-b border-slate-900 bg-slate-950/50 backdrop-blur-md sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-violet-600/20 text-violet-400 border border-violet-500/10">
              <Flame className="w-6 h-6 fill-current animate-pulse" />
            </div>
            <h1 className="text-xl font-black font-orbitron tracking-wider bg-gradient-to-r from-slate-100 to-indigo-200 bg-clip-text text-transparent">
              MyGoal
            </h1>
          </div>

          <div className="flex items-center gap-4">
            {user && (
              <div className="hidden md:flex flex-col text-right">
                <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider font-audiowide">Logged In</span>
                <span className="text-xs text-slate-300 font-semibold font-mono">{user.email}</span>
              </div>
            )}
            {isSupabaseConfigured && (
              <div className="flex gap-2 font-audiowide">
                <Button
                  onClick={handleClearLogs}
                  className="bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white h-9 px-3 gap-2 text-[10px] tracking-wider transition-all shadow-md shadow-violet-950/20 border-none"
                >
                  <Trash2 className="w-4 h-4" /> Clear All Counts
                </Button>
                <Button
                  onClick={handleLogout}
                  className="bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white h-9 px-3 gap-2 text-[10px] tracking-wider transition-all shadow-md shadow-violet-950/20 border-none"
                >
                  <LogOut className="w-4 h-4" /> Log Out
                </Button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Main Container */}
      <div className="max-w-7xl mx-auto px-4 pt-6 space-y-6 relative z-10">
        
        {/* Main Grid Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          
          {/* Left Column: Focus Timer & Stats */}
          <div className="lg:col-span-4 space-y-6">
            <FocusTimer userId={currentUserId} onLogSaved={fetchStudyLogs} />

            {/* Compact Countdown & Stats Card */}
            <Card className="bg-slate-900/40 border border-slate-800/80 backdrop-blur-md shadow-lg">
              <CardContent className="p-5 space-y-4">
                {/* Header / Title */}
                <div className="flex items-center justify-between border-b border-slate-800/40 pb-3">
                  <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2 font-orbitron tracking-wider">
                    <Target className="w-4 h-4 text-violet-400" />
                    Preparation Hub
                  </h3>
                  <span className="px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-wider bg-violet-500/20 text-violet-300 border border-violet-500/30 font-orbitron">
                    Target July 2027
                  </span>
                </div>

                {/* Countdown Banner (Compact) */}
                <div className="bg-slate-950/60 p-3 rounded-lg border border-slate-900/60 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Flame className="w-4 h-4 text-indigo-400 fill-current animate-pulse" />
                    <span className="text-[10px] text-slate-450 font-bold uppercase tracking-wider block font-audiowide">Countdown</span>
                  </div>
                  <span className="text-sm font-black text-slate-100 font-oxanium tracking-wide">{daysRemaining} Days Left</span>
                </div>

                {/* Goals Info text (Small / Compact) */}
                <p className="text-[11px] text-slate-400 leading-relaxed font-medium">
                  Land your dream role at <strong className="text-slate-200">Google, Amazon, or Microsoft</strong>. Success is built on daily execution. Spend 3 hours today to keep the momentum going.
                </p>

                {/* Grid of 4 stats (2x2) */}
                <div className="grid grid-cols-2 gap-3 pt-2 border-t border-slate-800/45">
                  <div className="p-3 rounded-lg bg-slate-950/40 border border-slate-900/80 flex flex-col justify-center">
                    <span className="text-[9px] text-slate-500 font-bold uppercase tracking-wider mb-1 font-audiowide">Total Prep</span>
                    <span className="text-lg font-black text-slate-100 font-oxanium tracking-wide">{summary.totalHours} hrs</span>
                  </div>
                  <div className="p-3 rounded-lg bg-slate-950/40 border border-slate-900/80 flex flex-col justify-center">
                    <span className="text-[9px] text-slate-500 font-bold uppercase tracking-wider mb-1 font-audiowide">DSA Logs</span>
                    <span className="text-lg font-black text-slate-100 font-oxanium tracking-wide">{summary.dsaHours} hrs</span>
                  </div>
                  <div className="p-3 rounded-lg bg-slate-950/40 border border-slate-900/80 flex flex-col justify-center">
                    <span className="text-[9px] text-slate-500 font-bold uppercase tracking-wider mb-1 font-audiowide">LLD Logs</span>
                    <span className="text-lg font-black text-slate-100 font-oxanium tracking-wide">{summary.lldHours} hrs</span>
                  </div>
                  <div className="p-3 rounded-lg bg-slate-950/40 border border-slate-900/80 flex flex-col justify-center">
                    <span className="text-[9px] text-slate-500 font-bold uppercase tracking-wider mb-1 font-audiowide">Sys Design</span>
                    <span className="text-lg font-black text-slate-100 font-oxanium tracking-wide">{summary.sdHours} hrs</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Right Column: Grid & Vision Board */}
          <div className="lg:col-span-8 space-y-6">
            {loadingLogs ? (
              <div className="h-64 rounded-xl border border-slate-800/80 bg-slate-900/40 backdrop-blur-sm animate-pulse" />
            ) : (
              <ContributionGrid logs={displayLogs} />
            )}

            <VisionBoard userId={currentUserId} />
          </div>

        </div>
      </div>
    </main>
  );
}
