/*
Central Automation v2.x
Last Updated 2.0.0
Aaron Scott (WiFi Downunder) 2025-2026
*/

// URLs
const glpAuthURL = 'https://sso.common.cloud.hpe.com/as/token.oauth2';
const glpDevAuthURL = 'https://pavo-sso.common.cloud.hpe.com/as/token.oauth2'
const glpGlobalURL = 'https://global.api.greenlake.hpe.com';
const glpDevGlobalURL = 'https://global.api.greenlake.hpe.com';

// Cluster Details
const centralURLs = 
{
	'https://au1.api.central.arubanetworks.com': 'https://app-apacsouth.central.arubanetworks.com',
	'https://in1.api.central.arubanetworks.com': 'https://app2-ap.central.arubanetworks.com',
	'https://us1.api.central.arubanetworks.com': 'https://app.central.arubanetworks.com',
	'https://us2.api.central.arubanetworks.com': 'https://app-prod2-ui.central.arubanetworks.com',
	'https://us6.api.central.arubanetworks.com': 'https://app-us-east-1.central.arubanetworks.com',
	'https://us4.api.central.arubanetworks.com': 'https://app-uswest4.central.arubanetworks.com',
	'https://us5.api.central.arubanetworks.com': 'https://app-uswest5.central.arubanetworks.com',
	'https://ca1.api.central.arubanetworks.com': 'https://app-ca.central.arubanetworks.com',
	'https://cn1.api.central.arubanetworks.com.cn': 'https://app.central.arubanetworks.com.cn',
	'https://jp1.api.central.arubanetworks.com': 'https://app-apaceast.central.arubanetworks.com',
	'https://de1.api.central.arubanetworks.com': 'https://app2-eu.central.arubanetworks.com',
	'https://de2.api.central.arubanetworks.com': 'https://app-eucentral2.central.arubanetworks.com',
	'https://de3.api.central.arubanetworks.com': 'https://app-eucentral3.central.arubanetworks.com',
	'https://de4.api.central.arubanetworks.com': 'https://app-eucentral4.central.arubanetworks.com',
	'https://ae1.api.central.arubanetworks.com': 'https://app-uaenorth1.central.arubanetworks.com',
	'https://gb1.api.central.arubanetworks.com': 'https://app-ukwest2.central.arubanetworks.com',
	'https://internal.api.central.arubanetworks.com': 'https://internal-ui.central.arubanetworks.com',
	'https://cnx-apigw-aqua.arubadev.cloud.hpe.com': 'https://app-aqua.arubadev.cloud.hpe.com',
	'https://cnx-apigw-brooke.arubadev.cloud.hpe.com': 'https://app-brooke.arubadev.cloud.hpe.com',
	//'https://apigw-cmcsa1api.aruba.b4b.comcast.net': 'https://cmcsa1.aruba.b4b.comcast.net',
	//'https://apigw-stgthdnaas.central.arubanetworks.com': 'https://app-stgthdnaas.central.arubanetworks.com',
	//COP: 'COP',
};

