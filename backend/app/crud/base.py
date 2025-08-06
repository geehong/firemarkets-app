"""
Base CRUD operations for database models.
"""
from typing import Any, Dict, Generic, List, Optional, Type, TypeVar, Union
from sqlalchemy.orm import Session
from sqlalchemy import and_, or_
from datetime import datetime, date

from ..core.database import Base

ModelType = TypeVar("ModelType", bound=Base)


class CRUDBase(Generic[ModelType]):
    """
    Base class for CRUD operations on database models.
    """

    def __init__(self, model: Type[ModelType]):
        """
        CRUD object with default methods to Create, Read, Update, Delete (CRUD).
        
        **Parameters**
        * `model`: A SQLAlchemy model class
        """
        self.model = model

    def get(self, db: Session, id: Any) -> Optional[ModelType]:
        """Get a single record by ID."""
        return db.query(self.model).filter(self.model.id == id).first()

    def get_multi(
        self, db: Session, *, skip: int = 0, limit: int = 100
    ) -> List[ModelType]:
        """Get multiple records with pagination."""
        return db.query(self.model).offset(skip).limit(limit).all()

    def create(self, db: Session, *, obj_in: Union[Dict[str, Any], ModelType]) -> ModelType:
        """Create a new record."""
        if isinstance(obj_in, dict):
            obj_data = obj_in
        else:
            obj_data = obj_in.dict()
        
        db_obj = self.model(**obj_data)
        db.add(db_obj)
        db.commit()
        db.refresh(db_obj)
        return db_obj

    def update(
        self,
        db: Session,
        *,
        db_obj: ModelType,
        obj_in: Union[Dict[str, Any], ModelType]
    ) -> ModelType:
        """Update an existing record."""
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

    def remove(self, db: Session, *, id: int) -> ModelType:
        """Delete a record by ID."""
        obj = db.query(self.model).get(id)
        db.delete(obj)
        db.commit()
        return obj

    def exists(self, db: Session, id: Any) -> bool:
        """Check if a record exists by ID."""
        return db.query(self.model).filter(self.model.id == id).first() is not None

    def count(self, db: Session) -> int:
        """Get total count of records."""
        return db.query(self.model).count()

    def get_by_field(self, db: Session, field: str, value: Any) -> Optional[ModelType]:
        """Get a record by a specific field value."""
        if hasattr(self.model, field):
            return db.query(self.model).filter(getattr(self.model, field) == value).first()
        return None

    def get_multi_by_field(
        self, db: Session, field: str, value: Any, skip: int = 0, limit: int = 100
    ) -> List[ModelType]:
        """Get multiple records by a specific field value."""
        if hasattr(self.model, field):
            return (
                db.query(self.model)
                .filter(getattr(self.model, field) == value)
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
        Upsert (insert or update) a record based on unique fields.
        
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

    def bulk_create(
        self, db: Session, *, obj_in_list: List[Union[Dict[str, Any], ModelType]]
    ) -> List[ModelType]:
        """Create multiple records in bulk."""
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

    def bulk_upsert(
        self,
        db: Session,
        *,
        obj_in_list: List[Union[Dict[str, Any], ModelType]],
        unique_fields: List[str]
    ) -> List[ModelType]:
        """Upsert multiple records in bulk."""
        result = []
        for obj_in in obj_in_list:
            upserted_obj = self.upsert(db, obj_in=obj_in, unique_fields=unique_fields)
            result.append(upserted_obj)
        return result






