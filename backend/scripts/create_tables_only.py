#!/usr/bin/env python3
"""
테이블 생성만 하는 PostgreSQL 스크립트 생성
"""

import re

def extract_create_tables(sql_content):
    """CREATE TABLE 구문만 추출"""
    
    lines = sql_content.split('\n')
    create_tables = []
    in_create_table = False
    current_table = []
    
    for line in lines:
        line = line.strip()
        
        if line.startswith('CREATE TABLE'):
            in_create_table = True
            current_table = [line]
        elif in_create_table:
            current_table.append(line)
            if line.endswith(';'):
                in_create_table = False
                create_tables.append('\n'.join(current_table))
                current_table = []
    
    return create_tables

def fix_table_syntax(table_sql):
    """테이블 생성 구문 수정"""
    
    # 1. COMMENT 구문 제거
    table_sql = re.sub(r"\s+COMMENT\s+'[^']*'", '', table_sql)
    
    # 2. double 타입을 double precision으로 변경
    table_sql = re.sub(r'\bdouble\b', 'double precision', table_sql)
    
    # 3. curdate() 함수를 CURRENT_DATE로 변경
    table_sql = re.sub(r'curdate\(\)', 'CURRENT_DATE', table_sql)
    
    # 4. ON UPDATE CURRENT_TIMESTAMP 제거
    table_sql = re.sub(r'\s+ON UPDATE CURRENT_TIMESTAMP', '', table_sql)
    
    return table_sql

def main():
    """메인 함수"""
    input_file = 'backend/sql/markets_postgres_final.sql'
    output_file = 'backend/sql/create_tables_only.sql'
    
    try:
        print(f"Reading PostgreSQL dump: {input_file}")
        with open(input_file, 'r', encoding='utf-8') as f:
            sql_content = f.read()
        
        print("Extracting CREATE TABLE statements...")
        create_tables = extract_create_tables(sql_content)
        
        print(f"Found {len(create_tables)} CREATE TABLE statements")
        
        print("Fixing table syntax...")
        fixed_tables = []
        for table in create_tables:
            fixed_table = fix_table_syntax(table)
            fixed_tables.append(fixed_table)
        
        print(f"Writing CREATE TABLE statements: {output_file}")
        with open(output_file, 'w', encoding='utf-8') as f:
            f.write("-- PostgreSQL CREATE TABLE statements\n")
            f.write("-- Generated from MySQL dump\n\n")
            for table in fixed_tables:
                f.write(table)
                f.write('\n\n')
        
        print("CREATE TABLE statements extracted successfully!")
        
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    main()
