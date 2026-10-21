import React, { useEffect, useId, useRef, useState } from 'react';
import { GripVertical, X } from 'lucide-react';
import './checklist.css';

export function ChecklistSteps({ checklist, onChange, checksDisabled }) {
  const instructions = useId();
  const source = useRef(null), handles = useRef(new Map()), listElement = useRef(null), scrollFrame = useRef(null);
  const [dragging, setDragging] = useState(null), [target, setTarget] = useState(null), [announcement, setAnnouncement] = useState('');
  const [preview, setPreview] = useState(null);
  useEffect(() => () => cancelAnimationFrame(scrollFrame.current), []);

  function endDrag() { cancelAnimationFrame(scrollFrame.current); source.current = null; setDragging(null); setTarget(null); setPreview(null); }
  function placement(x, y) {
    const row = document.elementFromPoint(x, y)?.closest('[data-checklist-step]');
    if (!row || !listElement.current?.contains(row)) return null;
    const rect = row.getBoundingClientRect();
    return { id: row.dataset.checklistStep, after: y >= rect.top + rect.height / 2 };
  }
  function autoScroll() {
    const drag = source.current, modal = listElement.current?.closest('.modal');
    if (!drag?.active || !modal) return;
    const rect = modal.getBoundingClientRect(), listRect = listElement.current.getBoundingClientRect();
    if (drag.x >= rect.left && drag.x <= rect.right) {
      const speed = drag.y < rect.top + 48 && listRect.top < rect.top + 20 ? -12 : drag.y > rect.bottom - 48 && listRect.bottom > rect.bottom - 20 ? 12 : 0;
      if (speed) { modal.scrollTop += speed; setTarget(placement(drag.x, drag.y)); }
    }
    scrollFrame.current = requestAnimationFrame(autoScroll);
  }
  function startDrag(event, step) {
    if (event.button !== 0) return;
    event.preventDefault(); event.currentTarget.focus(); event.currentTarget.setPointerCapture(event.pointerId);
    source.current = { id: step.id, title: step.title, startX: event.clientX, startY: event.clientY, x: event.clientX, y: event.clientY, active: false };
  }
  function moveDrag(event) {
    const drag = source.current;
    if (!drag) return;
    drag.x = event.clientX; drag.y = event.clientY;
    if (!drag.active) {
      if (Math.hypot(drag.x - drag.startX, drag.y - drag.startY) < 4) return;
      drag.active = true; setDragging(drag.id); scrollFrame.current = requestAnimationFrame(autoScroll);
    }
    setTarget(placement(drag.x, drag.y));
    setPreview({ title: drag.title, x: Math.max(8, Math.min(drag.x + 14, window.innerWidth - 260)), y: Math.max(8, Math.min(drag.y + 14, window.innerHeight - 44)) });
  }
  function drop(event) {
    const drag = source.current, destination = placement(event.clientX, event.clientY);
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
    if (drag?.active && destination && drag.id !== destination.id) onChange(list => {
      const moving = drag.id;
      const step = list.find(c => c.id === moving), rest = list.filter(c => c.id !== moving);
      const index = rest.findIndex(c => c.id === destination.id);
      if (!step || index < 0) return list;
      rest.splice(index + Number(destination.after), 0, step);
      return rest;
    });
    endDrag();
  }
  function moveWithKeys(event, id) {
    if (event.key === 'Escape' && source.current) {
      event.preventDefault(); event.stopPropagation(); endDrag(); return;
    }
    if (!['ArrowUp', 'ArrowDown'].includes(event.key)) return;
    event.preventDefault();
    const index = checklist.findIndex(c => c.id === id), next = index + (event.key === 'ArrowUp' ? -1 : 1);
    if (next < 0 || next >= checklist.length) return;
    const reordered = [...checklist], [step] = reordered.splice(index, 1);
    reordered.splice(next, 0, step);
    onChange(reordered);
    setAnnouncement(`${step.title || 'Step'} moved to position ${next + 1} of ${checklist.length}.`);
    requestAnimationFrame(() => { const handle = handles.current.get(id); handle?.focus({ preventScroll: true }); handle?.scrollIntoView({ block: 'nearest' }); });
  }

  return <>
    <span id={instructions} className="checklist-sr-only">Drag to reorder, or use the up and down arrow keys to move this step.</span>
    <div ref={listElement} className="checklist-steps" role="list" aria-label="Checklist steps">
      {checklist.map((step, index) => <div key={step.id} role="listitem" data-checklist-step={step.id} className={'edit-check' + (dragging === step.id ? ' is-dragging' : '') + (target?.id === step.id && dragging !== step.id ? (target.after ? ' drop-after' : ' drop-before') : '')}>
        <button type="button" className="checklist-drag-handle" aria-label={`Reorder step ${index + 1}`} aria-describedby={instructions} title="Drag to reorder · ↑ / ↓ to move"
          ref={node => { if (node) handles.current.set(step.id, node); else handles.current.delete(step.id); }}
          onKeyDown={event => moveWithKeys(event, step.id)} onPointerDown={event => startDrag(event, step)} onPointerMove={moveDrag} onPointerUp={drop} onPointerCancel={endDrag} onLostPointerCapture={endDrag}><GripVertical size={15} aria-hidden="true" /></button>
        <input aria-label={`Complete step ${index + 1}`} type="checkbox" checked={step.checked} disabled={checksDisabled} onChange={() => onChange(list => list.map(c => c.id === step.id ? { ...c, checked: !c.checked } : c))} />
        <input aria-label={`Step ${index + 1}`} value={step.title} onChange={event => onChange(list => list.map(c => c.id === step.id ? { ...c, title: event.target.value } : c))} />
        <button type="button" aria-label={`Remove step ${index + 1}`} onClick={() => onChange(list => list.filter(c => c.id !== step.id))}><X size={14} /></button>
      </div>)}
    </div>
    {preview && <div className="checklist-drag-preview" aria-hidden="true" style={{ left: preview.x, top: preview.y }}><GripVertical size={14}/><span>{preview.title || 'Untitled step'}</span></div>}
    <span className="checklist-sr-only" role="status" aria-live="polite">{announcement}</span>
  </>;
}
