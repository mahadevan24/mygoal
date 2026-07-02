'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { supabase, isSupabaseConfigured } from '@/lib/supabaseClient';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { BookOpen, Search, Plus, Trash2, Edit, X, Loader2, Heart, Share2, Globe, Eye, Code, Heading1, Heading2, Bold, List, FileText } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Blog {
  id: string;
  user_id: string;
  user_email: string;
  title: string;
  content: string;
  tags: string[];
  is_shared: boolean;
  claps: number;
  created_at: string;
  updated_at: string;
}

interface BlogsFeedProps {
  userId: string;
  userEmail: string;
}

// Preset tags for fast tagging
const PRESET_TAGS = ['DSA', 'LLD', 'System Design', 'Interview Prep', 'Career', 'Motivation', 'Web Dev'];

// High quality mock blogs for local preview
const MOCK_COMMUNITY_BLOGS: Blog[] = [
  {
    id: 'mock-blog-1',
    user_id: 'mock-jeff-dean',
    user_email: 'jeff.dean@google.com',
    title: 'Designing Large-Scale Distributed Systems at Google',
    tags: ['System Design', 'Career'],
    is_shared: true,
    claps: 1242,
    content: `# Designing Large-Scale Distributed Systems

Building infrastructure that handles billions of queries per day requires thinking differently about failures, latency, and scaling. Here are my key takeaways from decades of building infrastructure at Google.

## 1. Design for Failure (It is a Rule, Not an Exception)
When you run 100,000 machines, a 0.01% daily failure rate means 10 machines fail every single day. 
- Always assume disks will crash, network packets will drop, and power grids will fail.
- Treat hardware failures as a normal software flow.

## 2. Think about Latency Tail Effects
It is easy to optimize the 50th percentile (median) latency, but what about the 99th percentile (tail latency)? If a single search request fetches data from 100 leaf servers in parallel:
- If a leaf server has a 1% chance of slow response (say, >1s), then the overall request has a **63% chance** of taking >1s!
- **Mitigation:** Use backup requests. If a leaf server doesn't respond in 10ms, send a duplicate request to another replica and use whichever comes back first.

## 3. Keep Things Simple
\`\`\`cpp
// Simplicity is key to debugging at scale
struct Node {
  uint64_t id;
  std::vector<std::string> endpoints;
  bool is_healthy;
};
\`\`\`

Never build a complex system where a simple one would suffice. Write simple, modular code!`,
    created_at: new Date(Date.now() - 3600000 * 2).toISOString(),
    updated_at: new Date(Date.now() - 3600000 * 2).toISOString(),
  },
  {
    id: 'mock-blog-2',
    user_id: 'mock-linus-torvalds',
    user_email: 'linus.torvalds@linux.org',
    title: 'Clean Code, Git Architecture, and the Value of Good Taste',
    tags: ['LLD', 'DSA'],
    is_shared: true,
    claps: 856,
    content: `# Clean Code & Code Taste

People talk about "clean code" all the time, but for me, "good code taste" is about how clean, elegant, and logical the abstractions are. Let me give you an example from Git and the Linux kernel.

## Elegant Design vs. Clunky If-Statements
In low-level programming, you see people deleting nodes from a singly-linked list by keeping track of the previous node.

### Clunky Way:
\`\`\`c
void remove_entry(entry *target) {
    entry *prev = NULL;
    entry *curr = head;
    while (curr != target) {
        prev = curr;
        curr = curr->next;
    }
    if (!prev)
        head = target->next;
    else
        prev->next = target->next;
}
\`\`\`

### The Elegant Way (Using Pointers to Pointers):
\`\`\`c
void remove_entry(entry *target) {
    entry **indirect = &head;
    while ((*indirect) != target)
        indirect = &(*indirect)->next;
    *indirect = target->next;
}
\`\`\`
Notice how the second implementation has **no conditional branches** or special cases for the head node? This is what I call **code taste**.

## Git Design Principles
Git works because its core model is simple and immutable:
- A content-addressable object store.
- Commits point to trees, trees point to blobs.
- DAG (Directed Acyclic Graph) representation makes branching and merging mathematically trivial.`,
    created_at: new Date(Date.now() - 3600000 * 24).toISOString(),
    updated_at: new Date(Date.now() - 3600000 * 24).toISOString(),
  },
  {
    id: 'mock-blog-3',
    user_id: 'mock-satya',
    user_email: 'satya.nadella@microsoft.com',
    title: 'The Growth Mindset: Essential for Software Engineers',
    tags: ['Motivation', 'Career'],
    is_shared: true,
    claps: 618,
    content: `# Embracing the Growth Mindset

In technology, change is the only constant. The skills that got us here will not be the skills that take us forward. The most important capability of a modern software engineer is not the mastery of a specific language, but the **speed of learning**.

## What is a Growth Mindset?
- **Fixed Mindset:** "I am bad at algorithms. I can never pass system design interviews."
- **Growth Mindset:** "I don't understand dynamic programming *yet*, but with regular practice, I will master it."

## Tips for Daily Execution
1. **Focus on Consistency:** 15 minutes of study every single day is infinitely better than a 5-hour marathon once a week.
2. **Accept Failure:** A failed mock interview is not a reflection of your intelligence. It is a detailed map of exactly what you need to study next.
3. **Build in Public:** Share what you learn. Teaching others is the absolute best way to cement your own understanding.`,
    created_at: new Date(Date.now() - 3600000 * 48).toISOString(),
    updated_at: new Date(Date.now() - 3600000 * 48).toISOString(),
  }
];

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
          <pre key={`code-${i}`} className="bg-slate-950 border border-slate-900 rounded-lg p-4 my-3 overflow-x-auto text-xs text-orange-300 font-mono leading-relaxed select-text">
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
      renderedElements.push(<h1 key={i} className="text-xl font-black font-orbitron text-orange-400 mt-6 mb-3 border-b border-slate-800 pb-1">{line.substring(2)}</h1>);
    } else if (line.startsWith('## ')) {
      renderedElements.push(<h2 key={i} className="text-lg font-bold font-orbitron text-amber-400 mt-5 mb-2">{line.substring(3)}</h2>);
    } else if (line.startsWith('### ')) {
      renderedElements.push(<h3 key={i} className="text-base font-semibold font-orbitron text-slate-200 mt-4 mb-2">{line.substring(4)}</h3>);
    }
    // Bullet lists
    else if (line.trim().startsWith('- ') || line.trim().startsWith('* ')) {
      renderedElements.push(
        <div key={i} className="flex items-start gap-2.5 my-1.5 pl-3 text-slate-300 text-sm leading-relaxed">
          <span className="text-orange-500 mt-1.5 select-none text-[8px]">•</span>
          <span>{parseInlineFormatting(line.trim().substring(2))}</span>
        </div>
      );
    }
    // Empty lines
    else if (line.trim() === '') {
      renderedElements.push(<div key={i} className="h-3" />);
    }
    // Standard paragraphs
    else {
      renderedElements.push(
        <p key={i} className="text-slate-300 text-sm leading-relaxed my-2 select-text">
          {parseInlineFormatting(line)}
        </p>
      );
    }
  }

  // Handle unclosed code block
  if (inCodeBlock && codeLines.length > 0) {
    renderedElements.push(
      <pre key="code-unclosed" className="bg-slate-950 border border-slate-900 rounded-lg p-4 my-3 overflow-x-auto text-xs text-orange-300 font-mono leading-relaxed select-text">
        <code>{codeLines.join('\n')}</code>
      </pre>
    );
  }

  return <div className="space-y-1 font-sans">{renderedElements}</div>;
}

