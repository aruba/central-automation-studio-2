/*
Central Automation v2.x
Last Updated 2.8.0
Aaron Scott (WiFi Downunder) 2025-2026
*/

var profilePromise;
var profileNotification;

var userAdminProfiles = [];
var sysAdminProfiles = [];
var apSysProfiles = [];
var gwSysProfiles = [];
var rfProfiles = [];
var wlanProfiles = [];
var l2VLANProfiles = [];
var interfaceVLANProfiles = [];
var interfaceMgmtProfiles = [];
var namedVLANProfiles = [];
var authServerGroupProfiles = [];
var authServerProfiles = [];
var aaaProfiles = [];
var dot1xProfiles = [];
var macAuthProfiles = [];
var captivePortalProfiles = [];
var ntpProfiles = [];
var dnsProfiles = [];
var gwSTPProfiles = [];
var uplinkProfiles = [];
var apPortProfiles = [];
var gwPortProfiles = [];
var portChannelProfiles = [];
var interfaceProfiles = [];
var staticRouteProfiles = [];
var ipmProfiles = [];
var proxyProfiles = [];
var syslogProfiles = [];
var snmpProfiles = [];
var arcProfiles = [];
var certProfiles = [];
var gwCertProfiles = [];
var widsProfiles = [];
var rtlsProfiles = [];
var greProfiles = [];
var mpskProfiles = [];
var gcisProfiles = [];
var clusterProfiles = [];


const profileList = {
	'ap-system': { endpoint: '/network-config/v1/ap-system'},
	'gw-system': { endpoint: '/network-config/v1/gw-system'},
	'radios': {endpoint: '/network-config/v1/radios'},
	'wlan-ssids': {endpoint: '/network-config/v1/wlan-ssids'},
	'layer2-vlan': {endpoint: '/network-config/v1/layer2-vlan'},
	'vlan-interfaces': {endpoint: '/network-config/v1/vlan-interfaces'},
	'mgmt-interfaces': {endpoint: '/network-config/v1/mgmt-interfaces'},
	'named-vlan': {endpoint: '/network-config/v1/named-vlan'},
	'auth-servers': {endpoint: '/network-config/v1/auth-servers'},
	'server-groups': {endpoint: '/network-config/v1/server-groups'},
	'aaa-profile': {endpoint: '/network-config/v1/aaa-profile'},
	'dot1xauth': {endpoint: '/network-config/v1/dot1xauth'},
	'macauth': {endpoint: '/network-config/v1/macauth'},
	'captive-portal': {endpoint: '/network-config/v1/captive-portal'},
	'mpsk-local': {endpoint: '/network-config/v1/mpsk-local'},
	'ntp': {endpoint: '/network-config/v1/ntp'},
	'dns': {endpoint: '/network-config/v1/dns'},
	'stp-gw': {endpoint: '/network-config/v1/stp-gw'},
	'ap-uplinks': {endpoint: '/network-config/v1/ap-uplinks'},
	'ap-port-profiles': {endpoint: '/network-config/v1/ap-port-profiles'},
	'gw-port-profiles': {endpoint: '/network-config/v1/gw-port-profiles'},
	'portchannels': {endpoint: '/network-config/v1/portchannels'},
	'interface-profiles': {endpoint: '/network-config/v1/interface-profiles'},
	'static-route': {endpoint: '/network-config/v1/static-route'},
	'ipm': {endpoint: '/network-config/v1/ipm'},
	'http-proxy-servers': {endpoint: '/network-config/v1/http-proxy-servers'},
	'logging': {endpoint: '/network-config/v1/logging'},
	'snmp': {endpoint: '/network-config/v1/snmp'},
	'arc': {endpoint: '/network-config/v1/arc'},
	'certificate-usage': {endpoint: '/network-config/v1/certificate-usage'},
	'gw-certificate-usage': {endpoint: '/network-config/v1/gw-certificate-usage'},
	'ids': {endpoint: '/network-config/v1/ids'},
	'location': {endpoint: '/network-config/v1/location'},
	'tunnel': {endpoint: '/network-config/v1/tunnel'},
	'management-users': {endpoint: '/network-config/v1/management-users'},
	'local-management': {endpoint: '/network-config/v1/local-management'},
	'gw-cluster-intent-config': {endpoint: '/network-config/v1/gw-cluster-intent-config'},
	'gateway-clusters': {endpoint: '/network-config/v1/gateway-clusters'},
}

