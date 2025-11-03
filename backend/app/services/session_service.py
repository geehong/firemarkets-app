"""
세션 관리 서비스
"""
import uuid
import hashlib
from datetime import datetime, timedelta
from typing import Optional, List, Dict, Any
from sqlalchemy.orm import Session
from sqlalchemy import and_, or_

from app.models.asset import User, UserSession, TokenBlacklist, AuditLog
from app.core.security import security_manager
import logging

logger = logging.getLogger(__name__)


class SessionService:
    """세션 관리 서비스 클래스"""
    
    def __init__(self):
        self.max_sessions_per_user = 5  # 사용자당 최대 세션 수
        self.session_timeout_hours = 24  # 세션 타임아웃 (시간)
        self.refresh_token_days = 7  # 리프레시 토큰 유효기간 (일)
    
    def create_session(
        self, 
        db: Session, 
        user: User, 
        ip_address: str = None, 
        user_agent: str = None
    ) -> Dict[str, Any]:
        """새로운 세션 생성"""
        try:
            # 기존 세션 정리 (최대 세션 수 초과 시 오래된 세션 삭제)
            self._cleanup_old_sessions(db, user.id)
            
            # 세션 ID 생성 (UUID)
            session_id = str(uuid.uuid4())
            
            # 리프레시 토큰 생성
            refresh_token = security_manager.create_refresh_token(
                data={"sub": user.username, "user_id": user.id, "session_id": session_id}
            )
            
            # 리프레시 토큰 해시
            refresh_token_hash = security_manager.hash_token(refresh_token)
            
            # 세션 만료 시간 계산
            expires_at = datetime.utcnow() + timedelta(days=self.refresh_token_days)
            
            # 세션 저장
            user_session = UserSession(
                user_id=user.id,
                session_id=session_id,
                refresh_token_hash=refresh_token_hash,
                ip_address=ip_address,
                user_agent=user_agent,
                expires_at=expires_at,
                last_used_at=datetime.utcnow()
            )
            
            db.add(user_session)
            db.commit()
            
            # 액세스 토큰 생성
            access_token = security_manager.create_access_token(
                data={
                    "sub": user.username, 
                    "user_id": user.id, 
                    "role": user.role,
                    "session_id": session_id
                }
            )
            
            # 감사 로그 기록
            self._log_session_event(
                db, user.id, "session.created", 
                f"Session {session_id} created", ip_address
            )
            
            return {
                "access_token": access_token,
                "refresh_token": refresh_token,
                "session_id": session_id,
                "expires_at": expires_at.isoformat(),
                "user": {
                    "id": user.id,
                    "username": user.username,
                    "role": user.role,
                    "permissions": user.permissions or {}
                }
            }
            
        except Exception as e:
            logger.error(f"Failed to create session for user {user.id}: {e}")
            db.rollback()
            raise
    
    def validate_session(self, db: Session, session_id: str) -> Optional[UserSession]:
        """세션 유효성 검증"""
        try:
            session = db.query(UserSession).filter(
                and_(
                    UserSession.session_id == session_id,
                    UserSession.is_revoked == False,
                    UserSession.expires_at > datetime.utcnow()
                )
            ).first()
            
            if session:
                # 마지막 사용 시간 업데이트
                session.last_used_at = datetime.utcnow()
                db.commit()
                
            return session
            
        except Exception as e:
            logger.error(f"Failed to validate session {session_id}: {e}")
            return None
    
    def refresh_access_token(self, db: Session, refresh_token: str) -> Optional[Dict[str, Any]]:
        """리프레시 토큰으로 액세스 토큰 갱신"""
        try:
            # 리프레시 토큰 검증
            payload = security_manager.verify_refresh_token(refresh_token)
            if not payload:
                return None
            
            session_id = payload.get("session_id")
            user_id = payload.get("user_id")
            
            if not session_id or not user_id:
                return None
            
            # 세션 유효성 검증
            session = self.validate_session(db, session_id)
            if not session or session.user_id != user_id:
                return None
            
            # 사용자 정보 조회
            user = db.query(User).filter(User.id == user_id).first()
            if not user or not user.is_active:
                return None
            
            # 새로운 액세스 토큰 생성
            access_token = security_manager.create_access_token(
                data={
                    "sub": user.username,
                    "user_id": user.id,
                    "role": user.role,
                    "session_id": session_id
                }
            )
            
            return {
                "access_token": access_token,
                "token_type": "bearer",
                "expires_in": security_manager.ACCESS_TOKEN_EXPIRE_MINUTES * 60
            }
            
        except Exception as e:
            logger.error(f"Failed to refresh access token: {e}")
            return None
    
    def revoke_session(self, db: Session, session_id: str, user_id: int = None) -> bool:
        """세션 무효화"""
        try:
            session = db.query(UserSession).filter(
                and_(
                    UserSession.session_id == session_id,
                    UserSession.is_revoked == False
                )
            ).first()
            
            if not session:
                return False
            
            # 사용자 ID 확인 (보안)
            if user_id and session.user_id != user_id:
                return False
            
            # 세션 무효화
            session.is_revoked = True
            db.commit()
            
            # 감사 로그 기록
            self._log_session_event(
                db, session.user_id, "session.revoked",
                f"Session {session_id} revoked", session.ip_address
            )
            
            return True
            
        except Exception as e:
            logger.error(f"Failed to revoke session {session_id}: {e}")
            db.rollback()
            return False
    
    def revoke_all_user_sessions(self, db: Session, user_id: int) -> int:
        """사용자의 모든 세션 무효화"""
        try:
            sessions = db.query(UserSession).filter(
                and_(
                    UserSession.user_id == user_id,
                    UserSession.is_revoked == False
                )
            ).all()
            
            revoked_count = 0
            for session in sessions:
                session.is_revoked = True
                revoked_count += 1
            
            db.commit()
            
            # 감사 로그 기록
            self._log_session_event(
                db, user_id, "session.revoked_all",
                f"All sessions revoked for user {user_id}"
            )
            
            return revoked_count
            
        except Exception as e:
            logger.error(f"Failed to revoke all sessions for user {user_id}: {e}")
            db.rollback()
            return 0
    
    def get_user_sessions(self, db: Session, user_id: int) -> List[Dict[str, Any]]:
        """사용자의 활성 세션 목록 조회"""
        try:
            sessions = db.query(UserSession).filter(
                and_(
                    UserSession.user_id == user_id,
                    UserSession.is_revoked == False,
                    UserSession.expires_at > datetime.utcnow()
                )
            ).order_by(UserSession.last_used_at.desc()).all()
            
            return [
                {
                    "session_id": session.session_id,
                    "ip_address": session.ip_address,
                    "user_agent": session.user_agent,
                    "issued_at": session.issued_at.isoformat(),
                    "last_used_at": session.last_used_at.isoformat() if session.last_used_at else None,
                    "expires_at": session.expires_at.isoformat()
                }
                for session in sessions
            ]
            
        except Exception as e:
            logger.error(f"Failed to get sessions for user {user_id}: {e}")
            return []
    
    def cleanup_expired_sessions(self, db: Session) -> int:
        """만료된 세션 정리"""
        try:
            expired_sessions = db.query(UserSession).filter(
                UserSession.expires_at < datetime.utcnow()
            ).all()
            
            cleaned_count = 0
            for session in expired_sessions:
                db.delete(session)
                cleaned_count += 1
            
            db.commit()
            
            if cleaned_count > 0:
                logger.info(f"Cleaned up {cleaned_count} expired sessions")
            
            return cleaned_count
            
        except Exception as e:
            logger.error(f"Failed to cleanup expired sessions: {e}")
            db.rollback()
            return 0
    
    def _cleanup_old_sessions(self, db: Session, user_id: int):
        """사용자의 오래된 세션 정리 (최대 세션 수 초과 시)"""
        try:
            # 사용자의 활성 세션 수 확인
            active_sessions = db.query(UserSession).filter(
                and_(
                    UserSession.user_id == user_id,
                    UserSession.is_revoked == False,
                    UserSession.expires_at > datetime.utcnow()
                )
            ).order_by(UserSession.last_used_at.asc()).all()
            
            # 최대 세션 수 초과 시 오래된 세션 삭제
            if len(active_sessions) >= self.max_sessions_per_user:
                sessions_to_remove = active_sessions[:len(active_sessions) - self.max_sessions_per_user + 1]
                
                for session in sessions_to_remove:
                    session.is_revoked = True
                
                db.commit()
                
        except Exception as e:
            logger.error(f"Failed to cleanup old sessions for user {user_id}: {e}")
            db.rollback()
    
    def _log_session_event(
        self, 
        db: Session, 
        user_id: int, 
        action: str, 
        details: str, 
        ip_address: str = None
    ):
        """세션 이벤트 감사 로그 기록"""
        try:
            audit_log = AuditLog(
                user_id=user_id,
                action=action,
                resource_type="session",
                resource_id="",
                details=details,
                ip_address=ip_address
            )
            db.add(audit_log)
            db.commit()
        except Exception as e:
            logger.warning(f"Failed to log session event: {e}")


# 전역 인스턴스
session_service = SessionService()







