# backend/app/crud/blog.py
from typing import List, Optional, Dict, Any
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import and_, or_, desc, asc, func
from app.models.blog import Blog, BlogCategory, BlogTag, BlogComment, BlogProduct, BlogChart
from app.models.asset import Asset
from app.models.user import User
from app.crud.base import CRUDBase
from app.schemas.blog import (
    BlogCreate, BlogUpdate, BlogCategoryCreate, BlogCategoryUpdate,
    BlogTagCreate, BlogCommentCreate, BlogProductCreate, BlogChartCreate
)


class CRUDBlog(CRUDBase[Blog]):
    """블로그 CRUD 클래스"""
    
    def get_by_slug(self, db: Session, slug: str) -> Optional[Blog]:
        """슬러그로 블로그 조회"""
        return db.query(Blog).filter(Blog.slug == slug).first()
    
    def get_published_blogs(
        self, 
        db: Session, 
        skip: int = 0, 
        limit: int = 100,
        category_id: Optional[int] = None,
        tag_id: Optional[int] = None,
        search: Optional[str] = None,
        featured: Optional[bool] = None
    ) -> List[Blog]:
        """발행된 블로그 목록 조회"""
        query = db.query(Blog).filter(Blog.status == 'published')
        
        if category_id:
            query = query.filter(Blog.category_id == category_id)
        
        if tag_id:
            query = query.join(Blog.tags).filter(BlogTag.id == tag_id)
        
        if search:
            query = query.filter(
                or_(
                    Blog.title.ilike(f"%{search}%"),
                    Blog.description.ilike(f"%{search}%"),
                    Blog.content.ilike(f"%{search}%")
                )
            )
        
        if featured is not None:
            query = query.filter(Blog.featured == featured)
        
        return query.options(
            joinedload(Blog.category),
            joinedload(Blog.tags),
            joinedload(Blog.asset),
            joinedload(Blog.author)
        ).order_by(desc(Blog.published_at)).offset(skip).limit(limit).all()
    
    def get_blogs_with_assets(
        self, 
        db: Session, 
        skip: int = 0, 
        limit: int = 100
    ) -> List[Blog]:
        """Asset과 연결된 블로그 목록 조회"""
        return db.query(Blog).filter(
            Blog.asset_id.isnot(None)
        ).options(
            joinedload(Blog.asset),
            joinedload(Blog.category),
            joinedload(Blog.author)
        ).order_by(desc(Blog.updated_at)).offset(skip).limit(limit).all()
    
    def increment_view_count(self, db: Session, blog_id: int) -> bool:
        """조회수 증가"""
        blog = db.query(Blog).filter(Blog.id == blog_id).first()
        if blog:
            blog.view_count += 1
            db.commit()
            return True
        return False
    
    def get_popular_blogs(self, db: Session, limit: int = 10) -> List[Blog]:
        """인기 블로그 조회 (조회수 기준)"""
        return db.query(Blog).filter(
            Blog.status == 'published'
        ).options(
            joinedload(Blog.category),
            joinedload(Blog.asset),
            joinedload(Blog.author)
        ).order_by(desc(Blog.view_count)).limit(limit).all()
    
    def get_recent_blogs(self, db: Session, limit: int = 10) -> List[Blog]:
        """최근 블로그 조회"""
        return db.query(Blog).filter(
            Blog.status == 'published'
        ).options(
            joinedload(Blog.category),
            joinedload(Blog.asset),
            joinedload(Blog.author)
        ).order_by(desc(Blog.published_at)).limit(limit).all()
    
    def get_blogs_by_asset(self, db: Session, asset_id: int) -> List[Blog]:
        """특정 Asset과 연결된 블로그 조회"""
        return db.query(Blog).filter(
            Blog.asset_id == asset_id
        ).options(
            joinedload(Blog.category),
            joinedload(Blog.tags),
            joinedload(Blog.author)
        ).order_by(desc(Blog.updated_at)).all()
    
    def sync_with_asset(self, db: Session, blog_id: int, direction: str = "auto") -> bool:
        """Asset과 블로그 동기화"""
        blog = db.query(Blog).filter(Blog.id == blog_id).first()
        if not blog or not blog.asset_id:
            return False
        
        asset = db.query(Asset).filter(Asset.asset_id == blog.asset_id).first()
        if not asset:
            return False
        
        if direction == "asset_to_blog" or (direction == "auto" and blog.sync_with_asset):
            if asset.description:
                blog.content = asset.description
                blog.sync_status = 'synced'
                return True
        
        elif direction == "blog_to_asset" or (direction == "auto" and blog.auto_sync_content):
            asset.description = blog.content
            blog.sync_status = 'synced'
            return True
        
        return False