var profileCounter = Object.keys(profileList).length;
var profileCompleted = 0;



/*  -------------------------------------------------------------------------------------------------------------------------------------------------------------------------
	Get Information
------------------------------------------------------------------------------------------------------------------------------------------------------------------------- */
function populateUIChoices() {
	// Placeholder function. Override if requried.
}

function updateProfiles(profileType) {
	profilePromise = new Promise(function(resolve) { profileResolve = resolve; });
	authenticateWithCentral().then(function() {
		if (profileNotification) profileNotification.close();
		profileNotification = showProgressNotification('ca-document-copy', 'Obtaining configuration profiles...', 'bottom', 'center', 'info');
		profileCompleted = 0;
		
		if (profileType === 'CAMPUS_AP') {
			profileCounter = 23;
			
			apSysProfiles = [];
			userAdminProfiles = []
			sysAdminProfiles = []
			rfProfiles = [];
			wlanProfiles = [];
			ntpProfiles = [];
			uplinkProfiles = [];
			apPortProfiles = [];
			ipmProfiles = [];
			proxyProfiles = [];
			syslogProfiles = [];
			snmpProfiles = [];
			arcProfiles = [];
			certProfiles = [];
			widsProfiles = [];
			rtlsProfiles = [];
			greProfiles = [];
			interfaceProfiles = [];
			namedVLANProfiles = [];
			authServerGroupProfiles = [];
			authServerProfiles = [];
			captivePortalProfiles = [];
			mpskProfiles = [];
			
			getAPSystemProfiles(0);
			setTimeout(getRFProfiles,250,0);
			setTimeout(getWLANProfiles,500,0);
			setTimeout(getNTPProfiles,750,0);
			setTimeout(getUplinkProfiles,1000,0);
			setTimeout(getAPPortProfiles,1250,0);
			setTimeout(getIPMProfiles,1500,0);
			setTimeout(getProxyProfiles,1750,0);
			setTimeout(getSyslogProfiles,2000,0);
			setTimeout(getSNMPProfiles,2250,0);
			setTimeout(getARCProfiles,2500,0);
			setTimeout(getCertProfiles,2750,0);
			setTimeout(getWIDSProfiles,3000,0);
			setTimeout(getRTLSProfiles,3250,0);
			setTimeout(getGREProfiles,3500,0);
			setTimeout(getSysAdminProfiles,3750,0);
			setTimeout(getUserAdminProfiles,4000,0);
			setTimeout(getInterfaceProfiles,4250,0);
			setTimeout(getNamedVLANProfiles,4500,0);
			setTimeout(getAuthServerGroupProfiles,4750,0);
			setTimeout(getAuthServerProfiles,5000,0);
			setTimeout(getCaptivePortalProfiles,5250,0);
			setTimeout(getMPSKProfiles,5500,0);
		} else if (profileType === 'MOBILITY_GW') {
			profileCounter = 28;
			
			gwSysProfiles = [];
			userAdminProfiles = [];
			sysAdminProfiles = [];
			l2VLANProfiles = [];
			interfaceVLANProfiles = [];
			interfaceMgmtProfiles = [];
			namedVLANProfiles = [];
			gwPortProfiles = [];
			interfaceProfiles = [];
			portChannelProfiles = [];
			staticRouteProfiles = [];
			authServerGroupProfiles = [];
			authServerProfiles = [];
			aaaProfiles = [];
			dot1xProfiles = [];
			macAuthProfiles = [];
			captivePortalProfiles = [];
			ntpProfiles = [];
			dnsProfiles = [];
			gwSTPProfiles = [];
			proxyProfiles = [];
			syslogProfiles = [];
			snmpProfiles = [];
			arcProfiles = [];
			gwCertProfiles = [];
			greProfiles = [];
			gcisProfiles = [];
			clusterProfiles = [];
			
			getGWSystemProfiles(0);
			setTimeout(getSysAdminProfiles,250,0);
			setTimeout(getUserAdminProfiles,500,0);
			setTimeout(getL2VLANProfiles,750,0);
			setTimeout(getInterfaceVLANProfiles,1000,0);
			setTimeout(getInterfaceMgmtProfiles,1250,0);
			setTimeout(getNamedVLANProfiles,1500,0);
			setTimeout(getGWPortProfiles,1750,0);
			setTimeout(getInterfaceProfiles,2000,0);
			setTimeout(getPortChannelProfiles,2250,0);
			setTimeout(getAuthServerGroupProfiles,2500,0);
			setTimeout(getAuthServerProfiles,2750,0);
			setTimeout(getAAAProfiles,3000,0);
			setTimeout(getCaptivePortalProfiles,3250,0);
			setTimeout(getNTPProfiles,3500,0);
			setTimeout(getDNSProfiles,3750,0);
			setTimeout(getGWSTPProfiles,4000,0);
			setTimeout(getProxyProfiles,4250,0);
			setTimeout(getSyslogProfiles,4500,0);
			setTimeout(getSNMPProfiles,4750,0);
			setTimeout(getARCProfiles,5000,0);
			setTimeout(getGWCertProfiles,5250,0);
			setTimeout(getGREProfiles,5500,0);
			setTimeout(getGCISProfiles,5750,0);
			setTimeout(getClusterProfiles,6000,0);
			setTimeout(getStaticRouteProfiles,6250,0);
			setTimeout(getDot1XProfiles,6500,0);
			setTimeout(getMacAuthProfiles,6750,0);
		} else {
			// Unsupported device function (e.g. switches) - resolve immediately so callers don't hang.
			if (profileNotification) profileNotification.close();
			profileResolve();
		}
	});
	return profilePromise;
}

