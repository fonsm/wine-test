import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { createEmptyDesign } from '../model/schema';
import { sampleDesign } from '../model/testing/fixtures';
import type { EditorState } from './state';
import { useEditorState } from './useEditorState';

/** Renders the hook once and returns its state (server rendering, no DOM needed). */
function initialState(...args: Parameters<typeof useEditorState>): EditorState {
  let captured: EditorState | undefined;
  function Probe() {
    [captured] = useEditorState(...args);
    return null;
  }
  renderToStaticMarkup(<Probe />);
  if (!captured) throw new Error('hook did not run');
  return captured;
}

describe('useEditorState', () => {
  it('starts with an empty design and no selection', () => {
    const state = initialState();
    expect(state.history.present).toEqual(createEmptyDesign());
    expect(state.selectedId).toBeNull();
  });

  it('can start with a given design', () => {
    expect(initialState(sampleDesign()).history.present).toEqual(sampleDesign());
  });
});
