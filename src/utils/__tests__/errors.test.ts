import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { WhoopError, ExitCode, handleError, formatErrorJSON } from '../errors.js';

describe('WhoopError', () => {
  it('has correct name and properties', () => {
    const err = new WhoopError('test message', ExitCode.AUTH_ERROR, 401);
    expect(err.name).toBe('WhoopError');
    expect(err.message).toBe('test message');
    expect(err.code).toBe(ExitCode.AUTH_ERROR);
    expect(err.statusCode).toBe(401);
  });

  it('works without statusCode', () => {
    const err = new WhoopError('no status', ExitCode.GENERAL_ERROR);
    expect(err.statusCode).toBeUndefined();
  });

  it('is an instanceof Error', () => {
    const err = new WhoopError('test', ExitCode.GENERAL_ERROR);
    expect(err).toBeInstanceOf(Error);
    expect(err).toBeInstanceOf(WhoopError);
  });
});

describe('ExitCode', () => {
  it('has correct numeric values', () => {
    expect(ExitCode.SUCCESS).toBe(0);
    expect(ExitCode.GENERAL_ERROR).toBe(1);
    expect(ExitCode.AUTH_ERROR).toBe(2);
    expect(ExitCode.RATE_LIMIT).toBe(3);
    expect(ExitCode.NETWORK_ERROR).toBe(4);
  });
});

describe('formatErrorJSON', () => {
  it('formats WhoopError with status code', () => {
    const err = new WhoopError('auth failed', ExitCode.AUTH_ERROR, 401);
    const json = formatErrorJSON(err);
    expect(json).toEqual({
      error: 'auth failed',
      code: ExitCode.AUTH_ERROR,
      status: 401,
    });
  });

  it('formats WhoopError without status code', () => {
    const err = new WhoopError('bad input', ExitCode.GENERAL_ERROR);
    const json = formatErrorJSON(err);
    expect(json).toEqual({
      error: 'bad input',
      code: ExitCode.GENERAL_ERROR,
    });
    expect(json).not.toHaveProperty('status');
  });

  it('formats network errors', () => {
    const err = new Error('fetch failed');
    const json = formatErrorJSON(err);
    expect(json).toEqual({
      error: 'Network connection failed',
      code: ExitCode.NETWORK_ERROR,
    });
  });

  it('formats ECONNREFUSED as network error', () => {
    const err = new Error('ECONNREFUSED');
    const json = formatErrorJSON(err);
    expect(json.error).toBe('Network connection failed');
    expect(json.code).toBe(ExitCode.NETWORK_ERROR);
  });

  it('formats generic Error', () => {
    const err = new Error('something broke');
    const json = formatErrorJSON(err);
    expect(json).toEqual({
      error: 'something broke',
      code: ExitCode.GENERAL_ERROR,
    });
  });

  it('formats non-Error values', () => {
    const json = formatErrorJSON('something weird');
    expect(json).toEqual({
      error: 'Unknown error occurred',
      code: ExitCode.GENERAL_ERROR,
    });
  });
});

describe('handleError', () => {
  let mockExit: any; // eslint-disable-line @typescript-eslint/no-explicit-any
  let mockStderr: ReturnType<typeof vi.spyOn>;
  let mockStdout: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    mockExit = vi.spyOn(process, 'exit').mockImplementation((() => {}) as any);
    mockStderr = vi.spyOn(console, 'error').mockImplementation(() => {});
    mockStdout = vi.spyOn(console, 'log').mockImplementation(() => {});
  });

  afterEach(() => {
    mockExit.mockRestore();
    mockStderr.mockRestore();
    mockStdout.mockRestore();
  });

  it('outputs plain text to stderr when TTY', () => {
    const err = new WhoopError('auth failed', ExitCode.AUTH_ERROR, 401);
    handleError(err, true);

    expect(mockStderr).toHaveBeenCalledWith('Error: auth failed (401)');
    expect(mockStdout).not.toHaveBeenCalled();
    expect(mockExit).toHaveBeenCalledWith(ExitCode.AUTH_ERROR);
  });

  it('outputs JSON to stdout when piped (no TTY)', () => {
    const err = new WhoopError('auth failed', ExitCode.AUTH_ERROR, 401);
    handleError(err, false);

    const output = JSON.parse(mockStdout.mock.calls[0][0] as string);
    expect(output).toEqual({
      error: 'auth failed',
      code: ExitCode.AUTH_ERROR,
      status: 401,
    });
    expect(mockStderr).not.toHaveBeenCalled();
    expect(mockExit).toHaveBeenCalledWith(ExitCode.AUTH_ERROR);
  });

  it('outputs JSON for network errors when piped', () => {
    handleError(new Error('fetch failed'), false);

    const output = JSON.parse(mockStdout.mock.calls[0][0] as string);
    expect(output.error).toBe('Network connection failed');
    expect(output.code).toBe(ExitCode.NETWORK_ERROR);
  });

  it('outputs plain text for unknown errors when TTY', () => {
    handleError('something weird', true);

    expect(mockStderr).toHaveBeenCalledWith('Error: Unknown error occurred');
    expect(mockExit).toHaveBeenCalledWith(ExitCode.GENERAL_ERROR);
  });

  it('outputs JSON for unknown errors when piped', () => {
    handleError('something weird', false);

    const output = JSON.parse(mockStdout.mock.calls[0][0] as string);
    expect(output.error).toBe('Unknown error occurred');
    expect(output.code).toBe(ExitCode.GENERAL_ERROR);
  });
});
