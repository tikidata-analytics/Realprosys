// Vitest test setup
import { vi } from 'vitest'

// Mock Next.js modules if needed
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn() }),
  useParams: () => ({ id: 'test-id' }),
}))

// Global test timeout
vi.setConfig({ testTimeout: 10_000 })
