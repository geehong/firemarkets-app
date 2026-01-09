
import sys
import os
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

# Add backend directory to sys.path
sys.path.append(os.path.join(os.path.dirname(__file__), '..'))

from app.core.database import SessionLocal
from app.models.asset import User

def check_users():
    db = SessionLocal()
    try:
        users = db.query(User).all()
        print(f"Total Users: {len(users)}")
        for user in users:
            print(f"ID: {user.id}, Username: {user.username}, Role: {user.role}, Is Superuser: {user.is_superuser}")
            
        # Update the first user to be admin if needed (assuming test environment)
        # Or better, update user with username 'geehong' if exists, or just print info
        
        target_username = 'geehong'
        user = db.query(User).filter(User.username == target_username).first()
        if user:
            if user.role != 'admin':
                print(f"Promoting {target_username} to admin...")
                user.role = 'admin'
                db.commit()
                print(f"User {target_username} is now admin.")
            else:
                print(f"User {target_username} is already admin.")
        else:
            print(f"User {target_username} not found.")

            # Fallback: promote first user if geehong not found
            if users and users[0].role != 'admin':
                 print(f"Promoting first user {users[0].username} to admin...")
                 users[0].role = 'admin'
                 db.commit()
    finally:
        db.close()

if __name__ == "__main__":
    check_users()
