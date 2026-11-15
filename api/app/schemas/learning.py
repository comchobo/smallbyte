from typing import Literal

from pydantic import BaseModel, Field


class ProfileUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=30)
    purpose: Literal["explore", "basics", "career", "work", "school"] | None = None
    goal: Literal["undecided", "cs", "backend", "frontend", "reliability"] | None = None
    experience: Literal["beginner", "basic", "experienced"] | None = None
    default_repo: str | None = Field(default=None, max_length=300)


class StartAttempt(BaseModel):
    task_id: str


class Submission(BaseModel):
    repo: str = Field(max_length=300)


class Answer(BaseModel):
    content: str = Field(min_length=1, max_length=5000)
    request_key: str = Field(min_length=1, max_length=100)
    question_id: str = Field(min_length=1, max_length=100)


class CriterionResult(BaseModel):
    id: str
    met: bool
    evidence: str = Field(min_length=1, max_length=3000)


class AssessmentReply(BaseModel):
    action: Literal["question", "pass", "fail"]
    message: str = Field(min_length=1, max_length=10000)
    checked: list[str]
    criteria: list[CriterionResult] = Field(default_factory=list)
    strengths: str = Field(default="", max_length=10000)
    improvements: str = Field(default="", max_length=10000)
