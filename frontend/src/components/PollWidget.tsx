import { useState, useEffect } from 'react';
import { Rnd } from 'react-rnd';

export interface PollData {
  question: string;
  options: { text: string; votes: number }[];
  votedBy: string[]; // store usernames or user ids who voted
}

export interface PollWidgetProps {
  id: string;
  x: number;
  y: number;
  width?: number;
  height?: number;
  pollData: PollData;
  scale: number;
  currentUser: string;
  onUpdate: (id: string, newProps: any) => void;
  onDelete: (id: string) => void;
}

export default function PollWidget({ id, x, y, width, height, pollData, scale, currentUser, onUpdate, onDelete }: PollWidgetProps) {
  const [isEditing, setIsEditing] = useState(!pollData.question);
  const [tempQuestion, setTempQuestion] = useState(pollData.question || '');
  const [tempOptions, setTempOptions] = useState<string[]>(
    pollData.options.length ? pollData.options.map(o => o.text) : ['', '']
  );

  useEffect(() => {
    if (pollData.question) {
      setIsEditing(false);
    }
  }, [pollData.question, pollData.votedBy]);

  const startDragging = (e: any) => {
    e.stopPropagation();
  };

  const handleSave = () => {
    if (!tempQuestion.trim() || tempOptions.some(o => !o.trim())) return;
    onUpdate(id, {
      pollData: {
        ...pollData,
        question: tempQuestion,
        options: tempOptions.map(t => ({ text: t, votes: 0 })),
        votedBy: []
      }
    });
    setIsEditing(false);
  };

  const handleVote = (index: number) => {
    if (pollData.votedBy.includes(currentUser)) return;
    
    const newOptions = [...pollData.options];
    newOptions[index].votes += 1;
    
    onUpdate(id, {
      pollData: {
        ...pollData,
        options: newOptions,
        votedBy: [...pollData.votedBy, currentUser]
      }
    });
  };

  const totalVotes = pollData.options.reduce((acc, opt) => acc + opt.votes, 0);

  return (
    <Rnd
      size={{ width: width || 300, height: height || 'auto' }}
      position={{ x, y }}
      onDragStop={(_e, d) => onUpdate(id, { x: d.x, y: d.y })}
      onResizeStop={(_e, _dir, ref, _delta, position) => {
        onUpdate(id, {
          width: parseInt(ref.style.width, 10),
          height: parseInt(ref.style.height, 10) || undefined,
          x: position.x,
          y: position.y
        });
      }}
      enableResizing={true}
      scale={scale}
      cancel=".nodrag"
      className="absolute z-30 pointer-events-auto"
      onMouseDown={startDragging}
      onTouchStart={startDragging}
    >
      <div className="bg-white rounded-xl shadow-xl border border-slate-200 overflow-hidden flex flex-col pointer-events-auto">
        <div className="bg-indigo-600 text-white px-4 py-2 flex justify-between items-center cursor-move handle">
          <span className="font-bold text-sm">Poll</span>
          <button className="nodrag text-indigo-200 hover:text-white" onClick={() => onDelete(id)}>✕</button>
        </div>
        
        <div className="p-4 flex flex-col gap-3 nodrag">
          {isEditing ? (
            <>
              <input
                className="border border-slate-200 rounded px-2 py-1 text-sm font-semibold text-slate-800 focus:outline-indigo-500"
                placeholder="Ask a question..."
                value={tempQuestion}
                onChange={e => {
                  setTempQuestion(e.target.value);
                  onUpdate(id, {
                    pollData: {
                      ...pollData,
                      question: e.target.value,
                      options: tempOptions.map(t => ({ text: t, votes: 0 })),
                      votedBy: []
                    }
                  });
                }}
              />
              {tempOptions.map((opt, i) => (
                <div key={i} className="flex gap-2">
                  <input
                    className="border border-slate-200 rounded px-2 py-1 text-sm text-slate-800 flex-1 focus:outline-indigo-500"
                    placeholder={`Option ${i + 1}`}
                    value={opt}
                    onChange={e => {
                      const newOpts = [...tempOptions];
                      newOpts[i] = e.target.value;
                      setTempOptions(newOpts);
                      onUpdate(id, {
                        pollData: {
                          ...pollData,
                          question: tempQuestion,
                          options: newOpts.map(t => ({ text: t, votes: 0 })),
                          votedBy: []
                        }
                      });
                    }}
                  />
                  {tempOptions.length > 2 && (
                    <button className="text-red-500" onClick={() => setTempOptions(tempOptions.filter((_, idx) => idx !== i))}>-</button>
                  )}
                </div>
              ))}
              <button 
                className="text-xs text-indigo-600 text-left font-semibold hover:underline"
                onClick={() => setTempOptions([...tempOptions, ''])}
              >
                + Add Option
              </button>
              <button
                className="bg-indigo-600 text-white rounded px-3 py-1.5 text-sm font-bold mt-2"
                onClick={handleSave}
              >
                Create Poll
              </button>
            </>
          ) : (
             <>
               <h4 className="font-bold text-slate-800 mb-2">{pollData.question}</h4>
               <div className="flex flex-col gap-2">
                 {pollData.options.map((opt, i) => {
                   const percent = totalVotes === 0 ? 0 : Math.round((opt.votes / totalVotes) * 100);
                   const hasVoted = pollData.votedBy.includes(currentUser);
                   return (
                     <div key={i} className="relative bg-slate-100 rounded-lg overflow-hidden group">
                       <div 
                         className="absolute top-0 left-0 h-full bg-indigo-100 transition-all duration-300 pointer-events-none" 
                         style={{ width: `${percent}%` }}
                       />
                       <button
                         onClick={() => handleVote(i)}
                         disabled={hasVoted}
                         className={`relative w-full text-left px-3 py-2 text-sm z-10 flex justify-between ${hasVoted ? 'cursor-default text-slate-800' : 'hover:bg-slate-200/50 cursor-pointer'}`}
                       >
                         <span className="font-medium truncate pr-4">{opt.text}</span>
                         {hasVoted && <span className="font-bold text-indigo-600 text-xs my-auto">{percent}%</span>}
                       </button>
                     </div>
                   );
                 })}
               </div>
               <div className="text-xs text-slate-400 mt-1 flex justify-between">
                 <span>{totalVotes} votes</span>
                 {pollData.votedBy.includes(currentUser) && <span className="text-indigo-500 font-semibold">You voted</span>}
               </div>
             </>
          )}
        </div>
      </div>
    </Rnd>
  );
}
