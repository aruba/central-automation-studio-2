/*
Central Automation v2.x
Last Updated 2.0.0
Aaron Scott (WiFi Downunder) 2025-2026
*/

var apList;

var radioNotification;
var radioDetails = [];
var bssidDetails = {};

var loadWLANData = false;
var loadRadioData = false;
var loadBSSIDData = false;

var wlanCoverage;

var wlanThroughputChart;
var wlanTrendCache = {};
var wlanTrendCacheTTLms = 5 * 60 * 1000;

var wlanClientChart;
var wlanClientTrendCache = {};
var wlanClientTrendCacheTTLms = 5 * 60 * 1000;

var siteWLANDetailsCache = {};
var siteWLANDetailsCacheTTLms = 5 * 60 * 1000;

var wlanMap = null;
var wlanMapInitialized = false;
var wlanMapClusterGroup = null;


function refreshAPData() {
	localStorage.removeItem('monitoring_ap_update')
	authenticateWithCentral().then(function() {
		Promise.all([getSiteData(0), getAPDeviceData(1), getBSSIDs(1), getWLANs(1), getRadios(0)]).then(function() {
			processWLANs();
		})
	});
}

function loadCurrentPageAP() {
	loadWLANData = false;
	loadRadioData = false;
	loadBSSIDData = false;
	loadDataFromDB('monitoring_radios');
	loadDataFromDB('monitoring_wlan_details');
	loadDataFromDB('monitoring_bssid_details');
}

function loadSavedData(indexKey, data) {
	if (indexKey === 'monitoring_radios') {
		radioDetails = JSON.parse(data);
		if (radioDetails && localStorage.getItem('monitoring_radios_update')) {
			var lastRefresh = new Date(parseInt(localStorage.getItem('monitoring_radios_update')));
			var now = new Date();
			var diffTime = Math.abs(now - lastRefresh);
			var diffMinutes = Math.ceil(diffTime / (1000 * 60));
			if (diffMinutes > 30) {
				authenticateWithCentral().then(function() {
					getRadios(1).then(function() {
						radioDetails = getRadioList();
						loadRadioData = true;
						processWLANs();
					});
				});
			} else {
				loadRadioData = true;
				processWLANs();
			}
		} else {
			authenticateWithCentral().then(function() {
				getRadios(1).then(function() {
					radioDetails = getRadioList();
					loadRadioData = true;
					processWLANs();
				});
			});
		}
	} else if (indexKey === 'monitoring_wlan_details') {
		wlanDetails = JSON.parse(data);
		apList = getAPs();
		updateWLANSelectorChoices();
		if (wlanDetails && localStorage.getItem('monitoring_wlan_update')) {
			var lastRefresh = new Date(parseInt(localStorage.getItem('monitoring_wlan_update')));
			var now = new Date();
			var diffTime = Math.abs(now - lastRefresh);
			var diffMinutes = Math.ceil(diffTime / (1000 * 60));
			if (diffMinutes > 30) {
				authenticateWithCentral().then(function() {
					getWLANs(1);
				});
			} else {
				loadWLANData = true;
				processWLANs();
			}
		} else {
			authenticateWithCentral().then(function() {
				getWLANs(1);
			});
		}
	} else if (indexKey === 'monitoring_bssid_details') {
		bssidDetails = JSON.parse(data);
		apList = getAPs();
		if (bssidDetails && localStorage.getItem('monitoring_bssid_update')) {
			var lastRefresh = new Date(parseInt(localStorage.getItem('monitoring_bssid_update')));
			var now = new Date();
			var diffTime = Math.abs(now - lastRefresh);
			var diffMinutes = Math.ceil(diffTime / (1000 * 60));
			if (diffMinutes > 30) {
				authenticateWithCentral().then(function() {
					getBSSIDs(1).then(function() {
						bssidDetails = getBSSIDList();
						loadBSSIDData = true;
						processRadios();
					});
				});
			} else {
				loadBSSIDData = true;
				processWLANs();
			}
		} else {
			authenticateWithCentral().then(function() {
				getBSSIDs(1).then(function() {
					bssidDetails = getBSSIDList();
					loadBSSIDData = true;
					processWLANs();
				});
			});
		}
	}
}

function processStats() {
	processWLANs();
	//processRadios();
}

function processWLANs() {
	var updateDate = new Date(Math.max(
		parseInt(localStorage.getItem('monitoring_radios_update')) || 0,
		parseInt(localStorage.getItem('monitoring_wlan_update')) || 0,
		parseInt(localStorage.getItem('monitoring_bssid_update')) || 0
	));
	if (document.getElementById('lastUpdateDate')) document.getElementById('lastUpdateDate').innerHTML = moment(updateDate).format("Do MMMM YYYY, h:mm:ss a");
	
	let wlanChoices = getWLANSimpleSelector();
	let selectedWLAN = wlanChoices.getValue(true);
	
	let siteChoices = getSiteSelector();
	let selectedSite = siteChoices.getValue(true);
	
	/*console.log(wlanDetails);
	console.log(bssidDetails);
	console.log(radioDetails);
	console.log(aps);
	console.log(sites)*/
	
	loadWLANDetailsPanel(selectedWLAN, selectedSite);
	
	wlanCoverage = getWLANCoverageStats(selectedWLAN, selectedSite);
	//console.log(wlanCoverage);
	
	if (document.getElementById('wlan_site_count')) document.getElementById('wlan_site_count').innerHTML = wlanCoverage.siteCount + " / " +wlanCoverage.totalSiteCount;
	if (document.getElementById('wlan_ap_count')) document.getElementById('wlan_ap_count').innerHTML = wlanCoverage.apCount + " / " +wlanCoverage.totalAPCount;
	if (document.getElementById('two_count')) document.getElementById('two_count').innerHTML = wlanCoverage.band24.advertised + " / " +wlanCoverage.band24.total;
	if (document.getElementById('five_count')) document.getElementById('five_count').innerHTML = wlanCoverage.band5.advertised + " / " +wlanCoverage.band5.total;
	if (document.getElementById('six_count')) document.getElementById('six_count').innerHTML = wlanCoverage.band6.advertised + " / " +wlanCoverage.band6.total;
	
	loadWLANThroughputChart(selectedWLAN, selectedSite);
	loadWLANClientChart(selectedWLAN, selectedSite);
	renderWLANMap(wlanCoverage);
}

