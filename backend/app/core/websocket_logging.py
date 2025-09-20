"""
WebSocket Consumer 로깅 설정 및 유틸리티
"""
import logging
import os
from datetime import datetime
from typing import Dict, Any
import json

class WebSocketLogger:
    """WebSocket Consumer 전용 로거"""
    
    def __init__(self, consumer_name: str):
        self.consumer_name = consumer_name
        self.logger = logging.getLogger(f"websocket.{consumer_name}")
        
        # 로그 디렉토리 생성
        log_dir = "/app/logs/websocket"
        os.makedirs(log_dir, exist_ok=True)
        
        # 파일 핸들러 설정
        file_handler = logging.FileHandler(f"{log_dir}/{consumer_name}.log")
        file_handler.setLevel(logging.DEBUG)
        
        # 포맷터 설정
        formatter = logging.Formatter(
            '%(asctime)s - %(name)s - %(levelname)s - %(message)s'
        )
        file_handler.setFormatter(formatter)
        
        # 핸들러 추가
        if not self.logger.handlers:
            self.logger.addHandler(file_handler)
            self.logger.setLevel(logging.DEBUG)
    
    def connection_attempt(self, url: str):
        """연결 시도 로그"""
        self.logger.info(f"🔌 {self.consumer_name} attempting connection to {url}")
    
    def connection_success(self):
        """연결 성공 로그"""
        self.logger.info(f"✅ {self.consumer_name} connected")
    
    def connection_failed(self, error: str):
        """연결 실패 로그"""
        self.logger.error(f"❌ {self.consumer_name} connection failed: {error}")
    
    def subscription_start(self, tickers: list):
        """구독 시작 로그"""
        self.logger.info(f"📋 {self.consumer_name} starting subscription for {len(tickers)} tickers: {tickers}")
    
    def subscription_success(self, count: int):
        """구독 성공 로그"""
        self.logger.info(f"📋 {self.consumer_name} subscribed to {count} streams/products")
    
    def subscription_failed(self, error: str):
        """구독 실패 로그"""
        self.logger.error(f"❌ {self.consumer_name} subscription failed: {error}")
    
    def data_received(self, data_type: str, symbol: str, price: str, volume: str = None):
        """데이터 수신 로그"""
        volume_str = f" (Vol: {volume})" if volume else ""
        self.logger.info(f"📈 {self.consumer_name} {symbol}: ${price}{volume_str}")
    
    def message_processing(self, message_type: str):
        """메시지 처리 로그"""
        self.logger.debug(f"📨 {self.consumer_name} processing {message_type} message")
    
    def heartbeat(self):
        """하트비트 로그"""
        self.logger.debug(f"💓 {self.consumer_name} heartbeat")
    
    def reconnection_attempt(self, attempt: int, max_attempts: int):
        """재연결 시도 로그"""
        self.logger.info(f"🔄 {self.consumer_name} attempting reconnection {attempt}/{max_attempts}")
    
    def reconnection_success(self):
        """재연결 성공 로그"""
        self.logger.info(f"✅ {self.consumer_name} reconnected and resubscribed")
    
    def reconnection_failed(self, error: str):
        """재연결 실패 로그"""
        self.logger.error(f"❌ {self.consumer_name} reconnection failed: {error}")
    
    def connection_closed(self):
        """연결 종료 로그"""
        self.logger.warning(f"⚠️ {self.consumer_name} connection closed")
    
    def started(self, ticker_count: int):
        """시작 로그"""
        self.logger.info(f"🚀 {self.consumer_name} started with {ticker_count} tickers")
    
    def stopped(self):
        """중지 로그"""
        self.logger.info(f"🛑 {self.consumer_name} stopped")
    
    def error(self, error: str, error_type: str = None):
        """오류 로그"""
        if error_type:
            self.logger.error(f"❌ {self.consumer_name} error ({error_type}): {error}")
        else:
            self.logger.error(f"❌ {self.consumer_name} error: {error}")

class WebSocketOrchestratorLogger:
    """WebSocket Orchestrator 전용 로거"""
    
    def __init__(self):
        self.logger = logging.getLogger("websocket.orchestrator")
        
        # 로그 디렉토리 생성
        log_dir = "/app/logs/websocket"
        os.makedirs(log_dir, exist_ok=True)
        
        # 파일 핸들러 설정
        file_handler = logging.FileHandler(f"{log_dir}/orchestrator.log")
        file_handler.setLevel(logging.INFO)
        
        # 포맷터 설정
        formatter = logging.Formatter(
            '%(asctime)s - %(name)s - %(levelname)s - %(message)s'
        )
        file_handler.setFormatter(formatter)
        
        # 핸들러 추가
        if not self.logger.handlers:
            self.logger.addHandler(file_handler)
            self.logger.setLevel(logging.INFO)
    
    def rebalancing_start(self, total_tickers: int):
        """리밸런싱 시작 로그"""
        self.logger.info(f"🔄 Starting rebalancing for {total_tickers} tickers")
    
    def equal_distribution(self, ticker_count: int, consumer_count: int):
        """균등 분배 로그"""
        self.logger.info(f"🔄 Equal distribution mode: {ticker_count} crypto tickers to {consumer_count} consumers")
    
    def ticker_assigned(self, consumer: str, ticker: str, method: str, count: int, max_count: int):
        """티커 할당 로그"""
        self.logger.info(f"📋 Assigned {ticker} to {consumer} ({method}, {count}/{max_count})")
    
    def consumer_assignment_complete(self, consumer: str, count: int, max_count: int):
        """Consumer 할당 완료 로그"""
        self.logger.info(f"✅ {consumer}: {count} tickers assigned ({count}/{max_count})")
    
    def rebalancing_complete(self, consumer_count: int):
        """리밸런싱 완료 로그"""
        self.logger.info(f"✅ Rebalancing completed. {consumer_count} consumers assigned")
    
    def consumer_task_created(self, consumer: str, ticker_count: int):
        """Consumer 태스크 생성 로그"""
        self.logger.info(f"🔧 Creating task for {consumer} with {ticker_count} tickers")
    
    def consumer_started(self, consumer: str, ticker_count: int):
        """Consumer 시작 로그"""
        self.logger.info(f"🚀 Starting {consumer} with {ticker_count} tickers")
    
    def consumer_failure_handled(self, failed_consumer: str, ticker_count: int):
        """Consumer 실패 처리 로그"""
        self.logger.warning(f"🔄 {failed_consumer} failure handled, {ticker_count} tickers reassigned")
    
    def error(self, error: str):
        """오류 로그"""
        self.logger.error(f"❌ Orchestrator error: {error}")

# 전역 로거 인스턴스
orchestrator_logger = WebSocketOrchestratorLogger()








