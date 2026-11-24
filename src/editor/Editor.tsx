import { useId, useRef, type KeyboardEvent } from 'react';
import { DEFAULT_FONT_FAMILY } from '../fonts/fonts';
import { useT } from '../i18n/I18nContext';
import { DesignFileControls } from '../model/DesignFileControls';
import { UploadField } from '../upload/UploadField';
import type { CleanImage } from '../upload/types';
import './editor.css';
import { blobToDataUrl, newId } from './ids';
import { LabelCanvas } from './LabelCanvas';
import { LabelSizePanel } from './LabelSizePanel';
import { LayersPanel } from './LayersPanel';
import type { ElementPatch } from './operations';
import { PropertiesPanel } from './PropertiesPanel';
import { canRedo, canUndo, selectedElement, type EditorState } from './state';
import type { EditorDispatch } from './useEditorState';

const NUDGE_MM = 1;
const NUDGE_LARGE_MM = 10;

const ARROWS: Readonly<Record<string, [number, number]>> = {
  ArrowLeft: [-1, 0],
  ArrowRight: [1, 0],
  ArrowUp: [0, -1],
  ArrowDown: [0, 1],
};

/** Keys typed into form fields belong to the field (including the browser's own undo). */
function isFormField(target: EventTarget): boolean {
  return (
    target instanceof HTMLElement &&
    (target.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName))
  );
}

interface EditorProps {
  /** Document state from useEditorState, owned by the app. */
  state: EditorState;
  dispatch: EditorDispatch;
}

export function Editor({ state, dispatch }: EditorProps) {
  const t = useT();
  const design = state.history.present;
  const selected = selectedElement(state);
  const textFieldRef = useRef<HTMLTextAreaElement>(null);
  const helpId = useId();

  function update(patch: ElementPatch, merge = false) {
    if (selected) dispatch({ type: 'update', id: selected.id, patch, merge });
  }

  async function addImage(image: CleanImage) {
    const dataUrl = await blobToDataUrl(image.blob);
    dispatch({
      type: 'addImage',
      elementId: newId(),
      assetId: newId(),
      dataUrl,
      widthPx: image.width,
      heightPx: image.height,
    });
  }

  function handleKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (isFormField(event.target)) return;
    const command = event.ctrlKey || event.metaKey;
    const key = event.key.toLowerCase();

    if (command && key === 'z') {
      dispatch({ type: event.shiftKey ? 'redo' : 'undo' });
    } else if (command && key === 'y') {
      dispatch({ type: 'redo' });
    } else if (selected && (event.key === 'Delete' || event.key === 'Backspace')) {
      dispatch({ type: 'delete', id: selected.id });
    } else if (selected && event.key === 'Escape') {
      dispatch({ type: 'select', id: null });
    } else if (selected && !command && event.key in ARROWS) {
      const [dx, dy] = ARROWS[event.key] ?? [0, 0];
      const step = event.shiftKey ? NUDGE_LARGE_MM : NUDGE_MM;
      // Nudges in a row become one undo step.
      update({ x: selected.x + dx * step, y: selected.y + dy * step }, true);
    } else {
      return;
    }
    event.preventDefault();
  }

  return (
    // Keyboard shortcuts for everything inside the editor (they bubble up to here).
    <div className="editor" onKeyDown={handleKeyDown}>
      <div className="editor-toolbar">
        <button
          type="button"
          onClick={() => {
            dispatch({
              type: 'addText',
              id: newId(),
              text: t('editor:defaultText'),
              fontFamily: DEFAULT_FONT_FAMILY,
            });
          }}
        >
          {t('editor:addText')}
        </button>
        <button
          type="button"
          disabled={!canUndo(state)}
          onClick={() => {
            dispatch({ type: 'undo' });
          }}
        >
          {t('editor:undo')}
        </button>
        <button
          type="button"
          disabled={!canRedo(state)}
          onClick={() => {
            dispatch({ type: 'redo' });
          }}
        >
          {t('editor:redo')}
        </button>
        <button
          type="button"
          disabled={!selected}
          onClick={() => {
            if (selected) dispatch({ type: 'delete', id: selected.id });
          }}
        >
          {t('editor:delete')}
        </button>
      </div>

      <div className="editor-upload">
        <UploadField labelSize={design.labelSize} onImage={(image) => void addImage(image)} />
      </div>

      <div className="editor-stage">
        <LabelCanvas
          design={design}
          selectedId={state.selectedId}
          label={t('editor:canvasLabel')}
          helpId={helpId}
          onSelect={(id) => {
            dispatch({ type: 'select', id });
          }}
          onChange={(id, patch) => {
            dispatch({ type: 'update', id, patch });
          }}
          onEditText={(id) => {
            dispatch({ type: 'select', id });
            // Wait for the panel to show this element's text field.
            requestAnimationFrame(() => textFieldRef.current?.focus());
          }}
        />
        <p id={helpId} className="editor-hint">
          {t('editor:canvasHelp')}
        </p>
      </div>

      <div className="editor-panel">
        <LabelSizePanel
          size={design.labelSize}
          onChange={(size, merge) => {
            dispatch({ type: 'resizeLabel', size, merge });
          }}
        />
        <PropertiesPanel
          element={selected}
          textFieldRef={textFieldRef}
          onChange={update}
          onReorder={(direction) => {
            if (selected) dispatch({ type: 'reorder', id: selected.id, direction });
          }}
        />
        <LayersPanel
          elements={design.elements}
          selectedId={state.selectedId}
          onSelect={(id) => {
            dispatch({ type: 'select', id });
          }}
        />
        <DesignFileControls
          design={design}
          onLoad={(loaded) => {
            dispatch({ type: 'load', design: loaded });
          }}
        />
      </div>
    </div>
  );
}
