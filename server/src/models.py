from sqlalchemy import Column, Integer, String
from sqlalchemy.ext.declarative import declarative_base

Base = declarative_base()


class User(Base):
    __tablename__ = "user"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String, unique=True, index=True)
    email = Column(String, unique=True, index=True)
    full_name = Column(String)
    hashed_password = Column(String)


class Token(Base):
    __tablename__ = "token"

    id = Column(Integer, primary_key=True, index=True)
    access_token = Column(String, unique=True, index=False)
    token_type = Column(String, unique=False, index=False)
