// frontend/src/utils/iconMapper.ts
import React from 'react';
import {
  BoxCubeIcon,
  CalenderIcon,
  GridIcon,
  ListIcon,
  PageIcon,
  PieChartIcon,
  PlugInIcon,
  TableIcon,
  UserCircleIcon,
} from '../icons/index';

// 아이콘 컴포넌트 매핑 객체
const iconComponentMap: Record<string, React.ComponentType> = {
  // CoreUI Icons
  'cilSpeedometer': GridIcon,
  'cilChartPie': PieChartIcon,
  'cilPuzzle': BoxCubeIcon,
  'cilCursor': PlugInIcon,
  'cilNotes': ListIcon,
  'cilStar': PageIcon,
  'cilBell': PlugInIcon,
  'cilCalculator': TableIcon,
  'cilBug': PlugInIcon,
  'cilDescription': PageIcon,
  'cilDrop': PlugInIcon,
  'cilPencil': PlugInIcon,
  'cilExternalLink': PlugInIcon,
  'cilGoldenline': PieChartIcon,
  'cilBitcoin': PlugInIcon,
  'cilMatrix': TableIcon,
  'cilShieldAlt': UserCircleIcon,
  'cilChartLine': PieChartIcon,
  'cilSpiral': PlugInIcon,
  'cilProgress': PlugInIcon,
  'cilCalendar': CalenderIcon,
  
  // Brand Icons
  'cibBitcoin': PlugInIcon,
  'cibChartLine': PieChartIcon,
  'cibSpiral': PlugInIcon,
  'cibProgress': PlugInIcon,
  'cibCalendar': CalenderIcon,
  'cibMatrix': TableIcon,
  'cibShieldAlt': UserCircleIcon,
  'cibGoldenline': PieChartIcon,
};

/**
 * 아이콘 이름을 React 컴포넌트로 변환합니다
 * @param iconName - 아이콘 이름
 * @returns React 컴포넌트 또는 기본 아이콘
 */
export const getIconComponent = (iconName?: string): React.ReactNode => {
  if (!iconName) {
    return React.createElement(PlugInIcon); // 기본 아이콘
  }
  
  const IconComponent = iconComponentMap[iconName] || PlugInIcon;
  return React.createElement(IconComponent);
};

/**
 * 메뉴 아이템의 메타데이터에서 배지 정보를 추출합니다
 * @param metadata - 메뉴 메타데이터
 * @returns 배지 정보 또는 null
 */
export const getBadgeFromMetadata = (metadata?: any) => {
  if (!metadata || !metadata.badge) {
    return null;
  }
  
  if (typeof metadata.badge === 'string') {
    return {
      text: metadata.badge,
      color: 'info'
    };
  }
  
  return {
    text: metadata.badge.text || metadata.badge,
    color: metadata.badge.color || 'info'
  };
};

/**
 * 메뉴 아이템의 메타데이터에서 다국어 설명을 추출합니다
 * @param metadata - 메뉴 메타데이터
 * @param language - 언어 코드 (기본값: 'ko')
 * @returns 설명 텍스트
 */
export const getDescriptionFromMetadata = (metadata?: any, language: string = 'ko') => {
  if (!metadata || !metadata.description) {
    return '';
  }
  
  if (typeof metadata.description === 'string') {
    return metadata.description;
  }
  
  return metadata.description[language] || metadata.description.en || metadata.description.ko || '';
};
