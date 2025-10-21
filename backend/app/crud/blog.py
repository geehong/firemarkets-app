# backend/app/crud/blog.py
from typing import List, Optional, Dict, Any
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import and_, or_, desc, asc, func
from app.models.blog import Post, PostCategory, PostTag, PostComment, PostProduct, PostChart
from app.models.asset import Asset
from app.models.user import User
from app.crud.base import CRUDBase
from app.schemas.blog import (
    PostCreate, PostUpdate, PostCategoryCreate, PostCategoryUpdate,
    PostTagCreate, PostCommentCreate, PostProductCreate, PostChartCreate
)


class CRUDPost(CRUDBase[Post]):
    """포스트 CRUD 클래스"""
    
    def get_by_slug(self, db: Session, slug: str) -> Optional[Post]:
        """슬러그로 포스트 조회"""
        return db.query(Post).filter(Post.slug == slug).first()
    
    def get_published_posts(
        self, 
        db: Session, 
        skip: int = 0, 
        limit: int = 100,
        category_id: Optional[int] = None,
        tag_id: Optional[int] = None,
        search: Optional[str] = None,
        featured: Optional[bool] = None
    ) -> List[Post]:
        """발행된 포스트 목록 조회"""
        query = db.query(Post).filter(Post.status == 'published')
        
        if category_id:
            query = query.filter(Post.category_id == category_id)
        
        if tag_id:
            query = query.join(Post.tags).filter(PostTag.id == tag_id)
        
        if search:
            query = query.filter(
                or_(
                    Post.title.ilike(f"%{search}%"),
                    Post.description.ilike(f"%{search}%"),
                    Post.content.ilike(f"%{search}%")
                )
            )
        
        if featured is not None:
            query = query.filter(Post.featured == featured)
        
        return query.options(
            joinedload(Post.category),
            joinedload(Post.tags),
            joinedload(Post.asset),
            joinedload(Post.author)
        ).order_by(desc(Post.published_at)).offset(skip).limit(limit).all()
    
    def get_posts_with_assets(
        self, 
        db: Session, 
        skip: int = 0, 
        limit: int = 100
    ) -> List[Post]:
        """Asset과 연결된 포스트 목록 조회"""
        return db.query(Post).filter(
            Post.asset_id.isnot(None)
        ).options(
            joinedload(Post.asset),
            joinedload(Post.category),
            joinedload(Post.author)
        ).order_by(desc(Post.updated_at)).offset(skip).limit(limit).all()
    
    def increment_view_count(self, db: Session, post_id: int) -> bool:
        """조회수 증가"""
        post = db.query(Post).filter(Post.id == post_id).first()
        if post:
            post.view_count += 1
            db.commit()
            return True
        return False
    
    def get_popular_posts(self, db: Session, limit: int = 10) -> List[Post]:
        """인기 포스트 조회 (조회수 기준)"""
        return db.query(Post).filter(
            Post.status == 'published'
        ).options(
            joinedload(Post.category),
            joinedload(Post.asset),
            joinedload(Post.author)
        ).order_by(desc(Post.view_count)).limit(limit).all()
    
    def get_recent_posts(self, db: Session, limit: int = 10) -> List[Post]:
        """최근 포스트 조회"""
        return db.query(Post).filter(
            Post.status == 'published'
        ).options(
            joinedload(Post.category),
            joinedload(Post.asset),
            joinedload(Post.author)
        ).order_by(desc(Post.published_at)).limit(limit).all()
    
    def get_posts_by_asset(self, db: Session, asset_id: int) -> List[Post]:
        """특정 Asset과 연결된 포스트 조회"""
        return db.query(Post).filter(
            Post.asset_id == asset_id
        ).options(
            joinedload(Post.category),
            joinedload(Post.tags),
            joinedload(Post.author)
        ).order_by(desc(Post.updated_at)).all()
    
    def sync_with_asset(self, db: Session, post_id: int, direction: str = "auto") -> bool:
        """Asset과 포스트 동기화"""
        post = db.query(Post).filter(Post.id == post_id).first()
        if not post or not post.asset_id:
            return False
        
        asset = db.query(Asset).filter(Asset.asset_id == post.asset_id).first()
        if not asset:
            return False
        
        if direction == "asset_to_post" or (direction == "auto" and post.sync_with_asset):
            if asset.description:
                post.content = asset.description
                post.sync_status = 'synced'
                return True
        
        elif direction == "post_to_asset" or (direction == "auto" and post.auto_sync_content):
            asset.description = post.content
            post.sync_status = 'synced'
            return True
        
        return False


