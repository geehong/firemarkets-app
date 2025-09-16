import React from 'react'
import { CNav, CNavItem, CNavLink } from '@coreui/react'
import CIcon from '@coreui/icons-react'
import { CATEGORY_ICONS } from '../../../../constants/tickerSettings'

const TickerTabs = ({ categories, activeTab, onTabChange }) => {
  return (
    <CNav variant="tabs" role="tablist" className="border-bottom-0 ps-3">
      {categories.map((category) => (
        <CNavItem key={category}>
          <CNavLink
            href="#"
            active={activeTab === category}
            onClick={(e) => {
              e.preventDefault()
              onTabChange(category)
            }}
          >
            <CIcon icon={CATEGORY_ICONS[category] || 'cil-chart'} className="me-2" />
            {category}
          </CNavLink>
        </CNavItem>
      ))}
    </CNav>
  )
}

export default TickerTabs
