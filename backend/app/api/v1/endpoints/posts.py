from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, Path, status
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import text, cast, String, func
from app.core.database import get_postgres_db
from app.crud.blog import post, post_category, post_tag, post_comment, post_product, post_chart
from app.schemas.blog import (
    PostCreate, PostUpdate, PostResponse, PostListResponse,
    PostCategoryCreate, PostCategoryUpdate, PostCategoryResponse,
    PostTagCreate, PostTagUpdate, PostTagResponse, PostTagListResponse, PostCommentCreate, PostCommentResponse, PostCommentListResponse,
    PostProductCreate, PostProductResponse, PostChartCreate, PostChartResponse,
    PostProductCreate, PostProductResponse, PostChartCreate, PostChartResponse,
    PostAuthorResponse, PostSyncRequest, PostSyncResponse, PostStatsResponse
)
from app.models.blog import Post, PostCategory, PostTag, PostComment, PostTagAssociation, PostProduct, PostChart
from app.models.asset import User
from app.dependencies.auth_deps import get_current_user, get_current_user_optional, get_current_active_superuser
from app.services.posts_service import posts_service
from app.services.news_ai_agent import NewsAIEditorAgent
from app.analysis.speculative import sentiment_analyzer
from fastapi import Body
import logging
import time
import json
from datetime import datetime


import logging
import time
import json
import re
from datetime import datetime

logger = logging.getLogger(__name__)

def is_mostly_english(text):
    """
    Heuristic to check if text in a Korean field is actually mostly English.
    Returns True if the proportion of Korean characters is too low.
    """
    if not text:
        return False
        
    # Strip HTML tags
    clean_text = re.sub('<[^<]+?>', '', text)
    clean_text = clean_text.strip()
    
    if not clean_text:
        return False
        
    # Count Korean characters (Syllables)
    ko_chars = len(re.findall('[가-힣]', clean_text))
    # Count English alphabet characters
    en_chars = len(re.findall('[a-zA-Z]', clean_text))
    
    # Heuristic: If English characters are dominant (e.g. > 100) and Korean characters 
    # make up less than 20% of the total alpha count, it's likely a failed translation.
    total_alpha = ko_chars + en_chars
    if total_alpha > 50:
        ratio = ko_chars / total_alpha
        if ratio < 0.25: # Less than 25% Korean
            return True
            
    return False

router = APIRouter()


@router.get("/test")
async def test_posts():
    """포스트 API 테스트"""
    return {"message": "Post API is working", "status": "success"}


@router.get("/")
def get_posts(
    page: int = Query(1, ge=1, description="페이지 번호"),
    page_size: int = Query(20, ge=1, le=1000, description="페이지당 항목 수"),
    post_type: Optional[str] = Query(None, description="포스트 타입 필터"),
    status_filter: Optional[str] = Query(None, alias="status", description="상태 필터"),
    search: Optional[str] = Query(None, description="검색어"),
    category: Optional[str] = Query(None, description="카테고리 필터"),
    tag: Optional[str] = Query(None, description="태그 필터"),
    author_id: Optional[int] = Query(None, description="작성자 ID 필터"),
    ticker: Optional[str] = Query(None, description="티커 필터 (post_info 내 tickers 필드)"),
    sort_by: Optional[str] = Query('created_at', description="정렬 기준 (created_at, published_at, title, view_count)"),
    order: Optional[str] = Query('desc', description="정렬 순서 (asc, desc)"),
    current_user: Optional[User] = Depends(get_current_user_optional),
    db: Session = Depends(get_postgres_db)
):
    """포스트 목록 조회 (필터링 및 정렬 지원)"""
    try:
        logger.info(f"[get_posts] status_filter={status_filter}, post_type={post_type}, page={page}, user={current_user}")
        skip = (page - 1) * page_size

        # 기본 쿼리 구성
        query = db.query(Post)
        
        # 필터 적용
        if post_type:
            if "," in post_type:
                types = [t.strip() for t in post_type.split(",")]
                query = query.filter(Post.post_type.in_(types))
            else:
                query = query.filter(Post.post_type == post_type)
        
        if status_filter:
            # If status is strictly provided, trust the caller (assuming admin page usage or testing)
            # This allows seeing 'draft' posts if status='draft' is requested explicitly
            logger.info(f"[get_posts] Applying status filter: {status_filter}")
            query = query.filter(Post.status == status_filter)
        else:
            # If no status is specified
            
            # EXCEPTION: If specific post_type is requested (e.g. ai_draft_news), allow seeing all statuses
            # This is helpful for testing or if the frontend asks for a specific type without status filter
            # Also covers cases where admin page selects a type but 'All Statuses'
            if post_type:
                pass
            
            # Default behavior: Show only 'published' for non-admin users
            elif not current_user or not current_user.is_superuser:
                # If logged in user is regular user, only show published
                query = query.filter(Post.status == 'published')
        
        if author_id:
            logger.info(f"Filtering by author_id: {author_id}")
            query = query.filter(Post.author_id == author_id)
            logger.info(f"Query after author_id filter: {query}")
            
        if search:
            query = query.filter(
                cast(Post.title, String).ilike(f"%{search}%") |
                Post.content.ilike(f"%{search}%") |
                Post.content_ko.ilike(f"%{search}%") |
                cast(Post.description, String).ilike(f"%{search}%")
            )
        
        if ticker:
            # post_info is JSON column.
            # We use ilike on the casted string representation of the 'tickers' array in post_info
            query = query.filter(
                cast(Post.post_info['tickers'], String).ilike(f'%"{ticker}"%')
            )
        
        if category:
            # 카테고리 필터링 (category_id 또는 category name으로)
            try:
                category_id = int(category)
                query = query.filter(Post.category_id == category_id)
            except ValueError:
                # category가 숫자가 아닌 경우 name으로 검색
                query = query.join(PostCategory).filter(PostCategory.name.ilike(f"%{category}%"))
        
        if tag:
            # 태그 필터링 - tag slug 또는 tag name으로 검색
            # post_tag_associations 테이블을 통해 조인
            tag_subquery = db.query(PostTag.id).filter(
                (PostTag.slug == tag) | (PostTag.name.ilike(f"%{tag}%"))
            ).subquery()
            
            # PostTagAssociation을 통해 해당 태그가 있는 포스트만 필터링
            from sqlalchemy import exists, select
            from app.models.blog import PostTagAssociation
            
            query = query.filter(
                exists(
                    select(PostTagAssociation.post_id).where(
                        (PostTagAssociation.post_id == Post.id) &
                        (PostTagAssociation.tag_id.in_(select(tag_subquery)))
                    )
                )
            )

        # 정렬 적용
        if hasattr(Post, sort_by):
            sort_attr = getattr(Post, sort_by)
            if order.lower() == 'asc':
                query = query.order_by(sort_attr.asc())
            else:
                query = query.order_by(sort_attr.desc())
        else:
            # 기본 정렬
            query = query.order_by(Post.created_at.desc())
        
        # 총 개수 계산
        total = query.count()
        
        # 페이지네이션 적용
        posts_list = query.offset(skip).limit(page_size).all()

        # 응답 데이터 구성
        posts_data = []
        for post_obj in posts_list:
            # 작성자 정보 조회
            author = None
            if post_obj.author_id:
                author = db.query(User).filter(User.id == post_obj.author_id).first()
            
            # 카테고리 정보 조회
            category = None
            if post_obj.category_id:
                category = db.query(PostCategory).filter(PostCategory.id == post_obj.category_id).first()
            
            # 태그 정보 조회 (blog_post_tags 테이블 사용)
            tags = []
            if post_obj.id:
                # Raw SQL로 태그 조회
                tag_result = db.execute(
                    text("SELECT pt.id, pt.name, pt.slug FROM post_tags pt "
                         "JOIN post_tag_associations pta ON pt.id = pta.tag_id "
                         "WHERE pta.post_id = :post_id"),
                    {"post_id": post_obj.id}
                )
                tags = [{"id": row[0], "name": row[1], "slug": row[2]} for row in tag_result.fetchall()]
            
            post_dict = {
                "id": post_obj.id,
                "title": post_obj.title,
                "slug": post_obj.slug,
                "content": post_obj.content,  # 영문
                "content_ko": post_obj.content_ko,  # 한글
                "description": post_obj.description,
                "excerpt": post_obj.excerpt,
                "status": post_obj.status,
                "post_type": post_obj.post_type,
                "featured": post_obj.featured,
                "view_count": post_obj.view_count,
                "created_at": post_obj.created_at,
                "updated_at": post_obj.updated_at,
                "published_at": post_obj.published_at,
                "author_id": post_obj.author_id,
                "author": {
                    "id": author.id,
                    "username": author.username,
                    "email": author.email
                } if author else None,
                "category": {
                    "id": category.id,
                    "name": category.name,
                    "slug": category.slug
                } if category else None,
                "tags": tags,
                "post_info": post_obj.post_info,
                "cover_image": post_obj.cover_image,
                "cover_image_alt": post_obj.cover_image_alt
            }
            posts_data.append(post_dict)

        total_pages = (total + page_size - 1) // page_size

        return {
            "posts": posts_data,
            "total": total,
            "page": page,
            "page_size": page_size,
            "total_pages": total_pages
        }
    except Exception as e:
        return {"error": str(e), "message": "Failed to fetch posts"}



