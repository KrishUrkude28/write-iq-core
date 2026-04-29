import { Extension } from "@tiptap/core";
import { Decoration, DecorationSet } from "@tiptap/pm/view";
import { Plugin, PluginKey } from "@tiptap/pm/state";

export interface GhostTextOptions {
  className?: string;
}

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    ghostText: {
      /** Set the current ghost text suggestion */
      setGhostText: (text: string) => ReturnType;
      /** Clear the current ghost text suggestion */
      clearGhostText: () => ReturnType;
    };
  }
}

export const GhostText = Extension.create<GhostTextOptions>({
  name: "ghostText",

  addOptions() {
    return {
      className: "opacity-40 italic pointer-events-none select-none text-muted-foreground",
    };
  },

  addStorage() {
    return {
      text: "",
    };
  },

  addCommands() {
    return {
      setGhostText:
        (text: string) =>
        ({ tr, dispatch }) => {
          this.storage.text = text;
          if (dispatch) {
            tr.setMeta("ghostText", text);
          }
          return true;
        },
      clearGhostText:
        () =>
        ({ tr, dispatch }) => {
          this.storage.text = "";
          if (dispatch) {
            tr.setMeta("ghostText", "");
          }
          return true;
        },
    };
  },

  addProseMirrorPlugins() {
    const { className } = this.options;

    return [
      new Plugin({
        key: new PluginKey("ghostText"),
        state: {
          init() {
            return DecorationSet.empty;
          },
          apply: (tr, set) => {
            const text = tr.getMeta("ghostText");
            
            // If the document changed or selection changed without our meta, clear ghost text
            if (tr.docChanged || tr.selectionSet) {
              if (text === undefined) {
                this.storage.text = "";
                return DecorationSet.empty;
              }
            }

            if (text === undefined) {
              return set.map(tr.mapping, tr.doc);
            }

            if (text === "") {
              return DecorationSet.empty;
            }

            const { from } = tr.selection;
            const deco = Decoration.widget(
              from,
              () => {
                const span = document.createElement("span");
                span.className = className ?? "";
                span.textContent = text;
                return span;
              },
              { side: 1 }
            );

            return DecorationSet.create(tr.doc, [deco]);
          },
        },
        props: {
          decorations(state) {
            return this.getState(state);
          },
        },
      }),
    ];
  },
});
