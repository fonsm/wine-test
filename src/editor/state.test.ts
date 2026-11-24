import { describe, expect, it } from 'vitest';
import { createEmptyDesign } from '../model/schema';
import { PNG_DATA_URL, sampleDesign } from '../model/testing/fixtures';
import {
  canRedo,
  canUndo,
  createEditorState,
  editorReducer,
  selectedElement,
  type EditorAction,
  type EditorState,
} from './state';

const run = (state: EditorState, ...actions: EditorAction[]) =>
  actions.reduce(editorReducer, state);
const design = (state: EditorState) => state.history.present;
const ids = (state: EditorState) => design(state).elements.map((element) => element.id);

const addText: EditorAction = { type: 'addText', id: 't1', text: 'Riesling', fontFamily: 'Inter' };
const addImage: EditorAction = {
  type: 'addImage',
  elementId: 'i1',
  assetId: 'a1',
  dataUrl: PNG_DATA_URL,
  widthPx: 100,
  heightPx: 50,
};

describe('editorReducer', () => {
  it('starts with the given design and nothing selected', () => {
    const start = createEditorState(sampleDesign());
    expect(design(start)).toEqual(sampleDesign());
    expect(start.selectedId).toBeNull();
    expect(canUndo(start)).toBe(false);
  });

  it('adding text adds and selects it; undo removes it and clears the selection', () => {
    const added = run(createEditorState(createEmptyDesign()), addText);
    expect(ids(added)).toEqual(['t1']);
    expect(added.selectedId).toBe('t1');

    const undone = run(added, { type: 'undo' });
    expect(ids(undone)).toEqual([]);
    expect(undone.selectedId).toBeNull();

    const redone = run(undone, { type: 'redo' });
    expect(ids(redone)).toEqual(['t1']);
  });

  it('adding an image adds the asset and the element in one undo step', () => {
    const added = run(createEditorState(createEmptyDesign()), addImage);
    expect(Object.keys(design(added).assets)).toEqual(['a1']);
    expect(added.selectedId).toBe('i1');
    const undone = run(added, { type: 'undo' });
    expect(design(undone)).toEqual(createEmptyDesign());
  });

  it('add text, add image, move, undo: the move is undone, the elements stay', () => {
    const moved = run(createEditorState(createEmptyDesign()), addText, addImage, {
      type: 'update',
      id: 'i1',
      patch: { x: 1, y: 2 },
    });
    expect(selectedElement(moved)).toMatchObject({ id: 'i1', x: 1, y: 2 });

    const undone = run(moved, { type: 'undo' });
    expect(ids(undone)).toEqual(['t1', 'i1']);
    expect(selectedElement(undone)?.x).not.toBe(1);
    expect(canRedo(undone)).toBe(true);
  });

  it('every drag is its own undo step', () => {
    const state = run(
      createEditorState(createEmptyDesign()),
      addText,
      { type: 'update', id: 't1', patch: { x: 1 } },
      { type: 'update', id: 't1', patch: { x: 2 } },
    );
    expect(selectedElement(run(state, { type: 'undo' }))?.x).toBe(1);
  });

  it('typing into one field is merged into one undo step', () => {
    const state = run(
      createEditorState(createEmptyDesign()),
      addText,
      { type: 'update', id: 't1', patch: { text: 'R' }, merge: true },
      { type: 'update', id: 't1', patch: { text: 'Ro' }, merge: true },
      { type: 'update', id: 't1', patch: { text: 'Rosé' }, merge: true },
    );
    const undone = run(state, { type: 'undo' });
    expect(selectedElement(undone)).toMatchObject({ text: 'Riesling' });
  });

  it('changes to different fields are separate undo steps even when merged', () => {
    const state = run(
      createEditorState(createEmptyDesign()),
      addText,
      { type: 'update', id: 't1', patch: { text: 'Rosé' }, merge: true },
      { type: 'update', id: 't1', patch: { style: { fontSizePt: 30 } }, merge: true },
    );
    expect(selectedElement(run(state, { type: 'undo' }))).toMatchObject({ text: 'Rosé' });
  });

  it('delete removes and deselects; undo brings the element and its image back', () => {
    const start = run(createEditorState(createEmptyDesign()), addImage);
    const deleted = run(start, { type: 'delete', id: 'i1' });
    expect(ids(deleted)).toEqual([]);
    expect(design(deleted).assets).toEqual({});
    expect(deleted.selectedId).toBeNull();

    const undone = run(deleted, { type: 'undo' });
    expect(ids(undone)).toEqual(['i1']);
    expect(Object.keys(design(undone).assets)).toEqual(['a1']);
  });

  it('changes the layer order as an undoable step', () => {
    const state = run(createEditorState(sampleDesign()), {
      type: 'reorder',
      id: 'bg',
      direction: 'front',
    });
    expect(ids(state)).toEqual(['frame', 'title', 'logo', 'bg']);
    expect(ids(run(state, { type: 'undo' }))).toEqual(['bg', 'frame', 'title', 'logo']);
  });

  it('selecting does not create undo steps', () => {
    const state = run(createEditorState(sampleDesign()), { type: 'select', id: 'title' });
    expect(state.selectedId).toBe('title');
    expect(canUndo(state)).toBe(false);
  });

  it('ignores selecting an unknown element', () => {
    expect(
      run(createEditorState(sampleDesign()), { type: 'select', id: 'nope' }).selectedId,
    ).toBeNull();
  });

  it('ignores invalid updates without creating an undo step', () => {
    const start = run(createEditorState(createEmptyDesign()), addText);
    const state = run(start, { type: 'update', id: 't1', patch: { style: { color: 'nope' } } });
    expect(state).toBe(start);
  });

  it('opening a design replaces it and starts a fresh history', () => {
    const state = run(createEditorState(createEmptyDesign()), addText, {
      type: 'load',
      design: sampleDesign(),
    });
    expect(design(state)).toEqual(sampleDesign());
    expect(canUndo(state)).toBe(false);
    expect(state.selectedId).toBeNull();
  });

  it('every state on the undo stack is a valid design', async () => {
    const { designSchema } = await import('../model/schema');
    const state = run(createEditorState(createEmptyDesign()), addText, addImage, {
      type: 'update',
      id: 'i1',
      patch: { rotation: 30, width: 10 },
    });
    for (const snapshot of [...state.history.past, state.history.present]) {
      expect(designSchema.safeParse(snapshot).success).toBe(true);
    }
  });

  it('changing the label size is one undo step; typing a size is merged', () => {
    const start = createEditorState(sampleDesign());
    const state = run(
      start,
      { type: 'resizeLabel', size: { widthMm: 100, heightMm: 120 }, merge: true },
      { type: 'resizeLabel', size: { widthMm: 100, heightMm: 140 }, merge: true },
    );
    expect(design(state).labelSize).toEqual({ widthMm: 100, heightMm: 140 });
    expect(design(run(state, { type: 'undo' }))).toEqual(sampleDesign());
  });

  it('ignores invalid label sizes', () => {
    const start = createEditorState(sampleDesign());
    expect(run(start, { type: 'resizeLabel', size: { widthMm: 5, heightMm: 120 } })).toBe(start);
  });
});