// Simple helper to parse inline formatting (like bold `**`)
function parseInlineFormatting(text: string): React.ReactNode {
  const parts = text.split(/(\*\*.*?\*\*|`.*?`)/g);
  return parts.map((part, idx) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return <strong key={idx} className="font-black text-slate-100">{part.slice(2, -2)}</strong>;
    }
    if (part.startsWith('`') && part.endsWith('`')) {
      return <code key={idx} className="bg-slate-950 text-orange-400 border border-slate-900 px-1.5 py-0.5 rounded font-mono text-xs">{part.slice(1, -1)}</code>;
    }
    return part;
  });
}

export default function BlogsFeed({ userId, userEmail }: BlogsFeedProps) {
  const [activeSubTab, setActiveSubTab] = useState<'feed' | 'my-blogs'>('feed');
  const [blogs, setBlogs] = useState<Blog[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [saving, setSaving] = useState<boolean>(false);

  // Search & Filter
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedTagFilter, setSelectedTagFilter] = useState<string>('All');

  // Modals
  const [isAddEditOpen, setIsAddEditOpen] = useState<boolean>(false);
  const [isViewOpen, setIsViewOpen] = useState<boolean>(false);
  const [viewingBlog, setViewingBlog] = useState<Blog | null>(null);
  const [editingBlog, setEditingBlog] = useState<Blog | null>(null);

  // Form Editor Fields
  const [title, setTitle] = useState<string>('');
  const [content, setContent] = useState<string>('');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [isShared, setIsShared] = useState<boolean>(false);
  const [editorTab, setEditorTab] = useState<'edit' | 'preview'>('edit');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const fetchBlogs = async () => {
    setLoading(true);
    if (!isSupabaseConfigured) {
      // Local storage fallback
      try {
        const stored = localStorage.getItem('mygoal_blogs');
        if (stored) {
          const userBlogs = JSON.parse(stored);
          // Merge user custom blogs with mock community ones
          setBlogs([...userBlogs, ...MOCK_COMMUNITY_BLOGS]);
        } else {
          // Initialize local storage with empty array for user drafts
          localStorage.setItem('mygoal_blogs', JSON.stringify([]));
          setBlogs(MOCK_COMMUNITY_BLOGS);
        }
      } catch (err) {
        console.error('Error fetching from localStorage:', err);
      } finally {
        setLoading(false);
      }
      return;
    }

    try {
      // Fetch both public/shared blogs AND user's own blogs
      const { data, error } = await supabase
        .from('blogs')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setBlogs(data || []);
    } catch (err: any) {
      console.error('Error fetching blogs:', err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBlogs();
  }, [userId]);

  // Estimate Read Time
  const getReadTime = (text: string) => {
    const words = text ? text.split(/\s+/).length : 0;
    const minutes = Math.max(1, Math.ceil(words / 200));
    return `${minutes} min read`;
  };

  // Filter & Search Blogs
  const filteredBlogs = useMemo(() => {
    return blogs.filter((blog) => {
      // Decide tab filtering
      if (activeSubTab === 'feed') {
        if (!blog.is_shared) return false;
      } else {
        // "my-blogs" tab shows all user blogs, shared or drafts
        if (blog.user_id !== userId) return false;
      }

      // Search query filter
      const matchesSearch =
        blog.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        blog.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
        blog.user_email.toLowerCase().includes(searchQuery.toLowerCase());

      // Tag filter
      const matchesTag = selectedTagFilter === 'All' || blog.tags.includes(selectedTagFilter);

      return matchesSearch && matchesTag;
    });
  }, [blogs, activeSubTab, searchQuery, selectedTagFilter, userId]);

  // Open Create Modal
  const handleOpenCreate = () => {
    setEditingBlog(null);
    setTitle('');
    setContent('');
    setSelectedTags([]);
    setIsShared(false);
    setEditorTab('edit');
    setErrorMsg(null);
    setIsAddEditOpen(true);
  };

  // Open Edit Modal
  const handleOpenEdit = (blog: Blog, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingBlog(blog);
    setTitle(blog.title);
    setContent(blog.content);
    setSelectedTags(blog.tags);
    setIsShared(blog.is_shared);
    setEditorTab('edit');
    setErrorMsg(null);
    setIsAddEditOpen(true);
  };

  // Delete Blog
  const handleDeleteBlog = async (blogId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm('Are you sure you want to delete this blog post?')) return;

    if (!isSupabaseConfigured) {
      try {
        const stored = localStorage.getItem('mygoal_blogs');
        if (stored) {
          const userBlogs = JSON.parse(stored) as Blog[];
          const updated = userBlogs.filter(b => b.id !== blogId);
          localStorage.setItem('mygoal_blogs', JSON.stringify(updated));
          // Refresh state
          setBlogs([...updated, ...MOCK_COMMUNITY_BLOGS]);
        }
      } catch (err) {
        console.error('Error deleting from localStorage:', err);
      }
      return;
    }

    try {
      const { error } = await supabase.from('blogs').delete().eq('id', blogId);
      if (error) throw error;
      setBlogs(prev => prev.filter(b => b.id !== blogId));
    } catch (err: any) {
      alert('Failed to delete blog: ' + err.message);
    }
  };

  // Save Blog (Insert / Update)
  const handleSaveBlog = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!title.trim()) {
      setErrorMsg('Blog title is required.');
      return;
    }
    if (!content.trim()) {
      setErrorMsg('Blog content cannot be empty.');
      return;
    }

    setSaving(true);
    const now = new Date().toISOString();

    if (!isSupabaseConfigured) {
      // Local storage save
      try {
        const stored = localStorage.getItem('mygoal_blogs');
        const userBlogs = stored ? JSON.parse(stored) as Blog[] : [];

        if (editingBlog) {
          // Update
          const updated = userBlogs.map(b => {
            if (b.id === editingBlog.id) {
              return {
                ...b,
                title: title.trim(),
                content: content.trim(),
                tags: selectedTags,
                is_shared: isShared,
                updated_at: now
              };
            }
            return b;
          });
          localStorage.setItem('mygoal_blogs', JSON.stringify(updated));
          setBlogs([...updated, ...MOCK_COMMUNITY_BLOGS]);
        } else {
          // Insert
          const newBlog: Blog = {
            id: 'local-blog-' + Date.now(),
            user_id: userId,
            user_email: userEmail || 'guest@mygoal.dev',
            title: title.trim(),
            content: content.trim(),
            tags: selectedTags,
            is_shared: isShared,
            claps: 0,
            created_at: now,
            updated_at: now
          };
          const updated = [newBlog, ...userBlogs];
          localStorage.setItem('mygoal_blogs', JSON.stringify(updated));
          setBlogs([...updated, ...MOCK_COMMUNITY_BLOGS]);
        }
        setIsAddEditOpen(false);
      } catch (err) {
        console.error('Error saving to localStorage:', err);
        setErrorMsg('Failed to save changes locally.');
      } finally {
        setSaving(false);
      }
      return;
    }

    try {
      if (editingBlog) {
        // Update
        const { error } = await supabase
          .from('blogs')
          .update({
            title: title.trim(),
            content: content.trim(),
            tags: selectedTags,
            is_shared: isShared,
            updated_at: now
          })
          .eq('id', editingBlog.id);

        if (error) throw error;
      } else {
        // Insert
        const { error } = await supabase
          .from('blogs')
          .insert({
            user_id: userId,
            user_email: userEmail,
            title: title.trim(),
            content: content.trim(),
            tags: selectedTags,
            is_shared: isShared,
            claps: 0
          });

        if (error) throw error;
      }

      await fetchBlogs();
      setIsAddEditOpen(false);
    } catch (err: any) {
      setErrorMsg(err.message || 'Error occurred while saving.');
    } finally {
      setSaving(false);
    }
  };

  // Toggle Share (Quick action on list card)
  const handleToggleShare = async (blog: Blog, e: React.MouseEvent) => {
    e.stopPropagation();
    const updatedStatus = !blog.is_shared;

    if (!isSupabaseConfigured) {
      try {
        const stored = localStorage.getItem('mygoal_blogs');
        if (stored) {
          const userBlogs = JSON.parse(stored) as Blog[];
          const updated = userBlogs.map(b => {
            if (b.id === blog.id) {
              return { ...b, is_shared: updatedStatus, updated_at: new Date().toISOString() };
            }
            return b;
          });
          localStorage.setItem('mygoal_blogs', JSON.stringify(updated));
          setBlogs([...updated, ...MOCK_COMMUNITY_BLOGS]);
        }
      } catch (err) {
        console.error(err);
      }
      return;
    }

    try {
      const { error } = await supabase
        .from('blogs')
        .update({ is_shared: updatedStatus, updated_at: new Date().toISOString() })
        .eq('id', blog.id);

      if (error) throw error;
      setBlogs(prev => prev.map(b => b.id === blog.id ? { ...b, is_shared: updatedStatus } : b));
    } catch (err: any) {
      alert('Failed to share: ' + err.message);
    }
  };

  // Clap Action
  const handleClap = async (blog: Blog, e: React.MouseEvent) => {
    e.stopPropagation();
    
    // UI update immediately for premium feel
    setBlogs(prev => prev.map(b => b.id === blog.id ? { ...b, claps: b.claps + 1 } : b));

    if (!isSupabaseConfigured) {
      // Save claps state locally
      if (blog.id.startsWith('mock-')) {
        return; // Claps on mock blogs are visual-only or we can just ignore saving
      }
      try {
        const stored = localStorage.getItem('mygoal_blogs');
        if (stored) {
          const userBlogs = JSON.parse(stored) as Blog[];
          const updated = userBlogs.map(b => {
            if (b.id === blog.id) {
              return { ...b, claps: b.claps + 1 };
            }
            return b;
          });
          localStorage.setItem('mygoal_blogs', JSON.stringify(updated));
        }
      } catch (err) {
        console.error(err);
      }
      return;
    }

    try {
      await supabase
        .from('blogs')
        .update({ claps: blog.claps + 1 })
        .eq('id', blog.id);
    } catch (err) {
      console.error('Error recording clap on DB:', err);
    }
  };

  // Toolbar formatting utility
  const injectMarkdown = (syntax: string) => {
    const textarea = document.getElementById('blog-editor-textarea') as HTMLTextAreaElement;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const text = textarea.value;
    const before = text.substring(0, start);
    const after = text.substring(end, text.length);
    const selected = text.substring(start, end);

    let replacement = '';
    if (syntax === 'h1') replacement = `# ${selected || 'Header 1'}`;
    else if (syntax === 'h2') replacement = `## ${selected || 'Header 2'}`;
    else if (syntax === 'bold') replacement = `**${selected || 'Bold Text'}**`;
    else if (syntax === 'code') replacement = `\`\`\`javascript\n${selected || '// Insert code'}\n\`\`\``;
    else if (syntax === 'list') replacement = `- ${selected || 'List item'}`;

    setContent(before + replacement + after);
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + replacement.length, start + replacement.length);
    }, 0);
  };

  // Helper for Author Avatar
  const getInitials = (email: string) => {
    if (!email) return 'GM';
    const clean = email.split('@')[0];
    return clean.substring(0, 2).toUpperCase();
  };

  // Helper to format date
  const formatDate = (dateStr: string) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  return (
    <div className="space-y-6">
      {/* Tab Header Banner */}
      <div className="p-6 rounded-xl border border-slate-800 bg-slate-900/40 backdrop-blur-md shadow-lg flex flex-col md:flex-row md:items-center justify-between gap-6 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-[300px] h-[300px] rounded-full bg-orange-600/5 blur-[80px] pointer-events-none" />
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <BookOpen className="w-6 h-6 text-orange-400" />
            <h2 className="text-xl font-bold text-slate-100 font-orbitron tracking-wide">Developer Blogs & Feed</h2>
          </div>
          <p className="text-slate-400 text-sm max-w-2xl leading-relaxed">
            Read, draft, and publish insightful technical blogs. Connect, share knowledge, and learn collaboratively with other preparation minds.
          </p>
        </div>
        <Button
          onClick={handleOpenCreate}
          className="bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-slate-950 font-bold font-orbitron tracking-wider text-[11px] h-10 px-5 rounded-xl border-t border-orange-400/30 flex items-center gap-2 shadow-lg shadow-orange-950/20 cursor-pointer shrink-0"
        >
          <Plus className="w-4 h-4 text-slate-950 stroke-[3]" />
          CREATE BLOG
        </Button>
      </div>

      {/* Navigation Sub-Tabs and Search Filters */}
      <div className="flex flex-col gap-4">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-900 pb-3">
          <div className="flex bg-slate-950/80 p-1 rounded-xl border border-slate-850">
            <button
              onClick={() => {
                setActiveSubTab('feed');
                setSelectedTagFilter('All');
              }}
              className={cn(
                "px-4 py-2 text-xs font-semibold font-orbitron rounded-lg transition-all cursor-pointer flex items-center gap-2",
                activeSubTab === 'feed'
                  ? "bg-orange-600/20 border border-orange-500/20 text-orange-350"
                  : "text-slate-400 hover:text-slate-200 border border-transparent"
              )}
            >
              <Globe className="w-3.5 h-3.5" />
              Community Feed
            </button>
            <button
              onClick={() => {
                setActiveSubTab('my-blogs');
                setSelectedTagFilter('All');
              }}
              className={cn(
                "px-4 py-2 text-xs font-semibold font-orbitron rounded-lg transition-all cursor-pointer flex items-center gap-2",
                activeSubTab === 'my-blogs'
                  ? "bg-orange-600/20 border border-orange-500/20 text-orange-350"
                  : "text-slate-400 hover:text-slate-200 border border-transparent"
              )}
            >
              <FileText className="w-3.5 h-3.5" />
              My Blogs & Drafts
            </button>
          </div>

          {/* Search bar */}
          <div className="relative min-w-[260px] max-w-sm flex-1 md:flex-initial">
            <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-500" />
            <Input
              type="text"
              placeholder="Search blogs, authors..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 pr-4 py-2.5 h-9 bg-slate-950/50 border-slate-850 hover:border-slate-800 focus:border-orange-500/50 text-xs text-slate-200 font-sans placeholder-slate-500 rounded-xl"
            />
          </div>
        </div>

        {/* Tag Filters */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1.5 scrollbar-thin">
          <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider font-audiowide shrink-0 mr-1">Tags:</span>
          {['All', ...PRESET_TAGS].map((tag) => (
            <button
              key={tag}
              onClick={() => setSelectedTagFilter(tag)}
              className={cn(
                "px-3 py-1 rounded-full text-[10px] font-bold font-mono tracking-wider transition-all cursor-pointer shrink-0 border",
                selectedTagFilter === tag
                  ? "bg-orange-600/10 border-orange-500/40 text-orange-400"
                  : "bg-slate-900/30 border-slate-850 text-slate-400 hover:text-slate-200 hover:border-slate-800"
              )}
            >
              #{tag}
            </button>
          ))}
        </div>
      </div>

      {/* Blogs Layout list */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 gap-3">
          <Loader2 className="w-8 h-8 text-orange-500 animate-spin" />
          <span className="text-xs text-slate-400 font-orbitron">Loading Dev Blogs...</span>
        </div>
      ) : filteredBlogs.length === 0 ? (
        <Card className="bg-slate-900/10 border border-dashed border-slate-850 p-12 text-center">
          <CardContent className="space-y-4">
            <div className="w-12 h-12 bg-slate-900/60 rounded-2xl flex items-center justify-center mx-auto text-slate-500 border border-slate-800">
              <BookOpen className="w-5 h-5" />
            </div>
            <div className="space-y-1">
              <h4 className="text-sm font-bold text-slate-250 font-orbitron">No Blogs Found</h4>
              <p className="text-xs text-slate-550 max-w-sm mx-auto">
                {searchQuery || selectedTagFilter !== 'All' 
                  ? "We couldn't find any blogs matching your search filters. Try adjusting your query."
                  : activeSubTab === 'feed'
                  ? "No one has published blogs to the feed yet. Be the first to share your understanding!"
                  : "You haven't written any blogs yet. Create a draft to get started."}
              </p>
            </div>
            {activeSubTab === 'my-blogs' && (
              <Button
                onClick={handleOpenCreate}
                variant="outline"
                className="border-slate-800 hover:border-orange-500/20 text-xs hover:bg-orange-500/5 text-slate-300 font-semibold"
              >
                Create First Draft
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredBlogs.map((blog) => (
            <Card
              key={blog.id}
              onClick={() => {
                setViewingBlog(blog);
                setIsViewOpen(true);
              }}
              className="bg-slate-900/40 border border-slate-800/80 backdrop-blur-md shadow-lg rounded-xl overflow-hidden group hover:border-orange-500/30 transition-all duration-300 flex flex-col justify-between cursor-pointer"
            >
              <CardContent className="p-5 flex-1 flex flex-col justify-between space-y-4">
                <div className="space-y-3">
                  {/* Meta info */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-full border border-orange-500/30 bg-slate-950 text-orange-400 font-audiowide text-[10px] flex items-center justify-center shrink-0">
                        {getInitials(blog.user_email)}
                      </div>
                      <div className="flex flex-col min-w-0 text-left">
                        <span className="text-[9px] text-slate-300 font-mono truncate w-32">{blog.user_email}</span>
                      </div>
                    </div>
                    <span className="text-[9px] text-slate-500 font-semibold font-mono">{formatDate(blog.created_at)}</span>
                  </div>

                  {/* Title & snippet */}
                  <div className="space-y-1">
                    <h3 className="text-sm font-bold text-slate-200 font-orbitron tracking-wide group-hover:text-orange-400 transition-colors line-clamp-2">
                      {blog.title}
                    </h3>
                    <p className="text-xs text-slate-400 line-clamp-3 leading-relaxed font-sans select-none">
                      {blog.content.replace(/#+\s+/g, '').replace(/`+[^`]+`+/g, '')}
                    </p>
                  </div>
                </div>

                {/* Footer details */}
                <div className="pt-3 border-t border-slate-900 flex flex-wrap items-center justify-between gap-3 shrink-0">
                  {/* Tags */}
                  <div className="flex flex-wrap gap-1 max-w-[60%]">
                    {blog.tags.slice(0, 2).map(tag => (
                      <span key={tag} className="text-[8px] font-bold font-mono tracking-wider bg-slate-950 border border-slate-900 px-2 py-0.5 rounded-full text-orange-400">
                        #{tag}
                      </span>
                    ))}
                  </div>

                  {/* Read Time & Claps */}
                  <div className="flex items-center gap-2.5">
                    <span className="text-[9px] text-slate-500 font-semibold font-mono whitespace-nowrap">
                      {getReadTime(blog.content)}
                    </span>
                    <button
                      onClick={(e) => handleClap(blog, e)}
                      className="flex items-center gap-1 px-2 py-1 rounded-lg bg-orange-500/10 hover:bg-orange-500/20 text-orange-450 border border-orange-500/10 hover:border-orange-500/25 transition-all text-[10px] font-bold font-mono select-none"
                    >
                      <Heart className="w-3.5 h-3.5 fill-orange-500 text-orange-500 animate-pulse" />
                      {blog.claps}
                    </button>
                  </div>
                </div>
              </CardContent>

              {/* Owner actions bar */}
              {blog.user_id === userId && (
                <div className="px-5 py-2.5 bg-slate-950/60 border-t border-slate-900/60 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <button
                      onClick={(e) => handleToggleShare(blog, e)}
                      className={cn(
                        "text-[9px] font-bold font-orbitron tracking-wider flex items-center gap-1 px-2 py-0.5 rounded border transition-colors",
                        blog.is_shared 
                          ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400 hover:bg-emerald-500/20" 
                          : "bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200 hover:border-slate-700"
                      )}
                      title={blog.is_shared ? "Unshare from Community Feed" : "Share to Community Feed"}
                    >
                      <Share2 className="w-3 h-3" />
                      {blog.is_shared ? "SHARED" : "PRIVATE"}
                    </button>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={(e) => handleOpenEdit(blog, e)}
                      className="p-1 rounded bg-slate-900 border border-slate-850 hover:bg-slate-850 hover:text-orange-400 hover:border-orange-500/10 text-slate-400 transition-colors"
                      title="Edit Post"
                    >
                      <Edit className="w-3 h-3" />
                    </button>
                    <button
                      onClick={(e) => handleDeleteBlog(blog.id, e)}
                      className="p-1 rounded bg-slate-900 border border-slate-850 hover:bg-red-500/10 hover:text-red-400 hover:border-red-500/10 text-slate-400 transition-colors"
                      title="Delete Post"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              )}
            </Card>
          ))}
        </div>
      )}

      {/* Reader Modal (Distraction-Free Mode) */}
      <Dialog open={isViewOpen} onOpenChange={setIsViewOpen}>
        {viewingBlog && (
          <DialogContent showCloseButton={false} className="bg-slate-950 border border-slate-850 text-slate-100 max-w-3xl backdrop-blur-md shadow-2xl rounded-2xl overflow-hidden p-0 gap-0">
            {/* Header Area */}
            <div className="p-6 border-b border-slate-900 bg-slate-900/20 flex flex-col gap-4 relative">
              <button
                onClick={() => setIsViewOpen(false)}
                className="absolute top-4 right-4 p-1.5 rounded-lg bg-slate-900 hover:bg-slate-850 border border-slate-800 hover:border-slate-750 text-slate-400 hover:text-slate-200 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>

              <div className="flex flex-wrap items-center gap-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-full border border-orange-500/40 bg-slate-950 text-orange-400 font-audiowide text-xs flex items-center justify-center">
                    {getInitials(viewingBlog.user_email)}
                  </div>
                  <div className="flex flex-col text-left">
                    <span className="text-xs text-slate-200 font-semibold font-mono">{viewingBlog.user_email}</span>
                    <span className="text-[10px] text-slate-500 font-mono">Published {formatDate(viewingBlog.created_at)}</span>
                  </div>
                </div>
                <div className="h-4 w-px bg-slate-800 hidden sm:block" />
                <span className="text-[10px] text-slate-400 font-bold font-mono bg-slate-900 border border-slate-800 px-2 py-0.5 rounded">
                  {getReadTime(viewingBlog.content)}
                </span>
                {viewingBlog.is_shared && (
                  <span className="text-[10px] text-emerald-400 font-bold font-mono bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded flex items-center gap-1">
                    <Globe className="w-3 h-3" />
                    Shared
                  </span>
                )}
              </div>

              <DialogTitle className="text-2xl font-black font-orbitron tracking-wide text-slate-100 leading-tight pr-8">
                {viewingBlog.title}
              </DialogTitle>

              {/* Tags inside reader */}
              <div className="flex flex-wrap gap-1.5">
                {viewingBlog.tags.map(tag => (
                  <span key={tag} className="text-[10px] font-bold font-mono tracking-wider bg-slate-900 border border-slate-800 px-2.5 py-0.5 rounded-full text-orange-400">
                    #{tag}
                  </span>
                ))}
              </div>
            </div>

            {/* Reading Content viewport */}
            <div className="p-6 md:p-8 max-h-[50vh] overflow-y-auto border-b border-slate-900 select-text">
              {renderFormattedContent(viewingBlog.content)}
            </div>

            {/* Footer with Claps */}
            <div className="p-4 bg-slate-950 flex items-center justify-between px-6">
              <span className="text-[10px] text-slate-500 font-semibold font-mono">Press heart to show support</span>
              <button
                onClick={(e) => handleClap(viewingBlog, e)}
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-orange-500/10 hover:bg-orange-500/20 text-orange-400 border border-orange-500/20 hover:border-orange-500/40 transition-all text-xs font-bold font-mono"
              >
                <Heart className="w-4 h-4 fill-orange-500 text-orange-500 animate-pulse" />
                <span>CLAP POST • {viewingBlog.claps}</span>
              </button>
            </div>
          </DialogContent>
        )}
      </Dialog>

      {/* Write Blog Modal */}
      <Dialog open={isAddEditOpen} onOpenChange={setIsAddEditOpen}>
        <DialogContent showCloseButton={false} className="bg-slate-950 border border-slate-850 text-slate-100 sm:max-w-[75vw] w-[95vw] backdrop-blur-md shadow-2xl rounded-2xl overflow-hidden p-0 gap-0">
          <DialogHeader className="p-6 border-b border-slate-900 bg-slate-900/20 flex flex-row items-center justify-between">
            <div>
              <DialogTitle className="text-lg text-slate-100 font-orbitron tracking-wide font-black">
                {editingBlog ? 'Edit Blog Post' : 'Create Blog Post'}
              </DialogTitle>
              <DialogDescription className="text-xs text-slate-400 font-sans mt-1">
                Share your DSA, LLD, and system architecture breakthroughs.
              </DialogDescription>
            </div>
            <button
              onClick={() => setIsAddEditOpen(false)}
              className="p-1.5 rounded-lg bg-slate-900 hover:bg-slate-850 border border-slate-800 text-slate-450 hover:text-slate-200 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </DialogHeader>

          <form onSubmit={handleSaveBlog} className="flex flex-col">
            <div className="p-6 space-y-4 max-h-[60vh] overflow-y-auto">
              {errorMsg && (
                <div className="p-3 bg-red-500/10 border border-red-500/20 text-red-300 text-xs rounded-xl">
                  {errorMsg}
                </div>
              )}

              {/* Title input */}
              <div className="space-y-2">
                <Label htmlFor="blog-title" className="text-xs font-bold uppercase tracking-wider font-audiowide text-slate-450">Blog Title</Label>
                <Input
                  id="blog-title"
                  type="text"
                  placeholder="e.g. Master Pointer Arithmetic or Designing Google Drive"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="bg-slate-950 border-slate-850 focus:border-orange-500/50 text-slate-200 placeholder-slate-600 rounded-xl"
                  required
                />
              </div>

              {/* Tags selection */}
              <div className="space-y-2">
                <Label className="text-xs font-bold uppercase tracking-wider font-audiowide text-slate-450">Select Tags</Label>
                <div className="flex flex-wrap gap-2">
                  {PRESET_TAGS.map(tag => {
                    const isSelected = selectedTags.includes(tag);
                    return (
                      <button
                        key={tag}
                        type="button"
                        onClick={() => {
                          if (isSelected) {
                            setSelectedTags(selectedTags.filter(t => t !== tag));
                          } else {
                            setSelectedTags([...selectedTags, tag]);
                          }
                        }}
                        className={cn(
                          "px-3 py-1 rounded-xl text-[10px] font-bold font-mono tracking-wider border cursor-pointer transition-all",
                          isSelected
                            ? "bg-orange-600/20 border-orange-500/50 text-orange-400"
                            : "bg-slate-950 border-slate-850 text-slate-500 hover:text-slate-350 hover:border-slate-800"
                        )}
                      >
                        #{tag}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Editor Workspace with Custom Toolbar */}
              <div className="space-y-2">
                <div className="flex flex-wrap items-center justify-between border border-slate-850 bg-slate-950/70 p-1.5 rounded-xl gap-2">
                  <div className="flex bg-slate-900/60 p-0.5 rounded-lg border border-slate-850">
                    <button
                      type="button"
                      onClick={() => setEditorTab('edit')}
                      className={cn(
                        "px-3 py-1.5 text-[10px] font-bold font-orbitron rounded-md transition-all cursor-pointer flex items-center gap-1",
                        editorTab === 'edit'
                          ? "bg-slate-950 text-orange-400 border border-slate-850/50 shadow"
                          : "text-slate-500 hover:text-slate-300"
                      )}
                    >
                      <Edit className="w-3 h-3" />
                      Write Editor
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditorTab('preview')}
                      className={cn(
                        "px-3 py-1.5 text-[10px] font-bold font-orbitron rounded-md transition-all cursor-pointer flex items-center gap-1",
                        editorTab === 'preview'
                          ? "bg-slate-950 text-orange-400 border border-slate-850/50 shadow"
                          : "text-slate-500 hover:text-slate-300"
                      )}
                    >
                      <Eye className="w-3 h-3" />
                      Live Preview
                    </button>
                  </div>

                  {editorTab === 'edit' && (
                    <div className="flex items-center gap-1 border-l border-slate-850 pl-2">
                      <button type="button" onClick={() => injectMarkdown('h1')} className="p-1.5 rounded hover:bg-slate-900 hover:text-orange-400 text-slate-450" title="Heading 1"><Heading1 className="w-3.5 h-3.5" /></button>
                      <button type="button" onClick={() => injectMarkdown('h2')} className="p-1.5 rounded hover:bg-slate-900 hover:text-orange-400 text-slate-450" title="Heading 2"><Heading2 className="w-3.5 h-3.5" /></button>
                      <button type="button" onClick={() => injectMarkdown('bold')} className="p-1.5 rounded hover:bg-slate-900 hover:text-orange-400 text-slate-450" title="Bold"><Bold className="w-3.5 h-3.5" /></button>
                      <button type="button" onClick={() => injectMarkdown('code')} className="p-1.5 rounded hover:bg-slate-900 hover:text-orange-400 text-slate-450" title="Code Block"><Code className="w-3.5 h-3.5" /></button>
                      <button type="button" onClick={() => injectMarkdown('list')} className="p-1.5 rounded hover:bg-slate-900 hover:text-orange-400 text-slate-450" title="Bullet List"><List className="w-3.5 h-3.5" /></button>
                    </div>
                  )}
                </div>

                {editorTab === 'edit' ? (
                  <textarea
                    id="blog-editor-textarea"
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    placeholder="Write using Markdown syntax. Add titles (#), lists (-), bold (**text**), and code blocks (```cpp ... ```)."
                    rows={12}
                    className="w-full bg-slate-950/50 border border-slate-850 focus:border-orange-500/50 text-slate-200 placeholder-slate-650 rounded-xl p-4 font-mono text-xs focus:outline-none resize-y min-h-[220px]"
                    required
                  />
                ) : (
                  <div className="w-full bg-slate-950/30 border border-slate-850 rounded-xl p-5 min-h-[220px] overflow-y-auto max-h-[350px]">
                    {content.trim() ? renderFormattedContent(content) : <span className="text-slate-600 text-xs italic font-sans">Preview content is empty...</span>}
                  </div>
                )}
              </div>

              {/* Publish checkbox option */}
              <div className="flex items-center gap-3 p-3 bg-slate-900/10 border border-slate-900 rounded-xl">
                <input
                  id="publish-toggle"
                  type="checkbox"
                  checked={isShared}
                  onChange={(e) => setIsShared(e.target.checked)}
                  className="w-4 h-4 accent-orange-500 rounded bg-slate-950 border-slate-800"
                />
                <div className="flex flex-col text-left">
                  <Label htmlFor="publish-toggle" className="text-xs font-bold tracking-wider font-orbitron text-slate-250 cursor-pointer flex items-center gap-1">
                    <Globe className="w-3.5 h-3.5 text-orange-400" />
                    Publish to Community Feed
                  </Label>
                  <span className="text-[10px] text-slate-500">Checking this makes the post immediately visible to all platform users. Uncheck to save it as a private draft.</span>
                </div>
              </div>
            </div>

            <DialogFooter className="p-4 border-t border-slate-900 bg-slate-950/60 flex items-center justify-end gap-2.5">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsAddEditOpen(false)}
                className="border-slate-800 hover:border-slate-700 text-xs font-orbitron"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={saving}
                className="bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-slate-950 font-bold font-orbitron tracking-wider text-[11px] h-9 px-5 rounded-xl border-t border-orange-400/30 flex items-center gap-1.5 cursor-pointer"
              >
                {saving && <Loader2 className="w-3.5 h-3.5 animate-spin text-slate-950" />}
                {editingBlog ? 'SAVE CHANGES' : 'CREATE BLOG'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