@router.get("/home")
def get_home_post(
    db: Session = Depends(get_postgres_db)
):
    """홈 페이지 포스트 조회 (slug가 없거나 빈 문자열인 포스트)"""
    # 1. slug가 빈 문자열("")인 포스트 조회
    post_obj = post.get_by_slug(db=db, slug="")
    
    if not post_obj:
        # 2. 없다면 'home' 슬러그 조회 (fallback)
        post_obj = post.get_by_slug(db=db, slug="home")
        
    if not post_obj:
        raise HTTPException(status_code=404, detail="Home post not found")

    # 조회수 증가
    post.increment_view_count(db=db, post_id=post_obj.id)

    # 작성자 정보 조회
    author = None
    if post_obj.author_id:
        author = db.query(User).filter(User.id == post_obj.author_id).first()
    
    # 카테고리 정보 조회
    category = None
    if post_obj.category_id:
        category = db.query(PostCategory).filter(PostCategory.id == post_obj.category_id).first()
    
    # 태그 정보 조회
    tags = []
    if post_obj.id:
        tag_result = db.execute(
            text("SELECT pt.id, pt.name, pt.slug FROM post_tags pt "
                 "JOIN post_tag_associations pta ON pt.id = pta.tag_id "
                 "WHERE pta.post_id = :post_id"),
            {"post_id": post_obj.id}
        )
        tags = [{"id": row[0], "name": row[1], "slug": row[2]} for row in tag_result.fetchall()]

    # 응답 데이터 구성 (직접 구성 - get_post와 동일한 로직)
    # Pydantic 모델 반환을 위해 dict로 구성
    post_dict = {
        "id": post_obj.id,
        "title": post_obj.title,
        "slug": post_obj.slug,
        "content": post_obj.content,
        "content_ko": post_obj.content_ko,
        "description": post_obj.description,
        "excerpt": post_obj.excerpt,
        "status": post_obj.status,
        "post_type": post_obj.post_type,
        "featured": post_obj.featured,
        "view_count": post_obj.view_count,
        "created_at": post_obj.created_at,
        "updated_at": post_obj.updated_at,
        "published_at": post_obj.published_at,
        "scheduled_at": post_obj.scheduled_at,
        "author_id": post_obj.author_id,
        "author": {
            "id": author.id,
            "username": author.username,
            "email": author.email
        } if author else None,
        "category_id": post_obj.category_id,
        "category": {
            "id": category.id,
            "name": category.name,
            "slug": category.slug
        } if category else None,
        "cover_image": post_obj.cover_image,
        "cover_image_alt": post_obj.cover_image_alt,
        "keywords": post_obj.keywords,
        "canonical_url": post_obj.canonical_url,
        "meta_title": post_obj.meta_title,
        "meta_description": post_obj.meta_description,
        "read_time_minutes": post_obj.read_time_minutes,
        "sync_with_asset": post_obj.sync_with_asset,
        "auto_sync_content": post_obj.auto_sync_content,
        "asset_id": post_obj.asset_id,
        "post_parent": post_obj.post_parent,
        "menu_order": post_obj.menu_order,
        "comment_count": post_obj.comment_count,
        "post_password": post_obj.post_password,
        "ping_status": post_obj.ping_status,
        "last_sync_at": post_obj.last_sync_at,
        "sync_status": post_obj.sync_status,
        "tags": tags,
        "post_info": post_obj.post_info
    }

    return post_dict



