'use client';

import React, { useState, useEffect, useRef } from 'react';
import { supabase, isSupabaseConfigured } from '@/lib/supabaseClient';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Play, Pause, Square, CheckCircle, Clock, Calendar, BookOpen, User } from 'lucide-react';

interface FocusTimerProps {
  userId: string;
  onLogSaved: () => void;
}

export default function FocusTimer({ userId, onLogSaved }: FocusTimerProps) {
  const [category, setCategory] = useState<'dsa' | 'lld' | 'system_design'>('dsa');
  const [isTimerMode, setIsTimerMode] = useState<boolean>(true);
  
  // Timer states
  const [seconds, setSeconds] = useState<number>(0);
  const [isActive, setIsActive] = useState<boolean>(false);
  const [isPaused, setIsPaused] = useState<boolean>(false);
  const incrementRef = useRef<NodeJS.Timeout | null>(null);

  // Manual Log states
  const [manualMinutes, setManualMinutes] = useState<string>('');
  const [manualDate, setManualDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [manualNotes, setManualNotes] = useState<string>('');
  
  // Status states
  const [loading, setLoading] = useState<boolean>(false);
  const [statusMsg, setStatusMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Clean timer on unmount
  useEffect(() => {
    return () => {
      if (incrementRef.current) clearInterval(incrementRef.current);
    };
  }, []);

  const handleStart = () => {
    setIsActive(true);
    setIsPaused(false);
    incrementRef.current = setInterval(() => {
      setSeconds((prev) => prev + 1);
    }, 1000);
  };

  const handlePause = () => {
    setIsPaused(true);
    if (incrementRef.current) {
      clearInterval(incrementRef.current);
      incrementRef.current = null;
    }
  };

  const handleResume = () => {
    setIsPaused(false);
    incrementRef.current = setInterval(() => {
      setSeconds((prev) => prev + 1);
    }, 1000);
  };

  const handleReset = () => {
    setIsActive(false);
    setIsPaused(false);
    setSeconds(0);
    if (incrementRef.current) {
      clearInterval(incrementRef.current);
      incrementRef.current = null;
    }
  };

  const saveLog = async (minutesToSave: number, dateToSave: string, notesToSave: string) => {
    if (!isSupabaseConfigured) {
      setStatusMsg({ type: 'error', text: 'Supabase is not configured yet.' });
      return;
    }

    if (minutesToSave <= 0) {
      setStatusMsg({ type: 'error', text: 'Please log a valid duration greater than 0 minutes.' });
      return;
    }

    setLoading(true);
    setStatusMsg(null);

    try {
      // 1. Fetch if a record exists for today/specified date
      const { data: existingLogs, error: fetchError } = await supabase
        .from('study_logs')
        .select('*')
        .eq('user_id', userId)
        .eq('date', dateToSave);

      if (fetchError) throw fetchError;

      const hasExisting = existingLogs && existingLogs.length > 0;
      const existing = hasExisting ? existingLogs[0] : null;

      let dsaVal = category === 'dsa' ? minutesToSave : 0;
      let lldVal = category === 'lld' ? minutesToSave : 0;
      let sdVal = category === 'system_design' ? minutesToSave : 0;
      let combinedNotes = notesToSave;

      if (existing) {
        dsaVal += existing.dsa_minutes || 0;
        lldVal += existing.lld_minutes || 0;
        sdVal += existing.system_design_minutes || 0;
        if (existing.notes && notesToSave) {
          combinedNotes = `${existing.notes}\n${notesToSave}`;
        } else if (existing.notes) {
          combinedNotes = existing.notes;
        }
      }

      // 2. Upsert (update or insert)
      const { error: upsertError } = await supabase
        .from('study_logs')
        .upsert({
          user_id: userId,
          date: dateToSave,
          dsa_minutes: dsaVal,
          lld_minutes: lldVal,
          system_design_minutes: sdVal,
          notes: combinedNotes || null
        }, {
          onConflict: 'user_id,date'
        });

      if (upsertError) throw upsertError;

      setStatusMsg({
        type: 'success',
        text: `Logged ${minutesToSave} mins for ${category.toUpperCase()} successfully!`
      });
      
      // Notify parent dashboard to refresh statistics & calendar
      onLogSaved();

      // Reset values
      if (!isTimerMode) {
        setManualMinutes('');
        setManualNotes('');
      } else {
        handleReset();
      }
    } catch (err: any) {
      setStatusMsg({ type: 'error', text: err.message || 'Error saving logs to database.' });
    } finally {
      setLoading(false);
    }
  };

  const handleStopAndSave = () => {
    const elapsedMinutes = Math.max(1, Math.round(seconds / 60)); // minimum 1 min logged if stopwatch ran
    saveLog(elapsedMinutes, new Date().toISOString().split('T')[0], 'Logged via timer session');
  };

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const minutes = parseInt(manualMinutes, 10);
    if (isNaN(minutes) || minutes <= 0) {
      setStatusMsg({ type: 'error', text: 'Enter a valid positive number of minutes.' });
      return;
    }
    saveLog(minutes, manualDate, manualNotes);
  };

  // Helper formatting for timer digits
  const formatTime = (totalSeconds: number) => {
    const hrs = Math.floor(totalSeconds / 3600);
    const mins = Math.floor((totalSeconds % 3600) / 60);
    const secs = totalSeconds % 60;
    return [
      hrs > 0 ? String(hrs).padStart(2, '0') : null,
      String(mins).padStart(2, '0'),
      String(secs).padStart(2, '0'),
    ]
      .filter(Boolean)
      .join(':');
  };
  return (
    <Card className="h-full bg-slate-900/40 border border-slate-800/80 backdrop-blur-md shadow-lg flex flex-col">
      <CardHeader className="p-4 sm:p-5 pb-3 border-b border-slate-800/40 flex flex-col gap-3.5">
        <div className="space-y-1.5">
          <CardTitle className="text-lg text-slate-100 flex items-start gap-2.5 font-orbitron tracking-wide leading-snug">
            <Clock className="w-5 h-5 text-orange-400 shrink-0 mt-1" />
            <span>Study Logger & Focus Timer</span>
          </CardTitle>
          <CardDescription className="text-slate-400 text-xs leading-relaxed">
            Log your preparation hours to maintain your consistency streak.
          </CardDescription>
        </div>
        <div className="flex bg-slate-950 p-1 rounded-lg border border-slate-800/60 font-audiowide self-start shrink-0">
          <button
            onClick={() => { setIsTimerMode(true); setStatusMsg(null); }}
            className={`px-3 py-1 text-[10px] tracking-wider font-semibold rounded-md transition-all ${
              isTimerMode ? 'bg-orange-600/20 text-orange-300 border border-orange-500/20' : 'text-slate-500 hover:text-slate-300'
            }`}
          >
            Timer
          </button>
          <button
            onClick={() => { setIsTimerMode(false); setStatusMsg(null); }}
            className={`px-3 py-1 text-[10px] tracking-wider font-semibold rounded-md transition-all ${
              !isTimerMode ? 'bg-orange-600/20 text-orange-300 border border-orange-500/20' : 'text-slate-500 hover:text-slate-300'
            }`}
          >
            Manual
          </button>
        </div>
      </CardHeader>

      <CardContent className="p-4 sm:p-6 pt-4 sm:pt-4 flex-1 flex flex-col justify-center space-y-4">
        {/* Category Selector Tabs */}
        <div className="grid grid-cols-3 gap-2 font-oxanium">
          {(['dsa', 'lld', 'system_design'] as const).map((cat) => (
            <button
              key={cat}
              onClick={() => setCategory(cat)}
              disabled={isActive && isTimerMode}
              className={`py-2 px-3 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all border ${
                category === cat
                  ? 'bg-gradient-to-r from-orange-600/10 to-amber-600/10 border-orange-500 text-orange-300 shadow-md shadow-orange-950/10'
                  : 'bg-slate-950/40 border-slate-800 text-slate-400 hover:text-slate-200 hover:bg-slate-900/60'
              } ${(isActive && isTimerMode) ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              {cat === 'system_design' ? 'Sys Design' : cat}
            </button>
          ))}
        </div>

        {isTimerMode ? (
          /* TIMER SCREEN */
          <div className="flex flex-col items-center justify-center py-2 space-y-4">
            <div className="relative flex items-center justify-center">
              {/* Outer pulsing ring when timer is running */}
              {isActive && !isPaused && (
                <div className="absolute inset-0 rounded-full border-2 border-orange-500/30 animate-ping opacity-75" />
              )}
              <div className="w-36 h-36 rounded-full border-4 border-slate-800 flex flex-col items-center justify-center bg-slate-950/60 shadow-inner z-10">
                <span className="text-3xl font-mono font-bold text-slate-100 tracking-tight">
                  {formatTime(seconds)}
                </span>
                <span className="text-[9px] uppercase tracking-widest text-slate-500 mt-1 font-semibold font-audiowide">
                  {category === 'system_design' ? 'System Design' : category.toUpperCase()}
                </span>
              </div>
            </div>

            {/* Timer Actions */}
            <div className="flex items-center gap-3">
              {!isActive ? (
                <Button
                  onClick={handleStart}
                  className="bg-orange-600/90 hover:bg-orange-500/90 text-orange-50 rounded-full p-4 h-12 w-12 flex items-center justify-center transition-all shadow-sm border border-orange-400"
                >
                  <Play className="w-5 h-5 fill-current ml-0.5" />
                </Button>
              ) : (
                <>
                  {!isPaused ? (
                    <Button
                      onClick={handlePause}
                      variant="outline"
                      className="border-slate-700 text-slate-300 hover:bg-slate-800 rounded-full p-4 h-12 w-12 flex items-center justify-center transition-all"
                    >
                      <Pause className="w-5 h-5 fill-current" />
                    </Button>
                  ) : (
                    <Button
                      onClick={handleResume}
                      className="bg-orange-600/90 hover:bg-orange-500/90 text-orange-50 rounded-full p-4 h-12 w-12 flex items-center justify-center transition-all border border-orange-400"
                    >
                      <Play className="w-5 h-5 fill-current ml-0.5" />
                    </Button>
                  )}
                  <Button
                    onClick={handleReset}
                    variant="outline"
                    className="border-red-500/20 text-red-400 hover:bg-red-950/20 rounded-full p-4 h-12 w-12 flex items-center justify-center transition-all"
                  >
                    <Square className="w-5 h-5" />
                  </Button>
                  <Button
                    onClick={handleStopAndSave}
                    disabled={loading || seconds < 10} // require at least 10 seconds before saving to prevent spam
                    className="bg-orange-600/90 hover:bg-orange-500/90 text-orange-50 rounded-full px-5 h-12 flex items-center justify-center gap-2 transition-all shadow-sm border border-orange-400 font-semibold font-audiowide tracking-wider text-[11px]"
                  >
                    <CheckCircle className="w-5 h-5" />
                    Save {Math.max(1, Math.round(seconds / 60))}m
                  </Button>
                </>
              )}
            </div>
            
            {seconds > 0 && seconds < 10 && (
              <span className="text-[10px] text-slate-500 font-medium">Timer needs to run at least 10s to log.</span>
            )}
          </div>
        ) : (
          /* MANUAL LOG FORM */
          <form onSubmit={handleManualSubmit} className="space-y-4 pt-2">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="minutes" className="text-slate-300 text-[10px] font-semibold uppercase tracking-widest font-audiowide">Duration (Mins)</Label>
                <div className="relative">
                  <Input
                    id="minutes"
                    type="number"
                    min="1"
                    placeholder="e.g. 60"
                    value={manualMinutes}
                    onChange={(e) => setManualMinutes(e.target.value)}
                    className="bg-slate-950/60 border-slate-800/80 text-slate-100 placeholder-slate-600 focus:border-orange-500 focus:ring-orange-500/25"
                    required
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="date" className="text-slate-300 text-[10px] font-semibold uppercase tracking-widest font-audiowide">Date</Label>
                <Input
                  id="date"
                  type="date"
                  value={manualDate}
                  onChange={(e) => setManualDate(e.target.value)}
                  className="bg-slate-950/60 border-slate-800/80 text-slate-100 focus:border-orange-500 focus:ring-orange-500/25"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes" className="text-slate-300 text-[10px] font-semibold uppercase tracking-widest font-audiowide">Study Notes / Topics Covered</Label>
              <textarea
                id="notes"
                placeholder="Today I solved 3 Medium arrays questions, studied solid principles..."
                value={manualNotes}
                onChange={(e) => setManualNotes(e.target.value)}
                rows={2}
                className="w-full rounded-md border border-slate-800/80 bg-slate-950/60 p-2.5 text-sm text-slate-100 placeholder-slate-600 focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500/25 font-sans"
              />
            </div>

            <Button
              type="submit"
              disabled={loading}
              className="w-full bg-orange-600/90 hover:bg-orange-500/90 text-orange-50 font-medium py-2 rounded-[4px] transition-all shadow-sm border border-orange-400 flex items-center justify-center gap-2 font-audiowide tracking-wider"
            >
              {loading ? 'Logging...' : 'Log Practice Minutes'}
            </Button>
          </form>
        )}

        {/* Action Status Output */}
        {statusMsg && (
          <div className={`p-3 rounded-lg border text-xs flex gap-2 items-center justify-center font-mono ${
            statusMsg.type === 'success' 
              ? 'border-emerald-500/20 bg-emerald-500/10 text-emerald-400' 
              : 'border-red-500/20 bg-red-500/10 text-red-400'
          }`}>
            {statusMsg.type === 'success' ? <CheckCircle className="w-4 h-4" /> : <Square className="w-4 h-4 rotate-45" />}
            <span className="font-medium text-center">{statusMsg.text}</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
