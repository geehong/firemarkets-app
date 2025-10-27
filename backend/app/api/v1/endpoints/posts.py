from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, Path, status
from sqlalchemy.orm import Session
from sqlalchemy import text
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
import logging

logger = logging.getLogger(__name__)

router = APIRouter()


@router.get("/test")
async def test_posts():
    """포스트 API 테스트"""
    return {"message": "Post API is working", "status": "success"}


@router.get("/")
async def get_posts(
    page: int = Query(1, ge=1, description="페이지 번호"),
    page_size: int = Query(20, ge=1, le=100, description="페이지당 항목 수"),
    post_type: Optional[str] = Query(None, description="포스트 타입 필터"),
    status: Optional[str] = Query(None, description="상태 필터"),
    search: Optional[str] = Query(None, description="검색어"),
    category: Optional[str] = Query(None, description="카테고리 필터"),
    tag: Optional[str] = Query(None, description="태그 필터"),
    author_id: Optional[int] = Query(None, description="작성자 ID 필터"),
    current_user: Optional[User] = Depends(get_current_user_optional),
    db: Session = Depends(get_postgres_db)
):
    """포스트 목록 조회 (필터링 지원)"""
    try:
        skip = (page - 1) * page_size

        # 기본 쿼리 구성
        query = db.query(Post)
        
        # 필터 적용
        if post_type:
            query = query.filter(Post.post_type == post_type)
        
        if status:
            query = query.filter(Post.status == status)
        
        if author_id:
            logger.info(f"Filtering by author_id: {author_id}")
            query = query.filter(Post.author_id == author_id)
            logger.info(f"Query after author_id filter: {query}")
            
        if search:
            query = query.filter(
                Post.title.ilike(f"%{search}%") |
                Post.content.ilike(f"%{search}%") |
                Post.description.ilike(f"%{search}%")
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

        # 정렬 (최신순)
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
                "tags": tags
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


@router.get("/{post_id}", response_model=PostResponse)
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

    return post_obj


@router.get("/slug/{slug}", response_model=PostResponse)
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

    return post_obj


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
        if existing_post:
            raise HTTPException(status_code=400, detail="Slug already exists")

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


@router.get("/popular/", response_model=List[PostResponse])
async def get_popular_posts(
    limit: int = Query(10, ge=1, le=50, description="조회할 포스트 수"),
    db: Session = Depends(get_postgres_db)
):
    """인기 포스트 조회 (조회수 기준)"""
    posts_list = post.get_popular_posts(db=db, limit=limit)
    return posts_list


@router.get("/recent/", response_model=List[PostResponse])
async def get_recent_posts(
    limit: int = Query(10, ge=1, le=50, description="조회할 포스트 수"),
    db: Session = Depends(get_postgres_db)
):
    """최근 포스트 조회"""
    posts_list = post.get_recent_posts(db=db, limit=limit)
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


@router.get("/stats/overview", response_model=PostStatsResponse)
async def get_post_stats(
    db: Session = Depends(get_postgres_db)
):
    """포스트 통계 조회"""
    total_posts = db.query(Post).count()
    published_posts = db.query(Post).filter(Post.status == "published").count()
    draft_posts = db.query(Post).filter(Post.status == "draft").count()
    total_views = db.query(Post).with_entities(Post.view_count).all()
    total_views = sum(view[0] for view in total_views)
    total_comments = db.query(PostComment).count()

    # 이번 달 포스트 수
    from datetime import datetime
    this_month = datetime.now().replace(day=1)
    monthly_posts = db.query(Post).filter(
        Post.created_at >= this_month
    ).count()

    # 인기 카테고리
    popular_categories = post_category.get_categories_with_post_count(db=db)

    # 최근 포스트
    recent_posts = post.get_recent_posts(db=db, limit=5)

    return PostStatsResponse(
        total_posts=total_posts,
        published_posts=published_posts,
        draft_posts=draft_posts,
        total_views=total_views,
        total_comments=total_comments,
        monthly_posts=monthly_posts,
        popular_categories=popular_categories,
        recent_posts=recent_posts
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