@router.get("/popular/")
def get_popular_posts(
    limit: int = Query(10, ge=1, le=50, description="조회할 포스트 수"),
    db: Session = Depends(get_postgres_db)
):
    """인기 포스트 조회 (조회수 기준)"""
    posts_list = post.get_popular_posts(db=db, limit=limit)
    return posts_list


@router.get("/recent/")
def get_recent_posts(
    limit: int = Query(10, ge=1, le=50, description="조회할 포스트 수"),
    db: Session = Depends(get_postgres_db)
):
    """최근 포스트 조회"""
    posts_list = post.get_recent_posts(db=db, limit=limit)
    return posts_list


@router.get("/stats/overview", response_model=PostStatsResponse)
def get_post_stats(
    db: Session = Depends(get_postgres_db)
):
    """포스트 통계 조회"""
    try:
        total_posts = db.query(Post).count()
        # Count by specific types
        # page_count includes 'page' and 'assets'
        page_count = db.query(Post).filter(Post.post_type.in_(['page', 'assets'])).count()
        # Treat everything else as a post
        post_count = total_posts - page_count
        
        published_posts = db.query(Post).filter(Post.status == "published").count()
        draft_posts = db.query(Post).filter(Post.status == "draft").count()
        
        # Use SQL sum for efficiency and null safety
        # Only sum views for "Posts" (excluding pages and assets), matching post_count logic
        total_views = db.query(func.sum(Post.view_count)).filter(Post.post_type.notin_(['page', 'assets'])).scalar() or 0
        
        total_comments = db.query(PostComment).count()

        # 이번 달 포스트 수
        this_month = datetime.now().replace(day=1, hour=0, minute=0, second=0, microsecond=0)
        monthly_posts = db.query(Post).filter(
            Post.created_at >= this_month
        ).count()

        # 인기 카테고리 (Convert Row to dict)
        popular_categories_rows = post_category.get_categories_with_post_count(db=db)
        popular_categories = []
        for row in popular_categories_rows:
            # SQLAlchemy Row to dict
            cat_dict = {
                "id": row.id,
                "name": row.name,
                "slug": row.slug,
                "description": row.description,
                "icon": row.icon,
                "post_count": row.post_count
            }
            popular_categories.append(cat_dict)

        # 최근 포스트 (Fix keywords if necessary)
        recent_posts_list = post.get_recent_posts(db=db, limit=5)
        for p in recent_posts_list:
            if p.keywords and isinstance(p.keywords, str):
                try:
                    p.keywords = json.loads(p.keywords)
                except:
                    p.keywords = []

        return PostStatsResponse(
            total_posts=total_posts,
            post_count=post_count,
            page_count=page_count,
            published_posts=published_posts,
            draft_posts=draft_posts,
            total_views=total_views,
            total_comments=total_comments,
            monthly_posts=monthly_posts,
            popular_categories=popular_categories,
            recent_posts=recent_posts_list
        )
    except Exception as e:
        logger.error(f"Error fetching post stats: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/{post_id}")

def get_post(
    post_id: int = Path(..., description="포스트 ID"),
    db: Session = Depends(get_postgres_db)
):
    """포스트 상세 조회"""
    post_obj = post.get(db=db, id=post_id)
    if not post_obj:
        raise HTTPException(status_code=404, detail="Post not found")

    # 조회수 증가
    post.increment_view_count(db=db, post_id=post_id)

    # 작성자 정보 조회
    author = None
    if post_obj.author_id:
        author = db.query(User).filter(User.id == post_obj.author_id).first()
    
    # 카테고리 정보 조회
    category = None
    if post_obj.category_id:
        category = db.query(PostCategory).filter(PostCategory.id == post_obj.category_id).first()
    
    # 태그 정보 조회 (blog_post_tags 테이블 사용)
    tags = []
    if post_obj.id:
        # Raw SQL로 태그 조회
        tag_result = db.execute(
            text("SELECT pt.id, pt.name, pt.slug FROM post_tags pt "
                 "JOIN post_tag_associations pta ON pt.id = pta.tag_id "
                 "WHERE pta.post_id = :post_id"),
            {"post_id": post_obj.id}
        )
        tags = [{"id": row[0], "name": row[1], "slug": row[2]} for row in tag_result.fetchall()]

    # 응답 데이터 구성
    post_dict = {
        "id": post_obj.id,
        "title": post_obj.title,
        "slug": post_obj.slug,
        "content": post_obj.content,  # 영문
        "content_ko": post_obj.content_ko,  # 한글
        "description": post_obj.description,
        "excerpt": post_obj.excerpt,
        "status": post_obj.status,
        "post_type": post_obj.post_type,
        "featured": post_obj.featured,
        "view_count": post_obj.view_count,
        "created_at": post_obj.created_at,
        "updated_at": post_obj.updated_at,
        "published_at": post_obj.published_at,
        "scheduled_at": post_obj.scheduled_at,
        "author_id": post_obj.author_id,
        "author": {
            "id": author.id,
            "username": author.username,
            "email": author.email
        } if author else None,
        "category_id": post_obj.category_id,
        "category": {
            "id": category.id,
            "name": category.name,
            "slug": category.slug
        } if category else None,
        "cover_image": post_obj.cover_image,
        "cover_image_alt": post_obj.cover_image_alt,
        "keywords": post_obj.keywords,
        "canonical_url": post_obj.canonical_url,
        "meta_title": post_obj.meta_title,
        "meta_description": post_obj.meta_description,
        "read_time_minutes": post_obj.read_time_minutes,
        "sync_with_asset": post_obj.sync_with_asset,
        "auto_sync_content": post_obj.auto_sync_content,
        "asset_id": post_obj.asset_id,
        "post_parent": post_obj.post_parent,
        "menu_order": post_obj.menu_order,
        "comment_count": post_obj.comment_count,
        "post_password": post_obj.post_password,
        "ping_status": post_obj.ping_status,
        "last_sync_at": post_obj.last_sync_at,
        "sync_status": post_obj.sync_status,
        "tags": tags,
        "post_info": post_obj.post_info
    }

    return post_dict


