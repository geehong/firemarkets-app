from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, Path
from sqlalchemy.orm import Session
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

router = APIRouter()


@router.get("/test")
async def test_posts():
    """포스트 API 테스트"""
    return {"message": "Post API is working", "status": "success"}


@router.get("/")
async def get_posts(
    page: int = Query(1, ge=1, description="페이지 번호"),
    page_size: int = Query(20, ge=1, le=100, description="페이지당 항목 수"),
    db: Session = Depends(get_postgres_db)
):
    """포스트 목록 조회 (단순화된 버전)"""
    try:
        skip = (page - 1) * page_size

        # 간단한 쿼리로 시작
        posts_list = db.query(Post).offset(skip).limit(page_size).all()
        total = db.query(Post).count()

        # 간단한 응답
        posts_data = []
        for post_obj in posts_list:
            post_dict = {
                "id": post_obj.id,
                "title": post_obj.title,
                "slug": post_obj.slug,
                "content": post_obj.content,
                "status": post_obj.status,
                "created_at": post_obj.created_at,
                "updated_at": post_obj.updated_at
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
    db: Session = Depends(get_postgres_db)
):
    """포스트 생성"""
    # 슬러그 중복 확인
    existing_post = post.get_by_slug(db=db, slug=post_data.slug)
    if existing_post:
        raise HTTPException(status_code=400, detail="Slug already exists")

    post_obj = post.create(db=db, obj_in=post_data)
    return post_obj


@router.put("/{post_id}", response_model=PostResponse)
async def update_post(
    post_id: int = Path(..., description="포스트 ID"),
    post_data: PostUpdate = None,
    db: Session = Depends(get_postgres_db)
):
    """포스트 수정"""
    post_obj = post.get(db=db, id=post_id)
    if not post_obj:
        raise HTTPException(status_code=404, detail="Post not found")

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
    db: Session = Depends(get_postgres_db)
):
    """포스트 삭제"""
    post_obj = post.get(db=db, id=post_id)
    if not post_obj:
        raise HTTPException(status_code=404, detail="Post not found")

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