/*  -------------------------------------------------------------------------------------------------------------------------------------------------------------------------
	Get Profiles - Shared Fetcher
------------------------------------------------------------------------------------------------------------------------------------------------------------------------- */

// Generic paginated profile fetch used by every getXProfiles() wrapper below.
function fetchProfileData(profileKey, responseKey, getArray, setArray, errorLabel, offset) {
	let command = profileList[profileKey]['endpoint'] + '?detailed=true&encrypted_secrets=false';

	fetchProxyWithAuth('/tools/getCommandwHeaders', {
		url: localStorage.getItem('base_url') + command,
		access_token: localStorage.getItem('access_token'),
	}).then(function(commandResults) {
		if (commandResults.hasOwnProperty('headers')) {
			//updateAPILimits(JSON.parse(commandResults.headers));
		}
		// Process The status code of the result
		let result = processStatus(commandResults);
		// will return the status code to trigger next step
		if (result == 429) {
			// Over API threshold limit. Wait apiWaitDelay value and try again.
			setTimeout(fetchProfileData, apiWaitDelay, profileKey, responseKey, getArray, setArray, errorLabel, offset);
		} else if (result !== 200) {
			logError(errorLabel);
		} else {
			let response = JSON.parse(commandResults.responseBody);
			if (response[responseKey]) setArray(getArray().concat(response[responseKey]));

			offset = response.offset;
			if (offset) {
				fetchProfileData(profileKey, responseKey, getArray, setArray, errorLabel, offset);
			} else {
				profileCompleted++;

				let getProgress = (profileCompleted / profileCounter) * 100;
				profileNotification.update({ progress: getProgress });
				if ((getProgress >= 100) && profileNotification) {
					populateUIChoices();
					profileNotification.update({ progress: 100, type: 'success', message: 'Retrieved configuration profiles' });
					setTimeout(profileNotification.close, 500);
					profileResolve();
				}
			}
		}
	});
}

/*  -------------------------------------------------------------------------------------------------------------------------------------------------------------------------
	Get Profiles - System
------------------------------------------------------------------------------------------------------------------------------------------------------------------------- */

function getUserAdminProfiles(offset) {
	fetchProfileData('management-users', 'user', () => userAdminProfiles, (arr) => { userAdminProfiles = arr; }, 'Failed to retrieve User Administration Profiles', offset);
}

function getSysAdminProfiles(offset) {
	fetchProfileData('local-management', 'profile', () => sysAdminProfiles, (arr) => { sysAdminProfiles = arr; }, 'Failed to retrieve System Administration Profiles', offset);
}

function getAPSystemProfiles(offset) {
	fetchProfileData('ap-system', 'profile', () => apSysProfiles, (arr) => { apSysProfiles = arr; }, 'Failed to retrieve AP System Profiles', offset);
}

function getGWSystemProfiles(offset) {
	fetchProfileData('gw-system', 'profile', () => gwSysProfiles, (arr) => { gwSysProfiles = arr; }, 'Failed to retrieve GW System Profiles', offset);
}

function getNTPProfiles(offset) {
	fetchProfileData('ntp', 'profile', () => ntpProfiles, (arr) => { ntpProfiles = arr; }, 'Failed to retrieve NTP Profiles', offset);
}

