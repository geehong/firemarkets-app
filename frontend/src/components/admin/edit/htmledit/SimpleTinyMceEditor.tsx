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
            // Premium features (removed spellchecker to prevent 400s if key is invalid/free)
            'checklist', 'mediaembed', 'casechange', 'formatpainter', 'pageembed', 'permanentpen', 'powerpaste', 'advtable', 'advcode', 'advtemplate', 'ai', 'tableofcontents', 'footnotes', 'mergetags', 'autocorrect', 'typography', 'inlinecss', 'markdown', 'importword', 'exportword', 'exportpdf'
        ],
        toolbar: 'undo redo | blocks fontsize | bold italic underline strikethrough | forecolor backcolor | hr link media table mergetags | typography | align lineheight | checklist numlist bullist indent outdent | emoticons charmap | removeformat',
        mergetags_list: [
            { value: 'First.Name', title: 'First Name' },
            { value: 'Email', title: 'Email' },
        ],
        // AI request handler
        ai_request: (request: any, respondWith: any) => {
            const context = editorRef.current?.getContent({ format: 'text' }) || '';
            
            // Return a Promise that resolves with the response
            return new Promise((resolve, reject) => {
                fetch('/api/v1/posts/ai-assistant', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        // Add Authorization header if needed, but for now we rely on cookie/session or standard auth
                         'Authorization': `Bearer ${localStorage.getItem('access_token') || ''}`
                    },
                    body: JSON.stringify({
                        prompt: request.prompt,
                        context: context
                    })
                })
                .then(response => {
                    if (!response.ok) throw new Error('AI request failed');
                    return response.json();
                })
                .then(data => {
                    respondWith.string(() => Promise.resolve(data.result));
                    resolve(data.result);
                })
                .catch(error => {
                    console.error('AI Error:', error);
                    respondWith.string(() => Promise.reject('AI request failed. Please try again.'));
                    reject(error);
                });
            });
        },
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
