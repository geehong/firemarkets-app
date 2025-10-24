import React, { useEffect, useRef, useState } from 'react';

// Quill 타입 선언
declare global {
  interface Window {
    Quill: new (container: HTMLElement, options?: unknown) => {
      root: HTMLElement;
      on: (event: string, callback: () => void) => void;
    };
  }
}

interface QuillEditProps {
  initialValue?: string;
  onChange?: (content: string) => void;
  height?: number;
}

const QuillEdit: React.FC<QuillEditProps> = ({
  initialValue = "Welcome to Quill Editor!",
  onChange,
  height = 500
}) => {
  const [isClient, setIsClient] = useState(false);
  const [isQuillLoaded, setIsQuillLoaded] = useState(false);
  const quillRef = useRef<unknown>(null);
  const editorRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setIsClient(true);
  }, []);

  useEffect(() => {
    if (!isClient || !editorRef.current || isQuillLoaded) {
      return;
    }

    // 중복 실행 방지
    setIsQuillLoaded(true);

    // 동적으로 Quill과 CSS를 로드
    const loadQuill = async () => {
      try {
        // CSS가 이미 로드되었는지 확인
        if (!document.querySelector('link[href*="quill.snow.css"]')) {
          const link = document.createElement('link');
          link.rel = 'stylesheet';
          link.href = 'https://cdn.jsdelivr.net/npm/quill@2/dist/quill.snow.css';
          document.head.appendChild(link);
        }

        // Quill 라이브러리가 이미 로드되었는지 확인
        if (window.Quill && editorRef.current) {
          const quillInstance = new window.Quill(editorRef.current, {
            theme: 'snow',
            modules: {
              toolbar: [
                [{ 'header': [1, 2, 3, 4, 5, 6, false] }],
                [{ 'font': [] }],
                [{ 'size': ['small', false, 'large', 'huge'] }],
                ['bold', 'italic', 'underline', 'strike'],
                [{ 'color': [] }, { 'background': [] }],
                [{ 'script': 'sub'}, { 'script': 'super' }],
                [{ 'list': 'ordered'}, { 'list': 'bullet' }],
                [{ 'indent': '-1'}, { 'indent': '+1' }],
                [{ 'direction': 'rtl' }],
                [{ 'align': [] }],
                ['link', 'image', 'video'],
                ['blockquote', 'code-block'],
                ['formula'],
                ['clean']
              ],
            },
            formats: [
              'header', 'font', 'size', 'bold', 'italic', 'underline', 'strike',
              'color', 'background', 'script', 'list', 'indent', 'direction',
              'align', 'link', 'image', 'video', 'blockquote', 'code-block', 'formula'
            ]
          });

          // 초기값 설정
          quillInstance.root.innerHTML = initialValue;

          // 변경 이벤트 리스너
          quillInstance.on('text-change', () => {
            const content = quillInstance.root.innerHTML;
            if (onChange) {
              onChange(content);
            }
          });

          quillRef.current = quillInstance;
          
          // 에디터 크기 조절 디버깅
          setTimeout(() => {
            const container = document.querySelector('.ql-container');
            const editor = document.querySelector('.ql-editor');
            
            if (container && editor) {
              const containerStyle = window.getComputedStyle(container);
              const editorStyle = window.getComputedStyle(editor);
              
              console.log('🔍 에디터 크기 조절 디버깅:', {
                containerResize: containerStyle.resize,
                containerOverflow: containerStyle.overflow,
                containerMinHeight: containerStyle.minHeight,
                containerHeight: containerStyle.height,
                editorResize: editorStyle.resize,
                editorOverflow: editorStyle.overflow,
                editorMinHeight: editorStyle.minHeight,
                editorHeight: editorStyle.height,
                editorWidth: editorStyle.width,
                editorBoxSizing: editorStyle.boxSizing
              });
              
              // resize 속성 강제 설정 (container에만 적용)
              container.style.resize = 'vertical';
              container.style.overflow = 'auto';
              container.style.minHeight = '200px';
              editor.style.minHeight = '200px';
              
              console.log('✅ resize 속성 강제 설정 완료');
            }
          }, 100);
        } else if (!document.querySelector('script[src*="quill.js"]')) {
          // Quill 라이브러리 로드
          const script = document.createElement('script');
          script.src = 'https://cdn.jsdelivr.net/npm/quill@2/dist/quill.js';
          script.onload = () => {
            if (window.Quill && editorRef.current && !quillRef.current) {
              const quillInstance = new window.Quill(editorRef.current, {
                theme: 'snow',
                modules: {
                  toolbar: [
                    [{ 'header': [1, 2, 3, 4, 5, 6, false] }],
                    [{ 'font': [] }],
                    [{ 'size': ['small', false, 'large', 'huge'] }],
                    ['bold', 'italic', 'underline', 'strike'],
                    [{ 'color': [] }, { 'background': [] }],
                    [{ 'script': 'sub'}, { 'script': 'super' }],
                    [{ 'list': 'ordered'}, { 'list': 'bullet' }],
                    [{ 'indent': '-1'}, { 'indent': '+1' }],
                    [{ 'direction': 'rtl' }],
                    [{ 'align': [] }],
                    ['link', 'image', 'video'],
                    ['blockquote', 'code-block'],
                    ['formula'],
                    ['clean']
                  ],
                },
                formats: [
                  'header', 'font', 'size', 'bold', 'italic', 'underline', 'strike',
                  'color', 'background', 'script', 'list', 'indent', 'direction',
                  'align', 'link', 'image', 'video', 'blockquote', 'code-block', 'formula'
                ]
              });

              // 초기값 설정
              quillInstance.root.innerHTML = initialValue;

              // 변경 이벤트 리스너
              quillInstance.on('text-change', () => {
                const content = quillInstance.root.innerHTML;
                if (onChange) {
                  onChange(content);
                }
              });

              quillRef.current = quillInstance;
              
              // 에디터 크기 조절 디버깅
              setTimeout(() => {
                const container = document.querySelector('.ql-container');
                const editor = document.querySelector('.ql-editor');
                
                if (container && editor) {
                  const containerStyle = window.getComputedStyle(container);
                  const editorStyle = window.getComputedStyle(editor);
                  
                  console.log('🔍 에디터 크기 조절 디버깅:', {
                    containerResize: containerStyle.resize,
                    containerOverflow: containerStyle.overflow,
                    containerMinHeight: containerStyle.minHeight,
                    containerHeight: containerStyle.height,
                    editorResize: editorStyle.resize,
                    editorOverflow: editorStyle.overflow,
                    editorMinHeight: editorStyle.minHeight,
                    editorHeight: editorStyle.height,
                    editorWidth: editorStyle.width,
                    editorBoxSizing: editorStyle.boxSizing
                  });
                  
                  // resize 속성 강제 설정 (container에만 적용)
                  container.style.resize = 'vertical';
                  container.style.overflow = 'auto';
                  container.style.minHeight = '200px';
                  editor.style.minHeight = '200px';
                  
                  console.log('✅ resize 속성 강제 설정 완료');
                }
              }, 100);
            }
          };
          document.head.appendChild(script);
        }
      } catch (error) {
        console.error('Failed to load Quill:', error);
      }
    };

    loadQuill();

    return () => {
      // Cleanup
      if (quillRef.current) {
        quillRef.current = null;
      }
    };
  }, [isClient, initialValue, onChange]);

  // Prevent hydration mismatch by only rendering on client
  if (!isClient) {
    return (
      <div className="w-full h-96 bg-gray-100 rounded-lg flex items-center justify-center">
        <div className="text-gray-500">Loading editor...</div>
      </div>
    );
  }

  return (
    <div className="w-full">
      <style jsx global>{`
        .ql-container {
          border-bottom: 1px solid #ccc;
          border-left: 1px solid #ccc;
          border-right: 1px solid #ccc;
          min-height: 200px;
          resize: vertical;
          overflow: auto;
        }
        .ql-editor {
          min-height: 200px;
          font-family: -apple-system, BlinkMacSystemFont, San Francisco, Segoe UI, Roboto, Helvetica Neue, sans-serif;
          font-size: 14px;
          width: 100%;
          box-sizing: border-box;
        }
        .ql-toolbar {
          border-top: 1px solid #ccc;
          border-left: 1px solid #ccc;
          border-right: 1px solid #ccc;
          display: flex;
          flex-wrap: wrap;
          gap: 2px;
          padding: 8px;
        }
        .ql-toolbar .ql-formats {
          display: flex;
          align-items: center;
          gap: 2px;
        }
        .ql-snow .ql-container {
          resize: vertical;
          overflow: auto;
        }
        
      `}</style>
      <div
        ref={editorRef}
        style={{ 
          minHeight: height + 42,
          width: '100%'
        }}
      />
    </div>
  );
};

export default QuillEdit;
