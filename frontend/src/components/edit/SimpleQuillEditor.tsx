
import React, { useRef, useMemo } from 'react'
import ReactQuill from 'react-quill-new'
import 'react-quill-new/dist/quill.snow.css'

interface SimpleQuillEditorProps {
    value: string
    onChange: (value: string) => void
    placeholder?: string
    height?: number
}

const SimpleQuillEditor: React.FC<SimpleQuillEditorProps> = ({
    value,
    onChange,
    placeholder,
    height = 400
}) => {
    const quillRef = useRef<ReactQuill>(null)

    const modules = useMemo(() => ({
        toolbar: [
            [{ 'header': [1, 2, false] }],
            ['bold', 'italic', 'underline', 'strike', 'blockquote'],
            [{ 'list': 'ordered' }, { 'list': 'bullet' }, { 'indent': '-1' }, { 'indent': '+1' }],
            ['link', 'image'],
            ['clean']
        ],
    }), [])

    const formats = [
        'header',
        'bold', 'italic', 'underline', 'strike', 'blockquote',
        'list', 'indent',
        'link', 'image'
    ]

    return (
        <div style={{ height }} className="flex flex-col">
            <ReactQuill
                theme="snow"
                ref={quillRef}
                value={value}
                onChange={onChange}
                modules={modules}
                placeholder={placeholder}
                className="h-full flex flex-col"
                preserveWhitespace
            />
            <style jsx global>{`
        .quill {
            display: flex;
            flex-direction: column;
            overflow: hidden;
        }
        .ql-container {
            flex: 1;
            overflow-y: auto;
        }
      `}</style>
        </div>
    )
}

export default SimpleQuillEditor
