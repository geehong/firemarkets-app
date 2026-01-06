# backend/app/schemas/blog.py
from datetime import datetime
from typing import Optional, List, Dict, Any, Union
from pydantic import BaseModel, Field
from decimal import Decimal


class PostCategoryBase(BaseModel):
    """포스트 카테고리 기본 스키마"""
    name: str = Field(..., description="카테고리 이름")
    slug: str = Field(..., description="카테고리 슬러그")
    description: Optional[str] = Field(None, description="카테고리 설명")
    icon: Optional[str] = Field(None, description="아이콘 클래스명")
    parent_id: Optional[int] = Field(None, description="부모 카테고리 ID")
    display_order: int = Field(0, description="표시 순서")


class PostCategoryCreate(PostCategoryBase):
    """포스트 카테고리 생성 스키마"""
    pass


class PostCategoryUpdate(BaseModel):
    """포스트 카테고리 업데이트 스키마"""
    name: Optional[str] = None
    slug: Optional[str] = None
    description: Optional[str] = None
    icon: Optional[str] = None
    parent_id: Optional[int] = None
    display_order: Optional[int] = None


class PostCategoryResponse(PostCategoryBase):
    """포스트 카테고리 응답 스키마"""
    id: int
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True


class PostTagBase(BaseModel):
    """포스트 태그 기본 스키마"""
    name: str = Field(..., description="태그 이름")
    slug: str = Field(..., description="태그 슬러그")


class PostTagCreate(PostTagBase):
    """포스트 태그 생성 스키마"""
    pass


class PostTagResponse(PostTagBase):
    """포스트 태그 응답 스키마"""
    id: int
    usage_count: int
    created_at: datetime
    
    class Config:
        from_attributes = True


class PostAuthorResponse(BaseModel):
    """포스트 작성자 응답 스키마"""
    id: int
    username: str
    email: str

    class Config:
        from_attributes = True


class PostBase(BaseModel):
    """포스트 기본 스키마"""
    title: Union[str, Dict[str, str], Dict[str, Dict[str, str]]] = Field(..., description="포스트 제목")
    slug: str = Field(..., description="포스트 슬러그")
    description: Union[str, Dict[str, str], Dict[str, Dict[str, str]]] = Field(..., description="포스트 설명")
    content: Optional[str] = Field(None, description="포스트 내용 (영문)")
    content_ko: Optional[str] = Field(None, description="포스트 내용 (한글)")
    excerpt: Optional[Union[str, Dict[str, str], Dict[str, Dict[str, str]]]] = Field(None, description="포스트 요약")
    
    # 동기화 설정
    sync_with_asset: bool = Field(True, description="Asset과 동기화 여부")
    auto_sync_content: bool = Field(True, description="자동 동기화 여부")
    
    # 상태 관리
    status: str = Field("draft", description="포스트 상태")
    featured: bool = Field(False, description="주요 글 여부")
    
    # 작성자
    author_id: Optional[int] = Field(None, description="작성자 ID")
    
    # 카테고리
    category_id: Optional[int] = Field(None, description="카테고리 ID")
    
    # 미디어
    cover_image: Optional[str] = Field(None, description="커버 이미지 URL")
    cover_image_alt: Optional[str] = Field(None, description="커버 이미지 Alt 텍스트")
    
    # SEO
    meta_title: Optional[Union[str, Dict[str, str], Dict[str, Dict[str, str]]]] = Field(None, description="메타 제목")
    meta_description: Optional[Union[str, Dict[str, str], Dict[str, Dict[str, str]]]] = Field(None, description="메타 설명")
    keywords: Optional[Union[List[str], Dict[str, List[str]]]] = Field(None, description="키워드 목록")
    canonical_url: Optional[str] = Field(None, description="정규 URL")
    
    # Asset 연결
    asset_id: Optional[int] = Field(None, description="연결된 Asset ID")
    
    # 포스트 타입 및 구조
    post_type: str = Field("post", description="포스트 타입")
    post_parent: Optional[int] = Field(None, description="부모 포스트 ID")
    menu_order: int = Field(0, description="메뉴 순서")
    
    # 통계 및 보안
    comment_count: int = Field(0, description="댓글 수")
    post_password: Optional[str] = Field(None, description="포스트 비밀번호")
    ping_status: str = Field("open", description="핑백 상태")

    # 메타 데이터 (JSON)
    post_info: Optional[Dict[str, Any]] = Field(None, description="추가 메타데이터 (JSON자료형)")


class PostCreate(PostBase):
    """포스트 생성 스키마"""
    pass