class CRUDPostCategory(CRUDBase[PostCategory]):
    """포스트 카테고리 CRUD 클래스"""
    
    def get_by_slug(self, db: Session, slug: str) -> Optional[PostCategory]:
        """슬러그로 카테고리 조회"""
        return db.query(PostCategory).filter(PostCategory.slug == slug).first()
    
    def get_parent_categories(self, db: Session) -> List[PostCategory]:
        """부모 카테고리 목록 조회"""
        return db.query(PostCategory).filter(
            PostCategory.parent_id.is_(None)
        ).order_by(PostCategory.display_order).all()
    
    def get_child_categories(self, db: Session, parent_id: int) -> List[PostCategory]:
        """자식 카테고리 목록 조회"""
        return db.query(PostCategory).filter(
            PostCategory.parent_id == parent_id
        ).order_by(PostCategory.display_order).all()
    
    def get_categories_with_post_count(self, db: Session) -> List[Dict[str, Any]]:
        """포스트 수가 포함된 카테고리 목록 조회"""
        return db.query(
            PostCategory.id,
            PostCategory.name,
            PostCategory.slug,
            PostCategory.description,
            PostCategory.icon,
            func.count(Post.id).label('post_count')
        ).outerjoin(Post).group_by(PostCategory.id).order_by(
            PostCategory.display_order
        ).all()


class CRUDPostTag(CRUDBase[PostTag]):
    """포스트 태그 CRUD 클래스"""
    
    def get_by_slug(self, db: Session, slug: str) -> Optional[PostTag]:
        """슬러그로 태그 조회"""
        return db.query(PostTag).filter(PostTag.slug == slug).first()
    
    def get_popular_tags(self, db: Session, limit: int = 20) -> List[PostTag]:
        """인기 태그 조회"""
        return db.query(PostTag).order_by(
            desc(PostTag.usage_count)
        ).limit(limit).all()
    
    def search_tags(self, db: Session, query: str, limit: int = 10) -> List[PostTag]:
        """태그 검색"""
        return db.query(PostTag).filter(
            PostTag.name.ilike(f"%{query}%")
        ).order_by(desc(PostTag.usage_count)).limit(limit).all()


class CRUDPostComment(CRUDBase[PostComment]):
    """포스트 댓글 CRUD 클래스"""
    
    def get_by_post(self, db: Session, post_id: int) -> List[PostComment]:
        """포스트의 댓글 목록 조회"""
        return db.query(PostComment).filter(
            and_(
                PostComment.post_id == post_id,
                PostComment.parent_id.is_(None),
                PostComment.status == 'approved'
            )
        ).options(
            joinedload(PostComment.replies),
            joinedload(PostComment.user)
        ).order_by(asc(PostComment.created_at)).all()
    
    def get_pending_comments(self, db: Session, skip: int = 0, limit: int = 100) -> List[PostComment]:
        """승인 대기 중인 댓글 목록 조회"""
        return db.query(PostComment).filter(
            PostComment.status == 'pending'
        ).options(
            joinedload(PostComment.post),
            joinedload(PostComment.user)
        ).order_by(desc(PostComment.created_at)).offset(skip).limit(limit).all()
    
    def approve_comment(self, db: Session, comment_id: int) -> bool:
        """댓글 승인"""
        comment = db.query(PostComment).filter(PostComment.id == comment_id).first()
        if comment:
            comment.status = 'approved'
            db.commit()
            return True
        return False
    
    def reject_comment(self, db: Session, comment_id: int) -> bool:
        """댓글 거부"""
        comment = db.query(PostComment).filter(PostComment.id == comment_id).first()
        if comment:
            comment.status = 'spam'
            db.commit()
            return True
        return False


class CRUDPostProduct(CRUDBase[PostProduct]):
    """포스트 상품 연결 CRUD 클래스"""
    
    def get_by_post(self, db: Session, post_id: int) -> List[PostProduct]:
        """포스트의 연결된 상품 목록 조회"""
        return db.query(PostProduct).filter(
            PostProduct.post_id == post_id
        ).options(
            joinedload(PostProduct.asset)
        ).order_by(PostProduct.display_order).all()


class CRUDPostChart(CRUDBase[PostChart]):
    """포스트 차트 CRUD 클래스"""
    
    def get_by_post(self, db: Session, post_id: int) -> List[PostChart]:
        """포스트의 차트 목록 조회"""
        return db.query(PostChart).filter(
            PostChart.post_id == post_id
        ).order_by(PostChart.position).all()


# CRUD 인스턴스 생성
post = CRUDPost(Post)
post_category = CRUDPostCategory(PostCategory)
post_tag = CRUDPostTag(PostTag)
post_comment = CRUDPostComment(PostComment)
post_product = CRUDPostProduct(PostProduct)
post_chart = CRUDPostChart(PostChart)
