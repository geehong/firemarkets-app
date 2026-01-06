
import React, { useEffect } from 'react'
import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Underline from '@tiptap/extension-underline'
import TaskList from '@tiptap/extension-task-list'
import TaskItem from '@tiptap/extension-task-item'
import Link from '@tiptap/extension-link'
import Image from '@tiptap/extension-image'
import TextAlign from '@tiptap/extension-text-align'
import Placeholder from '@tiptap/extension-placeholder'
import {
    Bold, Italic, Underline as UnderlineIcon, Strikethrough, Code,
    List, ListOrdered, CheckSquare, Quote, Link as LinkIcon, Image as ImageIcon,
    AlignLeft, AlignCenter, AlignRight, AlignJustify,
    Undo, Redo, Heading1, Heading2, Heading3
} from 'lucide-react'

interface SimpleTiptapEditorProps {
    value: string
    onChange: (value: string) => void
    placeholder?: string
    height?: number
}

const MenuButton = ({ onClick, disabled, isActive, children, title }: any) => (
    <button
        onClick={onClick}
        disabled={disabled}
        title={title}
        className={`p-1.5 rounded text-gray-600 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed ${isActive ? 'bg-gray-200 text-black font-medium' : ''
            }`}
        type="button"
    >
        {children}
    </button>
)

