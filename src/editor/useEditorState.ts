import { useReducer, type Dispatch } from 'react';
import { createEmptyDesign, type Design } from '../model/schema';
import { createEditorState, editorReducer, type EditorAction, type EditorState } from './state';

export type EditorDispatch = Dispatch<EditorAction>;

/**
 * The app's document state: the design with undo history, plus the selection.
 * Owned by the app, so the editor and other views (for example the 3D preview) share it.
 */
export function useEditorState(initialDesign?: Design): [EditorState, EditorDispatch] {
  return useReducer(editorReducer, initialDesign ?? null, (design) =>
    createEditorState(design ?? createEmptyDesign()),
  );
}
