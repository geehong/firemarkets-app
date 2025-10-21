-- 블로그를 포스트로 변경하는 마이그레이션 스크립트
-- 실행 전 반드시 데이터베이스 백업을 생성하세요!

-- 1. 외래 키 제약조건 임시 비활성화
SET session_replication_role = replica;

-- 2. 테이블 이름 변경
-- 메인 테이블
ALTER TABLE blogs RENAME TO posts;
ALTER TABLE blog_categories RENAME TO post_categories;
ALTER TABLE blog_tags RENAME TO post_tags;
ALTER TABLE blog_comments RENAME TO post_comments;
ALTER TABLE blog_products RENAME TO post_products;
ALTER TABLE blog_charts RENAME TO post_charts;

-- 연결 테이블
ALTER TABLE blog_post_tags RENAME TO post_tag_associations;

-- 3. 외래 키 참조 업데이트
-- posts 테이블의 외래 키 업데이트
ALTER TABLE posts DROP CONSTRAINT IF EXISTS posts_asset_id_fkey;
ALTER TABLE posts ADD CONSTRAINT posts_asset_id_fkey 
    FOREIGN KEY (asset_id) REFERENCES assets(asset_id);

ALTER TABLE posts DROP CONSTRAINT IF EXISTS posts_author_id_fkey;
ALTER TABLE posts ADD CONSTRAINT posts_author_id_fkey 
    FOREIGN KEY (author_id) REFERENCES users(id);

ALTER TABLE posts DROP CONSTRAINT IF EXISTS posts_category_id_fkey;
ALTER TABLE posts ADD CONSTRAINT posts_category_id_fkey 
    FOREIGN KEY (category_id) REFERENCES post_categories(id);

-- post_comments 테이블의 외래 키 업데이트
ALTER TABLE post_comments DROP CONSTRAINT IF EXISTS post_comments_blog_id_fkey;
ALTER TABLE post_comments ADD CONSTRAINT post_comments_post_id_fkey 
    FOREIGN KEY (blog_id) REFERENCES posts(id);

ALTER TABLE post_comments DROP CONSTRAINT IF EXISTS post_comments_parent_id_fkey;
ALTER TABLE post_comments ADD CONSTRAINT post_comments_parent_id_fkey 
    FOREIGN KEY (parent_id) REFERENCES post_comments(id);

ALTER TABLE post_comments DROP CONSTRAINT IF EXISTS post_comments_user_id_fkey;
ALTER TABLE post_comments ADD CONSTRAINT post_comments_user_id_fkey 
    FOREIGN KEY (user_id) REFERENCES users(id);

-- post_products 테이블의 외래 키 업데이트
ALTER TABLE post_products DROP CONSTRAINT IF EXISTS post_products_blog_id_fkey;
ALTER TABLE post_products ADD CONSTRAINT post_products_post_id_fkey 
    FOREIGN KEY (blog_id) REFERENCES posts(id);

ALTER TABLE post_products DROP CONSTRAINT IF EXISTS post_products_product_symbol_fkey;
ALTER TABLE post_products ADD CONSTRAINT post_products_product_symbol_fkey 
    FOREIGN KEY (product_symbol) REFERENCES assets(ticker);

-- post_charts 테이블의 외래 키 업데이트
ALTER TABLE post_charts DROP CONSTRAINT IF EXISTS post_charts_blog_id_fkey;
ALTER TABLE post_charts ADD CONSTRAINT post_charts_post_id_fkey 
    FOREIGN KEY (blog_id) REFERENCES posts(id);

-- post_categories 테이블의 자체 참조 외래 키 업데이트
ALTER TABLE post_categories DROP CONSTRAINT IF EXISTS post_categories_parent_id_fkey;
ALTER TABLE post_categories ADD CONSTRAINT post_categories_parent_id_fkey 
    FOREIGN KEY (parent_id) REFERENCES post_categories(id);

-- post_tag_associations 연결 테이블의 외래 키 업데이트
ALTER TABLE post_tag_associations DROP CONSTRAINT IF EXISTS post_tag_associations_blog_id_fkey;
ALTER TABLE post_tag_associations ADD CONSTRAINT post_tag_associations_post_id_fkey 
    FOREIGN KEY (blog_id) REFERENCES posts(id);

ALTER TABLE post_tag_associations DROP CONSTRAINT IF EXISTS post_tag_associations_tag_id_fkey;
ALTER TABLE post_tag_associations ADD CONSTRAINT post_tag_associations_tag_id_fkey 
    FOREIGN KEY (tag_id) REFERENCES post_tags(id);

-- 4. 컬럼 이름 변경 (필요한 경우)
-- post_comments 테이블의 blog_id를 post_id로 변경
ALTER TABLE post_comments RENAME COLUMN blog_id TO post_id;

-- post_products 테이블의 blog_id를 post_id로 변경
ALTER TABLE post_products RENAME COLUMN blog_id TO post_id;

-- post_charts 테이블의 blog_id를 post_id로 변경
ALTER TABLE post_charts RENAME COLUMN blog_id TO post_id;

-- post_tag_associations 연결 테이블의 blog_id를 post_id로 변경
ALTER TABLE post_tag_associations RENAME COLUMN blog_id TO post_id;

-- 5. 인덱스 이름 변경
-- posts 테이블 인덱스
ALTER INDEX IF EXISTS idx_blogs_status RENAME TO idx_posts_status;
ALTER INDEX IF EXISTS idx_blogs_slug RENAME TO idx_posts_slug;
ALTER INDEX IF EXISTS idx_blogs_created_at RENAME TO idx_posts_created_at;

-- 6. 트리거 이름 변경
DROP TRIGGER IF EXISTS update_blogs_updated_at ON posts;
CREATE TRIGGER update_posts_updated_at 
    BEFORE UPDATE ON posts 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- 7. 외래 키 제약조건 재활성화
SET session_replication_role = DEFAULT;

-- 8. 완료 메시지
SELECT '블로그를 포스트로 마이그레이션이 성공적으로 완료되었습니다!' as message;