@router.get("/slug/{slug}")
def get_post_by_slug(
    slug: str = Path(..., description="포스트 슬러그"),
    db: Session = Depends(get_postgres_db)
):
    """슬러그로 포스트 조회"""
    post_obj = post.get_by_slug(db=db, slug=slug)
    if not post_obj:
        raise HTTPException(status_code=404, detail="Post not found")

    # 조회수 증가
    post.increment_view_count(db=db, post_id=post_obj.id)

    # 작성자 정보 조회
    author = None
    if post_obj.author_id:
        author = db.query(User).filter(User.id == post_obj.author_id).first()
    
    # 카테고리 정보 조회
    category = None
    if post_obj.category_id:
        category = db.query(PostCategory).filter(PostCategory.id == post_obj.category_id).first()
    
    # 태그 정보 조회 (blog_post_tags 테이블 사용)
    tags = []
    if post_obj.id:
        # Raw SQL로 태그 조회
        tag_result = db.execute(
            text("SELECT pt.id, pt.name, pt.slug FROM post_tags pt "
                 "JOIN post_tag_associations pta ON pt.id = pta.tag_id "
                 "WHERE pta.post_id = :post_id"),
            {"post_id": post_obj.id}
        )
        tags = [{"id": row[0], "name": row[1], "slug": row[2]} for row in tag_result.fetchall()]

    # 응답 데이터 구성
    post_dict = {
        "id": post_obj.id,
        "title": post_obj.title,
        "slug": post_obj.slug,
        "content": post_obj.content,  # 영문
        "content_ko": post_obj.content_ko,  # 한글
        "description": post_obj.description,
        "excerpt": post_obj.excerpt,
        "status": post_obj.status,
        "post_type": post_obj.post_type,
        "featured": post_obj.featured,
        "view_count": post_obj.view_count,
        "created_at": post_obj.created_at,
        "updated_at": post_obj.updated_at,
        "published_at": post_obj.published_at,
        "scheduled_at": post_obj.scheduled_at,
        "author_id": post_obj.author_id,
        "author": {
            "id": author.id,
            "username": author.username,
            "email": author.email
        } if author else None,
        "category_id": post_obj.category_id,
        "category": {
            "id": category.id,
            "name": category.name,
            "slug": category.slug
        } if category else None,
        "cover_image": post_obj.cover_image,
        "cover_image_alt": post_obj.cover_image_alt,
        "keywords": post_obj.keywords,
        "canonical_url": post_obj.canonical_url,
        "meta_title": post_obj.meta_title,
        "meta_description": post_obj.meta_description,
        "read_time_minutes": post_obj.read_time_minutes,
        "sync_with_asset": post_obj.sync_with_asset,
        "auto_sync_content": post_obj.auto_sync_content,
        "asset_id": post_obj.asset_id,
        "post_parent": post_obj.post_parent,
        "menu_order": post_obj.menu_order,
        "comment_count": post_obj.comment_count,
        "post_password": post_obj.post_password,
        "ping_status": post_obj.ping_status,
        "last_sync_at": post_obj.last_sync_at,
        "sync_status": post_obj.sync_status,
        "tags": tags,
        "post_info": post_obj.post_info
    }

    return post_dict


@router.post("/", response_model=PostResponse)
async def create_post(
    post_data: PostCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_postgres_db)
):
    """포스트 생성 (인증 필요)"""
    # 슬러그 중복 확인
    existing_post = post.get_by_slug(db=db, slug=post_data.slug)
    if existing_post:
        raise HTTPException(status_code=400, detail="Slug already exists")

    # 작성자 ID 설정
    post_data.author_id = current_user.id
    
    post_obj = post.create(db=db, obj_in=post_data)
    
    # 생성된 포스트에 기본 권한 설정
    posts_service.set_default_permissions(post_obj.id, current_user.id, db)
    
    return post_obj


@router.post("/merge", response_model=PostResponse)
async def merge_posts(
    post_ids: List[int] = Body(..., embed=True),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_postgres_db)
):
    """여러 포스트를 AI로 병합하여 새로운 초안 생성"""
    if len(post_ids) < 2:
        raise HTTPException(status_code=400, detail="At least 2 posts required for merge")

    # 포스트 조회
    source_posts = db.query(Post).filter(Post.id.in_(post_ids)).all()
    if len(source_posts) != len(post_ids):
        raise HTTPException(status_code=404, detail="Some posts not found")

    # AI 병합 실행
    try:
        agent = NewsAIEditorAgent()
        merged_data = await agent.merge_posts(source_posts)
        
        if not merged_data:
            raise HTTPException(status_code=500, detail="AI Merge failed")

        # 포스트 타입 결정 로직 (User request: news -> ai_draft_news, blog -> ai_draft_blog)
        # Check source posts types
        news_count = sum(1 for p in source_posts if p.post_type in ['news', 'raw_news'])
        is_news = news_count >= (len(source_posts) / 2) # If majority is news
        
        target_post_type = "ai_draft_news" if is_news else "ai_draft_blog"

        # Extract metadata from source posts
        all_tickers = set()
        primary_info = source_posts[0].post_info or {} if source_posts else {}
        
        for p in source_posts:
            if p.post_info and isinstance(p.post_info, dict):
                tickers = p.post_info.get('tickers')
                if tickers:
                    if isinstance(tickers, list):
                        all_tickers.update(tickers)
                    else:
                        all_tickers.add(str(tickers))
        
        # 새 포스트 생성 (Draft)
        new_post_data = PostCreate(
            title={
                "en": merged_data.get("title_en", "Merged Title"),
                "ko": merged_data.get("title_ko", "병합된 기사")
            },
            slug=f"merged-{post_ids[0]}-{int(time.time())}"[:100], # 임시 슬러그
            description={
                "en": merged_data.get("description_en", ""),
                "ko": merged_data.get("description_ko", "")
            },
            content=merged_data.get("content_en", ""),
            content_ko=merged_data.get("content_ko", ""),
            status="draft",
            post_type=target_post_type,
            author_id=current_user.id,
            post_info={
                "source_post_ids": post_ids,
                "merge_type": "ai_auto",
                "merged_at": str(datetime.now()),
                "tickers": list(all_tickers),
                "url": primary_info.get('url'),
                "source": primary_info.get('source'),
                "image_url": primary_info.get('image_url') or merged_data.get('image_url'),
                "author": primary_info.get('author'),
                # Auto-calculate sentiment
                "sentiment": sentiment_analyzer.analyze(merged_data.get("content_en", ""))
            }
        )
        
        # Create Post
        new_post = post.create(db=db, obj_in=new_post_data)
        posts_service.set_default_permissions(new_post.id, current_user.id, db)
        
        return new_post

    except Exception as e:
        logger.error(f"Merge endpoint error: {e}")
        # Return 503 Service Unavailable if AI service fails (likely Rate Limit)
        raise HTTPException(status_code=503, detail="AI Service is currently busy. Please try again in 10-20 seconds.")


