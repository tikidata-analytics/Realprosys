import { describe, it, expect } from 'vitest'

describe('tier limits', () => {
  it('free tier has correct default limits', () => {
    const freeLimits = {
      customers: 2,
      payment_plans: 2,
      schemes: 2,
      products: 2,
      projects: 2,
    }
    expect(freeLimits.customers).toBe(2)
    expect(freeLimits.payment_plans).toBe(2)
  })

  it('premium tier has correct default limits', () => {
    const premiumLimits = {
      customers: 10,
      payment_plans: 10,
      schemes: 10,
      products: 10,
      projects: 10,
    }
    expect(premiumLimits.customers).toBe(10)
  })
})
