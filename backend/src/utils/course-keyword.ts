const KEYWORD_MAX_LENGTH = 80;
type KeywordValidationError = Error & {
  code: "VALIDATION_FAILED";
  status: 400;
  details: Array<{
    field: string;
    reason: string;
  }>;
};

export function normalizeCourseKeyword(
  keyword: unknown,
  keywordValues: unknown,
): string | undefined {
  if (Array.isArray(keywordValues) && keywordValues.length > 1) {
    throw invalidKeyword("duplicate");
  }

  if (keyword !== undefined && typeof keyword !== "string") {
    throw invalidKeyword("type");
  }

  const normalizedKeyword = typeof keyword === "string" ? keyword.trim() : "";
  if (normalizedKeyword.length === 0) {
    return undefined;
  }

  if (Array.from(normalizedKeyword).length > KEYWORD_MAX_LENGTH) {
    throw invalidKeyword("maxLength");
  }

  return normalizedKeyword;
}

function invalidKeyword(reason: string): KeywordValidationError {
  const error = new Error("请求参数不合法") as KeywordValidationError;
  error.name = "ValidationError";
  error.code = "VALIDATION_FAILED";
  error.status = 400;
  error.details = [
    {
      field: "keyword",
      reason,
    },
  ];
  return error;
}
