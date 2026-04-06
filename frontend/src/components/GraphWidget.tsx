import { useState } from 'react';
import { Rnd } from 'react-rnd';
import { BarChart, Bar, PieChart, Pie, Cell, Tooltip, ResponsiveContainer, XAxis, YAxis } from 'recharts';

export interface GraphData {
  type: 'bar' | 'pie';
  dataPoints: { name: string; value: number }[];
  title: string;
}

export interface GraphWidgetProps {
  id: string;
  x: number;
  y: number;
  graphData: GraphData;
  scale: number;
  onUpdate: (id: string, newProps: any) => void;
  onDelete: (id: string) => void;
}

const COLORS = ['#4f46e5', '#ec4899', '#14b8a6', '#f59e0b', '#3b82f6', '#8b5cf6'];

export default function GraphWidget({ id, x, y, graphData, scale, onUpdate, onDelete }: GraphWidgetProps) {
  const [isEditing, setIsEditing] = useState(graphData.dataPoints.length === 0);
  const [tempTitle, setTempTitle] = useState(graphData.title || '');
  const [tempInput, setTempInput] = useState(
    graphData.dataPoints.map(d => `${d.name}:${d.value}`).join(', ')
  );
  const [tempType, setTempType] = useState<'bar' | 'pie'>(graphData.type);

  const startDragging = (e: any) => {
    e.stopPropagation();
  };

  const handleSave = () => {
    if (!tempTitle.trim() || !tempInput.trim()) return;
    
    // Parse input "Apples:10, Bananas:20"
    const parsedData = tempInput.split(',').map(item => {
      const parts = item.split(':');
      if (parts.length === 2) {
        return { name: parts[0].trim(), value: parseFloat(parts[1].trim()) || 0 };
      }
      return { name: item.trim(), value: 1 };
    }).filter(d => d.name);

    onUpdate(id, {
      graphData: {
        title: tempTitle,
        type: tempType,
        dataPoints: parsedData
      }
    });
    setIsEditing(false);
  };

  return (
    <Rnd
      size={{ width: 350, height: 350 }}
      position={{ x, y }}
      onDragStop={(_e, d) => onUpdate(id, { x: d.x, y: d.y })}
      enableResizing={false}
      scale={scale}
      cancel=".nodrag"
      className="absolute z-30"
      onMouseDown={startDragging}
      onTouchStart={startDragging}
    >
      <div className="bg-white rounded-xl shadow-xl border border-slate-200 overflow-hidden flex flex-col h-full pointer-events-auto">
        <div className="bg-pink-600 text-white px-4 py-2 flex justify-between items-center cursor-move handle shrink-0">
          <span className="font-bold text-sm">Graph</span>
          <button className="nodrag text-pink-200 hover:text-white" onClick={() => onDelete(id)}>✕</button>
        </div>
        
        <div className="p-4 flex flex-col gap-3 nodrag flex-1 overflow-hidden">
          {isEditing ? (
            <div className="flex flex-col gap-3 h-full justify-center">
              <input
                className="border border-slate-200 rounded px-2 py-1.5 text-sm font-semibold text-slate-800 focus:outline-pink-500"
                placeholder="Graph Title"
                value={tempTitle}
                onChange={e => setTempTitle(e.target.value)}
              />
              
              <div className="flex gap-2">
                <button 
                  className={`flex-1 py-1 text-sm rounded font-semibold ${tempType === 'bar' ? 'bg-pink-100 text-pink-700 border border-pink-200' : 'bg-slate-100 text-slate-600'}`}
                  onClick={() => setTempType('bar')}
                >Bar</button>
                <button 
                  className={`flex-1 py-1 text-sm rounded font-semibold ${tempType === 'pie' ? 'bg-pink-100 text-pink-700 border border-pink-200' : 'bg-slate-100 text-slate-600'}`}
                  onClick={() => setTempType('pie')}
                >Pie</button>
              </div>

              <textarea
                className="border border-slate-200 rounded px-2 py-1.5 text-sm text-slate-800 focus:outline-pink-500 resize-none h-24"
                placeholder="Data format: Name:Value, Name:Value&#10;e.g. Yes:10, No:5, Maybe:2"
                value={tempInput}
                onChange={e => setTempInput(e.target.value)}
              />
              
              <button
                className="bg-pink-600 text-white rounded px-3 py-1.5 text-sm font-bold mt-auto"
                onClick={handleSave}
              >
                Render Graph
              </button>
            </div>
          ) : (
             <div className="flex flex-col h-full nodrag" onDoubleClick={() => setIsEditing(true)}>
               <h4 className="font-bold text-slate-800 text-center text-sm mb-2">{graphData.title}</h4>
               <div className="flex-1 w-full min-h-0">
                 <ResponsiveContainer width="100%" height="100%">
                   {graphData.type === 'bar' ? (
                     <BarChart data={graphData.dataPoints} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                       <XAxis dataKey="name" tick={{ fontSize: 10 }} interval={0} />
                       <YAxis tick={{ fontSize: 10 }} />
                       <Tooltip cursor={{fill: 'rgba(0,0,0,0.05)'}} />
                       <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                         {graphData.dataPoints.map((_, index) => (
                           <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                         ))}
                       </Bar>
                     </BarChart>
                   ) : (
                     <PieChart>
                       <Tooltip />
                       <Pie
                         data={graphData.dataPoints}
                         cx="50%"
                         cy="50%"
                         outerRadius={80}
                         dataKey="value"
                         nameKey="name"
                         label={({ name, percent }) => `${name} ${((percent || 0) * 100).toFixed(0)}%`}
                         labelLine={false}
                         style={{fontSize: '10px'}}
                       >
                         {graphData.dataPoints.map((_, index) => (
                           <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                         ))}
                       </Pie>
                     </PieChart>
                   )}
                 </ResponsiveContainer>
               </div>
               <div className="text-[10px] text-slate-400 text-center mt-2">Double-click to edit data</div>
             </div>
          )}
        </div>
      </div>
    </Rnd>
  );
}