function getDNSProfiles(offset) {
	fetchProfileData('dns', 'profile', () => dnsProfiles, (arr) => { dnsProfiles = arr; }, 'Failed to retrieve DNS Profiles', offset);
}

function getIPMProfiles(offset) {
	fetchProfileData('ipm', 'profile', () => ipmProfiles, (arr) => { ipmProfiles = arr; }, 'Failed to retrieve IPM Profiles', offset);
}

function getProxyProfiles(offset) {
	fetchProfileData('http-proxy-servers', 'profile', () => proxyProfiles, (arr) => { proxyProfiles = arr; }, 'Failed to retrieve Proxy Profiles', offset);
}

function getSyslogProfiles(offset) {
	fetchProfileData('logging', 'profile', () => syslogProfiles, (arr) => { syslogProfiles = arr; }, 'Failed to retrieve Syslog Profiles', offset);
}

function getSNMPProfiles(offset) {
	fetchProfileData('snmp', 'profile', () => snmpProfiles, (arr) => { snmpProfiles = arr; }, 'Failed to retrieve SNMP Profiles', offset);
}

/*  -------------------------------------------------------------------------------------------------------------------------------------------------------------------------
	Get Profiles - WLAN
------------------------------------------------------------------------------------------------------------------------------------------------------------------------- */

function getRFProfiles(offset) {
	fetchProfileData('radios', 'profile', () => rfProfiles, (arr) => { rfProfiles = arr; }, 'Failed to retrieve RF System Profiles', offset);
}

function getWLANProfiles(offset) {
	fetchProfileData('wlan-ssids', 'wlan-ssid', () => wlanProfiles, (arr) => { wlanProfiles = arr; }, 'Failed to retrieve WLAN Profiles', offset);
}

function getWIDSProfiles(offset) {
	fetchProfileData('ids', 'profile', () => widsProfiles, (arr) => { widsProfiles = arr; }, 'Failed to retrieve WIDS Profiles', offset);
}

function getRTLSProfiles(offset) {
	fetchProfileData('location', 'profile', () => rtlsProfiles, (arr) => { rtlsProfiles = arr; }, 'Failed to retrieve RTLS Profiles', offset);
}

function getMPSKProfiles(offset) {
	fetchProfileData('mpsk-local', 'profile', () => mpskProfiles, (arr) => { mpskProfiles = arr; }, 'Failed to retrieve MPSK Local profiles', offset);
}

/*  -------------------------------------------------------------------------------------------------------------------------------------------------------------------------
	Get Profiles - Interfaces
------------------------------------------------------------------------------------------------------------------------------------------------------------------------- */

function getUplinkProfiles(offset) {
	fetchProfileData('ap-uplinks', 'profile', () => uplinkProfiles, (arr) => { uplinkProfiles = arr; }, 'Failed to retrieve AP Uplink Profiles', offset);
}

function getAPPortProfiles(offset) {
	fetchProfileData('ap-port-profiles', 'profile', () => apPortProfiles, (arr) => { apPortProfiles = arr; }, 'Failed to retrieve AP Downlink Profiles', offset);
}

function getGWPortProfiles(offset) {
	fetchProfileData('gw-port-profiles', 'profile', () => gwPortProfiles, (arr) => { gwPortProfiles = arr; }, 'Failed to retrieve GW Port Profiles', offset);
}

function getGREProfiles(offset) {
	fetchProfileData('tunnel', 'interface', () => greProfiles, (arr) => { greProfiles = arr; }, 'Failed to retrieve GRE Tunnels Profiles', offset);
}

function getInterfaceProfiles(offset) {
	fetchProfileData('interface-profiles', 'interface-profile', () => interfaceProfiles, (arr) => { interfaceProfiles = arr; }, 'Failed to retrieve Interface Profiles', offset);
}

function getL2VLANProfiles(offset) {
	fetchProfileData('layer2-vlan', 'l2-vlan', () => l2VLANProfiles, (arr) => { l2VLANProfiles = arr; }, 'Failed to retrieve VLAN Profiles', offset);
}

function getInterfaceVLANProfiles(offset) {
	fetchProfileData('vlan-interfaces', 'interface', () => interfaceVLANProfiles, (arr) => { interfaceVLANProfiles = arr; }, 'Failed to retrieve Interface VLAN Profiles', offset);
}

function getInterfaceMgmtProfiles(offset) {
	fetchProfileData('mgmt-interfaces', 'profile', () => interfaceMgmtProfiles, (arr) => { interfaceMgmtProfiles = arr; }, 'Failed to retrieve Interface Mgmt Profiles', offset);
}

