
import React, { useEffect, useRef } from 'react';
// @ts-ignore
import Editor from '@toast-ui/editor';
import '@toast-ui/editor/toastui-editor.css'; // Editor's Style

interface SimpleToastUiEditorProps {
    value: string;
    onChange: (value: string) => void;
    height?: string;
    initialEditType?: 'markdown' | 'wysiwyg';
    initialValue?: string;
    previewStyle?: 'vertical' | 'tab' | 'vertical-stack';
}

const SimpleToastUiEditor: React.FC<SimpleToastUiEditorProps> = ({
    value,
    onChange,
    height = '600px',
    initialEditType = 'markdown',
    previewStyle = 'vertical',
}) => {
    const editorRef = useRef<Editor | null>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const isUpdating = useRef(false);

    useEffect(() => {
        if (!containerRef.current) return;

        // Initialize Editor
        const editor = new Editor({
            el: containerRef.current,
            height: height,
            initialEditType: initialEditType,
            previewStyle: previewStyle === 'vertical-stack' ? 'vertical' : previewStyle,
            initialValue: value,
            events: {
                change: () => {
                    if (editorRef.current) {
                        const content = editorRef.current.getMarkdown(); // Or getHTML() depending on requirement. Usually Markdown is preferred for Toast UI.

                        // Prevent infinite loop if the change came from the prop
                        if (!isUpdating.current) {
                            onChange(content);
                        }
                    }
                }
            }
        });

        editorRef.current = editor;

        return () => {
            // Cleanup: Destroy the editor instance to prevent duplicates in React Strict Mode
            editor.destroy();
        };
    }, []); // Only run once on mount

    // Update editor content when value prop changes externally
    useEffect(() => {
        if (editorRef.current) {
            const currentContent = editorRef.current.getMarkdown();
            if (currentContent !== value) {
                isUpdating.current = true;
                editorRef.current.setMarkdown(value);
                isUpdating.current = false;
            }
        }
    }, [value]);

    // Update preview style when prop changes
    useEffect(() => {
        if (editorRef.current && previewStyle) {
            const actualStyle = previewStyle === 'vertical-stack' ? 'vertical' : previewStyle;
            editorRef.current.changePreviewStyle(actualStyle);

            // Apply or remove CSS class for vertical stack
            if (containerRef.current) {
                if (previewStyle === 'vertical-stack') {
                    containerRef.current.classList.add('toastui-vertical-stack');
                } else {
                    containerRef.current.classList.remove('toastui-vertical-stack');
                }
            }
        }
    }, [previewStyle]);

    return (
        <>
            <style jsx global>{`
                .toastui-vertical-stack .toastui-editor-defaultUI .toastui-editor-main-container {
                    flex-direction: column !important;
                }
                .toastui-vertical-stack .toastui-editor-defaultUI .toastui-editor-md-container,
                .toastui-vertical-stack .toastui-editor-defaultUI .toastui-editor-ww-container {
                    width: 100% !important;
                    height: 50% !important;
                }
                .toastui-vertical-stack .toastui-editor-defaultUI .toastui-editor-md-preview {
                    width: 100% !important;
                    height: 50% !important;
                    position: static !important;
                    border-left: none !important;
                    border-top: 1px solid #eee;
                }
            `}</style>
            <div ref={containerRef} className="w-full" />
        </>
    );
};

export default SimpleToastUiEditor;