@router.post("/{post_id}/ai-regenerate", response_model=PostResponse)
async def regenerate_merged_post(
    post_id: int = Path(..., description="포스트 ID"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_postgres_db)
):
    """기존 병합 포스트를 AI로 다시 생성 (Regenerate)"""
    post_obj = post.get(db=db, id=post_id)
    if not post_obj:
        raise HTTPException(status_code=404, detail="Post not found")

    # 권한 체크
    if not posts_service.can_user_edit_post(post_id, current_user, db):
        raise HTTPException(status_code=403, detail="Permission denied")

    # source_post_ids 확인
    source_ids = post_obj.post_info.get("source_post_ids") if post_obj.post_info else None
    
    # AI 작업 실행
    try:
        agent = NewsAIEditorAgent()
        merged_data = None

        if source_ids and isinstance(source_ids, list) and len(source_ids) >= 2:
            # Case 1: Re-merge (Regenerate from sources)
            source_posts = db.query(Post).filter(Post.id.in_(source_ids)).all()
            if len(source_posts) >= 2:
                 merged_data = await agent.merge_posts(source_posts)
        
        if not merged_data:
            # Case 2: Rewrite/Improve current content (Fallback)
            # Pick best available title/content
            input_title = ""
            if isinstance(post_obj.title, dict):
                input_title = post_obj.title.get("en") or post_obj.title.get("ko") or ""
            else:
                input_title = str(post_obj.title)
                
            input_content = post_obj.content or post_obj.content_ko or ""
            
            merged_data = await agent.rewrite_post({
                "title": input_title,
                "content": input_content
            })

        if not merged_data:
            raise HTTPException(status_code=500, detail="AI Regeneration/Rewrite failed")

        # Update existing post
        update_data = PostUpdate(
            title={
                "en": merged_data.get("title_en", post_obj.title.get("en") if isinstance(post_obj.title, dict) else ""),
                "ko": merged_data.get("title_ko", post_obj.title.get("ko") if isinstance(post_obj.title, dict) else "")
            },
            description={
                "en": merged_data.get("description_en", post_obj.description.get("en") if isinstance(post_obj.description, dict) else ""),
                "ko": merged_data.get("description_ko", post_obj.description.get("ko") if isinstance(post_obj.description, dict) else "")
            },
            content=merged_data.get("content_en", ""),
            content_ko=merged_data.get("content_ko", ""),
            # post_info 업데이트 (merged_at 갱신)
            post_info={
                **(post_obj.post_info or {}),
                "last_regenerated_at": str(datetime.now()),
                # Re-calculate sentiment
                "sentiment": sentiment_analyzer.analyze(merged_data.get("content_en", ""))
            }
        )
        
        logger.info(f"Update data prepared for post {post_id}")
        
        try:
            updated_post = post.update(db=db, db_obj=post_obj, obj_in=update_data)
            logger.info(f"Post {post_id} updated successfully")
            return updated_post
        except Exception as update_err:
            logger.error(f"Failed to update post in DB: {update_err}")
            raise HTTPException(status_code=500, detail="Failed to save AI generated content to database")

    except HTTPException:
        # Re-raise HTTP exceptions (like 404, 403) so they go directly to the client
        raise
    except Exception as e:
        import traceback
        logger.error(f"Unexpected Regenerate endpoint error: {traceback.format_exc()}")
        raise HTTPException(status_code=500, detail=f"Internal Server Error during AI regeneration: {str(e)}")



@router.put("/{post_id}", response_model=PostResponse)
async def update_post(
    post_id: int = Path(..., description="포스트 ID"),
    post_data: PostUpdate = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_postgres_db)
):
    """포스트 수정 (작성자만 수정 가능)"""
    post_obj = post.get(db=db, id=post_id)
    if not post_obj:
        raise HTTPException(status_code=404, detail="Post not found")

    # 권한 체크: 작성자 또는 관리자만 수정 가능
    if not posts_service.can_user_edit_post(post_id, current_user, db):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You don't have permission to edit this post"
        )

    # 슬러그 중복 확인 (다른 포스트와 중복되지 않는지)
    if post_data.slug and post_data.slug != post_obj.slug:
        existing_post = post.get_by_slug(db=db, slug=post_data.slug)
        if existing_post and existing_post.id != post_id:
            raise HTTPException(status_code=400, detail="Slug already exists")

    # AI Merge 후 발행 시 원본 포스트 삭제 로직
    if post_data.status == 'published' and post_obj.status != 'published':
        if post_obj.post_info and 'source_post_ids' in post_obj.post_info:
            source_ids = post_obj.post_info['source_post_ids']
            if source_ids and isinstance(source_ids, list):
                logger.info(f"Deleting source posts {source_ids} for merged post {post_obj.id}")
                # 원본 포스트 삭제 (bulk delete)
                db.query(Post).filter(Post.id.in_(source_ids)).delete(synchronize_session=False)
                # post_info 업데이트 (삭제 완료 표시)
                # Note: post_data.post_info가 있다면 거기에 병합해야 함. 여기서는 DB object 직접 수정은 지양하고 post_data 조작
                # 그러나 post_data는 Optional 필드들이라 복잡함.
                # 그냥 삭제만 수행해도 무방. DB 트리거 롤백 등을 위해선 트랜잭션 관리 필요하나 여기선 단순 수행.

    # Auto-calculate sentiment if content changed or publishing
    # We check if content is being updated to something non-empty
    target_content = post_data.content if post_data.content is not None else post_obj.content
    
    should_calc_sentiment = False
    # Condition 1: Content changed
    if post_data.content is not None and post_data.content != post_obj.content:
        should_calc_sentiment = True
    # Condition 2: Status changed to published (and we have content)
    elif post_data.status == 'published' and post_obj.status != 'published':
        should_calc_sentiment = True
    # Condition 3: Sentiment is missing (force calculation)
    elif post_obj.post_info is None or 'sentiment' not in post_obj.post_info:
        should_calc_sentiment = True
        
    if should_calc_sentiment and target_content and len(target_content.strip()) > 10:
        try:
            logger.info(f"Auto-calculating sentiment for post {post_id}")
            sentiment_result = sentiment_analyzer.analyze(target_content)
            
            # Prepare post_info
            # Use provided post_info update or existing one
            current_info = post_data.post_info if post_data.post_info is not None else (post_obj.post_info or {})
            
            # Ensure it's a dict (in case it was None or stored weirdly)
            if current_info is None:
                current_info = {}
            elif not isinstance(current_info, dict):
                # Should not happen given Pydantic model, but safe check
                current_info = {}
                
            current_info['sentiment'] = sentiment_result
            post_data.post_info = current_info
            
        except Exception as e:
            logger.error(f"Failed to auto-calculate sentiment: {e}")

    post_obj = post.update(db=db, db_obj=post_obj, obj_in=post_data)
    return post_obj


