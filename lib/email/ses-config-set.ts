import {
  CreateConfigurationSetCommand,
  GetConfigurationSetCommand,
  PutConfigurationSetReputationOptionsCommand,
  PutConfigurationSetSendingOptionsCommand,
  PutEmailIdentityConfigurationSetAttributesCommand,
} from '@aws-sdk/client-sesv2'
import { awsRegion, getSesClient } from '@/lib/email/send'
import { eventConfigurationSetName } from '@/lib/email/ses-naming'

export { eventConfigurationSetName }

/**
 * IAM necessário para provisionamento (documentado em docs/SES.md):
 * - ses:CreateEmailIdentity
 * - ses:GetEmailIdentity
 * - ses:TagResource
 * - ses:CreateConfigurationSet
 * - ses:GetConfigurationSet
 * - ses:PutConfigurationSetReputationOptions
 * - ses:PutConfigurationSetSendingOptions
 * - ses:PutEmailIdentityConfigurationSetAttributes
 *
 * Envio: ses:SendEmail, ses:SendRawEmail
 */

export type ConfigurationSetStatus = {
  name: string
  exists: boolean
  sendingEnabled: boolean
  reputationMetricsEnabled: boolean
  error?: string
}

async function getConfigurationSetStatus(name: string): Promise<ConfigurationSetStatus> {
  const client = getSesClient()
  if (!client) {
    return {
      name,
      exists: false,
      sendingEnabled: false,
      reputationMetricsEnabled: false,
      error: 'AWS credentials ausentes',
    }
  }
  try {
    const out = await client.send(new GetConfigurationSetCommand({ ConfigurationSetName: name }))
    return {
      name,
      exists: true,
      sendingEnabled: out.SendingOptions?.SendingEnabled !== false,
      reputationMetricsEnabled: Boolean(out.ReputationOptions?.ReputationMetricsEnabled),
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Falha ao ler configuration set'
    if (/not found|NotFound|does not exist/i.test(message)) {
      return { name, exists: false, sendingEnabled: false, reputationMetricsEnabled: false }
    }
    return {
      name,
      exists: false,
      sendingEnabled: false,
      reputationMetricsEnabled: false,
      error: message,
    }
  }
}

/**
 * Ensure per-event configuration set exists with reputation metrics on and sending enabled.
 */
export async function ensureEventConfigurationSet(slug: string): Promise<ConfigurationSetStatus> {
  const name = eventConfigurationSetName(slug)
  const client = getSesClient()
  if (!client) {
    return {
      name,
      exists: false,
      sendingEnabled: false,
      reputationMetricsEnabled: false,
      error: 'AWS credentials ausentes',
    }
  }

  const existing = await getConfigurationSetStatus(name)
  if (existing.exists) {
    // Ensure reputation metrics stay enabled.
    if (!existing.reputationMetricsEnabled) {
      try {
        await client.send(
          new PutConfigurationSetReputationOptionsCommand({
            ConfigurationSetName: name,
            ReputationMetricsEnabled: true,
          }),
        )
        existing.reputationMetricsEnabled = true
      } catch (error) {
        existing.error =
          error instanceof Error ? error.message : 'Falha ao habilitar métricas de reputação'
      }
    }
    return existing
  }

  try {
    await client.send(
      new CreateConfigurationSetCommand({
        ConfigurationSetName: name,
        ReputationOptions: { ReputationMetricsEnabled: true },
        SendingOptions: { SendingEnabled: true },
        Tags: [
          { Key: 'app', Value: 'mitzvah-pro' },
          { Key: 'slug', Value: slug.slice(0, 128) },
          { Key: 'region', Value: awsRegion() },
        ],
      }),
    )
    return {
      name,
      exists: true,
      sendingEnabled: true,
      reputationMetricsEnabled: true,
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Falha ao criar configuration set'
    if (/already exists|AlreadyExists/i.test(message)) {
      return getConfigurationSetStatus(name)
    }
    return {
      name,
      exists: false,
      sendingEnabled: false,
      reputationMetricsEnabled: false,
      error: message,
    }
  }
}

/** Attach the configuration set as default for a domain identity (optional; SendEmail also passes it). */
export async function attachConfigurationSetToIdentity(
  identity: string,
  configurationSetName: string,
): Promise<void> {
  const client = getSesClient()
  if (!client) throw new Error('AWS credentials ausentes')
  await client.send(
    new PutEmailIdentityConfigurationSetAttributesCommand({
      EmailIdentity: identity,
      ConfigurationSetName: configurationSetName,
    }),
  )
}

/**
 * Pause or resume sending for an event via its configuration set.
 * SendingEnabled=false blocks all SendEmail that use this ConfigurationSetName.
 */
export async function setEventSendingEnabled(
  slug: string,
  enabled: boolean,
): Promise<ConfigurationSetStatus> {
  const name = eventConfigurationSetName(slug)
  const client = getSesClient()
  if (!client) {
    return {
      name,
      exists: false,
      sendingEnabled: false,
      reputationMetricsEnabled: false,
      error: 'AWS credentials ausentes',
    }
  }

  const ensured = await ensureEventConfigurationSet(slug)
  if (!ensured.exists) return ensured

  try {
    await client.send(
      new PutConfigurationSetSendingOptionsCommand({
        ConfigurationSetName: name,
        SendingEnabled: enabled,
      }),
    )
    return {
      ...ensured,
      sendingEnabled: enabled,
      error: undefined,
    }
  } catch (error) {
    return {
      ...ensured,
      error: error instanceof Error ? error.message : 'Falha ao atualizar SendingEnabled',
    }
  }
}

/** Convenience: pause outbound mail for one event (reputation / abuse control). */
export async function pauseEventSending(slug: string): Promise<ConfigurationSetStatus> {
  return setEventSendingEnabled(slug, false)
}

/** Convenience: re-enable outbound mail for one event. */
export async function resumeEventSending(slug: string): Promise<ConfigurationSetStatus> {
  return setEventSendingEnabled(slug, true)
}