const centralClusters = 
{
	'US-1': {url: 'https://us1.api.central.arubanetworks.com', type: 'Public'},
	'US-2': {url: 'https://us2.api.central.arubanetworks.com', type: 'Public'},
	'US-East-1': {url: 'https://us6.api.central.arubanetworks.com', type: 'Public'},
	'US-West-4': {url: 'https://us4.api.central.arubanetworks.com', type: 'Public'},
	'US-West-5': {url: 'https://us5.api.central.arubanetworks.com', type: 'Public'},
	'AP-South': {url: 'https://in1.api.central.arubanetworks.com', type: 'Public'},
	'AP-East': {url: 'https://jp1.api.central.arubanetworks.com', type: 'Public'},
	'AP-AusNZ': {url: 'https://au1.api.central.arubanetworks.com', type: 'Public'},
	'EU-1': {url: 'https://de1.api.central.arubanetworks.com', type: 'Public'},
	'EU-2': {url: 'https://de2.api.central.arubanetworks.com', type: 'Public'},
	'EU-3': {url: 'https://de3.api.central.arubanetworks.com', type: 'Public'},
	'EU-4': {url: 'https://de3.api.central.arubanetworks.com', type: 'Public'},
	'Canada-1': {url: 'https://ca1.api.central.arubanetworks.com', type: 'Public'},
	'CN-North': {url: 'https://cn1.api.central.arubanetworks.com.cn', type: 'Public'},
	'UAE-North': {url: 'https://ae1.api.central.arubanetworks.com', type: 'Public'},
	'UK-West': {url: 'https://gb1.api.central.arubanetworks.com', type: 'Public'},
	'Internal': {url: 'https://internal.api.central.arubanetworks.com', type: 'Private'},
	'Aqua': {url: 'https://cnx-apigw-aqua.arubadev.cloud.hpe.com', type: 'Private'},
	'Brooke': {url: 'https://cnx-apigw-brooke.arubadev.cloud.hpe.com', type: 'Private'},
	//'CMCSA1': {url: 'https://apigw-cmcsa1api.aruba.b4b.comcast.net', type: 'Private'},
	//'STGTHDNAAS':{url: 'https://apigw-stgthdnaas.central.arubanetworks.com', type: 'Private'},
	'Central On-Prem': {url: 'COP', type: 'Private'},
};

const clusterNames = 
{
	'https://us1.api.central.arubanetworks.com': 'US-1',
	'https://us2.api.central.arubanetworks.com': 'US-2',
	'https://us6.api.central.arubanetworks.com': 'US-East-1',
	'https://us4.api.central.arubanetworks.com': 'US-West-4',
	'https://us5.api.central.arubanetworks.com': 'US-West-5',
	'https://in.api.central.arubanetworks.com': 'AP-South',
	'https://jp1.api.central.arubanetworks.com': 'AP-East',
	'https://au1.api.central.arubanetworks.com': 'AP-AusNZ',
	'https://de1.api.central.arubanetworks.com': 'EU-1',
	'https://de2.api.central.arubanetworks.com': 'EU-2',
	'https://de3.api.central.arubanetworks.com': 'EU-3',
	'https://de4.api.central.arubanetworks.com': 'EU-4',
	'https://ca1.api.central.arubanetworks.com': 'Canada-1',
	'https://cn1.api.central.arubanetworks.com.cn': 'CN-North',
	'https://ae1.api.central.arubanetworks.com': 'UAE-North',
	'https://gb1.api.central.arubanetworks.com': 'UK-West',
	'https://internal.api.central.arubanetworks.com': 'Internal',
	'https://cnx-apigw-aqua.arubadev.cloud.hpe.com': 'Aqua',
	'https://cnx-apigw-brooke.arubadev.cloud.hpe.com': 'Brooke',
	//'https://apigw-cmcsa1api.aruba.b4b.comcast.net': 'CMCSA1',
	//'https://apigw-stgthdnaas.central.arubanetworks.com':'STGTHDNAAS',
	//COP: 'Central On-Prem',
};

const clusterRegions = 
{
	'https://us1.api.central.arubanetworks.com': 'us-west',
	'https://us2.api.central.arubanetworks.com': 'us-west',
	'https://us6.api.central.arubanetworks.com': 'us-east',
	'https://us4.api.central.arubanetworks.com': 'us-west',
	'https://us5.api.central.arubanetworks.com': 'us-west',
	'https://in.api.central.arubanetworks.com': 'ap-south',
	'https://jp1.api.central.arubanetworks.com': 'ap-northeast',
	'https://au1.api.central.arubanetworks.com': 'ap-ausnz',
	'https://de1.api.central.arubanetworks.com': 'eu-central',
	'https://de2.api.central.arubanetworks.com': 'eu-central',
	'https://de3.api.central.arubanetworks.com': 'eu-central',
	'https://ca1.api.central.arubanetworks.com': 'ca-central',
	'https://cn.api.central.arubanetworks.com.cn': 'cn-north',
	'https://ae1.api.central.arubanetworks.com': 'mea',
	'https://gb1.api.central.arubanetworks.com': 'eu-west',
	'https://internal.api.central.arubanetworks.com': 'us-west',
	'https://cnx-apigw-aqua.arubadev.cloud.hpe.com': 'us-west',
	'https://cnx-apigw-brooke.arubadev.cloud.hpe.com': 'us-west',
	//'https://apigw-cmcsa1api.aruba.b4b.comcast.net': 'CMCSA1',
	//'https://apigw-stgthdnaas.central.arubanetworks.com':'STGTHDNAAS',
	//COP: 'Central On-Prem',
};