// WLAN settings (security, VLAN, band, etc.) can be overridden at the site level, so the
// details panel can't always rely on the globally-fetched wlanDetails. When a specific site
// is selected, fetch that site's own WLAN list instead and render from that.
function loadWLANDetailsPanel(selectedWLAN, selectedSite) {
	getActiveWLANDetails(selectedSite).then(function(wlanDetailsSource) {
		renderWLANDetailsPanel(selectedWLAN, wlanDetailsSource);
	});
}

function getActiveWLANDetails(selectedSite) {
	if (!selectedSite || selectedSite === '_all') return Promise.resolve(wlanDetails);
	return fetchWLANsForSite(selectedSite);
}

function renderWLANDetailsPanel(selectedWLAN, wlanDetailsSource) {
	if (!wlanDetailsSource || wlanDetailsSource == {}) {
		if (document.getElementById('wlan_details')) document.getElementById('wlan_details').hidden = true;
		return;
	}
	
	let selectedWLANDetails = wlanDetailsSource[selectedWLAN];
	if (selectedWLANDetails) {
		if (document.getElementById('wlan_details')) document.getElementById('wlan_details').hidden = false;
		
		if (document.getElementById('wlan_name')) document.getElementById('wlan_name').innerHTML = '<strong>WLAN: </strong>'+selectedWLANDetails.wlanName;
		if (document.getElementById('wlan_level')) document.getElementById('wlan_level').innerHTML = '<strong>Security Level: </strong>'+selectedWLANDetails.securityLevel;
		if (document.getElementById('wlan_security')) document.getElementById('wlan_security').innerHTML = '<strong>Security: </strong>'+selectedWLANDetails.security;
		let wlanState = selectedWLANDetails.status === 'ENABLED'? '<i class="fa-solid fa-circle-check"></i>': '<i class="fa-solid fa-octagon-xmark"></i>';
		if (document.getElementById('wlan_state')) document.getElementById('wlan_state').innerHTML = '<strong>State: </strong>'+wlanState;
		if (document.getElementById('wlan_band')) document.getElementById('wlan_band').innerHTML = '<strong>Band: </strong>'+selectedWLANDetails.band;
		if (document.getElementById('wlan_vlan')) document.getElementById('wlan_vlan').innerHTML = '<strong>Default VLAN: </strong>'+selectedWLANDetails.vlan;
	} else {
		if (document.getElementById('wlan_details')) document.getElementById('wlan_details').hidden = true;
	}
}

// Fetches (and caches, per-site) the WLAN list scoped to a single site via
// /network-monitoring/v1/wlans?site-id=..., mirroring core.js's getWLANs() pagination
// but without touching the global wlanDetails or the WLAN selector dropdowns.
function fetchWLANsForSite(selectedSite) {
	var cached = siteWLANDetailsCache[selectedSite];
	if (cached && cached.expiresAt > Date.now()) return Promise.resolve(cached.wlanDetails);
	
	return fetchWLANsForSitePage(selectedSite, 1, {}).then(function(siteWLANDetails) {
		siteWLANDetailsCache[selectedSite] = {
			expiresAt: Date.now() + siteWLANDetailsCacheTTLms,
			wlanDetails: siteWLANDetails,
		};
		return siteWLANDetails;
	});
}

function fetchWLANsForSitePage(selectedSite, offset, accumulated) {
	var targetURL = localStorage.getItem('base_url') + '/network-monitoring/v1/wlans?site-id=' + encodeURIComponent(selectedSite) + '&limit=' + apiRadioListLimit + '&next=' + offset;
	
	return fetchProxyWithAuth('/tools/getCommandwHeaders', {
		url: targetURL,
		access_token: localStorage.getItem('access_token'),
	}).then(function(commandResults) {
		var result = processStatus(commandResults);
		if (result !== 200) return accumulated;
		
		var response = JSON.parse(commandResults.responseBody || '{}');
		(response.items || []).forEach(function(item) {
			accumulated[item.wlanName] = item;
		});
		
		offset += response.count;
		if (response.total && offset < response.total) {
			return fetchWLANsForSitePage(selectedSite, offset, accumulated);
		}
		return accumulated;
	}).catch(function() {
		return accumulated;
	});
}

