'use client';

import React, { useState, useMemo } from 'react';
import { subDays, format, eachDayOfInterval, startOfDay, isSameDay } from 'date-fns';
import { Flame, Info, CheckCircle2, AlertTriangle, Calendar } from 'lucide-react';

interface StudyLog {
  date: string;
  dsa_minutes: number;
  lld_minutes: number;
  system_design_minutes: number;
  notes?: string;
}

interface ContributionGridProps {
  logs: StudyLog[];
}

export default function ContributionGrid({ logs }: ContributionGridProps) {
  const [hoveredDay, setHoveredDay] = useState<{
    date: Date;
    dsa: number;
    lld: number;
    sd: number;
    notes?: string;
  } | null>(null);

  // Map database logs into a lookup table by date string (YYYY-MM-DD)
  const logMap = useMemo(() => {
    const map: Record<string, StudyLog> = {};
    logs.forEach((log) => {
      // Ensure date format is YYYY-MM-DD
      const dateStr = typeof log.date === 'string' ? log.date.split('T')[0] : format(new Date(log.date), 'yyyy-MM-dd');
      map[dateStr] = log;
    });
    return map;
  }, [logs]);

  // Generate fixed 365 days starting from July 1, 2026
  const days = useMemo(() => {
    const startDate = startOfDay(new Date(2026, 6, 1)); // July 1, 2026 (Month is 0-indexed, so 6 is July)
    const endDate = startOfDay(new Date(2027, 5, 30));   // June 30, 2027 (Month is 5 is June)
    return eachDayOfInterval({ start: startDate, end: endDate });
  }, []);

  // Compute streaks
  const streakStats = useMemo(() => {
    let currentStreak = 0;
    let maxStreak = 0;
    let completedDays = 0;
    let partialDays = 0;

    const todayStr = format(new Date(), 'yyyy-MM-dd');
    const yesterdayStr = format(subDays(new Date(), 1), 'yyyy-MM-dd');

    // Go back in time starting from today to calculate current streak
    let tempCurrentStreak = 0;
    let checkedDate = new Date();
    
    // We only break the current streak if they missed today AND yesterday (meaning today is in progress)
    // or if they missed yesterday. Let's trace back:
    let dayIndex = 0;
    let keepChecking = true;

    while (keepChecking && dayIndex < days.length) {
      const dateToCheck = subDays(new Date(), dayIndex);
      const dateStr = format(dateToCheck, 'yyyy-MM-dd');
      const log = logMap[dateStr];
      const totalMinutes = log ? (log.dsa_minutes + log.lld_minutes + log.system_design_minutes) : 0;
      
      if (totalMinutes >= 180) { // 3 hours
        tempCurrentStreak++;
      } else {
        // If they haven't completed today yet, don't break the streak immediately unless yesterday was also missed
        if (dayIndex === 0) {
          // Today not met. Keep checking yesterday to see if current streak is still alive.
        } else {
          keepChecking = false;
        }
      }
      dayIndex++;
    }
    
    currentStreak = tempCurrentStreak;

    // Calculate maximum streak and total completions over the 365 days
    let runningStreak = 0;
    // Iterate from oldest to newest
    for (let i = days.length - 1; i >= 0; i--) {
      const dateStr = format(days[i], 'yyyy-MM-dd');
      const log = logMap[dateStr];
      const totalMinutes = log ? (log.dsa_minutes + log.lld_minutes + log.system_design_minutes) : 0;

      if (totalMinutes >= 180) {
        runningStreak++;
        completedDays++;
        if (runningStreak > maxStreak) {
          maxStreak = runningStreak;
        }
      } else {
        if (totalMinutes > 0) {
          partialDays++;
        }
        runningStreak = 0;
      }
    }

    return {
      currentStreak,
      maxStreak,
      completedDays,
      partialDays
    };
  }, [days, logMap]);

  // Organize days into columns (weeks)
  const gridColumns = useMemo(() => {
    const columns: Date[][] = [];
    let currentWeek: Date[] = [];

    days.forEach((day) => {
      currentWeek.push(day);
      // If we reach 7 days or Saturday, push the week and start a new one
      // day.getDay() === 6 is Saturday
      if (day.getDay() === 6 || currentWeek.length === 7) {
        columns.push(currentWeek);
        currentWeek = [];
      }
    });

    if (currentWeek.length > 0) {
      columns.push(currentWeek);
    }

    return columns;
  }, [days]);

  // Color selection helper
  const getDayColor = (date: Date) => {
    const dateStr = format(date, 'yyyy-MM-dd');
    const log = logMap[dateStr];
    
    if (!log) {
      return 'bg-slate-900 border-slate-950 hover:border-slate-700';
    }

    const totalMin = log.dsa_minutes + log.lld_minutes + log.system_design_minutes;
    if (totalMin >= 180) {
      return 'bg-emerald-500 border-emerald-400 hover:border-white shadow-sm shadow-emerald-550/20'; // Target Met
    }
    if (totalMin > 0) {
      return 'bg-amber-500 border-amber-400 hover:border-white shadow-sm shadow-amber-550/20'; // Target Missed
    }
    
    return 'bg-slate-900 border-slate-950 hover:border-slate-700';
  };

  return (
    <div className="h-full flex flex-col gap-4 sm:gap-6">
      {/* Streaks and Stats Header */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
        <div className="p-3 sm:p-4 rounded-xl border border-slate-800/80 bg-slate-950/40 backdrop-blur-sm flex items-center gap-2 sm:gap-3">
          <div className="p-1.5 sm:p-2 rounded-lg bg-orange-500/10 text-orange-400 border border-orange-500/20 shrink-0">
            <Flame className="w-4 h-4 sm:w-5 h-5 fill-current" />
          </div>
          <div className="min-w-0">
            <span className="text-[9px] text-slate-500 font-bold uppercase tracking-wider block font-audiowide leading-tight truncate">Current Streak</span>
            <span className="text-base sm:text-xl font-black text-slate-100 font-oxanium tracking-wide whitespace-nowrap">{streakStats.currentStreak} Days</span>
          </div>
        </div>

        <div className="p-3 sm:p-4 rounded-xl border border-slate-800/80 bg-slate-950/40 backdrop-blur-sm flex items-center gap-2 sm:gap-3">
          <div className="p-1.5 sm:p-2 rounded-lg bg-orange-500/10 text-orange-400 border border-orange-500/20 shrink-0">
            <Flame className="w-4 h-4 sm:w-5 h-5" />
          </div>
          <div className="min-w-0">
            <span className="text-[9px] text-slate-500 font-bold uppercase tracking-wider block font-audiowide leading-tight truncate">Longest Streak</span>
            <span className="text-base sm:text-xl font-black text-slate-100 font-oxanium tracking-wide whitespace-nowrap">{streakStats.maxStreak} Days</span>
          </div>
        </div>

        <div className="p-3 sm:p-4 rounded-xl border border-slate-800/80 bg-slate-950/40 backdrop-blur-sm flex items-center gap-2 sm:gap-3">
          <div className="p-1.5 sm:p-2 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 shrink-0">
            <CheckCircle2 className="w-4 h-4 sm:w-5 h-5" />
          </div>
          <div className="min-w-0">
            <span className="text-[9px] text-slate-500 font-bold uppercase tracking-wider block font-audiowide leading-tight truncate">Completed Days</span>
            <span className="text-base sm:text-xl font-black text-slate-100 font-oxanium tracking-wide whitespace-nowrap">{streakStats.completedDays} Days</span>
          </div>
        </div>

        <div className="p-3 sm:p-4 rounded-xl border border-slate-800/80 bg-slate-950/40 backdrop-blur-sm flex items-center gap-2 sm:gap-3">
          <div className="p-1.5 sm:p-2 rounded-lg bg-amber-500/10 text-amber-400 border border-amber-500/20 shrink-0">
            <AlertTriangle className="w-4 h-4 sm:w-5 h-5" />
          </div>
          <div className="min-w-0">
            <span className="text-[9px] text-slate-500 font-bold uppercase tracking-wider block font-audiowide leading-tight truncate">Partial Days</span>
            <span className="text-base sm:text-xl font-black text-slate-100 font-oxanium tracking-wide whitespace-nowrap">{streakStats.partialDays} Days</span>
          </div>
        </div>
      </div>

      {/* Contribution Calendar Card */}
      <div className="flex-1 p-4 sm:p-6 rounded-xl border border-slate-800/80 bg-slate-900/40 backdrop-blur-md shadow-lg flex flex-col justify-between gap-6">
        <div className="space-y-6">
        <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Calendar className="w-5 h-5 text-amber-400 shrink-0" />
            <h3 className="text-base sm:text-lg font-bold text-slate-100 font-orbitron tracking-wide">Preparation Contribution Grid</h3>
          </div>
          {/* Legend */}
          <div className="flex flex-wrap items-center gap-3 text-[10px] text-slate-400 font-audiowide tracking-wider">
            <div className="flex items-center gap-1.5">
              <div className="w-4 h-4 rounded-[3px] bg-slate-900 border border-slate-800 shrink-0" />
              <span>No study</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-4 h-4 rounded-[3px] bg-amber-500 border border-amber-400 shrink-0" />
              <span>Partial</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-4 h-4 rounded-[3px] bg-emerald-500 border border-emerald-400 shrink-0" />
              <span>Target Met</span>
            </div>
          </div>
        </div>

        {/* The Grid */}
        <div className="overflow-x-auto pb-2 scrollbar-thin scrollbar-thumb-slate-800">
          <div className="flex gap-1 min-w-[1300px] justify-between">
            {/* Weekday indicators */}
            <div className="flex flex-col gap-1 text-[9px] text-slate-500 pr-2 select-none font-audiowide">
              <div className="h-5 flex items-center">Mon</div>
              <div className="h-5" />
              <div className="h-5 flex items-center">Wed</div>
              <div className="h-5" />
              <div className="h-5 flex items-center">Fri</div>
              <div className="h-5" />
              <div className="h-5 flex items-center">Sun</div>
            </div>

            {/* Weeks */}
            {gridColumns.map((week, wIndex) => {
              // Align first week blocks vertically by padding missing top cells if it does not start on Sunday (day 0) or Monday (day 1)
              const firstDayOfWeek = week[0]?.getDay() || 0;
              const paddingOffset = firstDayOfWeek === 0 ? 6 : firstDayOfWeek - 1; // Align Mon=0, Tue=1... Sun=6

              return (
                <div key={wIndex} className="flex flex-col gap-1">
                  {wIndex === 0 && Array.from({ length: paddingOffset }).map((_, padIdx) => (
                    <div key={`pad-${padIdx}`} className="w-5 h-5 bg-transparent" />
                  ))}
                  
                  {week.map((day) => {
                    const dateStr = format(day, 'yyyy-MM-dd');
                    const log = logMap[dateStr];
                    
                    return (
                      <div
                        key={dateStr}
                        onMouseEnter={() => {
                          const total = log ? (log.dsa_minutes + log.lld_minutes + log.system_design_minutes) : 0;
                          setHoveredDay({
                            date: day,
                            dsa: log?.dsa_minutes || 0,
                            lld: log?.lld_minutes || 0,
                            sd: log?.system_design_minutes || 0,
                            notes: log?.notes
                          });
                        }}
                        onMouseLeave={() => setHoveredDay(null)}
                        className={`w-5 h-5 rounded-[3px] transition-all cursor-pointer border ${getDayColor(day)}`}
                      />
                    );
                  })}
                </div>
              );
            })}
          </div>
        </div>
        </div>

        {/* Hover Details Panel */}
        <div className="border-t border-slate-800/40 pt-4 min-h-16 flex items-start gap-3 mt-auto shrink-0">
          <Info className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
          <div className="text-xs font-sans">
            {hoveredDay ? (
              <div className="space-y-1">
                <span className="font-bold text-slate-200 font-orbitron tracking-wider">
                  {format(hoveredDay.date, 'MMMM dd, yyyy')}
                </span>
                <div className="flex gap-4 text-slate-400 mt-1 font-mono text-[11px] tracking-tight">
                  <span>DSA: <strong className="text-slate-200 font-semibold font-mono">{(hoveredDay.dsa / 60).toFixed(1)}h</strong> ({hoveredDay.dsa}m)</span>
                  <span>LLD: <strong className="text-slate-200 font-semibold font-mono">{(hoveredDay.lld / 60).toFixed(1)}h</strong> ({hoveredDay.lld}m)</span>
                  <span>Sys Design: <strong className="text-slate-200 font-semibold font-mono">{(hoveredDay.sd / 60).toFixed(1)}h</strong> ({hoveredDay.sd}m)</span>
                  <span className="border-l border-slate-800 pl-4">
                    Total: <strong className={`font-semibold font-mono ${hoveredDay.dsa + hoveredDay.lld + hoveredDay.sd >= 180 ? 'text-emerald-400' : 'text-amber-400'}`}>
                      {((hoveredDay.dsa + hoveredDay.lld + hoveredDay.sd) / 60).toFixed(1)} hrs
                    </strong>
                  </span>
                </div>
                {hoveredDay.notes && (
                  <p className="text-[11px] text-slate-500 italic mt-1.5 max-w-3xl line-clamp-2">
                    Notes: {hoveredDay.notes}
                  </p>
                )}
              </div>
            ) : (
              <div className="text-slate-500 pt-0.5">
                Hover over any contribution grid square to view detailed preparation hours and session notes.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export function ContributionGridSkeleton() {
  return (
    <div className="h-full flex flex-col gap-4 sm:gap-6 animate-pulse">
      {/* Streaks and Stats Header Skeleton */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="p-3 sm:p-4 rounded-xl border border-slate-800/80 bg-slate-950/40 backdrop-blur-sm flex items-center gap-2 sm:gap-3">
            <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-lg bg-slate-800/60 border border-slate-800/40 shrink-0" />
            <div className="space-y-1.5 min-w-0 flex-1">
              <div className="h-2 w-12 sm:w-16 bg-slate-800/80 rounded" />
              <div className="h-3.5 sm:h-4 w-14 sm:w-20 bg-slate-800/60 rounded" />
            </div>
          </div>
        ))}
      </div>

      {/* Contribution Calendar Card Skeleton */}
      <div className="flex-1 p-4 sm:p-6 rounded-xl border border-slate-800/80 bg-slate-900/40 backdrop-blur-md shadow-lg flex flex-col justify-between gap-6">
        <div className="space-y-6">
          <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <div className="w-5 h-5 rounded bg-slate-800/80 shrink-0" />
              <div className="h-4 w-48 bg-slate-800/80 rounded" />
            </div>
            {/* Legend Skeleton */}
            <div className="flex flex-wrap items-center gap-3 text-[10px] font-audiowide tracking-wider text-slate-500">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="flex items-center gap-1.5">
                  <div className="w-4 h-4 rounded-[3px] bg-slate-800/60 border border-slate-800/40 shrink-0" />
                  <div className="h-2 w-12 bg-slate-800/60 rounded" />
                </div>
              ))}
            </div>
          </div>

          {/* The Grid Skeleton */}
          <div className="overflow-x-auto pb-2 scrollbar-thin scrollbar-thumb-slate-800">
            <div className="flex gap-1 min-w-[1300px] justify-between">
              {/* Weekday indicators */}
              <div className="flex flex-col gap-1 text-[9px] text-slate-500 pr-2 select-none font-audiowide">
                <div className="h-5 flex items-center">Mon</div>
                <div className="h-5" />
                <div className="h-5 flex items-center">Wed</div>
                <div className="h-5" />
                <div className="h-5 flex items-center">Fri</div>
                <div className="h-5" />
                <div className="h-5 flex items-center">Sun</div>
              </div>

              {/* Weeks (53 columns of 7 blocks) */}
              {Array.from({ length: 53 }).map((_, wIndex) => {
                // Align first week blocks vertically by padding missing top cells
                const paddingOffset = wIndex === 0 ? 2 : 0;
                return (
                  <div key={wIndex} className="flex flex-col gap-1">
                    {Array.from({ length: paddingOffset }).map((_, padIdx) => (
                      <div key={`pad-${padIdx}`} className="w-5 h-5 bg-transparent" />
                    ))}
                    {Array.from({ length: 7 - paddingOffset }).map((_, dIndex) => (
                      <div
                        key={dIndex}
                        className="w-5 h-5 rounded-[3px] bg-slate-900 border border-slate-950"
                      />
                    ))}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Hover Details Panel Skeleton */}
        <div className="border-t border-slate-800/40 pt-4 min-h-16 flex items-start gap-3 mt-auto shrink-0">
          <div className="w-5 h-5 rounded bg-slate-800/80 shrink-0 mt-0.5" />
          <div className="h-3 w-80 bg-slate-800/60 rounded mt-1.5" />
        </div>
      </div>
    </div>
  );
}