const keyFCO = 'fco_data';
const ratio = window.devicePixelRatio;

// API limits and delays
const apiDelay = 250;
const apiWaitDelay = 1000;
const glpAPILimit = 50;
const glpSubscriptionLimit = 50;
const glpServiceManagerLimit = 2000;
const glpDeviceLimit = 2000;
const apiListLimit = 25;
const apiSiteLimit = 100;
const apiDeviceLimit = 1000;
const apiRadioListLimit = 1000;
const apiBSSIDListLimit = 1000;
const apiClientLocationLimit = 1000;
const apiConfigDevicesLimit = 100;
const apiPersonaLimit = 50;
const apiAssignmentLimit = 10;
const apiProfileDelay = 500;

// Colours
const colorArray = ['#17c1e8', '#ea0606', '#fbcf33', '#cb0c9f', '#82d616', '#8392AB', '#67748e', '#FBE540', '#9368E9', '#DD4B39'];
const textColorArray = ['text-info', 'text-danger', 'text-warning', 'text-primary', 'text-success', 'text-secondary', 'text-body', 'text-minor', 'text-purple', 'text-series8'];
const apColors = ['#23CCEF', '#FB404B', '#FFA534', '#9368E9', '#87CB16', '#1D62F0', '#5E5E5E', '#DD4B39', '#35465c', '#e52d27', '#55acee', '#cc2127', '#1769ff', '#6188e2', '#a748ca', '#ca489f', '#48ca9a', '#95e851', '#f2f536', '#b0b0b0', '#3414b5', '#1498b5', '#b55714', '#e3e3e3', '#851919', '#196385', '#88fceb', '#cafc88'];

// Channels to Colours
var labels2 = ['1', '6', '11'];
var labels5 = ['36', '40', '44', '48', '52', '56', '60', '64', '100', '104', '108', '112', '116', '120', '124', '128', '132', '136', '140', '144', '149', '153', '157', '161', '165', '169', '173', '177'];
var labels6 = ['5', '21', '37', '53', '69', '85', '101', '117', '133', '149', '165', '181', '197', '213', '229'];