// Builds per-band (2.4/5/6GHz) advertising coverage for the selected WLAN, both system-wide
// and broken down per-site (since a WLAN may not be advertised on every AP/radio in a site),
// by cross-referencing bssidDetails (keyed by radio macAddress) against radioDetails.
// selectedSite narrows the result to a single siteId; '_all' (or omitted) includes every site.
function getWLANCoverageStats(selectedWLAN, selectedSite) {
	var filterToSite = selectedSite && selectedSite !== '_all';
	
	var stats = {
		wlanName: selectedWLAN,
		siteCount: 0,
		totalSiteCount: filterToSite ? 1 : sites.length,
		apCount: 0,
		apList: [],
		totalAPCount: filterToSite ? aps.filter(function(ap) { return ap.siteId === selectedSite; }).length : aps.length,
		advertisingSites: [],
		band24: { advertised: 0, total: 0, sites: {}, apList: [] },
		band5: { advertised: 0, total: 0, sites: {}, apList: [] },
		band6: { advertised: 0, total: 0, sites: {}, apList: [] }
	};
	
	// '_all', '_wlan' and '_wired' are the general selector choices, not real WLAN names
	if (!selectedWLAN || selectedWLAN.charAt(0) === '_') return stats;
	
	// Lookup of AP objects by serialNumber, so bands/apList can expose the full AP object
	var apBySerial = {};
	aps.forEach(function(ap) {
		apBySerial[ap.serialNumber] = ap;
	});
	
	// Find every radio (by its own macAddress) that advertises the selected WLAN,
	// and every site (as its full Site object, for map/location use) that has at least
	// one of those radios.
	var advertisingRadioMacs = {};
	var advertisingSiteIds = {};
	var advertisingSitesById = {};
	Object.keys(bssidDetails).forEach(function(radioMac) {
		bssidDetails[radioMac].forEach(function(bssid) {
			if (bssid.wlanName === selectedWLAN && (!filterToSite || bssid.siteId === selectedSite)) {
				advertisingRadioMacs[radioMac] = true;
				advertisingSiteIds[bssid.siteId] = true;
				
				if (!advertisingSitesById[bssid.siteId]) {
					var site = getSiteForId(bssid.siteId);
					if (site) advertisingSitesById[bssid.siteId] = site;
				}
			}
		});
	});
	stats.siteCount = Object.keys(advertisingSiteIds).length;
	stats.advertisingSites = Object.values(advertisingSitesById);
	
	// Track distinct APs (by serialNumber) that have at least one advertising radio,
	// since an AP may have multiple radios (one per band). seenAPsByBand avoids an AP
	// being added to the same band's apList more than once (dual 5GHz radios, etc.).
	var advertisingAPSerials = {};
	var seenAPsByBand = { band24: {}, band5: {}, band6: {} };
	
	radioDetails.forEach(function(radio) {
		if (filterToSite && radio.siteId !== selectedSite) return;
		
		var bucket = null;
		var bandKey = null;
		if (radio.band === '2.4 GHz') { bucket = stats.band24; bandKey = 'band24'; }
		else if (radio.band === '5 GHz') { bucket = stats.band5; bandKey = 'band5'; }
		else if (radio.band === '6 GHz') { bucket = stats.band6; bandKey = 'band6'; }
		if (!bucket) return;
		
		bucket.total++;
		
		if (!bucket.sites[radio.siteId]) bucket.sites[radio.siteId] = { siteName: radio.siteName, advertised: 0, total: 0 };
		var siteStats = bucket.sites[radio.siteId];
		siteStats.total++;
		
		if (advertisingRadioMacs[radio.macAddress]) {
			bucket.advertised++;
			siteStats.advertised++;
			
			var apObject = apBySerial[radio.serialNumber];
			if (apObject) {
				if (!advertisingAPSerials[radio.serialNumber]) stats.apList.push(apObject);
				if (!seenAPsByBand[bandKey][radio.serialNumber]) bucket.apList.push(apObject);
			}
			advertisingAPSerials[radio.serialNumber] = true;
			seenAPsByBand[bandKey][radio.serialNumber] = true;
		}
	});
	stats.apCount = Object.keys(advertisingAPSerials).length;
	
	return stats;
}



/*  -------------------------------------------------------------------------------------------------------------------------------------------------------------------------
	WLAN Throughput Chart
------------------------------------------------------------------------------------------------------------------------------------------------------------------------- */

function getWLANTrendWindowStartISO() {
	// Stay just under 24h: by the time this timestamp reaches the API, processing/network
	// delay can push the effective age past 24h, tipping the API into its 180-minute
	// resolution bucket (used for >24h windows) instead of the 5-minute one.
	return DateTime.now().minus({ hours: 23 }).toUTC().toISO();
}

function buildWLANTrendURL(wlanName, trendPath, startISO, withFilter, selectedSite) {
	var base = localStorage.getItem('base_url') + '/network-monitoring/v1/wlans/' + encodeURIComponent(wlanName) + '/' + trendPath;
	
	var params = [];
	if (withFilter) params.push('filter=timestamp%20gt%20' + encodeURIComponent(startISO));
	// Omitting site-id returns throughput aggregated across all sites
	if (selectedSite && selectedSite !== '_all') params.push('site-id=' + encodeURIComponent(selectedSite));
	
	if (params.length === 0) return base;
	return base + '?' + params.join('&');
}