const SimpleTiptapEditor: React.FC<SimpleTiptapEditorProps> = ({
    value,
    onChange,
    placeholder = 'Start writing...',
    height = 400
}) => {
    const editor = useEditor({
        extensions: [
            StarterKit,
            Underline,
            TaskList,
            TaskItem.configure({
                nested: true,
            }),
            Link.configure({
                openOnClick: false,
            }),
            Image,
            TextAlign.configure({
                types: ['heading', 'paragraph'],
            }),
            Placeholder.configure({
                placeholder: placeholder,
                emptyEditorClass: 'is-editor-empty before:content-[attr(data-placeholder)] before:text-gray-400 before:float-left before:pointer-events-none',
            }),
        ],
        content: value,
        editorProps: {
            attributes: {
                class: 'prose prose-sm sm:prose lg:prose-lg xl:prose-2xl mx-auto focus:outline-none h-full p-4 max-w-none',
            },
        },
        onUpdate: ({ editor }) => {
            onChange(editor.getHTML())
        },
        immediatelyRender: false,
    })

    useEffect(() => {
        if (editor && value !== editor.getHTML()) {
            if (!editor.isFocused) {
                editor.commands.setContent(value)
            }
        }
    }, [value, editor])


    if (!editor) {
        return null
    }

    const setLink = () => {
        const previousUrl = editor.getAttributes('link').href
        const url = window.prompt('URL', previousUrl)

        // cancelled
        if (url === null) {
            return
        }

        // empty
        if (url === '') {
            editor.chain().focus().extendMarkRange('link').unsetLink().run()
            return
        }

        // update
        editor.chain().focus().extendMarkRange('link').setLink({ href: url }).run()
    }

    const addImage = () => {
        const url = window.prompt('URL')
        if (url) {
            editor.chain().focus().setImage({ src: url }).run()
        }
    }

    return (
        <div className="border border-gray-300 rounded-lg overflow-hidden flex flex-col bg-white" style={{ height }}>
            {/* Toolbar */}
            <div className="bg-gray-50 border-b border-gray-300 p-2 flex flex-wrap gap-1 items-center sticky top-0 z-10">
                <MenuButton onClick={() => editor.chain().focus().undo().run()} disabled={!editor.can().undo()} title="Undo">
                    <Undo size={18} />
                </MenuButton>
                <MenuButton onClick={() => editor.chain().focus().redo().run()} disabled={!editor.can().redo()} title="Redo">
                    <Redo size={18} />
                </MenuButton>

                <div className="w-px h-6 bg-gray-300 mx-1" />

                <MenuButton onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()} isActive={editor.isActive('heading', { level: 1 })} title="Heading 1">
                    <Heading1 size={18} />
                </MenuButton>
                <MenuButton onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} isActive={editor.isActive('heading', { level: 2 })} title="Heading 2">
                    <Heading2 size={18} />
                </MenuButton>
                <MenuButton onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()} isActive={editor.isActive('heading', { level: 3 })} title="Heading 3">
                    <Heading3 size={18} />
                </MenuButton>

                <div className="w-px h-6 bg-gray-300 mx-1" />

                <MenuButton onClick={() => editor.chain().focus().toggleBold().run()} isActive={editor.isActive('bold')} title="Bold">
                    <Bold size={18} />
                </MenuButton>
                <MenuButton onClick={() => editor.chain().focus().toggleItalic().run()} isActive={editor.isActive('italic')} title="Italic">
                    <Italic size={18} />
                </MenuButton>
                <MenuButton onClick={() => editor.chain().focus().toggleUnderline().run()} isActive={editor.isActive('underline')} title="Underline">
                    <UnderlineIcon size={18} />
                </MenuButton>
                <MenuButton onClick={() => editor.chain().focus().toggleStrike().run()} isActive={editor.isActive('strike')} title="Strike">
                    <Strikethrough size={18} />
                </MenuButton>
                <MenuButton onClick={() => editor.chain().focus().toggleCode().run()} isActive={editor.isActive('code')} title="Code">
                    <Code size={18} />
                </MenuButton>

                <div className="w-px h-6 bg-gray-300 mx-1" />

                <MenuButton onClick={() => editor.chain().focus().setTextAlign('left').run()} isActive={editor.isActive({ textAlign: 'left' })} title="Align Left">
                    <AlignLeft size={18} />
                </MenuButton>
                <MenuButton onClick={() => editor.chain().focus().setTextAlign('center').run()} isActive={editor.isActive({ textAlign: 'center' })} title="Align Center">
                    <AlignCenter size={18} />
                </MenuButton>
                <MenuButton onClick={() => editor.chain().focus().setTextAlign('right').run()} isActive={editor.isActive({ textAlign: 'right' })} title="Align Right">
                    <AlignRight size={18} />
                </MenuButton>
                <MenuButton onClick={() => editor.chain().focus().setTextAlign('justify').run()} isActive={editor.isActive({ textAlign: 'justify' })} title="Align Justify">
                    <AlignJustify size={18} />
                </MenuButton>

                <div className="w-px h-6 bg-gray-300 mx-1" />

                <MenuButton onClick={() => editor.chain().focus().toggleBulletList().run()} isActive={editor.isActive('bulletList')} title="Bullet List">
                    <List size={18} />
                </MenuButton>
                <MenuButton onClick={() => editor.chain().focus().toggleOrderedList().run()} isActive={editor.isActive('orderedList')} title="Ordered List">
                    <ListOrdered size={18} />
                </MenuButton>
                <MenuButton onClick={() => editor.chain().focus().toggleTaskList().run()} isActive={editor.isActive('taskList')} title="Task List">
                    <CheckSquare size={18} />
                </MenuButton>

                <div className="w-px h-6 bg-gray-300 mx-1" />

                <MenuButton onClick={() => editor.chain().focus().toggleBlockquote().run()} isActive={editor.isActive('blockquote')} title="Blockquote">
                    <Quote size={18} />
                </MenuButton>
                <MenuButton onClick={setLink} isActive={editor.isActive('link')} title="Link">
                    <LinkIcon size={18} />
                </MenuButton>
                <MenuButton onClick={addImage} isActive={editor.isActive('image')} title="Image">
                    <ImageIcon size={18} />
                </MenuButton>
            </div>

            {/* Editor Area */}
            <div className="flex-grow overflow-auto cursor-text bg-white" onClick={() => editor.chain().focus().run()}>
                <EditorContent editor={editor} className="h-full" />
            </div>

            <style jsx global>{`
                /* Tiptap Custom Styles */
                .ProseMirror p.is-editor-empty:first-child::before {
                    color: #adb5bd;
                    content: attr(data-placeholder);
                    float: left;
                    height: 0;
                    pointer-events: none;
                }
                .ProseMirror:focus {
                    outline: none;
                }
                .ProseMirror ul[data-type="taskList"] {
                    list-style: none;
                    padding: 0;
                }
                .ProseMirror ul[data-type="taskList"] li {
                    display: flex;
                    align-items: center;
                }
                .ProseMirror ul[data-type="taskList"] li > label {
                    flex: 0 0 auto;
                    margin-right: 0.5rem;
                    user-select: none;
                }
                .ProseMirror ul[data-type="taskList"] li > div {
                    flex: 1 1 auto;
                }
            `}</style>
        </div>
    )
}

export default SimpleTiptapEditor
