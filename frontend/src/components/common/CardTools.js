import React, { useState, useRef, useEffect } from 'react'
import {
  CButton,
  CButtonGroup,
  CDropdown,
  CDropdownMenu,
  CDropdownItem,
  CDropdownDivider,
  CDropdownToggle,
} from '@coreui/react'
import CIcon from '@coreui/icons-react'
import { cilMinus, cilPlus, cilX, cilSettings, cilReload, cilCloudDownload } from '@coreui/icons'

const CardTools = ({
  onCollapse,
  onRemove,
  onAction,
  showCollapse = true,
  showRemove = true,
  showDropdown = true,
  dropdownItems = [],
  className = '',
  showRefresh = true,
  showExport = false,
}) => {
  const [isCollapsed, setIsCollapsed] = useState(false)
  const cardToolsRef = useRef(null)

  const handleCollapse = () => {
    const newCollapsedState = !isCollapsed
    setIsCollapsed(newCollapsedState)

    // 현재 CardTools 컴포넌트의 가장 가까운 부모 카드 요소를 찾아서 collapsed 클래스 추가/제거
    const cardElement = cardToolsRef.current?.closest('.card')
    if (cardElement) {
      if (newCollapsedState) {
        cardElement.classList.add('collapsed')
      } else {
        cardElement.classList.remove('collapsed')
      }
    }

    if (onCollapse) {
      onCollapse(newCollapsedState)
    }
  }

  const handleRemove = () => {
    if (onRemove) {
      onRemove()
    }
  }

  const handleAction = (action) => {
    if (onAction) {
      onAction(action)
    }
  }

  const defaultDropdownItems = [
    ...dropdownItems,
    { label: 'Refresh', action: 'refresh', icon: cilReload },
    { label: 'Settings', action: 'settings', icon: cilSettings },
  ]

  if (showExport) {
    defaultDropdownItems.push({ label: 'Export', action: 'export', icon: cilCloudDownload })
  }

  return (
    <div ref={cardToolsRef} className={`card-tools ${className}`}>
      {showCollapse && (
        <CButton
          type="button"
          color="transparent"
          size="sm"
          className="btn-tool me-1"
          onClick={handleCollapse}
          title={isCollapsed ? 'Expand' : 'Collapse'}
        >
          <CIcon icon={isCollapsed ? cilPlus : cilMinus} />
        </CButton>
      )}

      {showRefresh && (
        <CButton
          type="button"
          color="transparent"
          size="sm"
          className="btn-tool me-1"
          onClick={() => handleAction('refresh')}
          title="Refresh"
        >
          <CIcon icon={cilReload} />
        </CButton>
      )}

      {showDropdown && (
        <CButtonGroup className="me-1">
          <CDropdown>
            <CDropdownToggle color="transparent" size="sm" className="btn-tool">
              <CIcon icon={cilSettings} />
            </CDropdownToggle>
            <CDropdownMenu>
              {defaultDropdownItems.map((item, index) => (
                <CDropdownItem
                  key={index}
                  onClick={() => handleAction(item.action)}
                  disabled={item.disabled}
                >
                  {item.icon && <CIcon icon={item.icon} className="me-2" />}
                  {item.label}
                </CDropdownItem>
              ))}
            </CDropdownMenu>
          </CDropdown>
        </CButtonGroup>
      )}

      {showRemove && (
        <CButton
          type="button"
          color="transparent"
          size="sm"
          className="btn-tool"
          onClick={handleRemove}
          title="Remove"
        >
          <CIcon icon={cilX} />
        </CButton>
      )}
    </div>
  )
}

export default CardTools