function fetchWLANTrendMetric(wlanName, trendPath, startISO, selectedSite) {
	var cacheKey = [wlanName, trendPath, startISO, selectedSite].join('|');
	var cached = wlanTrendCache[cacheKey];
	if (cached && cached.expiresAt > Date.now()) return Promise.resolve(cached.payload);
	
	var fetchTrend = function(targetURL, hasFallbackTried) {
		return fetchProxyWithAuth('/tools/getCommandwHeaders', {
			url: targetURL,
			access_token: localStorage.getItem('access_token'),
		}).then(function(commandResults) {
			var result = processStatus(commandResults);
			if (result === 200) {
				var payload = JSON.parse(commandResults.responseBody || '{}');
				wlanTrendCache[cacheKey] = {
					expiresAt: Date.now() + wlanTrendCacheTTLms,
					payload: payload,
				};
				return payload;
			}
			
			if ((result === 400) && !hasFallbackTried) {
				return fetchTrend(buildWLANTrendURL(wlanName, trendPath, startISO, false, selectedSite), true);
			}
			
			return null;
		}).catch(function() {
			return null;
		});
	};
	
	return fetchTrend(buildWLANTrendURL(wlanName, trendPath, startISO, true, selectedSite), false);
}

function mapWLANTrendGraphSeries(payload) {
	if (!payload || !payload.graph || !payload.graph.samples) return { labels: [], keys: [], samples: [] };
	
	var keys = payload.graph.keys || [];
	var samples = payload.graph.samples || [];
	var labels = samples.map(function(sample) {
		if (!sample.timestamp) return '';
		return DateTime.fromISO(sample.timestamp).toFormat('HH:mm');
	});
	
	return {
		labels: labels,
		keys: keys,
		samples: samples,
	};
}

function formatWLANBpsTick(value) {
	var absValue = Math.abs(value);
	if (absValue >= 1000000) return (absValue / 1000000).toFixed(1) + ' M';
	if (absValue >= 1000) return Math.round(absValue / 1000) + ' k';
	return String(absValue);
}

function wlanHexToRgba(hex, alpha) {
	var value = String(hex || '').replace('#', '').trim();
	if (value.length !== 6) return '';
	var red = parseInt(value.substring(0, 2), 16);
	var green = parseInt(value.substring(2, 4), 16);
	var blue = parseInt(value.substring(4, 6), 16);
	if (isNaN(red) || isNaN(green) || isNaN(blue)) return '';
	return 'rgba(' + red + ', ' + green + ', ' + blue + ', ' + alpha + ')';
}

function setWLANThroughputStatus(message, isError) {
	var statusEl = document.getElementById('wlan-throughput-status');
	if (!statusEl) return;
	statusEl.textContent = message || '';
	statusEl.style.color = isError ? '#ea0606' : '#67748e';
}

function renderWLANThroughputChart(payload) {
	var chartData = mapWLANTrendGraphSeries(payload);
	if (chartData.samples.length === 0) {
		setWLANThroughputStatus('No throughput data available.', true);
		return;
	}
	
	var txIndex = chartData.keys.indexOf('tx');
	var rxIndex = chartData.keys.indexOf('rx');
	if (txIndex === -1) txIndex = 0;
	if (rxIndex === -1) rxIndex = 1;
	
	var txSeries = chartData.samples.map(function(sample) {
		var value = sample.data && sample.data[txIndex] ? sample.data[txIndex] : 0;
		return parseFloat(value) || 0;
	});
	var rxSeries = chartData.samples.map(function(sample) {
		var value = sample.data && sample.data[rxIndex] ? sample.data[rxIndex] : 0;
		return -1 * (parseFloat(value) || 0);
	});
	
	var maxAbs = 0;
	txSeries.concat(rxSeries).forEach(function(item) {
		var absValue = Math.abs(item);
		if (absValue > maxAbs) maxAbs = absValue;
	});
	if (maxAbs === 0) maxAbs = 1000;
	
	if (wlanThroughputChart) wlanThroughputChart.destroy();
	var ctx = document.getElementById('wlan-throughput-chart').getContext('2d');
	wlanThroughputChart = new Chart(ctx, {
		type: 'line',
		data: {
			labels: chartData.labels,
			datasets: [
				{
					label: 'Transmitted',
					data: txSeries,
					borderColor: colorArray[0],
					backgroundColor: wlanHexToRgba(colorArray[0], 0.20),
					borderWidth: 1,
					fill: true,
					tension: 0,
					pointRadius: 0,
					pointHoverRadius: 3,
				},
				{
					label: 'Received',
					data: rxSeries,
					borderColor: colorArray[4],
					backgroundColor: wlanHexToRgba(colorArray[4], 0.20),
					borderWidth: 1,
					fill: true,
					tension: 0,
					pointRadius: 0,
					pointHoverRadius: 3,
				},
			],
		},
		options: {
			responsive: true,
			maintainAspectRatio: false,
			interaction: {
				intersect: false,
				mode: 'index',
			},
			plugins: {
				legend: {
					position: 'bottom',
				},
			},
			scales: {
				x: {
					grid: {
						display: false,
					},
					ticks: {
						autoSkip: true,
						maxTicksLimit: 10,
						maxRotation: 0,
						minRotation: 0,
					},
				},
				y: {
					suggestedMin: -1 * maxAbs,
					suggestedMax: maxAbs,
					ticks: {
						callback: function(value) {
							return formatWLANBpsTick(value);
						},
					},
					title: {
						display: true,
						text: 'bps',
					},
				},
			},
		},
	});
	
	setWLANThroughputStatus('');
}