@router.delete("/{post_id}")
async def delete_post(
    post_id: int = Path(..., description="포스트 ID"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_postgres_db)
):
    """포스트 삭제 (작성자만 삭제 가능)"""
    post_obj = post.get(db=db, id=post_id)
    if not post_obj:
        raise HTTPException(status_code=404, detail="Post not found")

    # 권한 체크: 작성자 또는 관리자만 삭제 가능
    if not posts_service.can_user_delete_post(post_id, current_user, db):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You don't have permission to delete this post"
        )

    post.remove(db=db, id=post_id)
    return {"message": "Post deleted successfully"}


@router.get("/asset/{asset_id}", response_model=List[PostResponse])
async def get_posts_by_asset(
    asset_id: int = Path(..., description="Asset ID"),
    db: Session = Depends(get_postgres_db)
):
    """특정 Asset과 연결된 포스트 목록 조회"""
    posts_list = post.get_posts_by_asset(db=db, asset_id=asset_id)
    return posts_list


@router.post("/sync", response_model=PostSyncResponse)
async def sync_post_with_asset(
    sync_request: PostSyncRequest,
    db: Session = Depends(get_postgres_db)
):
    """포스트와 Asset 동기화"""
    success = post.sync_with_asset(
        db=db,
        post_id=sync_request.post_id,
        direction=sync_request.sync_direction
    )

    if success:
        post_obj = post.get(db=db, id=sync_request.post_id)
        return PostSyncResponse(
            success=True,
            message="Sync completed successfully",
            sync_status=post_obj.sync_status,
            last_sync_at=post_obj.last_sync_at
        )
    else:
        return PostSyncResponse(
            success=False,
            message="Sync failed",
            sync_status="failed",
            last_sync_at=None
        )




# 카테고리 관련 엔드포인트
@router.get("/categories/", response_model=List[PostCategoryResponse])
async def get_categories(
    db: Session = Depends(get_postgres_db)
):
    """포스트 카테고리 목록 조회"""
    categories = post_category.get_multi(db=db)
    return categories


@router.get("/categories/{category_id}", response_model=PostCategoryResponse)
async def get_category(
    category_id: int = Path(..., description="카테고리 ID"),
    db: Session = Depends(get_postgres_db)
):
    """카테고리 상세 조회"""
    category = post_category.get(db=db, id=category_id)
    if not category:
        raise HTTPException(status_code=404, detail="Category not found")
    return category


@router.post("/categories/", response_model=PostCategoryResponse)
async def create_category(
    category_data: PostCategoryCreate,
    db: Session = Depends(get_postgres_db)
):
    """카테고리 생성"""
    category = post_category.create(db=db, obj_in=category_data)
    return category


# 태그 관련 엔드포인트
@router.get("/tags/", response_model=List[PostTagResponse])
async def get_tags(
    limit: int = Query(20, ge=1, le=100, description="조회할 태그 수"),
    db: Session = Depends(get_postgres_db)
):
    """포스트 태그 목록 조회"""
    tags = post_tag.get_popular_tags(db=db, limit=limit)
    return tags


@router.get("/tags/search", response_model=List[PostTagResponse])
async def search_tags(
    q: str = Query(..., description="검색어"),
    limit: int = Query(10, ge=1, le=50, description="조회할 태그 수"),
    db: Session = Depends(get_postgres_db)
):
    """태그 검색"""
    tags = post_tag.search_tags(db=db, query=q, limit=limit)
    return tags


@router.get("/tags/admin", response_model=PostTagListResponse)
async def get_admin_tags(
    page: int = Query(1, ge=1, description="페이지 번호"),
    limit: int = Query(20, ge=1, le=100, description="페이지당 항목 수"),
    search: Optional[str] = Query(None, description="검색어"),
    sort_by: Optional[str] = Query('usage_count', description="정렬 기준"),
    order: Optional[str] = Query('desc', description="정렬 순서"),
    current_user: User = Depends(get_current_active_superuser),
    db: Session = Depends(get_postgres_db)
):
    """(Admin) 태그 목록 조회"""
    skip = (page - 1) * limit
    
    query = db.query(PostTag)
    
    if search:
        query = query.filter(PostTag.name.ilike(f"%{search}%"))
    
    total = query.count()
    
    if sort_by and hasattr(PostTag, sort_by):
        attr = getattr(PostTag, sort_by)
        if order == 'asc':
            query = query.order_by(attr.asc())
        else:
            query = query.order_by(attr.desc())
    else:
        query = query.order_by(PostTag.usage_count.desc())
        
    tags = query.offset(skip).limit(limit).all()
    total_pages = (total + limit - 1) // limit
    
    return {
        "tags": tags,
        "total": total,
        "page": page,
        "page_size": limit,
        "total_pages": total_pages
    }


@router.post("/tags/", response_model=PostTagResponse)
async def create_tag(
    tag_data: PostTagCreate,
    current_user: User = Depends(get_current_active_superuser),
    db: Session = Depends(get_postgres_db)
):
    """태그 생성"""
    existing = post_tag.get_by_slug(db, slug=tag_data.slug)
    if existing:
        raise HTTPException(status_code=400, detail="Tag with this slug already exists")
    
    tag = post_tag.create(db=db, obj_in=tag_data)
    return tag


