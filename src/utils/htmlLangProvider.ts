import { getLanguageService } from 'vscode-html-languageservice';
import { TextDocument } from 'vscode-languageserver-textdocument';

const htmlLs = getLanguageService({ useDefaultDataProvider: true });
let registered = false;

function toDoc(model: any): TextDocument {
  return TextDocument.create(
    model.uri.toString(), 'html',
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

export function registerHtmlProviders(monaco: any) {
  if (registered) return;
  registered = true;

  monaco.languages.html.htmlDefaults.setModeConfiguration({
    completionItems: false,
    hovers: false,
    colors: true,
    documentFormattingEdits: false,
    documentHighlights: true,
    documentSymbols: true,
    links: true,
    rename: true,
    foldingRanges: true,
    selectionRanges: true,
    diagnostics: true,
  });

  monaco.languages.registerCompletionItemProvider('html', {
    triggerCharacters: ['<', '/', '!', ' ', '=', '"', "'"],
    provideCompletionItems(model: any, position: any) {
      try {
        const doc = toDoc(model);
        const htmlDoc = htmlLs.parseHTMLDocument(doc);
        const list = htmlLs.doComplete(doc, toLspPos(position), htmlDoc);
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

  monaco.languages.registerHoverProvider('html', {
    provideHover(model: any, position: any) {
      try {
        const doc = toDoc(model);
        const htmlDoc = htmlLs.parseHTMLDocument(doc);
        const hover = htmlLs.doHover(doc, toLspPos(position), htmlDoc);
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

  monaco.languages.registerDocumentFormattingEditProvider('html', {
    provideDocumentFormattingEdits(model: any, options: any) {
      try {
        const doc = toDoc(model);
        return htmlLs.format(doc, undefined, {
          tabSize: options.tabSize,
          insertSpaces: options.insertSpaces,
          unformatted: 'wbr',
          contentUnformatted: 'pre,code,textarea',
          indentInnerHtml: false,
          endWithNewline: false,
          wrapLineLength: 0,
        }).map((e: any) => ({
          range: toMonacoRange(e.range, monaco),
          text: e.newText,
        }));
      } catch { return []; }
    },
  });
}
