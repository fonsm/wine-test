// Editor state: the design (with undo history) is the only document state. The selection is
// view state and is never saved or put on the undo stack.
import { designSchema, type Design, type DesignElement } from '../model/schema';
import type { LabelSize } from '../print/geometry';
import {
  commit,
  createHistory,
  redo,
  undo,
  canRedo as historyCanRedo,
  canUndo as historyCanUndo,
  type History,
} from './history';
import {
  addImageElement,
  addTextElement,
  deleteElement,
  reorderElement,
  resizeLabel,
  updateElement,
  type ElementPatch,
  type LayerDirection,
} from './operations';

export interface EditorState {
  history: History<Design>;
  selectedId: string | null;
}

export type EditorAction =
  | { type: 'addText'; id: string; text: string; fontFamily: string }
  | {
      type: 'addImage';
      elementId: string;
      assetId: string;
      dataUrl: string;
      widthPx: number;
      heightPx: number;
    }
  /** `merge`: consecutive changes to the same fields of the same element become one undo step (typing). */
  | { type: 'update'; id: string; patch: ElementPatch; merge?: boolean }
  | { type: 'delete'; id: string }
  | { type: 'reorder'; id: string; direction: LayerDirection }
  /** `merge`: typing a size into the fields becomes one undo step. */
  | { type: 'resizeLabel'; size: LabelSize; merge?: boolean }
  | { type: 'select'; id: string | null }
  | { type: 'undo' }
  | { type: 'redo' }
  /** Replaces the label with a template (one undo step); the chosen bottle stays. */
  | { type: 'applyTemplate'; design: Design }
  | { type: 'setBottle'; bottleId: string }
  /** Replaces the design (opened from a file) and starts a fresh history. */
  | { type: 'load'; design: Design };

export function createEditorState(design: Design): EditorState {
  return { history: createHistory(design), selectedId: null };
}

const hasElement = (design: Design, id: string | null): id is string =>
  id !== null && design.elements.some((element) => element.id === id);

/** Keeps the selection only if the element still exists (for example after undo). */
function withHistory(
  state: EditorState,
  history: History<Design>,
  selectedId = state.selectedId,
): EditorState {
  if (history === state.history && selectedId === state.selectedId) return state;
  return { history, selectedId: hasElement(history.present, selectedId) ? selectedId : null };
}

function mergeKey(id: string, patch: ElementPatch): string {
  const fields = Object.keys(patch).filter((key) => key !== 'style');
  const styleFields = Object.keys(patch.style ?? {}).map((key) => `style.${key}`);
  return `update:${id}:${[...fields, ...styleFields].sort().join(',')}`;
}

export function editorReducer(state: EditorState, action: EditorAction): EditorState {
  const design = state.history.present;
  switch (action.type) {
    case 'addText':
      return withHistory(state, commit(state.history, addTextElement(design, action)), action.id);
    case 'addImage': {
      const next = addImageElement(design, action);
      // The image data comes from outside the editor: validate the whole design once.
      if (!designSchema.safeParse(next).success) return state;
      return withHistory(state, commit(state.history, next), action.elementId);
    }
    case 'update': {
      const next = updateElement(design, action.id, action.patch);
      const key = action.merge ? mergeKey(action.id, action.patch) : undefined;
      return withHistory(state, commit(state.history, next, key));
    }
    case 'delete':
      return withHistory(state, commit(state.history, deleteElement(design, action.id)));
    case 'reorder':
      return withHistory(
        state,
        commit(state.history, reorderElement(design, action.id, action.direction)),
      );
    case 'resizeLabel':
      return withHistory(
        state,
        commit(
          state.history,
          resizeLabel(design, action.size),
          action.merge ? 'resizeLabel' : undefined,
        ),
      );
    case 'select':
      return action.id === null || hasElement(design, action.id)
        ? { ...state, selectedId: action.id }
        : state;
    case 'undo':
      return withHistory(state, undo(state.history));
    case 'redo':
      return withHistory(state, redo(state.history));
    case 'applyTemplate': {
      const next = { ...action.design, bottleId: design.bottleId };
      if (!designSchema.safeParse(next).success) return state;
      return withHistory(state, commit(state.history, next), null);
    }
    case 'setBottle':
      if (action.bottleId === design.bottleId) return state;
      return withHistory(state, commit(state.history, { ...design, bottleId: action.bottleId }));
    case 'load':
      return createEditorState(action.design);
  }
}

export const canUndo = (state: EditorState): boolean => historyCanUndo(state.history);
export const canRedo = (state: EditorState): boolean => historyCanRedo(state.history);

export function selectedElement(state: EditorState): DesignElement | null {
  return state.history.present.elements.find((element) => element.id === state.selectedId) ?? null;
}
