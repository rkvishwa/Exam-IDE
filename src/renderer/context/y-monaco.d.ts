import * as Y from "yjs";
import * as monaco from "monaco-editor";

export class MonacoBinding {
  constructor(
    ytext: Y.Text,
    monacoModel: monaco.editor.ITextModel,
    editors?: Set<monaco.editor.IStandaloneCodeEditor>,
    awareness?: any
  );
  destroy(): void;
}
