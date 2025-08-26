from fastapi import FastAPI, Depends, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field, PositiveInt, constr, condecimal
from typing import Optional, List
from sqlalchemy.orm import Session

from .database import engine, get_db
from .models import Base, Product

Base.metadata.create_all(bind=engine)

app = FastAPI(title="Loja Escolar API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class ProductIn(BaseModel):
    name: constr(min_length=3, max_length=120)
    description: Optional[str] = None
    price: condecimal(gt=0)
    stock: int = Field(ge=0)
    category: Optional[str] = None
    sku: Optional[str] = None


class ProductOut(ProductIn):
    id: int
    created_at: Optional[str]

    class Config:
        orm_mode = True


@app.get("/products", response_model=List[ProductOut], status_code=status.HTTP_200_OK)
def list_products(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    prods = db.query(Product).offset(skip).limit(limit).all()
    return prods


@app.get("/products/{product_id}", response_model=ProductOut, status_code=status.HTTP_200_OK)
def get_product(product_id: int, db: Session = Depends(get_db)):
    p = db.query(Product).filter(Product.id == product_id).first()
    if not p:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Product not found")
    return p


@app.post("/products", response_model=ProductOut, status_code=status.HTTP_201_CREATED)
def create_product(payload: ProductIn, db: Session = Depends(get_db)):
    try:
        p = Product(
            name=payload.name,
            description=payload.description,
            price=float(payload.price),
            stock=payload.stock,
            category=payload.category,
            sku=payload.sku,
        )
        db.add(p)
        db.commit()
        db.refresh(p)
        return p
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))


@app.delete("/products/{product_id}", status_code=status.HTTP_200_OK)
def delete_product(product_id: int, db: Session = Depends(get_db)):
    p = db.query(Product).filter(Product.id == product_id).first()
    if not p:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Product not found")
    db.delete(p)
    db.commit()
    return {"deleted": product_id}
