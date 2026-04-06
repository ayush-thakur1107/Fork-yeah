import { useEffect, useRef, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import { Stage, Layer, Rect, Circle, RegularPolygon, Line, Text, Image as KonvaImage, Transformer } from 'react-konva';
import {
  LogOut, Trash2, MessageSquare, MousePointer2, PenTool, Highlighter, Triangle, 
  Circle as CircleIcon, Square, Type, Eraser, MicOff, Mic, Send, Copy, Upload, 
  Bell, Hexagon, BarChart2, CheckSquare, Undo2, Redo2, Download, Sun, Moon
} from 'lucide-react';
import type { PollData } from './PollWidget';
import type { GraphData } from './GraphWidget';
import PollWidget from './PollWidget';
import GraphWidget from './GraphWidget';

// I need to use native Image constructor for Konva since use-image might not be installed.
const KonvaUrlImage = ({ src, ...props }: any) => {
  const [image, setImage] = useState<HTMLImageElement | null>(null);
  useEffect(() => {
    const img = new window.Image();
    img.src = src;
    img.onload = () => setImage(img);
  }, [src]);
  return image ? <KonvaImage image={image} {...props} /> : null;
};

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

export interface BoardElement {
  id: string;
  type: 'freehand' | 'rect' | 'circle' | 'triangle' | 'polygon' | 'text' | 'image' | 'poll' | 'graph';
  x: number;
  y: number;
  width?: number;
  height?: number;
  radius?: number;
  points?: number[];
  strokeColor?: string;
  fillColor?: string;
  strokeWidth?: number;
  dashStyle?: 'solid' | 'dashed' | 'dotted';
  isEraser?: boolean;
  text?: string;
  src?: string;
  pollData?: PollData;
  graphData?: GraphData;
  isHighlighter?: boolean;
  brushType?: 'marker' | 'chisel' | 'neon';
}

const generateId = () => Math.random().toString(36).substring(2, 10);

export default function Whiteboard({ roomId, username, onLeave }: WhiteboardProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [socket, setSocket] = useState<Socket | null>(null);
  
  // Canvas State & Konva Viewport
  const [elements, setElements] = useState<BoardElement[]>([]);
  const [currentElement, setCurrentElement] = useState<BoardElement | null>(null);
  const [undoStack, setUndoStack] = useState<BoardElement[][]>([]);
  const [redoStack, setRedoStack] = useState<BoardElement[][]>([]);
  const [stagePos, setStagePos] = useState({ x: 0, y: 0 });
  const [stageScale, setStageScale] = useState(1);
  const [stageSize, setStageSize] = useState({ width: window.innerWidth, height: window.innerHeight });
  const [theme, setTheme] = useState<'light' | 'dark'>('light');
  
  // UI States
  const [strokeColor, setStrokeColor] = useState('#4338ca');
  const [fillColor, setFillColor] = useState('transparent');
  const [lineWidth, setLineWidth] = useState(5);
  const [dashStyle, setDashStyle] = useState<'solid' | 'dashed' | 'dotted'>('solid');
  
  const [activeTool, setActiveTool] = useState('select');
  const [shapeMode, setShapeMode] = useState<'rect' | 'circle' | 'triangle' | 'polygon'>('rect');
  const [brushType, setBrushType] = useState<'marker' | 'chisel' | 'neon'>('marker');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  
  // Drawing & Refs
  const stageRef = useRef<any>(null);
  const trRef = useRef<any>(null);
  const isDrawing = useRef(false);
  const currentElementId = useRef<string | null>(null);

  const [userCount, setUserCount] = useState(1);
  const [isChatOpen, setIsChatOpen] = useState(true);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  
  // Voice Chat State
  const [isInVoice, setIsInVoice] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState<{ [id: string]: { username: string, speaking: boolean } }>({});
  const recognitionRef = useRef<any>(null); 
  const ccTimeoutsRef = useRef<{ [id: string]: ReturnType<typeof setTimeout> }>({});
  const [ccText, setCcText] = useState<{ [id: string]: { username: string, text: string } }>({});

  const isInVoiceRef = useRef(false);
  useEffect(() => { isInVoiceRef.current = isInVoice; }, [isInVoice]);

  const [alertMsg, setAlertMsg] = useState('');

  const backendUrl = import.meta.env.VITE_BACKEND_URL || (import.meta.env.PROD ? '' : 'http://localhost:3001');

  const showAlert = (msg: string) => {
    setAlertMsg(msg);
    setTimeout(() => setAlertMsg(''), 4000);
  };

  // ========== History & Undo/Redo ==========
  const saveHistory = () => {
    setUndoStack(prev => [...prev, elements].slice(-20));
    setRedoStack([]);
  };
  const handleUndo = () => {
    if (undoStack.length === 0) return;
    const prev = undoStack[undoStack.length - 1];
    setRedoStack(r => [...r, elements]);
    setUndoStack(u => u.slice(0, -1));
    setElements(prev);
    setSelectedId(null);
    socket?.emit('state-replace', { roomId, elements: prev });
  };
  const handleRedo = () => {
    if (redoStack.length === 0) return;
    const next = redoStack[redoStack.length - 1];
    setUndoStack(u => [...u, elements]);
    setRedoStack(r => r.slice(0, -1));
    setElements(next);
    setSelectedId(null);
    socket?.emit('state-replace', { roomId, elements: next });
  };

  // ========== Transformer Selection ==========
  useEffect(() => {
    if (activeTool === 'select' && selectedId && trRef.current && stageRef.current) {
      const node = stageRef.current.findOne('#' + selectedId);
      if (node) {
        trRef.current.nodes([node]);
        trRef.current.getLayer().batchDraw();
      }
    } else if (trRef.current) {
      trRef.current.nodes([]);
      trRef.current.getLayer().batchDraw();
    }
  }, [selectedId, activeTool, elements, currentElement]);

  // Prevent browser from scrolling/panning when wheeling on canvas
  useEffect(() => {
    const preventDefault = (e: WheelEvent) => {
      if (containerRef.current?.contains(e.target as Node)) {
        e.preventDefault();
      }
    };
    document.addEventListener('wheel', preventDefault, { passive: false });
    return () => document.removeEventListener('wheel', preventDefault);
  }, []);

  // ========== Window Resize ==========
  useEffect(() => {
    const checkSize = () => {
      if (containerRef.current) {
        setStageSize({
          width: containerRef.current.clientWidth,
          height: containerRef.current.clientHeight
        });
      }
    };
    checkSize();
    
    const observer = new ResizeObserver(checkSize);
    if (containerRef.current) observer.observe(containerRef.current);

    window.addEventListener('resize', checkSize);
    return () => {
      window.removeEventListener('resize', checkSize);
      observer.disconnect();
    };
  }, []);

  // ========== WebSockets ==========
  useEffect(() => {
    const newSocket = io(backendUrl);
    setSocket(newSocket);

    newSocket.on('connect', () => {
      newSocket.emit('join-room', { roomId, username });
      newSocket.emit('request-board-state', roomId);
    });

    newSocket.on('load-state', (state: { objects: any[], chats: ChatMessage[], users: any }) => {
      setUserCount(Object.keys(state.users).length);
      setMessages(state.chats.map((c) => ({ ...c, isMe: c.user === username })) || []);
      
      if (state.objects && state.objects.length > 0) {
         // Some previous objects might be fabric.js, we try to gracefully ignore or map basic coordinates
         const konvaElements = state.objects.map(obj => {
           // Mapping fabric rects loosely
           if (typeof obj.type === 'string' && !obj.x) {
             return { id: obj.id, type: obj.type, x: obj.left || 0, y: obj.top || 0, width: obj.width, height: obj.height, fillColor: obj.fill, strokeColor: obj.stroke };
           }
           return obj;
         }).filter(obj => !!obj.id);
         setElements(konvaElements as BoardElement[]);
      }
    });

    newSocket.on('receive-update', (updatedElement: BoardElement) => {
      setElements(prev => {
        const exists = prev.some(e => e.id === updatedElement.id);
        if (exists) {
          return prev.map(e => e.id === updatedElement.id ? { ...e, ...updatedElement } : e);
        } else {
          return [...prev, updatedElement];
        }
      });
    });

    newSocket.on('user-joined', ({ username: uName }) => {
      setUserCount((c) => c + 1);
      setMessages((prev) => [...prev, { user: 'SYSTEM', text: `${uName} JOINED THE SESSION`, time: '', isMe: false }]);
    });
    
    newSocket.on('user-left', () => setUserCount((c) => Math.max(1, c - 1)));

    newSocket.on('object-remove', (id: string) => {
      setElements(prev => prev.filter(e => e.id !== id));
    });

    newSocket.on('clear', () => {
      setElements([]);
    });
    
    newSocket.on('state-replace', (els: BoardElement[]) => {
      setElements(els);
      setSelectedId(null);
    });

    newSocket.on('chat-message', (msg: ChatMessage) => {
      setMessages((prev) => [...prev, { ...msg, isMe: false }]);
    });

    newSocket.on('voice-cc', ({ socketId, username, text }: any) => {
      setCcText(prev => ({ ...prev, [socketId]: { username, text } }));
      if (ccTimeoutsRef.current[socketId]) clearTimeout(ccTimeoutsRef.current[socketId]);
      ccTimeoutsRef.current[socketId] = setTimeout(() => {
        setCcText(prev => { const next = {...prev}; delete next[socketId]; return next; });
      }, 4000);
    });

    newSocket.on("voice-status", ({ socketId, isSpeaking: spk, username: speakerName }: any) => {
      setIsSpeaking(prev => ({ ...prev, [socketId]: { username: speakerName, speaking: spk } }));
    });

    return () => {
      newSocket.disconnect();
      if (recognitionRef.current) try { recognitionRef.current.stop(); } catch(e) {}
      Object.values(ccTimeoutsRef.current).forEach(clearTimeout);
    };
  }, [roomId, username, backendUrl]);

  // ========== Sync Helper ==========
  const throttledEmitRef = useRef(
    (() => {
      let lastCall = 0;
      let timeout: ReturnType<typeof setTimeout> | null = null;
      return (sckt: Socket, rId: string, element: BoardElement) => {
        const now = Date.now();
        const limit = 30; // 30ms throttling limit

        if (timeout) clearTimeout(timeout);

        if (now - lastCall >= limit) {
          sckt.emit('draw-update', { roomId: rId, element });
          lastCall = now;
        } else {
          timeout = setTimeout(() => {
            sckt.emit('draw-update', { roomId: rId, element });
            lastCall = Date.now();
          }, limit - (now - lastCall));
        }
      };
    })()
  );

  const syncUpdate = (obj: BoardElement) => {
    if (socket) throttledEmitRef.current(socket, roomId, obj);
  };

  const syncAdd = (obj: BoardElement) => syncUpdate(obj);
  const syncModify = (obj: BoardElement) => syncUpdate(obj);

  // ========== Drawing Logic ==========
  const handlePointerDown = (e: any) => {
    if (activeTool === 'select') {
      const clickedOnEmpty = e.target === e.target.getStage();
      if (clickedOnEmpty) {
        setSelectedId(null);
      }
      return;
    }
    
    const stage = stageRef.current;
    if (!stage) return;
    const pos = stage.getPointerPosition();
    if (!pos) return;
    
    const x = (pos.x - stagePos.x) / stageScale;
    const y = (pos.y - stagePos.y) / stageScale;

    isDrawing.current = true;
    const id = generateId();
    currentElementId.current = id;
    
    let newElem: BoardElement = {
      id, x, y, strokeColor, fillColor: fillColor !== 'transparent' ? fillColor : undefined, strokeWidth: lineWidth, dashStyle, type: 'rect', brushType
    };
    
    if (activeTool === 'pencil' || activeTool === 'paintbrush') {
      newElem.type = 'freehand';
      newElem.points = [x, y];
    } else if (activeTool === 'highlighter') {
      newElem.type = 'freehand';
      newElem.points = [x, y];
      newElem.isHighlighter = true;
      newElem.strokeWidth = lineWidth * 4;
    } else if (activeTool === 'eraser') {
      newElem.type = 'freehand';
      newElem.points = [x, y];
      newElem.isEraser = true;
      newElem.strokeWidth = lineWidth * 5;
    } else if (activeTool === 'shapes') {
      newElem.type = shapeMode;
      newElem.width = 0;
      newElem.height = 0;
      newElem.radius = 0;
    } else if (activeTool === 'text') {
      newElem.type = 'text';
      newElem.text = 'Double click to edit';
      newElem.fillColor = strokeColor;
      saveHistory();
      syncAdd(newElem);
      setElements(prev => [...prev, newElem]);
      setActiveTool('select');
      isDrawing.current = false;
      return;
    } else {
       return;
    }

    setCurrentElement(newElem);
  };

  const handlePointerMove = (_e: any) => {
    if (!isDrawing.current || activeTool === 'select' || activeTool === 'text') return;
    
    const stage = stageRef.current;
    if (!stage) return;
    const pos = stage.getPointerPosition();
    if (!pos) return;

    const currentX = (pos.x - stagePos.x) / stageScale;
    const currentY = (pos.y - stagePos.y) / stageScale;

    setCurrentElement(prev => {
      if (!prev) return prev;
      const el = { ...prev };
      
      if (el.type === 'freehand' && el.points) {
        el.points = [...el.points, currentX, currentY];
      } else if (el.type === 'rect' || el.type === 'triangle' || el.type === 'polygon') {
        el.width = currentX - el.x;
        el.height = currentY - el.y;
      } else if (el.type === 'circle') {
        const dx = currentX - el.x;
        const dy = currentY - el.y;
        el.radius = Math.sqrt(dx * dx + dy * dy);
      }

      // Emitting optimistic update while drawing/resizing
      syncUpdate(el);
      return el;
    });
  };

  const handlePointerUp = () => {
    if (isDrawing.current && currentElementId.current && currentElement) {
       saveHistory();
       setElements(prev => [...prev, currentElement]);
       syncAdd(currentElement);
       setCurrentElement(null);
    }
    isDrawing.current = false;
    currentElementId.current = null;
  };

  // Zoom / Pan
  const handleWheel = (e: React.WheelEvent<HTMLDivElement>) => {
    if (e.ctrlKey || e.metaKey) {
      // Zoom
      const scaleBy = 0.90;
      const stage = stageRef.current;
      if (!stage) return;
      const oldScale = stage.scaleX();
      const pointer = stage.getPointerPosition() || { x: e.clientX, y: e.clientY };
      
      let newScale = e.deltaY > 0 ? oldScale * scaleBy : oldScale / scaleBy;
      if (newScale > 20) newScale = 20;
      if (newScale < 0.05) newScale = 0.05;
      
      const mousePointTo = {
        x: (pointer.x - stage.x()) / oldScale,
        y: (pointer.y - stage.y()) / oldScale,
      };

      setStageScale(newScale);
      setStagePos({
        x: pointer.x - mousePointTo.x * newScale,
        y: pointer.y - mousePointTo.y * newScale,
      });
    } else {
      // Pan
      setStagePos(prev => ({
        x: prev.x - e.deltaX,
        y: prev.y - e.deltaY
      }));
    }
  };

  const handleClear = () => {
    if (window.confirm("Clear the entire board?")) {
      saveHistory();
      setElements([]);
      socket?.emit('clear', roomId);
    }
  };

  const exportImage = () => {
    if (!stageRef.current) return;
    const uri = stageRef.current.toDataURL({ pixelRatio: 2 });
    const link = document.createElement('a');
    link.download = `LiveCollab-Board-${roomId}.png`;
    link.href = uri;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleImportImage = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (evt) => {
        const newElem: BoardElement = {
           id: generateId(),
           type: 'image',
           x: -stagePos.x / stageScale + 100,
           y: -stagePos.y / stageScale + 100,
           src: evt.target?.result as string,
        };
        setElements(prev => [...prev, newElem]);
        syncAdd(newElem);
        setActiveTool('select');
      };
      reader.readAsDataURL(file);
    }
  };

  // Add Widgets
  const addWidget = (type: 'poll' | 'graph') => {
    const id = generateId();
    const newWidget: BoardElement = {
      id, 
      type,
      x: -stagePos.x / stageScale + 150, 
      y: -stagePos.y / stageScale + 80,
      pollData: type === 'poll' ? { question: '', options: [{text:'', votes:0}, {text:'', votes:0}], votedBy: [] } : undefined,
      graphData: type === 'graph' ? { type: 'bar', dataPoints: [], title: '' } : undefined
    };
    setElements(prev => [...prev, newWidget]);
    syncAdd(newWidget);
  };

  const updateWidget = (id: string, newProps: any) => {
     setElements(prev => {
       const items = prev.map(e => e.id === id ? { ...e, ...newProps } : e);
       const updated = items.find(e => e.id === id);
       if (updated) syncModify(updated);
       return items;
     });
  };

  const deleteElement = (id: string) => {
     setElements(prev => prev.filter(e => e.id !== id));
     socket?.emit('object-remove', { roomId, id });
  };


  // Helpers for Konva props
  const getDashProps = (style?: string, width: number = 1): number[] | undefined => {
    if (style === 'dashed') return [width * 3, width * 3];
    if (style === 'dotted') return [width, width * 2];
    return undefined;
  };

  const getGlobalComposite = (isEraser?: boolean) => isEraser ? 'destination-out' : 'source-over';


  // Voice Setup 
  const toggleVoice = async () => { /* Kept mostly same as original, snipped logic for brevity but ensuring it's not broken */
    if (isInVoice) {
      setIsInVoice(false);
      socket?.emit("voice-status", { roomId, isSpeaking: false });
      if (recognitionRef.current) {
        try { recognitionRef.current.stop(); } catch(e){}
      }
    } else {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (!SpeechRecognition) return showAlert("Live Captions are not supported in this browser. Please use Google Chrome.");
      
      try {
        const recognition = new SpeechRecognition();
        recognition.continuous = true; recognition.interimResults = true; recognition.lang = 'en-US';
        recognition.onstart = () => setIsInVoice(true);
        recognition.onspeechstart = () => socket?.emit("voice-status", { roomId, isSpeaking: true });
        recognition.onspeechend = () => socket?.emit("voice-status", { roomId, isSpeaking: false });
        recognition.onend = () => {
          if (isInVoiceRef.current) {
            try { recognition.start(); } catch(e){}
          } else {
            socket?.emit("voice-status", { roomId, isSpeaking: false });
          }
        };
        recognition.onresult = (event: any) => {
           let finalTranscript = '';
           for (let i = event.resultIndex; i < event.results.length; ++i) {
             if (event.results[i].isFinal) finalTranscript += event.results[i][0].transcript;
           }
           if (finalTranscript.trim()) {
             socket?.emit("voice-cc", { roomId, text: finalTranscript });
             setCcText(prev => ({ ...prev, 'me': { username: 'You', text: finalTranscript } }));
           }
        };
        showAlert("Voice Chat Requested. Connecting to Mic...");
        recognition.start();
        recognitionRef.current = recognition;
      } catch (err) {
        showAlert("Failed to initialize Live Captions.");
      }
    }
  };

  const activeSpeakerId = Object.keys(isSpeaking).find(id => isSpeaking[id].speaking);
  const activeSpeaker = activeSpeakerId ? isSpeaking[activeSpeakerId] : null;

  const colors = ['transparent', '#000000', '#ef4444', '#f97316', '#f59e0b', '#eab308', '#84cc16', '#22c55e', '#10b981', '#14b8a6', '#06b6d4', '#0ea5e9', '#3b82f6', '#6366f1', '#8b5cf6', '#d946ef', '#f43f5e', '#64748b', '#ffffff'];

  const tools = [
    { id: 'select', icon: MousePointer2, label: 'Select' },
    { id: 'pencil', icon: PenTool, label: 'Pencil' },
    { id: 'highlighter', icon: Highlighter, label: 'Highlight' },
    { id: 'shapes', icon: shapeMode === 'rect' ? Square : shapeMode === 'circle' ? CircleIcon : shapeMode === 'polygon' ? Hexagon : Triangle, label: 'Shapes' },
    { id: 'text', icon: Type, label: 'Text' },
    { id: 'eraser', icon: Eraser, label: 'Eraser' },
  ];

  const handleDragEnd = (e: any, id: string) => {
    const el = elements.find(el => el.id === id);
    if (!el) return;
    saveHistory();
    const newProps = { x: e.target.x(), y: e.target.y() };
    setElements(prev => prev.map(it => it.id === id ? { ...it, ...newProps } : it));
    syncModify({ ...el, ...newProps });
  };

  const handleTransformEnd = (e: any) => {
     if (!selectedId) return;
     const node = e.target;
     // Convert scale into width/height naturally for our model
     const scaleX = node.scaleX();
     const scaleY = node.scaleY();
     node.scaleX(1);
     node.scaleY(1);
     saveHistory();
     const newProps = {
        x: node.x(),
        y: node.y(),
        width: Math.max(2, node.width() * scaleX),
        height: Math.max(2, node.height() * scaleY),
        radius: Math.max(2, (node.radius ? node.radius() * scaleX : 0)),
        rotation: node.rotation(),
     };
     setElements(prev => prev.map(it => it.id === selectedId ? { ...it, ...newProps } : it));
     const el = elements.find(el => el.id === selectedId);
     if (el) syncModify({ ...el, ...newProps });
  };

  const handleTextDblClick = (id: string, currentText: string) => {
     const newText = window.prompt("Edit text:", currentText);
     if (newText !== null && newText !== currentText) {
       saveHistory();
       const newProps = { text: newText };
       setElements(prev => prev.map(e => e.id === id ? { ...e, ...newProps } : e));
       const el = elements.find(e => e.id === id);
       if (el) syncModify({ ...el, ...newProps });
     }
  };
  
  return (
    <div className={`w-full h-full flex flex-col font-sans relative overflow-hidden transition-colors ${theme === 'dark' ? 'bg-slate-900 text-slate-100' : 'bg-white text-slate-800'}`}>
      
      {alertMsg && (
        <div className="absolute top-20 left-1/2 transform -translate-x-1/2 z-50 bg-slate-900 text-white px-6 py-3 rounded-full shadow-2xl flex items-center gap-3 animate-bounce border border-slate-700">
          <Bell size={18} className="text-indigo-400" />
          <span className="text-sm font-semibold">{alertMsg}</span>
        </div>
      )}

      {/* Top Navbar */}
      <header className="h-16 border-b border-slate-200 px-4 flex items-center justify-between bg-white z-20 shrink-0 shadow-sm relative">
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2 font-bold text-xl text-[#3b3dbf]">LiveCollab</div>
          <div className="hidden sm:flex items-center gap-2 bg-slate-100/50 rounded-full py-1.5 px-3 border border-slate-200 hover:bg-slate-100 cursor-pointer" onClick={() => { navigator.clipboard.writeText(roomId); showAlert('Room ID Copied!'); }}>
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
          <div className="flex bg-slate-100 rounded-lg p-1 mr-2 border border-slate-200">
            <button onClick={handleUndo} disabled={undoStack.length === 0} className={`p-1 rounded transition-colors ${undoStack.length === 0 ? 'text-slate-400 opacity-50' : 'text-slate-700 hover:bg-white hover:shadow-sm'}`}><Undo2 size={16} /></button>
            <button onClick={handleRedo} disabled={redoStack.length === 0} className={`p-1 rounded transition-colors ${redoStack.length === 0 ? 'text-slate-400 opacity-50' : 'text-slate-700 hover:bg-white hover:shadow-sm'}`}><Redo2 size={16} /></button>
          </div>
          <button onClick={() => addWidget('poll')} className="hidden sm:flex items-center gap-2 px-3 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50 hover:text-slate-800 rounded-lg">
             <CheckSquare size={16}/> Insert Poll
          </button>
          <button onClick={() => addWidget('graph')} className="hidden sm:flex items-center gap-2 px-3 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50 hover:text-slate-800 rounded-lg">
             <BarChart2 size={16}/> Insert Graph
          </button>
          <div className="w-px h-6 bg-slate-200 mx-1 hidden sm:block"></div>
          
          <button onClick={() => fileInputRef.current?.click()} className="hidden md:flex items-center gap-2 px-3 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50 hover:text-slate-800 rounded-lg">
            <Upload size={16}/> Import
          </button>
          <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleImportImage} />
          
          <button onClick={exportImage} className="hidden md:flex items-center gap-2 px-3 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50 hover:text-slate-800 rounded-lg">
            <Download size={16}/> Export
          </button>
          
          <button onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')} className="p-2 text-slate-500 hover:text-slate-800 bg-slate-50 rounded-lg">
            {theme === 'light' ? <Moon size={20} /> : <Sun size={20} />}
          </button>
          
          <button onClick={() => setIsChatOpen(!isChatOpen)} className={`transition-colors p-2 ${isChatOpen ? 'text-[#4338ca] bg-[#e0e7ff] rounded-lg' : 'text-slate-500 hover:text-slate-800'}`}>
            <MessageSquare size={20} />
          </button>
          <button onClick={onLeave} className="text-red-500 hover:text-red-600 transition-colors p-2"><LogOut size={20} /></button>
        </div>
      </header>

      {/* Main Container */}
      <div className="flex flex-1 overflow-hidden relative">
        <aside className="w-[72px] border-r border-slate-200 bg-white shadow-[2px_0_15px_rgba(0,0,0,0.02)] flex flex-col items-center py-4 z-20 shrink-0 overflow-visible">
          <div className="flex flex-col gap-1 w-full px-2 relative">
            {activeTool === 'shapes' && (
              <div className="absolute left-[70px] top-32 bg-slate-800 text-white p-2 rounded-xl text-xs font-semibold shadow-2xl flex flex-col gap-2 z-50 border border-slate-700 ml-2">
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
                  activeTool === t.id ? 'bg-[#e0e7ff] text-[#4338ca] shadow-sm' : 'text-slate-500 hover:bg-slate-50'
                }`}
              >
                <t.icon size={20} strokeWidth={2.5} />
                <span className="text-[0.6rem] mt-1 font-semibold">{t.label}</span>
              </button>
            ))}
            <div className="w-8 mx-auto h-px bg-slate-200 my-2"></div>
            <button onClick={toggleVoice} className={`flex flex-col items-center justify-center p-2 rounded-xl ${isInVoice ? 'bg-emerald-100 text-emerald-600' : 'text-slate-500 hover:bg-slate-50'}`}>
              {isInVoice ? <Mic size={20} /> : <MicOff size={20} />}
              <span className="text-[0.6rem] mt-1 font-semibold">Voice</span>
            </button>
            <button onClick={handleClear} className="flex flex-col items-center justify-center mt-2 p-2 rounded-xl text-red-500 hover:bg-red-50">
              <Trash2 size={20} strokeWidth={2.5} />
              <span className="text-[0.6rem] mt-1 font-semibold">Clear</span>
            </button>
          </div>
        </aside>

        {/* Canvas & React Rnd Wrapper Container */}
        <main className={`flex-1 relative ${theme === 'dark' ? 'bg-[#0f172a]' : 'bg-[#fafafa]'}`} ref={containerRef} onWheel={handleWheel}>
          {(isInVoice || activeSpeaker) && (
            <div className="absolute top-6 left-1/2 transform -translate-x-1/2 z-20 bg-white/90 backdrop-blur-md rounded-full shadow-[0_4px_25px_rgba(0,0,0,0.08)] border border-slate-100 flex items-center p-1.5 pl-3 pr-4 gap-4 animate-fade-in">
              <span className="text-[0.6rem] font-bold text-emerald-600 uppercase">Voice: {activeSpeaker ? activeSpeaker.username : username} speaking...</span>
            </div>
          )}
          {isInVoice && Object.keys(ccText).map(id => (
            <div key={id} className="absolute bottom-24 right-4 z-40 bg-slate-900/95 text-white p-2.5 rounded-xl text-sm">
               <span className="font-bold text-indigo-400 text-[0.6rem] uppercase tracking-widest block mb-1">{ccText[id].username}</span>
               {ccText[id].text}
            </div>
          ))}
          <div id="bg-grid" className="absolute inset-0 pointer-events-none" 
               style={{ 
                 backgroundImage: theme === 'dark' ? 'radial-gradient(circle at 2px 2px, #334155 1px, transparent 0)' : 'radial-gradient(circle at 2px 2px, #cbd5e1 1px, transparent 0)', 
                 backgroundSize: `${Math.max(10, 30 * stageScale)}px ${Math.max(10, 30 * stageScale)}px`, 
                 backgroundPosition: `${stagePos.x}px ${stagePos.y}px` 
               }}
          />
          
          <div className="absolute inset-0 z-10 touch-none">
            <Stage 
              width={stageSize.width} 
              height={stageSize.height}
              onMouseDown={handlePointerDown}
              onMouseMove={handlePointerMove}
              onMouseUp={handlePointerUp}
              onTouchStart={handlePointerDown}
              onTouchMove={handlePointerMove}
              onTouchEnd={handlePointerUp}
              ref={stageRef}
              scaleX={stageScale}
              scaleY={stageScale}
              x={stagePos.x}
              y={stagePos.y}
              style={{ cursor: activeTool === 'select' ? 'default' : 'crosshair' }}
            >
              <Layer>
                {elements.map((el) => {
                  const isSelectable = activeTool === 'select';
                  const isEr = el.isEraser;
                  const str = isEr ? (theme === 'dark' ? '#0f172a' : '#fafafa') : el.strokeColor;
                  
                  if (el.type === 'text') {
                    return <Text key={el.id} id={el.id} x={el.x} y={el.y} text={el.text || ''} fontSize={Math.max(el.strokeWidth! * 5, 20)} fill={el.fillColor || el.strokeColor} draggable={isSelectable} onDragEnd={(e) => handleDragEnd(e, el.id)} onClick={() => { if(isSelectable) setSelectedId(el.id); }} onTap={() => { if(isSelectable) setSelectedId(el.id); }} onDblClick={() => handleTextDblClick(el.id, el.text || '')} onDblTap={() => handleTextDblClick(el.id, el.text || '')} onTransformEnd={handleTransformEnd} />;
                  }
                  if (el.type === 'image' && el.src) {
                    return <KonvaUrlImage key={el.id} id={el.id} x={el.x} y={el.y} src={el.src} draggable={isSelectable} onDragEnd={(e:any) => handleDragEnd(e, el.id)} onClick={() => { if(isSelectable) setSelectedId(el.id); }} onTap={() => { if(isSelectable) setSelectedId(el.id); }} onTransformEnd={handleTransformEnd} />;
                  }
                  if (el.type === 'freehand' && el.points) {
                    return <Line key={el.id} id={el.id} points={el.points} stroke={str} strokeWidth={el.strokeWidth} tension={el.brushType === 'chisel' ? 0 : 0.5} lineCap={el.brushType === 'chisel' ? 'square' : 'round'} lineJoin={el.brushType === 'chisel' ? 'miter' : 'round'} globalCompositeOperation={getGlobalComposite(isEr)} dash={getDashProps(el.dashStyle, el.strokeWidth)} opacity={el.isHighlighter ? 0.4 : 1} shadowBlur={el.brushType === 'neon' ? 15 : 0} shadowColor={el.brushType === 'neon' ? el.strokeColor : undefined} draggable={isSelectable} onDragStart={saveHistory} onDragEnd={(e) => handleDragEnd(e, el.id)} onClick={() => { if(isSelectable) setSelectedId(el.id); }} onTap={() => { if(isSelectable) setSelectedId(el.id); }} onTransformEnd={handleTransformEnd} />;
                  }
                  if (el.type === 'rect') {
                    return <Rect key={el.id} id={el.id} x={el.x} y={el.y} width={el.width || 0} height={el.height || 0} stroke={el.strokeColor} fill={el.fillColor} strokeWidth={el.strokeWidth} dash={getDashProps(el.dashStyle, el.strokeWidth)} draggable={isSelectable} onDragStart={saveHistory} onDragEnd={(e) => handleDragEnd(e, el.id)} onClick={() => { if(isSelectable) setSelectedId(el.id); }} onTap={() => { if(isSelectable) setSelectedId(el.id); }} onTransformEnd={handleTransformEnd} />;
                  }
                  if (el.type === 'circle') {
                    return <Circle key={el.id} id={el.id} x={el.x} y={el.y} radius={el.radius || 0} stroke={el.strokeColor} fill={el.fillColor} strokeWidth={el.strokeWidth} dash={getDashProps(el.dashStyle, el.strokeWidth)} draggable={isSelectable} onDragStart={saveHistory} onDragEnd={(e) => handleDragEnd(e, el.id)} onClick={() => { if(isSelectable) setSelectedId(el.id); }} onTap={() => { if(isSelectable) setSelectedId(el.id); }} onTransformEnd={handleTransformEnd} />;
                  }
                  if (el.type === 'triangle') {
                    return <RegularPolygon key={el.id} id={el.id} x={el.x} y={el.y} sides={3} radius={(el.width || el.radius || 50)} stroke={el.strokeColor} fill={el.fillColor} strokeWidth={el.strokeWidth} dash={getDashProps(el.dashStyle, el.strokeWidth)} draggable={isSelectable} onDragStart={saveHistory} onDragEnd={(e) => handleDragEnd(e, el.id)} onClick={() => { if(isSelectable) setSelectedId(el.id); }} onTap={() => { if(isSelectable) setSelectedId(el.id); }} onTransformEnd={handleTransformEnd} />;
                  }
                  return null;
                })}
                
                {currentElement && currentElement.type === 'freehand' && currentElement.points && (
                   <Line points={currentElement.points} stroke={currentElement.isEraser ? (theme === 'dark' ? '#0f172a' : '#fafafa') : currentElement.strokeColor} strokeWidth={currentElement.strokeWidth} tension={currentElement.brushType === 'chisel' ? 0 : 0.5} lineCap={currentElement.brushType === 'chisel' ? 'square' : 'round'} lineJoin={currentElement.brushType === 'chisel' ? 'miter' : 'round'} globalCompositeOperation={getGlobalComposite(currentElement.isEraser)} dash={getDashProps(currentElement.dashStyle, currentElement.strokeWidth)} opacity={currentElement.isHighlighter ? 0.4 : 1} shadowBlur={currentElement.brushType === 'neon' ? 15 : 0} shadowColor={currentElement.brushType === 'neon' ? currentElement.strokeColor : undefined} />
                )}
                {currentElement && currentElement.type === 'rect' && (
                   <Rect x={currentElement.x} y={currentElement.y} width={currentElement.width || 0} height={currentElement.height || 0} stroke={currentElement.strokeColor} fill={currentElement.fillColor} strokeWidth={currentElement.strokeWidth} dash={getDashProps(currentElement.dashStyle, currentElement.strokeWidth)} />
                )}
                {currentElement && currentElement.type === 'circle' && (
                   <Circle x={currentElement.x} y={currentElement.y} radius={currentElement.radius || 0} stroke={currentElement.strokeColor} fill={currentElement.fillColor} strokeWidth={currentElement.strokeWidth} dash={getDashProps(currentElement.dashStyle, currentElement.strokeWidth)} />
                )}
                {currentElement && currentElement.type === 'triangle' && (
                   <RegularPolygon x={currentElement.x} y={currentElement.y} sides={3} radius={(currentElement.width || currentElement.radius || 50)} stroke={currentElement.strokeColor} fill={currentElement.fillColor} strokeWidth={currentElement.strokeWidth} dash={getDashProps(currentElement.dashStyle, currentElement.strokeWidth)} />
                )}
                
                {activeTool === 'select' && <Transformer ref={trRef} keepRatio={false} boundBoxFunc={(oldBox, newBox) => newBox.width < 5 || newBox.height < 5 ? oldBox : newBox} />}
              </Layer>
            </Stage>
          </div>

          {/* Scaled Widget Layer overlay for HTML content */}
          <div className="absolute inset-0 z-20 pointer-events-none" style={{ transform: `translate(${stagePos.x}px, ${stagePos.y}px) scale(${stageScale})`, transformOrigin: '0 0' }}>
            {elements.map(el => {
              if (el.type === 'poll') {
                return <PollWidget key={el.id} id={el.id} x={el.x} y={el.y} pollData={el.pollData!} scale={stageScale} currentUser={username} onUpdate={updateWidget} onDelete={deleteElement} />;
              }
              if (el.type === 'graph') {
                return <GraphWidget key={el.id} id={el.id} x={el.x} y={el.y} graphData={el.graphData!} scale={stageScale} onUpdate={updateWidget} onDelete={deleteElement} />;
              }
              return null;
            })}
          </div>

          <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 z-30 bg-white/95 backdrop-blur-md rounded-2xl shadow-[0_8px_30px_rgba(0,0,0,0.12)] border border-slate-100 flex flex-col md:flex-row items-center p-3 gap-4">
            
            <div className="flex flex-col gap-1">
              <span className="text-[0.6rem] font-bold text-slate-400 uppercase">Outline (Stroke)</span>
              <div className="flex gap-1.5 flex-wrap w-[200px] h-10 overflow-y-auto custom-scrollbar items-center">
                <input type="color" value={strokeColor} onChange={(e) => setStrokeColor(e.target.value)} className="w-5 h-5 cursor-pointer shrink-0 border-0 p-0 rounded-full bg-transparent outline-none overflow-hidden" title="Custom color" />
                {colors.map((c) => (
                  <button key={c} onClick={() => setStrokeColor(c)} className={`w-5 h-5 rounded-full transition-transform hover:scale-125 shrink-0 ${strokeColor === c ? 'shadow-[0_0_0_2px_white,0_0_0_3px_#4338ca] scale-125' : ''} ${c === 'transparent' || c === '#ffffff' ? 'border border-slate-300' : ''}`} style={{ backgroundColor: c !== 'transparent' ? c : '#f1f5f9', position: 'relative' }}>
                    {c === 'transparent' && <div className="absolute inset-0 w-full h-full border-t-2 border-red-500 transform rotate-45 rounded-full" />}
                  </button>
                ))}
              </div>
            </div>
            
            <div className="w-px h-8 bg-slate-200 mx-1 hidden md:block"></div>

            <div className="flex flex-col gap-1">
              <span className="text-[0.6rem] font-bold text-slate-400 uppercase text-slate-800">Fill</span>
              <div className="flex gap-1.5 flex-wrap w-[200px] h-10 overflow-y-auto custom-scrollbar items-center">
                <input type="color" value={fillColor !== 'transparent' ? fillColor : '#000000'} onChange={(e) => setFillColor(e.target.value)} className="w-5 h-5 cursor-pointer shrink-0 border-0 p-0 rounded-full bg-transparent outline-none overflow-hidden" title="Custom fill" />
                {colors.map((c) => (
                  <button key={c} onClick={() => setFillColor(c)} className={`w-5 h-5 rounded-full transition-transform hover:scale-125 shrink-0 ${fillColor === c ? 'shadow-[0_0_0_2px_white,0_0_0_3px_#4338ca] scale-125' : ''} ${c === 'transparent' || c === '#ffffff' ? 'border border-slate-300' : ''}`} style={{ backgroundColor: c !== 'transparent' ? c : '#f1f5f9', position: 'relative' }}>
                    {c === 'transparent' && <div className="absolute inset-0 w-full h-full border-t-2 border-red-500 transform rotate-45 rounded-full" />}
                  </button>
                ))}
              </div>
            </div>

            <div className="w-px h-8 bg-slate-200 mx-1 hidden md:block"></div>

            <div className="flex flex-col gap-1 min-w-[70px]">
              <span className="text-[0.6rem] font-bold text-slate-400 uppercase">Brush Type</span>
              <select value={brushType} onChange={(e: any) => { setBrushType(e.target.value); setActiveTool('pencil'); }} className="p-1 px-2 border border-slate-200 rounded-md text-[0.65rem] font-semibold text-slate-800 outline-none">
                 <option value="marker">Marker</option>
                 <option value="chisel">Chisel</option>
                 <option value="neon">Neon</option>
              </select>
            </div>

            <div className="flex flex-col items-center gap-1 min-w-[80px]">
              <span className="text-[0.6rem] font-bold text-slate-400 uppercase w-full flex justify-between">
                <span>Thickness ({lineWidth}px)</span>
              </span>
              <input 
                type="range" min="1" max="50" 
                value={lineWidth} onChange={(e) => setLineWidth(Number(e.target.value))}
                className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-[#4338ca]"
              />
            </div>
            
            <div className="w-px h-8 bg-slate-200 mx-1 hidden md:block"></div>

            <div className="flex flex-col gap-1">
              <span className="text-[0.6rem] font-bold text-slate-400 uppercase">Style</span>
              <select value={dashStyle} onChange={(e: any) => setDashStyle(e.target.value)} className="p-1 px-2 border border-slate-200 rounded-md text-xs font-semibold focus:outline-indigo-500">
                 <option value="solid">Solid</option>
                 <option value="dashed">Dashed</option>
                 <option value="dotted">Dotted</option>
              </select>
            </div>
          </div>
        </main>

        {isChatOpen && (
          <aside className="w-80 bg-white shadow-[-2px_0_15px_rgba(0,0,0,0.02)] border-l border-slate-200 flex flex-col z-20 shrink-0 absolute md:relative right-0 h-full">
            <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-white shadow-sm z-10">
              <h3 className="font-bold text-slate-800">Team Chat <span className="text-[#4338ca] ml-1 bg-[#e0e7ff] px-2 py-0.5 rounded-full text-xs">{messages.length}</span></h3>
              <button onClick={() => setIsChatOpen(false)} className="md:hidden text-slate-400 hover:text-slate-600 p-1"><LogOut size={16} className="rotate-180"/></button>
            </div>
            <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-4 bg-[#fafafa]">
              {messages.map((msg, idx) => (
                <div key={idx} className={`flex gap-2 ${msg.user === 'SYSTEM' ? 'justify-center mx-auto text-[0.6rem] font-bold text-slate-400 bg-slate-100 px-2 py-1 rounded-full' : (msg.isMe ? 'flex-row-reverse' : 'flex-row')}`}>
                  {msg.user !== 'SYSTEM' && (
                    <>
                      <div className="w-6 h-6 rounded-full bg-slate-200 text-[#4338ca] font-bold flex justify-center items-center text-[0.6rem] flex-shrink-0 mt-1">{msg.user[0].toUpperCase()}</div>
                      <div className={`flex flex-col ${msg.isMe ? 'items-end' : 'items-start'} max-w-[85%]`}>
                        <div className={`flex items-baseline gap-2 mb-0.5 ${msg.isMe ? 'flex-row-reverse' : 'flex-row'}`}><span className="text-[0.65rem] font-bold text-slate-800">{msg.isMe ? 'You' : msg.user}</span><span className="text-[0.6rem] font-medium text-slate-400">{msg.time}</span></div>
                        <div className={`px-3 py-2 text-[0.85rem] rounded-2xl leading-snug break-words ${msg.isMe ? 'bg-[#4338ca] text-white rounded-tr-none' : 'bg-white text-slate-800 rounded-tl-none border border-slate-200'}`}>{msg.text}</div>
                      </div>
                    </>
                  )}
                  {msg.user === 'SYSTEM' && msg.text}
                </div>
              ))}
            </div>
            <div className="p-4 bg-white border-t border-slate-200 shrink-0">
              <form onSubmit={(e) => { e.preventDefault(); if (newMessage.trim()) { const msg = { user: username, text: newMessage, time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }), isMe: true }; setMessages(prev => [...prev, msg]); socket?.emit('chat-message', { roomId, message: { ...msg, isMe: false } }); setNewMessage(''); } }} className="relative flex items-center bg-[#f1f5f9] rounded-2xl border border-transparent focus-within:border-[#4338ca]/30 focus-within:bg-white focus-within:shadow-[0_0_0_4px_#e0e7ff] transition-all">
                <input type="text" value={newMessage} onChange={(e) => setNewMessage(e.target.value)} placeholder="Message team..." className="w-full bg-transparent border-none px-4 py-3 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-0" />
                <button type="submit" className="p-1.5 bg-[#4338ca] text-white rounded-[10px] hover:bg-[#3730a3] disabled:opacity-50 m-1" disabled={!newMessage.trim()}><Send size={16} /></button>
              </form>
            </div>
          </aside>
        )}
      </div>
    </div>
  );
}