function loadWLANThroughputChart(selectedWLAN, selectedSite) {
	// '_all', '_wlan' and '_wired' are the general selector choices, not real WLAN names
	if (!selectedWLAN || selectedWLAN.charAt(0) === '_') {
		if (wlanThroughputChart) {
			wlanThroughputChart.destroy();
			wlanThroughputChart = null;
		}
		setWLANThroughputStatus('Select a WLAN to view throughput.');
		return;
	}
	
	setWLANThroughputStatus('Loading...');
	
	var startISO = getWLANTrendWindowStartISO();
	fetchWLANTrendMetric(selectedWLAN, 'throughput-trends', startISO, selectedSite).then(function(payload) {
		if (!payload) {
			setWLANThroughputStatus('Throughput data unavailable for this WLAN.', true);
			return;
		}
		renderWLANThroughputChart(payload);
	});
}

/*  -------------------------------------------------------------------------------------------------------------------------------------------------------------------------
	WLAN Client Count Chart
------------------------------------------------------------------------------------------------------------------------------------------------------------------------- */

function buildClientTrendURL(startISO, selectedSite) {
	var base = localStorage.getItem('base_url') + '/network-monitoring/v1/clients-trend';
	
	var params = ['start-at=' + encodeURIComponent(startISO), 'group-by=WLAN'];
	// Omitting site-id returns client counts aggregated across all sites
	if (selectedSite && selectedSite !== '_all') params.push('site-id=' + encodeURIComponent(selectedSite));
	
	return base + '?' + params.join('&');
}

function fetchClientTrendMetric(startISO, selectedSite) {
	var cacheKey = [startISO, selectedSite].join('|');
	var cached = wlanClientTrendCache[cacheKey];
	if (cached && cached.expiresAt > Date.now()) return Promise.resolve(cached.payload);
	
	return fetchProxyWithAuth('/tools/getCommandwHeaders', {
		url: buildClientTrendURL(startISO, selectedSite),
		access_token: localStorage.getItem('access_token'),
	}).then(function(commandResults) {
		var result = processStatus(commandResults);
		if (result !== 200) return null;
		
		var payload = JSON.parse(commandResults.responseBody || '{}');
		wlanClientTrendCache[cacheKey] = {
			expiresAt: Date.now() + wlanClientTrendCacheTTLms,
			payload: payload,
		};
		return payload;
	}).catch(function() {
		return null;
	});
}

// Unlike the throughput-trends payload, this one isn't nested under "graph" and uses
// "ts" instead of "timestamp" for each sample.
function mapClientTrendSeries(payload) {
	if (!payload || !payload.samples) return { labels: [], keys: [], samples: [] };
	
	var keys = payload.keys || [];
	var samples = payload.samples || [];
	var labels = samples.map(function(sample) {
		if (!sample.ts) return '';
		return DateTime.fromISO(sample.ts).toFormat('HH:mm');
	});
	
	return {
		labels: labels,
		keys: keys,
		samples: samples,
	};
}

function setWLANClientStatus(message, isError) {
	var statusEl = document.getElementById('wlan-client-status');
	if (!statusEl) return;
	statusEl.textContent = message || '';
	statusEl.style.color = isError ? '#ea0606' : '#67748e';
}

function renderWLANClientChart(payload, selectedWLAN) {
	var chartData = mapClientTrendSeries(payload);
	if (chartData.samples.length === 0) {
		setWLANClientStatus('No client count data available.', true);
		return;
	}
	
	// The response is grouped by WLAN; "keys" tells us which data[] index belongs
	// to the selected WLAN. If it isn't individually tracked (e.g. folded into "Others"
	// or simply has no clients), treat it as zero clients across the whole window.
	var wlanIndex = chartData.keys.indexOf(selectedWLAN);
	
	var clientSeries = chartData.samples.map(function(sample) {
		if (wlanIndex === -1) return 0;
		var value = sample.data && sample.data[wlanIndex] !== undefined ? sample.data[wlanIndex] : 0;
		return parseFloat(value) || 0;
	});
	
	if (wlanClientChart) wlanClientChart.destroy();
	var ctx = document.getElementById('wlan-client-chart').getContext('2d');
	wlanClientChart = new Chart(ctx, {
		type: 'line',
		data: {
			labels: chartData.labels,
			datasets: [
				{
					label: 'Clients',
					data: clientSeries,
					borderColor: colorArray[0],
					backgroundColor: wlanHexToRgba(colorArray[0], 0.20),
					borderWidth: 1,
					fill: true,
					tension: 0,
					pointRadius: 0,
					pointHoverRadius: 3,
				},
			],
		},
		options: {
			responsive: true,
			maintainAspectRatio: false,
			interaction: {
				intersect: false,
				mode: 'index',
			},
			plugins: {
				legend: {
					position: 'bottom',
				},
			},
			scales: {
				x: {
					grid: {
						display: false,
					},
					ticks: {
						autoSkip: true,
						maxTicksLimit: 10,
						maxRotation: 0,
						minRotation: 0,
					},
				},
				y: {
					beginAtZero: true,
					ticks: {
						precision: 0,
					},
					title: {
						display: true,
						text: 'Clients',
					},
				},
			},
		},
	});
	
	setWLANClientStatus('');
}