class CRUDBlogCategory(CRUDBase[BlogCategory]):
    """블로그 카테고리 CRUD 클래스"""
    
    def get_by_slug(self, db: Session, slug: str) -> Optional[BlogCategory]:
        """슬러그로 카테고리 조회"""
        return db.query(BlogCategory).filter(BlogCategory.slug == slug).first()
    
    def get_parent_categories(self, db: Session) -> List[BlogCategory]:
        """부모 카테고리 목록 조회"""
        return db.query(BlogCategory).filter(
            BlogCategory.parent_id.is_(None)
        ).order_by(BlogCategory.display_order).all()
    
    def get_child_categories(self, db: Session, parent_id: int) -> List[BlogCategory]:
        """자식 카테고리 목록 조회"""
        return db.query(BlogCategory).filter(
            BlogCategory.parent_id == parent_id
        ).order_by(BlogCategory.display_order).all()
    
    def get_categories_with_blog_count(self, db: Session) -> List[Dict[str, Any]]:
        """블로그 수가 포함된 카테고리 목록 조회"""
        return db.query(
            BlogCategory.id,
            BlogCategory.name,
            BlogCategory.slug,
            BlogCategory.description,
            BlogCategory.icon,
            func.count(Blog.id).label('blog_count')
        ).outerjoin(Blog).group_by(BlogCategory.id).order_by(
            BlogCategory.display_order
        ).all()


class CRUDBlogTag(CRUDBase[BlogTag]):
    """블로그 태그 CRUD 클래스"""
    
    def get_by_slug(self, db: Session, slug: str) -> Optional[BlogTag]:
        """슬러그로 태그 조회"""
        return db.query(BlogTag).filter(BlogTag.slug == slug).first()
    
    def get_popular_tags(self, db: Session, limit: int = 20) -> List[BlogTag]:
        """인기 태그 조회"""
        return db.query(BlogTag).order_by(
            desc(BlogTag.usage_count)
        ).limit(limit).all()
    
    def search_tags(self, db: Session, query: str, limit: int = 10) -> List[BlogTag]:
        """태그 검색"""
        return db.query(BlogTag).filter(
            BlogTag.name.ilike(f"%{query}%")
        ).order_by(desc(BlogTag.usage_count)).limit(limit).all()


class CRUDBlogComment(CRUDBase[BlogComment]):
    """블로그 댓글 CRUD 클래스"""
    
    def get_by_blog(self, db: Session, blog_id: int) -> List[BlogComment]:
        """블로그의 댓글 목록 조회"""
        return db.query(BlogComment).filter(
            and_(
                BlogComment.blog_id == blog_id,
                BlogComment.parent_id.is_(None),
                BlogComment.status == 'approved'
            )
        ).options(
            joinedload(BlogComment.replies),
            joinedload(BlogComment.user)
        ).order_by(asc(BlogComment.created_at)).all()
    
    def get_pending_comments(self, db: Session, skip: int = 0, limit: int = 100) -> List[BlogComment]:
        """승인 대기 중인 댓글 목록 조회"""
        return db.query(BlogComment).filter(
            BlogComment.status == 'pending'
        ).options(
            joinedload(BlogComment.blog),
            joinedload(BlogComment.user)
        ).order_by(desc(BlogComment.created_at)).offset(skip).limit(limit).all()
    
    def approve_comment(self, db: Session, comment_id: int) -> bool:
        """댓글 승인"""
        comment = db.query(BlogComment).filter(BlogComment.id == comment_id).first()
        if comment:
            comment.status = 'approved'
            db.commit()
            return True
        return False
    
    def reject_comment(self, db: Session, comment_id: int) -> bool:
        """댓글 거부"""
        comment = db.query(BlogComment).filter(BlogComment.id == comment_id).first()
        if comment:
            comment.status = 'spam'
            db.commit()
            return True
        return False


class CRUDBlogProduct(CRUDBase[BlogProduct]):
    """블로그 상품 연결 CRUD 클래스"""
    
    def get_by_blog(self, db: Session, blog_id: int) -> List[BlogProduct]:
        """블로그의 연결된 상품 목록 조회"""
        return db.query(BlogProduct).filter(
            BlogProduct.blog_id == blog_id
        ).options(
            joinedload(BlogProduct.asset)
        ).order_by(BlogProduct.display_order).all()


class CRUDBlogChart(CRUDBase[BlogChart]):
    """블로그 차트 CRUD 클래스"""
    
    def get_by_blog(self, db: Session, blog_id: int) -> List[BlogChart]:
        """블로그의 차트 목록 조회"""
        return db.query(BlogChart).filter(
            BlogChart.blog_id == blog_id
        ).order_by(BlogChart.position).all()


# CRUD 인스턴스 생성
blog = CRUDBlog(Blog)
blog_category = CRUDBlogCategory(BlogCategory)
blog_tag = CRUDBlogTag(BlogTag)
blog_comment = CRUDBlogComment(BlogComment)
blog_product = CRUDBlogProduct(BlogProduct)
blog_chart = CRUDBlogChart(BlogChart)