@router.put("/tags/{tag_id}", response_model=PostTagResponse)
async def update_tag(
    tag_id: int,
    tag_data: PostTagUpdate,
    current_user: User = Depends(get_current_active_superuser),
    db: Session = Depends(get_postgres_db)
):
    """태그 수정"""
    tag = post_tag.get(db, id=tag_id)
    if not tag:
        raise HTTPException(status_code=404, detail="Tag not found")
        
    tag = post_tag.update(db=db, db_obj=tag, obj_in=tag_data)
    return tag


@router.delete("/tags/{tag_id}")
async def delete_tag(
    tag_id: int,
    current_user: User = Depends(get_current_active_superuser),
    db: Session = Depends(get_postgres_db)
):
    """태그 삭제"""
    tag = post_tag.get(db, id=tag_id)
    if not tag:
        raise HTTPException(status_code=404, detail="Tag not found")
        
    post_tag.remove(db=db, id=tag_id)
    return {"message": "Tag deleted successfully"}


# 댓글 관련 엔드포인트
@router.get("/admin/comments", response_model=PostCommentListResponse)
async def get_all_comments(
    page: int = Query(1, ge=1, description="페이지 번호"),
    limit: int = Query(20, ge=1, le=100, description="페이지 당 항목 수"),
    status: Optional[str] = Query(None, description="상태 필터 (all, pending, approved, spam, trash)"),
    search: Optional[str] = Query(None, description="검색어 (내용, 작성자)"),
    current_user: User = Depends(get_current_active_superuser),
    db: Session = Depends(get_postgres_db)
):
    """(Admin) 전체 댓글 목록 조회"""
    try:
        skip = (page - 1) * limit
        comments, total = post_comment.get_multi_with_filters(
            db, skip=skip, limit=limit, status=status, search=search
        )
        
        # Serialize expressly to catch Pydantic/LazyLoading errors within this block
        # and to ensure DB session is still open
        comment_schemas = []
        for c in comments:
            try:
                # We do this to ensure all required fields (inc lazy loaded ones) are fetched
                comment_schemas.append(PostCommentResponse.model_validate(c))
            except Exception as se:
                logging.error(f"Serialization failed for comment {c.id}: {se}")
                # We might want to skip this one or error out. 
                # For now let's raise to see the trace.
                raise se

        total_pages = (total + limit - 1) // limit
        
        return {
            "comments": comment_schemas,
            "total": total,
            "page": page,
            "page_size": limit,
            "total_pages": total_pages
        }
    except Exception as e:
        import traceback
        traceback.print_exc()
        logging.error(f"Error in get_all_comments: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.put("/comments/{comment_id}/status", response_model=PostCommentResponse)
async def update_comment_status(
    comment_id: int = Path(..., description="댓글 ID"),
    status: str = Body(..., embed=True, description="변경할 상태 (pending, approved, spam, trash)"),
    current_user: User = Depends(get_current_active_superuser),
    db: Session = Depends(get_postgres_db)
):
    """(Admin) 댓글 상태 변경"""
    # Eager load relationships to prevent serialization errors
    comment = db.query(PostComment).options(
        joinedload(PostComment.post),
        joinedload(PostComment.user)
    ).filter(PostComment.id == comment_id).first()
    
    if not comment:
        raise HTTPException(status_code=404, detail="Comment not found")
        
    comment = post_comment.update(db=db, db_obj=comment, obj_in={"status": status})
    
    # Re-fetch to ensure eager loading and avoid any refresh weirdness or lazy load issues
    comment = db.query(PostComment).options(
        joinedload(PostComment.post),
        joinedload(PostComment.user)
    ).filter(PostComment.id == comment_id).first()
    
    return comment



@router.get("/{post_id}/comments", response_model=List[PostCommentResponse])
async def get_post_comments(
    post_id: int = Path(..., description="포스트 ID"),
    db: Session = Depends(get_postgres_db)
):
    """포스트 댓글 목록 조회"""
    comments = post_comment.get_by_post(db=db, post_id=post_id)
    return comments


@router.post("/{post_id}/comments", response_model=PostCommentResponse)
async def create_comment(
    post_id: int = Path(..., description="포스트 ID"),
    comment_data: PostCommentCreate = Body(...),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_postgres_db)
):
    """댓글 생성 (인증 필요)"""
    # 포스트 존재 확인
    post_obj = post.get(db=db, id=post_id)
    if not post_obj:
        raise HTTPException(status_code=404, detail="Post not found")

    # 사용자 정보 자동 입력
    # 사용자 정보 자동 입력
    if hasattr(comment_data, 'model_dump'):
        comment_in = comment_data.model_dump()
    else:
        comment_in = comment_data.dict()
        
    comment_in['post_id'] = post_id
    comment_in['user_id'] = current_user.id
    
    if not comment_in.get('author_name'):
        comment_in['author_name'] = current_user.username
    if not comment_in.get('author_email'):
        comment_in['author_email'] = current_user.email
        
    # 기본적으로 pending 상태로 생성 (관리자 승인 필요)
    comment_in['status'] = 'pending'
    
    comment = post_comment.create(db=db, obj_in=comment_in)
    return comment

@router.delete("/comments/{comment_id}", response_model=PostCommentResponse)
async def delete_comment(
    comment_id: int = Path(..., description="댓글 ID"),
    current_user: User = Depends(get_current_active_superuser),
    db: Session = Depends(get_postgres_db)
):
    """(Admin) 댓글 영구 삭제"""
    # Eager load to ensure we can return the full object response
    comment = db.query(PostComment).options(
        joinedload(PostComment.post),
        joinedload(PostComment.user)
    ).filter(PostComment.id == comment_id).first()
    
    if not comment:
        raise HTTPException(status_code=404, detail="Comment not found")
        
    # We use db.delete directly since we already queried the object
    db.delete(comment)
    db.commit()
    return comment


