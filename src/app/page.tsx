'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { supabase, isSupabaseConfigured } from '@/lib/supabaseClient';
import ContributionGrid, { ContributionGridSkeleton } from '@/components/ContributionGrid';
import FocusTimer from '@/components/FocusTimer';
import VisionBoard from '@/components/VisionBoard';
import DreamBoard from '@/components/DreamBoard';
import StudyNotes from '@/components/StudyNotes';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Crosshair, Flame, LogOut, Target, Loader2, Trash2, Sparkles, User, AlertTriangle, Cloud, PanelLeftClose, PanelLeftOpen, Menu, X, BookOpen } from 'lucide-react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { differenceInDays, parseISO } from 'date-fns';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { cn } from '@/lib/utils';

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
  const [isProfileOpen, setIsProfileOpen] = useState<boolean>(false);
  const [isClearConfirmOpen, setIsClearConfirmOpen] = useState<boolean>(false);
  const [isSidebarExpanded, setIsSidebarExpanded] = useState<boolean>(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState<boolean>(false);
  const mobileDropdownRef = useRef<HTMLDivElement>(null);
  const desktopDropdownRef = useRef<HTMLDivElement>(null);

  // User initials for sidebar avatar
  const userEmailInitials = React.useMemo(() => {
    if (!user || !user.email) return 'GM';
    const emailParts = user.email.split('@')[0];
    return emailParts.substring(0, 2).toUpperCase();
  }, [user]);

  // Click outside to close profile dropdown
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      const target = event.target as Node;
      const clickedMobile = mobileDropdownRef.current && mobileDropdownRef.current.contains(target);
      const clickedDesktop = desktopDropdownRef.current && desktopDropdownRef.current.contains(target);
      if (!clickedMobile && !clickedDesktop) {
        setIsProfileOpen(false);
      }
    }
    if (isProfileOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isProfileOpen]);

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
  const executeClearLogs = async () => {
    setIsClearConfirmOpen(false);

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
      <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col md:flex-row relative overflow-hidden animate-pulse">
        {/* Visual background accents */}
        <div className="absolute top-[-10%] right-[-10%] w-[50%] h-[50%] rounded-full bg-orange-600/5 blur-[120px] pointer-events-none" />
        <div className="absolute bottom-[20%] left-[-10%] w-[50%] h-[50%] rounded-full bg-amber-600/5 blur-[120px] pointer-events-none" />

        {/* Mobile Top Bar Skeleton */}
        <div className="md:hidden flex items-center justify-between px-4 py-3 border-b border-slate-900 bg-slate-950/80 backdrop-blur-md sticky top-0 z-40 shrink-0 w-full">
          <div className="w-8 h-8 rounded-lg bg-slate-800/40" />
          <div className="h-4 w-16 bg-slate-800/40 rounded" />
          <div className="w-9 h-9 rounded-full bg-slate-800/40" />
        </div>

        {/* Sidebar Skeleton */}
        <aside className="hidden md:flex w-16 h-screen border-r border-slate-900 bg-slate-950/40 backdrop-blur-md flex-col justify-between p-3 shrink-0">
          <div className="flex flex-col gap-6">
            <div className="flex justify-center py-2">
              <div className="p-1.5 rounded-lg bg-slate-800/40 w-8 h-8" />
            </div>
            <div className="flex justify-center border-b border-slate-900/50 pb-4">
              <div className="w-6 h-6 rounded bg-slate-800/40" />
            </div>
            <div className="flex flex-col gap-2 items-center">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="h-10 w-10 bg-slate-800/40 rounded-lg" />
              ))}
            </div>
          </div>
          <div className="flex justify-center">
            <div className="w-10 h-10 rounded-full bg-slate-800/40" />
          </div>
        </aside>

        {/* Main Content Area Skeleton */}
        <div className="flex-1 flex flex-col min-w-0 h-[calc(100vh-53px)] md:h-screen overflow-y-auto">
          <div className="max-w-7xl w-full mx-auto px-3 py-4 md:px-6 md:py-6 space-y-4 md:space-y-6 relative z-10 flex-1">
            {/* Daily Focus Panel Skeleton */}
            <div className="space-y-4 md:space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
                {/* Focus Timer Skeleton */}
                <div className="lg:col-span-4 flex flex-col">
                  <div className="h-[432px] rounded-xl border border-slate-800/80 bg-slate-900/40 backdrop-blur-sm p-4 sm:p-6 flex flex-col justify-between">
                    <div className="space-y-4">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-slate-800/40 gap-3 sm:gap-4">
                        <div className="space-y-2 flex-1">
                          <div className="h-4 w-40 bg-slate-800/80 rounded" />
                          <div className="h-3 w-56 bg-slate-800/60 rounded" />
                        </div>
                        <div className="h-6 w-24 bg-slate-800/60 rounded-md self-start sm:self-auto shrink-0" />
                      </div>
                      <div className="grid grid-cols-3 gap-2">
                        <div className="h-8 bg-slate-800/40 rounded-lg" />
                        <div className="h-8 bg-slate-800/40 rounded-lg" />
                        <div className="h-8 bg-slate-800/40 rounded-lg" />
                      </div>
                    </div>
                    <div className="flex flex-col items-center justify-center space-y-4 py-4">
                      <div className="w-36 h-36 rounded-full border-4 border-slate-800 flex flex-col items-center justify-center bg-slate-950/60">
                        <div className="h-6 w-20 bg-slate-800/80 rounded mb-1" />
                        <div className="h-2 w-10 bg-slate-800/60 rounded" />
                      </div>
                      <div className="w-12 h-12 rounded-full bg-slate-800/60" />
                    </div>
                    <div className="h-10 bg-slate-850 rounded-xl" />
                  </div>
                </div>
                {/* Contribution Grid Skeleton */}
                <div className="lg:col-span-8 flex flex-col">
                  <ContributionGridSkeleton />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Fallback visual display for offline/unconfigured mode
  const currentUserId = user?.id || 'mock-user-id';

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100 flex flex-col md:flex-row relative overflow-hidden">
      {/* Visual background accents */}
      <div className="absolute top-[-10%] right-[-10%] w-[50%] h-[50%] rounded-full bg-orange-600/5 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[20%] left-[-10%] w-[50%] h-[50%] rounded-full bg-amber-600/5 blur-[120px] pointer-events-none" />

      <Tabs defaultValue="focus" orientation="vertical" className="flex flex-col md:flex-row w-full min-h-screen">
        {/* Mobile Top Bar - visible only on small screens */}
        <div className="md:hidden flex items-center justify-between px-4 py-3 border-b border-slate-900 bg-slate-950/80 backdrop-blur-md sticky top-0 z-40 shrink-0">
          <button
            onClick={() => setIsMobileMenuOpen(true)}
            className="p-2 rounded-lg hover:bg-slate-900 text-slate-400 hover:text-orange-400 cursor-pointer transition-colors"
          >
            <Menu className="w-5 h-5" />
          </button>
          <span className="font-orbitron font-black text-sm tracking-wider bg-gradient-to-r from-orange-400 to-amber-500 bg-clip-text text-transparent">
            MyGoal
          </span>
          <div className="relative" ref={mobileDropdownRef}>
            <button
              onClick={() => setIsProfileOpen(!isProfileOpen)}
              className="relative flex items-center justify-center w-9 h-9 rounded-full border border-orange-500/35 hover:border-orange-500/80 bg-slate-900/60 hover:bg-slate-900 transition-all duration-300 text-orange-400 cursor-pointer"
            >
              <User className="w-4 h-4 text-orange-400" />
              <span className="absolute bottom-0 right-0 w-2 h-2 rounded-full bg-emerald-500 border border-slate-950" />
            </button>
            {/* Mobile Profile Dropdown */}
            {isProfileOpen && (
              <div className="absolute right-0 top-12 rounded-xl border border-slate-800 bg-slate-950/95 backdrop-blur-md shadow-2xl shadow-orange-950/30 py-2 z-50 animate-in fade-in duration-200 w-64">
                <div className="px-4 py-2 border-b border-slate-900 flex flex-col">
                  <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider font-audiowide">Profile Settings</span>
                  <span className="text-xs text-slate-300 font-semibold font-mono truncate">{user ? user.email : 'Guest / Demo Mode'}</span>
                </div>
                <div className="p-1 space-y-0.5 font-audiowide">
                  <button
                    onClick={() => {
                      setIsProfileOpen(false);
                      setIsClearConfirmOpen(true);
                    }}
                    className="w-full text-left px-3 py-2 rounded-lg text-[10px] tracking-wider font-semibold text-slate-350 hover:text-white hover:bg-orange-600/10 hover:border-orange-500/15 flex items-center gap-2 cursor-pointer transition-all"
                  >
                    <Trash2 className="w-4 h-4 text-orange-400" />
                    Clear All Counts
                  </button>
                  {isSupabaseConfigured && (
                    <button
                      onClick={() => {
                        setIsProfileOpen(false);
                        handleLogout();
                      }}
                      className="w-full text-left px-3 py-2 rounded-lg text-[10px] tracking-wider font-semibold text-slate-350 hover:text-white hover:bg-orange-600/10 hover:border-orange-500/15 flex items-center gap-2 cursor-pointer transition-all"
                    >
                      <LogOut className="w-4 h-4 text-orange-400" />
                      Log Out
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Mobile Slide-out Drawer Overlay */}
        <div
          className={cn(
            "md:hidden fixed inset-0 z-50 bg-black/60 backdrop-blur-sm transition-all duration-300",
            isMobileMenuOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
          )}
          onClick={() => setIsMobileMenuOpen(false)}
        >
          <div
            className={cn(
              "absolute top-0 left-0 h-full w-72 bg-slate-950/95 border-r border-slate-800 backdrop-blur-md shadow-2xl shadow-orange-950/20 flex flex-col p-4 transition-transform duration-300 ease-in-out",
              isMobileMenuOpen ? "translate-x-0" : "-translate-x-full"
            )}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Drawer Header */}
            <div className="flex items-center justify-between mb-6">
              <span className="font-orbitron font-black text-sm tracking-wider bg-gradient-to-r from-orange-400 to-amber-500 bg-clip-text text-transparent">
                MyGoal
              </span>
              <button
                onClick={() => setIsMobileMenuOpen(false)}
                className="p-2 rounded-lg hover:bg-slate-900 text-slate-400 hover:text-orange-400 cursor-pointer transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Drawer Navigation */}
            <TabsList className="bg-transparent !p-0 !w-full flex flex-col gap-1 items-stretch font-orbitron text-xs">
              <TabsTrigger
                value="focus"
                onClick={() => setIsMobileMenuOpen(false)}
                className="relative group rounded-lg text-slate-400 hover:text-slate-200 data-active:bg-orange-600/20 data-active:text-orange-300 data-active:border-orange-500/20 border border-transparent transition-all font-semibold tracking-wider flex items-center cursor-pointer gap-3 w-full justify-start px-3 py-3"
              >
                <Crosshair className="w-5 h-5 text-orange-400 shrink-0" />
                <span className="text-xs">Daily Focus</span>
              </TabsTrigger>

              <TabsTrigger
                value="hub"
                onClick={() => setIsMobileMenuOpen(false)}
                className="relative group rounded-lg text-slate-450 hover:text-slate-205 data-active:bg-orange-600/20 data-active:text-orange-300 data-active:border-orange-500/20 border border-transparent transition-all font-semibold tracking-wider flex items-center cursor-pointer gap-3 w-full justify-start px-3 py-3"
              >
                <Target className="w-5 h-5 text-orange-400 shrink-0" />
                <span className="text-xs">Preparation Hub</span>
              </TabsTrigger>

              <TabsTrigger
                value="notes"
                onClick={() => setIsMobileMenuOpen(false)}
                className="relative group rounded-lg text-slate-450 hover:text-slate-205 data-active:bg-orange-600/20 data-active:text-orange-300 data-active:border-orange-500/20 border border-transparent transition-all font-semibold tracking-wider flex items-center cursor-pointer gap-3 w-full justify-start px-3 py-3"
              >
                <BookOpen className="w-5 h-5 text-orange-400 shrink-0" />
                <span className="text-xs">Study Notes</span>
              </TabsTrigger>

              <TabsTrigger
                value="vision"
                onClick={() => setIsMobileMenuOpen(false)}
                className="relative group rounded-lg text-slate-450 hover:text-slate-205 data-active:bg-orange-600/20 data-active:text-orange-300 data-active:border-orange-500/20 border border-transparent transition-all font-semibold tracking-wider flex items-center cursor-pointer gap-3 w-full justify-start px-3 py-3"
              >
                <Sparkles className="w-5 h-5 text-orange-400 shrink-0" />
                <span className="text-xs">Vision Board</span>
              </TabsTrigger>

              <TabsTrigger
                value="dreamboard"
                onClick={() => setIsMobileMenuOpen(false)}
                className="relative group rounded-lg text-slate-450 hover:text-slate-205 data-active:bg-orange-600/20 data-active:text-orange-300 data-active:border-orange-500/20 border border-transparent transition-all font-semibold tracking-wider flex items-center cursor-pointer gap-3 w-full justify-start px-3 py-3"
              >
                <Cloud className="w-5 h-5 text-orange-400 shrink-0" />
                <span className="text-xs">Dream Board</span>
              </TabsTrigger>
            </TabsList>

            {/* Drawer Bottom: User info */}
            <div className="mt-auto pt-6 border-t border-slate-800/40">
              <div className="flex items-center gap-3 p-2 rounded-xl bg-slate-900/20 border border-slate-850">
                <div className="relative flex items-center justify-center w-8 h-8 rounded-full border border-orange-500/35 bg-slate-950 text-orange-400 font-audiowide text-xs shrink-0">
                  {userEmailInitials}
                  <span className="absolute bottom-0 right-0 w-2 h-2 rounded-full bg-emerald-500 border border-slate-950" />
                </div>
                <div className="flex flex-col min-w-0 text-left">
                  <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider font-audiowide leading-none mb-0.5">User</span>
                  <span className="text-[10px] text-slate-300 font-semibold font-mono truncate w-40 leading-none">{user ? user.email : 'Guest Mode'}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Desktop Collapsible Sidebar - hidden on mobile */}
        <aside
          className={cn(
            "hidden md:flex h-screen border-r border-slate-900 bg-slate-950/40 backdrop-blur-md flex-col justify-between p-3 relative z-30 transition-all duration-300 ease-in-out shrink-0 select-none",
            isSidebarExpanded ? "w-64" : "w-16"
          )}
        >
          <div className="flex flex-col gap-6">
            {/* Sidebar Top: Toggle & Logo */}
            <div className={cn("flex items-center py-2", isSidebarExpanded ? "justify-between px-2" : "justify-center")}>
              {isSidebarExpanded ? (
                <>
                  <div className="flex items-center px-1">
                    <span className="font-orbitron font-black text-sm tracking-wider bg-gradient-to-r from-orange-400 to-amber-500 bg-clip-text text-transparent">
                      MyGoal
                    </span>
                  </div>
                  <button
                    onClick={() => setIsSidebarExpanded(false)}
                    className="p-1.5 rounded-lg hover:bg-slate-900 text-slate-400 hover:text-orange-400 cursor-pointer transition-colors"
                  >
                    <PanelLeftClose className="w-4 h-4" />
                  </button>
                </>
              ) : (
                <button
                  onClick={() => setIsSidebarExpanded(true)}
                  className="w-10 h-10 flex items-center justify-center rounded-lg hover:bg-slate-900 text-slate-400 hover:text-orange-400 cursor-pointer transition-colors"
                >
                  <PanelLeftOpen className="w-5 h-5" />
                </button>
              )}
            </div>

            {/* Tabs Trigger Buttons */}
            <TabsList className={cn("bg-transparent !p-0 !w-full flex flex-col font-orbitron text-xs", isSidebarExpanded ? "gap-1 items-stretch" : "gap-4 items-center")}>
              <TabsTrigger
                value="focus"
                className={cn(
                  "relative group rounded-lg text-slate-400 hover:text-slate-200 data-active:bg-orange-600/20 data-active:text-orange-300 data-active:border-orange-500/20 border border-transparent transition-all font-semibold tracking-wider flex items-center cursor-pointer gap-3",
                  !isSidebarExpanded ? "!w-10 !h-10 !flex-none !justify-center !p-0" : "w-full justify-start px-3 py-2.5"
                )}
              >
                <Crosshair className="w-5 h-5 text-orange-400 shrink-0" />
                {isSidebarExpanded && <span className="text-xs transition-all duration-300">Daily Focus</span>}
                {!isSidebarExpanded && (
                  <div className="absolute left-14 hidden group-hover:flex px-2.5 py-1.5 bg-slate-900 border border-slate-800 text-slate-200 text-xs rounded-md whitespace-nowrap pointer-events-none z-50 shadow-xl font-orbitron">
                    Daily Focus
                  </div>
                )}
              </TabsTrigger>

              <TabsTrigger
                value="hub"
                className={cn(
                  "relative group rounded-lg text-slate-400 hover:text-slate-200 data-active:bg-orange-600/20 data-active:text-orange-300 data-active:border-orange-500/20 border border-transparent transition-all font-semibold tracking-wider flex items-center cursor-pointer gap-3",
                  !isSidebarExpanded ? "!w-10 !h-10 !flex-none !justify-center !p-0" : "w-full justify-start px-3 py-2.5"
                )}
              >
                <Target className="w-5 h-5 text-orange-400 shrink-0" />
                {isSidebarExpanded && <span className="text-xs transition-all duration-300">Preparation Hub</span>}
                {!isSidebarExpanded && (
                  <div className="absolute left-14 hidden group-hover:flex px-2.5 py-1.5 bg-slate-900 border border-slate-800 text-slate-200 text-xs rounded-md whitespace-nowrap pointer-events-none z-50 shadow-xl font-orbitron">
                    Preparation Hub
                  </div>
                )}
              </TabsTrigger>

              <TabsTrigger
                value="notes"
                className={cn(
                  "relative group rounded-lg text-slate-450 hover:text-slate-205 data-active:bg-orange-600/20 data-active:text-orange-300 data-active:border-orange-500/20 border border-transparent transition-all font-semibold tracking-wider flex items-center cursor-pointer gap-3",
                  !isSidebarExpanded ? "!w-10 !h-10 !flex-none !justify-center !p-0" : "w-full justify-start px-3 py-2.5"
                )}
              >
                <BookOpen className="w-5 h-5 text-orange-400 shrink-0" />
                {isSidebarExpanded && <span className="text-xs transition-all duration-300">Study Notes</span>}
                {!isSidebarExpanded && (
                  <div className="absolute left-14 hidden group-hover:flex px-2.5 py-1.5 bg-slate-900 border border-slate-800 text-slate-200 text-xs rounded-md whitespace-nowrap pointer-events-none z-50 shadow-xl font-orbitron">
                    Study Notes
                  </div>
                )}
              </TabsTrigger>

              <TabsTrigger
                value="vision"
                className={cn(
                  "relative group rounded-lg text-slate-400 hover:text-slate-200 data-active:bg-orange-600/20 data-active:text-orange-300 data-active:border-orange-500/20 border border-transparent transition-all font-semibold tracking-wider flex items-center cursor-pointer gap-3",
                  !isSidebarExpanded ? "!w-10 !h-10 !flex-none !justify-center !p-0" : "w-full justify-start px-3 py-2.5"
                )}
              >
                <Sparkles className="w-5 h-5 text-orange-400 shrink-0" />
                {isSidebarExpanded && <span className="text-xs transition-all duration-300">Vision Board</span>}
                {!isSidebarExpanded && (
                  <div className="absolute left-14 hidden group-hover:flex px-2.5 py-1.5 bg-slate-900 border border-slate-800 text-slate-200 text-xs rounded-md whitespace-nowrap pointer-events-none z-50 shadow-xl font-orbitron">
                    Vision Board
                  </div>
                )}
              </TabsTrigger>

              <TabsTrigger
                value="dreamboard"
                className={cn(
                  "relative group rounded-lg text-slate-400 hover:text-slate-200 data-active:bg-orange-600/20 data-active:text-orange-300 data-active:border-orange-500/20 border border-transparent transition-all font-semibold tracking-wider flex items-center cursor-pointer gap-3",
                  !isSidebarExpanded ? "!w-10 !h-10 !flex-none !justify-center !p-0" : "w-full justify-start px-3 py-2.5"
                )}
              >
                <Cloud className="w-5 h-5 text-orange-400 shrink-0" />
                {isSidebarExpanded && <span className="text-xs transition-all duration-300">Dream Board</span>}
                {!isSidebarExpanded && (
                  <div className="absolute left-14 hidden group-hover:flex px-2.5 py-1.5 bg-slate-900 border border-slate-800 text-slate-200 text-xs rounded-md whitespace-nowrap pointer-events-none z-50 shadow-xl font-orbitron">
                    Dream Board
                  </div>
                )}
              </TabsTrigger>
            </TabsList>
          </div>

          {/* Sidebar Bottom: Profile settings */}
          <div className="relative" ref={desktopDropdownRef}>
            {isSidebarExpanded ? (
              <div
                onClick={() => setIsProfileOpen(!isProfileOpen)}
                className="flex items-center gap-3 p-2 rounded-xl bg-slate-900/20 border border-slate-850 hover:bg-slate-900/40 hover:border-orange-500/20 transition-all duration-300 w-full cursor-pointer"
              >
                <div className="relative flex items-center justify-center w-8 h-8 rounded-full border border-orange-500/35 bg-slate-950 text-orange-400 font-audiowide text-xs shrink-0">
                  {userEmailInitials}
                  <span className="absolute bottom-0 right-0 w-2 h-2 rounded-full bg-emerald-500 border border-slate-950" />
                </div>
                <div className="flex flex-col min-w-0 text-left">
                  <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider font-audiowide leading-none mb-0.5">User</span>
                  <span className="text-[10px] text-slate-300 font-semibold font-mono truncate w-32 leading-none">{user ? user.email : 'Guest Mode'}</span>
                </div>
              </div>
            ) : (
              <div className="flex justify-center">
                <button
                  onClick={() => setIsProfileOpen(!isProfileOpen)}
                  className="relative flex items-center justify-center w-10 h-10 rounded-full border border-orange-500/35 hover:border-orange-500/80 bg-slate-900/60 hover:bg-slate-900 transition-all duration-300 text-orange-400 cursor-pointer"
                >
                  <User className="w-5 h-5 text-orange-400" />
                  <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-emerald-500 border border-slate-950" />
                </button>
              </div>
            )}

            {/* Profile Dropdown Menu */}
            {isProfileOpen && (
              <div
                className={cn(
                  "absolute rounded-xl border border-slate-800 bg-slate-950/95 backdrop-blur-md shadow-2xl shadow-orange-950/30 py-2 z-50 animate-in fade-in duration-200 w-64",
                  isSidebarExpanded ? "bottom-14 left-0" : "bottom-0 left-14"
                )}
              >
                <div className="px-4 py-2 border-b border-slate-900 flex flex-col">
                  <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider font-audiowide">Profile Settings</span>
                  <span className="text-xs text-slate-300 font-semibold font-mono truncate">{user ? user.email : 'Guest / Demo Mode'}</span>
                </div>
                <div className="p-1 space-y-0.5 font-audiowide">
                  <button
                    onClick={() => {
                      setIsProfileOpen(false);
                      setIsClearConfirmOpen(true);
                    }}
                    className="w-full text-left px-3 py-2 rounded-lg text-[10px] tracking-wider font-semibold text-slate-350 hover:text-white hover:bg-orange-600/10 hover:border-orange-500/15 flex items-center gap-2 cursor-pointer transition-all"
                  >
                    <Trash2 className="w-4 h-4 text-orange-400" />
                    Clear All Counts
                  </button>
                  {isSupabaseConfigured && (
                    <button
                      onClick={() => {
                        setIsProfileOpen(false);
                        handleLogout();
                      }}
                      className="w-full text-left px-3 py-2 rounded-lg text-[10px] tracking-wider font-semibold text-slate-350 hover:text-white hover:bg-orange-600/10 hover:border-orange-500/15 flex items-center gap-2 cursor-pointer transition-all"
                    >
                      <LogOut className="w-4 h-4 text-orange-400" />
                      Log Out
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        </aside>

        {/* Right Content Viewport */}
        <div className="flex-1 flex flex-col min-w-0 h-[calc(100vh-53px)] md:h-screen overflow-y-auto">
          {/* Unconfigured Demo Notice */}
          {!isSupabaseConfigured && (
            <div className="bg-amber-500/10 border-b border-amber-500/20 text-amber-200 text-xs py-2 px-4 flex items-center justify-between gap-3 shrink-0">
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

          {/* Main Content Area */}
          <div className="max-w-7xl w-full mx-auto px-3 py-4 md:px-6 md:py-6 space-y-4 md:space-y-6 relative z-10 flex-1">
            {/* Daily Focus Panel */}
            <TabsContent value="focus" className="space-y-6 outline-none">
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
                <div className="lg:col-span-4 flex flex-col">
                  <FocusTimer userId={currentUserId} onLogSaved={fetchStudyLogs} />
                </div>
                <div className="lg:col-span-8 flex flex-col">
                  {loadingLogs ? (
                    <ContributionGridSkeleton />
                  ) : (
                    <ContributionGrid logs={displayLogs} />
                  )}
                </div>
              </div>
            </TabsContent>

            {/* Preparation Hub Panel */}
            <TabsContent value="hub" className="space-y-6 outline-none">
              {/* Header banner */}
              <div className="p-6 rounded-xl border border-slate-800 bg-slate-900/40 backdrop-blur-md shadow-lg flex flex-col md:flex-row md:items-center justify-between gap-6 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-[300px] h-[300px] rounded-full bg-orange-600/5 blur-[80px] pointer-events-none" />
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Target className="w-6 h-6 text-orange-400" />
                    <h2 className="text-xl font-bold text-slate-100 font-orbitron tracking-wide">Preparation Hub</h2>
                  </div>
                  <p className="text-slate-400 text-sm max-w-2xl leading-relaxed">
                    Land your dream role at <strong className="text-slate-200">Google, Amazon, or Microsoft</strong>. Success is built on daily execution. Monitor your progress and metrics below.
                  </p>
                </div>
                <div className="bg-slate-950/85 p-4 rounded-xl border border-orange-500/20 flex flex-col items-center justify-center min-w-[200px] text-center shadow-lg shadow-orange-950/20">
                  <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider font-audiowide mb-1">Target Date Countdown</span>
                  <span className="text-3xl font-black text-slate-100 font-oxanium tracking-wide">{daysRemaining}</span>
                  <span className="text-[10px] text-orange-400 font-bold uppercase tracking-wider font-orbitron mt-1">Days Remaining</span>
                </div>
              </div>

              {/* Category Details & Stats */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {/* Total Prep */}
                <Card className="bg-slate-900/40 border border-slate-800/80 backdrop-blur-md shadow-lg relative overflow-hidden group hover:border-orange-500/30 transition-all duration-300">
                  <div className="absolute top-0 right-0 w-24 h-24 bg-orange-600/5 rounded-bl-full pointer-events-none group-hover:bg-orange-600/10 transition-all" />
                  <CardContent className="p-6 space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] text-slate-450 font-bold uppercase tracking-wider font-audiowide">Total Preparation</span>
                      <div className="p-1.5 rounded-lg bg-orange-500/10 text-orange-400 border border-orange-500/20">
                        <Flame className="w-4 h-4 fill-current animate-pulse" />
                      </div>
                    </div>
                    <div className="space-y-1">
                      <h3 className="text-3xl font-black text-slate-100 font-oxanium tracking-wide">{summary.totalHours} hrs</h3>
                      <p className="text-[10px] text-slate-500 font-semibold font-mono">Cumulative across all topics</p>
                    </div>
                    <p className="text-xs text-slate-400 leading-relaxed pt-2 border-t border-slate-800/40">
                      Your combined effort towards master level proficiency.
                    </p>
                  </CardContent>
                </Card>

                {/* DSA Logs */}
                <Card className="bg-slate-900/40 border border-slate-800/80 backdrop-blur-md shadow-lg relative overflow-hidden group hover:border-orange-500/30 transition-all duration-300">
                  <div className="absolute top-0 right-0 w-24 h-24 bg-amber-600/5 rounded-bl-full pointer-events-none group-hover:bg-amber-600/10 transition-all" />
                  <CardContent className="p-6 space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] text-slate-450 font-bold uppercase tracking-wider font-audiowide">DSA Logs</span>
                      <div className="p-1.5 rounded-lg bg-amber-500/10 text-amber-400 border border-amber-500/20">
                        <Target className="w-4 h-4" />
                      </div>
                    </div>
                    <div className="space-y-1">
                      <h3 className="text-3xl font-black text-slate-100 font-oxanium tracking-wide">{summary.dsaHours} hrs</h3>
                      <p className="text-[10px] text-slate-500 font-semibold font-mono">Algorithms & Data Structures</p>
                    </div>
                    <p className="text-xs text-slate-400 leading-relaxed pt-2 border-t border-slate-800/40">
                      Focus: LeetCode problems, graph patterns, dynamic programming, and complexity.
                    </p>
                  </CardContent>
                </Card>

                {/* LLD Logs */}
                <Card className="bg-slate-900/40 border border-slate-800/80 backdrop-blur-md shadow-lg relative overflow-hidden group hover:border-orange-500/30 transition-all duration-300">
                  <div className="absolute top-0 right-0 w-24 h-24 bg-orange-600/5 rounded-bl-full pointer-events-none group-hover:bg-orange-600/10 transition-all" />
                  <CardContent className="p-6 space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] text-slate-450 font-bold uppercase tracking-wider font-audiowide">LLD Logs</span>
                      <div className="p-1.5 rounded-lg bg-orange-500/10 text-orange-400 border border-orange-500/20">
                        <Flame className="w-4 h-4" />
                      </div>
                    </div>
                    <div className="space-y-1">
                      <h3 className="text-3xl font-black text-slate-100 font-oxanium tracking-wide">{summary.lldHours} hrs</h3>
                      <p className="text-[10px] text-slate-500 font-semibold font-mono">Low Level Design</p>
                    </div>
                    <p className="text-xs text-slate-400 leading-relaxed pt-2 border-t border-slate-800/40">
                      Focus: OOP guidelines, SOLID concepts, design patterns, and machine coding.
                    </p>
                  </CardContent>
                </Card>

                {/* Sys Design Logs */}
                <Card className="bg-slate-900/40 border border-slate-800/80 backdrop-blur-md shadow-lg relative overflow-hidden group hover:border-orange-500/30 transition-all duration-300">
                  <div className="absolute top-0 right-0 w-24 h-24 bg-pink-600/5 rounded-bl-full pointer-events-none group-hover:bg-pink-600/10 transition-all" />
                  <CardContent className="p-6 space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] text-slate-450 font-bold uppercase tracking-wider font-audiowide">Sys Design</span>
                      <div className="p-1.5 rounded-lg bg-pink-500/10 text-pink-400 border border-pink-500/20">
                        <Target className="w-4 h-4" />
                      </div>
                    </div>
                    <div className="space-y-1">
                      <h3 className="text-3xl font-black text-slate-100 font-oxanium tracking-wide">{summary.sdHours} hrs</h3>
                      <p className="text-[10px] text-slate-500 font-semibold font-mono">System Architecture</p>
                    </div>
                    <p className="text-xs text-slate-400 leading-relaxed pt-2 border-t border-slate-800/40">
                      Focus: Scalability, database sharding, caching, microservices, and system design.
                    </p>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            {/* Study Notes Panel */}
            <TabsContent value="notes" className="space-y-6 outline-none">
              <div className="p-6 rounded-xl border border-slate-800 bg-slate-900/40 backdrop-blur-md shadow-lg">
                <StudyNotes userId={currentUserId} />
              </div>
            </TabsContent>

            {/* Vision Board Panel */}
            <TabsContent value="vision" className="space-y-6 outline-none">
              <div className="p-6 rounded-xl border border-slate-800 bg-slate-900/40 backdrop-blur-md shadow-lg">
                <VisionBoard userId={currentUserId} />
              </div>
            </TabsContent>

            {/* Dream Board Panel */}
            <TabsContent value="dreamboard" className="space-y-6 outline-none">
              <div className="p-6 rounded-xl border border-slate-800 bg-slate-900/40 backdrop-blur-md shadow-lg">
                <DreamBoard userId={currentUserId} />
              </div>
            </TabsContent>
          </div>
        </div>
      </Tabs>

      {/* Clear Counts Confirmation Modal */}
      <Dialog open={isClearConfirmOpen} onOpenChange={setIsClearConfirmOpen}>
        <DialogContent className="bg-slate-900/95 border border-slate-800 text-slate-100 max-w-sm backdrop-blur-md shadow-2xl shadow-orange-950/20 rounded-xl overflow-hidden p-6 gap-6">
          <DialogHeader className="space-y-3">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-red-500/10 text-red-500 border border-red-500/20">
              <AlertTriangle className="h-6 w-6" />
            </div>
            <div className="text-center space-y-2">
              <DialogTitle className="text-lg text-slate-100 font-orbitron tracking-wide font-black">
                Confirm Reset
              </DialogTitle>
              <DialogDescription className="text-xs text-slate-400 leading-relaxed font-sans">
                Are you sure you want to clear all your logged preparation counts? This action is permanent and cannot be undone.
              </DialogDescription>
            </div>
          </DialogHeader>

          <DialogFooter className="border-slate-800/60 bg-slate-950/40 flex flex-col-reverse sm:flex-row gap-2 mt-4 justify-end">
            <Button
              onClick={() => setIsClearConfirmOpen(false)}
              className="w-full sm:w-auto bg-slate-900 border border-slate-800 hover:bg-slate-800 hover:text-orange-400 hover:border-orange-500/20 text-slate-355 font-audiowide text-[10px] tracking-wider py-2 px-4 h-auto cursor-pointer"
            >
              Cancel
            </Button>
            <Button
              onClick={executeClearLogs}
              className="w-full sm:w-auto bg-orange-600/90 hover:bg-orange-500/90 text-orange-50 font-audiowide text-[10px] tracking-wider py-2 px-4 h-auto border border-orange-400 cursor-pointer shadow-sm"
            >
              Yes, Clear All
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </main>
  );
}
