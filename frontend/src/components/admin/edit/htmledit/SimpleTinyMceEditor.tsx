'use client'

import React, { useMemo, useRef, useEffect } from 'react';
import { Editor } from '@tinymce/tinymce-react';

interface SimpleTinyMceEditorProps {
    value: string;
    onChange: (value: string) => void;
    placeholder?: string;
    height?: number | string;
}

export default function SimpleTinyMceEditor({
    value,
    onChange,
    placeholder = 'Content here...',
    height = 500
}: SimpleTinyMceEditorProps) {
    const editorRef = useRef<any>(null);
    const lastValueRef = useRef<string>(value);

    // Memoize the config to prevent re-initialization
    const initConfig = useMemo(() => ({
        height: height,
        menubar: true,
        plugins: [
            // Core editing features
            'anchor', 'autolink', 'charmap', 'codesample', 'emoticons', 'link', 'lists', 'media', 'searchreplace', 'table', 'visualblocks', 'wordcount',
            // 'hr' is deprecated in TinyMCE 7 (use 'horizontalrule' or just standard hr tag handling)
            // Premium features removed
        ],
        toolbar: 'undo redo | blocks fontsize | bold italic underline strikethrough | forecolor backcolor | hr link media table | align lineheight | numlist bullist indent outdent | emoticons charmap | removeformat',
        content_style: 'body { font-family:Helvetica,Arial,sans-serif; font-size:14px }',
        placeholder: placeholder,
    }), [height, placeholder]);

    // Reference Pattern: No manual sync via useEffect for "value" prop.
    // We rely mostly on initialValue and onBlur.
    // However, if the parent REALLY needs to reset the editor (e.g. clear form),
    // we need a way. For now, we'll stick to the user's reference exactly:
    // NO useEffect for value sync.

    // BLUR-ONLY SYNC:
    const handleBlur = () => {
        if (editorRef.current) {
            const content = editorRef.current.getContent();
            lastValueRef.current = content;
            onChange(content);
        }
    };

    return (
        <div className="tinymce-editor-wrapper border rounded-lg overflow-hidden">
            <Editor
                apiKey={process.env.NEXT_PUBLIC_TINYMCE_API_KEY}
                onInit={(_evt, editor) => editorRef.current = editor}
                initialValue={value} // Only used for first render
                // NO value prop here - purely uncontrolled
                onBlur={handleBlur} // SYNC ONLY ON BLUR
                init={initConfig}
            />
        </div>
    );
}