function getPortChannelProfiles(offset) {
	fetchProfileData('portchannels', 'interface', () => portChannelProfiles, (arr) => { portChannelProfiles = arr; }, 'Failed to retrieve Port Channel Profiles', offset);
}

function getNamedVLANProfiles(offset) {
	fetchProfileData('named-vlan', 'profile', () => namedVLANProfiles, (arr) => { namedVLANProfiles = arr; }, 'Failed to retrieve Named VLAN profiles', offset);
}

function getGWSTPProfiles(offset) {
	fetchProfileData('stp-gw', 'profile', () => gwSTPProfiles, (arr) => { gwSTPProfiles = arr; }, 'Failed to retrieve GW STP Profiles', offset);
}

/*  -------------------------------------------------------------------------------------------------------------------------------------------------------------------------
	Get Profiles - Routing
------------------------------------------------------------------------------------------------------------------------------------------------------------------------- */
function getStaticRouteProfiles(offset) {
	fetchProfileData('static-route', 'profile', () => staticRouteProfiles, (arr) => { staticRouteProfiles = arr; }, 'Failed to retrieve Static Route Profiles', offset);
}

/*  -------------------------------------------------------------------------------------------------------------------------------------------------------------------------
	Get Profiles - ARC
------------------------------------------------------------------------------------------------------------------------------------------------------------------------- */
function getARCProfiles(offset) {
	fetchProfileData('arc', 'profile', () => arcProfiles, (arr) => { arcProfiles = arr; }, 'Failed to retrieve ARC Profiles', offset);
}

/*  -------------------------------------------------------------------------------------------------------------------------------------------------------------------------
	Get Profiles - Security
------------------------------------------------------------------------------------------------------------------------------------------------------------------------- */
function getCertProfiles(offset) {
	fetchProfileData('certificate-usage', 'profile', () => certProfiles, (arr) => { certProfiles = arr; }, 'Failed to retrieve AP Cert Usage Profiles', offset);
}

function getGWCertProfiles(offset) {
	fetchProfileData('gw-certificate-usage', 'profile', () => gwCertProfiles, (arr) => { gwCertProfiles = arr; }, 'Failed to retrieve GW Cert Usage Profiles', offset);
}

function getAuthServerProfiles(offset) {
	fetchProfileData('auth-servers', 'auth-server', () => authServerProfiles, (arr) => { authServerProfiles = arr; }, 'Failed to retrieve Auth Server profiles', offset);
}

function getAuthServerGroupProfiles(offset) {
	fetchProfileData('server-groups', 'server-group', () => authServerGroupProfiles, (arr) => { authServerGroupProfiles = arr; }, 'Failed to retrieve Auth Server Groups', offset);
}

function getAAAProfiles(offset) {
	fetchProfileData('aaa-profile', 'profile', () => aaaProfiles, (arr) => { aaaProfiles = arr; }, 'Failed to retrieve AAA Servers', offset);
}

function getDot1XProfiles(offset) {
	fetchProfileData('dot1xauth', 'profile', () => dot1xProfiles, (arr) => { dot1xProfiles = arr; }, 'Failed to retrieve Dot1X Authentication Profiles', offset);
}

function getMacAuthProfiles(offset) {
	fetchProfileData('macauth', 'profile', () => macAuthProfiles, (arr) => { macAuthProfiles = arr; }, 'Failed to retrieve MAC Authentication Profiles', offset);
}

function getCaptivePortalProfiles(offset) {
	fetchProfileData('captive-portal', 'profile', () => captivePortalProfiles, (arr) => { captivePortalProfiles = arr; }, 'Failed to retrieve Captive Portal profiles', offset);
}

/*  -------------------------------------------------------------------------------------------------------------------------------------------------------------------------
	Get Profiles - Redundancy
------------------------------------------------------------------------------------------------------------------------------------------------------------------------- */
function getGCISProfiles(offset) {
	fetchProfileData('gw-cluster-intent-config', 'profile', () => gcisProfiles, (arr) => { gcisProfiles = arr; }, 'Failed to retrieve GCIS Profiles', offset);
}

function getClusterProfiles(offset) {
	fetchProfileData('gateway-clusters', 'profile', () => clusterProfiles, (arr) => { clusterProfiles = arr; }, 'Failed to retrieve Cluster Profiles', offset);
}
