export type GlobalProviderOverride = {
  /** Provider name (as returned by the LLM providers API) this override applies to. */
  providerName: string;
  /** Key of the global, non-secret config_parameter set on the Settings page. */
  settingKey: string;
  /** Key inside that provider's per-job provider_parameters this override forces on. */
  providerParameterKey: string;
};

/**
 * Global, per-user config_parameters that force a boolean provider_parameters
 * field on for every job of that provider, regardless of what's set on the
 * job creation form (e.g. "Force ZDR" overriding the per-job ZDR toggle).
 *
 * To add a new one: add an entry here, then add a matching `useConfig(...)`
 * call for its `settingKey` where `useGlobalProviderOverrideKeys` is used.
 */
export const GLOBAL_PROVIDER_OVERRIDES: GlobalProviderOverride[] = [
  {
    providerName: "openrouter",
    settingKey: "openrouter_force_zdr",
    providerParameterKey: "zdr",
  },
];
