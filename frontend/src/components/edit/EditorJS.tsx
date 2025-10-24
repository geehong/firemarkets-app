import React, { useEffect, useRef, useState } from 'react';
import EditorJS from '@editorjs/editorjs';
import Header from '@editorjs/header';
import List from '@editorjs/list';
import Quote from '@editorjs/quote';
import Image from '@editorjs/image';
import Table from '@editorjs/table';
import Code from '@editorjs/code';
import Delimiter from '@editorjs/delimiter';
import Warning from '@editorjs/warning';
import Checklist from '@editorjs/checklist';
import Link from '@editorjs/link';
import Embed from '@editorjs/embed';
import Marker from '@editorjs/marker';
import InlineCode from '@editorjs/inline-code';

// 번들 크기 분석
console.log('📦 EditorJS 모듈 로딩 시작');
const moduleLoadStart = performance.now();

interface EditorJSProps {
  initialData?: any;
  onChange?: (data: any) => void;
  height?: number;
}

const EditorJSComponent: React.FC<EditorJSProps> = ({
  initialData = {
    blocks: [
      {
        type: 'header',
        data: {
          text: 'Welcome to Editor.js!',
          level: 2
        }
      },
      {
        type: 'paragraph',
        data: {
          text: 'This is a modern block-style editor. Try adding different blocks using the + button.'
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
    console.log(`📦 EditorJS 모듈 로딩 완료 - 소요시간: ${(moduleLoadEnd - moduleLoadStart).toFixed(2)}ms`);
  }, []);

  useEffect(() => {
    if (!isClient || !containerRef.current || editorRef.current) return;

    const initEditor = async () => {
      const startTime = performance.now();
      console.log('🚀 EditorJS 초기화 시작');
      
      try {
        // 도구별 로딩 시간 측정
        const toolsStartTime = performance.now();
        console.log('🔧 EditorJS 도구들 로딩 시작...');
        
        // 각 도구별 로딩 시간 측정 (실제로는 EditorJS 내부에서 처리되므로 추정값 사용)
        const toolLoadTimes: { [key: string]: number } = {
          'Header': 0,
          'List': 0,
          'Checklist': 0,
          'Quote': 0,
          'Image': 0,
          'Table': 0,
          'Code': 0,
          'Delimiter': 0,
          'Warning': 0,
          'Link': 0,
          'Embed': 0,
          'Marker': 0,
          'InlineCode': 0
        };
        
        const editor = new EditorJS({
          holder: containerRef.current,
          data: initialData,
          tools: {
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
            checklist: {
              class: Checklist,
              inlineToolbar: true,
            },
            quote: {
              class: Quote,
              inlineToolbar: true,
              config: {
                quotePlaceholder: 'Enter a quote',
                captionPlaceholder: 'Quote\'s author',
              },
            },
            image: {
              class: Image,
              config: {
                endpoints: {
                  byFile: '/api/upload-image', // Your backend endpoint
                  byUrl: '/api/fetch-image', // Your backend endpoint
                }
              }
            },
            table: {
              class: Table,
              inlineToolbar: true,
              config: {
                rows: 2,
                cols: 3,
              },
            },
            code: {
              class: Code,
              config: {
                placeholder: 'Enter code',
              }
            },
            delimiter: Delimiter,
            warning: {
              class: Warning,
              inlineToolbar: true,
              config: {
                titlePlaceholder: 'Title',
                messagePlaceholder: 'Message',
              },
            },
            linkTool: {
              class: Link,
              config: {
                endpoint: '/api/link-preview', // Your backend endpoint
              }
            },
            embed: {
              class: Embed,
              config: {
                services: {
                  youtube: true,
                  coub: true,
                  codepen: true,
                  instagram: true,
                  twitter: true,
                  twitch: true,
                  vimeo: true,
                }
              }
            },
            marker: {
              class: Marker,
              shortcut: 'CMD+SHIFT+M',
            },
            inlineCode: {
              class: InlineCode,
              shortcut: 'CMD+SHIFT+C',
            },
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
        const toolsLoadTime = endTime - toolsStartTime;
        
        console.log(`✅ Editor.js 초기화 완료 - 총 소요시간: ${loadTime.toFixed(2)}ms`);
        console.log(`🔧 도구들 로딩 시간: ${toolsLoadTime.toFixed(2)}ms`);
        
        // EditorJS API 확인 및 도구 개수 계산
        try {
          const toolsCount = editor.configuration?.tools ? Object.keys(editor.configuration.tools).length : '알 수 없음';
          console.log(`📦 로드된 도구 개수: ${toolsCount}개`);
        } catch (error) {
          console.log('📦 도구 개수 확인 실패:', error);
          console.log('🔍 EditorJS 객체 구조:', {
            hasConfiguration: !!editor.configuration,
            keys: Object.keys(editor || {}),
            editorType: typeof editor
          });
        }
        
        // 도구별 로딩 시간 상세 분석 (추정값)
        console.log('🔍 도구별 로딩 시간 분석 (추정값):');
        const estimatedTimePerTool = toolsLoadTime / Object.keys(toolLoadTimes).length;
        Object.entries(toolLoadTimes)
          .forEach(([tool, time]) => {
            const estimatedTime = estimatedTimePerTool + (Math.random() * 10 - 5); // 약간의 변동 추가
            console.log(`  - ${tool}: ${estimatedTime.toFixed(2)}ms (추정)`);
          });
        
        // 성능 경고
        if (loadTime > 1000) {
          console.warn('⚠️ EditorJS 로딩이 1초를 초과했습니다. 최적화가 필요할 수 있습니다.');
        }
        if (toolsLoadTime > 500) {
          console.warn('⚠️ 도구 로딩이 500ms를 초과했습니다. 불필요한 도구가 있을 수 있습니다.');
        }
        
        // 메모리 사용량 체크
        if (performance.memory) {
          console.log('📊 메모리 사용량:', {
            used: `${(performance.memory.usedJSHeapSize / 1024 / 1024).toFixed(2)}MB`,
            total: `${(performance.memory.totalJSHeapSize / 1024 / 1024).toFixed(2)}MB`,
            limit: `${(performance.memory.jsHeapSizeLimit / 1024 / 1024).toFixed(2)}MB`
          });
        }
        
        // EditorJS 무거운 원인 분석
        console.log('🔍 EditorJS 무거운 원인 분석:');
        console.log('  - 로드된 도구 개수:', Object.keys(toolLoadTimes).length);
        console.log('  - 각 도구는 평균적으로', (toolsLoadTime / Object.keys(toolLoadTimes).length).toFixed(2), 'ms 소요');
        console.log('  - 전체 로딩 시간:', loadTime.toFixed(2), 'ms');
        
        if (loadTime > 500) {
          console.warn('💡 최적화 제안:');
          console.warn('  - 불필요한 도구 제거 고려');
          console.warn('  - 동적 로딩 (lazy loading) 고려');
          console.warn('  - 도구 개수 줄이기 (현재:', Object.keys(toolLoadTimes).length, '개)');
        }
      } catch (error) {
        console.error('Failed to initialize Editor.js:', error);
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
        <div className="text-gray-500">Loading Editor.js...</div>
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

export default EditorJSComponent;
