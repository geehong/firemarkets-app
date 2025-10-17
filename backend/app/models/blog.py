# backend/app/models/blog.py
from sqlalchemy import Column, Integer, String, Text, Boolean, TIMESTAMP, ForeignKey, JSON
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.core.database import Base


class BlogCategory(Base):
    """블로그 카테고리 모델"""
    __tablename__ = 'blog_categories'
    
    id = Column(Integer, primary_key=True, autoincrement=True)
    name = Column(String(100), unique=True, nullable=False)
    slug = Column(String(100), unique=True, nullable=False)
    description = Column(Text, nullable=True)
    icon = Column(String(50), nullable=True)
    parent_id = Column(Integer, ForeignKey('blog_categories.id'), nullable=True)
    display_order = Column(Integer, default=0)
    created_at = Column(TIMESTAMP, server_default=func.now())
    updated_at = Column(TIMESTAMP, server_default=func.now(), onupdate=func.now())
    
    # 관계 설정
    parent = relationship("BlogCategory", remote_side=[id], back_populates="children")
    children = relationship("BlogCategory", back_populates="parent")
    blogs = relationship("Blog", back_populates="category")
    
    def __repr__(self):
        return f"<BlogCategory(id={self.id}, name='{self.name}', slug='{self.slug}')>"


class BlogTag(Base):
    """블로그 태그 모델"""
    __tablename__ = 'blog_tags'
    
    id = Column(Integer, primary_key=True, autoincrement=True)
    name = Column(String(50), unique=True, nullable=False)
    slug = Column(String(50), unique=True, nullable=False)
    usage_count = Column(Integer, default=0)
    created_at = Column(TIMESTAMP, server_default=func.now())
    
    # 관계 설정
    blogs = relationship("Blog", secondary="blog_post_tags", back_populates="tags")
    
    def __repr__(self):
        return f"<BlogTag(id={self.id}, name='{self.name}', slug='{self.slug}')>"


class Blog(Base):
    """블로그 포스트 모델"""
    __tablename__ = 'blogs'
    
    id = Column(Integer, primary_key=True, autoincrement=True)
    
    # Assets 테이블과의 연결
    asset_id = Column(Integer, ForeignKey('assets.asset_id'), nullable=True)
    
    # 기본 정보
    title = Column(String(200), nullable=False)
    slug = Column(String(200), unique=True, nullable=False)
    description = Column(Text, nullable=False)
    content = Column(Text, nullable=False)
    excerpt = Column(Text, nullable=True)
    
    # 동기화 설정
    sync_with_asset = Column(Boolean, default=True)
    auto_sync_content = Column(Boolean, default=True)
    
    # 상태 관리
    status = Column(String(20), default='draft')
    featured = Column(Boolean, default=False)
    
    # 작성자
    author_id = Column(Integer, ForeignKey('users.id'), nullable=True)
    
    # 카테고리
    category_id = Column(Integer, ForeignKey('blog_categories.id'), nullable=True)
    
    # 미디어
    cover_image = Column(String(500), nullable=True)
    cover_image_alt = Column(Text, nullable=True)
    
    # SEO
    meta_title = Column(String(200), nullable=True)
    meta_description = Column(String(300), nullable=True)
    keywords = Column(JSON, nullable=True)
    canonical_url = Column(String(500), nullable=True)
    
    # 통계
    view_count = Column(Integer, default=0)
    read_time_minutes = Column(Integer, nullable=True)
    
    # 타임스탬프
    created_at = Column(TIMESTAMP, server_default=func.now())
    updated_at = Column(TIMESTAMP, server_default=func.now(), onupdate=func.now())
    published_at = Column(TIMESTAMP, nullable=True)
    scheduled_at = Column(TIMESTAMP, nullable=True)
    
    # 동기화 관련
    last_sync_at = Column(TIMESTAMP, nullable=True)
    sync_status = Column(String(20), default='pending')
    
    # 관계 설정
    asset = relationship("Asset", back_populates="blogs")
    author = relationship("User")
    category = relationship("BlogCategory", back_populates="blogs")
    tags = relationship("BlogTag", secondary="blog_post_tags", back_populates="blogs")
    comments = relationship("BlogComment", back_populates="blog", cascade="all, delete-orphan")
    products = relationship("BlogProduct", back_populates="blog", cascade="all, delete-orphan")
    charts = relationship("BlogChart", back_populates="blog", cascade="all, delete-orphan")
    
    def sync_with_asset_description(self, db_session):
        """Asset의 description을 블로그 content와 동기화"""
        if not self.asset_id or not self.sync_with_asset:
            return False
            
        from .asset import Asset
        asset = db_session.query(Asset).filter(Asset.asset_id == self.asset_id).first()
        if not asset:
            return False
            
        # Asset description을 블로그 content로 복사
        if asset.description:
            self.content = asset.description
            self.last_sync_at = func.now()
            self.sync_status = 'synced'
            return True
        return False
    
    def update_asset_description(self, db_session):
        """블로그 content를 Asset description으로 동기화"""
        if not self.asset_id or not self.auto_sync_content:
            return False
            
        from .asset import Asset
        asset = db_session.query(Asset).filter(Asset.asset_id == self.asset_id).first()
        if not asset:
            return False
            
        # 블로그 content를 Asset description으로 복사
        asset.description = self.content
        self.last_sync_at = func.now()
        self.sync_status = 'synced'
        return True
    
    def __repr__(self):
        return f"<Blog(id={self.id}, title='{self.title}', slug='{self.slug}')>"


