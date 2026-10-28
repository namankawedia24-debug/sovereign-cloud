from pydantic import BaseModel, EmailStr, Field, field_validator


class UserCreate(BaseModel):
    name: str = Field(
        min_length=2,
        max_length=100
    )

    email: EmailStr

    password: str = Field(
        min_length=8,
        max_length=128
    )

    role: str = "USER"

    @field_validator("name")
    @classmethod
    def validate_name(cls, value):
        value = value.strip()

        if not value:
            raise ValueError("Name cannot be empty")

        if not all(char.isalpha() or char.isspace() for char in value):
            raise ValueError("Name can contain only letters and spaces")

        return value

    @field_validator("role")
    @classmethod
    def validate_role(cls, value):
        value = value.upper()

        if value not in {"USER", "ADMIN"}:
            raise ValueError("Role must be USER or ADMIN")

        return value


class UserResponse(BaseModel):
    id: int
    name: str
    email: EmailStr
    role: str

    class Config:
        from_attributes = True