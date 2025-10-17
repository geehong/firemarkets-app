# backend/app/api/v1/endpoints/blogs.py
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, Path
from sqlalchemy.orm import Session
from app.core.database import get_postgres_db
from app.crud.blog import blog, blog_category, blog_tag, blog_comment, blog_product, blog_chart
from app.schemas.blog import (
    BlogCreate, BlogUpdate, BlogResponse, BlogListResponse,
    BlogCategoryCreate, BlogCategoryUpdate, BlogCategoryResponse,
    BlogTagResponse, BlogCommentCreate, BlogCommentResponse,
    BlogProductCreate, BlogProductResponse, BlogChartCreate, BlogChartResponse,
    BlogSyncRequest, BlogSyncResponse, BlogStatsResponse
)
from app.models.blog import Blog, BlogCategory, BlogTag, BlogComment
from app.models.asset import Asset
from app.models.user import User

router = APIRouter()


@router.get("/test")
async def test_blogs():
    """블로그 API 테스트"""
    return {"message": "Blog API is working", "status": "success"}

@router.get("/")
async def get_blogs(
    page: int = Query(1, ge=1, description="페이지 번호"),
    page_size: int = Query(20, ge=1, le=100, description="페이지당 항목 수"),
    db: Session = Depends(get_postgres_db)
):
    """블로그 목록 조회 (단순화된 버전)"""
    try:
        skip = (page - 1) * page_size
        
        # 간단한 쿼리로 시작
        blogs_list = db.query(Blog).offset(skip).limit(page_size).all()
        total = db.query(Blog).count()
        
        # 간단한 응답
        blogs_data = []
        for blog_obj in blogs_list:
            blog_dict = {
                "id": blog_obj.id,
                "title": blog_obj.title,
                "slug": blog_obj.slug,
                "content": blog_obj.content,
                "status": blog_obj.status,
                "created_at": blog_obj.created_at,
                "updated_at": blog_obj.updated_at
            }
            blogs_data.append(blog_dict)
        
        total_pages = (total + page_size - 1) // page_size
        
        return {
            "blogs": blogs_data,
            "total": total,
            "page": page,
            "page_size": page_size,
            "total_pages": total_pages
        }
    except Exception as e:
        return {"error": str(e), "message": "Failed to fetch blogs"}


@router.get("/{blog_id}", response_model=BlogResponse)
async def get_blog(
    blog_id: int = Path(..., description="블로그 ID"),
    db: Session = Depends(get_postgres_db)
):
    """블로그 상세 조회"""
    blog_obj = blog.get(db=db, id=blog_id)
    if not blog_obj:
        raise HTTPException(status_code=404, detail="Blog not found")
    
    # 조회수 증가
    blog.increment_view_count(db=db, blog_id=blog_id)
    
    return blog_obj


@router.get("/slug/{slug}", response_model=BlogResponse)
async def get_blog_by_slug(
    slug: str = Path(..., description="블로그 슬러그"),
    db: Session = Depends(get_postgres_db)
):
    """슬러그로 블로그 조회"""
    blog_obj = blog.get_by_slug(db=db, slug=slug)
    if not blog_obj:
        raise HTTPException(status_code=404, detail="Blog not found")
    
    # 조회수 증가
    blog.increment_view_count(db=db, blog_id=blog_obj.id)
    
    return blog_obj


@router.post("/", response_model=BlogResponse)
async def create_blog(
    blog_data: BlogCreate,
    db: Session = Depends(get_postgres_db)
):
    """블로그 생성"""
    # 슬러그 중복 확인
    existing_blog = blog.get_by_slug(db=db, slug=blog_data.slug)
    if existing_blog:
        raise HTTPException(status_code=400, detail="Slug already exists")
    
    blog_obj = blog.create(db=db, obj_in=blog_data)
    return blog_obj


@router.put("/{blog_id}", response_model=BlogResponse)
async def update_blog(
    blog_id: int = Path(..., description="블로그 ID"),
    blog_data: BlogUpdate = None,
    db: Session = Depends(get_postgres_db)
):
    """블로그 수정"""
    blog_obj = blog.get(db=db, id=blog_id)
    if not blog_obj:
        raise HTTPException(status_code=404, detail="Blog not found")
    
    # 슬러그 중복 확인 (다른 블로그와 중복되지 않는지)
    if blog_data.slug and blog_data.slug != blog_obj.slug:
        existing_blog = blog.get_by_slug(db=db, slug=blog_data.slug)
        if existing_blog:
            raise HTTPException(status_code=400, detail="Slug already exists")
    
    blog_obj = blog.update(db=db, db_obj=blog_obj, obj_in=blog_data)
    return blog_obj


@router.delete("/{blog_id}")
async def delete_blog(
    blog_id: int = Path(..., description="블로그 ID"),
    db: Session = Depends(get_postgres_db)
):
    """블로그 삭제"""
    blog_obj = blog.get(db=db, id=blog_id)
    if not blog_obj:
        raise HTTPException(status_code=404, detail="Blog not found")
    
    blog.remove(db=db, id=blog_id)
    return {"message": "Blog deleted successfully"}


@router.get("/asset/{asset_id}", response_model=List[BlogResponse])
async def get_blogs_by_asset(
    asset_id: int = Path(..., description="Asset ID"),
    db: Session = Depends(get_postgres_db)
):
    """특정 Asset과 연결된 블로그 목록 조회"""
    blogs_list = blog.get_blogs_by_asset(db=db, asset_id=asset_id)
    return blogs_list


