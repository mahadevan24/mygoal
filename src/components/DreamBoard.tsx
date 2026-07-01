'use client';

import React, { useState, useEffect } from 'react';
import { supabase, isSupabaseConfigured } from '@/lib/supabaseClient';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Cloud, X, Plus, Image as ImageIcon, Sparkles, Loader2, Maximize2, Trash2 } from 'lucide-react';

interface DreamBoardItem {
  id: string;
  image_url: string;
  title: string;
  notes?: string;
  created_at: string;
}

interface DreamBoardProps {
  userId: string;
}

export default function DreamBoard({ userId }: DreamBoardProps) {
  const [items, setItems] = useState<DreamBoardItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [uploading, setUploading] = useState<boolean>(false);
  const [isAddOpen, setIsAddOpen] = useState<boolean>(false);
  const [selectedItem, setSelectedItem] = useState<DreamBoardItem | null>(null);

  // Form states
  const [title, setTitle] = useState<string>('');
  const [notes, setNotes] = useState<string>('');
  const [file, setFile] = useState<File | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const fetchItems = async () => {
    setLoading(true);
    if (!isSupabaseConfigured) {
      // Load from localStorage in offline/demo mode
      try {
        const stored = localStorage.getItem('mygoal_dream_board_items');
        if (stored) {
          setItems(JSON.parse(stored));
        } else {
          setItems([]);
        }
      } catch (err) {
        console.error('Error reading from localStorage:', err);
      } finally {
        setLoading(false);
      }
      return;
    }

    try {
      const { data, error } = await supabase
        .from('dream_board')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setItems(data || []);
    } catch (err: any) {
      console.error('Error fetching dream board items:', err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchItems();
  }, [userId]);

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!file || !title) {
      setErrorMsg('Please select a photo and enter a manifestation statement.');
      return;
    }

    setUploading(true);

    if (!isSupabaseConfigured) {
      // Save locally in demo mode using FileReader base64
      try {
        const reader = new FileReader();
        reader.onloadend = () => {
          const base64Url = reader.result as string;
          const newItem: DreamBoardItem = {
            id: `local-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            image_url: base64Url,
            title,
            notes: notes || undefined,
            created_at: new Date().toISOString()
          };
          
          const updatedItems = [newItem, ...items];
          setItems(updatedItems);
          localStorage.setItem('mygoal_dream_board_items', JSON.stringify(updatedItems));
          
          // Reset fields
          setTitle('');
          setNotes('');
          setFile(null);
          setIsAddOpen(false);
          setUploading(false);
        };
        reader.readAsDataURL(file);
      } catch (err: any) {
        setErrorMsg('Failed to process local image file.');
        setUploading(false);
      }
      return;
    }

    try {
      // 1. Upload file to Supabase storage (using the vision-board-images bucket, folder structure user_id/dreamboard/...)
      const fileExt = file.name.split('.').pop();
      const fileName = `${userId}/dreamboard/${Date.now()}.${fileExt}`;
      
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('vision-board-images')
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: true
        });

      if (uploadError) throw uploadError;

      // 2. Get public URL of the uploaded image
      const { data: urlData } = supabase.storage
        .from('vision-board-images')
        .getPublicUrl(fileName);

      const imageUrl = urlData.publicUrl;

      // 3. Save reference in the dream_board database table
      const { error: dbError } = await supabase
        .from('dream_board')
        .insert({
          user_id: userId,
          image_url: imageUrl,
          title,
          notes: notes || null
        });

      if (dbError) throw dbError;

      // Reset states
      setTitle('');
      setNotes('');
      setFile(null);
      setIsAddOpen(false);
      fetchItems();
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to upload dream item.');
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (item: DreamBoardItem, e: React.MouseEvent) => {
    e.stopPropagation(); // Avoid triggering card selection/preview modal
    
    const confirmed = window.confirm("Are you sure you want to delete this dream from your board?");
    if (!confirmed) return;

    if (!isSupabaseConfigured) {
      const updated = items.filter(i => i.id !== item.id);
      setItems(updated);
      localStorage.setItem('mygoal_dream_board_items', JSON.stringify(updated));
      if (selectedItem?.id === item.id) {
        setSelectedItem(null);
      }
      return;
    }

    try {
      // 1. Delete image from storage if it exists in our bucket
      const urlParts = item.image_url.split('/vision-board-images/');
      if (urlParts.length > 1) {
        const filePath = decodeURIComponent(urlParts[1]);
        await supabase.storage.from('vision-board-images').remove([filePath]);
      }

      // 2. Delete database row
      const { error } = await supabase
        .from('dream_board')
        .delete()
        .eq('id', item.id);

      if (error) throw error;
      
      if (selectedItem?.id === item.id) {
        setSelectedItem(null);
      }
      fetchItems();
    } catch (err: any) {
      console.error('Error deleting dream item:', err.message);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-100 flex items-center gap-2 font-orbitron tracking-wide">
            <Cloud className="w-5 h-5 text-amber-400 fill-current/10 animate-pulse shrink-0" />
            <span>Dream Board</span>
          </h2>
          <p className="text-slate-400 text-sm">
            Manifest your dream lifestyle, career goals, and future achievements.
          </p>
        </div>

        <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
          <DialogTrigger render={<Button className="bg-orange-600/90 hover:bg-orange-500/90 text-orange-50 gap-2 text-[10px] py-2 px-3 h-auto font-audiowide tracking-wider border border-orange-400 shadow-sm self-start sm:self-auto shrink-0" />}>
            <Plus className="w-4 h-4" /> Add Dream Card
          </DialogTrigger>
          <DialogContent className="bg-slate-900 border border-slate-800 text-slate-100 max-w-sm">
            <DialogHeader>
              <DialogTitle className="text-slate-100 font-orbitron tracking-wide">Add Dream Card</DialogTitle>
              <DialogDescription className="text-slate-400">
                Visualize your manifestation. Upload a picture and state it as already achieved.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleUpload} className="space-y-4 pt-2">
              <div className="space-y-1.5">
                <Label htmlFor="dream-title" className="text-[10px] font-semibold uppercase tracking-widest font-audiowide text-slate-300">Manifestation Statement</Label>
                <Input
                  id="dream-title"
                  placeholder="e.g. I am a Principal Engineer at Google designing next-gen AI systems"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="bg-slate-950 border-slate-850 text-slate-100 font-sans"
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="dream-notes" className="text-[10px] font-semibold uppercase tracking-widest font-audiowide text-slate-300">Affirmations / Intentions (Optional)</Label>
                <textarea
                  id="dream-notes"
                  placeholder="e.g. I work with absolute focus. I design scalable code. I live a balanced and healthy life with my family in California."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full min-h-20 bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-xs text-slate-100 focus:outline-none focus:border-orange-500 transition-colors font-sans placeholder:text-slate-650"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="dream-image-file" className="text-[10px] font-semibold uppercase tracking-widest font-audiowide text-slate-300">Dream Photo</Label>
                <div className="flex items-center justify-center w-full">
                  <label className="flex flex-col items-center justify-center w-full h-24 border-2 border-dashed border-slate-800 rounded-lg cursor-pointer bg-slate-950/60 hover:bg-slate-900/60 transition-all font-audiowide tracking-wider">
                    <div className="flex flex-col items-center justify-center pt-3 pb-3">
                      <ImageIcon className="w-6 h-6 text-slate-500 mb-1" />
                      <p className="text-[10px] text-slate-400 font-semibold px-4 text-center truncate max-w-full">
                        {file ? file.name : 'Click to upload photo'}
                      </p>
                    </div>
                    <input
                      id="dream-image-file"
                      type="file"
                      accept="image/*"
                      onChange={(e) => setFile(e.target.files?.[0] || null)}
                      className="hidden"
                      required
                    />
                  </label>
                </div>
              </div>

              {errorMsg && (
                <p className="text-xs text-red-400 font-semibold bg-red-950/20 border border-red-500/10 p-2 rounded font-mono">
                  {errorMsg}
                </p>
              )}

              <Button
                type="submit"
                disabled={uploading}
                className="w-full bg-orange-600/90 hover:bg-orange-500/90 text-orange-50 font-medium font-audiowide tracking-wider text-[11px] py-2 border border-orange-400 shadow-sm"
              >
                {uploading ? 'Manifesting...' : 'Pin to Dream Board'}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 animate-pulse">
          {[1, 2, 3].map((n) => (
            <Card
              key={n}
              className="overflow-hidden bg-slate-950/40 border-slate-800/80 shadow-lg flex flex-col h-72"
            >
              <div className="h-44 w-full bg-slate-900/60 relative overflow-hidden">
                {/* Date overlay tag skeleton */}
                <div className="absolute bottom-2 left-2 w-16 h-4 rounded bg-slate-800/60" />
              </div>
              <CardContent className="p-4 flex-1 flex flex-col justify-between bg-slate-950/20">
                {/* Title skeletons */}
                <div className="space-y-2">
                  <div className="h-3 w-5/6 bg-slate-800/60 rounded" />
                  <div className="h-3 w-4/5 bg-slate-800/60 rounded" />
                  <div className="h-3 w-2/3 bg-slate-800/60 rounded" />
                </div>
                {/* Separator and Footer */}
                <div className="flex items-center justify-between mt-2 pt-2 border-t border-slate-900/60">
                  <div className="h-2.5 w-16 bg-slate-800/60 rounded" />
                  <div className="h-2.5 w-8 bg-slate-800/80 rounded" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {items.map((item) => (
            <Card
              key={item.id}
              onClick={() => setSelectedItem(item)}
              className="group overflow-hidden bg-slate-950/40 border-slate-800/80 hover:border-amber-500/40 hover:shadow-lg hover:shadow-amber-950/20 transition-all duration-300 relative cursor-pointer flex flex-col h-72"
            >
              <div className="h-44 w-full relative overflow-hidden bg-slate-900">
                <img
                  src={item.image_url}
                  alt={item.title}
                  className="object-cover w-full h-full transform group-hover:scale-105 transition-transform duration-500"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/20 to-transparent" />
                
                {/* Deleting action */}
                <button
                  onClick={(e) => handleDelete(item, e)}
                  className="absolute top-2 right-2 p-1.5 rounded-lg bg-slate-950/80 border border-slate-800/80 text-slate-400 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity duration-200 shadow-md backdrop-blur-sm"
                  title="Delete dream"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>

                {/* Date overlay tag */}
                <span className="absolute bottom-2 left-2 px-2 py-0.5 rounded text-[8px] font-bold uppercase tracking-wider bg-slate-950/70 text-slate-400 border border-slate-850 backdrop-blur-md font-mono">
                  {new Date(item.created_at).toLocaleDateString()}
                </span>
              </div>
              <CardContent className="p-4 flex-1 flex flex-col justify-between bg-slate-950/20">
                <p className="text-xs font-semibold text-slate-200 line-clamp-3 group-hover:text-amber-300 transition-colors font-sans leading-relaxed">
                  {item.title}
                </p>
                <div className="flex items-center justify-between mt-2 pt-2 border-t border-slate-900/60 text-[9px] text-slate-500 font-audiowide tracking-widest">
                  <span className="flex items-center gap-1 text-orange-400/80 uppercase">
                    <Sparkles className="w-3 h-3 text-orange-400" /> Manifesting
                  </span>
                  <span className="flex items-center gap-1 group-hover:text-amber-400 transition-colors font-semibold">
                    <Maximize2 className="w-3 h-3" /> View
                  </span>
                </div>
              </CardContent>
            </Card>
          ))}

          {items.length === 0 && (
            <div className="col-span-full py-16 px-6 rounded-xl border border-dashed border-slate-850 bg-slate-900/5 text-center flex flex-col items-center justify-center gap-4">
              <div className="p-3.5 rounded-2xl bg-amber-500/5 text-amber-400 border border-amber-500/10 animate-pulse">
                <Cloud className="w-6 h-6 fill-current/10" />
              </div>
              <div className="space-y-1.5 max-w-sm">
                <h3 className="text-sm font-bold text-slate-200 font-orbitron tracking-wider">Dream Board is Empty</h3>
                <p className="text-xs text-slate-450 font-sans leading-relaxed">
                  Start mapping your manifestations. Add photos representing your dream roles, environments, trips, or milestones, and view them daily to reinforce your daily actions.
                </p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Manifestation Preview Modal */}
      {selectedItem && (
        <Dialog open={!!selectedItem} onOpenChange={(open) => !open && setSelectedItem(null)}>
          <DialogContent 
            showCloseButton={false}
            className="bg-slate-950/95 border border-slate-900 text-slate-100 max-w-lg p-0 overflow-hidden backdrop-blur-md rounded-2xl shadow-2xl shadow-orange-950/30"
          >
            <div className="relative max-h-[50vh] w-full overflow-hidden bg-slate-900 flex justify-center items-center">
              <img
                src={selectedItem.image_url}
                alt={selectedItem.title}
                className="object-contain max-h-[50vh] w-full"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/10 to-transparent" />
              <button
                onClick={() => setSelectedItem(null)}
                className="absolute top-3 right-3 p-1.5 rounded-full bg-slate-950/80 border border-slate-900/60 text-slate-450 hover:text-white transition-colors cursor-pointer backdrop-blur-md"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-orange-400 animate-pulse" />
                  <span className="text-[10px] text-orange-400 font-bold uppercase tracking-widest font-audiowide">Manifestation Statement</span>
                </div>
                <h3 className="text-lg font-black text-slate-100 font-orbitron tracking-wide leading-relaxed bg-gradient-to-r from-slate-100 to-amber-200 bg-clip-text text-transparent">
                  {selectedItem.title}
                </h3>
              </div>

              {selectedItem.notes && (
                <div className="space-y-2 pt-2 border-t border-slate-900">
                  <span className="text-[9px] text-slate-500 font-bold uppercase tracking-widest font-audiowide">Intentions & Affirmations</span>
                  <p className="text-xs text-slate-350 leading-relaxed font-sans font-medium whitespace-pre-wrap">
                    {selectedItem.notes}
                  </p>
                </div>
              )}

              <div className="flex justify-between items-center text-[9px] text-slate-550 pt-4 border-t border-slate-900/80 font-mono">
                <span>Pinned on {new Date(selectedItem.created_at).toLocaleDateString()}</span>
                <span className="font-audiowide text-[8px] tracking-widest text-amber-400/70 uppercase">Focused Manifestation</span>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
