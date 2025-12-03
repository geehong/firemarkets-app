#!/usr/bin/env python3
"""
비밀번호 해시 생성 스크립트
실제 운영에서는 이 스크립트를 사용하여 안전한 비밀번호 해시를 생성하세요.
"""

from passlib.context import CryptContext
import sys

def generate_password_hash(password: str) -> str:
    """비밀번호 해시 생성"""
    pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
    return pwd_context.hash(password)

def main():
    if len(sys.argv) != 2:
        print("사용법: python generate_password_hash.py <비밀번호>")
        print("예시: python generate_password_hash.py admin123")
        sys.exit(1)
    
    password = sys.argv[1]
    hashed_password = generate_password_hash(password)
    
    print(f"원본 비밀번호: {password}")
    print(f"해시된 비밀번호: {hashed_password}")
    print("\nSQL INSERT 문:")
    print(f"password_hash = '{hashed_password}'")

if __name__ == "__main__":
    main() 