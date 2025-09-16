#!/usr/bin/env python3
"""
MySQL SQL dump를 PostgreSQL로 변환하는 스크립트
"""

import re
import sys

def convert_mysql_to_postgres(mysql_sql):
    """MySQL SQL을 PostgreSQL로 변환"""
    
    # MySQL 특정 구문 제거/변환
    postgres_sql = mysql_sql
    
    # 1. MySQL 헤더 제거
    postgres_sql = re.sub(r'-- phpMyAdmin SQL Dump.*?\n', '', postgres_sql, flags=re.DOTALL)
    postgres_sql = re.sub(r'SET SQL_MODE.*?\n', '', postgres_sql)
    postgres_sql = re.sub(r'START TRANSACTION.*?\n', '', postgres_sql)
    postgres_sql = re.sub(r'SET time_zone.*?\n', '', postgres_sql)
    postgres_sql = re.sub(r'/\*!40101.*?\*/', '', postgres_sql, flags=re.DOTALL)
    
    # 2. 백틱(`) 제거
    postgres_sql = postgres_sql.replace('`', '"')
    
    # 3. MySQL 데이터 타입 변환
    type_mappings = {
        r'bigint\s+NOT\s+NULL\s+AUTO_INCREMENT': 'BIGSERIAL PRIMARY KEY',
        r'bigint\s+AUTO_INCREMENT': 'BIGSERIAL',
        r'int\s+NOT\s+NULL\s+AUTO_INCREMENT': 'SERIAL PRIMARY KEY',
        r'int\s+AUTO_INCREMENT': 'SERIAL',
        r'tinyint\(1\)': 'BOOLEAN',
        r'tinyint\(1\)\s+DEFAULT\s+\'0\'': 'BOOLEAN DEFAULT FALSE',
        r'tinyint\(1\)\s+DEFAULT\s+\'1\'': 'BOOLEAN DEFAULT TRUE',
        r'varchar\((\d+)\)\s+CHARACTER\s+SET\s+utf8mb4\s+COLLATE\s+utf8mb4_general_ci': r'VARCHAR(\1)',
        r'text\s+CHARACTER\s+SET\s+utf8mb4\s+COLLATE\s+utf8mb4_general_ci': 'TEXT',
        r'decimal\((\d+),(\d+)\)': r'DECIMAL(\1,\2)',
        r'double\((\d+),(\d+)\)': r'DOUBLE PRECISION',
        r'float\((\d+),(\d+)\)': r'REAL',
        r'datetime': 'TIMESTAMP',
        r'timestamp\s+NOT\s+NULL\s+DEFAULT\s+CURRENT_TIMESTAMP': 'TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP',
        r'timestamp\s+NOT\s+NULL\s+DEFAULT\s+CURRENT_TIMESTAMP\s+ON\s+UPDATE\s+CURRENT_TIMESTAMP': 'TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP',
    }
    
    for mysql_type, postgres_type in type_mappings.items():
        postgres_sql = re.sub(mysql_type, postgres_type, postgres_sql, flags=re.IGNORECASE)
    
    # 4. ENGINE과 CHARSET 제거
    postgres_sql = re.sub(r'\s+ENGINE=InnoDB.*?;', ';', postgres_sql, flags=re.DOTALL)
    postgres_sql = re.sub(r'\s+DEFAULT\s+CHARSET=.*?;', ';', postgres_sql)
    postgres_sql = re.sub(r'\s+COLLATE=.*?;', ';', postgres_sql)
    
    # 5. COMMENT 구문 변환
    postgres_sql = re.sub(r"COMMENT\s+'([^']*)'", r"COMMENT ON COLUMN \1", postgres_sql)
    
    # 6. AUTO_INCREMENT를 SERIAL로 변환 (남은 것들)
    postgres_sql = re.sub(r'AUTO_INCREMENT', 'SERIAL', postgres_sql)
    
    # 7. INSERT 구문에서 백틱 제거
    postgres_sql = re.sub(r'INSERT\s+INTO\s+`([^`]+)`', r'INSERT INTO "\1"', postgres_sql)
    
    # 8. VALUES 구문 정리
    postgres_sql = re.sub(r'VALUES\s*\(', 'VALUES (', postgres_sql)
    
    # 9. PRIMARY KEY 제약조건 정리
    postgres_sql = re.sub(r'PRIMARY\s+KEY\s+\(`([^`]+)`\)', r'PRIMARY KEY ("\1")', postgres_sql)
    
    # 10. UNIQUE 제약조건 정리
    postgres_sql = re.sub(r'UNIQUE\s+KEY\s+`([^`]+)`\s+\(`([^`]+)`\)', r'UNIQUE ("\2")', postgres_sql)
    
    # 11. INDEX 제거 (PostgreSQL에서는 CREATE INDEX로 별도 생성)
    postgres_sql = re.sub(r'KEY\s+`[^`]+`\s+\([^)]+\)', '', postgres_sql)
    
    # 12. ALTER TABLE 구문 정리
    postgres_sql = re.sub(r'ALTER\s+TABLE\s+`([^`]+)`\s+ADD\s+PRIMARY\s+KEY\s+\(`([^`]+)`\)', 
                         r'ALTER TABLE "\1" ADD PRIMARY KEY ("\2")', postgres_sql)
    
    # 13. COMMIT 제거
    postgres_sql = re.sub(r'COMMIT;', '', postgres_sql)
    
    # 14. 불필요한 공백 정리
    postgres_sql = re.sub(r'\n\s*\n\s*\n', '\n\n', postgres_sql)
    
    return postgres_sql

def main():
    """메인 함수"""
    input_file = 'backend/sql/markets (30).sql'
    output_file = 'backend/sql/markets_postgres.sql'
    
    try:
        print(f"Reading MySQL dump: {input_file}")
        with open(input_file, 'r', encoding='utf-8') as f:
            mysql_sql = f.read()
        
        print("Converting MySQL to PostgreSQL...")
        postgres_sql = convert_mysql_to_postgres(mysql_sql)
        
        print(f"Writing PostgreSQL dump: {output_file}")
        with open(output_file, 'w', encoding='utf-8') as f:
            f.write(postgres_sql)
        
        print("Conversion completed successfully!")
        
    except Exception as e:
        print(f"Error: {e}")
        sys.exit(1)

if __name__ == "__main__":
    main()
