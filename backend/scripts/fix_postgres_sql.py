#!/usr/bin/env python3
"""
PostgreSQL SQL 파일을 수정하는 스크립트
"""

import re

def fix_postgres_sql(sql_content):
    """PostgreSQL SQL 파일 수정"""
    
    # 1. COMMENT 구문 수정
    # COMMENT ON COLUMN API name -> COMMENT 'API name'
    sql_content = re.sub(
        r'COMMENT ON COLUMN ([^,)]+)',
        r"COMMENT '\1'",
        sql_content
    )
    
    # 2. BOOLEAN 기본값 수정
    # DEFAULT '0' -> DEFAULT FALSE
    # DEFAULT '1' -> DEFAULT TRUE
    sql_content = re.sub(r"BOOLEAN DEFAULT '0'", 'BOOLEAN DEFAULT FALSE', sql_content)
    sql_content = re.sub(r"BOOLEAN DEFAULT '1'", 'BOOLEAN DEFAULT TRUE', sql_content)
    
    # 3. INSERT 구문에서 BOOLEAN 값 수정
    # VALUES (..., 0, ...) -> VALUES (..., FALSE, ...)
    # VALUES (..., 1, ...) -> VALUES (..., TRUE, ...)
    def replace_boolean_values(match):
        values = match.group(1)
        # BOOLEAN 컬럼의 0, 1을 FALSE, TRUE로 변경
        values = re.sub(r'\b0\b(?=\s*[,)])', 'FALSE', values)
        values = re.sub(r'\b1\b(?=\s*[,)])', 'TRUE', values)
        return f'VALUES ({values}'
    
    sql_content = re.sub(r'VALUES\s*\(([^)]+)\)', replace_boolean_values, sql_content)
    
    # 4. 불필요한 세미콜론 정리
    sql_content = re.sub(r';\s*;', ';', sql_content)
    
    # 5. 빈 줄 정리
    sql_content = re.sub(r'\n\s*\n\s*\n', '\n\n', sql_content)
    
    return sql_content

def main():
    """메인 함수"""
    input_file = 'backend/sql/markets_postgres.sql'
    output_file = 'backend/sql/markets_postgres_fixed.sql'
    
    try:
        print(f"Reading PostgreSQL dump: {input_file}")
        with open(input_file, 'r', encoding='utf-8') as f:
            sql_content = f.read()
        
        print("Fixing PostgreSQL syntax...")
        fixed_sql = fix_postgres_sql(sql_content)
        
        print(f"Writing fixed PostgreSQL dump: {output_file}")
        with open(output_file, 'w', encoding='utf-8') as f:
            f.write(fixed_sql)
        
        print("Fix completed successfully!")
        
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    main()
