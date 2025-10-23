'use client'

import React from 'react'
import { useLocalizedData } from '@/contexts/LocalizedDataContext'

/**
 * Higher-Order Component that automatically provides localized data to components
 * This eliminates the need to manually call useLocalizedContent() in every component
 */
export function withLocalization<P extends object>(
  WrappedComponent: React.ComponentType<P>
) {
  const LocalizedComponent = (props: P) => {
    const localizedData = useLocalizedData()
    
    // Pass localized functions as props to the wrapped component
    const enhancedProps = {
      ...props,
      ...localizedData
    } as P & typeof localizedData

    return <WrappedComponent {...enhancedProps} />
  }

  LocalizedComponent.displayName = `withLocalization(${WrappedComponent.displayName || WrappedComponent.name})`
  
  return LocalizedComponent
}

/**
 * Hook that provides localized data processing functions
 * Use this in components that need manual control over localization
 */
export const useLocalization = () => {
  return useLocalizedData()
}
