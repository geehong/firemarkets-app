#!/usr/bin/env python3
"""
MySQL SQL dump를 깔끔한 PostgreSQL로 변환하는 스크립트
"""

import re
import sys

def clean_postgres_conversion(mysql_sql):
    """MySQL SQL을 깔끔한 PostgreSQL로 변환"""
    
    lines = mysql_sql.split('\n')
    postgres_lines = []
    in_create_table = False
    current_table = None
    
    for line in lines:
        line = line.strip()
        
        # MySQL 헤더 제거
        if line.startswith('-- phpMyAdmin') or line.startswith('SET SQL_MODE') or \
           line.startswith('START TRANSACTION') or line.startswith('SET time_zone') or \
           line.startswith('/*!40101') or line.startswith('COMMIT'):
            continue
            
        # 빈 줄 유지
        if not line:
            postgres_lines.append('')
            continue
            
        # 주석 유지
        if line.startswith('--'):
            postgres_lines.append(line)
            continue
            
        # CREATE TABLE 시작
        if line.startswith('CREATE TABLE'):
            in_create_table = True
            # 백틱을 따옴표로 변경
            line = line.replace('`', '"')
            postgres_lines.append(line)
            continue
            
        # CREATE TABLE 내부 처리
        if in_create_table:
            if line.endswith(';'):
                in_create_table = False
                # ENGINE, CHARSET 제거
                line = re.sub(r'\s+ENGINE=InnoDB.*?;', ';', line)
                line = re.sub(r'\s+DEFAULT\s+CHARSET=.*?;', ';', line)
                line = re.sub(r'\s+COLLATE=.*?;', ';', line)
                
            # 백틱을 따옴표로 변경
            line = line.replace('`', '"')
            
            # 데이터 타입 변환
            line = re.sub(r'bigint\s+NOT\s+NULL\s+AUTO_INCREMENT', 'BIGSERIAL PRIMARY KEY', line)
            line = re.sub(r'bigint\s+AUTO_INCREMENT', 'BIGSERIAL', line)
            line = re.sub(r'int\s+NOT\s+NULL\s+AUTO_INCREMENT', 'SERIAL PRIMARY KEY', line)
            line = re.sub(r'int\s+AUTO_INCREMENT', 'SERIAL', line)
            line = re.sub(r'tinyint\(1\)', 'BOOLEAN', line)
            line = re.sub(r"tinyint\(1\)\s+DEFAULT\s+'0'", 'BOOLEAN DEFAULT FALSE', line)
            line = re.sub(r"tinyint\(1\)\s+DEFAULT\s+'1'", 'BOOLEAN DEFAULT TRUE', line)
            line = re.sub(r'varchar\((\d+)\)\s+CHARACTER\s+SET\s+utf8mb4\s+COLLATE\s+utf8mb4_general_ci', r'VARCHAR(\1)', line)
            line = re.sub(r'text\s+CHARACTER\s+SET\s+utf8mb4\s+COLLATE\s+utf8mb4_general_ci', 'TEXT', line)
            line = re.sub(r'datetime', 'TIMESTAMP', line)
            
            # COMMENT 구문 정리
            line = re.sub(r"COMMENT\s+'([^']*)'", r"COMMENT '\1'", line)
            
            # KEY 제거 (PostgreSQL에서는 별도 CREATE INDEX 사용)
            line = re.sub(r'\s+KEY\s+"[^"]+"\s+\([^)]+\)', '', line)
            
            postgres_lines.append(line)
            continue
            
        # INSERT 구문 처리
        if line.startswith('INSERT INTO'):
            # 백틱을 따옴표로 변경
            line = line.replace('`', '"')
            postgres_lines.append(line)
            continue
            
        # VALUES 구문에서 BOOLEAN 값 변환
        if line.startswith('(') and 'VALUES' in postgres_lines[-1]:
            # BOOLEAN 컬럼의 0, 1을 FALSE, TRUE로 변경
            # 하지만 모든 0, 1이 BOOLEAN은 아니므로 주의
            line = re.sub(r'\b0\b(?=\s*[,)])', 'FALSE', line)
            line = re.sub(r'\b1\b(?=\s*[,)])', 'TRUE', line)
            postgres_lines.append(line)
            continue
            
        # ALTER TABLE 구문 처리
        if line.startswith('ALTER TABLE'):
            line = line.replace('`', '"')
            postgres_lines.append(line)
            continue
            
        # 기타 구문
        postgres_lines.append(line)
    
    return '\n'.join(postgres_lines)

def main():
    """메인 함수"""
    input_file = 'backend/sql/markets (30).sql'
    output_file = 'backend/sql/markets_postgres_clean.sql'
    
    try:
        print(f"Reading MySQL dump: {input_file}")
        with open(input_file, 'r', encoding='utf-8') as f:
            mysql_sql = f.read()
        
        print("Converting MySQL to clean PostgreSQL...")
        postgres_sql = clean_postgres_conversion(mysql_sql)
        
        print(f"Writing clean PostgreSQL dump: {output_file}")
        with open(output_file, 'w', encoding='utf-8') as f:
            f.write(postgres_sql)
        
        print("Clean conversion completed successfully!")
        
    except Exception as e:
        print(f"Error: {e}")
        sys.exit(1)

if __name__ == "__main__":
    main()
