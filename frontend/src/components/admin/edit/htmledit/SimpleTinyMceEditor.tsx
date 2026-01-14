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
                        'anchor', 'autolink', 'charmap', 'codesample', 'emoticons', 'image', 'link', 'lists', 'media', 'searchreplace', 'table', 'visualblocks', 'wordcount',
                        'advlist', 'preview', 'code', 'fullscreen', 'insertdatetime', 'help'
                    ],
                    toolbar: 'undo redo | blocks fontfamily fontsize | ' +
                        'bold italic underline strikethrough forecolor backcolor | link image media table mergetags anchor hr | align lineheight | ' +
                        'checklist numlist bullist indent outdent | emoticons charmap | removeformat',
                    content_style: 'body { font-family:Helvetica,Arial,sans-serif; font-size:14px }',
                    placeholder: placeholder,
                    branding: false,
                    promotion: false,
                    language: 'ko_KR', // Attempt to set Korean if possible, or leave default
                }}
            />
        </div>
    );
}
