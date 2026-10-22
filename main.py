from fastapi import FastAPI,APIRouter,Depends,HTTPException,Query
from fastapi.staticfiles import StaticFiles
from fastapi.security import OAuth2PasswordBearer
from pydantic import BaseModel,ConfigDict,Field
from datetime import date,datetime,timedelta,timezone
from sqlalchemy import Column,String,Integer,create_engine,DateTime,ForeignKey
from  sqlalchemy.orm import sessionmaker,Session,declarative_base
import os
import secrets
import bcrypt
import jwt
from typing import List, Optional

app=FastAPI(title="wear_house is running")



DATABASE = os.getenv(
    "DATABASE_URL",
    "sqlite:///./warehouse.db"
)
engine=create_engine(
    DATABASE,
    connect_args={"check_same_thread": False} if DATABASE.startswith("sqlite") else {}
)

session_local=sessionmaker(bind=engine)
Base=declarative_base()

def get_db():
    db=session_local()
    try:
        yield db

    finally:
        db.close()

class Product(Base):
    __tablename__=  "products"

    id=Column(Integer,primary_key=True)
    product_name=Column(String,nullable=False)
    product_code=Column(Integer,nullable=False)
    quantity=Column(Integer,nullable=False,default=0)
    category=Column(String,nullable=True)
    unit=Column(String,nullable=False)
    discription=Column(String,nullable=True)
    order_number=Column(String,nullable=True)
    created_at=Column(DateTime,default=datetime.now)


class Category(Base):
    __tablename__="categories"

    id=Column(Integer,primary_key=True)
    name=Column(String,nullable=False,unique=True)


class Unit(Base):
    __tablename__="units"

    id=Column(Integer,primary_key=True)
    name=Column(String,nullable=False,unique=True)


class StockMovement(Base):
    __tablename__="stock_movements"

    id=Column(Integer,primary_key=True)
    product_id=Column(Integer,ForeignKey("products.id"),nullable=False)
    type=Column(String,nullable=False)
    quantity=Column(Integer,nullable=False)
    document_number=Column(String,nullable=True)
    created_at=Column(DateTime,default=datetime.now)


class User(Base):
    __tablename__="users"

    id=Column(Integer,primary_key=True)
    username=Column(String,nullable=False,unique=True)
    password_hash=Column(String,nullable=False)
    created_at=Column(DateTime,default=datetime.now)


def _migrate_products_schema():
    with engine.begin() as conn:
        columns = conn.exec_driver_sql("PRAGMA table_info(products)").fetchall()

        if not columns:
            return

        column_names = {col[1] for col in columns}
        category_column = next((col for col in columns if col[1] == "category"), None)
        category_is_nullable = category_column is None or category_column[3] == 0
        has_order_number = "order_number" in column_names

        if has_order_number and category_is_nullable:
            return

        order_number_select = "order_number" if has_order_number else "NULL"

        conn.exec_driver_sql("ALTER TABLE products RENAME TO products_old")
        Product.__table__.create(conn)
        conn.exec_driver_sql(
            "INSERT INTO products "
            "(id, product_name, product_code, quantity, category, unit, discription, order_number, created_at) "
            f"SELECT id, product_name, product_code, quantity, category, unit, discription, {order_number_select}, created_at "
            "FROM products_old"
        )
        conn.exec_driver_sql("DROP TABLE products_old")


def _migrate_price_history_to_stock_movements():
    with engine.begin() as conn:
        tables = {
            row[0]
            for row in conn.exec_driver_sql(
                "SELECT name FROM sqlite_master WHERE type='table'"
            ).fetchall()
        }

        if "stock_movements" in tables:
            return

        if "price_history" not in tables:
            return

        conn.exec_driver_sql("ALTER TABLE price_history RENAME TO stock_movements")
        conn.exec_driver_sql(
            "ALTER TABLE stock_movements ADD COLUMN type VARCHAR NOT NULL DEFAULT 'in'"
        )


def _migrate_drop_stock_movement_price():
    with engine.begin() as conn:
        columns = conn.exec_driver_sql("PRAGMA table_info(stock_movements)").fetchall()

        if "price" not in {col[1] for col in columns}:
            return

        conn.exec_driver_sql("ALTER TABLE stock_movements DROP COLUMN price")


