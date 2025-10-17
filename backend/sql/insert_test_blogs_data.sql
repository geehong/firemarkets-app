-- 테스트 블로그 데이터만 삽입하는 SQL
-- 테이블이 이미 존재한다고 가정

-- 1. 기존 테스트 데이터 삭제 (선택사항)
-- DELETE FROM blogs WHERE title LIKE '%첫 번째%' OR title LIKE '%두 번째%' OR title LIKE '%세 번째%';

-- 2. 테스트 데이터 삽입
INSERT INTO blogs (title, slug, content, status, created_at, updated_at) VALUES
(
    '첫 번째 블로그 포스트',
    'first-blog-post',
    '이것은 첫 번째 블로그 포스트입니다. 간단한 내용을 담고 있습니다. 이 포스트는 발행된 상태로 설정되어 있습니다.',
    'published',
    NOW() - INTERVAL '5 days',
    NOW() - INTERVAL '5 days'
),
(
    '두 번째 블로그 포스트',
    'second-blog-post',
    '이것은 두 번째 블로그 포스트입니다. 더 많은 내용을 담고 있습니다. 이 포스트는 발행된 상태로 설정되어 있습니다.',
    'published',
    NOW() - INTERVAL '4 days',
    NOW() - INTERVAL '4 days'
),
(
    '세 번째 블로그 포스트',
    'third-blog-post',
    '이것은 세 번째 블로그 포스트입니다. 아직 초안 상태입니다. 이 포스트는 아직 발행되지 않았습니다.',
    'draft',
    NOW() - INTERVAL '3 days',
    NOW() - INTERVAL '3 days'
),
(
    '네 번째 블로그 포스트',
    'fourth-blog-post',
    '이것은 네 번째 블로그 포스트입니다. 발행된 상태입니다. 이 포스트는 최근에 발행되었습니다.',
    'published',
    NOW() - INTERVAL '2 days',
    NOW() - INTERVAL '2 days'
),
(
    '다섯 번째 블로그 포스트',
    'fifth-blog-post',
    '이것은 다섯 번째 블로그 포스트입니다. 초안 상태입니다. 이 포스트는 아직 완성되지 않았습니다.',
    'draft',
    NOW() - INTERVAL '1 day',
    NOW() - INTERVAL '1 day'
),
(
    '여섯 번째 블로그 포스트',
    'sixth-blog-post',
    '이것은 여섯 번째 블로그 포스트입니다. 발행된 상태입니다. 이 포스트는 오늘 발행되었습니다.',
    'published',
    NOW(),
    NOW()
),
(
    '일곱 번째 블로그 포스트',
    'seventh-blog-post',
    '이것은 일곱 번째 블로그 포스트입니다. 초안 상태입니다. 이 포스트는 아직 검토 중입니다.',
    'draft',
    NOW(),
    NOW()
),
(
    '여덟 번째 블로그 포스트',
    'eighth-blog-post',
    '이것은 여덟 번째 블로그 포스트입니다. 발행된 상태입니다. 이 포스트는 최신 포스트입니다.',
    'published',
    NOW(),
    NOW()
);

-- 3. 데이터 확인 쿼리
SELECT COUNT(*) as total_blogs FROM blogs;
SELECT status, COUNT(*) as count FROM blogs GROUP BY status;
SELECT id, title, slug, status, created_at FROM blogs ORDER BY created_at DESC;

-- 완료 메시지
SELECT '테스트 블로그 데이터가 성공적으로 삽입되었습니다!' as message;
