'use client'

import { useState } from 'react'
import DefaultInputs from '@/components/form/form-elements/DefaultInputs'
import InputStates from '@/components/form/form-elements/InputStates'
import SelectInputs from '@/components/form/form-elements/SelectInputs'
import TextAreaInput from '@/components/form/form-elements/TextAreaInput'
import CheckboxComponents from '@/components/form/form-elements/CheckboxComponents'
import RadioButtons from '@/components/form/form-elements/RadioButtons'
import ToggleSwitch from '@/components/form/form-elements/ToggleSwitch'
import InputGroup from '@/components/form/form-elements/InputGroup'
import FileInputExample from '@/components/form/form-elements/FileInputExample'
import DropZone from '@/components/form/form-elements/DropZone'

export default function FormsPage() {
  const [activeForm, setActiveForm] = useState('inputs')

  return (
    <main className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
          Forms
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          Interactive form components and input elements for user data collection.
        </p>
      </div>

      {/* Form Type Selector */}
      <div className="mb-6">
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setActiveForm('inputs')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              activeForm === 'inputs'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            Default Inputs
          </button>
          <button
            onClick={() => setActiveForm('states')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              activeForm === 'states'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            Input States
          </button>
          <button
            onClick={() => setActiveForm('selects')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              activeForm === 'selects'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            Select Inputs
          </button>
          <button
            onClick={() => setActiveForm('checkboxes')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              activeForm === 'checkboxes'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            Checkboxes
          </button>
          <button
            onClick={() => setActiveForm('radios')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              activeForm === 'radios'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            Radio Buttons
          </button>
          <button
            onClick={() => setActiveForm('files')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              activeForm === 'files'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            File Inputs
          </button>
        </div>
      </div>

      {/* Form Display */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 mb-8">
        <div className="min-h-96">
          {activeForm === 'inputs' && <DefaultInputs />}
          {activeForm === 'states' && <InputStates />}
          {activeForm === 'selects' && <SelectInputs />}
          {activeForm === 'checkboxes' && <CheckboxComponents />}
          {activeForm === 'radios' && <RadioButtons />}
          {activeForm === 'files' && (
            <div className="space-y-6">
              <FileInputExample />
              <DropZone />
            </div>
          )}
        </div>
      </div>

      {/* Form Examples Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold mb-4">Text Area</h3>
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            Multi-line text input component.
          </p>
          <TextAreaInput />
        </div>
        
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold mb-4">Toggle Switch</h3>
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            Toggle switch component for boolean values.
          </p>
          <ToggleSwitch />
        </div>
        
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold mb-4">Input Group</h3>
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            Input group with addons and buttons.
          </p>
          <InputGroup />
        </div>
      </div>
    </main>
  )
}