'use client'

import React, { useRef } from 'react';
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

    return (
        <div className="tinymce-editor-wrapper border rounded-lg overflow-hidden">
            <Editor
                apiKey={process.env.NEXT_PUBLIC_TINYMCE_API_KEY}
                onInit={(evt, editor) => editorRef.current = editor}
                value={value}
                onEditorChange={(content) => onChange(content)}
                init={{
                    height: height,
                    menubar: true,
                    plugins: [
                        // Core editing features
                        'anchor', 'autolink', 'charmap', 'codesample', 'emoticons', 'link', 'lists', 'media', 'searchreplace', 'table', 'visualblocks', 'wordcount',
                        // Your account includes a free trial of TinyMCE premium features
                        // Try the most popular premium features until Feb 24, 2026:
                        'checklist', 'mediaembed', 'casechange', 'formatpainter', 'pageembed', 'a11ychecker', 'tinymcespellchecker', 'permanentpen', 'powerpaste', 'advtable', 'advcode', 'advtemplate', 'ai', 'uploadcare', 'mentions', 'tinycomments', 'tableofcontents', 'footnotes', 'mergetags', 'autocorrect', 'typography', 'inlinecss', 'markdown', 'importword', 'exportword', 'exportpdf'
                    ],
                    toolbar: 'undo redo | blocks fontfamily fontsize | bold italic underline strikethrough | link media table mergetags | addcomment showcomments | spellcheckdialog a11ycheck typography uploadcare | align lineheight | checklist numlist bullist indent outdent | emoticons charmap | removeformat',
                    tinycomments_mode: 'embedded',
                    tinycomments_author: 'Author name',
                    mergetags_list: [
                        { value: 'First.Name', title: 'First Name' },
                        { value: 'Email', title: 'Email' },
                    ],
                    ai_request: (request: any, respondWith: any) => respondWith.string(() => Promise.reject('See docs to implement AI Assistant')),
                    uploadcare_public_key: 'f24d3610bc80141c7a54',
                    content_style: 'body { font-family:Helvetica,Arial,sans-serif; font-size:14px }',
                    placeholder: placeholder,
                }}
            />
        </div>
    );
}
