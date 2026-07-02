'use client';

import React, { useState, useEffect } from 'react';
import { supabase, isSupabaseConfigured } from '@/lib/supabaseClient';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { BookOpen, Search, Plus, Trash2, Edit, X, BookMarked, Layers, Award, Sparkles, Loader2, ArrowRight } from 'lucide-react';
import { cn } from '@/lib/utils';

interface StudyNote {
  id: string;
  title: string;
  category: 'dsa' | 'lld' | 'system_design';
  content: string;
  tags: string[];
  mastery_level: 'learning' | 'reviewing' | 'mastered';
  created_at: string;
  updated_at: string;
}

interface StudyNotesProps {
  userId: string;
}

// Simple helper to parse custom notes formatting (headers, bold, code blocks, lists)
function renderFormattedContent(text: string) {
  if (!text) return null;

  const lines = text.split('\n');
  const renderedElements: React.ReactNode[] = [];
  let inCodeBlock = false;
  let codeLines: string[] = [];
  let codeLang = '';

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Toggle code blocks
    if (line.trim().startsWith('```')) {
      if (inCodeBlock) {
        renderedElements.push(
          <pre key={`code-${i}`} className="bg-slate-950 border border-slate-900 rounded-lg p-3 my-2 overflow-x-auto text-xs text-orange-300 font-mono leading-relaxed select-text">
            <code>{codeLines.join('\n')}</code>
          </pre>
        );
        codeLines = [];
        inCodeBlock = false;
      } else {
        inCodeBlock = true;
        codeLang = line.trim().substring(3).trim();
      }
      continue;
    }

    if (inCodeBlock) {
      codeLines.push(line);
      continue;
    }

    // Headers
    if (line.startsWith('# ')) {
      renderedElements.push(<h1 key={i} className="text-lg font-black font-orbitron text-orange-400 mt-4 mb-2">{line.substring(2)}</h1>);
    } else if (line.startsWith('## ')) {
      renderedElements.push(<h2 key={i} className="text-base font-bold font-orbitron text-amber-400 mt-3 mb-1">{line.substring(3)}</h2>);
    } else if (line.startsWith('### ')) {
      renderedElements.push(<h3 key={i} className="text-sm font-semibold font-orbitron text-slate-200 mt-2 mb-1">{line.substring(4)}</h3>);
    }
    // Bullet lists
    else if (line.trim().startsWith('- ') || line.trim().startsWith('* ')) {
      renderedElements.push(
        <div key={i} className="flex items-start gap-2 my-1 pl-2 text-slate-300 text-xs">
          <span className="text-orange-500 mt-1 select-none">•</span>
          <span>{parseInlineFormatting(line.trim().substring(2))}</span>
        </div>
      );
    }
    // Empty lines
    else if (line.trim() === '') {
      renderedElements.push(<div key={i} className="h-2" />);
    }
    // Standard paragraphs
    else {
      renderedElements.push(
        <p key={i} className="text-slate-300 text-xs leading-relaxed my-1 select-text">
          {parseInlineFormatting(line)}
        </p>
      );
    }
  }

  // Handle unclosed code block
  if (inCodeBlock && codeLines.length > 0) {
    renderedElements.push(
      <pre key="code-unclosed" className="bg-slate-950 border border-slate-900 rounded-lg p-3 my-2 overflow-x-auto text-xs text-orange-300 font-mono leading-relaxed select-text">
        <code>{codeLines.join('\n')}</code>
      </pre>
    );
  }

  return <div className="space-y-0.5">{renderedElements}</div>;
}

// Simple helper to parse inline formatting (like bold `**`)
function parseInlineFormatting(text: string): React.ReactNode {
  const parts = text.split(/(\*\*.*?\*\*|`.*?`)/g);
  return parts.map((part, idx) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return <strong key={idx} className="font-extrabold text-slate-100">{part.slice(2, -2)}</strong>;
    }
    if (part.startsWith('`') && part.endsWith('`')) {
      return <code key={idx} className="bg-slate-950 text-orange-400 border border-slate-900 px-1 rounded font-mono text-[10px]">{part.slice(1, -1)}</code>;
    }
    return part;
  });
}

