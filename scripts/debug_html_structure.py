#!/usr/bin/env python3
"""
8marketcap.com HTML 구조 분석 스크립트
"""

import requests
from bs4 import BeautifulSoup
import json

def analyze_page(url, page_name):
    """웹페이지의 HTML 구조를 분석합니다"""
    print(f"\n=== {page_name} 분석 ===")
    print(f"URL: {url}")
    
    headers = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
    }
    
    try:
        response = requests.get(url, headers=headers, timeout=30)
        print(f"응답 상태: {response.status_code}")
        
        if response.status_code != 200:
            print(f"❌ 페이지 로드 실패: {response.status_code}")
            return
        
        soup = BeautifulSoup(response.content, 'html.parser')
        
        # 테이블 찾기
        tables = soup.find_all('table')
        print(f"발견된 테이블 수: {len(tables)}")
        
        for i, table in enumerate(tables):
            print(f"\n--- 테이블 {i+1} ---")
            rows = table.find_all('tr')
            print(f"행 수: {len(rows)}")
            
            if len(rows) > 0:
                # 첫 번째 행 (헤더) 분석
                header_row = rows[0]
                header_cells = header_row.find_all(['th', 'td'])
                print(f"헤더 셀 수: {len(header_cells)}")
                for j, cell in enumerate(header_cells):
                    print(f"  헤더 {j+1}: {cell.get_text(strip=True)}")
                
                # 처음 3개 행 (데이터) 분석
                for row_idx in range(1, min(4, len(rows))):
                    data_row = rows[row_idx]
                    data_cells = data_row.find_all('td')
                    print(f"\n--- 데이터 행 {row_idx} ---")
                    print(f"데이터 셀 수: {len(data_cells)}")
                    for j, cell in enumerate(data_cells):
                        cell_text = cell.get_text(strip=True)
                        print(f"  컬럼 {j+1}: '{cell_text}'")
                        
                        # 링크가 있는지 확인
                        links = cell.find_all('a')
                        if links:
                            for link in links:
                                print(f"    링크: {link.get('href')} - {link.get_text(strip=True)}")
                        
                        # 이미지가 있는지 확인
                        images = cell.find_all('img')
                        if images:
                            for img in images:
                                print(f"    이미지: {img.get('src')} - {img.get('alt')}")
        
        # 테이블이 없는 경우 다른 구조 찾기
        if len(tables) == 0:
            print("테이블을 찾을 수 없습니다. 다른 구조를 찾아보겠습니다...")
            
            # div나 다른 컨테이너 찾기
            containers = soup.find_all(['div', 'section'], class_=lambda x: x and any(keyword in x.lower() for keyword in ['table', 'list', 'grid', 'row', 'item']))
            print(f"발견된 컨테이너 수: {len(containers)}")
            
            for i, container in enumerate(containers[:3]):  # 처음 3개만 확인
                print(f"\n--- 컨테이너 {i+1} ---")
                print(f"클래스: {container.get('class')}")
                print(f"내용 미리보기: {container.get_text(strip=True)[:200]}...")
        
    except Exception as e:
        print(f"❌ 오류 발생: {e}")

def main():
    """메인 함수"""
    urls = {
        "ETFs": "https://8marketcap.com/etfs/",
        "Cryptos": "https://8marketcap.com/cryptos/", 
        "Metals": "https://8marketcap.com/metals/"
    }
    
    for page_name, url in urls.items():
        analyze_page(url, page_name)
        print("\n" + "="*50)

if __name__ == "__main__":
    main()