def _migrate_add_stock_movement_document_number():
    with engine.begin() as conn:
        columns = conn.exec_driver_sql("PRAGMA table_info(stock_movements)").fetchall()

        # No table yet (fresh database) or column already there.
        if not columns or "document_number" in {col[1] for col in columns}:
            return

        conn.exec_driver_sql("ALTER TABLE stock_movements ADD COLUMN document_number VARCHAR")


if engine.dialect.name == "sqlite":
    _migrate_drop_stock_movement_price()
    _migrate_add_stock_movement_document_number()


def _get_secret_key() -> str:
    env_secret = os.getenv("SECRET_KEY")
    if env_secret:
        return env_secret

    key_path = "secret.key"
    if os.path.exists(key_path):
        with open(key_path) as f:
            return f.read().strip()

    key = secrets.token_hex(32)
    with open(key_path, "w") as f:
        f.write(key)
    return key


SECRET_KEY = _get_secret_key()
JWT_ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRES = timedelta(days=7)

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="auth/login", auto_error=False)


def create_access_token(username: str) -> str:
    expire = datetime.now(timezone.utc) + ACCESS_TOKEN_EXPIRES
    return jwt.encode({"sub": username, "exp": expire}, SECRET_KEY, algorithm=JWT_ALGORITHM)


def get_current_user(
    token: Optional[str] = Depends(oauth2_scheme),
    db: Session = Depends(get_db)
) -> User:
    unauthorized = HTTPException(
        status_code=401,
        detail="Not authenticated",
        headers={"WWW-Authenticate": "Bearer"}
    )

    if not token:
        raise unauthorized

    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[JWT_ALGORITHM])
    except jwt.PyJWTError:
        raise unauthorized

    username = payload.get("sub")
    if not username:
        raise unauthorized

    user = db.query(User).filter(User.username == username).first()
    if not user:
        raise unauthorized

    return user


class ProductCreate(BaseModel):
    product_name:str
    product_code:int
    quantity:int
    category:Optional[str] = None
    unit:str
    discription :Optional[str] = None
    order_number: Optional[str] = None



class NewProductInput(ProductCreate):
    # Document for the initial stock, recorded as the first "in" movement.
    document_number: Optional[str] = None


class ProductResponse(ProductCreate):

    id: int
    created_at: datetime

    model_config = ConfigDict(
        from_attributes=True
    )


class CategoryCreate(BaseModel):
    name: str


class CategoryResponse(CategoryCreate):
    id: int

    model_config = ConfigDict(
        from_attributes=True
    )


class UnitCreate(BaseModel):
    name: str


class UnitResponse(UnitCreate):
    id: int

    model_config = ConfigDict(
        from_attributes=True
    )


class StockMovementInput(BaseModel):
    quantity: int = Field(gt=0)
    document_number: Optional[str] = None


class TransactionResponse(BaseModel):
    id: int
    type: str
    quantity: int
    document_number: Optional[str] = None
    created_at: datetime

    model_config = ConfigDict(
        from_attributes=True
    )


class MovementReportRow(BaseModel):
    id: int
    created_at: datetime
    type: str
    quantity: int
    document_number: Optional[str] = None
    balance: int
    product_code: int
    product_name: str
    unit: str
    category: Optional[str] = None


class LoginCredentials(BaseModel):
    username: str
    password: str


class RegisterCredentials(BaseModel):
    username: str = Field(min_length=3)
    password: str = Field(min_length=6)


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    username: str


class UserResponse(BaseModel):
    username: str

    model_config = ConfigDict(
        from_attributes=True
    )


class AuthStatusResponse(BaseModel):
    setup_required: bool


@app.get("/auth/status", response_model=AuthStatusResponse)
def auth_status(db: Session = Depends(get_db)):
    user_exists = db.query(User).first() is not None
    return {"setup_required": not user_exists}


