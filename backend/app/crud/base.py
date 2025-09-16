"""
Base CRUD operations for database models.
"""
from typing import Any, Dict, Generic, List, Optional, Type, TypeVar, Union
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import and_, or_, desc, asc, func
from datetime import datetime, date

from ..core.database import Base

ModelType = TypeVar("ModelType", bound=Base)


class CRUDBase(Generic[ModelType]):
    """
    Base class for CRUD operations on database models.
    Enhanced with more ORM features for better object-oriented database operations.
    """

    def __init__(self, model: Type[ModelType]):
        """
        CRUD object with default methods to Create, Read, Update, Delete (CRUD).
        
        **Parameters**
        * `model`: A SQLAlchemy model class
        """
        self.model = model

    def get(self, db: Session, id: Any) -> Optional[ModelType]:
        """Get a single record by ID using ORM."""
        return db.query(self.model).filter(self.model.id == id).first()

    def get_by_primary_key(self, db: Session, **kwargs) -> Optional[ModelType]:
        """Get a single record by primary key fields using ORM."""
        filters = []
        for field, value in kwargs.items():
            if hasattr(self.model, field):
                filters.append(getattr(self.model, field) == value)
        
        if filters:
            return db.query(self.model).filter(and_(*filters)).first()
        return None

    def get_multi(
        self, db: Session, *, skip: int = 0, limit: int = 100
    ) -> List[ModelType]:
        """Get multiple records with pagination using ORM."""
        return db.query(self.model).offset(skip).limit(limit).all()

    def get_all(self, db: Session) -> List[ModelType]:
        """Get all records using ORM."""
        return db.query(self.model).all()

    def create(self, db: Session, *, obj_in: Union[Dict[str, Any], ModelType]) -> ModelType:
        """Create a new record using ORM."""
        if isinstance(obj_in, dict):
            obj_data = obj_in
        else:
            obj_data = obj_in.dict()
        
        db_obj = self.model(**obj_data)
        db.add(db_obj)
        db.commit()
        db.refresh(db_obj)
        return db_obj

    def create_multi(self, db: Session, *, obj_in_list: List[Union[Dict[str, Any], ModelType]]) -> List[ModelType]:
        """Create multiple records using ORM."""
        db_objs = []
        for obj_in in obj_in_list:
            if isinstance(obj_in, dict):
                obj_data = obj_in
            else:
                obj_data = obj_in.dict()
            
            db_obj = self.model(**obj_data)
            db_objs.append(db_obj)
        
        db.add_all(db_objs)
        db.commit()
        
        # Refresh all objects to get their IDs
        for db_obj in db_objs:
            db.refresh(db_obj)
        
        return db_objs

    def update(
        self,
        db: Session,
        *,
        db_obj: ModelType,
        obj_in: Union[Dict[str, Any], ModelType]
    ) -> ModelType:
        """Update an existing record using ORM."""
        if isinstance(obj_in, dict):
            update_data = obj_in
        else:
            update_data = obj_in.dict(exclude_unset=True)
        
        for field, value in update_data.items():
            if hasattr(db_obj, field):
                setattr(db_obj, field, value)
        
        db.add(db_obj)
        db.commit()
        db.refresh(db_obj)
        return db_obj

    def update_by_id(
        self,
        db: Session,
        *,
        id: Any,
        obj_in: Union[Dict[str, Any], ModelType]
    ) -> Optional[ModelType]:
        """Update a record by ID using ORM."""
        db_obj = self.get(db, id)
        if db_obj:
            return self.update(db, db_obj=db_obj, obj_in=obj_in)
        return None

    def remove(self, db: Session, *, id: int) -> Optional[ModelType]:
        """Delete a record by ID using ORM."""
        obj = db.query(self.model).get(id)
        if obj:
            db.delete(obj)
            db.commit()
            return obj
        return None

    def remove_by_primary_key(self, db: Session, **kwargs) -> Optional[ModelType]:
        """Delete a record by primary key fields using ORM."""
        obj = self.get_by_primary_key(db, **kwargs)
        if obj:
            db.delete(obj)
            db.commit()
            return obj
        return None

    def exists(self, db: Session, id: Any) -> bool:
        """Check if a record exists by ID using ORM."""
        return db.query(self.model).filter(self.model.id == id).first() is not None

    def exists_by_field(self, db: Session, field: str, value: Any) -> bool:
        """Check if a record exists by field value using ORM."""
        if hasattr(self.model, field):
            return db.query(self.model).filter(getattr(self.model, field) == value).first() is not None
        return False

    def count(self, db: Session) -> int:
        """Get total count of records using ORM."""
        return db.query(self.model).count()

    def count_by_field(self, db: Session, field: str, value: Any) -> int:
        """Get count of records by field value using ORM."""
        if hasattr(self.model, field):
            return db.query(self.model).filter(getattr(self.model, field) == value).count()
        return 0

    def get_by_field(self, db: Session, field: str, value: Any) -> Optional[ModelType]:
        """Get a record by a specific field value using ORM."""
        if hasattr(self.model, field):
            return db.query(self.model).filter(getattr(self.model, field) == value).first()
        return None

    def get_multi_by_field(
        self, db: Session, field: str, value: Any, skip: int = 0, limit: int = 100
    ) -> List[ModelType]:
        """Get multiple records by a specific field value using ORM."""
        if hasattr(self.model, field):
            return (
                db.query(self.model)
                .filter(getattr(self.model, field) == value)
                .offset(skip)
                .limit(limit)
                .all()
            )
        return []

    def get_multi_by_fields(
        self, 
        db: Session, 
        filters: Dict[str, Any], 
        skip: int = 0, 
        limit: int = 100,
        order_by: Optional[str] = None,
        order_desc: bool = True
    ) -> List[ModelType]:
        """Get multiple records by multiple field values using ORM."""
        query = db.query(self.model)
        
        # Apply filters
        for field, value in filters.items():
            if hasattr(self.model, field):
                if isinstance(value, (list, tuple)):
                    query = query.filter(getattr(self.model, field).in_(value))
                else:
                    query = query.filter(getattr(self.model, field) == value)
        
        # Apply ordering
        if order_by and hasattr(self.model, order_by):
            if order_desc:
                query = query.order_by(desc(getattr(self.model, order_by)))
            else:
                query = query.order_by(asc(getattr(self.model, order_by)))
        
        return query.offset(skip).limit(limit).all()

    def search(
        self, 
        db: Session, 
        search_fields: List[str], 
        search_term: str, 
        skip: int = 0, 
        limit: int = 100
    ) -> List[ModelType]:
        """Search records by multiple fields using ORM."""
        if not search_fields:
            return []
        
        search_conditions = []
        for field in search_fields:
            if hasattr(self.model, field):
                search_conditions.append(getattr(self.model, field).ilike(f"%{search_term}%"))
        
        if search_conditions:
            return (
                db.query(self.model)
                .filter(or_(*search_conditions))
                .offset(skip)
                .limit(limit)
                .all()
            )
        return []

    def upsert(
        self,
        db: Session,
        *,
        obj_in: Union[Dict[str, Any], ModelType],
        unique_fields: List[str]
    ) -> ModelType:
        """
        Upsert (insert or update) a record based on unique fields using ORM.
        
        **Parameters**
        * `obj_in`: Data to insert/update
        * `unique_fields`: List of field names that form the unique constraint
        """
        if isinstance(obj_in, dict):
            obj_data = obj_in
        else:
            obj_data = obj_in.dict()

        # Build filter conditions for unique fields
        filter_conditions = []
        for field in unique_fields:
            if field in obj_data and obj_data[field] is not None:
                filter_conditions.append(getattr(self.model, field) == obj_data[field])

        if not filter_conditions:
            # No unique fields provided, create new record
            return self.create(db, obj_in=obj_data)

        # Try to find existing record
        existing_obj = db.query(self.model).filter(and_(*filter_conditions)).first()

        if existing_obj:
            # Update existing record
            return self.update(db, db_obj=existing_obj, obj_in=obj_data)
        else:
            # Create new record
            return self.create(db, obj_in=obj_data)

    def bulk_upsert(
        self,
        db: Session,
        *,
        obj_in_list: List[Union[Dict[str, Any], ModelType]],
        unique_fields: List[str]
    ) -> List[ModelType]:
        """Upsert multiple records in bulk using ORM."""
        result = []
        for obj_in in obj_in_list:
            upserted_obj = self.upsert(db, obj_in=obj_in, unique_fields=unique_fields)
            result.append(upserted_obj)
        return result

    def get_with_relations(
        self, 
        db: Session, 
        id: Any, 
        relations: List[str]
    ) -> Optional[ModelType]:
        """Get a record with related data using ORM."""
        query = db.query(self.model)
        
        for relation in relations:
            if hasattr(self.model, relation):
                query = query.options(joinedload(getattr(self.model, relation)))
        
        return query.filter(self.model.id == id).first()

    def get_multi_with_relations(
        self, 
        db: Session, 
        relations: List[str],
        skip: int = 0, 
        limit: int = 100
    ) -> List[ModelType]:
        """Get multiple records with related data using ORM."""
        query = db.query(self.model)
        
        for relation in relations:
            if hasattr(self.model, relation):
                query = query.options(joinedload(getattr(self.model, relation)))
        
        return query.offset(skip).limit(limit).all()

    def get_aggregated_data(
        self, 
        db: Session, 
        group_by_field: str, 
        aggregate_field: str,
        aggregate_func: str = "count"
    ) -> List[Dict[str, Any]]:
        """Get aggregated data using ORM."""
        if not hasattr(self.model, group_by_field) or not hasattr(self.model, aggregate_field):
            return []
        
        group_by_attr = getattr(self.model, group_by_field)
        aggregate_attr = getattr(self.model, aggregate_field)
        
        if aggregate_func == "count":
            func_to_use = func.count(aggregate_attr)
        elif aggregate_func == "sum":
            func_to_use = func.sum(aggregate_attr)
        elif aggregate_func == "avg":
            func_to_use = func.avg(aggregate_attr)
        elif aggregate_func == "max":
            func_to_use = func.max(aggregate_attr)
        elif aggregate_func == "min":
            func_to_use = func.min(aggregate_attr)
        else:
            func_to_use = func.count(aggregate_attr)
        
        return (
            db.query(group_by_attr, func_to_use)
            .group_by(group_by_attr)
            .all()
        )

    def soft_delete(self, db: Session, *, id: Any, deleted_at_field: str = "deleted_at") -> Optional[ModelType]:
        """Soft delete a record by setting deleted_at field using ORM."""
        if hasattr(self.model, deleted_at_field):
            db_obj = self.get(db, id)
            if db_obj:
                setattr(db_obj, deleted_at_field, datetime.now())
                db.add(db_obj)
                db.commit()
                db.refresh(db_obj)
                return db_obj
        return None

    def restore(self, db: Session, *, id: Any, deleted_at_field: str = "deleted_at") -> Optional[ModelType]:
        """Restore a soft-deleted record using ORM."""
        if hasattr(self.model, deleted_at_field):
            db_obj = self.get(db, id)
            if db_obj:
                setattr(db_obj, deleted_at_field, None)
                db.add(db_obj)
                db.commit()
                db.refresh(db_obj)
                return db_obj
        return None






