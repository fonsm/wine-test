import { useId, type Ref } from 'react';
import { useT } from '../i18n/I18nContext';
import { FONTS } from '../fonts/fonts';
import type { DesignElement, TextElement } from '../model/schema';
import { NumberField } from './NumberField';
import type { ElementPatch, LayerDirection } from './operations';

interface PropertiesPanelProps {
  element: DesignElement | null;
  /** `merge`: typing into a field becomes one undo step. */
  onChange: (patch: ElementPatch, merge: boolean) => void;
  onReorder: (direction: LayerDirection) => void;
  textFieldRef: Ref<HTMLTextAreaElement>;
}

export function PropertiesPanel({
  element,
  onChange,
  onReorder,
  textFieldRef,
}: PropertiesPanelProps) {
  const t = useT();
  const headingId = useId();
  return (
    <section className="editor-section" aria-labelledby={headingId}>
      <h2 id={headingId}>{t('editor:properties')}</h2>
      {!element ? (
        <p className="editor-hint">{t('editor:noSelection')}</p>
      ) : (
        // Re-mount per element so drafts never leak from one element to another.
        <div key={element.id} className="editor-fields">
          {element.type === 'text' && (
            <TextFields element={element} onChange={onChange} textFieldRef={textFieldRef} />
          )}
          <div className="editor-grid">
            <NumberField
              label={t('editor:fields.x')}
              value={element.x}
              step={0.5}
              onCommit={(x) => {
                onChange({ x }, true);
              }}
            />
            <NumberField
              label={t('editor:fields.y')}
              value={element.y}
              step={0.5}
              onCommit={(y) => {
                onChange({ y }, true);
              }}
            />
            <NumberField
              label={t('editor:fields.width')}
              value={element.width}
              step={0.5}
              min={1}
              onCommit={(width) => {
                onChange({ width }, true);
              }}
            />
            <NumberField
              label={t('editor:fields.height')}
              value={element.height}
              step={0.5}
              min={1}
              onCommit={(height) => {
                onChange({ height }, true);
              }}
            />
            <NumberField
              label={t('editor:fields.rotation')}
              value={element.rotation}
              step={1}
              onCommit={(rotation) => {
                onChange({ rotation }, true);
              }}
            />
          </div>
          <fieldset className="editor-order">
            <legend>{t('editor:order.title')}</legend>
            {(['front', 'forward', 'backward', 'back'] as const).map((direction) => (
              <button
                key={direction}
                type="button"
                onClick={() => {
                  onReorder(direction);
                }}
              >
                {t(`editor:order.${direction}`)}
              </button>
            ))}
          </fieldset>
        </div>
      )}
    </section>
  );
}

function TextFields({
  element,
  onChange,
  textFieldRef,
}: {
  element: TextElement;
  onChange: PropertiesPanelProps['onChange'];
  textFieldRef: Ref<HTMLTextAreaElement>;
}) {
  const t = useT();
  const ids = { text: useId(), font: useId(), color: useId(), align: useId() };
  const { style } = element;
  const setStyle = (patch: Partial<TextElement['style']>, merge = false) => {
    onChange({ style: patch }, merge);
  };
  const knownFont = FONTS.some((font) => font.family === style.fontFamily);

  return (
    <>
      <div className="editor-field">
        <label htmlFor={ids.text}>{t('editor:fields.text')}</label>
        {/* A controlled textarea: the text is always plain text, never HTML. */}
        <textarea
          id={ids.text}
          ref={textFieldRef}
          rows={3}
          value={element.text}
          onChange={(event) => {
            onChange({ text: event.target.value }, true);
          }}
        />
      </div>
      <div className="editor-grid">
        <div className="editor-field">
          <label htmlFor={ids.font}>{t('editor:fields.font')}</label>
          <select
            id={ids.font}
            value={style.fontFamily}
            onChange={(event) => {
              setStyle({ fontFamily: event.target.value });
            }}
          >
            {!knownFont && <option value={style.fontFamily}>{style.fontFamily}</option>}
            {FONTS.map((font) => (
              <option key={font.family} value={font.family}>
                {font.family}
              </option>
            ))}
          </select>
        </div>
        <NumberField
          label={t('editor:fields.fontSize')}
          value={style.fontSizePt}
          step={1}
          min={1}
          onCommit={(fontSizePt) => {
            if (fontSizePt > 0) setStyle({ fontSizePt }, true);
          }}
        />
        <div className="editor-field">
          <label htmlFor={ids.color}>{t('editor:fields.color')}</label>
          <input
            id={ids.color}
            type="color"
            value={style.color.slice(0, 7)}
            onChange={(event) => {
              setStyle({ color: event.target.value }, true);
            }}
          />
        </div>
        <div className="editor-field">
          <label htmlFor={ids.align}>{t('editor:fields.align')}</label>
          <select
            id={ids.align}
            value={style.align}
            onChange={(event) => {
              setStyle({ align: event.target.value as TextElement['style']['align'] });
            }}
          >
            {(['left', 'center', 'right'] as const).map((align) => (
              <option key={align} value={align}>
                {t(`editor:align.${align}`)}
              </option>
            ))}
          </select>
        </div>
      </div>
      <div className="editor-checks">
        <label>
          <input
            type="checkbox"
            checked={style.fontWeight === 'bold'}
            onChange={(event) => {
              setStyle({ fontWeight: event.target.checked ? 'bold' : 'normal' });
            }}
          />
          {t('editor:fields.bold')}
        </label>
        <label>
          <input
            type="checkbox"
            checked={style.fontStyle === 'italic'}
            onChange={(event) => {
              setStyle({ fontStyle: event.target.checked ? 'italic' : 'normal' });
            }}
          />
          {t('editor:fields.italic')}
        </label>
      </div>
    </>
  );
}