function loadWLANClientChart(selectedWLAN, selectedSite) {
	// '_all', '_wlan' and '_wired' are the general selector choices, not real WLAN names
	if (!selectedWLAN || selectedWLAN.charAt(0) === '_') {
		if (wlanClientChart) {
			wlanClientChart.destroy();
			wlanClientChart = null;
		}
		setWLANClientStatus('Select a WLAN to view client counts.');
		return;
	}
	
	setWLANClientStatus('Loading...');
	
	var startISO = getWLANTrendWindowStartISO();
	fetchClientTrendMetric(startISO, selectedSite).then(function(payload) {
		if (!payload) {
			setWLANClientStatus('Client count data unavailable.', true);
			return;
		}
		renderWLANClientChart(payload, selectedWLAN);
	});
}

/*  -------------------------------------------------------------------------------------------------------------------------------------------------------------------------
	WLAN Geographic Distribution Map
------------------------------------------------------------------------------------------------------------------------------------------------------------------------- */

function setWLANMapStatus(message, isError) {
	var statusEl = document.getElementById('wlan-map-status');
	if (!statusEl) return;
	statusEl.textContent = message || '';
	statusEl.classList.remove('is-error');
	if (isError) statusEl.classList.add('is-error');
}

function ensureWLANMap() {
	if (wlanMapInitialized) return true;
	if (typeof L === 'undefined' || typeof L.markerClusterGroup !== 'function') return false;
	
	var canvas = document.getElementById('wlan-map-canvas');
	if (!canvas) return false;
	
	wlanMap = L.map(canvas, {
		zoomControl: true,
		attributionControl: true,
		maxZoom: 18,
	});
	
	L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
		maxZoom: 18,
		attribution: '&copy; OpenStreetMap contributors',
	}).addTo(wlanMap);
	
	wlanMapClusterGroup = L.markerClusterGroup({
		iconCreateFunction: createWLANMapClusterIcon,
		showCoverageOnHover: false,
		zoomToBoundsOnClick: true,
	});
	wlanMap.addLayer(wlanMapClusterGroup);
	
	var WLANMapResetControl = L.Control.extend({
		options: { position: 'topleft' },
		onAdd: function() {
			var container = L.DomUtil.create('div', 'leaflet-bar leaflet-control wlan-map-reset-control');
			var link = L.DomUtil.create('a', '', container);
			link.href = '#';
			link.title = 'Reset zoom to fit all sites';
			link.innerHTML = '<i class="fa-solid fa-expand"></i>';
			L.DomEvent.disableClickPropagation(container);
			L.DomEvent.on(link, 'click', function(event) {
				L.DomEvent.preventDefault(event);
				resetWLANMapZoom();
			});
			return container;
		},
	});
	new WLANMapResetControl().addTo(wlanMap);
	
	wlanMapInitialized = true;
	return true;
}

function resetWLANMapZoom() {
	if (!wlanMap || !wlanMapClusterGroup) return;
	var bounds = wlanMapClusterGroup.getBounds();
	if (bounds.isValid()) wlanMap.fitBounds(bounds, { padding: [30, 30], maxZoom: 14 });
}

// Teardrop pin, colored green for sites advertising the selected WLAN, grey otherwise
function createWLANSitePinIcon(isAdvertising) {
	var color = isAdvertising ? colorArray[4] : colorArray[5];
	var svg = '<svg xmlns="http://www.w3.org/2000/svg" width="28" height="36" viewBox="0 0 28 36">' +
		'<path d="M14 0C6.268 0 0 6.268 0 14c0 9.333 14 22 14 22S28 23.333 28 14C28 6.268 21.732 0 14 0z" fill="' + color + '" opacity="0.95"/>' +
		'<circle cx="14" cy="14" r="6" fill="white" opacity="0.9"/>' +
		'</svg>';
	
	return L.divIcon({
		html: svg,
		className: '',
		iconSize: [28, 36],
		iconAnchor: [14, 36],
		popupAnchor: [0, -38],
		tooltipAnchor: [0, -38],
	});
}

// Cluster is green if it contains at least one advertising site, grey otherwise
function createWLANMapClusterIcon(cluster) {
	var markers = cluster.getAllChildMarkers();
	var anyAdvertising = markers.some(function(marker) { return marker.options.wlanAdvertising; });
	var color = anyAdvertising ? colorArray[4] : colorArray[5];
	var count = markers.length;
	var size = count < 10 ? 36 : count < 50 ? 42 : 48;
	
	return L.divIcon({
		html: '<div class="wlan-map-cluster-icon" style="width:' + size + 'px;height:' + size + 'px;background:' + color + ';box-shadow:0 0 0 4px ' + wlanHexToRgba(color, 0.3) + ', 0 2px 10px rgba(0,0,0,0.35);">' + count + '</div>',
		className: '',
		iconSize: [size, size],
		iconAnchor: [size / 2, size / 2],
	});
}

