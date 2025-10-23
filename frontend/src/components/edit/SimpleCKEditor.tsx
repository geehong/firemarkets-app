import React, { useEffect, useRef } from 'react'

interface SimpleCKEditorProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  height?: number
}

// CKEditor 4 타입 선언
declare global {
  interface Window {
    CKEDITOR: {
      replace: (element: HTMLElement, config: Record<string, unknown>) => {
        getData: () => string
        setData: (data: string) => void
        destroy: () => void
        on: (event: string, callback: (evt: { editor: { getData: () => string } }) => void) => void
      }
    }
  }
}

const SimpleCKEditor: React.FC<SimpleCKEditorProps> = ({ 
  value, 
  onChange, 
  height = 400 
}) => {
  const editorRef = useRef<HTMLDivElement>(null)
  const ckEditorRef = useRef<{ getData: () => string; setData: (data: string) => void; destroy: () => void; on: (event: string, callback: (evt: { editor: { getData: () => string } }) => void) => void } | null>(null)
  const isInitialized = useRef(false)
  const editorId = useRef(`editor_${Math.random().toString(36).substr(2, 9)}`)

  useEffect(() => {
    // 현재 에디터 ID를 변수로 저장 (cleanup에서 사용)
    const currentEditorId = editorId.current
    
    // CKEditor 초기화
    const initializeEditor = () => {
      if (!editorRef.current || isInitialized.current) return

      // 기존 에디터가 있다면 제거
      if (ckEditorRef.current) {
        console.log('🗑️ Destroying existing editor')
        ckEditorRef.current.destroy()
        ckEditorRef.current = null
        isInitialized.current = false
      }

      // 기존 CKEditor 스크립트가 있다면 제거 (CDN 캐시 방지)
      const existingScript = document.querySelector('script[src*="ckeditor"]')
      if (existingScript) {
        existingScript.remove()
        console.log('🗑️ Removed existing CKEditor script')
      }

      // 로컬 CKEditor 로드 (캐시 방지를 위해 타임스탬프 추가)
      const script = document.createElement('script')
      script.src = `/ckeditor/ckeditor.js?t=${Date.now()}`
      script.onload = () => {
        console.log('✅ Local CKEditor loaded successfully')
        createEditor()
      }
      script.onerror = () => {
        console.error('❌ Failed to load local CKEditor')
      }
      document.head.appendChild(script)
    }

    const createEditor = () => {
      if (!window.CKEDITOR || !editorRef.current) return

      try {
        // 기존 에디터가 있다면 완전히 제거
        if (ckEditorRef.current) {
          console.log('🗑️ Destroying existing editor before creating new one')
          ckEditorRef.current.destroy()
          ckEditorRef.current = null
          isInitialized.current = false
        }

        // DOM 요소를 완전히 정리하고 새로 생성
        const currentElement = editorRef.current
        const parent = currentElement.parentNode
        const newElement = document.createElement('div')
        newElement.className = currentElement.className
        newElement.style.cssText = currentElement.style.cssText
        parent?.replaceChild(newElement, currentElement)
        editorRef.current = newElement

        // 고유한 에디터 이름 사용
        const uniqueId = currentEditorId
        console.log(`🚀 Creating CKEditor with ID: ${uniqueId}`)
        
        ckEditorRef.current = window.CKEDITOR.replace(newElement, {
          height,
          language: 'ko',
          // 로컬 CKEditor의 기본 설정 사용
          toolbar: 'Full',
          // 로컬 CKEditor의 contents.css 사용
          contentsCss: '/ckeditor/contents.css',
          // 고유한 에디터 이름 설정
          name: uniqueId,
          // PDF 내보내기 관련 설정 비활성화하여 경고 제거
          removePlugins: 'exportpdf',
          // 알림 비활성화
          notification_duration: 0,
          // 버전 체크 비활성화
          versionCheck: false,
          on: {
            instanceReady: () => {
              console.log(`✅ Local CKEditor ready with ID: ${uniqueId}`)
              // 초기 값 설정
              if (value && ckEditorRef.current) {
                ckEditorRef.current.setData(value)
              }
              isInitialized.current = true
            },
            change: (evt: { editor: { getData: () => string } }) => {
              const data = evt.editor.getData()
              onChange(data)
            }
          }
        })
      } catch (error) {
        console.error('Error creating local CKEditor:', error)
      }
    }

    initializeEditor()

    return () => {
      if (ckEditorRef.current) {
        console.log(`🧹 Cleaning up CKEditor with ID: ${currentEditorId}`)
        ckEditorRef.current.destroy()
        ckEditorRef.current = null
        isInitialized.current = false
      }
    }
  }, [height, onChange]) // value 의존성 제거하여 무한 루프 방지

  // 값이 변경될 때 에디터 내용 업데이트 (무한 루프 방지를 위한 가드 추가)
  useEffect(() => {
    if (ckEditorRef.current && isInitialized.current && value !== undefined) {
      const currentData = ckEditorRef.current.getData()
      // 값이 실제로 다를 때만 업데이트 (빈 문자열과 undefined 구분)
      if (currentData !== value) {
        ckEditorRef.current.setData(value || '')
      }
    }
  }, [value]) // value는 의도적으로 의존성에 포함 (에디터 내용 동기화용)

  return (
    <div>
      <div ref={editorRef} />
    </div>
  )
}

export default SimpleCKEditor