class BlogComment(Base):
    """블로그 댓글 모델"""
    __tablename__ = 'blog_comments'
    
    id = Column(Integer, primary_key=True, autoincrement=True)
    blog_id = Column(Integer, ForeignKey('blogs.id'), nullable=False)
    parent_id = Column(Integer, ForeignKey('blog_comments.id'), nullable=True)
    
    user_id = Column(Integer, ForeignKey('users.id'), nullable=True)
    author_name = Column(String(100), nullable=True)
    author_email = Column(String(200), nullable=True)
    
    content = Column(Text, nullable=False)
    
    # 상태
    status = Column(String(20), default='pending')
    
    # 반응
    likes_count = Column(Integer, default=0)
    
    created_at = Column(TIMESTAMP, server_default=func.now())
    updated_at = Column(TIMESTAMP, server_default=func.now(), onupdate=func.now())
    
    # 관계 설정
    blog = relationship("Blog", back_populates="comments")
    user = relationship("User")
    parent = relationship("BlogComment", remote_side=[id], back_populates="replies")
    replies = relationship("BlogComment", back_populates="parent")
    
    def __repr__(self):
        return f"<BlogComment(id={self.id}, blog_id={self.blog_id}, content='{self.content[:50]}...')>"


class BlogProduct(Base):
    """블로그-상품 연결 모델"""
    __tablename__ = 'blog_products'
    
    id = Column(Integer, primary_key=True, autoincrement=True)
    blog_id = Column(Integer, ForeignKey('blogs.id'), nullable=False)
    product_symbol = Column(String(20), ForeignKey('assets.ticker'), nullable=False)
    
    # 표시 옵션
    display_type = Column(String(20), nullable=True)
    display_order = Column(Integer, nullable=True)
    
    # 커스텀 설정
    show_price = Column(Boolean, default=True)
    show_chart = Column(Boolean, default=False)
    chart_timeframe = Column(String(10), nullable=True)
    
    # 글에서의 역할
    context = Column(Text, nullable=True)
    
    # 관계 설정
    blog = relationship("Blog", back_populates="products")
    asset = relationship("Asset")
    
    def __repr__(self):
        return f"<BlogProduct(id={self.id}, blog_id={self.blog_id}, symbol='{self.product_symbol}')>"


class BlogChart(Base):
    """블로그 차트 임베딩 모델"""
    __tablename__ = 'blog_charts'
    
    id = Column(Integer, primary_key=True, autoincrement=True)
    blog_id = Column(Integer, ForeignKey('blogs.id'), nullable=False)
    
    # 차트 설정
    title = Column(String(200), nullable=True)
    chart_type = Column(String(20), nullable=True)
    
    # 데이터 소스
    symbol = Column(String(20), nullable=True)
    symbols = Column(JSON, nullable=True)
    timeframe = Column(String(10), nullable=True)
    period = Column(String(10), nullable=True)
    
    # 위치
    position = Column(Integer, nullable=True)
    
    # 표시 옵션
    indicators = Column(JSON, nullable=True)
    height = Column(Integer, default=400)
    
    created_at = Column(TIMESTAMP, server_default=func.now())
    
    # 관계 설정
    blog = relationship("Blog", back_populates="charts")
    
    def __repr__(self):
        return f"<BlogChart(id={self.id}, blog_id={self.blog_id}, chart_type='{self.chart_type}')>"


# 블로그-태그 연결 테이블 (Many-to-Many)
class BlogPostTag(Base):
    """블로그-태그 연결 테이블"""
    __tablename__ = 'blog_post_tags'
    
    blog_id = Column(Integer, ForeignKey('blogs.id'), primary_key=True)
    tag_id = Column(Integer, ForeignKey('blog_tags.id'), primary_key=True)
    
    def __repr__(self):
        return f"<BlogPostTag(blog_id={self.blog_id}, tag_id={self.tag_id})>"