function renderWLANMap(coverageStats) {
	if (!ensureWLANMap()) {
		setWLANMapStatus('Geo Map is unavailable because Leaflet failed to load.', true);
		return;
	}
	
	wlanMapClusterGroup.clearLayers();
	
	var advertisingSiteIds = {};
	(coverageStats.advertisingSites || []).forEach(function(site) {
		advertisingSiteIds[site.id] = true;
	});
	
	var markers = [];
	sites.forEach(function(site) {
		if (site.siteName === 'Unmapped') return;
		if (!site.location) return;
		var lat = parseFloat(site.location.latitude);
		var lng = parseFloat(site.location.longitude);
		if (isNaN(lat) || isNaN(lng)) return;
		
		var isAdvertising = !!advertisingSiteIds[site.id];
		var marker = L.marker([lat, lng], {
			icon: createWLANSitePinIcon(isAdvertising),
			wlanAdvertising: isAdvertising,
		});
		marker.bindPopup('<strong>' + escapeHtml(site.siteName) + '</strong><br>' + (isAdvertising ? 'Advertising ' + escapeHtml(coverageStats.wlanName) : 'Not advertising'));
		marker.bindTooltip(escapeHtml(site.siteName), { direction: 'top' });
		
		markers.push(marker);
		wlanMapClusterGroup.addLayer(marker);
	});
	
	if (markers.length === 0) {
		setWLANMapStatus('No site location data available.');
		return;
	}
	
	setWLANMapStatus('');
	resetWLANMapZoom();
	
	setTimeout(function() {
		if (wlanMap) wlanMap.invalidateSize();
	}, 10);
}

/*  -------------------------------------------------------------------------------------------------------------------------------------------------------------------------
	Table Display
------------------------------------------------------------------------------------------------------------------------------------------------------------------------- */

function showDevices(showMode) {
	
	let wlanChoices = getWLANSimpleSelector();
	let selectedWLAN = wlanChoices.getValue(true);
	
	var selectedDevices = [];
	if (showMode === '2.4GHz') {
		selectedDevices = wlanCoverage.band24.apList;
		document.getElementById('selected-title').innerHTML = 'APs advertising <strong>' + selectedWLAN + '</strong> on <strong>' + showMode +'</strong>';
	} else if (showMode === '5GHz') {
		selectedDevices = wlanCoverage.band5.apList;
		document.getElementById('selected-title').innerHTML = 'APs advertising <strong>' + selectedWLAN + '</strong> on <strong>' + showMode +'</strong>';
	} else if (showMode === '6GHz') {
		selectedDevices = wlanCoverage.band6.apList;
		document.getElementById('selected-title').innerHTML = 'APs advertising <strong>' + selectedWLAN + '</strong> on <strong>' + showMode +'</strong>';
	} else if (showMode === 'APs') {
		selectedDevices = wlanCoverage.apList;
		document.getElementById('selected-title').innerHTML = 'APs advertising <strong>' + selectedWLAN +'</strong>';
	}

	loadSelectedDevices(selectedDevices);
}

function loadSelectedDevices(selectedDevices) {
	$('#selected-device-table')
		.DataTable().clear();
		
	var table = $('#selected-device-table').DataTable();
	
	selectedDevices.forEach(function(device) {
		var statusString = device['status'];
		var status = '<i class="fa-solid fa-diamond text-danger"></i>';
		var deviceUp = true;
		if (device['status'] == 'ONLINE') {
			status = '<i class="fa-solid fa-circle text-success"></i>';
		} else {
			downAPCount++;
			deviceUp = false;
		}
		var ip_address = device['ipv4'];
		if (!ip_address) ip_address = device['ipv6'];
		if (!ip_address) ip_address = '';
		
		// Make Name as a link to Central
		var name = encodeURI(device['deviceName']);
		var apiURL = localStorage.getItem('base_url');
		var centralBaseURL = centralURLs[apiURL];
		var centralURL = centralBaseURL + '/gravity/monitoring/ap/dashboard?contextType=ap&selectedView=dashboard&siteId=' + device['siteId'] + '&selectedPlanet=sun&deviceId=' + device['serialNumber'];
		
		// Get Site
		var deviceSite = getSiteForId(device['siteId'])
		var deviceSiteURL = '';
		if (deviceSite) {
			deviceSiteURL = centralBaseURL + '/gravity/monitoring/site/dashboard?contextType=site&selectedView=dashboard&siteId=' + device['siteId'] + '&selectedPlanet=sun&timelineFrame=Hour';
		}
		
		// Add row to table
		table.row.add([device['Conductor'] ? '<a href="' + centralURL + '" target="_blank" rel="noopener noreferrer"><strong>' + escapeHtml(device['deviceName']) + ' (VC)</strong></a>' : '<a href="' + centralURL + '" target="_blank" rel="noopener noreferrer"><strong>' + escapeHtml(device['deviceName']) + '</strong></a>', '<span title="' + escapeHtml(device['status']) + '"></span>' + status, escapeHtml(ip_address), escapeHtml(device['model']), escapeHtml(device['serialNumber']), escapeHtml(device['macAddress']), escapeHtml(device['firmwareVersion']), deviceSite ? '<a href="' + deviceSiteURL + '" target="_blank" rel="noopener noreferrer"><strong>' + escapeHtml(deviceSite['siteName']) + '</strong></a>' : '']);
	});
	$('#selected-device-table')
		.DataTable()
		.rows()
		.draw();
	
	initializeTooltips(table.table().body());
	
	var myModal = new bootstrap.Modal(document.getElementById('SelectedDeviceModal'))
	myModal.show();
}

