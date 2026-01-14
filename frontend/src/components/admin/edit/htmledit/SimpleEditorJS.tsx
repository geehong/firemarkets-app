
import React, { useEffect, useRef, useState } from 'react'
import EditorJS, { OutputData } from '@editorjs/editorjs'
// @ts-ignore
import Header from '@editorjs/header'
// @ts-ignore
import List from '@editorjs/list'
// @ts-ignore
import Quote from '@editorjs/quote'
// @ts-ignore
import Delimiter from '@editorjs/delimiter'
// @ts-ignore
import Table from '@editorjs/table'

interface SimpleEditorJSProps {
    value: string // We will accept string for compatibility, but EditorJS works with blocks. We might need json parsing.
    onChange: (value: string) => void
    placeholder?: string
    height?: number
}

const SimpleEditorJS: React.FC<SimpleEditorJSProps> = ({
    value,
    onChange,
    placeholder,
    height = 400
}) => {
    const editorRef = useRef<EditorJS | null>(null)
    const holderId = useRef(`editorjs-${Math.random().toString(36).substr(2, 9)}`).current
    const [isReady, setIsReady] = useState(false)

    useEffect(() => {
        if (!editorRef.current) {
            const editor = new EditorJS({
                holder: holderId,
                placeholder: placeholder,
                tools: {
                    header: Header,
                    list: List,
                    quote: Quote,
                    delimiter: Delimiter,
                    table: Table,
                },
                data: value ? tryParseJSON(value) : undefined,
                async onChange(api, event) {
                    const data = await api.saver.save();
                    onChange(JSON.stringify(data));
                },
                onReady: () => {
                    setIsReady(true)
                }
            })
            editorRef.current = editor
        }

        return () => {
            if (editorRef.current && typeof editorRef.current.destroy === 'function') {
                editorRef.current.destroy()
                editorRef.current = null
            }
        }
    }, []) // Run once

    const tryParseJSON = (jsonString: string) => {
        try {
            if (!jsonString) return undefined;
            const o = JSON.parse(jsonString);
            if (o && typeof o === "object") {
                return o;
            }
        }
        catch (e) { }

        // If parsing fails or not object, maybe it's raw text, convert to paragraph block
        return {
            blocks: [
                {
                    type: 'paragraph',
                    data: {
                        text: jsonString
                    }
                }
            ]
        }
    };


    return (
        <div className="border border-gray-300 rounded-lg overflow-hidden flex flex-col p-4 bg-white" style={{ height, overflowY: 'auto' }}>
            <div id={holderId} className="prose max-w-none" />
        </div>
    )
}

export default SimpleEditorJS
