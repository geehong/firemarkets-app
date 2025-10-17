# backend/app/schemas/blog.py
from datetime import datetime
from typing import Optional, List, Dict, Any
from pydantic import BaseModel, Field
from decimal import Decimal


class BlogCategoryBase(BaseModel):
    """블로그 카테고리 기본 스키마"""
    name: str = Field(..., description="카테고리 이름")
    slug: str = Field(..., description="카테고리 슬러그")
    description: Optional[str] = Field(None, description="카테고리 설명")
    icon: Optional[str] = Field(None, description="아이콘 클래스명")
    parent_id: Optional[int] = Field(None, description="부모 카테고리 ID")
    display_order: int = Field(0, description="표시 순서")


class BlogCategoryCreate(BlogCategoryBase):
    """블로그 카테고리 생성 스키마"""
    pass


class BlogCategoryUpdate(BaseModel):
    """블로그 카테고리 업데이트 스키마"""
    name: Optional[str] = None
    slug: Optional[str] = None
    description: Optional[str] = None
    icon: Optional[str] = None
    parent_id: Optional[int] = None
    display_order: Optional[int] = None


class BlogCategoryResponse(BlogCategoryBase):
    """블로그 카테고리 응답 스키마"""
    id: int
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True


class BlogTagBase(BaseModel):
    """블로그 태그 기본 스키마"""
    name: str = Field(..., description="태그 이름")
    slug: str = Field(..., description="태그 슬러그")


class BlogTagCreate(BlogTagBase):
    """블로그 태그 생성 스키마"""
    pass


class BlogTagResponse(BlogTagBase):
    """블로그 태그 응답 스키마"""
    id: int
    usage_count: int
    created_at: datetime
    
    class Config:
        from_attributes = True


class BlogBase(BaseModel):
    """블로그 기본 스키마"""
    title: str = Field(..., description="블로그 제목")
    slug: str = Field(..., description="블로그 슬러그")
    description: str = Field(..., description="블로그 설명")
    content: str = Field(..., description="블로그 내용")
    excerpt: Optional[str] = Field(None, description="블로그 요약")
    
    # 동기화 설정
    sync_with_asset: bool = Field(True, description="Asset과 동기화 여부")
    auto_sync_content: bool = Field(True, description="자동 동기화 여부")
    
    # 상태 관리
    status: str = Field("draft", description="블로그 상태")
    featured: bool = Field(False, description="주요 글 여부")
    
    # 작성자
    author_id: Optional[int] = Field(None, description="작성자 ID")
    
    # 카테고리
    category_id: Optional[int] = Field(None, description="카테고리 ID")
    
    # 미디어
    cover_image: Optional[str] = Field(None, description="커버 이미지 URL")
    cover_image_alt: Optional[str] = Field(None, description="커버 이미지 Alt 텍스트")
    
    # SEO
    meta_title: Optional[str] = Field(None, description="메타 제목")
    meta_description: Optional[str] = Field(None, description="메타 설명")
    keywords: Optional[List[str]] = Field(None, description="키워드 목록")
    canonical_url: Optional[str] = Field(None, description="정규 URL")
    
    # Asset 연결
    asset_id: Optional[int] = Field(None, description="연결된 Asset ID")


class BlogCreate(BlogBase):
    """블로그 생성 스키마"""
    pass


class BlogUpdate(BaseModel):
    """블로그 업데이트 스키마"""
    title: Optional[str] = None
    slug: Optional[str] = None
    description: Optional[str] = None
    content: Optional[str] = None
    excerpt: Optional[str] = None
    sync_with_asset: Optional[bool] = None
    auto_sync_content: Optional[bool] = None
    status: Optional[str] = None
    featured: Optional[bool] = None
    author_id: Optional[int] = None
    category_id: Optional[int] = None
    cover_image: Optional[str] = None
    cover_image_alt: Optional[str] = None
    meta_title: Optional[str] = None
    meta_description: Optional[str] = None
    keywords: Optional[List[str]] = None
    canonical_url: Optional[str] = None
    asset_id: Optional[int] = None


