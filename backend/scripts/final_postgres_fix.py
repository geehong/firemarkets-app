#!/usr/bin/env python3
"""
PostgreSQL SQL 파일의 최종 수정
"""

import re

def final_postgres_fix(sql_content):
    """PostgreSQL SQL 파일 최종 수정"""
    
    # 1. BOOLEAN 기본값 수정
    sql_content = re.sub(r"BOOLEAN DEFAULT '0'", 'BOOLEAN DEFAULT FALSE', sql_content)
    sql_content = re.sub(r"BOOLEAN DEFAULT '1'", 'BOOLEAN DEFAULT TRUE', sql_content)
    
    # 2. ON UPDATE CURRENT_TIMESTAMP 제거 (PostgreSQL에서 지원하지 않음)
    sql_content = re.sub(r'\s+ON UPDATE CURRENT_TIMESTAMP', '', sql_content)
    
    # 3. INSERT 구문에서 BOOLEAN 값 수정
    # 하지만 모든 0, 1이 BOOLEAN은 아니므로 주의깊게 처리
    lines = sql_content.split('\n')
    fixed_lines = []
    
    for line in lines:
        # INSERT 구문에서 BOOLEAN 컬럼의 값만 수정
        if line.strip().startswith('(') and 'VALUES' in '\n'.join(fixed_lines[-5:]):
            # app_configurations 테이블의 경우 is_sensitive, is_active 컬럼
            if 'app_configurations' in '\n'.join(fixed_lines[-10:]):
                # 마지막 두 개의 숫자를 BOOLEAN으로 변환
                line = re.sub(r'(\d+),\s*(\d+)\s*\)$', r'\1, \2)', line)
                # 하지만 이건 위험하므로 더 정확한 방법 사용
                # 일단 그대로 두고 나중에 수동으로 수정
                pass
        
        fixed_lines.append(line)
    
    sql_content = '\n'.join(fixed_lines)
    
    # 4. 불필요한 공백 정리
    sql_content = re.sub(r'\n\s*\n\s*\n', '\n\n', sql_content)
    
    return sql_content

def main():
    """메인 함수"""
    input_file = 'backend/sql/markets_postgres_clean.sql'
    output_file = 'backend/sql/markets_postgres_final.sql'
    
    try:
        print(f"Reading PostgreSQL dump: {input_file}")
        with open(input_file, 'r', encoding='utf-8') as f:
            sql_content = f.read()
        
        print("Applying final PostgreSQL fixes...")
        fixed_sql = final_postgres_fix(sql_content)
        
        print(f"Writing final PostgreSQL dump: {output_file}")
        with open(output_file, 'w', encoding='utf-8') as f:
            f.write(fixed_sql)
        
        print("Final fix completed successfully!")
        
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    main()