@router.get("/popular/", response_model=List[BlogResponse])
async def get_popular_blogs(
    limit: int = Query(10, ge=1, le=50, description="조회할 블로그 수"),
    db: Session = Depends(get_postgres_db)
):
    """인기 블로그 조회 (조회수 기준)"""
    blogs_list = blog.get_popular_blogs(db=db, limit=limit)
    return blogs_list


@router.get("/recent/", response_model=List[BlogResponse])
async def get_recent_blogs(
    limit: int = Query(10, ge=1, le=50, description="조회할 블로그 수"),
    db: Session = Depends(get_postgres_db)
):
    """최근 블로그 조회"""
    blogs_list = blog.get_recent_blogs(db=db, limit=limit)
    return blogs_list


@router.post("/sync", response_model=BlogSyncResponse)
async def sync_blog_with_asset(
    sync_request: BlogSyncRequest,
    db: Session = Depends(get_postgres_db)
):
    """블로그와 Asset 동기화"""
    success = blog.sync_with_asset(
        db=db, 
        blog_id=sync_request.blog_id, 
        direction=sync_request.sync_direction
    )
    
    if success:
        blog_obj = blog.get(db=db, id=sync_request.blog_id)
        return BlogSyncResponse(
            success=True,
            message="Sync completed successfully",
            sync_status=blog_obj.sync_status,
            last_sync_at=blog_obj.last_sync_at
        )
    else:
        return BlogSyncResponse(
            success=False,
            message="Sync failed",
            sync_status="failed",
            last_sync_at=None
        )


@router.get("/stats/overview", response_model=BlogStatsResponse)
async def get_blog_stats(
    db: Session = Depends(get_postgres_db)
):
    """블로그 통계 조회"""
    total_blogs = db.query(Blog).count()
    published_blogs = db.query(Blog).filter(Blog.status == "published").count()
    draft_blogs = db.query(Blog).filter(Blog.status == "draft").count()
    total_views = db.query(Blog).with_entities(Blog.view_count).all()
    total_views = sum(view[0] for view in total_views)
    total_comments = db.query(BlogComment).count()
    
    # 이번 달 블로그 수
    from datetime import datetime, timedelta
    this_month = datetime.now().replace(day=1)
    monthly_blogs = db.query(Blog).filter(
        Blog.created_at >= this_month
    ).count()
    
    # 인기 카테고리
    popular_categories = blog_category.get_categories_with_blog_count(db=db)
    
    # 최근 블로그
    recent_blogs = blog.get_recent_blogs(db=db, limit=5)
    
    return BlogStatsResponse(
        total_blogs=total_blogs,
        published_blogs=published_blogs,
        draft_blogs=draft_blogs,
        total_views=total_views,
        total_comments=total_comments,
        monthly_blogs=monthly_blogs,
        popular_categories=popular_categories,
        recent_blogs=recent_blogs
    )


# 카테고리 관련 엔드포인트
@router.get("/categories/", response_model=List[BlogCategoryResponse])
async def get_categories(
    db: Session = Depends(get_postgres_db)
):
    """블로그 카테고리 목록 조회"""
    categories = blog_category.get_multi(db=db)
    return categories


@router.get("/categories/{category_id}", response_model=BlogCategoryResponse)
async def get_category(
    category_id: int = Path(..., description="카테고리 ID"),
    db: Session = Depends(get_postgres_db)
):
    """카테고리 상세 조회"""
    category = blog_category.get(db=db, id=category_id)
    if not category:
        raise HTTPException(status_code=404, detail="Category not found")
    return category


@router.post("/categories/", response_model=BlogCategoryResponse)
async def create_category(
    category_data: BlogCategoryCreate,
    db: Session = Depends(get_postgres_db)
):
    """카테고리 생성"""
    category = blog_category.create(db=db, obj_in=category_data)
    return category


# 태그 관련 엔드포인트
@router.get("/tags/", response_model=List[BlogTagResponse])
async def get_tags(
    limit: int = Query(20, ge=1, le=100, description="조회할 태그 수"),
    db: Session = Depends(get_postgres_db)
):
    """블로그 태그 목록 조회"""
    tags = blog_tag.get_popular_tags(db=db, limit=limit)
    return tags


@router.get("/tags/search", response_model=List[BlogTagResponse])
async def search_tags(
    q: str = Query(..., description="검색어"),
    limit: int = Query(10, ge=1, le=50, description="조회할 태그 수"),
    db: Session = Depends(get_postgres_db)
):
    """태그 검색"""
    tags = blog_tag.search_tags(db=db, query=q, limit=limit)
    return tags


# 댓글 관련 엔드포인트
@router.get("/{blog_id}/comments", response_model=List[BlogCommentResponse])
async def get_blog_comments(
    blog_id: int = Path(..., description="블로그 ID"),
    db: Session = Depends(get_postgres_db)
):
    """블로그 댓글 목록 조회"""
    comments = blog_comment.get_by_blog(db=db, blog_id=blog_id)
    return comments


@router.post("/{blog_id}/comments", response_model=BlogCommentResponse)
async def create_comment(
    blog_id: int = Path(..., description="블로그 ID"),
    comment_data: BlogCommentCreate = None,
    db: Session = Depends(get_postgres_db)
):
    """댓글 생성"""
    # 블로그 존재 확인
    blog_obj = blog.get(db=db, id=blog_id)
    if not blog_obj:
        raise HTTPException(status_code=404, detail="Blog not found")
    
    comment_data.blog_id = blog_id
    comment = blog_comment.create(db=db, obj_in=comment_data)
    return comment
