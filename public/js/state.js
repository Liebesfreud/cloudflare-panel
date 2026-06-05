import {
  defaultDnsForm,
  defaultFirewallForm,
  defaultPageRuleForm,
  defaultSpeedForm,
} from "./constants.js";

export const state = {
  checkingSession: true,
  connectingSession: false,
  connected: false,
  sessionEmail: "",
  sessionHasServerCredentials: false,
  sessionError: "",
  mainSection: "domain",
  view: "domains",
  zoneSection: "dns",
  zones: [],
  selectedZone: null,
  analytics: null,
  analyticsRange: "7d",
  pageRules: [],
  customCertificates: [],
  universalSsl: null,
  certificateWarnings: [],
  dnsRecords: [],
  cacheSettings: null,
  cacheWarnings: [],
  firewallRules: [],
  loadingZones: true,
  loadingAnalytics: false,
  loadingPageRules: false,
  loadingCertificates: false,
  loadingDns: false,
  loadingCacheSettings: false,
  loadingFirewallRules: false,
  zoneError: "",
  analyticsError: "",
  pageRulesError: "",
  certificateError: "",
  dnsError: "",
  cacheError: "",
  firewallError: "",
  notice: "",
  dnsFormOpen: false,
  savingDns: false,
  savingCacheSettings: false,
  purgingCache: false,
  savingFirewallRule: false,
  savingPageRule: false,
  deletingFirewallRuleId: "",
  deletingPageRuleId: "",
  deletingCertificateId: "",
  updatingFirewallRuleId: "",
  updatingPageRuleId: "",
  editingFirewallRuleId: "",
  editingPageRuleId: "",
  showFirewallExamples: false,
  dnsForm: { ...defaultDnsForm },
  firewallForm: { ...defaultFirewallForm },
  pageRuleForm: { ...defaultPageRuleForm },
  speedStep: "domains",
  speedProgress: 0,
  speedDeploying: false,
  speedDomainsOpen: false,
  speedDomainDeleteId: "",
  speedNotice: "",
  speedForm: { ...defaultSpeedForm },
  speedAcceleratedDomains: [],
  automationZoneId: "",
  automationPreset: "",
  automationState: null,
  automationLoading: false,
  automationApplying: false,
  automationNotice: "",
  automationPendingKey: "",
  workersAccountId: "",
  workersAccounts: [],
  workersList: [],
  workersDomains: [],
  workersWarnings: [],
  workersLoading: false,
  workersLoaded: false,
  workersNotice: "",
  workersModal: "",
  workersActiveName: "",
  workersActiveTab: "code",
  workersActiveDetail: null,
  workersScript: "",
  workersLoadingDetail: false,
  workersSaving: false,
  workersPendingKey: "",
  workersRouteZoneId: "",
  workersRoutes: [],
  workersRoutesLoading: false,
  workersDomainZoneId: "",
  workersDeleteName: "",
  workersDeleteConfirm: "",
  developerResourceType: "",
  developerResourceAccountId: "",
  developerResourceAccounts: [],
  developerResourceItems: [],
  developerResourceLoading: false,
  developerResourceLoadedType: "",
  developerResourceNotice: "",
  developerResourceSaving: false,
  developerResourceModal: "",
  developerResourceDeleteId: "",
  developerResourceDeleteName: "",
  developerResourceDeleteConfirm: "",
  workerTemplates: [],
  workerTemplateModal: "",
  workerTemplateNotice: "",
};

export function resetSessionState() {
  state.connected = false;
  state.sessionError = "";
  state.mainSection = "domain";
  state.view = "domains";
  state.zoneSection = "dns";
  state.selectedZone = null;
  state.zones = [];
  state.analytics = null;
  state.analyticsRange = "7d";
  state.pageRules = [];
  state.customCertificates = [];
  state.universalSsl = null;
  state.certificateWarnings = [];
  state.dnsRecords = [];
  state.cacheSettings = null;
  state.cacheWarnings = [];
  state.firewallRules = [];
  resetDnsForm();
  resetFirewallForm();
  resetPageRuleForm();
  resetSpeedState();
  resetAutomationState();
  resetWorkersState();
  resetDeveloperResourcesState();
}

export function resetDnsForm() {
  state.dnsForm = { ...defaultDnsForm };
  state.dnsFormOpen = false;
}

export function resetFirewallForm() {
  state.firewallForm = { ...defaultFirewallForm };
  state.editingFirewallRuleId = "";
  state.showFirewallExamples = false;
}

export function resetPageRuleForm() {
  state.pageRuleForm = { ...defaultPageRuleForm };
  state.editingPageRuleId = "";
}

export function resetSpeedForm() {
  state.speedForm = { ...defaultSpeedForm };
  state.speedProgress = 0;
  state.speedNotice = "";
}

export function resetSpeedState() {
  resetSpeedForm();
  state.speedStep = "domains";
  state.speedDeploying = false;
  state.speedDomainsOpen = false;
  state.speedDomainDeleteId = "";
  state.speedAcceleratedDomains = [];
}

export function resetAutomationState() {
  state.automationZoneId = "";
  state.automationPreset = "";
  state.automationState = null;
  state.automationLoading = false;
  state.automationApplying = false;
  state.automationNotice = "";
  state.automationPendingKey = "";
}

export function resetWorkersState() {
  state.workersAccountId = "";
  state.workersAccounts = [];
  state.workersList = [];
  state.workersDomains = [];
  state.workersWarnings = [];
  state.workersLoading = false;
  state.workersLoaded = false;
  state.workersNotice = "";
  state.workersModal = "";
  state.workersActiveName = "";
  state.workersActiveTab = "code";
  state.workersActiveDetail = null;
  state.workersScript = "";
  state.workersLoadingDetail = false;
  state.workersSaving = false;
  state.workersPendingKey = "";
  state.workersRouteZoneId = "";
  state.workersRoutes = [];
  state.workersRoutesLoading = false;
  state.workersDomainZoneId = "";
  state.workersDeleteName = "";
  state.workersDeleteConfirm = "";
}

export function resetDeveloperResourcesState() {
  state.developerResourceType = "";
  state.developerResourceAccountId = "";
  state.developerResourceAccounts = [];
  state.developerResourceItems = [];
  state.developerResourceLoading = false;
  state.developerResourceLoadedType = "";
  state.developerResourceNotice = "";
  state.developerResourceSaving = false;
  state.developerResourceModal = "";
  state.developerResourceDeleteId = "";
  state.developerResourceDeleteName = "";
  state.developerResourceDeleteConfirm = "";
  state.workerTemplates = [];
  state.workerTemplateModal = "";
  state.workerTemplateNotice = "";
}