class PostUpdate(BaseModel):
    """포스트 업데이트 스키마"""
    title: Optional[Union[str, Dict[str, str], Dict[str, Dict[str, str]]]] = None
    slug: Optional[str] = None
    description: Optional[Union[str, Dict[str, str], Dict[str, Dict[str, str]]]] = None
    content: Optional[str] = None
    content_ko: Optional[str] = None
    excerpt: Optional[Union[str, Dict[str, str], Dict[str, Dict[str, str]]]] = None
    sync_with_asset: Optional[bool] = None
    auto_sync_content: Optional[bool] = None
    status: Optional[str] = None
    featured: Optional[bool] = None
    author_id: Optional[int] = None
    category_id: Optional[int] = None
    cover_image: Optional[str] = None
    cover_image_alt: Optional[str] = None
    meta_title: Optional[Union[str, Dict[str, str], Dict[str, Dict[str, str]]]] = None
    meta_description: Optional[Union[str, Dict[str, str], Dict[str, Dict[str, str]]]] = None
    keywords: Optional[List[str]] = None
    canonical_url: Optional[str] = None
    asset_id: Optional[int] = None
    
    # 포스트 타입 및 구조
    post_type: Optional[str] = None
    post_parent: Optional[int] = None
    menu_order: Optional[int] = None
    
    # 통계 및 보안
    comment_count: Optional[int] = None
    post_password: Optional[str] = None
    ping_status: Optional[str] = None
    post_info: Optional[Dict[str, Any]] = None


class PostResponse(PostBase):
    """포스트 응답 스키마"""
    id: int
    view_count: int
    read_time_minutes: Optional[int]
    created_at: datetime
    updated_at: datetime
    published_at: Optional[datetime]
    scheduled_at: Optional[datetime]
    last_sync_at: Optional[datetime]
    sync_status: str
    
    class Config:
        from_attributes = True

    # 관계 데이터
    category: Optional[PostCategoryResponse] = None
    tags: List[PostTagResponse] = Field(default_factory=list)
    author: Optional[PostAuthorResponse] = None


class PostListResponse(BaseModel):
    """포스트 목록 응답 스키마"""
    posts: List[PostResponse]
    total: int
    page: int
    page_size: int
    total_pages: int


class PostCommentBase(BaseModel):
    """포스트 댓글 기본 스키마"""
    content: str = Field(..., description="댓글 내용")
    author_name: Optional[str] = Field(None, description="작성자 이름")
    author_email: Optional[str] = Field(None, description="작성자 이메일")
    parent_id: Optional[int] = Field(None, description="부모 댓글 ID")


class PostCommentCreate(PostCommentBase):
    """포스트 댓글 생성 스키마"""
    pass


class PostCommentResponse(PostCommentBase):
    """포스트 댓글 응답 스키마"""
    id: int
    post_id: int
    user_id: Optional[int]
    status: str
    likes_count: int
    created_at: datetime
    updated_at: datetime
    
    # 관계 데이터
    replies: List['PostCommentResponse'] = []
    
    class Config:
        from_attributes = True


class PostProductBase(BaseModel):
    """포스트 상품 연결 기본 스키마"""
    product_symbol: str = Field(..., description="상품 심볼")
    display_type: Optional[str] = Field(None, description="표시 타입")
    display_order: Optional[int] = Field(None, description="표시 순서")
    show_price: bool = Field(True, description="가격 표시 여부")
    show_chart: bool = Field(False, description="차트 표시 여부")
    chart_timeframe: Optional[str] = Field(None, description="차트 시간프레임")
    context: Optional[str] = Field(None, description="컨텍스트")


class PostProductCreate(PostProductBase):
    """포스트 상품 연결 생성 스키마"""
    pass


class PostProductResponse(PostProductBase):
    """포스트 상품 연결 응답 스키마"""
    id: int
    post_id: int
    
    class Config:
        from_attributes = True


class PostChartBase(BaseModel):
    """포스트 차트 기본 스키마"""
    title: Optional[str] = Field(None, description="차트 제목")
    chart_type: Optional[str] = Field(None, description="차트 타입")
    symbol: Optional[str] = Field(None, description="단일 심볼")
    symbols: Optional[List[str]] = Field(None, description="다중 심볼")
    timeframe: Optional[str] = Field(None, description="시간프레임")
    period: Optional[str] = Field(None, description="기간")
    position: Optional[int] = Field(None, description="위치")
    indicators: Optional[Dict[str, Any]] = Field(None, description="지표 설정")
    height: int = Field(400, description="차트 높이")


class PostChartCreate(PostChartBase):
    """포스트 차트 생성 스키마"""
    pass


class PostChartResponse(PostChartBase):
    """포스트 차트 응답 스키마"""
    id: int
    post_id: int
    created_at: datetime
    
    class Config:
        from_attributes = True


class PostSyncRequest(BaseModel):
    """포스트 동기화 요청 스키마"""
    sync_direction: str = Field(..., description="동기화 방향: asset_to_post, post_to_asset, auto")
    post_id: int = Field(..., description="포스트 ID")


class PostSyncResponse(BaseModel):
    """포스트 동기화 응답 스키마"""
    success: bool
    message: str
    sync_status: str
    last_sync_at: Optional[datetime]


class PostStatsResponse(BaseModel):
    """포스트 통계 응답 스키마"""
    total_posts: int
    published_posts: int
    draft_posts: int
    total_views: int
    total_comments: int
    monthly_posts: int
    popular_categories: List[Dict[str, Any]]
    recent_posts: List[PostResponse]


# 순환 참조 해결
PostCommentResponse.model_rebuild()