// ENUMs
const rebootReasons = {UNKNOWN: 'Unknown',
	AP_RELOAD: 'Reload',
	USER_REBOOT: 'User reboot',
	WRITE_ERASE_REBOOT: 'Write erase reboot',
	WRITE_ERASE_ALL_REBOOT: 'Write erase all reboot',
	IMAGE_SYNC_FAILED: 'Image sync failed',
	IMAGE_SYNC_SUCCESSFUL: 'Image sync successful',
	IMAGE_UPGRADE: 'Image upgrade successful',
	IMAGE_DOWNLOAD_FAILURE: 'Image download failure',
	OUT_OF_MEMORY: 'Reboot caused by out of memory',
	DOWN_UPLINK: 'Current uplink down, no useable uplink',
	CONDUCTOR_TO_LOCAL: 'Conductor transitioned to local',
	NETWORK_DISCONNECT_USB_RESET: 'Internet connection lost, reset usb modem',
	NETWORK_DISCONNECT: 'Internet connection lost',
	UNREACHABLE_GATEWAY: 'Gateway unreachable',
	FATAL_EXCEPTION: 'Reboot caused by kernel panic: fatal exception',
	FATAL_EXCEPTION_IN_INTERRUPT: 'Reboot caused by kernel panic: fatal exception in interrupt',
	SOFTLOCKUP: 'Reboot caused by kernel panic: softlockup: hung tasks',
	NTP_SYNC: 'System clock is too far ahead of ntp sync result',
	BAD_MESH_LINK: 'Mesh link bad. Rebooting mesh point by sapd',
	MESH_TO_PORTAL: 'Mesh point transitioned to portal',
	REBOOT_BY_AIRWAVE: 'Reboot by Airwave',
	AMP_COMMAND: 'Amp',
	VC_COMMAND: 'VC',
	REBOOTED_BY_CENTRAL: 'Reboot by Central',
	CLOUD_MANAGEMENT_COMMAND: 'Cloud management',
	CLI_COMMAND: 'CLI',
	CONDUCTOR_IP_FAILURE: 'Failed to get conductor-ip',
	NON_FIPS: 'Non-fips --> fips',
	FIPS: 'Fips --> non-fips',
	TOPOLOGY_CHANGE: 'Rebooting AP due to topology change: hierarchy to flat',
	AP_DISCONNECTED: 'AP disconnected from Aruba Central',
	VC_DISCONNECTED: 'Virtual controller disconnected from Aruba Central',
	COLD_HW_RESET: 'AP reboot caused by cold hw reset(power loss)',
	POWER_LOSS: 'AP rebooted due to loss power',
	THERMAL_MODE: 'Reboot due to trigger the cooldown event',
	OVERHEAT_EVENT: 'Reboot due to trigger the overheat event',
	PREEMPTED_BY_CONDUCTOR: 'Preempted by provisioned conductor'
}

const rfBand = {
	'BAND_NONE': "disabled on all bands",
	'24GHZ': "2.4GHz only",
	'5GHZ': "5GHz only",
	'6GHZ': "6GHz only",
	'24GHZ_5GHZ': "2.4GHz + 5GHz",
	'24GHZ_6GHZ': "2.4GHz + 6GHz",
	'5GHZ_6GHZ': "5GHz + 6GHz",
	'BAND_ALL': "2.4GHz + 5GHz + 6GHz"
}

const keyManagement = {
	'WPA3_SAE': "WPA3 Personal",
	'WPA3_ENTERPRISE_CCM_128': "WPA3 Enterprise (CCM-128)",
	'WPA3_ENTERPRISE_GCM_256': "WPA3 Enterprise (GCM-256)",
	'WPA3_ENTERPRISE_CNSA': "WPA3 Enterprise (CNSA)",
	'WPA2_PERSONAL': "WPA2 Personal",
	'WPA2_ENTERPRISE': "WPA2 Enterprise",
	'WPA_ENTERPRISE': "WPA Enterprise",
	'WPA2_MPSK_AES': "MPSK (AES)",
	'WPA2_MPSK_LOCAL': "MPSK (Local)",
	'ENHANCED_OPEN': "Enhanced Open",
	'OPEN': "Open",
	'WPA_PERSONAL': "WPA Personal",
	'WPA2_PSK_AES_DPP': "WPA2 Personal w/ DPP",
	'WPA2_AES_DPP': "WPA2 Enterprise w/ DPP",
	'WPA3_SAE_DPP': "WPA3 Personal w/ DPP",
	'WPA3_AES_CCM_128_DPP': "WPA3 Enterprise (CCM-128) w/ DPP",
	'WPA3_AES_GCM_256_DPP': "WPA3 Enterprise (GCM-256) w/ DPP",
	'BOTH_WPA_WPA2_PSK': "WPA/WPA2 Personal",
	'BOTH_WPA_WPA2_DOT1X': "WPA/WPA2 Enterprise",
	'STATIC_WEP': "Static WEP",
	'DYNAMIC_WEP': "Dymanic WEP",
	'WPA3_MPSK_SAE': 'Secure PSK'
}

const forwardingMode = {
	'FORWARD_MODE_BRIDGE': 'Bridge Mode',
	'FORWARD_MODE_L2': 'Tunnel Mode',
	'FORWARD_MODE_L3': 'L3 Routed/NATed Mode',
	'FORWARD_MODE_MIXED': 'Mixed Mode'
}

