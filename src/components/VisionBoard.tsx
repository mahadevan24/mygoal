'use client';

import React, { useState, useEffect } from 'react';
import { supabase, isSupabaseConfigured } from '@/lib/supabaseClient';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Sparkles, Trash2, Plus, Image as ImageIcon, Flame } from 'lucide-react';

interface VisionBoardItem {
  id: string;
  image_url: string;
  title: string;
  target_company?: string;
  created_at: string;
}

interface VisionBoardProps {
  userId: string;
}

export default function VisionBoard({ userId }: VisionBoardProps) {
  const [items, setItems] = useState<VisionBoardItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [uploading, setUploading] = useState<boolean>(false);
  const [isOpen, setIsOpen] = useState<boolean>(false);

  // Form states
  const [title, setTitle] = useState<string>('');
  const [targetCompany, setTargetCompany] = useState<string>('Google');
  const [file, setFile] = useState<File | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const fetchItems = async () => {
    if (!isSupabaseConfigured) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('vision_board')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setItems(data || []);
    } catch (err: any) {
      console.error('Error fetching vision board items:', err.message);
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

    if (!isSupabaseConfigured) {
      setErrorMsg('Supabase is not configured.');
      return;
    }

    if (!file || !title) {
      setErrorMsg('Please select an image and enter a description.');
      return;
    }

    setUploading(true);

    try {
      // 1. Upload file to Supabase storage
      const fileExt = file.name.split('.').pop();
      const fileName = `${userId}/${Date.now()}.${fileExt}`;
      
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

      // 3. Save reference in the database table
      const { error: dbError } = await supabase
        .from('vision_board')
        .insert({
          user_id: userId,
          image_url: imageUrl,
          title,
          target_company: targetCompany
        });

      if (dbError) throw dbError;

      // Reset states
      setTitle('');
      setFile(null);
      setIsOpen(false);
      fetchItems();
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to upload vision item.');
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (itemId: string, imageUrl: string) => {
    if (!isSupabaseConfigured) return;
    try {
      // 1. Delete image from storage
      // Extract filepath from public URL: should be like "userId/filename.ext"
      const urlParts = imageUrl.split('/vision-board-images/');
      if (urlParts.length > 1) {
        const filePath = decodeURIComponent(urlParts[1]);
        await supabase.storage.from('vision-board-images').remove([filePath]);
      }

      // 2. Delete database row
      const { error } = await supabase
        .from('vision_board')
        .delete()
        .eq('id', itemId);

      if (error) throw error;
      fetchItems();
    } catch (err: any) {
      console.error('Error deleting item:', err.message);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-slate-100 flex items-center gap-2 font-orbitron tracking-wide">
            <Flame className="w-5 h-5 text-indigo-400" />
            My Vision Board
          </h2>
          <p className="text-slate-400 text-sm">
            Visual representations of where you want to be by July 2027.
          </p>
        </div>

        {isSupabaseConfigured && (
          <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger render={<Button className="bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white gap-2 text-[10px] py-2 px-3 h-auto font-audiowide tracking-wider border-none" />}>
              <Plus className="w-4 h-4" /> Add Goal Card
            </DialogTrigger>
            <DialogContent className="bg-slate-900 border border-slate-800 text-slate-100 max-w-sm">
              <DialogHeader>
                <DialogTitle className="text-slate-100 font-orbitron tracking-wide">Add Goal Card</DialogTitle>
                <DialogDescription className="text-slate-400">
                  Upload an image that inspires you (e.g. target logo, office).
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleUpload} className="space-y-4 pt-2">
                <div className="space-y-1.5">
                  <Label htmlFor="vision-title" className="text-[10px] font-semibold uppercase tracking-widest font-audiowide text-slate-300">Goal Description</Label>
                  <Input
                    id="vision-title"
                    placeholder="e.g. Getting an SDE-1 offer letter"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="bg-slate-950 border-slate-800 text-slate-100 font-sans"
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="target-company" className="text-[10px] font-semibold uppercase tracking-widest font-audiowide text-slate-300">Target Company</Label>
                  <select
                    id="target-company"
                    value={targetCompany}
                    onChange={(e) => setTargetCompany(e.target.value)}
                    className="w-full h-9 rounded-md border border-slate-800 bg-slate-950 px-3 py-1 text-sm text-slate-100 focus:outline-none focus:ring-1 focus:ring-violet-500 font-audiowide tracking-wider text-[11px]"
                  >
                    <option value="Google">Google</option>
                    <option value="Amazon">Amazon</option>
                    <option value="Microsoft">Microsoft</option>
                    <option value="General">Other / Dream Company</option>
                  </select>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="image-file" className="text-[10px] font-semibold uppercase tracking-widest font-audiowide text-slate-300">Goal Image</Label>
                  <div className="flex items-center justify-center w-full">
                    <label className="flex flex-col items-center justify-center w-full h-24 border-2 border-dashed border-slate-800 rounded-lg cursor-pointer bg-slate-950/60 hover:bg-slate-900/60 transition-all font-audiowide tracking-wider">
                      <div className="flex flex-col items-center justify-center pt-3 pb-3">
                        <ImageIcon className="w-6 h-6 text-slate-500 mb-1" />
                        <p className="text-[10px] text-slate-400 font-semibold">
                          {file ? file.name : 'Click to upload image'}
                        </p>
                      </div>
                      <input
                        id="image-file"
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
                  className="w-full bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white font-medium font-audiowide tracking-wider text-[11px] py-2 border-none"
                >
                  {uploading ? 'Pinning...' : 'Pin to Board'}
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[1, 2, 3].map((n) => (
            <div key={n} className="h-44 rounded-xl bg-slate-900/40 border border-slate-800/80 animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Custom uploaded cards */}
          {items.map((item) => (
            <Card
              key={item.id}
              className="group overflow-hidden bg-slate-950/40 border-slate-800/80 hover:border-indigo-500/30 transition-all duration-300 relative shadow-lg"
            >
              <div className="h-44 w-full relative overflow-hidden bg-slate-900">
                <img
                  src={item.image_url}
                  alt={item.title}
                  className="object-cover w-full h-full transform group-hover:scale-105 transition-transform duration-500"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/40 to-transparent" />
                
                {/* Delete button (only show on hover) */}
                <button
                  onClick={() => handleDelete(item.id, item.image_url)}
                  className="absolute top-2 right-2 p-1.5 rounded-lg bg-slate-950/80 hover:bg-red-650 text-slate-400 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity border border-slate-800/60"
                  title="Remove visual"
                >
                  <Trash2 className="w-4 h-4" />
                </button>

                {/* Company Tag */}
                {item.target_company && (
                  <span className="absolute top-2 left-2 px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider bg-indigo-950/80 text-indigo-300 border border-indigo-500/30 backdrop-blur-md font-audiowide">
                    {item.target_company}
                  </span>
                )}
              </div>
              <CardContent className="p-4 bg-slate-950/40">
                <p className="text-sm font-semibold text-slate-200 line-clamp-2 min-h-10 group-hover:text-indigo-300 transition-colors">
                  {item.title}
                </p>
                <div className="flex items-center justify-between mt-2 pt-2 border-t border-slate-900/60">
                  <span className="text-[9px] text-slate-500 font-mono">
                    Pinned on {new Date(item.created_at).toLocaleDateString()}
                  </span>
                  <span className="text-violet-400 text-[10px] flex items-center gap-1 font-audiowide tracking-wider">
                    <Sparkles className="w-3.5 h-3.5" /> Target 2027
                  </span>
                </div>
              </CardContent>
            </Card>
          ))}

          {items.length === 0 && (
            <div className="col-span-full py-12 px-6 rounded-xl border border-dashed border-slate-800/80 bg-slate-900/10 text-center flex flex-col items-center justify-center gap-3">
              <div className="p-3 rounded-xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/10 animate-pulse">
                <Sparkles className="w-5 h-5" />
              </div>
              <div className="space-y-1.5 max-w-sm">
                <h3 className="text-sm font-bold text-slate-200 font-orbitron tracking-wider">Your Vision Board is Empty</h3>
                <p className="text-xs text-slate-450 font-sans leading-relaxed">
                  Pin your target companies, career goals, or motivational tech workspaces here to visually anchor your consistency journey.
                </p>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
