export class AppError extends Error {
  constructor(
    public statusCode: number,
    public code: string,
    message: string
  ) {
    super(message);
    this.name = 'AppError';
  }
}

export class InsufficientBalanceError extends AppError {
  constructor() {
    super(400, 'INSUFFICIENT_BALANCE', 'Insufficient balance for this operation');
  }
}

export class SessionNotFoundError extends AppError {
  constructor() {
    super(404, 'SESSION_NOT_FOUND', 'Session not found or expired');
  }
}

export class InvalidSignatureError extends AppError {
  constructor() {
    super(401, 'INVALID_SIGNATURE', 'HMAC signature validation failed');
  }
}

export class GameNotFoundError extends AppError {
  constructor() {
    super(404, 'GAME_NOT_FOUND', 'Game not found');
  }
}

export class UserNotFoundError extends AppError {
  constructor() {
    super(404, 'USER_NOT_FOUND', 'User not found');
  }
}

export class DuplicateTransactionError extends AppError {
  constructor() {
    super(409, 'DUPLICATE_TRANSACTION', 'Transaction already processed');
  }
}
