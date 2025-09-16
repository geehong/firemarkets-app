#!/usr/bin/env python3
"""
테이블 생성 구문의 문법 오류 수정
"""

import re

def fix_table_syntax(sql_content):
    """테이블 생성 구문 수정"""
    
    # 1. blob 타입을 bytea로 변경
    sql_content = re.sub(r'\bblob\b', 'bytea', sql_content, flags=re.IGNORECASE)
    
    # 2. CHARACTER SET과 COLLATE 구문 제거
    sql_content = re.sub(r'\s+CHARACTER\s+SET\s+\w+', '', sql_content)
    sql_content = re.sub(r'\s+COLLATE\s+\w+', '', sql_content)
    
    # 3. enum 타입을 VARCHAR로 변경
    sql_content = re.sub(r"enum\('([^']+)'\)", r'VARCHAR(50)', sql_content)
    
    # 4. COMMENT 구문 제거
    sql_content = re.sub(r"\s+COMMENT\s+'[^']*'", '', sql_content)
    
    # 5. double 타입을 double precision으로 변경
    sql_content = re.sub(r'\bdouble\b', 'double precision', sql_content)
    
    # 6. curdate() 함수를 CURRENT_DATE로 변경
    sql_content = re.sub(r'curdate\(\)', 'CURRENT_DATE', sql_content)
    
    # 7. ON UPDATE CURRENT_TIMESTAMP 제거
    sql_content = re.sub(r'\s+ON UPDATE CURRENT_TIMESTAMP', '', sql_content)
    
    return sql_content

def main():
    """메인 함수"""
    input_file = 'backend/sql/create_tables_only.sql'
    output_file = 'backend/sql/create_tables_fixed.sql'
    
    try:
        print(f"Reading table creation script: {input_file}")
        with open(input_file, 'r', encoding='utf-8') as f:
            sql_content = f.read()
        
        print("Fixing table syntax errors...")
        fixed_sql = fix_table_syntax(sql_content)
        
        print(f"Writing fixed table creation script: {output_file}")
        with open(output_file, 'w', encoding='utf-8') as f:
            f.write(fixed_sql)
        
        print("Table syntax fix completed successfully!")
        
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    main()
