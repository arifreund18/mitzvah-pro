import { test, expect } from '@playwright/test'

/**
 * Minimal parity smoke: login → dashboard Eventos → seed event / create path.
 * Does NOT require BarBeni origin or /BarBeni proxy.
 */
test.describe('parity smoke', () => {
  test('login and open event studio sections', async ({ page }) => {
    await page.goto('/dashboard/login')
    await expect(page.getByRole('heading', { name: /Mitzvah/i })).toBeVisible()

    await page.getByLabel(/Email/i).fill('owner@mitzvah.pro')
    await page.getByLabel(/^Senha$/i).fill('mitzvah')
    await page.getByRole('button', { name: /Entrar/i }).click()

    await expect(page).toHaveURL(/\/dashboard\/?$/)
    await expect(page.getByRole('heading', { name: 'Eventos' })).toBeVisible()

    const seedLink = page.locator('a[href^="/dashboard/events/"]').filter({
      hasText: /Beni|Sem nome/i,
    })
    const anyEventLink = page.locator('a[href^="/dashboard/events/"]').first()
    const newEvent = page.getByRole('link', { name: /Novo evento/i })

    if (await seedLink.count()) {
      await seedLink.first().click()
    } else if (await anyEventLink.count()) {
      await anyEventLink.click()
    } else {
      await expect(newEvent).toBeVisible()
      await newEvent.click()
      await expect(page).toHaveURL(/\/dashboard\/events\/new/)
      return
    }

    await expect(page).toHaveURL(/\/dashboard\/events\/[^/]+/)
    const editSection = page.getByText('Editar seção')
    const sectionLinks = page.locator('a[href*="/sections/"]')
    await expect(editSection.or(sectionLinks.first())).toBeVisible()
  })

  test.skip('BarBeni proxy optional — not required for parity smoke', async () => {
    // Visiting /BarBeni needs BAR_BENI_ORIGIN; intentionally skipped.
  })
})
