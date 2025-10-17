-- 간단한 테스트 블로그 데이터 삽입 SQL
-- 필수 필드만 포함 (description, title, slug, content, status)

-- 1. 기존 테스트 데이터 삭제 (선택사항)
-- DELETE FROM blogs WHERE title LIKE '%첫 번째%' OR title LIKE '%두 번째%' OR title LIKE '%세 번째%';

-- 2. 간단한 테스트 데이터 삽입
INSERT INTO blogs (title, slug, description, content, status) VALUES
(
    '첫 번째 블로그 포스트',
    'first-blog-post',
    '이것은 첫 번째 블로그 포스트의 설명입니다.',
    '이것은 첫 번째 블로그 포스트입니다. 간단한 내용을 담고 있습니다.',
    'published'
),
(
    '두 번째 블로그 포스트',
    'second-blog-post',
    '이것은 두 번째 블로그 포스트의 설명입니다.',
    '이것은 두 번째 블로그 포스트입니다. 더 많은 내용을 담고 있습니다.',
    'published'
),
(
    '세 번째 블로그 포스트',
    'third-blog-post',
    '이것은 세 번째 블로그 포스트의 설명입니다.',
    '이것은 세 번째 블로그 포스트입니다. 아직 초안 상태입니다.',
    'draft'
),
(
    '네 번째 블로그 포스트',
    'fourth-blog-post',
    '이것은 네 번째 블로그 포스트의 설명입니다.',
    '이것은 네 번째 블로그 포스트입니다. 발행된 상태입니다.',
    'published'
),
(
    '다섯 번째 블로그 포스트',
    'fifth-blog-post',
    '이것은 다섯 번째 블로그 포스트의 설명입니다.',
    '이것은 다섯 번째 블로그 포스트입니다. 초안 상태입니다.',
    'draft'
);

-- 3. 데이터 확인 쿼리
SELECT COUNT(*) as total_blogs FROM blogs;
SELECT status, COUNT(*) as count FROM blogs GROUP BY status;
SELECT id, title, slug, status, created_at FROM blogs ORDER BY created_at DESC;

-- 완료 메시지
SELECT '간단한 테스트 블로그 데이터가 성공적으로 삽입되었습니다!' as message;