@app.post("/auth/register", response_model=TokenResponse)
def register(credentials: RegisterCredentials, db: Session = Depends(get_db)):
    if db.query(User).first() is not None:
        raise HTTPException(
            status_code=403,
            detail="Registration is closed"
        )

    password_hash = bcrypt.hashpw(
        credentials.password.encode(),
        bcrypt.gensalt()
    ).decode()

    user = User(username=credentials.username, password_hash=password_hash)

    db.add(user)
    db.commit()
    db.refresh(user)

    token = create_access_token(user.username)

    return {"access_token": token, "token_type": "bearer", "username": user.username}


@app.post("/auth/login", response_model=TokenResponse)
def login(credentials: LoginCredentials, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.username == credentials.username).first()

    if not user or not bcrypt.checkpw(
        credentials.password.encode(),
        user.password_hash.encode()
    ):
        raise HTTPException(
            status_code=401,
            detail="Invalid username or password"
        )

    token = create_access_token(user.username)

    return {"access_token": token, "token_type": "bearer", "username": user.username}


@app.get("/auth/me", response_model=UserResponse)
def me(current_user: User = Depends(get_current_user)):
    return current_user


api = APIRouter(dependencies=[Depends(get_current_user)])


@api.post("/product", response_model=ProductResponse)
def create_product(
    product: NewProductInput,
    db: Session = Depends(get_db)
):
    existing_product = (
        db.query(Product)
        .filter(Product.product_code == product.product_code)
        .first()
    )

    if existing_product:
        raise HTTPException(
            status_code=400,
            detail="Product code already exists"
        )

    new_product = Product(
        **product.model_dump(exclude={"document_number"})
    )

    db.add(new_product)

    if new_product.quantity > 0:
        db.flush()
        db.add(StockMovement(
            product_id=new_product.id,
            type="in",
            quantity=new_product.quantity,
            document_number=product.document_number
        ))

    db.commit()
    db.refresh(new_product)

    return new_product

@api.get("/show/product",response_model=List[ProductResponse])
def get_products(db:Session=Depends(get_db)):
    existing_product=(db.query(Product)).order_by(Product.id).all()

    return(existing_product)


@api.get("/products/{product_code}",response_model=ProductResponse)
def get_product(
    product_code: int,
    db: Session = Depends(get_db)):

    product = (
        db.query(Product)
        .filter(Product.product_code == product_code)
        .first())

    if not product:

        raise HTTPException(
            status_code=404,
            detail="Product not found"
        )

    return product


@api.put("/products/{product_code}", response_model=ProductResponse)
def update_product(
    product_code: int,
    payload: ProductCreate,
    db: Session = Depends(get_db)
):
    product = (
        db.query(Product)
        .filter(Product.product_code == product_code)
        .first()
    )

    if not product:
        raise HTTPException(
            status_code=404,
            detail="Product not found"
        )

    if payload.product_code != product_code:
        duplicate = (
            db.query(Product)
            .filter(Product.product_code == payload.product_code)
            .first()
        )
        if duplicate:
            raise HTTPException(
                status_code=400,
                detail="Product code already exists"
            )

    for field, value in payload.model_dump().items():
        setattr(product, field, value)

    db.commit()
    db.refresh(product)

    return product


@api.delete("/products/{product_code}", status_code=204)
def delete_product(product_code: int, db: Session = Depends(get_db)):
    product = (
        db.query(Product)
        .filter(Product.product_code == product_code)
        .first()
    )

    if not product:
        raise HTTPException(
            status_code=404,
            detail="Product not found"
        )

    db.query(StockMovement).filter(StockMovement.product_id == product.id).delete()
    db.delete(product)
    db.commit()


@api.post("/products/{product_code}/stock-in", response_model=ProductResponse)
def stock_in(
    product_code: int,
    adjustment: StockMovementInput,
    db: Session = Depends(get_db)
):
    product = (
        db.query(Product)
        .filter(Product.product_code == product_code)
        .first()
    )

    if not product:
        raise HTTPException(
            status_code=404,
            detail="Product not found"
        )

    product.quantity += adjustment.quantity

    db.add(StockMovement(
        product_id=product.id,
        type="in",
        quantity=adjustment.quantity,
        document_number=adjustment.document_number
    ))

    db.commit()
    db.refresh(product)

    return product


