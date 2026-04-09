import { describe, expect, it, vi } from "vitest";
import { renderHook } from "@testing-library/react";

const {
  mockListUseQuery,
  mockGetByIdUseQuery,
  mockCreateUseMutation,
  mockJoinUseMutation,
  mockInvalidate,
} = vi.hoisted(() => ({
  mockListUseQuery: vi.fn(),
  mockGetByIdUseQuery: vi.fn(),
  mockCreateUseMutation: vi.fn(),
  mockJoinUseMutation: vi.fn(),
  mockInvalidate: vi.fn(),
}));

vi.mock("../../trpc", () => ({
  trpc: {
    league: {
      list: { useQuery: mockListUseQuery },
      getById: { useQuery: mockGetByIdUseQuery },
      create: { useMutation: mockCreateUseMutation },
      join: { useMutation: mockJoinUseMutation },
    },
    useUtils: () => ({
      league: { list: { invalidate: mockInvalidate } },
    }),
  },
}));

import {
  useCreateLeague,
  useJoinLeague,
  useLeague,
  useLeagues,
} from "./use-leagues";

describe("useLeagues", () => {
  it("calls trpc.league.list.useQuery", () => {
    const expected = { data: [], isLoading: false };
    mockListUseQuery.mockReturnValue(expected);

    const { result } = renderHook(() => useLeagues());

    expect(result.current).toBe(expected);
  });
});

describe("useLeague", () => {
  it("calls trpc.league.getById.useQuery with the provided id", () => {
    const expected = { data: { id: "abc" }, isLoading: false };
    mockGetByIdUseQuery.mockReturnValue(expected);

    const { result } = renderHook(() => useLeague("abc"));

    expect(mockGetByIdUseQuery).toHaveBeenCalledWith({ id: "abc" });
    expect(result.current).toBe(expected);
  });
});

describe("useCreateLeague", () => {
  it("calls trpc.league.create.useMutation with onSuccess that invalidates list", () => {
    const mutationResult = { mutate: vi.fn(), isPending: false };
    mockCreateUseMutation.mockReturnValue(mutationResult);

    const { result } = renderHook(() => useCreateLeague());

    expect(result.current).toBe(mutationResult);
    expect(mockCreateUseMutation).toHaveBeenCalledWith(
      expect.objectContaining({
        onSuccess: expect.any(Function),
      }),
    );

    const { onSuccess } = mockCreateUseMutation.mock.calls.at(-1)[0];
    onSuccess();
    expect(mockInvalidate).toHaveBeenCalled();
  });
});

describe("useJoinLeague", () => {
  it("calls trpc.league.join.useMutation with onSuccess that invalidates list", () => {
    const mutationResult = { mutate: vi.fn(), isPending: false };
    mockJoinUseMutation.mockReturnValue(mutationResult);

    const { result } = renderHook(() => useJoinLeague());

    expect(result.current).toBe(mutationResult);
    expect(mockJoinUseMutation).toHaveBeenCalledWith(
      expect.objectContaining({
        onSuccess: expect.any(Function),
      }),
    );

    const { onSuccess } = mockJoinUseMutation.mock.calls.at(-1)[0];
    onSuccess();
    expect(mockInvalidate).toHaveBeenCalled();
  });
});
