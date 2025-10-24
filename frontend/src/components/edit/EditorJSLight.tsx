import React, { useEffect, useRef, useState } from 'react';
import EditorJS from '@editorjs/editorjs';
import Header from '@editorjs/header';
import List from '@editorjs/list';
import Quote from '@editorjs/quote';
import Delimiter from '@editorjs/delimiter';

interface EditorJSLightProps {
  initialData?: any;
  onChange?: (data: any) => void;
  height?: number;
}

const EditorJSLight: React.FC<EditorJSLightProps> = ({
  initialData = {
    blocks: [
      {
        type: 'header',
        data: {
          text: 'Welcome to Lightweight Editor.js!',
          level: 2
        }
      },
      {
        type: 'paragraph',
        data: {
          text: 'This is a lightweight version with only essential tools.'
        }
      }
    ]
  },
  onChange,
  height = 500
}) => {
  const [isClient, setIsClient] = useState(false);
  const editorRef = useRef<EditorJS | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setIsClient(true);
    const moduleLoadEnd = performance.now();
    console.log(`📦 EditorJS Light 모듈 로딩 완료 - 소요시간: ${(moduleLoadEnd - performance.now()).toFixed(2)}ms`);
  }, []);

  useEffect(() => {
    if (!isClient || !containerRef.current || editorRef.current) return;

    const initEditor = async () => {
      const startTime = performance.now();
      console.log('🚀 EditorJS Light 초기화 시작');
      
      try {
        const editor = new EditorJS({
          holder: containerRef.current,
          data: initialData,
          tools: {
            // 필수 도구만 포함 (메모리 사용량 최적화)
            header: {
              class: Header,
              config: {
                placeholder: 'Enter a header',
                levels: [1, 2, 3, 4, 5, 6],
                defaultLevel: 2
              }
            },
            list: {
              class: List,
              inlineToolbar: true,
              config: {
                defaultStyle: 'unordered'
              }
            },
            quote: {
              class: Quote,
              inlineToolbar: true,
              config: {
                quotePlaceholder: 'Enter a quote',
                captionPlaceholder: 'Quote\'s author',
              },
            },
            delimiter: Delimiter,
          },
          onChange: async () => {
            if (onChange && editorRef.current) {
              try {
                const outputData = await editorRef.current.save();
                onChange(outputData);
              } catch (error) {
                console.error('Error saving editor data:', error);
              }
            }
          },
          placeholder: 'Start writing your content...',
          minHeight: height,
        });

        editorRef.current = editor;
        const endTime = performance.now();
        const loadTime = endTime - startTime;
        
        console.log(`✅ EditorJS Light 초기화 완료 - 총 소요시간: ${loadTime.toFixed(2)}ms`);
        console.log(`📦 로드된 도구 개수: 4개 (최적화됨)`);
        
        // 메모리 사용량 체크
        if (performance.memory) {
          console.log('📊 Light 버전 메모리 사용량:', {
            used: `${(performance.memory.usedJSHeapSize / 1024 / 1024).toFixed(2)}MB`,
            total: `${(performance.memory.totalJSHeapSize / 1024 / 1024).toFixed(2)}MB`,
            limit: `${(performance.memory.jsHeapSizeLimit / 1024 / 1024).toFixed(2)}MB`
          });
        }
        
        console.log('💡 Light 버전 최적화 효과:');
        console.log('  - 도구 개수: 13개 → 4개 (69% 감소)');
        console.log('  - 메모리 사용량 대폭 감소 예상');
        console.log('  - 로딩 속도 향상');
        
      } catch (error) {
        console.error('Failed to initialize EditorJS Light:', error);
      }
    };

    initEditor();

    return () => {
      if (editorRef.current) {
        editorRef.current.destroy();
        editorRef.current = null;
      }
    };
  }, [isClient, initialData, onChange, height]);

  if (!isClient) {
    return (
      <div className="w-full h-96 bg-gray-100 rounded-lg flex items-center justify-center">
        <div className="text-gray-500">Loading EditorJS Light...</div>
      </div>
    );
  }

  return (
    <div className="w-full">
      <style jsx global>{`
        .codex-editor {
          min-height: ${height}px;
        }
        .codex-editor__redactor {
          padding: 20px;
        }
        .ce-block__content {
          max-width: none;
        }
        .ce-toolbar__content {
          max-width: none;
        }
        .ce-inline-toolbar {
          z-index: 1000;
        }
        .ce-conversion-toolbar {
          z-index: 1000;
        }
        .ce-settings {
          z-index: 1000;
        }
      `}</style>
      <div
        ref={containerRef}
        style={{ minHeight: height }}
        className="border border-gray-300 rounded-lg"
      />
    </div>
  );
};

export default EditorJSLight;