@api.post("/products/{product_code}/stock-out", response_model=ProductResponse)
def stock_out(
    product_code: int,
    adjustment: StockMovementInput,
    db: Session = Depends(get_db)
):
    product = (
        db.query(Product)
        .filter(Product.product_code == product_code)
        .first()
    )

    if not product:
        raise HTTPException(
            status_code=404,
            detail="Product not found"
        )

    if adjustment.quantity > product.quantity:
        raise HTTPException(
            status_code=400,
            detail="Not enough stock available"
        )

    product.quantity -= adjustment.quantity

    db.add(StockMovement(
        product_id=product.id,
        type="out",
        quantity=adjustment.quantity,
        document_number=adjustment.document_number
    ))

    db.commit()
    db.refresh(product)

    return product


@api.get("/products/{product_code}/transactions", response_model=List[TransactionResponse])
def get_transactions(product_code: int, db: Session = Depends(get_db)):
    product = (
        db.query(Product)
        .filter(Product.product_code == product_code)
        .first()
    )

    if not product:
        raise HTTPException(
            status_code=404,
            detail="Product not found"
        )

    return (
        db.query(StockMovement)
        .filter(StockMovement.product_id == product.id)
        .order_by(StockMovement.created_at)
        .all()
    )


@api.get("/reports/movements", response_model=List[MovementReportRow])
def movement_report(
    start: Optional[date] = None,
    end: Optional[date] = None,
    movement_type: Optional[str] = Query(None, alias="type"),
    product_code: Optional[int] = None,
    category: Optional[str] = None,
    document_number: Optional[str] = None,
    db: Session = Depends(get_db)
):
    rows = (
        db.query(StockMovement, Product)
        .join(Product, StockMovement.product_id == Product.id)
        .order_by(StockMovement.created_at, StockMovement.id)
        .all()
    )
    balances = {}
    running = {}
    for movement, product in reversed(rows):
        current = running.get(product.id, product.quantity)
        balances[movement.id] = current
        change = movement.quantity if movement.type == "in" else -movement.quantity
        running[product.id] = current - change

    document_query = document_number.strip().lower() if document_number else None

    report = []
    for movement, product in rows:
        day = movement.created_at.date()
        if start and day < start:
            continue
        if end and day > end:
            continue
        if movement_type and movement.type != movement_type:
            continue
        if product_code is not None and product.product_code != product_code:
            continue
        if category and product.category != category:
            continue
        if document_query and document_query not in (movement.document_number or "").lower():
            continue

        report.append(MovementReportRow(
            id=movement.id,
            created_at=movement.created_at,
            type=movement.type,
            quantity=movement.quantity,
            document_number=movement.document_number,
            balance=balances[movement.id],
            product_code=product.product_code,
            product_name=product.product_name,
            unit=product.unit,
            category=product.category
        ))

    return report


@api.post("/category", response_model=CategoryResponse)
def create_category(category: CategoryCreate, db: Session = Depends(get_db)):
    existing_category = (
        db.query(Category)
        .filter(Category.name == category.name)
        .first()
    )

    if existing_category:
        raise HTTPException(
            status_code=400,
            detail="Category already exists"
        )

    new_category = Category(**category.model_dump())

    db.add(new_category)
    db.commit()
    db.refresh(new_category)

    return new_category


@api.get("/categories", response_model=List[CategoryResponse])
def get_categories(db: Session = Depends(get_db)):
    return db.query(Category).order_by(Category.name).all()


@api.post("/unit", response_model=UnitResponse)
def create_unit(unit: UnitCreate, db: Session = Depends(get_db)):
    existing_unit = (
        db.query(Unit)
        .filter(Unit.name == unit.name)
        .first()
    )

    if existing_unit:
        raise HTTPException(
            status_code=400,
            detail="Unit already exists"
        )

    new_unit = Unit(**unit.model_dump())

    db.add(new_unit)
    db.commit()
    db.refresh(new_unit)

    return new_unit


@api.get("/units", response_model=List[UnitResponse])
def get_units(db: Session = Depends(get_db)):
    return db.query(Unit).order_by(Unit.name).all()


app.include_router(api)
app.mount("/", StaticFiles(directory=os.getenv("WEB_DIST_DIR", "web-dist"), html=True), name="frontend")







        


  