import React, { useState, useRef } from 'react';
import { X, Folder, Award, Cpu, Trophy, Upload, FileText, ArrowLeft } from 'lucide-react';

interface AddInstanceModalProps {
  isOpen: boolean;
  onClose: () => void;
  formalMode: boolean;
}

export const AddInstanceModal: React.FC<AddInstanceModalProps> = ({ isOpen, onClose, formalMode }) => {
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

  // File drag & drop states
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

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
    setSelectedFile(null);
    setIsDragOver(false);
    setIsFolderNameCustom(false);
  };

  const handleClose = () => {
    handleReset();
    onClose();
  };

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
      await processFile(files[0]);
    }
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      await processFile(files[0]);
    }
  };

  const handleTitleChange = (val: string) => {
    setTitle(val);
    if (!isFolderNameCustom) {
      const generated = val.toLowerCase().replace(/[^a-z0-9_\-]/g, '-').replace(/-+/g, '-').replace(/^[-_]+|[-_]+$/g, '');
      setFolderName(generated);
    }
  };

  const processFile = async (file: File) => {
    const extension = file.name.split('.').pop()?.toLowerCase();
    
    if (extension === 'md') {
      const text = await file.text();
      parseMD(text);
      const baseName = file.name.replace(/\.md$/, '').toLowerCase().replace(/[^a-z0-9_\-]/g, '-');
      setFolderName(baseName);
      setIsFolderNameCustom(true);
    } else if (['png', 'jpg', 'jpeg', 'pdf'].includes(extension || '')) {
      setSelectedFile(file);
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
    let frontmatter = `---\ntitle: ${title.trim()}\ndatestart: ${dateStart.trim()}\n`;
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
    if (selectedFile) {
      formData.append('file', selectedFile);
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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fadeIn">
      <div className="bg-[#12161b] border-2 border-slate-800 rounded-xl max-w-2xl w-full flex flex-col shadow-2xl overflow-hidden scale-in">
        
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
                  <Folder className="text-blue-500 group-hover:scale-110 transition-transform mb-3" size={32} />
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
                  <Award className="text-fuchsia-500 group-hover:scale-110 transition-transform mb-3" size={32} />
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
                  <Cpu className="text-slate-400 group-hover:scale-110 transition-transform mb-3" size={32} />
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
                  <Trophy className="text-gold group-hover:scale-110 transition-transform mb-3" size={32} />
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
                <button
                  onClick={() => setStep(1)}
                  className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-slate-200 transition-colors"
                  title="Back to category selection"
                >
                  <ArrowLeft size={16} />
                </button>
                <div>
                  <h2 className="text-sm font-black text-slate-100 uppercase tracking-widest font-dota flex items-center gap-1.5">
                    <span>Create {category === 'proj' ? 'Project' : category === 'cert' ? 'Certification' : category === 'item' ? 'Item' : 'Achievement'}</span>
                  </h2>
                  <div className="flex items-center gap-1 mt-0.5">
                    <span className="text-[9px] text-slate-500 uppercase tracking-wider font-bold">Target Dir:</span>
                    <select
                      value={category}
                      onChange={(e) => setCategory(e.target.value as 'proj' | 'cert' | 'item' | 'achv')}
                      className="px-1 py-0.5 bg-slate-900 border border-slate-800 rounded text-[9px] text-cyan-400 focus:outline-none focus:border-cyan-500/50 font-mono font-bold cursor-pointer"
                    >
                      <option value="proj">data/proj/</option>
                      <option value="cert">data/cert/</option>
                      <option value="item">data/item/</option>
                      <option value="achv">data/achv/</option>
                    </select>
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

            {/* Editor Scrollable Body */}
            <div className="flex-1 overflow-y-auto p-5 flex flex-col gap-4 max-h-[65vh]">
              
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
                />
                <Upload className="text-slate-400 mb-1 animate-bounce" style={{ animationDuration: '3s' }} size={20} />
                <span className="text-[10px] text-slate-300 font-bold uppercase tracking-wider">
                  Drag & Drop files here, or click to browse
                </span>
                <span className="text-[9px] text-slate-500 mt-0.5">
                  Accepts <code className="text-slate-400">.md</code> (to load text/frontmatter) or <code className="text-slate-400">.png, .jpg, .pdf</code> (as attachments)
                </span>
                {selectedFile && (
                  <div className="mt-2 flex items-center gap-1.5 px-2 py-1 bg-cyan-950/50 border border-cyan-800/30 rounded text-[9px] text-cyan-400 font-mono">
                    <FileText size={12} />
                    <span>Uploaded: {selectedFile.name} ({(selectedFile.size / 1024).toFixed(1)} KB)</span>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedFile(null);
                      }}
                      className="text-red-500 hover:text-red-400 font-bold ml-1"
                    >
                      Remove
                    </button>
                  </div>
                )}
              </div>

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
            <div className="p-4 border-t border-slate-800 flex justify-end gap-2 bg-[#15191e] shrink-0">
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
          </>
        )}

      </div>
    </div>
  );
};

export default AddInstanceModal;