class BlogResponse(BlogBase):
    """블로그 응답 스키마"""
    id: int
    view_count: int
    read_time_minutes: Optional[int]
    created_at: datetime
    updated_at: datetime
    published_at: Optional[datetime]
    scheduled_at: Optional[datetime]
    last_sync_at: Optional[datetime]
    sync_status: str
    
    # 관계 데이터
    category: Optional[BlogCategoryResponse] = None
    tags: List[BlogTagResponse] = []
    asset: Optional[Any] = None
    author: Optional[Any] = None
    
    class Config:
        from_attributes = True


class BlogListResponse(BaseModel):
    """블로그 목록 응답 스키마"""
    blogs: List[BlogResponse]
    total: int
    page: int
    page_size: int
    total_pages: int


class BlogCommentBase(BaseModel):
    """블로그 댓글 기본 스키마"""
    content: str = Field(..., description="댓글 내용")
    author_name: Optional[str] = Field(None, description="작성자 이름")
    author_email: Optional[str] = Field(None, description="작성자 이메일")
    parent_id: Optional[int] = Field(None, description="부모 댓글 ID")


class BlogCommentCreate(BlogCommentBase):
    """블로그 댓글 생성 스키마"""
    pass


class BlogCommentResponse(BlogCommentBase):
    """블로그 댓글 응답 스키마"""
    id: int
    blog_id: int
    user_id: Optional[int]
    status: str
    likes_count: int
    created_at: datetime
    updated_at: datetime
    
    # 관계 데이터
    replies: List['BlogCommentResponse'] = []
    
    class Config:
        from_attributes = True


class BlogProductBase(BaseModel):
    """블로그 상품 연결 기본 스키마"""
    product_symbol: str = Field(..., description="상품 심볼")
    display_type: Optional[str] = Field(None, description="표시 타입")
    display_order: Optional[int] = Field(None, description="표시 순서")
    show_price: bool = Field(True, description="가격 표시 여부")
    show_chart: bool = Field(False, description="차트 표시 여부")
    chart_timeframe: Optional[str] = Field(None, description="차트 시간프레임")
    context: Optional[str] = Field(None, description="컨텍스트")


class BlogProductCreate(BlogProductBase):
    """블로그 상품 연결 생성 스키마"""
    pass


class BlogProductResponse(BlogProductBase):
    """블로그 상품 연결 응답 스키마"""
    id: int
    blog_id: int
    
    class Config:
        from_attributes = True


class BlogChartBase(BaseModel):
    """블로그 차트 기본 스키마"""
    title: Optional[str] = Field(None, description="차트 제목")
    chart_type: Optional[str] = Field(None, description="차트 타입")
    symbol: Optional[str] = Field(None, description="단일 심볼")
    symbols: Optional[List[str]] = Field(None, description="다중 심볼")
    timeframe: Optional[str] = Field(None, description="시간프레임")
    period: Optional[str] = Field(None, description="기간")
    position: Optional[int] = Field(None, description="위치")
    indicators: Optional[Dict[str, Any]] = Field(None, description="지표 설정")
    height: int = Field(400, description="차트 높이")


class BlogChartCreate(BlogChartBase):
    """블로그 차트 생성 스키마"""
    pass


class BlogChartResponse(BlogChartBase):
    """블로그 차트 응답 스키마"""
    id: int
    blog_id: int
    created_at: datetime
    
    class Config:
        from_attributes = True


class BlogSyncRequest(BaseModel):
    """블로그 동기화 요청 스키마"""
    sync_direction: str = Field(..., description="동기화 방향: asset_to_blog, blog_to_asset, auto")
    blog_id: int = Field(..., description="블로그 ID")


class BlogSyncResponse(BaseModel):
    """블로그 동기화 응답 스키마"""
    success: bool
    message: str
    sync_status: str
    last_sync_at: Optional[datetime]


class BlogStatsResponse(BaseModel):
    """블로그 통계 응답 스키마"""
    total_blogs: int
    published_blogs: int
    draft_blogs: int
    total_views: int
    total_comments: int
    monthly_blogs: int
    popular_categories: List[Dict[str, Any]]
    recent_blogs: List[BlogResponse]


# 순환 참조 해결
BlogCommentResponse.model_rebuild()
