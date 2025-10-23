'use client'

import React, { useState } from 'react'
import BaseEdit, { BaseEditProps, PostFormState } from './BaseEdit'

interface OnChainData {
  contractAddress: string
  network: string
  tokenId?: string
  metadata?: Record<string, string | number | boolean>
  // 추가 OnChain 필드들
  blockNumber?: number
  transactionHash?: string
  gasUsed?: number
  gasPrice?: number
  fromAddress?: string
  toAddress?: string
  value?: string
  timestamp?: number
}

interface OnChainEditProps extends Omit<BaseEditProps, 'postType'> {
  // OnChainEdit 특화 props
  onChainData?: OnChainData
  onOnChainDataChange?: (data: OnChainData) => void
}

export default function OnChainEdit({ 
  postId, 
  mode = 'create', 
  onSave,
  onCancel,
  onChainData,
  onOnChainDataChange,
  ...props 
}: OnChainEditProps) {
  const [onChainFormData, setOnChainFormData] = useState<OnChainData>({
    contractAddress: '',
    network: 'ethereum',
    tokenId: '',
    metadata: {},
    blockNumber: undefined,
    transactionHash: '',
    gasUsed: undefined,
    gasPrice: undefined,
    fromAddress: '',
    toAddress: '',
    value: '',
    timestamp: undefined,
    ...onChainData
  })

  // OnChainEdit 특화 저장 로직
  const handleOnChainSave = (data: PostFormState) => {
    // 실제 API 구조에 맞춘 데이터 준비
    const onChainPostData = {
      ...data,
      post_type: 'onchain' as const,
      // OnChain 관련 메타데이터를 customFields에 포함
      customFields: {
        contractAddress: onChainFormData.contractAddress,
        network: onChainFormData.network,
        tokenId: onChainFormData.tokenId,
        metadata: onChainFormData.metadata,
        // OnChain 데이터를 description에 추가
        onChainDescription: {
          ko: `[OnChain Data]\nContract: ${onChainFormData.contractAddress}\nNetwork: ${onChainFormData.network}${onChainFormData.tokenId ? `\nToken ID: ${onChainFormData.tokenId}` : ''}`,
          en: `[OnChain Data]\nContract: ${onChainFormData.contractAddress}\nNetwork: ${onChainFormData.network}${onChainFormData.tokenId ? `\nToken ID: ${onChainFormData.tokenId}` : ''}`
        }
      }
    }
    
    console.log('🔗 OnChain data prepared:', {
      contractAddress: onChainFormData.contractAddress,
      network: onChainFormData.network,
      tokenId: onChainFormData.tokenId,
      metadata: onChainFormData.metadata
    })
    
    if (onSave) {
      onSave(onChainPostData)
    }
  }

  // OnChain 데이터 업데이트
  const updateOnChainData = (field: keyof OnChainData, value: string | Record<string, string | number | boolean>) => {
    const newData = {
      ...onChainFormData,
      [field]: value
    }
    setOnChainFormData(newData)
    if (onOnChainDataChange) {
      onOnChainDataChange(newData)
    }
  }

  return (
    <div>
      {/* OnChain 데이터 입력 섹션 */}
      <div className="mb-6 p-4 bg-gray-50 rounded-lg">
        <h3 className="text-lg font-semibold mb-4">OnChain 데이터</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* 컨트랙트 주소 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              컨트랙트 주소
            </label>
            <input
              type="text"
              value={onChainFormData.contractAddress}
              onChange={(e) => updateOnChainData('contractAddress', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="0x..."
            />
          </div>

          {/* 네트워크 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              네트워크
            </label>
            <select
              value={onChainFormData.network}
              onChange={(e) => updateOnChainData('network', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="ethereum">Ethereum</option>
              <option value="polygon">Polygon</option>
              <option value="bsc">BSC</option>
              <option value="arbitrum">Arbitrum</option>
              <option value="optimism">Optimism</option>
              <option value="base">Base</option>
            </select>
          </div>

          {/* 토큰 ID (NFT인 경우) */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              토큰 ID (선택사항)
            </label>
            <input
              type="text"
              value={onChainFormData.tokenId || ''}
              onChange={(e) => updateOnChainData('tokenId', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="NFT 토큰 ID"
            />
          </div>

          {/* 메타데이터 URL */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              메타데이터 URL (선택사항)
            </label>
            <input
              type="url"
              value={typeof onChainFormData.metadata?.url === 'string' ? onChainFormData.metadata.url : ''}
              onChange={(e) => updateOnChainData('metadata', { ...onChainFormData.metadata, url: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="https://..."
            />
          </div>
        </div>

        {/* 추가 OnChain 필드들 */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
          {/* 트랜잭션 해시 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              트랜잭션 해시
            </label>
            <input
              type="text"
              value={onChainFormData.transactionHash || ''}
              onChange={(e) => updateOnChainData('transactionHash', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="0x..."
            />
          </div>

          {/* 블록 번호 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              블록 번호
            </label>
            <input
              type="number"
              value={onChainFormData.blockNumber || ''}
              onChange={(e) => updateOnChainData('blockNumber', parseInt(e.target.value) || 0)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="12345678"
            />
          </div>

          {/* From 주소 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              From 주소
            </label>
            <input
              type="text"
              value={onChainFormData.fromAddress || ''}
              onChange={(e) => updateOnChainData('fromAddress', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="0x..."
            />
          </div>

          {/* To 주소 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              To 주소
            </label>
            <input
              type="text"
              value={onChainFormData.toAddress || ''}
              onChange={(e) => updateOnChainData('toAddress', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="0x..."
            />
          </div>

          {/* Value */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Value (ETH/Wei)
            </label>
            <input
              type="text"
              value={onChainFormData.value || ''}
              onChange={(e) => updateOnChainData('value', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="0.1"
            />
          </div>

          {/* Gas Used */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Gas Used
            </label>
            <input
              type="number"
              value={onChainFormData.gasUsed || ''}
              onChange={(e) => updateOnChainData('gasUsed', parseInt(e.target.value) || 0)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="21000"
            />
          </div>
        </div>

        {/* OnChain 데이터 미리보기 */}
        {(onChainFormData.contractAddress || onChainFormData.transactionHash) && (
          <div className="mt-4 p-3 bg-blue-100 rounded-lg">
            <h4 className="font-semibold text-blue-800 mb-2">OnChain 데이터 미리보기:</h4>
            <div className="text-sm text-blue-700 space-y-1">
              {onChainFormData.contractAddress && <p><strong>컨트랙트:</strong> {onChainFormData.contractAddress}</p>}
              <p><strong>네트워크:</strong> {onChainFormData.network}</p>
              {onChainFormData.tokenId && <p><strong>토큰 ID:</strong> {onChainFormData.tokenId}</p>}
              {onChainFormData.transactionHash && <p><strong>트랜잭션:</strong> {onChainFormData.transactionHash}</p>}
              {onChainFormData.blockNumber && <p><strong>블록 번호:</strong> {onChainFormData.blockNumber.toLocaleString()}</p>}
              {onChainFormData.fromAddress && <p><strong>From:</strong> {onChainFormData.fromAddress}</p>}
              {onChainFormData.toAddress && <p><strong>To:</strong> {onChainFormData.toAddress}</p>}
              {onChainFormData.value && <p><strong>Value:</strong> {onChainFormData.value}</p>}
              {onChainFormData.gasUsed && <p><strong>Gas Used:</strong> {onChainFormData.gasUsed.toLocaleString()}</p>}
              {onChainFormData.metadata?.url && <p><strong>메타데이터:</strong> {onChainFormData.metadata.url}</p>}
            </div>
          </div>
        )}
      </div>

      {/* 기본 에디터 */}
      <BaseEdit
        postId={postId}
        mode={mode}
        postType="onchain"
        onSave={handleOnChainSave}
        onCancel={onCancel}
        {...props}
      />
    </div>
  )
}