@router.post("/cleanup", response_model=dict)
async def cleanup_posts(
    current_user: User = Depends(get_current_active_superuser),
    db: Session = Depends(get_postgres_db)
):
    """
    불량 뉴스 데이터 정리 (관리자 전용)
    - 내용이 없거나 짧은 뉴스
    - 번역이 실패하여 한글 필드에 영어가 대부분인 뉴스
    """
    try:
        # 1. Fetch candidates (raw_news, brief_news, ai_draft_news)
        # 1. Fetch candidates (raw_news, brief_news, ai_draft_news)
        # EXCLUDE published posts to prevent accidental deletion of live content
        posts = db.query(Post).filter(
            Post.post_type.in_(['raw_news', 'brief_news', 'ai_draft_news']),
            Post.status != 'published'
        ).all()
        
        to_delete_ids = []
        
        for p in posts:
            # Check 1: Empty Content/Description
            content_empty = not p.content or not p.content.strip()
            
            # Check description emptiness
            desc = p.description
            is_desc_empty = False
            
            if desc is None:
                is_desc_empty = True
            elif isinstance(desc, dict):
                has_text = False
                for val in desc.values():
                    if val and str(val).strip():
                        has_text = True
                        break
                if not has_text:
                    is_desc_empty = True
            elif isinstance(desc, str):
                 if not desc.strip():
                     is_desc_empty = True
            else:
                if not desc:
                    is_desc_empty = True

            # If both are empty, mark for deletion
            if content_empty and is_desc_empty:
                to_delete_ids.append(p.id)
                continue

            # Check 2: Short length for raw_news and ai_draft_news
            if p.post_type in ['raw_news', 'ai_draft_news']:
                c_len = len(p.content.strip()) if p.content else 0
                ck_len = len(p.content_ko.strip()) if p.content_ko else 0
                # If neither the English nor Korean content exceeds 256 characters
                if max(c_len, ck_len) <= 256:
                    to_delete_ids.append(p.id)
                    continue

            # Check 3: Mixed English/Korean content in content_ko
            # New Rule 1: Delete if English characters > 30% of total alphabetic content
            if p.content_ko:
                # Reuse is_mostly_english but with updated logic (or inline here for clarity)
                # We'll update the helper function standard to match this requirement if possible, 
                # but to avoid breaking other things, let's just do the check here using a helper or inline.
                
                # Let's use the helper definition below but updated to 30% threshold if we modify the helper.
                # However, since we can't easily modify the helper at top of file with this tool call affecting the bottom,
                # let's just implement the logic here to be safe and explicit.
                
                txt = re.sub('<[^<]+?>', '', p.content_ko).strip()
                if txt:
                    k_counts = len(re.findall('[가-힣]', txt))
                    e_counts = len(re.findall('[a-zA-Z]', txt))
                    total_counts = k_counts + e_counts
                    
                    if total_counts > 50:
                        en_ratio = e_counts / total_counts
                        if en_ratio > 0.6: # Relaxed to 60% limit
                            to_delete_ids.append(p.id)
                            continue

            # New Rule 2: Delete if no subheadings (h2, h3...) are present in content_ko
            # Only applies to ai_draft_news/raw_news where structure is expected
            if p.post_type in ['ai_draft_news', 'raw_news', 'brief_news'] and p.content_ko:
                if not re.search(r'<h[2-6]', p.content_ko, re.IGNORECASE):
                    to_delete_ids.append(p.id)
                    continue

            # Check 4: Title filtering (Shadow, Chinese, Japanese)
            title_text = ""
            if isinstance(p.title, dict):
                title_text = f"{p.title.get('en', '')} {p.title.get('ko', '')}"
            else:
                title_text = str(p.title)
            
            # 4-1. Shadow / 그림자 check
            if re.search(r'(shadow|그림자)', title_text, re.IGNORECASE):
                to_delete_ids.append(p.id)
                continue
                
            # 4-2. Chinese / Japanese character check
            # Chinese: \u4e00-\u9fff
            # Japanese: \u3040-\u309f (Hiragana), \u30a0-\u30ff (Katakana)
            if re.search(r'[\u4e00-\u9fff\u3040-\u309f\u30a0-\u30ff]', title_text):
                to_delete_ids.append(p.id)
                continue

            # Check 5: Excessive Brand Mention ("FireMarkets" >= 3 times)
            brand_count = 0
            if p.content:
                brand_count += len(re.findall(r'firemarkets', p.content, re.IGNORECASE))
            if p.content_ko:
                brand_count += len(re.findall(r'firemarkets', p.content_ko, re.IGNORECASE))
            
            if brand_count >= 3:
                to_delete_ids.append(p.id)
                continue

        count = len(to_delete_ids)
        
        if count > 0:
            # Bulk delete
            chunk_size = 1000
            deleted_total = 0
            
            for i in range(0, count, chunk_size):
                chunk = to_delete_ids[i:i+chunk_size]
                
                # 1. Delete associations first to avoid FK violations
                db.query(PostTagAssociation).filter(PostTagAssociation.post_id.in_(chunk)).delete(synchronize_session=False)
                db.query(PostComment).filter(PostComment.post_id.in_(chunk)).delete(synchronize_session=False)
                db.query(PostProduct).filter(PostProduct.post_id.in_(chunk)).delete(synchronize_session=False)
                db.query(PostChart).filter(PostChart.post_id.in_(chunk)).delete(synchronize_session=False)
                
                # 2. Delete the posts
                db.query(Post).filter(Post.id.in_(chunk)).delete(synchronize_session=False)
                deleted_total += len(chunk)
            
            db.commit()
            return {"message": f"Successfully deleted {deleted_total} bad news records.", "count": deleted_total}
        else:
            return {"message": "No bad news records found to delete.", "count": 0}

    except Exception as e:
        logger.error(f"Cleanup error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/ai-assistant")
async def ai_assistant(
    request: dict = Body(...),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_postgres_db)
):
    """
    Editor AI Assistant Endpoint.
    Accepts a prompt and context, returns AI-generated text.
    Uses NewsAIEditorAgent to enforce 'Financial Columnist' persona.
    """
    prompt = request.get("prompt")
    context = request.get("context")
    
    if not prompt:
        raise HTTPException(status_code=400, detail="Prompt is required")

    try:
        agent = NewsAIEditorAgent()
        # Call the new assist_editor method which enforces the rules
        result = await agent.assist_editor(prompt, context)
        return {"result": result}
    except Exception as e:
        logger.error(f"AI Assistant Error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


