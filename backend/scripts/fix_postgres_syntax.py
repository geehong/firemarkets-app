#!/usr/bin/env python3
"""
PostgreSQL SQL 파일의 문법 오류 수정
"""

import re

def fix_postgres_syntax(sql_content):
    """PostgreSQL SQL 파일 문법 오류 수정"""
    
    # 1. COMMENT 구문 수정 - PostgreSQL에서는 CREATE TABLE 후에 별도로 실행
    # COMMENT 'text' -> 제거하고 나중에 COMMENT ON COLUMN으로 추가
    sql_content = re.sub(r"\s+COMMENT\s+'[^']*'", '', sql_content)
    
    # 2. double 타입을 double precision으로 변경
    sql_content = re.sub(r'\bdouble\b', 'double precision', sql_content)
    
    # 3. curdate() 함수를 CURRENT_DATE로 변경
    sql_content = re.sub(r'curdate\(\)', 'CURRENT_DATE', sql_content)
    
    # 4. 따옴표 문제 수정 - JSON 데이터에서 작은따옴표 이스케이프
    # O'REILLY -> O''REILLY
    sql_content = re.sub(r"O'REILLY", "O''REILLY", sql_content)
    
    # 5. JSON 데이터에서 작은따옴표 이스케이프
    # "description": "O'REILLY" -> "description": "O''REILLY"
    sql_content = re.sub(r'"([^"]*)\'([^"]*)"', r'"\1\'\2"', sql_content)
    
    # 6. 불필요한 공백 정리
    sql_content = re.sub(r'\n\s*\n\s*\n', '\n\n', sql_content)
    
    return sql_content

def main():
    """메인 함수"""
    input_file = 'backend/sql/markets_postgres_final.sql'
    output_file = 'backend/sql/markets_postgres_syntax_fixed.sql'
    
    try:
        print(f"Reading PostgreSQL dump: {input_file}")
        with open(input_file, 'r', encoding='utf-8') as f:
            sql_content = f.read()
        
        print("Fixing PostgreSQL syntax errors...")
        fixed_sql = fix_postgres_syntax(sql_content)
        
        print(f"Writing syntax-fixed PostgreSQL dump: {output_file}")
        with open(output_file, 'w', encoding='utf-8') as f:
            f.write(fixed_sql)
        
        print("Syntax fix completed successfully!")
        
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    main()
