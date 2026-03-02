import { describe, it, expect, vi } from 'vitest';
import { WhoopError, ExitCode, handleError } from '../errors.js';

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

describe('handleError', () => {
  it('exits with WhoopError code', () => {
    const mockExit = vi.spyOn(process, 'exit').mockImplementation(() => undefined as never);
    const mockError = vi.spyOn(console, 'error').mockImplementation(() => {});

    const err = new WhoopError('auth failed', ExitCode.AUTH_ERROR, 401);
    handleError(err);

    expect(mockError).toHaveBeenCalledWith('Error: auth failed (401)');
    expect(mockExit).toHaveBeenCalledWith(ExitCode.AUTH_ERROR);

    mockExit.mockRestore();
    mockError.mockRestore();
  });

  it('exits with NETWORK_ERROR for fetch failures', () => {
    const mockExit = vi.spyOn(process, 'exit').mockImplementation(() => undefined as never);
    const mockError = vi.spyOn(console, 'error').mockImplementation(() => {});

    handleError(new Error('fetch failed'));

    expect(mockError).toHaveBeenCalledWith('Error: Network connection failed');
    expect(mockExit).toHaveBeenCalledWith(ExitCode.NETWORK_ERROR);

    mockExit.mockRestore();
    mockError.mockRestore();
  });

  it('exits with GENERAL_ERROR for unknown errors', () => {
    const mockExit = vi.spyOn(process, 'exit').mockImplementation(() => undefined as never);
    const mockError = vi.spyOn(console, 'error').mockImplementation(() => {});

    handleError('something weird');

    expect(mockError).toHaveBeenCalledWith('Error: Unknown error occurred');
    expect(mockExit).toHaveBeenCalledWith(ExitCode.GENERAL_ERROR);

    mockExit.mockRestore();
    mockError.mockRestore();
  });
});
