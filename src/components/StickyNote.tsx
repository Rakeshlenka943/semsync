import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { Highlighter } from 'lucide-react';
import { useMediaQuery } from '../hooks/useMediaQuery';

export const StickyNote: React.FC = () => {
  const { user } = useAuth();
  const isMobile = useMediaQuery('(max-width: 768px)');
  const [isSaving, setIsSaving] = useState(false);
  const [showHighlighter, setShowHighlighter] = useState(false);
  const editorRef = useRef<HTMLDivElement>(null);
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isInternalChange = useRef(false);
  const [selectionRange, setSelectionRange] = useState<{ start: number; end: number } | null>(null);

  useEffect(() => {
    if (user) {
      const load = async () => {
        const { data, error } = await supabase
          .from('users')
          .select('sticky_note_content')
          .eq('roll_number', user.roll_number)
          .single();
        if (data && editorRef.current) {
          isInternalChange.current = true;
          editorRef.current.innerHTML = data.sticky_note_content || '';
          isInternalChange.current = false;
        }
      };
      load();
    }
  }, [user]);

  const handleInput = () => {
    if (!editorRef.current || isInternalChange.current) return;
    const html = editorRef.current.innerHTML;
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    saveTimeoutRef.current = setTimeout(() => {
      if (user) {
        setIsSaving(true);
        supabase
          .from('users')
          .update({ sticky_note_content: html })
          .eq('roll_number', user.roll_number)
          .then(() => setIsSaving(false));
      }
    }, 500);
  };

  const getSelectionRange = (): { start: number; end: number } | null => {
    const sel = window.getSelection();
    if (!sel || sel.rangeCount === 0) return null;
    const range = sel.getRangeAt(0);
    const preCaretRange = range.cloneRange();
    preCaretRange.selectNodeContents(editorRef.current!);
    preCaretRange.setEnd(range.startContainer, range.startOffset);
    const start = preCaretRange.toString().length;
    const end = start + sel.toString().length;
    return { start, end };
  };

  const handleDoubleClick = () => {
    const sel = window.getSelection();
    if (sel && sel.toString().length > 0) {
      const range = getSelectionRange();
      if (range) setSelectionRange(range);
      setShowHighlighter(true);
    } else {
      setShowHighlighter(false);
      setSelectionRange(null);
    }
  };

  // For mobile: touch selection detection via selectionchange
  useEffect(() => {
    const handleSelectionChange = () => {
      const sel = window.getSelection();
      if (sel && sel.toString().length > 0 && document.activeElement === editorRef.current) {
        const range = getSelectionRange();
        if (range) setSelectionRange(range);
        setShowHighlighter(true);
      } else {
        // Don't hide immediately to allow button click
      }
    };
    document.addEventListener('selectionchange', handleSelectionChange);
    return () => document.removeEventListener('selectionchange', handleSelectionChange);
  }, []);

  const applyHighlight = () => {
    if (!editorRef.current || !selectionRange) {
      setShowHighlighter(false);
      return;
    }
    const sel = window.getSelection();
    if (!sel || sel.toString().length === 0) {
      setShowHighlighter(false);
      return;
    }
    try {
      // Use execCommand as fallback, but we'll also manually wrap
      document.execCommand('hiliteColor', false, '#00FF66');
      document.execCommand('foreColor', false, '#000000');
    } catch (e) {
      // Fallback: wrap selected text with span
      const range = sel.getRangeAt(0);
      const span = document.createElement('span');
      span.style.backgroundColor = '#00FF66';
      span.style.color = '#000000';
      span.style.padding = '2px 0';
      range.surroundContents(span);
    }
    setShowHighlighter(false);
    setSelectionRange(null);
    handleInput();
  };

  const handleBlur = () => {
    setTimeout(() => {
      setShowHighlighter(false);
      setSelectionRange(null);
    }, 200);
  };

  return (
    <div
      className="mx-2 my-2 p-3 rounded-lg shadow-md relative"
      style={{
        backgroundColor: '#FDFD96',
        color: '#2C2520',
        maxWidth: isMobile ? '100%' : '32rem',
        marginLeft: isMobile ? '0.5rem' : 'auto',
        marginRight: isMobile ? '0.5rem' : 'auto',
      }}
    >
      <div className="flex justify-between items-center mb-1">
        <span className="text-xs font-medium">📌 Quick Note</span>
        {isSaving && <span className="text-xs opacity-60">Saving...</span>}
      </div>
      <div
        ref={editorRef}
        contentEditable
        onInput={handleInput}
        onDoubleClick={handleDoubleClick}
        onBlur={handleBlur}
        className="w-full outline-none resize-none text-sm min-h-[80px]"
        style={{ color: '#2C2520', fontSize: isMobile ? '16px' : '14px' }}
        suppressContentEditableWarning
      />
      {showHighlighter && (
        <button
          className="absolute -top-4 -right-4 p-2 rounded-full shadow-lg z-10 transition hover:scale-110 flex items-center gap-1"
          style={{ backgroundColor: '#00FF66', color: '#000' }}
          onMouseDown={(e) => e.preventDefault()}
          onClick={applyHighlight}
          title="Highlight selected text"
        >
          <Highlighter size={16} />
          <span className="text-xs font-medium">Highlight</span>
        </button>
      )}
    </div>
  );
};
