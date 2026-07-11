from fastapi import Request, status
from fastapi.responses import JSONResponse
from typing import Any, Dict, Optional, List

class PyqBaseException(Exception):
    """Base exception for PYQBase application"""
    def __init__(self, message: str, code: str, status_code: int = status.HTTP_500_INTERNAL_SERVER_ERROR, details: Optional[List[Any]] = None):
        self.message = message
        self.code = code
        self.status_code = status_code
        self.details = details or []
        super().__init__(self.message)

class ResourceNotFoundException(PyqBaseException):
    def __init__(self, message: str = "Resource not found", details: Optional[List[Any]] = None):
        super().__init__(message, code="RESOURCE_NOT_FOUND", status_code=status.HTTP_404_NOT_FOUND, details=details)

class QuotaExceededException(PyqBaseException):
    def __init__(self, message: str = "Quota exceeded", details: Optional[List[Any]] = None):
        super().__init__(message, code="QUOTA_EXCEEDED", status_code=status.HTTP_429_TOO_MANY_REQUESTS, details=details)

class DomainValidationException(PyqBaseException):
    def __init__(self, message: str = "Domain validation failed", details: Optional[List[Any]] = None):
        super().__init__(message, code="DOMAIN_VALIDATION_ERROR", status_code=status.HTTP_400_BAD_REQUEST, details=details)

class PremiumRequiredException(PyqBaseException):
    def __init__(self, message: str = "Premium subscription required", details: Optional[List[Any]] = None):
        super().__init__(message, code="PREMIUM_REQUIRED", status_code=status.HTTP_403_FORBIDDEN, details=details)

# Global Exception Handler
async def pyq_exception_handler(request: Request, exc: PyqBaseException) -> JSONResponse:
    """Returns the standard error JSON shape"""
    return JSONResponse(
        status_code=exc.status_code,
        content={
            "success": False,
            "error": {
                "code": exc.code,
                "message": exc.message,
                "details": exc.details
            }
        }
    )