function showSites() {
	
	let wlanChoices = getWLANSimpleSelector();
	let selectedWLAN = wlanChoices.getValue(true);
	document.getElementById('site-selected-title').innerHTML = 'Sites advertising <strong>' + selectedWLAN +'</strong>';

	loadSelectedSite();
}

function loadSelectedSite(selectedSites) {
	$('#selected-site-table')
		.DataTable().clear();
		
	var table = $('#selected-site-table').DataTable();
	
	let advertisingSites = wlanCoverage.advertisingSites;
	
	sites.forEach(function(site) {
		let foundSite = advertisingSites.find(function(advsite) { return advsite.id === site.id; }) || null
		
		// Check if site is advertising the selected SSID
		var status = '<span data-bs-toggle="tooltip" data-bs-placement="top" data-container="body" data-animation="true" data-bs-html="true" title="Not Advertising"><i class="fa-solid fa-circle text-neutral"></i></span>';
		if (foundSite) {
			status = '<span data-bs-toggle="tooltip" data-bs-placement="top" data-container="body" data-animation="true" data-bs-html="true" title="Advertising"><i class="fa-solid fa-circle text-success"></i></span>';
		}
		
		//console.log(site);
		// Make AP Name as a link to Central
		let name = encodeURI(site['scopeName']);
		let apiURL = localStorage.getItem('base_url');
		let centralBaseURL = centralURLs[apiURL];
		let centralURL = centralBaseURL + '/gravity/monitoring/site/dashboard?contextType=site&selectedView=dashboard&siteId=' + site['id'] + '&selectedPlanet=sun';
		
		let band24 = wlanCoverage.band24.sites[site.id];
		let bar24actual = band24 ? band24.advertised + ' out of ' + band24.total + ' APs': 'Not Advertised';
		let bar24Percentage = band24 ? band24.advertised/band24.total*100 : 0;
		let bar24Color = bar24Percentage == 100 ? 'bg-gradient-success' : 'bg-gradient-info';
		let bar24 =  '<span data-bs-toggle="tooltip" data-bs-placement="top" data-container="body" data-animation="true" data-bs-html="true" title="'+bar24actual+'"><div class="progress mt-2-5"><div class="progress-bar '+bar24Color+'" role="progressbar" aria-valuenow="'+bar24Percentage+'" aria-valuemin="0" aria-valuemax="100" style="width: '+bar24Percentage+'%;"></div></div></span>';
		
		let band5 = wlanCoverage.band5.sites[site.id];
		let bar5actual = band5 ? band5.advertised + ' out of ' + band5.total + ' APs': 'Not Advertised';
		let bar5Percentage = band5 ? band5.advertised/band5.total*100 : 0;
		let bar5Color = bar5Percentage == 100 ? 'bg-gradient-success' : 'bg-gradient-info';
		let bar5 =  '<span data-bs-toggle="tooltip" data-bs-placement="top" data-container="body" data-animation="true" data-bs-html="true" title="'+bar5actual+'"><div class="progress mt-2-5"><div class="progress-bar '+bar5Color+'" role="progressbar" aria-valuenow="'+bar5Percentage+'" aria-valuemin="0" aria-valuemax="100" style="width: '+bar5Percentage+'%;"></div></div></span>';
		
		let band6 = wlanCoverage.band6.sites[site.id];
		let bar6actual = band6 ? band6.advertised + ' out of ' + band6.total + ' APs': 'Not Advertised';
		let bar6Percentage = band6 ? band6.advertised/band6.total*100 : 0;
		let bar6Color = bar6Percentage == 100 ? 'bg-gradient-success' : 'bg-gradient-info';
		let bar6 =  '<span data-bs-toggle="tooltip" data-bs-placement="top" data-container="body" data-animation="true" data-bs-html="true" title="'+bar6actual+'"><div class="progress mt-2-5"><div class="progress-bar '+bar6Color+'" role="progressbar" aria-valuenow="'+bar6Percentage+'" aria-valuemin="0" aria-valuemax="100" style="width: '+bar6Percentage+'%;"></div></div></span>';
		
		let mapsString = 'https://www.google.com/maps/search/?api=1&query='+site['location']['latitude']+','+site['location']['longitude'];
		let configString = 'https://internal-ui.central.arubanetworks.com/gravity/monitoring/config/profiles?contextType=site&selectedView=configuration&siteId='+site['id']+'&selectedPlanet=sun&configMenu=selected-site&configView=profile&configTab=profiles'
		// Add row to table
		table.row.add(['<a href="' + centralURL + '" target="_blank" rel="noopener noreferrer"><strong>' + escapeHtml(site['siteName']) + '</strong></a>', status, bar24, bar5, bar6, '<span data-bs-toggle="tooltip" data-bs-placement="top" title="Open location in Google Maps"><a href="' + mapsString + '" target="_blank" rel="noopener noreferrer"><strong><i class="fa-solid fa-globe-pointer fa-fw text-dark"></i></strong></a></span>&nbsp;<span data-bs-toggle="tooltip" data-bs-placement="top" title="Open config in Central"><a href="' + configString + '" target="_blank" rel="noopener noreferrer"><strong><i class="fa-solid fa-gear fa-fw text-dark"></i></strong></a></span>']);
	});
	$('#selected-site-table')
		.DataTable()
		.rows()
		.draw();
	
	initializeTooltips(table.table().body());
	
	var myModal = new bootstrap.Modal(document.getElementById('SelectedSiteModal'))
	myModal.show();
}