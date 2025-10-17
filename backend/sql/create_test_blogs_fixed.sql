-- 기존 블로그 테이블 구조에 맞춘 테스트 데이터 생성 SQL
-- description 필드가 NOT NULL 제약조건이 있는 경우

-- 1. 기존 테스트 데이터 삭제 (선택사항)
-- DELETE FROM blogs WHERE title LIKE '%첫 번째%' OR title LIKE '%두 번째%' OR title LIKE '%세 번째%';

-- 2. 테스트 데이터 삽입 (기존 테이블 구조에 맞춤)
INSERT INTO blogs (
    asset_id, 
    title, 
    slug, 
    description, 
    content, 
    excerpt, 
    sync_with_asset, 
    auto_sync_content, 
    status, 
    featured, 
    author_id, 
    category_id, 
    cover_image, 
    cover_image_alt, 
    meta_title, 
    meta_description, 
    keywords, 
    canonical_url, 
    view_count, 
    read_time_minutes, 
    created_at, 
    updated_at, 
    published_at, 
    scheduled_at, 
    last_sync_at, 
    sync_status
) VALUES
(
    NULL, -- asset_id
    '첫 번째 블로그 포스트',
    'first-blog-post',
    '이것은 첫 번째 블로그 포스트의 설명입니다.',
    '이것은 첫 번째 블로그 포스트입니다. 간단한 내용을 담고 있습니다. 이 포스트는 발행된 상태로 설정되어 있습니다.',
    '첫 번째 블로그 포스트의 요약입니다.',
    true, -- sync_with_asset
    true, -- auto_sync_content
    'published',
    false, -- featured
    NULL, -- author_id
    NULL, -- category_id
    NULL, -- cover_image
    NULL, -- cover_image_alt
    '첫 번째 블로그 포스트 - 메타 타이틀',
    '첫 번째 블로그 포스트의 메타 설명입니다.',
    NULL, -- keywords
    NULL, -- canonical_url
    0, -- view_count
    NULL, -- read_time_minutes
    NOW() - INTERVAL '5 days', -- created_at
    NOW() - INTERVAL '5 days', -- updated_at
    NOW() - INTERVAL '5 days', -- published_at
    NULL, -- scheduled_at
    NULL, -- last_sync_at
    'pending' -- sync_status
),
(
    NULL,
    '두 번째 블로그 포스트',
    'second-blog-post',
    '이것은 두 번째 블로그 포스트의 설명입니다.',
    '이것은 두 번째 블로그 포스트입니다. 더 많은 내용을 담고 있습니다. 이 포스트는 발행된 상태로 설정되어 있습니다.',
    '두 번째 블로그 포스트의 요약입니다.',
    true,
    true,
    'published',
    false,
    NULL,
    NULL,
    NULL,
    NULL,
    '두 번째 블로그 포스트 - 메타 타이틀',
    '두 번째 블로그 포스트의 메타 설명입니다.',
    NULL,
    NULL,
    0,
    NULL,
    NOW() - INTERVAL '4 days',
    NOW() - INTERVAL '4 days',
    NOW() - INTERVAL '4 days',
    NULL,
    NULL,
    'pending'
),
(
    NULL,
    '세 번째 블로그 포스트',
    'third-blog-post',
    '이것은 세 번째 블로그 포스트의 설명입니다.',
    '이것은 세 번째 블로그 포스트입니다. 아직 초안 상태입니다. 이 포스트는 아직 발행되지 않았습니다.',
    '세 번째 블로그 포스트의 요약입니다.',
    true,
    true,
    'draft',
    false,
    NULL,
    NULL,
    NULL,
    NULL,
    '세 번째 블로그 포스트 - 메타 타이틀',
    '세 번째 블로그 포스트의 메타 설명입니다.',
    NULL,
    NULL,
    0,
    NULL,
    NOW() - INTERVAL '3 days',
    NOW() - INTERVAL '3 days',
    NULL, -- published_at (draft이므로 NULL)
    NULL,
    NULL,
    'pending'
),
(
    NULL,
    '네 번째 블로그 포스트',
    'fourth-blog-post',
    '이것은 네 번째 블로그 포스트의 설명입니다.',
    '이것은 네 번째 블로그 포스트입니다. 발행된 상태입니다. 이 포스트는 최근에 발행되었습니다.',
    '네 번째 블로그 포스트의 요약입니다.',
    true,
    true,
    'published',
    false,
    NULL,
    NULL,
    NULL,
    NULL,
    '네 번째 블로그 포스트 - 메타 타이틀',
    '네 번째 블로그 포스트의 메타 설명입니다.',
    NULL,
    NULL,
    0,
    NULL,
    NOW() - INTERVAL '2 days',
    NOW() - INTERVAL '2 days',
    NOW() - INTERVAL '2 days',
    NULL,
    NULL,
    'pending'
),
(
    NULL,
    '다섯 번째 블로그 포스트',
    'fifth-blog-post',
    '이것은 다섯 번째 블로그 포스트의 설명입니다.',
    '이것은 다섯 번째 블로그 포스트입니다. 초안 상태입니다. 이 포스트는 아직 완성되지 않았습니다.',
    '다섯 번째 블로그 포스트의 요약입니다.',
    true,
    true,
    'draft',
    false,
    NULL,
    NULL,
    NULL,
    NULL,
    '다섯 번째 블로그 포스트 - 메타 타이틀',
    '다섯 번째 블로그 포스트의 메타 설명입니다.',
    NULL,
    NULL,
    0,
    NULL,
    NOW() - INTERVAL '1 day',
    NOW() - INTERVAL '1 day',
    NULL, -- published_at (draft이므로 NULL)
    NULL,
    NULL,
    'pending'
),
(
    NULL,
    '여섯 번째 블로그 포스트',
    'sixth-blog-post',
    '이것은 여섯 번째 블로그 포스트의 설명입니다.',
    '이것은 여섯 번째 블로그 포스트입니다. 발행된 상태입니다. 이 포스트는 오늘 발행되었습니다.',
    '여섯 번째 블로그 포스트의 요약입니다.',
    true,
    true,
    'published',
    false,
    NULL,
    NULL,
    NULL,
    NULL,
    '여섯 번째 블로그 포스트 - 메타 타이틀',
    '여섯 번째 블로그 포스트의 메타 설명입니다.',
    NULL,
    NULL,
    0,
    NULL,
    NOW(),
    NOW(),
    NOW(),
    NULL,
    NULL,
    'pending'
),
(
    NULL,
    '일곱 번째 블로그 포스트',
    'seventh-blog-post',
    '이것은 일곱 번째 블로그 포스트의 설명입니다.',
    '이것은 일곱 번째 블로그 포스트입니다. 초안 상태입니다. 이 포스트는 아직 검토 중입니다.',
    '일곱 번째 블로그 포스트의 요약입니다.',
    true,
    true,
    'draft',
    false,
    NULL,
    NULL,
    NULL,
    NULL,
    '일곱 번째 블로그 포스트 - 메타 타이틀',
    '일곱 번째 블로그 포스트의 메타 설명입니다.',
    NULL,
    NULL,
    0,
    NULL,
    NOW(),
    NOW(),
    NULL, -- published_at (draft이므로 NULL)
    NULL,
    NULL,
    'pending'
),
(
    NULL,
    '여덟 번째 블로그 포스트',
    'eighth-blog-post',
    '이것은 여덟 번째 블로그 포스트의 설명입니다.',
    '이것은 여덟 번째 블로그 포스트입니다. 발행된 상태입니다. 이 포스트는 최신 포스트입니다.',
    '여덟 번째 블로그 포스트의 요약입니다.',
    true,
    true,
    'published',
    false,
    NULL,
    NULL,
    NULL,
    NULL,
    '여덟 번째 블로그 포스트 - 메타 타이틀',
    '여덟 번째 블로그 포스트의 메타 설명입니다.',
    NULL,
    NULL,
    0,
    NULL,
    NOW(),
    NOW(),
    NOW(),
    NULL,
    NULL,
    'pending'
);

-- 3. 데이터 확인 쿼리
SELECT COUNT(*) as total_blogs FROM blogs;
SELECT status, COUNT(*) as count FROM blogs GROUP BY status;
SELECT id, title, slug, status, created_at FROM blogs ORDER BY created_at DESC;

-- 완료 메시지
SELECT '테스트 블로그 데이터가 성공적으로 삽입되었습니다!' as message;
