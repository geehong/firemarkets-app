// frontend/src/_nav.js
import React from 'react' // JSX를 사용하므로 React 임포트 유지
import CIcon from '@coreui/icons-react' // CIcon 컴포넌트 사용하므로 임포트 유지

// 실제로 사용되는 CoreUI 아이콘만 개별적으로 임포트 (성능 최적화)
import {
  cibBtc,
  cibGoldenline,
  cilChart,
  cilChartLine,
  cilFactory,
  cilDollar,
  cilSwapHorizontal,
  cilCalendarCheck,
  cilLibrary,
  cibBitcoin,
  cibMatrix,
  cilChartPie,
  cilPuzzle,
  cilDrop,
  cilPencil,
  cilCursor,
  cilNotes,
  cilStar,
  cilBell,
  cilShieldAlt,
  cilSpeedometer,
} from '@coreui/icons'

// CoreUI 컴포넌트들을 여기서 임포트합니다.
import { CNavGroup, CNavItem, CNavTitle } from '@coreui/react'

/**
 * API에서 받아온 데이터를 기반으로 동적 네비게이션 아이템을 생성하는 함수
 * @param {Array} menuItems - /api/v1/navigation/menu 응답 데이터
 * @returns {Array} CoreUI 네비게이션 아이템 배열
 */
const getNavigationItems = (menuItems = []) => {
  // 아이콘 매핑 함수
  const getIconComponent = (iconName) => {
    const iconMap = {
      'cibBtc': cibBtc,
      'cibGoldenline': cibGoldenline,
      'cilChart': cilChart,
      'cilChartLine': cilChartLine,
      'cilFactory': cilFactory,
      'cilDollar': cilDollar,
      'cilSwapHorizontal': cilSwapHorizontal,
      'cilCalendarCheck': cilCalendarCheck,
      'cilLibrary': cilLibrary,
      'cibBitcoin': cibBitcoin,
      'cibMatrix': cibMatrix,
      'cilChartPie': cilChartPie,
      'cilPuzzle': cilPuzzle,
      'cilDrop': cilDrop,
      'cilPencil': cilPencil,
      'cilCursor': cilCursor,
      'cilNotes': cilNotes,
      'cilStar': cilStar,
      'cilBell': cilBell,
      'cilShieldAlt': cilShieldAlt,
      'cilSpeedometer': cilSpeedometer,
    };
    return iconMap[iconName] || cilChart;
  };

  // 메뉴 아이템을 CoreUI 형식으로 변환하는 함수
  const formatMenuItems = (items) => {
    return items.map((item) => {
      const navItem = {
        name: item.name,
      };

      // 아이콘 처리
      if (item.icon) {
        const IconComponent = getIconComponent(item.icon);
        navItem.icon = <CIcon icon={IconComponent} customClassName="nav-icon" />;
      }

      // JSON 메타데이터 처리
      if (item.metadata) {
        const metadata = item.metadata;
        
        // 배지 처리
        if (metadata.badge) {
          navItem.badge = {
            color: 'info',
            text: metadata.badge
          };
        }
        
        // 권한 처리 (필요시)
        if (metadata.permissions) {
          navItem.permissions = metadata.permissions;
        }
        
        // 다국어 설명 처리 (툴팁 등에 사용 가능)
        if (metadata.description) {
          navItem.description = metadata.description;
          // 현재 언어에 따른 설명 선택 (기본값: 한국어)
          const currentLang = localStorage.getItem('language') || 'ko';
          navItem.tooltip = metadata.description[currentLang] || metadata.description.ko || metadata.description.en;
        }
      }

      // 컴포넌트 타입 및 경로 처리
      if (item.children && item.children.length > 0) {
        navItem.component = CNavGroup;
        navItem.items = formatMenuItems(item.children);
      } else if (item.path) {
        navItem.component = CNavItem;
        navItem.to = item.path;
      } else {
        // 경로가 없는 아이템 (예: 카테고리 제목)
        navItem.component = CNavTitle;
      }

      return navItem;
    });
  };

  return formatMenuItems(menuItems);
};

export default getNavigationItems
