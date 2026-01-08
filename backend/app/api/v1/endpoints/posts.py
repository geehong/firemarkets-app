from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, Path, status
from sqlalchemy.orm import Session
from sqlalchemy import text, cast, String, func
from app.core.database import get_postgres_db
from app.crud.blog import post, post_category, post_tag, post_comment, post_product, post_chart
from app.schemas.blog import (
    PostCreate, PostUpdate, PostResponse, PostListResponse,
    PostCategoryCreate, PostCategoryUpdate, PostCategoryResponse,
    PostTagResponse, PostCommentCreate, PostCommentResponse,
    PostProductCreate, PostProductResponse, PostChartCreate, PostChartResponse,
    PostSyncRequest, PostSyncResponse, PostStatsResponse
)
from app.models.blog import Post, PostCategory, PostTag, PostComment
from app.models.asset import User
from app.dependencies.auth_deps import get_current_user, get_current_user_optional
from app.services.posts_service import posts_service
from app.services.news_ai_agent import NewsAIEditorAgent
from fastapi import Body
import logging
import time
import json
from datetime import datetime

logger = logging.getLogger(__name__)

router = APIRouter()


@router.get("/test")
async def test_posts():
    """포스트 API 테스트"""
    return {"message": "Post API is working", "status": "success"}


@router.get("/")
async def get_posts(
    page: int = Query(1, ge=1, description="페이지 번호"),
    page_size: int = Query(20, ge=1, le=1000, description="페이지당 항목 수"),
    post_type: Optional[str] = Query(None, description="포스트 타입 필터"),
    status: Optional[str] = Query(None, description="상태 필터"),
    search: Optional[str] = Query(None, description="검색어"),
    category: Optional[str] = Query(None, description="카테고리 필터"),
    tag: Optional[str] = Query(None, description="태그 필터"),
    author_id: Optional[int] = Query(None, description="작성자 ID 필터"),
    sort_by: Optional[str] = Query('created_at', description="정렬 기준 (created_at, published_at, title, view_count)"),
    order: Optional[str] = Query('desc', description="정렬 순서 (asc, desc)"),
    current_user: Optional[User] = Depends(get_current_user_optional),
    db: Session = Depends(get_postgres_db)
):
    """포스트 목록 조회 (필터링 및 정렬 지원)"""
    try:
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
        
        if status:
            query = query.filter(Post.status == status)
        
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
        
        if category:
            # 카테고리 필터링 (category_id 또는 category name으로)
            try:
                category_id = int(category)
                query = query.filter(Post.category_id == category_id)
            except ValueError:
                # category가 숫자가 아닌 경우 name으로 검색
                query = query.join(PostCategory).filter(PostCategory.name.ilike(f"%{category}%"))
        
        if tag:
            # 태그 필터링 (추후 구현)
            pass

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
                         "JOIN blog_post_tags bpt ON pt.id = bpt.tag_id "
                         "WHERE bpt.blog_id = :blog_id"),
                    {"blog_id": post_obj.id}
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
async def get_home_post(
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
                 "JOIN blog_post_tags bpt ON pt.id = bpt.tag_id "
                 "WHERE bpt.blog_id = :blog_id"),
            {"blog_id": post_obj.id}
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
async def get_popular_posts(
    limit: int = Query(10, ge=1, le=50, description="조회할 포스트 수"),
    db: Session = Depends(get_postgres_db)
):
    """인기 포스트 조회 (조회수 기준)"""
    posts_list = post.get_popular_posts(db=db, limit=limit)
    return posts_list


@router.get("/recent/")
async def get_recent_posts(
    limit: int = Query(10, ge=1, le=50, description="조회할 포스트 수"),
    db: Session = Depends(get_postgres_db)
):
    """최근 포스트 조회"""
    posts_list = post.get_recent_posts(db=db, limit=limit)
    return posts_list


@router.get("/stats/overview", response_model=PostStatsResponse)
async def get_post_stats(
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

async def get_post(
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
                 "JOIN blog_post_tags bpt ON pt.id = bpt.tag_id "
                 "WHERE bpt.blog_id = :blog_id"),
            {"blog_id": post_obj.id}
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
async def get_post_by_slug(
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
                 "JOIN blog_post_tags bpt ON pt.id = bpt.tag_id "
                 "WHERE bpt.blog_id = :blog_id"),
            {"blog_id": post_obj.id}
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
                "author": primary_info.get('author')
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
                "last_regenerated_at": str(datetime.now())
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


# 댓글 관련 엔드포인트
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
    comment_data: PostCommentCreate = None,
    db: Session = Depends(get_postgres_db)
):
    """댓글 생성"""
    # 포스트 존재 확인
    post_obj = post.get(db=db, id=post_id)
    if not post_obj:
        raise HTTPException(status_code=404, detail="Post not found")

    comment_data.post_id = post_id
    comment = post_comment.create(db=db, obj_in=comment_data)
    return comment
