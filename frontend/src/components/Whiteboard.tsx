import { useEffect, useRef, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import {
  LogOut, Trash2, Grid, MessageSquare, MousePointer2, PenTool, Highlighter, Triangle, Circle as CircleIcon, Square, Brush, Type, Eraser, Undo2, Redo2, MicOff, PhoneOff, Mic, Send, Copy, Upload, Download, Bell
} from 'lucide-react';
import { fabric } from 'fabric';

interface WhiteboardProps {
  roomId: string;
  username: string;
  onLeave: () => void;
}

interface ChatMessage {
  user: string;
  text: string;
  time: string;
  isMe: boolean;
}

export default function Whiteboard({ roomId, username, onLeave }: WhiteboardProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasElRef = useRef<HTMLCanvasElement>(null);
  const fabricRef = useRef<fabric.Canvas | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const isSyncingRef = useRef(false);
  const [socket, setSocket] = useState<Socket | null>(null);
  
  // UI States
  const [color, setColor] = useState('#4338ca');
  const [lineWidth, setLineWidth] = useState(5);
  const [activeTool, setActiveTool] = useState('select');
  const [shapeMode, setShapeMode] = useState<'rect' | 'circle' | 'triangle'>('rect');
  
  const [userCount, setUserCount] = useState(1);
  const [isChatOpen, setIsChatOpen] = useState(true);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  
  // Voice Chat State
  const [isInVoice, setIsInVoice] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState<{ [id: string]: { username: string, speaking: boolean } }>({});
  const localStreamRef = useRef<MediaStream | null>(null);

  // Custom Alert Modal
  const [alertMsg, setAlertMsg] = useState('');

  const backendUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3001';
  const generateId = () => Math.random().toString(36).substring(2, 9);

  const showAlert = (msg: string) => {
    setAlertMsg(msg);
    setTimeout(() => setAlertMsg(''), 4000);
  };

  // ========== 1. Init Sockets & Fabric Canvas ==========
  useEffect(() => {
    if (!canvasElRef.current || !containerRef.current) return;

    // Initialize Fabric Canvas
    const initCanvas = new fabric.Canvas(canvasElRef.current, {
      width: containerRef.current.clientWidth,
      height: containerRef.current.clientHeight,
      selection: true,
      preserveObjectStacking: true,
      backgroundColor: 'transparent' // We have our grid div underneath
    });

    fabricRef.current = initCanvas;

    // Trackpad Zooming and Panning
    initCanvas.on('mouse:wheel', (opt) => {
      const e = opt.e as WheelEvent;
      if (e.ctrlKey || e.metaKey) {
        // Zoom
        e.preventDefault();
        let zoom = initCanvas.getZoom();
        zoom *= 0.999 ** e.deltaY;
        if (zoom > 20) zoom = 20;
        if (zoom < 0.05) zoom = 0.05;
        initCanvas.zoomToPoint({ x: e.offsetX, y: e.offsetY }, zoom);
      } else {
        // Pan
        e.preventDefault();
        const vpt = initCanvas.viewportTransform;
        if(vpt) {
          vpt[4] -= e.deltaX;
          vpt[5] -= e.deltaY;
          initCanvas.requestRenderAll();
        }
      }
    });

    const newSocket = io(backendUrl);
    setSocket(newSocket);

    newSocket.on('connect', () => {
      newSocket.emit('join-room', { roomId, username });
    });

    // Sync load logic
    newSocket.on('load-state', (state: { objects: any[], chats: ChatMessage[], users: any }) => {
      setUserCount(Object.keys(state.users).length);
      setMessages(state.chats.map((c) => ({ ...c, isMe: c.user === username })) || []);
      
      if (state.objects && state.objects.length > 0) {
        isSyncingRef.current = true;
        fabric.util.enlivensObjects(state.objects, (enlivenedObjects: fabric.Object[]) => {
          enlivenedObjects.forEach(obj => initCanvas.add(obj));
          initCanvas.renderAll();
          isSyncingRef.current = false;
        }, '');
      }
    });

    newSocket.on('user-joined', ({ username: uName }) => {
      setUserCount((c) => c + 1);
      setMessages((prev) => [...prev, { user: 'SYSTEM', text: `${uName} JOINED THE SESSION`, time: '', isMe: false }]);
    });
    
    newSocket.on('user-left', () => setUserCount((c) => Math.max(1, c - 1)));

    newSocket.on('object-add', (objData: any) => {
      isSyncingRef.current = true;
      fabric.util.enlivensObjects([objData], (enlivened: fabric.Object[]) => {
        enlivened.forEach(obj => initCanvas.add(obj));
        initCanvas.renderAll();
        isSyncingRef.current = false;
      }, '');
    });

    newSocket.on('object-modify', (objData: any) => {
      isSyncingRef.current = true;
      const existing = initCanvas.getObjects().find((o: any) => o.id === objData.id);
      if (existing) {
        existing.set(objData);
        existing.setCoords();
        initCanvas.renderAll();
      }
      isSyncingRef.current = false;
    });

    newSocket.on('object-remove', (id: string) => {
      isSyncingRef.current = true;
      const existing = initCanvas.getObjects().find((o: any) => o.id === id);
      if (existing) initCanvas.remove(existing);
      isSyncingRef.current = false;
    });

    newSocket.on('clear', () => {
      isSyncingRef.current = true;
      initCanvas.clear();
      initCanvas.backgroundColor = 'transparent';
      isSyncingRef.current = false;
    });

    newSocket.on('chat-message', (msg: ChatMessage) => {
      setMessages((prev) => [...prev, { ...msg, isMe: false }]);
    });

    // Object mutation listeners to broadcast
    initCanvas.on('object:added', (e) => {
      if (isSyncingRef.current || !e.target) return;
      const obj = e.target as any;
      if (!obj.id) obj.id = generateId();
      newSocket.emit('object-add', { roomId, obj: obj.toJSON(['id']) });
    });

    initCanvas.on('object:modified', (e) => {
      if (isSyncingRef.current || !e.target) return;
      const obj = e.target as any;
      newSocket.emit('object-modify', { roomId, obj: obj.toJSON(['id']) });
    });

    // Resize Handler
    const handleResize = () => {
      if (containerRef.current) {
        initCanvas.setWidth(containerRef.current.clientWidth);
        initCanvas.setHeight(containerRef.current.clientHeight);
      }
    };
    window.addEventListener('resize', handleResize);

    return () => {
      newSocket.disconnect();
      initCanvas.dispose();
      window.removeEventListener('resize', handleResize);
      if (localStreamRef.current) localStreamRef.current.getTracks().forEach(t => t.stop());
    };
  }, [roomId, username, backendUrl]);


  // ========== 2. Advanced Tools / Fabric Controls ==========
  useEffect(() => {
    const canvas = fabricRef.current;
    if (!canvas) return;

    // Clear previous settings
    canvas.isDrawingMode = false;
    canvas.defaultCursor = 'default';
    canvas.selection = false;
    
    // Clear old mouse events
    canvas.off('mouse:down');

    // Update settings based on active tool
    if (activeTool === 'select') {
      canvas.selection = true;
      canvas.forEachObject((o) => { o.selectable = true; o.evented = true; });
    } 
    else {
      canvas.forEachObject((o) => { o.selectable = false; o.evented = false; });
    }

    if (activeTool === 'pencil' || activeTool === 'paintbrush' || activeTool === 'highlighter') {
      canvas.isDrawingMode = true;
      if (activeTool === 'pencil') {
        canvas.freeDrawingBrush = new fabric.PencilBrush(canvas);
        canvas.freeDrawingBrush.color = color;
        canvas.freeDrawingBrush.width = lineWidth;
      } else if (activeTool === 'paintbrush') {
        canvas.freeDrawingBrush = new fabric.SprayBrush(canvas);
        canvas.freeDrawingBrush.color = color;
        canvas.freeDrawingBrush.width = lineWidth * 2; // Paintbrush is thicker
      } else if (activeTool === 'highlighter') {
        canvas.freeDrawingBrush = new fabric.PencilBrush(canvas);
        // Semi-transparent
        const alphaHex = Math.round(0.4 * 255).toString(16).padStart(2, '0');
        canvas.freeDrawingBrush.color = color.length === 7 ? color + alphaHex : color;
        canvas.freeDrawingBrush.width = lineWidth * 3;
      }
    }

    if (activeTool === 'shapes') {
      canvas.defaultCursor = 'crosshair';
      canvas.on('mouse:down', (opt) => {
        const ptr = canvas.getPointer(opt.e);
        let shape: fabric.Object;
        const opts = { left: ptr.x, top: ptr.y, fill: color, originX: 'center', originY: 'center' };
        
        switch (shapeMode) {
          case 'circle': shape = new fabric.Circle({ ...opts, radius: 50 }); break;
          case 'triangle': shape = new fabric.Triangle({ ...opts, width: 100, height: 100 }); break;
          case 'rect': default: shape = new fabric.Rect({ ...opts, width: 100, height: 100 }); break;
        }
        
        (shape as any).id = generateId();
        canvas.add(shape);
        canvas.setActiveObject(shape);
        setActiveTool('select'); // auto-switch to select so they can jump to sizing it
      });
    }

    if (activeTool === 'text') {
      canvas.defaultCursor = 'text';
      canvas.on('mouse:down', (opt) => {
        const ptr = canvas.getPointer(opt.e);
        const text = new fabric.IText('Type here', { 
          left: ptr.x, top: ptr.y, fill: color, fontFamily: 'Inter', fontSize: Math.max(lineWidth * 5, 20) 
        });
        (text as any).id = generateId();
        canvas.add(text);
        canvas.setActiveObject(text);
        text.enterEditing();
        text.selectAll();
        setActiveTool('select');
      });
    }

    if (activeTool === 'eraser') {
      // In object-based canvas, easiest eraser is clicking objects to delete them
      canvas.defaultCursor = 'cell';
      canvas.on('mouse:down', (opt) => {
        if (opt.target) {
          socket?.emit('object-remove', { roomId, id: (opt.target as any).id });
          canvas.remove(opt.target);
          canvas.discardActiveObject();
          canvas.requestRenderAll();
        }
      });
    }
  }, [activeTool, color, lineWidth, shapeMode, socket, roomId]);


  // Update drawing brush when color/line-width changes
  useEffect(() => {
    const canvas = fabricRef.current;
    if (canvas && canvas.isDrawingMode && canvas.freeDrawingBrush) {
      if (activeTool === 'highlighter') {
        const alphaHex = Math.round(0.4 * 255).toString(16).padStart(2, '0');
        canvas.freeDrawingBrush.color = color.length === 7 ? color + alphaHex : color;
        canvas.freeDrawingBrush.width = lineWidth * 3;
      } else {
        canvas.freeDrawingBrush.color = color;
        canvas.freeDrawingBrush.width = activeTool === 'paintbrush' ? lineWidth * 2 : lineWidth;
      }
    }
  }, [color, lineWidth, activeTool]);


  // ========== 3. Feature Functions ==========
  const handleClear = () => {
    if (window.confirm("Clear the entire board?")) {
      fabricRef.current?.clear();
      if(fabricRef.current) fabricRef.current.backgroundColor = 'transparent';
      socket?.emit('clear', roomId);
    }
  };

  const deleteSelected = () => {
    const canvas = fabricRef.current;
    if (!canvas) return;
    const activeObjects = canvas.getActiveObjects();
    if (activeObjects.length) {
      activeObjects.forEach(obj => {
        socket?.emit('object-remove', { roomId, id: (obj as any).id });
        canvas.remove(obj);
      });
      canvas.discardActiveObject();
      canvas.requestRenderAll();
    } else {
       showAlert("Select an object to erase it!");
    }
  };

  const handleExport = () => {
    if (!fabricRef.current) return;
    // Export with background grid for style
    const dataUrl = fabricRef.current.toDataURL({ format: 'png', multiplier: 1 });
    const a = document.createElement('a');
    a.href = dataUrl;
    a.download = `livecollab-${roomId}.png`;
    a.click();
    showAlert("Whiteboard exported successfully!");
  };

  const handleImportImage = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && fabricRef.current) {
      const reader = new FileReader();
      reader.onload = (evt) => {
        const imgObj = new Image();
        imgObj.src = evt.target?.result as string;
        imgObj.onload = () => {
          const img = new fabric.Image(imgObj);
          img.set({ left: 100, top: 100 });
          img.scaleToWidth(Math.min(300, fabricRef.current!.width! / 2));
          (img as any).id = generateId();
          fabricRef.current?.add(img);
          fabricRef.current?.setActiveObject(img);
          setActiveTool('select');
        };
      };
      reader.readAsDataURL(file);
    }
  };

  const handleInvite = () => {
    navigator.clipboard.writeText(roomId);
    showAlert('Room ID copied to clipboard!');
  };

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !socket) return;
    const msgData: ChatMessage = { user: username, text: newMessage, time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }), isMe: true };
    setMessages(prev => [...prev, msgData]);
    socket.emit('chat-message', { roomId, message: { ...msgData, isMe: false } });
    setNewMessage('');
  };

  const toggleVoice = async () => {
    if (isInVoice) {
      if (localStreamRef.current) localStreamRef.current.getTracks().forEach(t => t.stop());
      setIsInVoice(false);
      socket?.emit("voice-status", { roomId, isSpeaking: false });
    } else {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        localStreamRef.current = stream;
        setIsInVoice(true);
        socket?.emit("voice-status", { roomId, isSpeaking: true });
        showAlert("Voice Chat Enabled");
      } catch (err) {
        showAlert("Microphone access denied or not available.");
      }
    }
  };
  
  useEffect(() => {
    if (!socket) return;
    socket.on("voice-status", ({ socketId, isSpeaking, username: speakerName }) => {
      setIsSpeaking(prev => ({ ...prev, [socketId]: { username: speakerName, speaking: isSpeaking } }));
    });
    return () => { socket.off("voice-status"); };
  }, [socket]);

  // Handle keyboard deletes
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.key === 'Delete' || e.key === 'Backspace') && activeTool === 'select') {
        const activeObj = fabricRef.current?.getActiveObject();
        // Prevent deleting if they are actively typing within an IText
        if (activeObj && activeObj.type === 'i-text' && (activeObj as fabric.IText).isEditing) return;
        deleteSelected();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeTool]);

  const activeSpeakerId = Object.keys(isSpeaking).find(id => isSpeaking[id].speaking);
  const activeSpeaker = activeSpeakerId ? isSpeaking[activeSpeakerId] : null;

  const colors = ['#000000', '#ef4444', '#f97316', '#eab308', '#10b981', '#06b6d4', '#3b82f6', '#8b5cf6', '#d946ef', '#ffffff'];

  // Left Sidebar Tools definition
  const tools = [
    { id: 'select', icon: MousePointer2, label: 'Select' },
    { id: 'pencil', icon: PenTool, label: 'Pencil' },
    { id: 'paintbrush', icon: Brush, label: 'Paint' },
    { id: 'highlighter', icon: Highlighter, label: 'Highlight' },
    { id: 'shapes', icon: shapeMode === 'rect' ? Square : shapeMode === 'circle' ? CircleIcon : Triangle, label: 'Shapes' },
    { id: 'text', icon: Type, label: 'Text' },
    { id: 'eraser', icon: Eraser, label: 'Eraser' },
  ];

  return (
    <div className="w-full h-full flex flex-col bg-white text-slate-800 font-sans relative">
      
      {/* Custom Alert Toast Notification */}
      {alertMsg && (
        <div className="absolute top-20 left-1/2 transform -translate-x-1/2 z-50 bg-slate-900 text-white px-6 py-3 rounded-full shadow-2xl flex items-center gap-3 animate-fade-in border border-slate-700">
          <Bell size={18} className="text-indigo-400" />
          <span className="text-sm font-semibold">{alertMsg}</span>
        </div>
      )}

      {/* Top Navbar */}
      <header className="h-16 border-b border-slate-200 px-4 flex items-center justify-between bg-white z-20 shrink-0 shadow-sm relative">
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2 font-bold text-xl text-[#3b3dbf]">
            <div className="w-6 h-6 flex space-x-[2px]">
              <div className="w-1.5 h-4 bg-[#3b3dbf] rounded-full transform -rotate-12 mt-1"></div>
              <div className="w-1.5 h-6 bg-[#3b3dbf] rounded-full"></div>
              <div className="w-1.5 h-3 bg-[#3b3dbf] rounded-full transform rotate-12 mt-2"></div>
            </div>
            LiveCollab
          </div>
          <div className="hidden sm:flex items-center gap-2 bg-slate-100/50 rounded-full py-1.5 px-3 border border-slate-200 hover:bg-slate-100 transition-colors cursor-pointer" onClick={handleInvite}>
            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
            <span className="text-sm font-semibold text-slate-700">{roomId}</span>
            <Copy size={14} className="ml-2 text-slate-400"/>
          </div>
        </div>

        <div className="flex items-center gap-2 sm:gap-4">
          <div className="hidden md:flex -space-x-2 mr-2">
             <div className="w-8 h-8 rounded-full border-2 border-white bg-[#e0e7ff] text-[#4338ca] text-[0.6rem] font-bold flex items-center justify-center">
              +{userCount > 1 ? userCount - 1 : 0}
            </div>
          </div>
          
          <button onClick={() => fileInputRef.current?.click()} className="hidden md:flex items-center gap-2 px-3 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50 rounded-lg">
            <Upload size={16}/> Import
          </button>
          <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleImportImage} />
          
          <button onClick={handleExport} className="hidden sm:flex items-center gap-2 px-3 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50 rounded-lg">
            <Download size={16}/> Export
          </button>
          
          <div className="w-px h-6 bg-slate-200 mx-1"></div>

          <button onClick={() => setIsChatOpen(!isChatOpen)} className={`transition-colors p-2 ${isChatOpen ? 'text-[#4338ca] bg-[#e0e7ff] rounded-lg' : 'text-slate-500 hover:text-slate-800'}`}>
            <MessageSquare size={20} />
          </button>
          <button onClick={onLeave} className="text-red-500 hover:text-red-600 transition-colors p-2" title="Leave Room"><LogOut size={20} /></button>
        </div>
      </header>

      {/* Main Body */}
      <div className="flex flex-1 overflow-hidden relative">
        
        {/* Left Sidebar Toolbar */}
        <aside className="w-[72px] border-r border-slate-200 bg-white shadow-[2px_0_15px_rgba(0,0,0,0.02)] flex flex-col items-center py-4 z-20 shrink-0 overflow-y-auto">
          <div className="flex flex-col gap-1 w-full px-2 relative">
            
            {/* Shape Cycle Popover Hint */}
            {activeTool === 'shapes' && (
              <div className="absolute left-[70px] top-48 bg-slate-800 text-white p-2 rounded-xl text-xs font-semibold shadow-lg flex flex-col gap-2 z-50 animate-fade-in border border-slate-700">
                <button onClick={() => setShapeMode('rect')} className={`flex items-center gap-2 p-1.5 rounded-lg hover:bg-slate-700 ${shapeMode==='rect'?'text-indigo-400':''}`}><Square size={14}/> Rectangle</button>
                <button onClick={() => setShapeMode('circle')} className={`flex items-center gap-2 p-1.5 rounded-lg hover:bg-slate-700 ${shapeMode==='circle'?'text-indigo-400':''}`}><CircleIcon size={14}/> Circle</button>
                <button onClick={() => setShapeMode('triangle')} className={`flex items-center gap-2 p-1.5 rounded-lg hover:bg-slate-700 ${shapeMode==='triangle'?'text-indigo-400':''}`}><Triangle size={14}/> Triangle</button>
              </div>
            )}

            {tools.map((t) => (
              <button 
                key={t.id}
                onClick={() => setActiveTool(t.id)}
                className={`flex flex-col items-center justify-center p-2 rounded-xl transition-colors ${
                  activeTool === t.id 
                    ? 'bg-[#e0e7ff] text-[#4338ca] shadow-sm' 
                    : 'text-slate-500 hover:bg-slate-50 hover:text-slate-800'
                }`}
              >
                <t.icon size={20} strokeWidth={2.5} />
                <span className="text-[0.6rem] mt-1 font-semibold">{t.label}</span>
              </button>
            ))}
            
            <div className="w-8 mx-auto h-px bg-slate-200 my-2"></div>
            
            <button onClick={toggleVoice} className={`flex flex-col items-center justify-center p-2 rounded-xl transition-colors ${isInVoice ? 'bg-emerald-100 text-emerald-600' : 'text-slate-500 hover:bg-slate-50'}`}>
              {isInVoice ? <Mic size={20} /> : <MicOff size={20} />}
              <span className="text-[0.6rem] mt-1 font-semibold">Voice</span>
            </button>

            <button onClick={handleClear} className="flex flex-col items-center justify-center mt-2 p-2 rounded-xl text-red-500 hover:bg-red-50 transition-colors" title="Clear Board">
              <Trash2 size={20} strokeWidth={2.5} />
              <span className="text-[0.6rem] mt-1 font-semibold">Clear</span>
            </button>
          </div>
        </aside>

        {/* Canvas Area */}
        <main className="flex-1 relative bg-[#fafafa]">
          
          <div className="absolute inset-0 pointer-events-none" 
               style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, #cbd5e1 1px, transparent 0)', backgroundSize: '30px 30px' }}
          />

          {/* Floating Voice Chat Pill */}
          {(isInVoice || activeSpeaker) && (
            <div className="absolute top-6 left-1/2 transform -translate-x-1/2 z-20 bg-white/90 backdrop-blur-md rounded-full shadow-[0_4px_25px_rgba(0,0,0,0.08)] border border-slate-100 flex items-center p-1.5 pl-3 pr-4 gap-4 animate-fade-in">
              <div className="flex items-center gap-3">
                <div className="relative">
                  <div className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center font-bold text-sm">
                    {activeSpeaker ? activeSpeaker.username[0].toUpperCase() : username[0].toUpperCase()}
                  </div>
                </div>
                <div className="flex flex-col">
                  <span className="text-[0.6rem] font-bold text-emerald-600 uppercase tracking-wider">Voice: Active</span>
                  <span className="text-sm font-bold text-slate-800">{activeSpeaker ? activeSpeaker.username : username} speaking...</span>
                </div>
              </div>
            </div>
          )}

          {/* Core Fabric Canvas Container */}
          <div ref={containerRef} className="absolute inset-0 z-10 touch-none">
            <canvas ref={canvasElRef} className="absolute inset-0" />
            
            {/* Overlay hint if Pan/Zooming trackpad is active */}
            <div className="absolute top-4 left-4 pointer-events-none text-[0.65rem] font-bold text-slate-400 tracking-wider">
               CTRL / CMD + TRACKPAD SCROLL TO ZOOM
            </div>
          </div>

          {/* Bottom Floating Toolbar */}
          <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 z-20 bg-white/95 backdrop-blur-md rounded-full shadow-[0_8px_30px_rgba(0,0,0,0.12)] border border-slate-100 flex flex-wrap items-center justify-center py-2 px-4 gap-4">
            <div className="flex gap-1.5 items-center bg-slate-50 p-1.5 rounded-full border border-slate-100">
              {colors.map((c) => (
                <button
                  key={c}
                  onClick={() => setColor(c)}
                  className={`w-6 h-6 rounded-full transition-transform hover:scale-110 ${
                    color === c ? 'shadow-[0_0_0_2px_white,0_0_0_4px_#4338ca] scale-110' : ''
                  } ${c === '#ffffff' ? 'border border-slate-200' : ''}`}
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>
            
            <div className="w-px h-6 bg-slate-200 mx-1"></div>

            <div className="flex items-center gap-3">
              <div className="text-xs font-bold text-slate-500 uppercase">Width</div>
              <input 
                type="range" min="1" max="50" 
                value={lineWidth} 
                onChange={(e) => setLineWidth(Number(e.target.value))}
                className="w-24 h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-[#4338ca]"
              />
            </div>
          </div>
        </main>

        {/* Right Sidebar - Team Chat */}
        {isChatOpen && (
          <aside className="w-80 bg-white shadow-[-2px_0_15px_rgba(0,0,0,0.02)] border-l border-slate-200 flex flex-col z-20 shrink-0 absolute md:relative right-0 h-full">
            <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-white shadow-sm z-10">
              <h3 className="font-bold text-slate-800">Team Chat <span className="text-[#4338ca] ml-1 bg-[#e0e7ff] px-2 py-0.5 rounded-full text-xs">{messages.length}</span></h3>
              <button onClick={() => setIsChatOpen(false)} className="md:hidden text-slate-400 hover:text-slate-600 p-1"><LogOut size={16} className="rotate-180"/></button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-4 bg-[#fafafa]">
              {messages.map((msg, idx) => {
                if (msg.user === 'SYSTEM') {
                  return (
                    <div key={idx} className="flex items-center justify-center my-1 w-full relative">
                      <div className="absolute w-full h-px bg-slate-200 top-1/2"></div>
                      <span className="text-[0.6rem] font-bold text-slate-400 uppercase bg-[#fafafa] px-2 relative z-10">{msg.text}</span>
                    </div>
                  );
                }
                
                return (
                  <div key={idx} className={`flex gap-2 pointer-events-auto ${msg.isMe ? 'flex-row-reverse' : 'flex-row'}`}>
                    <div className="w-6 h-6 rounded-full bg-slate-200 text-[#4338ca] font-bold flex justify-center items-center text-[0.6rem] flex-shrink-0 mt-1">
                      {msg.user[0].toUpperCase()}
                    </div>
                    <div className={`flex flex-col ${msg.isMe ? 'items-end' : 'items-start'} max-w-[85%]`}>
                      <div className={`flex items-baseline gap-2 mb-0.5 ${msg.isMe ? 'flex-row-reverse' : 'flex-row'}`}>
                        <span className="text-[0.65rem] font-bold text-slate-800">{msg.isMe ? 'You' : msg.user}</span>
                        <span className="text-[0.6rem] font-medium text-slate-400">{msg.time}</span>
                      </div>
                      <div className={`px-3 py-2 text-[0.85rem] rounded-2xl leading-snug break-words ${msg.isMe ? 'bg-[#4338ca] text-white rounded-tr-none shadow-sm' : 'bg-white text-slate-800 rounded-tl-none border border-slate-200 shadow-sm'}`}>
                        {msg.text}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="p-4 bg-white border-t border-slate-200 shrink-0">
              <form onSubmit={handleSendMessage} className="relative flex items-center bg-[#f1f5f9] rounded-2xl border border-transparent focus-within:border-[#4338ca]/30 focus-within:bg-white focus-within:shadow-[0_0_0_4px_#e0e7ff] transition-all">
                <input 
                  type="text" 
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  placeholder="Message team..." 
                  className="w-full bg-transparent border-none px-4 py-3 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-0"
                />
                <button type="submit" className="p-1.5 bg-[#4338ca] text-white rounded-[10px] hover:bg-[#3730a3] transition-colors shadow-sm disabled:opacity-50 m-1" disabled={!newMessage.trim()}>
                  <Send size={16} />
                </button>
              </form>
            </div>
          </aside>
        )}
      </div>
    </div>
  );
}