export default function StudyNotes({ userId }: StudyNotesProps) {
  const [notes, setNotes] = useState<StudyNote[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [saving, setSaving] = useState<boolean>(false);
  
  // Dialog / Modal States
  const [isAddEditOpen, setIsAddEditOpen] = useState<boolean>(false);
  const [isViewOpen, setIsViewOpen] = useState<boolean>(false);
  const [editingNote, setEditingNote] = useState<StudyNote | null>(null);
  const [viewingNote, setViewingNote] = useState<StudyNote | null>(null);

  // Form States
  const [title, setTitle] = useState<string>('');
  const [category, setCategory] = useState<'dsa' | 'lld' | 'system_design'>('dsa');
  const [content, setContent] = useState<string>('');
  const [tagsInput, setTagsInput] = useState<string>('');
  const [masteryLevel, setMasteryLevel] = useState<'learning' | 'reviewing' | 'mastered'>('learning');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Filter / Search States
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<'all' | 'dsa' | 'lld' | 'system_design'>('all');
  const [selectedMasteryFilter, setSelectedMasteryFilter] = useState<'all' | 'learning' | 'reviewing' | 'mastered'>('all');

  const fetchNotes = async () => {
    setLoading(true);
    if (!isSupabaseConfigured) {
      try {
        const stored = localStorage.getItem('mygoal_study_notes');
        if (stored) {
          setNotes(JSON.parse(stored));
        } else {
          setNotes([]);
        }
      } catch (err) {
        console.error('Error reading study notes from localStorage:', err);
      } finally {
        setLoading(false);
      }
      return;
    }

    try {
      const { data, error } = await supabase
        .from('study_notes')
        .select('*')
        .order('updated_at', { ascending: false });

      if (error) throw error;
      setNotes(data || []);
    } catch (err: any) {
      console.error('Error fetching study notes:', err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotes();
  }, [userId]);

  const openAddModal = () => {
    setEditingNote(null);
    setTitle('');
    setCategory('dsa');
    setMasteryLevel('learning');
    setTagsInput('');
    setContent('');
    setErrorMsg(null);
    setIsAddEditOpen(true);
  };

  const openEditModal = (note: StudyNote, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingNote(note);
    setTitle(note.title);
    setCategory(note.category);
    setMasteryLevel(note.mastery_level);
    setTagsInput(note.tags.join(', '));
    setContent(note.content);
    setErrorMsg(null);
    setIsAddEditOpen(true);
  };

  const openViewModal = (note: StudyNote) => {
    setViewingNote(note);
    setIsViewOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!title.trim()) {
      setErrorMsg('Note title is required.');
      return;
    }
    if (!content.trim()) {
      setErrorMsg('Content is required.');
      return;
    }

    setSaving(true);

    const parsedTags = tagsInput
      .split(',')
      .map((t) => t.trim())
      .filter((t) => t.length > 0);

    if (!isSupabaseConfigured) {
      // Local Storage handling
      try {
        let updatedNotes: StudyNote[] = [];
        if (editingNote) {
          updatedNotes = notes.map((n) =>
            n.id === editingNote.id
              ? {
                  ...n,
                  title,
                  category,
                  content,
                  tags: parsedTags,
                  mastery_level: masteryLevel,
                  updated_at: new Date().toISOString(),
                }
              : n
          );
        } else {
          const newNote: StudyNote = {
            id: `local-note-${Date.now()}`,
            title,
            category,
            content,
            tags: parsedTags,
            mastery_level: masteryLevel,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          };
          updatedNotes = [newNote, ...notes];
        }

        localStorage.setItem('mygoal_study_notes', JSON.stringify(updatedNotes));
        setNotes(updatedNotes);
        setIsAddEditOpen(false);
      } catch (err) {
        console.error('Error saving note locally:', err);
        setErrorMsg('Failed to save note locally.');
      } finally {
        setSaving(false);
      }
      return;
    }

    // Database handling
    try {
      if (editingNote) {
        const { data, error } = await supabase
          .from('study_notes')
          .update({
            title,
            category,
            content,
            tags: parsedTags,
            mastery_level: masteryLevel,
            updated_at: new Date().toISOString(),
          })
          .eq('id', editingNote.id)
          .select();

        if (error) throw error;
        if (data) {
          setNotes(notes.map((n) => (n.id === editingNote.id ? data[0] : n)));
        }
      } else {
        const { data, error } = await supabase
          .from('study_notes')
          .insert({
            user_id: userId,
            title,
            category,
            content,
            tags: parsedTags,
            mastery_level: masteryLevel,
          })
          .select();

        if (error) throw error;
        if (data) {
          setNotes([data[0], ...notes]);
        }
      }
      setIsAddEditOpen(false);
    } catch (err: any) {
      console.error('Error saving study note:', err.message);
      setErrorMsg(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm('Are you sure you want to delete this study note?')) return;

    if (!isSupabaseConfigured) {
      try {
        const updatedNotes = notes.filter((n) => n.id !== id);
        localStorage.setItem('mygoal_study_notes', JSON.stringify(updatedNotes));
        setNotes(updatedNotes);
        if (viewingNote?.id === id) {
          setIsViewOpen(false);
        }
      } catch (err) {
        console.error('Error deleting note locally:', err);
      }
      return;
    }

    try {
      const { error } = await supabase.from('study_notes').delete().eq('id', id);
      if (error) throw error;
      setNotes(notes.filter((n) => n.id !== id));
      if (viewingNote?.id === id) {
        setIsViewOpen(false);
      }
    } catch (err: any) {
      console.error('Error deleting study note:', err.message);
      alert('Failed to delete note: ' + err.message);
    }
  };

  // Computations
  const stats = React.useMemo(() => {
    const total = notes.length;
    const dsa = notes.filter((n) => n.category === 'dsa').length;
    const lld = notes.filter((n) => n.category === 'lld').length;
    const sd = notes.filter((n) => n.category === 'system_design').length;

    const learning = notes.filter((n) => n.mastery_level === 'learning').length;
    const reviewing = notes.filter((n) => n.mastery_level === 'reviewing').length;
    const mastered = notes.filter((n) => n.mastery_level === 'mastered').length;

    return { total, dsa, lld, sd, learning, reviewing, mastered };
  }, [notes]);

  const filteredNotes = React.useMemo(() => {
    return notes.filter((note) => {
      const matchesSearch =
        note.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        note.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
        note.tags.some((t) => t.toLowerCase().includes(searchQuery.toLowerCase()));

      const matchesCategory =
        selectedCategoryFilter === 'all' || note.category === selectedCategoryFilter;

      const matchesMastery =
        selectedMasteryFilter === 'all' || note.mastery_level === selectedMasteryFilter;

      return matchesSearch && matchesCategory && matchesMastery;
    });
  }, [notes, searchQuery, selectedCategoryFilter, selectedMasteryFilter]);

  const getCategoryBadgeClass = (cat: 'dsa' | 'lld' | 'system_design') => {
    switch (cat) {
      case 'dsa':
        return 'bg-amber-500/10 text-amber-400 border border-amber-500/20';
      case 'lld':
        return 'bg-orange-500/10 text-orange-400 border border-orange-500/20';
      case 'system_design':
        return 'bg-pink-500/10 text-pink-400 border border-pink-500/20';
    }
  };

  const getCategoryLabel = (cat: 'dsa' | 'lld' | 'system_design') => {
    switch (cat) {
      case 'dsa':
        return 'DSA';
      case 'lld':
        return 'LLD';
      case 'system_design':
        return 'System Design';
    }
  };

  const getMasteryBadgeClass = (level: 'learning' | 'reviewing' | 'mastered') => {
    switch (level) {
      case 'learning':
        return 'bg-sky-500/10 text-sky-400 border border-sky-500/20';
      case 'reviewing':
        return 'bg-purple-500/10 text-purple-400 border border-purple-500/20';
      case 'mastered':
        return 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="p-6 rounded-xl border border-slate-800 bg-slate-900/40 backdrop-blur-md shadow-lg flex flex-col md:flex-row md:items-center justify-between gap-6 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-[300px] h-[300px] rounded-full bg-orange-600/5 blur-[80px] pointer-events-none" />
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <BookOpen className="w-6 h-6 text-orange-400" />
            <h2 className="text-xl font-bold text-slate-100 font-orbitron tracking-wide">Study Notes</h2>
          </div>
          <p className="text-slate-400 text-sm max-w-2xl leading-relaxed">
            Record, digest, and track your conceptual understandings across DSA, low-level design, and system architecture. Continuous revision leads to master level retrieval.
          </p>
        </div>
        <Button
          onClick={openAddModal}
          className="bg-orange-600/90 hover:bg-orange-500/90 text-orange-50 font-audiowide text-[10px] tracking-wider py-2.5 px-5 h-auto border border-orange-400 cursor-pointer shadow-md flex items-center gap-2 shrink-0 self-start md:self-auto"
        >
          <Plus className="w-4 h-4" />
          Add Study Note
        </Button>
      </div>

      {/* Quick Statistics Panels */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-slate-900/40 border border-slate-800/80 backdrop-blur-md shadow-md p-4">
          <div className="flex items-center justify-between">
            <span className="text-[9px] text-slate-450 font-bold uppercase tracking-wider font-audiowide">Total Understandings</span>
            <BookMarked className="w-4 h-4 text-orange-400/80" />
          </div>
          <div className="mt-2">
            <h3 className="text-2xl font-black text-slate-100 font-oxanium">{stats.total}</h3>
            <div className="w-full bg-slate-950/60 rounded-full h-1.5 mt-2 border border-slate-900">
              <div className="bg-orange-500 h-1.5 rounded-full" style={{ width: '100%' }} />
            </div>
          </div>
        </Card>

        <Card className="bg-slate-900/40 border border-slate-800/80 backdrop-blur-md shadow-md p-4">
          <div className="flex items-center justify-between">
            <span className="text-[9px] text-slate-450 font-bold uppercase tracking-wider font-audiowide">DSA Notes</span>
            <span className="text-[10px] font-bold font-mono text-amber-400">Category</span>
          </div>
          <div className="mt-2">
            <h3 className="text-2xl font-black text-slate-100 font-oxanium">{stats.dsa}</h3>
            <div className="w-full bg-slate-950/60 rounded-full h-1.5 mt-2 border border-slate-900">
              <div
                className="bg-amber-400 h-1.5 rounded-full transition-all duration-500"
                style={{ width: stats.total > 0 ? `${(stats.dsa / stats.total) * 100}%` : '0%' }}
              />
            </div>
          </div>
        </Card>

        <Card className="bg-slate-900/40 border border-slate-800/80 backdrop-blur-md shadow-md p-4">
          <div className="flex items-center justify-between">
            <span className="text-[9px] text-slate-450 font-bold uppercase tracking-wider font-audiowide">LLD Notes</span>
            <span className="text-[10px] font-bold font-mono text-orange-400">Category</span>
          </div>
          <div className="mt-2">
            <h3 className="text-2xl font-black text-slate-100 font-oxanium">{stats.lld}</h3>
            <div className="w-full bg-slate-950/60 rounded-full h-1.5 mt-2 border border-slate-900">
              <div
                className="bg-orange-450 h-1.5 rounded-full transition-all duration-500"
                style={{ width: stats.total > 0 ? `${(stats.lld / stats.total) * 100}%` : '0%' }}
              />
            </div>
          </div>
        </Card>

        <Card className="bg-slate-900/40 border border-slate-800/80 backdrop-blur-md shadow-md p-4">
          <div className="flex items-center justify-between">
            <span className="text-[9px] text-slate-450 font-bold uppercase tracking-wider font-audiowide">System Design</span>
            <span className="text-[10px] font-bold font-mono text-pink-400">Category</span>
          </div>
          <div className="mt-2">
            <h3 className="text-2xl font-black text-slate-100 font-oxanium">{stats.sd}</h3>
            <div className="w-full bg-slate-950/60 rounded-full h-1.5 mt-2 border border-slate-900">
              <div
                className="bg-pink-400 h-1.5 rounded-full transition-all duration-500"
                style={{ width: stats.total > 0 ? `${(stats.sd / stats.total) * 100}%` : '0%' }}
              />
            </div>
          </div>
        </Card>
      </div>

      {/* Search and Filters Bar */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-3 bg-slate-900/20 p-4 border border-slate-900 rounded-xl">
        {/* Search */}
        <div className="md:col-span-6 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search notes, tags, or concepts..."
            className="pl-9 bg-slate-950/60 border-slate-800 hover:border-slate-700 focus:border-orange-500/50 text-slate-100 placeholder-slate-500 font-mono text-xs w-full py-2.5"
          />
        </div>

        {/* Category Filter */}
        <div className="md:col-span-3">
          <select
            value={selectedCategoryFilter}
            onChange={(e: any) => setSelectedCategoryFilter(e.target.value)}
            className="w-full bg-slate-950/60 border border-slate-800 hover:border-slate-700 focus:border-orange-500/50 text-slate-300 font-mono text-xs rounded-lg py-2.5 px-3 outline-none"
          >
            <option value="all">Category: All</option>
            <option value="dsa">DSA</option>
            <option value="lld">LLD</option>
            <option value="system_design">System Design</option>
          </select>
        </div>

        {/* Mastery Filter */}
        <div className="md:col-span-3">
          <select
            value={selectedMasteryFilter}
            onChange={(e: any) => setSelectedMasteryFilter(e.target.value)}
            className="w-full bg-slate-950/60 border border-slate-800 hover:border-slate-700 focus:border-orange-500/50 text-slate-300 font-mono text-xs rounded-lg py-2.5 px-3 outline-none"
          >
            <option value="all">Mastery: All</option>
            <option value="learning">Learning</option>
            <option value="reviewing">Reviewing</option>
            <option value="mastered">Mastered</option>
          </select>
        </div>
      </div>

      {/* Main Content Area: Loading / Grid List */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 gap-4">
          <Loader2 className="w-8 h-8 text-orange-400 animate-spin" />
          <span className="text-xs text-slate-500 font-mono tracking-wider">Syncing Knowledge Vault...</span>
        </div>
      ) : filteredNotes.length === 0 ? (
        <Card className="border border-dashed border-slate-850 bg-slate-950/20 py-16 text-center">
          <CardContent className="space-y-4">
            <div className="w-12 h-12 rounded-full bg-slate-900 border border-slate-850 flex items-center justify-center mx-auto text-slate-550">
              <BookOpen className="w-6 h-6 text-slate-500" />
            </div>
            <div className="space-y-1">
              <h4 className="text-sm font-semibold font-orbitron text-slate-300">No study notes found</h4>
              <p className="text-xs text-slate-555 max-w-sm mx-auto leading-relaxed text-slate-400">
                {searchQuery || selectedCategoryFilter !== 'all' || selectedMasteryFilter !== 'all'
                  ? 'No items match your active filters. Try refining your parameters.'
                  : 'Start capturing your notes, algorithms, architectural insights, and interview hacks here.'}
              </p>
            </div>
            {(searchQuery || selectedCategoryFilter !== 'all' || selectedMasteryFilter !== 'all') ? (
              <Button
                variant="outline"
                onClick={() => {
                  setSearchQuery('');
                  setSelectedCategoryFilter('all');
                  setSelectedMasteryFilter('all');
                }}
                className="bg-slate-900 border border-slate-800 hover:bg-slate-850 hover:text-orange-400 text-slate-300 font-audiowide text-[9px] tracking-wider py-1.5 px-3 h-auto"
              >
                Clear Filters
              </Button>
            ) : (
              <Button
                onClick={openAddModal}
                className="bg-orange-600/20 hover:bg-orange-600/30 text-orange-400 font-audiowide text-[10px] tracking-wider py-2 px-4 h-auto border border-orange-500/20 cursor-pointer"
              >
                Add Your First Note
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredNotes.map((note) => (
            <Card
              key={note.id}
              onClick={() => openViewModal(note)}
              className="bg-slate-900/30 border border-slate-850/80 hover:border-orange-500/35 hover:bg-slate-900/50 transition-all duration-300 cursor-pointer group shadow-lg flex flex-col justify-between"
            >
              <CardContent className="p-5 flex flex-col justify-between h-full space-y-4">
                <div className="space-y-3">
                  {/* Badges Row */}
                  <div className="flex items-center justify-between gap-2">
                    <span className={cn('text-[9px] px-2 py-0.5 rounded font-black font-orbitron uppercase tracking-wide', getCategoryBadgeClass(note.category))}>
                      {getCategoryLabel(note.category)}
                    </span>
                    <span className={cn('text-[9px] px-2 py-0.5 rounded font-bold font-mono lowercase tracking-wide', getMasteryBadgeClass(note.mastery_level))}>
                      {note.mastery_level}
                    </span>
                  </div>

                  {/* Title */}
                  <h4 className="text-sm font-bold text-slate-200 group-hover:text-orange-400 transition-colors line-clamp-1">
                    {note.title}
                  </h4>

                  {/* Content Preview */}
                  <p className="text-slate-400 text-[11px] leading-relaxed line-clamp-3 select-text">
                    {note.content}
                  </p>
                </div>

                {/* Footer details */}
                <div className="pt-3 border-t border-slate-900/60 flex items-center justify-between gap-3 mt-auto">
                  {/* Tags */}
                  <div className="flex flex-wrap gap-1 max-w-[70%]">
                    {note.tags.length > 0 ? (
                      note.tags.slice(0, 2).map((t, idx) => (
                        <span key={idx} className="bg-slate-950/60 border border-slate-850 text-slate-500 text-[8px] font-mono px-1 rounded truncate max-w-[80px]">
                          #{t}
                        </span>
                      ))
                    ) : (
                      <span className="text-[8px] text-slate-600 font-mono italic">no tags</span>
                    )}
                    {note.tags.length > 2 && (
                      <span className="bg-slate-950/60 border border-slate-850 text-slate-500 text-[8px] font-mono px-1 rounded">
                        +{note.tags.length - 2}
                      </span>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      onClick={(e) => openEditModal(note, e)}
                      className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-orange-400 cursor-pointer transition-colors"
                      title="Edit Note"
                    >
                      <Edit className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={(e) => handleDelete(note.id, e)}
                      className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-rose-500 cursor-pointer transition-colors"
                      title="Delete Note"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Add / Edit Note Dialog Modal */}
      <Dialog open={isAddEditOpen} onOpenChange={setIsAddEditOpen}>
        <DialogContent className="bg-slate-900/98 border border-slate-800 text-slate-100 max-w-lg backdrop-blur-md shadow-2xl rounded-xl overflow-hidden p-6 gap-5">
          <DialogHeader className="space-y-1">
            <DialogTitle className="text-base text-slate-100 font-orbitron tracking-wide font-black">
              {editingNote ? 'Modify Understanding' : 'Log New Understanding'}
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-400 leading-relaxed font-sans">
              Organize notes with simple text, headers using <code className="bg-slate-950 px-1 rounded text-orange-400">#</code>, <code className="bg-slate-950 px-1 rounded text-orange-400">##</code>, or code blocks wrapped in <code className="bg-slate-950 px-1 rounded text-orange-400">```</code>.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSave} className="space-y-4">
            {errorMsg && (
              <div className="bg-red-500/10 border border-red-500/20 text-red-200 text-xs py-2 px-3 rounded-lg font-mono">
                {errorMsg}
              </div>
            )}

            {/* Title */}
            <div className="space-y-1.5">
              <Label className="text-[10px] text-slate-400 font-bold uppercase tracking-wider font-audiowide">Title</Label>
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Dynamic Programming: 0/1 Knapsack Approach"
                className="bg-slate-950/60 border-slate-800 hover:border-slate-700 focus:border-orange-500/50 text-slate-100 placeholder-slate-600 font-mono text-xs w-full py-2"
              />
            </div>

            {/* Category & Mastery Level */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-[10px] text-slate-400 font-bold uppercase tracking-wider font-audiowide">Category</Label>
                <select
                  value={category}
                  onChange={(e: any) => setCategory(e.target.value)}
                  className="w-full bg-slate-950/60 border border-slate-800 hover:border-slate-700 focus:border-orange-500/50 text-slate-300 font-mono text-xs rounded-lg py-2 px-2.5 outline-none"
                >
                  <option value="dsa">DSA (Data Structures & Algos)</option>
                  <option value="lld">LLD (Low Level Design)</option>
                  <option value="system_design">System Design</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-[10px] text-slate-400 font-bold uppercase tracking-wider font-audiowide">Mastery Level</Label>
                <select
                  value={masteryLevel}
                  onChange={(e: any) => setMasteryLevel(e.target.value)}
                  className="w-full bg-slate-950/60 border border-slate-800 hover:border-slate-700 focus:border-orange-500/50 text-slate-300 font-mono text-xs rounded-lg py-2 px-2.5 outline-none"
                >
                  <option value="learning">Learning (Still comprehending)</option>
                  <option value="reviewing">Reviewing (Can solve/explain with efforts)</option>
                  <option value="mastered">Mastered (Spit out logic/design instantly)</option>
                </select>
              </div>
            </div>

            {/* Tags */}
            <div className="space-y-1.5">
              <Label className="text-[10px] text-slate-400 font-bold uppercase tracking-wider font-audiowide">Tags (comma-separated)</Label>
              <Input
                value={tagsInput}
                onChange={(e) => setTagsInput(e.target.value)}
                placeholder="e.g. dp, knapsack, optimization"
                className="bg-slate-950/60 border-slate-800 hover:border-slate-700 focus:border-orange-500/50 text-slate-100 placeholder-slate-600 font-mono text-xs w-full py-2"
              />
            </div>

            {/* Notes Content */}
            <div className="space-y-1.5">
              <Label className="text-[10px] text-slate-400 font-bold uppercase tracking-wider font-audiowide">Content / Understandings</Label>
              <textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder={`Use markdown for formatting:\n# Main Topic\n## Subtopic\n- Bullet points\n\`\`\`javascript\nconst dp = Array(n).fill(0);\n\`\`\``}
                rows={8}
                className="w-full bg-slate-950/60 border border-slate-850 hover:border-slate-750 focus:border-orange-500/50 text-slate-200 placeholder-slate-600 font-mono text-xs rounded-lg p-3 outline-none resize-none"
              />
            </div>

            <DialogFooter className="flex flex-col-reverse sm:flex-row gap-2 mt-4 justify-end">
              <Button
                type="button"
                onClick={() => setIsAddEditOpen(false)}
                className="w-full sm:w-auto bg-slate-950 border border-slate-800 hover:bg-slate-900 hover:text-orange-400 hover:border-orange-500/20 text-slate-350 font-audiowide text-[10px] tracking-wider py-2 px-4 h-auto cursor-pointer"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={saving}
                className="w-full sm:w-auto bg-orange-600/90 hover:bg-orange-500/90 text-orange-50 font-audiowide text-[10px] tracking-wider py-2 px-4 h-auto border border-orange-400 cursor-pointer shadow-sm flex items-center justify-center gap-2"
              >
                {saving ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    Saving...
                  </>
                ) : (
                  'Save Note'
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* View Note Modal */}
      <Dialog open={isViewOpen} onOpenChange={setIsViewOpen}>
        <DialogContent className="bg-slate-900/98 border border-slate-800 text-slate-100 max-w-2xl backdrop-blur-md shadow-2xl rounded-xl overflow-hidden p-0 gap-0">
          {viewingNote && (
            <div className="flex flex-col h-[75vh]">
              {/* Modal Header */}
              <div className="p-5 border-b border-slate-850 flex items-center justify-between gap-4 shrink-0 bg-slate-950/20">
                <div className="space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={cn('text-[8px] px-2 py-0.5 rounded font-black font-orbitron uppercase tracking-wide', getCategoryBadgeClass(viewingNote.category))}>
                      {getCategoryLabel(viewingNote.category)}
                    </span>
                    <span className={cn('text-[8px] px-2 py-0.5 rounded font-bold font-mono lowercase tracking-wide', getMasteryBadgeClass(viewingNote.mastery_level))}>
                      {viewingNote.mastery_level}
                    </span>
                  </div>
                  <h3 className="text-base font-black font-orbitron text-slate-100 tracking-wide select-text">
                    {viewingNote.title}
                  </h3>
                </div>
                <button
                  onClick={() => setIsViewOpen(false)}
                  className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-orange-400 cursor-pointer transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Modal Body */}
              <div className="p-6 overflow-y-auto flex-1 bg-slate-900/10 space-y-4">
                {renderFormattedContent(viewingNote.content)}
              </div>

              {/* Modal Footer */}
              <div className="p-4 border-t border-slate-850 shrink-0 bg-slate-950/20 flex flex-wrap gap-2 items-center justify-between">
                {/* Tags */}
                <div className="flex flex-wrap gap-1 max-w-[60%]">
                  {viewingNote.tags.map((t, idx) => (
                    <span key={idx} className="bg-slate-950/60 border border-slate-850 text-slate-450 text-[8px] font-mono px-1.5 py-0.5 rounded">
                      #{t}
                    </span>
                  ))}
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    onClick={(e) => {
                      setIsViewOpen(false);
                      openEditModal(viewingNote, e);
                    }}
                    className="bg-slate-900 border border-slate-850 hover:bg-slate-800 hover:text-orange-400 hover:border-orange-500/20 text-slate-300 font-audiowide text-[9px] tracking-wider py-2 px-3 h-auto cursor-pointer"
                  >
                    Edit Note
                  </Button>
                  <Button
                    onClick={(e) => handleDelete(viewingNote.id, e)}
                    className="bg-rose-950/25 border border-rose-900/35 hover:bg-rose-950/60 hover:text-rose-100 hover:border-rose-700 text-rose-450 font-audiowide text-[9px] tracking-wider py-2 px-3 h-auto cursor-pointer"
                  >
                    Delete Note
                  </Button>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
