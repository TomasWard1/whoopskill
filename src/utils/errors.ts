export enum ExitCode {
  SUCCESS = 0,
  GENERAL_ERROR = 1,
  AUTH_ERROR = 2,
  RATE_LIMIT = 3,
  NETWORK_ERROR = 4,
}

export class WhoopError extends Error {
  constructor(
    message: string,
    public code: ExitCode,
    public statusCode?: number
  ) {
    super(message);
    this.name = 'WhoopError';
  }
}

export interface ErrorJSON {
  error: string;
  code: ExitCode;
  status?: number;
}

export function formatErrorJSON(error: unknown): ErrorJSON {
  if (error instanceof WhoopError) {
    const result: ErrorJSON = { error: error.message, code: error.code };
    if (error.statusCode !== undefined) result.status = error.statusCode;
    return result;
  }

  if (error instanceof Error) {
    if (error.message.includes('fetch failed') || error.message.includes('ECONNREFUSED')) {
      return { error: 'Network connection failed', code: ExitCode.NETWORK_ERROR };
    }
    return { error: error.message, code: ExitCode.GENERAL_ERROR };
  }

  return { error: 'Unknown error occurred', code: ExitCode.GENERAL_ERROR };
}

export function handleError(error: unknown, isTTY?: boolean): never {
  const tty = isTTY ?? !!process.stdout.isTTY;
  const errJSON = formatErrorJSON(error);

  if (tty) {
    const status = errJSON.status ? ` (${errJSON.status})` : '';
    console.error(`Error: ${errJSON.error}${status}`);
  } else {
    console.log(JSON.stringify(errJSON));
  }

  process.exit(errJSON.code);
}
