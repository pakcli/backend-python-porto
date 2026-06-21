import React, { useState, useRef, useEffect } from 'react';
import { X, Folder, Award, Cpu, Trophy, Upload, FileText, ArrowLeft, ArrowRight, ChevronLeft, ChevronRight } from 'lucide-react';
import { PortfolioEntry } from '../types';
import PdfThumbnail from './PdfThumbnail';

interface AddInstanceModalProps {
  isOpen: boolean;
  onClose: () => void;
  formalMode: boolean;
  editEntry?: PortfolioEntry | null;
  entries: PortfolioEntry[];
  isInline?: boolean;
  history?: string[];
  historyIndex?: number;
  onHistoryBack?: () => void;
  onHistoryForward?: () => void;
  filteredEntries?: PortfolioEntry[];
  onNavigateToEntry?: (entry: PortfolioEntry) => void;
}

export const AddInstanceModal: React.FC<AddInstanceModalProps> = ({
  isOpen,
  onClose,
  formalMode,
  editEntry,
  entries,
  isInline = false,
  history,
  historyIndex,
  onHistoryBack,
  onHistoryForward,
  filteredEntries,
  onNavigateToEntry
}) => {
  const [step, setStep] = useState<1 | 2>(1);
  const [category, setCategory] = useState<'proj' | 'cert' | 'item' | 'achv'>('proj');

  // Form states
  const [folderName, setFolderName] = useState('');
  const [title, setTitle] = useState('');
  const [dateStart, setDateStart] = useState('');
  const [dateEnd, setDateEnd] = useState('');
  const [skill, setSkill] = useState('');
  const [github, setGithub] = useState('');
  const [linkedin, setLinkedin] = useState('');
  const [bodyText, setBodyText] = useState('');
  const [isFolderNameCustom, setIsFolderNameCustom] = useState(false);
  const [done, setDone] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [dependencies, setDependencies] = useState<string[]>([]);
  const [depQuery, setDepQuery] = useState('');

  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [existingFiles, setExistingFiles] = useState<string[]>([]);
  const [deletedFiles, setDeletedFiles] = useState<string[]>([]);
  const [thumbnailFilename, setThumbnailFilename] = useState<string>('');
  const [previewBlobUrl, setPreviewBlobUrl] = useState<string | null>(null);

  // File drag & drop states
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleReset = () => {
    setStep(1);
    setCategory('proj');
    setFolderName('');
    setTitle('');
    setDateStart('');
    setDateEnd('');
    setSkill('');
    setGithub('');
    setLinkedin('');
    setBodyText('');
    setDone(false);
    setSelectedFiles([]);
    setExistingFiles([]);
    setDeletedFiles([]);
    setThumbnailFilename('');
    setPreviewBlobUrl(null);
    setIsDragOver(false);
    setIsFolderNameCustom(false);
    setShowDeleteConfirm(false);
    setDependencies([]);
    setDepQuery('');
  };

  const handleClose = () => {
    handleReset();
    onClose();
  };

  const isEditMode = !!editEntry;

  useEffect(() => {
    if (isOpen && editEntry) {
      setStep(2); // Skip category selection, go directly to form
      setCategory(editEntry.source);
      
      // Get folderName from folderPath (last portion of path)
      const parts = editEntry.folderPath.replace(/\\/g, '/').split('/');
      const name = parts[parts.length - 1] || '';
      setFolderName(name);
      
      setTitle(editEntry.title || '');
      setDateStart(editEntry.datestart || '');
      setDateEnd(editEntry.dateend || '');
      setSkill(editEntry.skill || '');
      setGithub(editEntry.github || '');
      setLinkedin(editEntry.linkedin || '');
      setBodyText(editEntry.body || '');
      setDone(!!editEntry.done);
      setDependencies(editEntry.dependencies || []);
      setDepQuery('');
      
      setIsFolderNameCustom(true);
      
      // Populate attachments
      const attachments = editEntry.attachments || [];
      setExistingFiles(attachments);
      setDeletedFiles([]);
      
      // Extract thumbnail if present (from imgPath filename component)
      if (editEntry.imgPath) {
        const imgParts = editEntry.imgPath.split('/');
        const thumbName = imgParts[imgParts.length - 1] || '';
        setThumbnailFilename(thumbName);
      } else {
        setThumbnailFilename('');
      }
    } else if (isOpen && !editEntry) {
      handleReset();
    }
  }, [isOpen, editEntry]);

  useEffect(() => {
    if (!thumbnailFilename) {
      setPreviewBlobUrl(null);
      return;
    }

    const newFile = selectedFiles.find(f => f.name === thumbnailFilename);
    if (newFile) {
      if (newFile.type.startsWith('image/') || newFile.type === 'application/pdf' || /\.pdf$/i.test(newFile.name)) {
        const url = URL.createObjectURL(newFile);
        setPreviewBlobUrl(url);
        return () => {
          URL.revokeObjectURL(url);
        };
      }
      setPreviewBlobUrl(null);
      return;
    }

    if (editEntry && existingFiles.includes(thumbnailFilename)) {
      const isImage = /\.(png|jpg|jpeg|gif|webp)$/i.test(thumbnailFilename);
      const isPdf = /\.pdf$/i.test(thumbnailFilename);
      if (isImage || isPdf) {
        const parts = editEntry.folderPath.replace(/\\/g, '/').split('/');
        const origFolder = parts[parts.length - 1] || '';
        const cat = editEntry.source;
        setPreviewBlobUrl(`/api/media/${cat}/${origFolder}/${thumbnailFilename}`);
        return;
      }
    }

    setPreviewBlobUrl(null);
  }, [thumbnailFilename, selectedFiles, existingFiles, editEntry]);

  const handleSelectCategory = (cat: 'proj' | 'cert' | 'item' | 'achv') => {
    setCategory(cat);
    setStep(2);
  };

  // YAML Frontmatter + Markdown parser
  const parseMD = (text: string) => {
    const frontmatterRegex = /^---\r?\n([\s\S]*?)\r?\n---\r?\n([\s\S]*)$/;
    const match = text.match(frontmatterRegex);
    let metadata: Record<string, string> = {};
    let body = text;

    if (match) {
      const yamlString = match[1];
      body = match[2].trim();
      const lines = yamlString.split('\n');
      lines.forEach(line => {
        const idx = line.indexOf(':');
        if (idx !== -1) {
          const key = line.slice(0, idx).trim().toLowerCase();
          const value = line.slice(idx + 1).trim().replace(/^['"]|['"]$/g, '');
          metadata[key] = value;
        }
      });
    }

    // Populate states
    if (metadata.title) setTitle(metadata.title);
    if (metadata.datestart) setDateStart(metadata.datestart);
    if (metadata.dateend) setDateEnd(metadata.dateend);
    if (metadata.skill) setSkill(metadata.skill);
    if (metadata.github) setGithub(metadata.github);
    if (metadata.linkedin) setLinkedin(metadata.linkedin);
    if (metadata.done) setDone(metadata.done.toLowerCase() === 'true');
    if (metadata.dependencies) {
      const depStr = metadata.dependencies.replace(/[\[\]'"]/g, '');
      const list = depStr.split(',').map(d => d.trim()).filter(Boolean);
      setDependencies(list);
    } else {
      setDependencies([]);
    }
    setBodyText(body);
  };

  // File drag & drop handlers
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = () => {
    setIsDragOver(false);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      for (let i = 0; i < files.length; i++) {
        await processFile(files[i]);
      }
    }
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      for (let i = 0; i < files.length; i++) {
        await processFile(files[i]);
      }
    }
  };

  const handleTitleChange = (val: string) => {
    setTitle(val);
    if (!isEditMode && !isFolderNameCustom) {
      const generated = val.toLowerCase().replace(/[^a-z0-9_\-]/g, '-').replace(/-+/g, '-').replace(/^[-_]+|[-_]+$/g, '');
      setFolderName(generated);
    }
  };

  const processFile = async (file: File) => {
    const extension = file.name.split('.').pop()?.toLowerCase();
    
    if (extension === 'md') {
      const text = await file.text();
      parseMD(text);
      if (!isEditMode) {
        const baseName = file.name.replace(/\.md$/, '').toLowerCase().replace(/[^a-z0-9_\-]/g, '-');
        setFolderName(baseName);
        setIsFolderNameCustom(true);
      }
    } else if (['png', 'jpg', 'jpeg', 'pdf'].includes(extension || '')) {
      setSelectedFiles(prev => {
        if (prev.some(f => f.name === file.name)) return prev;
        return [...prev, file];
      });
      // Auto-set the first image or PDF as thumbnail if none chosen
      if (!thumbnailFilename && ['png', 'jpg', 'jpeg', 'pdf'].includes(extension || '')) {
        setThumbnailFilename(file.name);
      }
      // Auto-populate title from attachment name if title is empty
      if (!title.trim()) {
        const lastDot = file.name.lastIndexOf('.');
        const baseName = lastDot !== -1 ? file.name.substring(0, lastDot) : file.name;
        const cleanTitle = baseName.replace(/[-_]/g, ' ');
        handleTitleChange(cleanTitle);
      }
    } else {
      alert('Only .png, .jpg, .jpeg, .pdf, or .md files are supported!');
    }
  };

  const handleSave = async () => {
    if (!folderName.trim()) {
      alert('Directory Folder Name is required!');
      return;
    }
    if (!title.trim()) {
      alert('Title is required!');
      return;
    }
    if (!dateStart.trim()) {
      alert('Date Start is required!');
      return;
    }

    // Format frontmatter and body
    let frontmatter = `---\ntitle: ${title.trim()}\ndatestart: ${dateStart.trim()}\ndone: ${done}\n`;
    if (dependencies.length > 0) {
      frontmatter += `dependencies: [${dependencies.join(', ')}]\n`;
    }
    if (dateEnd.trim()) {
      frontmatter += `dateend: ${dateEnd.trim()}\n`;
    }
    if (skill.trim()) {
      frontmatter += `skill: ${skill.trim().toLowerCase()}\n`;
    }
    if (github.trim()) {
      frontmatter += `github: ${github.trim()}\n`;
    }
    if (linkedin.trim()) {
      frontmatter += `linkedin: ${linkedin.trim()}\n`;
    }
    frontmatter += `---\n\n${bodyText.trim()}`;

    const formData = new FormData();
    formData.append('category', category);
    formData.append('folderName', folderName.trim());
    formData.append('content', frontmatter);
    
    // Add all uploaded files
    selectedFiles.forEach(file => {
      formData.append('files', file);
    });

    // Add list of files to delete
    deletedFiles.forEach(df => {
      formData.append('deleteFiles', df);
    });

    // Add main thumbnail choice
    if (thumbnailFilename) {
      formData.append('thumbnailFilename', thumbnailFilename);
    }

    if (isEditMode && editEntry) {
      const parts = editEntry.folderPath.replace(/\\/g, '/').split('/');
      const origFolder = parts[parts.length - 1] || '';
      formData.append('originalCategory', editEntry.source);
      formData.append('originalFolderName', origFolder);
    }

    try {
      const res = await fetch('/api/entries/create', {
        method: 'POST',
        body: formData,
      });
      const result = await res.json();
      if (res.ok && result.success) {
        handleClose();
      } else {
        alert(`Error: ${result.error || 'Failed to save instance'}`);
      }
    } catch (err) {
      alert(`Network error: ${err}`);
    }
  };

  const handleDelete = () => {
    if (!isEditMode || !editEntry) return;
    setShowDeleteConfirm(true);
  };

  const executeDelete = async () => {
    if (!isEditMode || !editEntry) return;

    // Get folderName from folderPath (last portion of path)
    const parts = editEntry.folderPath.replace(/\\/g, '/').split('/');
    const folder = parts[parts.length - 1] || '';

    const formData = new FormData();
    formData.append('category', category);
    formData.append('folderName', folder);

    try {
      const res = await fetch('/api/entries/delete', {
        method: 'POST',
        body: formData,
      });
      const result = await res.json();
      if (res.ok && result.success) {
        handleClose();
      } else {
        alert(`Error: ${result.error || 'Failed to delete instance'}`);
      }
    } catch (err) {
      alert(`Network error: ${err}`);
    }
  };


  if (!isOpen) return null;

  const content = (
    <div className={`bg-[#12161b] border border-slate-800 rounded-xl w-full flex flex-col shadow-2xl overflow-hidden min-h-0 ${
      isInline ? 'h-full max-h-full' : 'flex-1'
    }`}>
        
        {/* Step 1: Category Selector */}
        {step === 1 && (
          <>
            <div className="p-5 border-b border-slate-800 flex justify-between items-center bg-[#15191e]">
              <h2 className="text-base font-black text-slate-100 uppercase tracking-widest font-dota">
                Add New Instance
              </h2>
              <button
                onClick={handleClose}
                className="p-1 rounded-lg hover:bg-slate-800 text-slate-500 hover:text-slate-200 transition-colors"
              >
                <X size={20} />
              </button>
            </div>
            
            <div className="p-6 flex flex-col gap-5">
              <p className="text-xs text-slate-400 font-semibold tracking-wide text-center">
                Select the category of the new portfolio instance to create:
              </p>
              
              <div className="grid grid-cols-2 gap-4">
                {/* Project */}
                <div
                  onClick={() => handleSelectCategory('proj')}
                  className="p-5 rounded-lg border border-slate-800/80 bg-[#15191e] hover:border-blue-500/50 hover:bg-[#1a1f26] shadow-sm hover:shadow-[0_0_15px_rgba(59,130,246,0.15)] flex flex-col items-center justify-center text-center cursor-pointer transition-all group"
                >
                  <Folder className="text-blue-500 mb-3" size={32} />
                  <span className="text-xs font-black text-slate-200 uppercase tracking-wider group-hover:text-blue-400 transition-colors">
                    Project
                  </span>
                  <span className="text-[10px] text-slate-500 mt-1 font-medium">
                    Code repository or web app
                  </span>
                </div>

                {/* Certification */}
                <div
                  onClick={() => handleSelectCategory('cert')}
                  className="p-5 rounded-lg border border-slate-800/80 bg-[#15191e] hover:border-fuchsia-500/50 hover:bg-[#1a1f26] shadow-sm hover:shadow-[0_0_15px_rgba(217,70,239,0.15)] flex flex-col items-center justify-center text-center cursor-pointer transition-all group"
                >
                  <Award className="text-fuchsia-500 mb-3" size={32} />
                  <span className="text-xs font-black text-slate-200 uppercase tracking-wider group-hover:text-fuchsia-400 transition-colors">
                    Certification
                  </span>
                  <span className="text-[10px] text-slate-500 mt-1 font-medium">
                    Course license or certificate
                  </span>
                </div>

                {/* Item */}
                <div
                  onClick={() => handleSelectCategory('item')}
                  className="p-5 rounded-lg border border-slate-800/80 bg-[#15191e] hover:border-slate-500/50 hover:bg-[#1a1f26] shadow-sm hover:shadow-[0_0_15px_rgba(148,163,184,0.15)] flex flex-col items-center justify-center text-center cursor-pointer transition-all group"
                >
                  <Cpu className="text-slate-400 mb-3" size={32} />
                  <span className="text-xs font-black text-slate-200 uppercase tracking-wider group-hover:text-slate-350 transition-colors">
                    Item / Hardware
                  </span>
                  <span className="text-[10px] text-slate-500 mt-1 font-medium">
                    Physical node or component
                  </span>
                </div>

                {/* Achievement */}
                <div
                  onClick={() => handleSelectCategory('achv')}
                  className="p-5 rounded-lg border border-slate-800/80 bg-[#15191e] hover:border-amber-450/50 hover:bg-[#1a1f26] shadow-sm hover:shadow-[0_0_15px_rgba(245,158,11,0.15)] flex flex-col items-center justify-center text-center cursor-pointer transition-all group"
                >
                  <Trophy className="text-gold mb-3" size={32} />
                  <span className="text-xs font-black text-slate-200 uppercase tracking-wider group-hover:text-amber-400 transition-colors">
                    Achievement
                  </span>
                  <span className="text-[10px] text-slate-500 mt-1 font-medium">
                    Awards, hacks, and trophies
                  </span>
                </div>
              </div>
            </div>
            
            <div className="p-4 border-t border-slate-800 flex justify-end bg-[#15191e]">
              <button
                onClick={handleClose}
                className="px-4 py-2 bg-slate-900 hover:bg-slate-800 border border-slate-800 rounded-lg text-xs font-bold transition-colors text-slate-400"
              >
                Close
              </button>
            </div>
          </>
        )}

        {/* Step 2: Instance Editor */}
        {step === 2 && (
          <>
            <div className="p-4 border-b border-slate-800 flex justify-between items-center bg-[#15191e] shrink-0">
              <div className="flex items-center gap-2">
                {!isEditMode && (
                  <button
                    onClick={() => setStep(1)}
                    className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-slate-200 transition-colors"
                    title="Back to category selection"
                  >
                    <ArrowLeft size={16} />
                  </button>
                )}
                <div>
                  <h2 className="text-sm font-black text-slate-100 uppercase tracking-widest font-dota flex items-center gap-1.5">
                    <span>{isEditMode ? 'Edit' : 'Create'} {category === 'proj' ? 'Project' : category === 'cert' ? 'Certification' : category === 'item' ? 'Item' : 'Achievement'}</span>
                  </h2>
                  <div className="flex items-center gap-1 mt-0.5">
                    <span className="text-[9px] text-slate-500 uppercase tracking-wider font-bold">Target Dir:</span>
                    <span className="text-[10px] text-cyan-400 font-mono font-bold flex items-center gap-1 bg-slate-950/40 rounded border border-slate-800/40 px-1.5 py-0.5">
                      <span>data/</span>
                      <select
                        value={category}
                        onChange={(e) => setCategory(e.target.value as 'proj' | 'cert' | 'item' | 'achv')}
                        className="px-1.5 py-0.5 bg-slate-900 border border-slate-800 rounded text-[9px] text-cyan-400 focus:outline-none focus:border-cyan-500/50 font-mono font-bold cursor-pointer"
                      >
                        <option value="proj">proj</option>
                        <option value="cert">cert</option>
                        <option value="item">item</option>
                        <option value="achv">achv</option>
                      </select>
                      <span>/</span>
                      <input
                        type="text"
                        value={folderName}
                        onChange={(e) => {
                          const val = e.target.value.toLowerCase().replace(/[^a-z0-9_\-]/g, '-').replace(/-+/g, '-');
                          setFolderName(val);
                          setIsFolderNameCustom(true);
                        }}
                        placeholder="folder-name"
                        className="px-1.5 py-0.5 bg-slate-900 border border-slate-800 rounded text-[9px] text-cyan-400 focus:outline-none focus:border-cyan-500/50 font-mono font-bold max-w-[150px]"
                      />
                    </span>
                  </div>
                </div>
              </div>
              
              <button
                onClick={handleClose}
                className="p-1 rounded-lg hover:bg-slate-800 text-slate-500 hover:text-slate-200 transition-colors"
                title="Close modal"
              >
                <X size={20} />
              </button>
            </div>

            {/* Nav Bar with Explorer Back/Forward and Page Prev/Next (in edit mode) */}
            {isEditMode && history && filteredEntries && onNavigateToEntry && editEntry && (() => {
              const currentIdx = filteredEntries.findIndex(e => e.id === editEntry.id);
              const hasPrev = currentIdx > 0;
              const hasNext = currentIdx < filteredEntries.length - 1;

              return (
                <div className="px-4 py-2 border-b border-slate-800/60 bg-[#13171c] flex items-center justify-between gap-2 shrink-0 select-none">
                  {/* Left: File Explorer Back/Forward History */}
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      disabled={historyIndex === undefined || historyIndex <= 0}
                      onClick={onHistoryBack}
                      className={`p-1.5 rounded transition-all duration-200 border border-transparent ${
                        historyIndex !== undefined && historyIndex > 0
                          ? 'text-slate-350 hover:text-emerald-450 hover:bg-slate-800 hover:border-slate-700'
                          : 'text-slate-700 cursor-not-allowed'
                      }`}
                      title="Go Back (History)"
                    >
                      <ArrowLeft size={14} />
                    </button>
                    <button
                      type="button"
                      disabled={historyIndex === undefined || history === undefined || historyIndex >= history.length - 1}
                      onClick={onHistoryForward}
                      className={`p-1.5 rounded transition-all duration-200 border border-transparent ${
                        historyIndex !== undefined && history !== undefined && historyIndex < history.length - 1
                          ? 'text-slate-350 hover:text-emerald-450 hover:bg-slate-800 hover:border-slate-700'
                          : 'text-slate-700 cursor-not-allowed'
                      }`}
                      title="Go Forward (History)"
                    >
                      <ArrowRight size={14} />
                    </button>
                  </div>

                  {/* Right: Sequential Timeline Page Prev/Next */}
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      disabled={!hasPrev}
                      onClick={() => { if (hasPrev) onNavigateToEntry(filteredEntries[currentIdx - 1]); }}
                      className={`flex items-center gap-1 px-3 py-1.5 rounded text-[11px] font-bold transition-colors ${hasPrev ? 'text-slate-300 hover:bg-slate-800 hover:text-white' : 'text-slate-700 cursor-not-allowed'}`}
                      title="Previous Item in Timeline"
                    >
                      <ChevronLeft size={14} />
                      Prev
                    </button>
                    <span className="text-[10px] text-slate-500 font-semibold tabular-nums select-none bg-slate-950 px-2 py-0.5 rounded border border-slate-900">
                      {currentIdx >= 0 ? `${currentIdx + 1} / ${filteredEntries.length}` : '- / -'}
                    </span>
                    <button
                      type="button"
                      disabled={!hasNext}
                      onClick={() => { if (hasNext) onNavigateToEntry(filteredEntries[currentIdx + 1]); }}
                      className={`flex items-center gap-1 px-3 py-1.5 rounded text-[11px] font-bold transition-colors ${hasNext ? 'text-slate-300 hover:bg-slate-800 hover:text-white' : 'text-slate-700 cursor-not-allowed'}`}
                      title="Next Item in Timeline"
                    >
                      Next
                      <ChevronRight size={14} />
                    </button>
                  </div>
                </div>
              );
            })()}

            {/* Editor Scrollable Body */}
            <div className="flex-1 overflow-y-auto p-5 flex flex-col gap-4 min-h-0">
              
              {/* Drag and Drop Zone */}
              <div
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-lg p-4 flex flex-col items-center justify-center text-center cursor-pointer transition-all ${
                  isDragOver
                    ? 'border-cyan-500 bg-cyan-500/5'
                    : 'border-slate-800 bg-slate-950/20 hover:border-slate-700'
                }`}
              >
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileSelect}
                  className="hidden"
                  accept=".png,.jpg,.jpeg,.pdf,.md"
                  multiple
                />
                <Upload className="text-slate-400 mb-1 animate-bounce" style={{ animationDuration: '3s' }} size={20} />
                <span className="text-[10px] text-slate-300 font-bold uppercase tracking-wider">
                  Drag & Drop files here, or click to browse
                </span>
                <span className="text-[9px] text-slate-500 mt-0.5">
                  Accepts <code className="text-slate-400">.md</code> (to load text/frontmatter) or <code className="text-slate-400">.png, .jpg, .pdf</code> (as attachments)
                </span>
              </div>

              {/* Attachment List */}
              {((existingFiles.filter(f => !deletedFiles.includes(f)).length > 0) || selectedFiles.length > 0) && (
                <div className="flex flex-col gap-2 p-3 bg-[#111418] border border-slate-800 rounded-lg text-xs font-semibold select-none">
                  <span className="text-[10px] text-slate-500 uppercase tracking-wider">Attachments List</span>
                  <div className="flex flex-col gap-1.5 max-h-[150px] overflow-y-auto pr-1">
                    
                    {/* Existing Files */}
                    {existingFiles
                      .filter(f => !deletedFiles.includes(f))
                      .map(filename => {
                        const isMainable = /\.(png|jpg|jpeg|pdf)$/i.test(filename);
                        const isMain = filename === thumbnailFilename;
                        return (
                          <div key={`existing-${filename}`} className="flex items-center justify-between py-1 px-2 bg-slate-900 border border-slate-800/60 rounded font-sans">
                            <div className="flex items-center gap-2 truncate flex-1 min-w-0">
                              <FileText size={14} className="text-cyan-400 shrink-0" />
                              <span className="font-mono text-[11px] text-slate-300 truncate" title={filename}>
                                {filename}
                              </span>
                              {isMain && (
                                <span className="px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-450 border border-emerald-500/20 text-[9px] font-bold uppercase tracking-wider shrink-0">
                                  Thumbnail
                                </span>
                              )}
                            </div>
                            
                            <div className="flex items-center gap-3 shrink-0 ml-4">
                              {isMainable && !isMain && (
                                <button
                                  type="button"
                                  onClick={() => setThumbnailFilename(filename)}
                                  className="text-cyan-400 hover:text-cyan-300 text-[10px] uppercase font-bold hover:underline"
                                >
                                  Set Main
                                </button>
                              )}
                              <button
                                type="button"
                                onClick={() => {
                                  setDeletedFiles(prev => [...prev, filename]);
                                  if (isMain) setThumbnailFilename('');
                                }}
                                className="text-red-500 hover:text-red-400 text-[10px] uppercase font-bold hover:underline"
                              >
                                Delete
                              </button>
                            </div>
                          </div>
                        );
                      })}

                    {/* New Uploaded Files */}
                    {selectedFiles.map((file, idx) => {
                      const isMainable = /\.(png|jpg|jpeg|pdf)$/i.test(file.name);
                      const isMain = file.name === thumbnailFilename;
                      return (
                        <div key={`new-${file.name}-${idx}`} className="flex items-center justify-between py-1 px-2 bg-cyan-950/20 border border-cyan-900/30 rounded font-sans">
                          <div className="flex items-center gap-2 truncate flex-1 min-w-0 font-sans">
                            <FileText size={14} className="text-emerald-400 shrink-0 font-sans" />
                            <span className="font-mono text-[11px] text-slate-200 truncate" title={file.name}>
                              {file.name} <span className="text-slate-500 font-sans font-medium text-[9px]">({(file.size / 1024).toFixed(1)} KB)</span>
                            </span>
                            {isMain && (
                              <span className="px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[9px] font-bold uppercase tracking-wider shrink-0 font-sans">
                                Thumbnail
                              </span>
                            )}
                          </div>
                          
                          <div className="flex items-center gap-3 shrink-0 ml-4 font-sans">
                            {isMainable && !isMain && (
                              <button
                                type="button"
                                onClick={() => setThumbnailFilename(file.name)}
                                className="text-cyan-450 hover:text-cyan-350 text-[10px] uppercase font-bold hover:underline"
                              >
                                Set Main
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedFiles(prev => prev.filter(f => f.name !== file.name));
                                if (isMain) setThumbnailFilename('');
                              }}
                              className="text-red-500 hover:text-red-400 text-[10px] uppercase font-bold hover:underline"
                            >
                              Remove
                            </button>
                          </div>
                        </div>
                      );
                    })}

                  </div>
                </div>
              )}

              {/* Thumbnail Preview */}
              {previewBlobUrl && (
                <div className="flex flex-col gap-1 p-3 bg-slate-950/40 border border-slate-800 rounded-lg animate-fadeIn select-none">
                  <span className="text-[10px] text-slate-500 uppercase tracking-wider mb-2">Thumbnail Preview ({thumbnailFilename})</span>
                  <a
                    href={previewBlobUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full h-[300px] rounded-lg overflow-hidden border border-slate-800/80 bg-slate-900/50 flex items-center justify-center cursor-pointer hover:border-slate-700 transition-colors block"
                  >
                    {/\.pdf$/i.test(thumbnailFilename) ? (
                      <div className="w-full h-full pointer-events-none">
                        <PdfThumbnail src={previewBlobUrl} title={thumbnailFilename} />
                      </div>
                    ) : (
                      <img
                        src={previewBlobUrl}
                        alt="Thumbnail Preview"
                        className="w-full h-full object-contain"
                      />
                    )}
                  </a>
                </div>
              )}

              {/* Form Metadata Fields */}
              <div className="grid grid-cols-2 gap-3.5 text-xs font-semibold">
                
                {/* Title */}
                <div className="flex flex-col gap-1 col-span-2">
                  <label className="text-[10px] uppercase tracking-wider text-slate-500">Instance Title *</label>
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => handleTitleChange(e.target.value)}
                    placeholder="e.g. UFC Modesty Filter"
                    className="w-full px-3 py-1.5 bg-slate-900 border border-slate-800 focus:border-slate-700 text-slate-200 rounded-lg focus:outline-none"
                  />
                </div>

                {/* Date Start */}
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] uppercase tracking-wider text-slate-500">Date Start *</label>
                  <input
                    type="date"
                    value={dateStart}
                    onChange={(e) => setDateStart(e.target.value)}
                    className="w-full px-3 py-1.5 bg-slate-900 border border-slate-800 focus:border-slate-700 text-slate-200 rounded-lg focus:outline-none font-mono"
                  />
                </div>

                {/* Date End */}
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] uppercase tracking-wider text-slate-500">Date End</label>
                  <input
                    type="date"
                    value={dateEnd}
                    onChange={(e) => setDateEnd(e.target.value)}
                    className="w-full px-3 py-1.5 bg-slate-900 border border-slate-800 focus:border-slate-700 text-slate-200 rounded-lg focus:outline-none font-mono"
                  />
                </div>

                {/* Skill Orbs */}
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] uppercase tracking-wider text-slate-500">
                    Invoker Orbs ({formalMode ? 'Sistem/Program/Media' : 'Q/W/E'})
                  </label>
                  <input
                    type="text"
                    maxLength={3}
                    value={skill}
                    onChange={(e) => setSkill(e.target.value.toLowerCase().replace(/[^qwe]/g, ''))}
                    placeholder="e.g. qqw, qwe"
                    className="w-full px-3 py-1.5 bg-slate-900 border border-slate-800 focus:border-slate-700 text-slate-200 rounded-lg focus:outline-none font-mono uppercase"
                  />
                </div>

                {/* Github Link */}
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] uppercase tracking-wider text-slate-500">GitHub Link</label>
                  <input
                    type="url"
                    value={github}
                    onChange={(e) => setGithub(e.target.value)}
                    placeholder="https://github.com/..."
                    className="w-full px-3 py-1.5 bg-slate-900 border border-slate-800 focus:border-slate-700 text-slate-200 rounded-lg focus:outline-none"
                  />
                </div>

                {/* LinkedIn Link (Frontmatter field) */}
                <div className="flex flex-col gap-1 col-span-2">
                  <label className="text-[10px] uppercase tracking-wider text-slate-500">LinkedIn Link</label>
                  <input
                    type="url"
                    value={linkedin}
                    onChange={(e) => setLinkedin(e.target.value)}
                    placeholder="https://linkedin.com/in/..."
                    className="w-full px-3 py-1.5 bg-slate-900 border border-slate-800 focus:border-slate-700 text-slate-200 rounded-lg focus:outline-none"
                  />
                </div>

                {/* Dependencies Selection */}
                <div className="flex flex-col gap-1 col-span-2 relative">
                  <label className="text-[10px] uppercase tracking-wider text-slate-500">Dependencies (Required Instances)</label>
                  
                  {/* Selected Dependencies Badges */}
                  {dependencies.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mb-2 p-2 bg-slate-950/40 border border-slate-800 rounded-lg min-h-[38px] items-center">
                      {dependencies.map(depId => {
                        const depEntry = entries.find(e => e.id === depId);
                        const depTitle = depEntry ? depEntry.title : depId;
                        return (
                          <span key={depId} className="flex items-center gap-1 px-2.5 py-1 rounded bg-[#15191e] border border-slate-750 text-slate-350 text-[10px] font-bold uppercase tracking-wider">
                            <span>{depTitle}</span>
                            <button
                              type="button"
                              onClick={() => setDependencies(prev => prev.filter(d => d !== depId))}
                              className="text-red-500 hover:text-red-400 font-bold ml-1 text-xs select-none"
                            >
                              ×
                            </button>
                          </span>
                        );
                      })}
                    </div>
                  )}

                  {/* Suggestion Autocomplete Search Input */}
                  <div className="relative">
                    <input
                      type="text"
                      value={depQuery}
                      onChange={(e) => setDepQuery(e.target.value)}
                      placeholder="Type to search existing cards..."
                      className="w-full px-3 py-1.5 bg-slate-900 border border-slate-800 focus:border-slate-700 text-slate-200 rounded-lg focus:outline-none placeholder-slate-650 text-xs"
                    />
                    
                    {/* Suggestions list */}
                    {depQuery.trim() !== '' && (
                      <div className="absolute left-0 right-0 mt-1 max-h-[140px] overflow-y-auto bg-[#15191e] border border-slate-750 rounded-lg shadow-xl z-50 select-none">
                        {(() => {
                          const queryLower = depQuery.toLowerCase();
                          const currentId = editEntry ? editEntry.id : '';
                          const filtered = entries.filter(e => {
                            // 1. Exclude itself
                            if (e.id === currentId) return false;
                            // 2. Exclude already selected
                            if (dependencies.includes(e.id)) return false;
                            // 3. Match query
                            return e.title.toLowerCase().includes(queryLower) || e.id.toLowerCase().includes(queryLower);
                          });

                          if (filtered.length === 0) {
                            return (
                              <div className="p-2.5 text-xs text-slate-500 italic text-center">
                                No matching instances found
                              </div>
                            );
                          }

                          return filtered.map(e => (
                            <div
                              key={e.id}
                              onClick={() => {
                                setDependencies(prev => [...prev, e.id]);
                                setDepQuery('');
                              }}
                              className="p-2 text-xs text-slate-300 hover:text-white hover:bg-slate-800 cursor-pointer border-b border-slate-800 last:border-0 flex justify-between items-center"
                            >
                              <span>{e.title}</span>
                              <span className="text-[8px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 border border-slate-700 uppercase tracking-wider">
                                {e.source}
                              </span>
                            </div>
                          ));
                        })()}
                      </div>
                    )}
                  </div>
                </div>

                {/* Done Checkbox */}
                <div className="flex items-center gap-2 py-1 col-span-2">
                  <label className="flex items-center gap-2.5 text-xs font-semibold cursor-pointer text-slate-400 hover:text-slate-200 select-none">
                    <input
                      type="checkbox"
                      checked={done}
                      onChange={(e) => setDone(e.target.checked)}
                      className="w-4 h-4 rounded border-slate-750 text-emerald-500 focus:ring-emerald-500/20 bg-slate-950 cursor-pointer"
                    />
                    <span className="text-[10px] uppercase tracking-wider text-slate-400 font-extrabold select-none">
                      Done / Completed Instance
                    </span>
                  </label>
                </div>
              </div>

              {/* MD Content Textarea */}
              <div className="flex flex-col gap-1 flex-1 min-h-[160px]">
                <label className="text-[10px] uppercase tracking-wider text-slate-500">Markdown Content Body</label>
                <textarea
                  value={bodyText}
                  onChange={(e) => setBodyText(e.target.value)}
                  placeholder="## Key Accomplishments&#10;- Implement web application features...&#10;- Add dynamic animations..."
                  className="w-full flex-1 p-3 bg-slate-950 border border-slate-800 focus:border-slate-750 text-slate-200 rounded-lg focus:outline-none font-mono text-[11px] leading-relaxed resize-none min-h-[160px]"
                />
              </div>

            </div>

            {/* Footer Buttons */}
            <div className="p-4 border-t border-slate-800 flex justify-between items-center bg-[#15191e] shrink-0">
              <div>
                {isEditMode && (
                  <button
                    onClick={handleDelete}
                    className="px-4 py-2 bg-red-600 hover:bg-red-500 text-white rounded-lg text-xs font-bold transition-colors shadow-sm flex items-center gap-1.5"
                  >
                    Delete Instance
                  </button>
                )}
              </div>
              <div className="flex gap-2">
                <button
                  onClick={handleClose}
                  className="px-4 py-2 bg-slate-900 hover:bg-slate-800 border border-slate-800 rounded-lg text-xs font-bold transition-colors text-slate-400"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSave}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold transition-colors shadow-sm"
                >
                  Save Instance
                </button>
              </div>
            </div>
          </>
        )}
    </div>
  );

  return (
    <>
      {isInline ? (
        content
      ) : (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm">
          <div className="max-w-2xl w-full max-h-[90vh] flex flex-col min-h-0">
            {content}
          </div>
        </div>
      )}

      {showDeleteConfirm && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm">
          <div className="bg-[#12161b] border-2 border-slate-800 rounded-xl max-w-sm w-full p-6 shadow-2xl flex flex-col gap-4 text-center">
            <div className="text-xl">⚠️</div>
            <p className="text-sm font-semibold text-slate-200 font-sans leading-relaxed">
              Are you sure you want to permanently delete this instance ("{title}")? This will delete the entire directory and all attachments.
            </p>
            <div className="flex gap-3 justify-center mt-2">
              <button
                onClick={() => {
                  setShowDeleteConfirm(false);
                }}
                className="px-5 py-2 bg-slate-900 hover:bg-slate-800 border border-slate-800 rounded-lg text-xs font-bold transition-colors text-slate-400 font-sans"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  setShowDeleteConfirm(false);
                  executeDelete();
                }}
                className="px-5 py-2 bg-red-650 hover:bg-red-600 text-white rounded-lg text-xs font-bold transition-colors shadow-sm font-sans"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default AddInstanceModal;
