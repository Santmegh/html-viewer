import {
  getCSSLanguageService,
  getSCSSLanguageService,
  getLESSLanguageService,
} from 'vscode-css-languageservice';
import { TextDocument } from 'vscode-languageserver-textdocument';

const cssLs   = getCSSLanguageService();
const scssLs  = getSCSSLanguageService();
const lessLs  = getLESSLanguageService();

let registered = false;

function toDoc(model: any, langId?: string): TextDocument {
  return TextDocument.create(
    model.uri.toString(),
    langId ?? model.getLanguageId(),
    model.getVersionId(),
    model.getValue(),
  );
}

function toLspPos(pos: any) {
  return { line: pos.lineNumber - 1, character: pos.column - 1 };
}

function toMonacoRange(range: any, mn: any) {
  return new mn.Range(
    range.start.line + 1, range.start.character + 1,
    range.end.line + 1, range.end.character + 1,
  );
}

function getLs(langId: string) {
  if (langId === 'scss') return scssLs;
  if (langId === 'less') return lessLs;
  return cssLs;
}

function registerForLanguage(monaco: any, langId: string) {
  monaco.languages.registerCompletionItemProvider(langId, {
    triggerCharacters: [':', ' ', '-', '.', '#', '@', '!', '(', ','],
    provideCompletionItems(model: any, position: any) {
      try {
        const ls  = getLs(langId);
        const doc = toDoc(model, langId);
        const ast = ls.parseStylesheet(doc);
        const list = ls.doComplete(doc, toLspPos(position), ast);
        if (!list) return { suggestions: [] };

        const word = model.getWordUntilPosition(position);
        const range = new monaco.Range(
          position.lineNumber, word.startColumn,
          position.lineNumber, word.endColumn,
        );

        return {
          incomplete: list.isIncomplete,
          suggestions: list.items.map((item: any) => {
            const label = typeof item.label === 'string' ? item.label : item.label?.label ?? '';
            const te = item.textEdit;
            const insertText = te?.newText ?? item.insertText ?? label;
            return {
              label,
              kind: item.kind ?? 0,
              detail: item.detail,
              documentation: item.documentation,
              insertText,
              insertTextRules: item.insertTextFormat === 2
                ? monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet
                : undefined,
              range: te?.range ? toMonacoRange(te.range, monaco) : range,
              sortText: item.sortText,
              filterText: item.filterText ?? label,
              preselect: item.preselect,
            };
          }),
        };
      } catch { return { suggestions: [] }; }
    },
  });

  monaco.languages.registerHoverProvider(langId, {
    provideHover(model: any, position: any) {
      try {
        const ls  = getLs(langId);
        const doc = toDoc(model, langId);
        const ast = ls.parseStylesheet(doc);
        const hover = ls.doHover(doc, toLspPos(position), ast);
        if (!hover) return null;

        const rawContents = hover.contents;
        const contents: any[] = Array.isArray(rawContents)
          ? rawContents.map((c: any) => typeof c === 'string' ? { value: c } : c)
          : [typeof rawContents === 'string' ? { value: rawContents } : rawContents];

        return {
          range: hover.range ? toMonacoRange(hover.range, monaco) : undefined,
          contents,
        };
      } catch { return null; }
    },
  });

  monaco.languages.registerColorProvider(langId, {
    provideDocumentColors(model: any) {
      try {
        const ls  = getLs(langId);
        const doc = toDoc(model, langId);
        const ast = ls.parseStylesheet(doc);
        return ls.findDocumentColors(doc, ast).map((c: any) => ({
          color: c.color,
          range: toMonacoRange(c.range, monaco),
        }));
      } catch { return []; }
    },
    provideColorPresentations(_model: any, colorInfo: any) {
      try {
        const ls = getLs(langId);
        const dummyDoc = TextDocument.create('untitled://color', langId, 1, '');
        const dummyStylesheet = ls.parseStylesheet(dummyDoc);
        const lspRange = {
          start: { line: colorInfo.range.startLineNumber - 1, character: colorInfo.range.startColumn - 1 },
          end:   { line: colorInfo.range.endLineNumber   - 1, character: colorInfo.range.endColumn   - 1 },
        };
        return ls.getColorPresentations(dummyDoc, dummyStylesheet, colorInfo.color, lspRange).map((p: any) => ({
          label: p.label,
          textEdit: p.textEdit
            ? { range: toMonacoRange(p.textEdit.range, monaco), text: p.textEdit.newText }
            : undefined,
        }));
      } catch { return []; }
    },
  });

  monaco.languages.registerDocumentFormattingEditProvider(langId, {
    provideDocumentFormattingEdits(model: any, options: any) {
      try {
        const ls  = getLs(langId);
        const doc = toDoc(model, langId);
        return (ls.format(doc, undefined, {
          tabSize: options.tabSize,
          insertSpaces: options.insertSpaces,
          newlineBetweenRules: true,
          newlineBetweenSelectors: true,
          spaceAroundSelectorSeparator: true,
        }) as any[]).map((e: any) => ({
          range: toMonacoRange(e.range, monaco),
          text: e.newText,
        }));
      } catch { return []; }
    },
  });

  monaco.languages.registerDocumentSymbolProvider(langId, {
    provideDocumentSymbols(model: any) {
      try {
        const ls  = getLs(langId);
        const doc = toDoc(model, langId);
        const ast = ls.parseStylesheet(doc);
        return (ls.findDocumentSymbols(doc, ast) as any[]).map((s: any) => ({
          name: s.name,
          kind: s.kind,
          range: toMonacoRange(s.range, monaco),
          selectionRange: toMonacoRange(s.selectionRange ?? s.range, monaco),
        }));
      } catch { return []; }
    },
  });
}

export function registerCssProviders(monaco: any) {
  if (registered) return;
  registered = true;

  for (const langId of ['css', 'scss', 'less'] as const) {
    monaco.languages.css[`${langId}Defaults`].setModeConfiguration({
      completionItems: false,
      hovers: false,
      colors: false,
      documentFormattingEdits: false,
      documentSymbols: false,
      documentHighlights: true,
      rename: true,
      references: true,
      definitions: true,
      foldingRanges: true,
      selectionRanges: true,
      diagnostics: true,
    });
    registerForLanguage(monaco, langId);
  }
}
