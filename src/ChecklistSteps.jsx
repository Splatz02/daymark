import React, { useId, useRef, useState } from 'react';
import { GripVertical, X } from 'lucide-react';
import './checklist.css';

export function ChecklistSteps({ checklist, onChange, checksDisabled }) {
  const instructions = useId();
  const source = useRef(null), handles = useRef(new Map());
  const [dragging, setDragging] = useState(null), [target, setTarget] = useState(null), [announcement, setAnnouncement] = useState('');

  function endDrag() { source.current = null; setDragging(null); setTarget(null); }
  function placement(event, id) {
    const rect = event.currentTarget.getBoundingClientRect();
    return { id, after: event.clientY >= rect.top + rect.height / 2 };
  }
  function drop(event, id) {
    if (!source.current) return;
    event.preventDefault();
    const moving = source.current, destination = placement(event, id);
    if (moving !== id) onChange(list => {
      const step = list.find(c => c.id === moving), rest = list.filter(c => c.id !== moving);
      const index = rest.findIndex(c => c.id === destination.id);
      if (!step || index < 0) return list;
      rest.splice(index + Number(destination.after), 0, step);
      return rest;
    });
    endDrag();
  }
  function moveWithKeys(event, id) {
    if (!['ArrowUp', 'ArrowDown'].includes(event.key)) return;
    event.preventDefault();
    const index = checklist.findIndex(c => c.id === id), next = index + (event.key === 'ArrowUp' ? -1 : 1);
    if (next < 0 || next >= checklist.length) return;
    const reordered = [...checklist], [step] = reordered.splice(index, 1);
    reordered.splice(next, 0, step);
    onChange(reordered);
    setAnnouncement(`${step.title || 'Step'} moved to position ${next + 1} of ${checklist.length}.`);
    requestAnimationFrame(() => handles.current.get(id)?.focus({ preventScroll: true }));
  }

  return <>
    <span id={instructions} className="checklist-sr-only">Drag to reorder, or use the up and down arrow keys to move this step.</span>
    <div className="checklist-steps" role="list" aria-label="Checklist steps" onDragLeave={event => { if (!event.currentTarget.contains(event.relatedTarget)) setTarget(null); }}>
      {checklist.map((step, index) => <div key={step.id} role="listitem" className={'edit-check' + (dragging === step.id ? ' is-dragging' : '') + (target?.id === step.id && dragging !== step.id ? (target.after ? ' drop-after' : ' drop-before') : '')}
        onDragOver={event => { if (source.current) { event.preventDefault(); event.dataTransfer.dropEffect = 'move'; setTarget(placement(event, step.id)); } }}
        onDrop={event => drop(event, step.id)}>
        <button type="button" className="checklist-drag-handle" draggable aria-label={`Reorder step ${index + 1}`} aria-describedby={instructions} title="Drag to reorder · ↑ / ↓ to move"
          ref={node => { if (node) handles.current.set(step.id, node); else handles.current.delete(step.id); }}
          onKeyDown={event => moveWithKeys(event, step.id)} onDragEnd={endDrag}
          onDragStart={event => {
            source.current = step.id; setDragging(step.id);
            event.dataTransfer.effectAllowed = 'move'; event.dataTransfer.setData('application/x-daymark-checklist-step', step.id);
            const row = event.currentTarget.closest('.edit-check'), rect = row.getBoundingClientRect();
            event.dataTransfer.setDragImage(row, event.clientX - rect.left, event.clientY - rect.top);
          }}><GripVertical size={15} aria-hidden="true" /></button>
        <input aria-label={`Complete step ${index + 1}`} type="checkbox" checked={step.checked} disabled={checksDisabled} onChange={() => onChange(list => list.map(c => c.id === step.id ? { ...c, checked: !c.checked } : c))} />
        <input aria-label={`Step ${index + 1}`} value={step.title} onChange={event => onChange(list => list.map(c => c.id === step.id ? { ...c, title: event.target.value } : c))} />
        <button type="button" aria-label={`Remove step ${index + 1}`} onClick={() => onChange(list => list.filter(c => c.id !== step.id))}><X size={14} /></button>
      </div>)}
    </div>
    <span className="checklist-sr-only" role="status" aria-live="polite">{announcement}</span>
  </>;
}
