-- =====================================================
-- 모든 테이블의 인덱스 확인
-- =====================================================

-- 1. firemarkets 데이터베이스의 모든 테이블 목록
SELECT '=== FIREMARKETS DATABASE TABLES ===' as info;
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'firemarkets' 
ORDER BY table_name;

-- 2. 모든 테이블의 인덱스 정보
SELECT '=== ALL INDEXES IN FIREMARKETS DATABASE ===' as info;
SELECT 
    table_name,
    index_name,
    column_name,
    seq_in_index,
    cardinality,
    index_type,
    comment
FROM information_schema.statistics
WHERE table_schema = 'firemarkets'
ORDER BY table_name, index_name, seq_in_index;

-- 3. 테이블별 인덱스 요약
SELECT '=== INDEX SUMMARY BY TABLE ===' as info;
SELECT 
    table_name,
    COUNT(DISTINCT index_name) as total_indexes,
    GROUP_CONCAT(DISTINCT index_name ORDER BY index_name SEPARATOR ', ') as index_names
FROM information_schema.statistics
WHERE table_schema = 'firemarkets'
GROUP BY table_name
ORDER BY table_name;

-- 4. 복합 인덱스 상세 정보
SELECT '=== COMPOSITE INDEXES DETAIL ===' as info;
SELECT 
    table_name,
    index_name,
    GROUP_CONCAT(column_name ORDER BY seq_in_index SEPARATOR ', ') as columns,
    cardinality,
    index_type
FROM information_schema.statistics
WHERE table_schema = 'firemarkets'
GROUP BY table_name, index_name
HAVING COUNT(*) > 1
ORDER BY table_name, index_name;

-- 5. 인덱스 크기 정보
SELECT '=== INDEX SIZE INFORMATION ===' as info;
SELECT 
    table_name,
    index_name,
    ROUND(((data_length + index_length) / 1024 / 1024), 2) AS 'Size (MB)',
    table_rows
FROM information_schema.tables t
JOIN information_schema.statistics s ON t.table_name = s.table_name
WHERE t.table_schema = 'firemarkets' AND s.table_schema = 'firemarkets'
ORDER BY t.table_name, s.index_name; 