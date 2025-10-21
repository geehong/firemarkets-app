declare module '@tiptap/react' {
  const content: any
  export default content
  export const useEditor: any
  export const EditorContent: any
}

declare module '@tiptap/starter-kit' {
  const StarterKit: any
  export default StarterKit
}

declare module '@tiptap/pm' {
  const pm: any
  export default pm
}

// CKEditor 4.22.1 types
declare global {
  interface Window {
    CKEDITOR: any;
  }
}

