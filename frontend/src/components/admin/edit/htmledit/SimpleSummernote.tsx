
import React, { useEffect, useRef } from 'react'

// Summernote depends on jQuery
// We assume jquery and summernote are loaded globally or via imports that attach to window
// Since we installed them via npm, we might need to import them to ensure they bundle
// However, Summernote is notoriously hard to bundle with Webpack/Next.js due to its dependence on global $
// We will try a dynamic approach invoking it on the ref.

interface SimpleSummernoteProps {
    value: string
    onChange: (value: string) => void
    placeholder?: string
    height?: number
}

const SimpleSummernote: React.FC<SimpleSummernoteProps> = ({
    value,
    onChange,
    placeholder,
    height = 400
}) => {
    const editorRef = useRef<HTMLTextAreaElement>(null)

    useEffect(() => {
        // Dynamic import to avoid SSR issues
        const initSummernote = async () => {
            try {
                const $ = (await import('jquery')).default;
                // @ts-ignore
                window.jQuery = $;
                // @ts-ignore
                window.$ = $;
                // @ts-ignore
                await import('summernote/dist/summernote-lite.js');
                // @ts-ignore
                await import('summernote/dist/summernote-lite.css');

                if (editorRef.current) {
                    // @ts-ignore
                    $(editorRef.current).summernote({
                        placeholder: placeholder,
                        tabsize: 2,
                        height: height,
                        callbacks: {
                            onChange: function (contents: string) {
                                onChange(contents);
                            }
                        }
                    });

                    // Set initial value
                    // @ts-ignore
                    $(editorRef.current).summernote('code', value);
                }

                return () => {
                    // Cleanup
                    if (editorRef.current) {
                        // @ts-ignore
                        $(editorRef.current).summernote('destroy');
                    }
                }

            } catch (e) {
                console.error("Failed to load Summernote", e);
            }
        }

        initSummernote();
    }, []) // Empty dependency to init once. Value updates need handling carefully to avoid cursor reset.

    return (
        <div className='summernote-wrapper'>
            <textarea ref={editorRef} />
        </div>
    )
}

export default SimpleSummernote
