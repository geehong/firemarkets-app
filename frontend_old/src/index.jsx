import React from 'react'
import { createRoot } from 'react-dom/client'
import { Provider } from 'react-redux'
// core-js 전체 import 제거 (성능 최적화)
// import 'core-js'

import App from './App'
import store from './store'

createRoot(document.getElementById('root')).render(
  <Provider store={store}>
    <App />
  </Provider>,
)