const ipmode = {
	'IPV4_ONLY': 'IPv4 Only',
	'IPV4_PREFER': 'Dual Stack (Prefer IPv4)'
}

const wlanType = {
	'EMPLOYEE': 'Access',
	'GUEST': 'Guest',
	'RECOVERY': 'Recovery'
}

const broadcastFilter = {
	'4': {
		'BCAST_FILTER_NONE': 'Off',
		'BCAST_FILTER_ALL': 'All',
		'BCAST_FILTER_ARP': 'ARP',
		'BCAST_FILTER_ARP_ONLY': 'ARP Only'
	},
	'6': {
		'UCAST_FILTER_RA': 'Convert RA to Unicast',
		'FILTER_NONE': 'Off'
	}
}

const meshBand = {
	'BAND_TYPE_24GHZ': '2.4GHz',
	'BAND_TYPE_5GHZ': '5GHz',
	'BAND_TYPE_6GHZ': '6GHz',
	'BAND_TYPE_ALL': 'All'
}

const personas = {
	'campus ap': 'CAMPUS_AP',
	'campus access point': 'CAMPUS_AP',
	'microbranch ap': 'MICROBRANCH_AP',
	'microbranch access point': 'MICROBRANCH_AP',
	'mobility gw': 'MOBILITY_GW',
	'mobility gateway': 'MOBILITY_GW',
	'branch gw': 'BRANCH_GW',
	'branch gateway': 'BRANCH_GW',
	'vpn concentrator': 'VPNC',
	'bridge': 'BRIDGE',
	'iot': 'IOT',
	'hybrid nac': 'HYBRID_NAC',
	'access switch': 'ACCESS_SWITCH',
	'aggregation switch': 'AGG_SWITCH',
	'core switch': 'CORE_SWITCH',
	'aos-s access switch': 'AOSS_ACCESS_SWITCH',
	'aos-s aggregation switch': 'AOSS_AGG_SWITCH',
	'aos-s core switch': 'AOSS_CORE_SWITCH'
}

const deviceFunctionDisplay = {
	'CAMPUS_AP': 'Campus AP',
	'MICROBRANCH_AP': 'Microbranch AP',
	'MOBILITY_GW': 'Mobility GW',
	'BRANCH_GW': 'Branch GW',
	'VPNC': 'VPN Concentrator',
	'BRIDGE': 'Bridge',
	'IOT': 'IoT',
	'HYBRID_NAC': 'Hybrid NAC',
	'ACCESS_SWITCH': 'Access Switch',
	'AGG_SWITCH': 'Aggregation Switch',
	'CORE_SWITCH':'Core Switch',
	'AOSS_ACCESS_SWITCH': 'AOS-S Acess Switch',
	'AOSS_AGG_SWITCH': 'AOS-S Aggregation Switch',
	'AOSS_CORE_SWITCH': 'AOS-S Core Switch'
}

const scopeDisplay = {
	'GLOBAL': 'Global',
	'SITE_COLLECTION': 'Site Collection',
	'SITE': 'Site',
	'DEVICE_COLLECTION': 'Device Group',
	'DEVICE_GROUP': 'Device Group',
	'DEVICE': 'Device'
}

const templateType = {
	'AP': 'Access Point',
	'GATEWAY': 'Gateway',
	'CX_SWITCH': 'Switch AOS-CX'
}

const templateState = {
	'DRAFT': 'Draft',
	'ENABLED': 'Enabled',
	'PENDING': 'Pending',
	'ERROR': 'Error'
}

const profileTypes = {AP:'AP', CX:'CX', AOSS:'AOSS', GW:'GATEWAY'};

const DeviceType = { AP: 0, SW: 1, GW: 2, SELECTED: 3 };

const airMatchLimit = 500;
const AirMatchInfo = { 'ON-DEMAND': 'Full AirMatch solution generation', 'INCREMENTAL': 'Rerun the optimization, only update new radios', 'OPMODE': 'Rerun the optimization to compute opmode for all APs.'}