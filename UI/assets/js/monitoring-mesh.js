/*
Central Automation v2.x
Mesh Topology View
Aaron Scott (WiFi Downunder) 2026
*/

var meshNotification;
var meshAPs = [];
var meshRadios = [];
var meshRadiosBySerial = {};
var meshRadiosByMac = {};

var meshOverlaySelector;
var meshSelectedPortalSerial = null;
var meshSelectedPortalName = '';

var meshGraph = {
	nodes: {},
	edges: []
};

var meshSelectedEdgeId = null;
var meshViewMode = 'GRAPH';

var meshMap = null;
var meshMapLayerMarkers = null;
var meshMapLayerEdges = null;
var meshMapLayerDistance = null;
var meshMapInitialized = false;
var meshMapViewportLocked = false;
var meshSuppressNextMapClick = false;
var meshEdgeClickTimer = null;
var meshEdgeClickDelayMs = 220;
var meshSelectedEdgeStrokeWidth = 8;
var meshDefaultEdgeStrokeWidth = 4;
var meshTopologyAPLeafletIcons = {};

var meshLocationCacheTTLms = 10 * 60 * 1000;
var meshLocationCacheBySite = {};
var meshLocationRequestsBySite = {};
var meshGeoBySerial = {};
var meshMapLoadingLocations = false;
var meshPathlossCacheTTLms = 10 * 60 * 1000;
var meshPathlossCacheByRadio = {};
var meshPathlossRequestsByRadio = {};
var meshLongDistanceThresholdMeters = 500;
var meshRFProfileCacheTTLms = 5 * 60 * 1000;
var meshRFProfilesByScopeCache = {};
var meshRFProfilesByScopeRequests = {};
var meshLongDistanceRFAnalysisToken = 0;
var meshLongDistanceRFAnalysis = null;
var meshShowDistanceAnalysis = false;
var meshSharedPatchActionMap = {};
var meshSharedPatchInFlight = {};

var meshBandColors = {};

var meshLinkModalInstance = null;
var meshLinkModalInitialized = false;
var meshTrendCache = {};
var meshTrendCacheTTLms = 5 * 60 * 1000;
var meshLinkCharts = {
	throughput: null,
	frames: null,
	utilization: null,
	noise: null,
	quality: null,
};

var meshChannelUtilizationLegendLabels = ['Transmitting (tx)', 'Receiving (rx)', 'Non-Wi-Fi interference'];
var meshChartColorIndexMap = {
	info: 0,
	danger: 1,
	warning: 2,
	success: 4,
	secondary: 5,
	body: 6,
};

function getMeshChartColor(key) {
	if (typeof colorArray === 'undefined' || !Array.isArray(colorArray) || colorArray.length === 0) {
		return '';
	}

	var index = meshChartColorIndexMap[key];
	if (typeof index === 'number' && colorArray[index]) {
		return colorArray[index];
	}

	if (colorArray[meshChartColorIndexMap.body]) return colorArray[meshChartColorIndexMap.body];
	return colorArray[0] || '';
}

var meshChartColors = {
	info: getMeshChartColor('info'),
	danger: getMeshChartColor('danger'),
	warning: getMeshChartColor('warning'),
	success: getMeshChartColor('success'),
	secondary: getMeshChartColor('secondary'),
	body: getMeshChartColor('body'),
};

meshBandColors = {
	'2': getMeshChartColor('danger'),
	'5': getMeshChartColor('warning'),
	'6': getMeshChartColor('success')
};

function meshHexToRgba(hex, alpha) {
	var value = String(hex || '').replace('#', '').trim();
	if (!value) return '';
	if (value.length === 3) {
		value = value[0] + value[0] + value[1] + value[1] + value[2] + value[2];
	}
	if (value.length !== 6) return '';

	var red = parseInt(value.substring(0, 2), 16);
	var green = parseInt(value.substring(2, 4), 16);
	var blue = parseInt(value.substring(4, 6), 16);

	if (isNaN(red) || isNaN(green) || isNaN(blue)) return '';

	return 'rgba(' + red + ', ' + green + ', ' + blue + ', ' + alpha + ')';
}

function getMeshLegendOptions() {
	return {
		position: 'bottom',
		labels: {
			usePointStyle: true,
			pointStyle: 'circle',
			boxWidth: 10,
			boxHeight: 10,
			generateLabels: function(chart) {
				var defaultGenerator = Chart.defaults.plugins.legend.labels.generateLabels;
				var labels = defaultGenerator(chart);

				labels.forEach(function(label) {
					var dataset = chart.data.datasets[label.datasetIndex] || {};
					var solidColor = dataset.borderColor || dataset.backgroundColor || meshChartColors.body || '#344767';
					label.fillStyle = solidColor;
					label.strokeStyle = solidColor;
					label.lineWidth = 0;
					label.pointStyle = 'circle';
				});

				return labels;
			},
		},
	};
}

function normalizeMacAddress(mac) {
	if (!mac) return '';
	return String(mac).trim().toLowerCase();
}

function escapeJsString(value) {
	return String(value || '').replace(/\\/g, '\\\\').replace(/'/g, "\\'");
}

function getMeshOverlayValue() {
	if (!meshOverlaySelector) return 'NONE';
	return meshOverlaySelector.getValue(true);
}

function updateMeshOverlayHelp() {
	var helpEl = document.getElementById('mesh-overlay-flags-help');
	if (!helpEl) return;
	var tooltip = bootstrap.Tooltip.getInstance(helpEl);

	if (getMeshOverlayValue() === 'FLAGS') {
		helpEl.classList.remove('d-none');
		helpEl.setAttribute('title', meshFlagsTooltipHtml);
		helpEl.setAttribute('data-bs-original-title', meshFlagsTooltipHtml);
		if (tooltip) tooltip.dispose();
		bootstrap.Tooltip.getOrCreateInstance(helpEl, { html: true, trigger: 'hover focus' });
	} else {
		if (tooltip) tooltip.dispose();
		helpEl.classList.add('d-none');
		helpEl.setAttribute('title', '');
		helpEl.removeAttribute('data-bs-original-title');
	}
}

function clearMeshGraph() {
	meshGraph = { nodes: {}, edges: [] };
	meshSelectedEdgeId = null;
	meshGeoBySerial = {};
	meshMapViewportLocked = false;
	meshMapLoadingLocations = false;
	updateMeshDistanceBanner();
	destroyMeshLinkCharts();
	renderMeshViews();
	setMeshMapStatus('Select a portal topology, then switch to Geo Map to load AP locations.', false, false);
	updateSelectedEdgeDetails();
}

function setMeshMapStatus(message, isError, isLoading) {
	var statusEl = document.getElementById('mesh-map-status');
	if (!statusEl) return;
	statusEl.textContent = message || '';
	statusEl.classList.remove('is-error');
	statusEl.classList.remove('is-loading');
	if (isError) statusEl.classList.add('is-error');
	if (isLoading) statusEl.classList.add('is-loading');
}

function ensureMeshMap() {
	if (meshMapInitialized) return true;
	if (typeof L === 'undefined') return false;

	var canvas = document.getElementById('mesh-map-canvas');
	if (!canvas) return false;

	meshMap = L.map(canvas, {
		zoomControl: true,
		attributionControl: true,
		maxZoom: 19,
		doubleClickZoom: false,
	});

	L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
		maxZoom: 19,
		maxNativeZoom: 19,
		attribution: '&copy; OpenStreetMap contributors',
	}).addTo(meshMap);

	meshMapLayerMarkers = L.layerGroup().addTo(meshMap);
	meshMapLayerEdges = L.layerGroup().addTo(meshMap);
	meshMapLayerDistance = L.layerGroup().addTo(meshMap);

	meshMap.on('click', function() {
		if (meshSuppressNextMapClick) {
			meshSuppressNextMapClick = false;
			return;
		}

		clearQueuedMeshEdgeSelection();
		if (meshSelectedEdgeId) {
			meshSelectedEdgeId = null;
			updateSelectedEdgeDetails();
			renderMeshViews();
		}
	});

	meshMapInitialized = true;
	return true;
}

function setMeshViewMode(mode) {
	var nextMode = String(mode || 'GRAPH').toUpperCase();
	if (nextMode !== 'MAP') nextMode = 'GRAPH';
	meshViewMode = nextMode;

	var graphWrap = document.getElementById('mesh-graph-view-wrap');
	var mapWrap = document.getElementById('mesh-map-view-wrap');
	var graphBtn = document.getElementById('mesh-view-graph-btn');
	var mapBtn = document.getElementById('mesh-view-map-btn');

	if (graphWrap && mapWrap) {
		if (meshViewMode === 'MAP') {
			graphWrap.classList.add('d-none');
			mapWrap.classList.remove('d-none');
		} else {
			mapWrap.classList.add('d-none');
			graphWrap.classList.remove('d-none');
		}
	}

	if (graphBtn && mapBtn) {
		graphBtn.classList.toggle('active', meshViewMode === 'GRAPH');
		mapBtn.classList.toggle('active', meshViewMode === 'MAP');
	}

	if (meshViewMode === 'MAP') {
		if (!ensureMeshMap()) {
			setMeshMapStatus('Geo Map is unavailable because Leaflet failed to load.', true, false);
			return;
		}

		if (meshSelectedPortalSerial) {
			setMeshMapStatus('Loading AP locations for the selected topology...', false, true);
			loadMeshLocationsForCurrentTopology(false);
		} else {
			setMeshMapStatus('Select a portal topology first to display AP locations.', false, false);
		}

		renderMeshMap();
		setTimeout(function() {
			if (meshMap) meshMap.invalidateSize();
		}, 10);
	}
}

function renderMeshViews() {
	updateMeshSharedLegend();
	renderMeshTopology();
	if (meshViewMode === 'MAP') {
		renderMeshMap();
	}
}

function clearQueuedMeshEdgeSelection() {
	if (meshEdgeClickTimer) {
		clearTimeout(meshEdgeClickTimer);
		meshEdgeClickTimer = null;
	}
}

function getMeshTopologyAPIcon(statusText) {
	var isOnline = String(statusText || '').toUpperCase() === 'ONLINE';
	var tintColor = isOnline ? (meshChartColors.success || '#82d616') : (meshChartColors.danger || '#ea0606');
	if (meshTopologyAPLeafletIcons[tintColor]) return meshTopologyAPLeafletIcons[tintColor];
	var glyphColor = meshChartColors.body || '#1f2937';
	var shellBorderColor = meshHexToRgba(tintColor, 0.7) || tintColor;
	var glyphSvg = '' +
		'<svg class="mesh-map-topology-ap-icon-glyph-svg" viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" focusable="false">' +
		'  <g>' +
		'    <path fill="none" stroke="' + glyphColor + '" stroke-width="2" stroke-linecap="square" d="M10 5 L54 5 C56.761425 5 59 7.238575 59 10 L59 54 C59 56.761425 56.761425 59 54 59 L10 59 C7.238576 59 5 56.761425 5 54 L5 10 C5 7.238575 7.238576 5 10 5 Z"/>' +
		'    <path fill="none" stroke="' + glyphColor + '" stroke-width="1.550985" stroke-linecap="square" d="M34.806309 43.581692 C34.806309 45.469574 33.275879 47 31.388 47 C29.500122 47 27.969692 45.469574 27.969692 43.581692 C27.969692 41.693813 29.500122 40.163383 31.388 40.163383 C33.275879 40.163383 34.806309 41.693813 34.806309 43.581692 Z"/>' +
		'    <path fill="none" stroke="' + glyphColor + '" stroke-width="1.550985" stroke-linecap="square" d="M42.023037 33.630318 C39.301384 30.907974 35.541245 29.2248 31.388 29.2248 C27.234756 29.2248 23.474619 30.907974 20.752962 33.630318"/>' +
		'    <path fill="none" stroke="' + glyphColor + '" stroke-width="1.550985" stroke-linecap="square" d="M50 25.995186 C45.236248 21.232113 38.656689 18.286217 31.388 18.286217 C24.119995 18.286217 17.539753 21.232113 12.776 25.995186"/>' +
		'  </g>' +
		'</svg>';

	meshTopologyAPLeafletIcons[tintColor] = L.divIcon({
		className: 'mesh-map-topology-ap-icon-anchor',
		html: '<div class="mesh-map-topology-ap-icon-shell" style="background-color:' + tintColor + '; border-color:' + shellBorderColor + ';">' + glyphSvg + '</div>',
		iconSize: [22, 22],
		iconAnchor: [11, 11],
		tooltipAnchor: [0, -11],
	});

	return meshTopologyAPLeafletIcons[tintColor];
}

function queueMeshEdgeSelection(edgeId) {
	clearQueuedMeshEdgeSelection();
	meshEdgeClickTimer = setTimeout(function() {
		meshSelectedEdgeId = edgeId;
		updateSelectedEdgeDetails();
		renderMeshViews();
		meshEdgeClickTimer = null;
	}, meshEdgeClickDelayMs);
}

function selectMeshEdgeNow(edgeId) {
	clearQueuedMeshEdgeSelection();
	meshSelectedEdgeId = edgeId;
	updateSelectedEdgeDetails();
	renderMeshViews();
}

function destroyMeshLinkCharts() {
	Object.keys(meshLinkCharts).forEach(function(key) {
		if (meshLinkCharts[key]) {
			meshLinkCharts[key].destroy();
			meshLinkCharts[key] = null;
		}
	});
}

function ensureMeshLinkModal() {
	if (meshLinkModalInitialized) return true;
	var modalEl = document.getElementById('meshLinkModal');
	if (!modalEl) return false;

	meshLinkModalInstance = bootstrap.Modal.getOrCreateInstance(modalEl);
	modalEl.addEventListener('hidden.bs.modal', function() {
		destroyMeshLinkCharts();
	});

	meshLinkModalInitialized = true;
	return true;
}

function refreshMeshData() {
	clearMeshGraph();
	localStorage.removeItem('monitoring_ap_update');
	authenticateWithCentral().then(function() {
		getAPDeviceData(1);
		getRadios(1).then(function() {
			meshRadios = getRadioList() || [];
			buildMeshRadioIndexes();
		});
	});
}

function populateMeshChoices() {
	var overlayElement = document.getElementById('meshoverlayselector');
	if (!overlayElement) return;

	meshOverlaySelector = new Choices(overlayElement, {
		searchEnabled: false,
		shouldSort: false,
		itemSelectText: ''
	});

	meshOverlaySelector.clearChoices();
	meshOverlaySelector.setChoices([
		{ value: 'NONE', label: 'None' },
		{ value: 'CHANNEL', label: 'Channel' },
		{ value: 'DATARATE', label: 'Data Rate' },
		{ value: 'DISTANCE', label: 'Distance' },
		{ value: 'PATHLOSS', label: 'Pathloss' },
		{ value: 'FLAGS', label: 'Flags' },
		{ value: 'SNR', label: 'SNR' },
		{ value: 'STABILITY', label: 'Stability' }
	]);
	meshOverlaySelector.setChoiceByValue('NONE');

	overlayElement.addEventListener('change', function() {
		updateMeshOverlayHelp();
		updateSelectedEdgeDetails();
		renderMeshViews();
	});

	updateMeshOverlayHelp();
}

function buildMeshRadioIndexes() {
	meshRadiosBySerial = {};
	meshRadiosByMac = {};

	(meshRadios || []).forEach(function(radio) {
		if (!radio || !radio.serialNumber) return;
		if (!meshRadiosBySerial[radio.serialNumber]) meshRadiosBySerial[radio.serialNumber] = [];
		meshRadiosBySerial[radio.serialNumber].push(radio);

		if (radio.macAddress) {
			meshRadiosByMac[normalizeMacAddress(radio.macAddress)] = radio;
		}
	});
}

function loadCurrentPageAP() {
	meshAPs = getAPs() || [];
	buildMeshPortalTable();

	meshRadios = getRadioList() || [];
	buildMeshRadioIndexes();

	loadDataFromDB('monitoring_radios');
}

function loadSavedData(indexKey, data) {
	if (indexKey !== 'monitoring_radios') return;

	meshRadios = data ? JSON.parse(data) : [];
	buildMeshRadioIndexes();

	if (meshRadios && localStorage.getItem('monitoring_radios_update')) {
		var lastRefresh = new Date(parseInt(localStorage.getItem('monitoring_radios_update')));
		var now = new Date();
		var diffTime = Math.abs(now - lastRefresh);
		var diffMinutes = Math.ceil(diffTime / (1000 * 60));
		if (diffMinutes > 30) {
			authenticateWithCentral().then(function() {
				getRadios(1).then(function() {
					meshRadios = getRadioList() || [];
					buildMeshRadioIndexes();
				});
			});
		}
	} else {
		authenticateWithCentral().then(function() {
			getRadios(1).then(function() {
				meshRadios = getRadioList() || [];
				buildMeshRadioIndexes();
			});
		});
	}
}

function buildMeshPortalTable() {
	var table = $('#mesh-portals-table').DataTable();
	table.clear();

	var apiURL = localStorage.getItem('base_url');
	var centralBaseURL = centralURLs[apiURL];

	var meshPortals = (meshAPs || []).filter(function(ap) {
		return String(ap.meshRole || '').toUpperCase() === 'PORTAL';
	});

	meshPortals.sort(function(a, b) {
		return String(a.deviceName || '').localeCompare(String(b.deviceName || ''));
	});

	meshPortals.forEach(function(ap) {
		var statusIcon = '<i class="fa-solid fa-diamond text-danger"></i>';
		if (String(ap.status || '').toUpperCase() === 'ONLINE') {
			statusIcon = '<i class="fa-solid fa-circle text-success"></i>';
		}

		var ipAddress = ap.ipv4 || ap.ipv6 || '-';
		var site = getSiteForId(ap.siteId);
		var siteName = site ? site.siteName : '';
		var siteURL = '';
		if (site) {
			siteURL = centralBaseURL + '/gravity/monitoring/site/dashboard?contextType=site&selectedView=dashboard&siteId=' + ap.siteId + '&selectedPlanet=sun&timelineFrame=Hour';
		}

		var centralURL = centralBaseURL + '/gravity/monitoring/ap/dashboard?contextType=ap&selectedView=dashboard&siteId=' + ap.siteId + '&selectedPlanet=sun&deviceId=' + ap.serialNumber;

		var uptimeString = '-';
		if (ap.uptimeInMillis && ap.uptimeInMillis > 0) {
			uptimeString = moment.duration(ap.uptimeInMillis).humanize();
		}

		var actionButton = '<button class="btn btn-sm btn-warning mb-0" onclick="buildMeshTopology(\'' + escapeJsString(ap.serialNumber) + '\', \'' + escapeJsString(ap.deviceName || ap.serialNumber) + '\')">Topology</button>';

		table.row.add([
			'<a href="' + centralURL + '" target="_blank" rel="noopener noreferrer"><strong>' + escapeHtml(ap.deviceName || ap.serialNumber) + '</strong></a>',
			'<span title="' + escapeHtml(ap.status || 'Unknown') + '"></span>' + statusIcon,
			escapeHtml(ipAddress),
			escapeHtml(ap.model || '-'),
			escapeHtml(ap.serialNumber || '-'),
			escapeHtml(ap.macAddress || '-'),
			site ? '<a href="' + siteURL + '" target="_blank" rel="noopener noreferrer"><strong>' + escapeHtml(siteName) + '</strong></a>' : '',
			uptimeString,
			actionButton
		]);
	});

	table.rows().draw();
	initializeTooltips(table.table().body());
}

function getAPBySerial(serial) {
	if (!serial) return null;
	var target = String(serial).toUpperCase();
	for (var i = 0; i < meshAPs.length; i++) {
		var ap = meshAPs[i];
		if (String(ap.serialNumber || '').toUpperCase() === target) return ap;
	}
	return null;
}

function getAPByName(apName) {
	if (!apName) return null;
	var target = String(apName).trim().toUpperCase();
	for (var i = 0; i < meshAPs.length; i++) {
		var ap = meshAPs[i];
		if (String(ap.deviceName || '').trim().toUpperCase() === target) return ap;
	}
	return null;
}

function getSerialForRadioMac(mac) {
	var normalized = normalizeMacAddress(mac);
	if (!normalized) return null;

	if (meshRadiosByMac[normalized] && meshRadiosByMac[normalized].serialNumber) {
		return meshRadiosByMac[normalized].serialNumber;
	}

	for (var i = 0; i < meshAPs.length; i++) {
		var ap = meshAPs[i];
		if (!ap.radios) continue;
		for (var j = 0; j < ap.radios.length; j++) {
			var apRadioMac = normalizeMacAddress(ap.radios[j].macaddr || ap.radios[j].macAddress);
			if (apRadioMac === normalized) return ap.serialNumber;
		}
	}
	return null;
}

function getBandKeyFromString(band) {
	var value = String(band || '').toLowerCase();
	if (value.indexOf('2') !== -1) return '2';
	if (value.indexOf('5') !== -1) return '5';
	if (value.indexOf('6') !== -1) return '6';
	return '5';
}

function parsePrimaryChannel(channel) {
	if (!channel) return null;
	var match = String(channel).match(/\d+/);
	return match ? parseInt(match[0], 10) : null;
}

function getRadioForSerialBandChannel(serial, band, channel) {
	var radios = meshRadiosBySerial[serial] || [];
	var bandKey = getBandKeyFromString(band);
	var channelNumber = parsePrimaryChannel(channel);
	var fallback = null;

	for (var i = 0; i < radios.length; i++) {
		var radio = radios[i];
		if (!radio || !radio.band) continue;
		if (getBandKeyFromString(radio.band) !== bandKey) continue;
		if (!fallback) fallback = radio;
		if (!channelNumber) return radio;

		var radioChannel = parsePrimaryChannel(radio.channel);
		if (radioChannel && radioChannel === channelNumber) return radio;
	}

	return fallback;
}

function ensureGraphNode(nodeId, options) {
	if (!meshGraph.nodes[nodeId]) {
		meshGraph.nodes[nodeId] = {
			id: nodeId,
			serial: options.serial || null,
			name: options.name || options.serial || options.mac || nodeId,
			mac: options.mac || null,
			status: options.status || 'UNKNOWN',
			model: options.model || '-',
			site: options.site || '-',
			isUnresolved: !!options.isUnresolved,
			x: 0,
			y: 0,
			level: 0
		};
	}
	return meshGraph.nodes[nodeId];
}

function getPairKey(sourceId, targetId) {
	return [sourceId, targetId].sort().join('::');
}

function relationPriority(relation) {
	if (relation === 'C' || relation === 'P') return 2;
	if (relation === 'N') return 1;
	return 0;
}

function hasDirectionalTextValue(value) {
	if (value === null || value === undefined) return false;
	var text = String(value).trim();
	return text !== '' && text !== '-';
}

function isValidDirectionalSnr(value) {
	return value !== null && value !== undefined && !isNaN(value);
}

function mergeEdgeDirectionalFields(targetEdge, incomingEdge) {
	if (!targetEdge || !incomingEdge) return;

	var incomingPriority = relationPriority(incomingEdge.relation);

	function mergeTextField(sideKey, valueKey, priorityKey) {
		var incomingValue = incomingEdge[valueKey];
		if (!hasDirectionalTextValue(incomingValue)) return;

		var existingValue = targetEdge[sideKey];
		var existingPriority = targetEdge[priorityKey] || 0;
		if (!hasDirectionalTextValue(existingValue) || incomingPriority >= existingPriority) {
			targetEdge[sideKey] = incomingValue;
			targetEdge[priorityKey] = incomingPriority;
		}
	}

	function mergeSnrField(sideKey, valueKey, priorityKey) {
		var incomingValue = incomingEdge[valueKey];
		if (!isValidDirectionalSnr(incomingValue)) return;

		var existingValue = targetEdge[sideKey];
		var existingPriority = targetEdge[priorityKey] || 0;
		if (!isValidDirectionalSnr(existingValue) || incomingPriority >= existingPriority) {
			targetEdge[sideKey] = incomingValue;
			targetEdge[priorityKey] = incomingPriority;
		}
	}

	var side = incomingEdge.endpointSide;
	if (side === 'A') {
		mergeTextField('flagsA', 'endpointFlags', 'flagsAPriority');
		mergeTextField('htA', 'endpointHTDetails', 'htAPriority');
		mergeTextField('rateA', 'endpointRate', 'rateAPriority');
		mergeTextField('reqA', 'endpointReq', 'reqAPriority');
		mergeTextField('respA', 'endpointResp', 'respAPriority');
		mergeTextField('failA', 'endpointFail', 'failAPriority');
		mergeTextField('radioNumberA', 'endpointRadioNumber', 'radioNumberAPriority');
		mergeTextField('radioMacA', 'endpointRadioMac', 'radioMacAPriority');
		mergeTextField('utilA', 'endpointUtil', 'utilAPriority');
		mergeSnrField('snrA', 'endpointSnr', 'snrAPriority');
	} else if (side === 'B') {
		mergeTextField('flagsB', 'endpointFlags', 'flagsBPriority');
		mergeTextField('htB', 'endpointHTDetails', 'htBPriority');
		mergeTextField('rateB', 'endpointRate', 'rateBPriority');
		mergeTextField('reqB', 'endpointReq', 'reqBPriority');
		mergeTextField('respB', 'endpointResp', 'respBPriority');
		mergeTextField('failB', 'endpointFail', 'failBPriority');
		mergeTextField('radioNumberB', 'endpointRadioNumber', 'radioNumberBPriority');
		mergeTextField('radioMacB', 'endpointRadioMac', 'radioMacBPriority');
		mergeTextField('utilB', 'endpointUtil', 'utilBPriority');
		mergeSnrField('snrB', 'endpointSnr', 'snrBPriority');
	}

	mergeTextField('flagsA', 'flagsA', 'flagsAPriority');
	mergeTextField('flagsB', 'flagsB', 'flagsBPriority');
	mergeTextField('htA', 'htA', 'htAPriority');
	mergeTextField('htB', 'htB', 'htBPriority');
	mergeTextField('rateA', 'rateA', 'rateAPriority');
	mergeTextField('rateB', 'rateB', 'rateBPriority');
	mergeTextField('reqA', 'reqA', 'reqAPriority');
	mergeTextField('reqB', 'reqB', 'reqBPriority');
	mergeTextField('respA', 'respA', 'respAPriority');
	mergeTextField('respB', 'respB', 'respBPriority');
	mergeTextField('failA', 'failA', 'failAPriority');
	mergeTextField('failB', 'failB', 'failBPriority');
	mergeTextField('radioNumberA', 'radioNumberA', 'radioNumberAPriority');
	mergeTextField('radioNumberB', 'radioNumberB', 'radioNumberBPriority');
	mergeTextField('radioMacA', 'radioMacA', 'radioMacAPriority');
	mergeTextField('radioMacB', 'radioMacB', 'radioMacBPriority');
	mergeTextField('utilA', 'utilA', 'utilAPriority');
	mergeTextField('utilB', 'utilB', 'utilBPriority');
	mergeSnrField('snrA', 'snrA', 'snrAPriority');
	mergeSnrField('snrB', 'snrB', 'snrBPriority');
}

function upsertGraphEdge(edge) {
	if (edge.relation === 'B') return;
	if (edge.sourceId === edge.targetId) return;

	var pairKey = getPairKey(edge.sourceId, edge.targetId);
	var foundIndex = -1;
	for (var i = 0; i < meshGraph.edges.length; i++) {
		if (meshGraph.edges[i].pairKey === pairKey) {
			foundIndex = i;
			break;
		}
	}

	if (foundIndex === -1) {
		mergeEdgeDirectionalFields(edge, edge);
		meshGraph.edges.push(edge);
		return;
	}

	var existing = meshGraph.edges[foundIndex];
	mergeEdgeDirectionalFields(existing, edge);
	var existingPriority = relationPriority(existing.relation);
	var newPriority = relationPriority(edge.relation);

	if (newPriority > existingPriority) {
		mergeEdgeDirectionalFields(edge, existing);
		meshGraph.edges[foundIndex] = edge;
	}
}

function parseMeshRelation(relationText) {
	var cleaned = String(relationText || '').trim();
	if (!cleaned) {
		return { relation: 'N', relationAge: '' };
	}
	var parts = cleaned.split(/\s+/);
	return {
		relation: parts[0].toUpperCase(),
		relationAge: parts.slice(1).join(' ')
	};
}

function parseMeshNeighboursOutput(serial, outputText) {
	var results = [];
	if (!outputText) return results;

	var lines = String(outputText).split('\n');
	var inRows = false;

	for (var i = 0; i < lines.length; i++) {
		var line = lines[i].replace(/\r/g, '');
		var trimmed = line.trim();

		if (!trimmed) {
			if (inRows) break;
			continue;
		}

		if (trimmed.indexOf('Radio') === 0 && trimmed.indexOf('Relation') !== -1) {
			inRows = true;
			continue;
		}

		if (!inRows) continue;
		if (trimmed.indexOf('-----') === 0) continue;
		if (trimmed.indexOf('Total count:') === 0) break;

		var columns = trimmed.split(/\s{2,}/);
		if (columns.length < 16) continue;

		var relationInfo = parseMeshRelation(columns[9]);

		var tailColumns = columns.slice(12).map(function(value) {
			return String(value || '').trim();
		}).filter(function(value) {
			return value !== '';
		});

		var rateTxRx = '-';
		var aReq = '-';
		var aResp = '-';
		var aFail = '-';
		var htDetails = '-';

		var rateIndex = -1;
		for (var t = 0; t < tailColumns.length; t++) {
			if (/^\d+\s*\/\s*\d+$/i.test(tailColumns[t])) {
				rateIndex = t;
				break;
			}
		}

		if (rateIndex === -1 && tailColumns.length > 0) {
			rateIndex = 0;
		}

		if (rateIndex !== -1) {
			rateTxRx = tailColumns[rateIndex];
			tailColumns.splice(rateIndex, 1);
		}

		var numericValues = [];
		for (var n = 0; n < tailColumns.length; n++) {
			if (/^-?\d+$/.test(tailColumns[n])) {
				numericValues.push(tailColumns[n]);
			}
		}

		aReq = numericValues.length > 0 ? numericValues[0] : '-';
		aResp = numericValues.length > 1 ? numericValues[1] : '-';
		aFail = numericValues.length > 2 ? numericValues[2] : '-';

		for (var h = 0; h < tailColumns.length; h++) {
			if (!/^-?\d+$/.test(tailColumns[h])) {
				htDetails = tailColumns[h];
				break;
			}
		}

		var rateSplit = String(rateTxRx || '-').split('/');
		var txRate = rateSplit.length > 0 ? rateSplit[0] : '-';
		var rxRate = rateSplit.length > 1 ? rateSplit[1] : '-';

		results.push({
			serial: serial,
			radio: columns[0],
			neighbourMac: columns[1],
			apName: columns[2],
			portalMac: columns[3],
			channel: columns[4],
			band: columns[5],
			age: columns[6],
			hops: columns[7],
			cost: columns[8],
			relation: relationInfo.relation,
			relationAge: relationInfo.relationAge,
			flags: columns[10],
			snr: parseFloat(columns[11]),
			htDetails: htDetails,
			rateTxRx: rateTxRx,
			txRate: txRate,
			rxRate: rxRate,
			aReq: aReq,
			aResp: aResp,
			aFail: aFail
		});
	}

	return results;
}

function buildNodeFromAP(serial) {
	var ap = getAPBySerial(serial);
	if (!ap) {
		return {
			id: serial,
			serial: serial,
			name: serial,
			status: 'UNKNOWN',
			model: '-',
			site: '-'
		};
	}

	var site = getSiteForId(ap.siteId);
	return {
		id: serial,
		serial: serial,
		name: ap.deviceName || serial,
		status: ap.status || 'UNKNOWN',
		model: ap.model || '-',
		site: site ? site.siteName : '-'
	};
}

function getEdgeBandColor(edge) {
	var bandKey = getBandKeyFromString(edge.band);
	return meshBandColors[bandKey] || meshBandColors['5'];
}

function getSNRColor(snrValue) {
	if (isNaN(snrValue)) return meshChartColors.secondary;
	if (snrValue < 15) return meshChartColors.danger;
	if (snrValue <= 25) return meshChartColors.warning;
	return meshChartColors.success;
}

function getPathlossColor(pathlossValue) {
	if (pathlossValue === null || pathlossValue === undefined || isNaN(pathlossValue)) return meshChartColors.body || meshChartColors.secondary;
	if (pathlossValue < 70) return meshChartColors.success;
	if (pathlossValue < 90) return meshChartColors.warning;
	if (pathlossValue < 110) return meshChartColors.danger;
	return meshChartColors.body || meshChartColors.secondary;
}

async function fetchMeshPathlossForRadio(radioMac, currentOffset) {
	if (!radioMac) return [];
	var normalizedRadioMac = normalizeMacAddress(radioMac);
	if (!normalizedRadioMac) return [];
	if (currentOffset === undefined) currentOffset = 0;

	if (currentOffset === 0) {
		var cached = meshPathlossCacheByRadio[normalizedRadioMac];
		if (cached && cached.expiresAt > Date.now()) {
			return cached.items;
		}

		if (meshPathlossRequestsByRadio[normalizedRadioMac]) {
			return meshPathlossRequestsByRadio[normalizedRadioMac];
		}
	}

	var requestPromise = (async function(offset) {
		var items = [];
		var nextOffset = offset;

		while (true) {
			var commandResults = await fetchProxyWithAuth('/tools/getCommandwHeaders', {
				url: localStorage.getItem('base_url') + '/network-services/v1/airmatch-pathloss/' + normalizedRadioMac + '?limit=' + airMatchLimit + '&offset=' + nextOffset,
				access_token: localStorage.getItem('access_token'),
			});

			var result = processStatus(commandResults);
			if (result == 429) {
				await new Promise(function(resolve) { setTimeout(resolve, apiWaitDelay); });
				continue;
			}

			if (result !== 200) {
				throw new Error('Failed retrieve RF Neighbours for ' + normalizedRadioMac);
			}

			var response = JSON.parse(commandResults.responseBody || '[]');
			items = items.concat(Array.isArray(response) ? response : []);

			if (!Array.isArray(response) || response.length < airMatchLimit) {
				break;
			}

			nextOffset += airMatchLimit;
		}

		meshPathlossCacheByRadio[normalizedRadioMac] = {
			expiresAt: Date.now() + meshPathlossCacheTTLms,
			items: items,
		};

		return items;
	})(currentOffset);

	if (currentOffset === 0) {
		meshPathlossRequestsByRadio[normalizedRadioMac] = requestPromise;
	}

	try {
		return await requestPromise;
	} finally {
		if (currentOffset === 0) {
			delete meshPathlossRequestsByRadio[normalizedRadioMac];
		}
	}
}

function ensureMeshEdgePathloss(edge) {
	if (!edge) return;
	var oppositeMacA = normalizeMacAddress(edge.radioMacB);
	var oppositeMacB = normalizeMacAddress(edge.radioMacA);
	if (!edge.radioMacA) edge.pathlossAResolved = true;
	if (!edge.radioMacB) edge.pathlossBResolved = true;

	if (edge.pathlossAResolved !== true && edge.pathlossAResolved !== 'pending' && edge.radioMacA) {
		edge.pathlossAResolved = 'pending';
		fetchMeshPathlossForRadio(edge.radioMacA, 0).then(function(items) {
			var match = (items || []).find(function(item) {
				return normalizeMacAddress(item['nbr_mac']) === oppositeMacA;
			});
			edge.pathlossA = match ? parseFloat(match['pathloss']) : null;
			edge.pathlossAResolved = true;
			updateSelectedEdgeDetails();
			renderMeshViews();
		}).catch(function() {
			edge.pathlossA = null;
			edge.pathlossAResolved = true;
			updateSelectedEdgeDetails();
			renderMeshViews();
		});
	}

	if (edge.pathlossBResolved !== true && edge.pathlossBResolved !== 'pending' && edge.radioMacB) {
		edge.pathlossBResolved = 'pending';
		fetchMeshPathlossForRadio(edge.radioMacB, 0).then(function(items) {
			var match = (items || []).find(function(item) {
				return normalizeMacAddress(item['nbr_mac']) === oppositeMacB;
			});
			edge.pathlossB = match ? parseFloat(match['pathloss']) : null;
			edge.pathlossBResolved = true;
			updateSelectedEdgeDetails();
			renderMeshViews();
		}).catch(function() {
			edge.pathlossB = null;
			edge.pathlossBResolved = true;
			updateSelectedEdgeDetails();
			renderMeshViews();
		});
	}
}

function getEdgeStrokeColor(edge) {
	if (getMeshOverlayValue() === 'SNR') {
		var snrA = (edge.snrA !== null && edge.snrA !== undefined && !isNaN(edge.snrA)) ? edge.snrA : null;
		var snrB = (edge.snrB !== null && edge.snrB !== undefined && !isNaN(edge.snrB)) ? edge.snrB : null;
		var snrValue = edge.snr;
		if (snrA !== null && snrB !== null) {
			snrValue = (snrA + snrB) / 2;
		} else if (snrA !== null) {
			snrValue = snrA;
		} else if (snrB !== null) {
			snrValue = snrB;
		}
		return getSNRColor(snrValue);
	}
	if (getMeshOverlayValue() === 'PATHLOSS') {
		ensureMeshEdgePathloss(edge);
		var pathlossA = edge.pathlossAResolved === true ? edge.pathlossA : null;
		var pathlossB = edge.pathlossBResolved === true ? edge.pathlossB : null;
		var pathlossValue = null;
		if (pathlossA !== null && pathlossA !== undefined && !isNaN(pathlossA) && pathlossB !== null && pathlossB !== undefined && !isNaN(pathlossB)) {
			pathlossValue = (pathlossA + pathlossB) / 2;
		} else if (pathlossA !== null && pathlossA !== undefined && !isNaN(pathlossA)) {
			pathlossValue = pathlossA;
		} else if (pathlossB !== null && pathlossB !== undefined && !isNaN(pathlossB)) {
			pathlossValue = pathlossB;
		}
		return getPathlossColor(pathlossValue);
	}
	return getEdgeBandColor(edge);
}

function getMeshChildSideForEdge(edge) {
	if (!edge) return 'B';
	var parentId = edge.sourceId;
	if (edge.relation === 'P') {
		parentId = edge.targetId;
	}
	return edge.sourceId === parentId ? 'B' : 'A';
}

function getMeshCoordinatesForNode(nodeId) {
	var node = meshGraph.nodes[nodeId];
	if (!node || !node.serial) return null;
	var geo = meshGeoBySerial[node.serial];
	if (!geo) return null;
	if (!isFinite(geo.latitude) || !isFinite(geo.longitude)) return null;
	return geo;
}

function getMeshEdgeDistanceMeters(edge) {
	if (!edge) return null;
	var sourceGeo = getMeshCoordinatesForNode(edge.sourceId);
	var targetGeo = getMeshCoordinatesForNode(edge.targetId);
	if (!sourceGeo || !targetGeo) return null;

	if (typeof L !== 'undefined' && L.latLng) {
		return L.latLng(sourceGeo.latitude, sourceGeo.longitude).distanceTo(L.latLng(targetGeo.latitude, targetGeo.longitude));
	}

	var earthRadiusMeters = 6371000;
	var toRadians = function(degrees) {
		return degrees * (Math.PI / 180);
	};
	var lat1 = toRadians(sourceGeo.latitude);
	var lon1 = toRadians(sourceGeo.longitude);
	var lat2 = toRadians(targetGeo.latitude);
	var lon2 = toRadians(targetGeo.longitude);
	var deltaLat = lat2 - lat1;
	var deltaLon = lon2 - lon1;
	var a = Math.sin(deltaLat / 2) * Math.sin(deltaLat / 2) +
		Math.cos(lat1) * Math.cos(lat2) * Math.sin(deltaLon / 2) * Math.sin(deltaLon / 2);
	var c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
	return earthRadiusMeters * c;
}

function getMeshLongDistanceSummary() {
	var summary = {
		totalMeasuredLinks: 0,
		longLinkCount: 0,
		maxDistanceMeters: null,
		longLinks: [],
	};

	(meshGraph.edges || []).forEach(function(edge) {
		var distanceMeters = getMeshEdgeDistanceMeters(edge);
		if (distanceMeters === null || distanceMeters === undefined || !isFinite(distanceMeters)) return;

		summary.totalMeasuredLinks++;
		if (summary.maxDistanceMeters === null || distanceMeters > summary.maxDistanceMeters) {
			summary.maxDistanceMeters = distanceMeters;
		}
		if (distanceMeters > meshLongDistanceThresholdMeters) {
			summary.longLinkCount++;

			var sourceNode = meshGraph.nodes[edge.sourceId] || null;
			var targetNode = meshGraph.nodes[edge.targetId] || null;
			var sourceAP = sourceNode && sourceNode.serial ? getAPBySerial(sourceNode.serial) : null;
			var targetAP = targetNode && targetNode.serial ? getAPBySerial(targetNode.serial) : null;

			summary.longLinks.push({
				edgeId: edge.id,
				distanceMeters: distanceMeters,
				band: edge.band || '-',
				source: {
					nodeId: edge.sourceId,
					serial: sourceNode ? sourceNode.serial : null,
					name: sourceNode ? sourceNode.name : edge.sourceId,
					siteId: sourceAP ? sourceAP.siteId : null,
					model: sourceAP ? sourceAP.model : null,
					meshRole: sourceAP ? sourceAP.meshRole : null,
				},
				target: {
					nodeId: edge.targetId,
					serial: targetNode ? targetNode.serial : null,
					name: targetNode ? targetNode.name : edge.targetId,
					siteId: targetAP ? targetAP.siteId : null,
					model: targetAP ? targetAP.model : null,
					meshRole: targetAP ? targetAP.meshRole : null,
				},
			});
		}
	});

	return summary;
}

function clearMeshDistanceAnalysisUI() {
	var analysisEl = document.getElementById('mesh-distance-analysis');
	if (!analysisEl) return;
	analysisEl.innerHTML = '';
	analysisEl.classList.add('d-none');
}

function updateMeshDistanceSummaryToggleButton(isLongDistanceActive) {
	var toggleBtn = document.getElementById('mesh-distance-summary-toggle-btn');
	if (!toggleBtn) return;

	if (!isLongDistanceActive) {
		toggleBtn.classList.add('d-none');
		toggleBtn.setAttribute('aria-expanded', 'false');
		return;
	}

	toggleBtn.classList.remove('d-none');
	toggleBtn.textContent = meshShowDistanceAnalysis ? 'Hide Impact Summary' : 'Show Impact Summary';
	toggleBtn.setAttribute('aria-expanded', meshShowDistanceAnalysis ? 'true' : 'false');
}

function ensureMeshDistanceSummaryToggleBinding() {
	var toggleBtn = document.getElementById('mesh-distance-summary-toggle-btn');
	if (!toggleBtn || toggleBtn.dataset.bound === 'true') return;

	toggleBtn.addEventListener('click', function() {
		meshShowDistanceAnalysis = !meshShowDistanceAnalysis;
		var analysisEl = document.getElementById('mesh-distance-analysis');
		if (analysisEl) {
			if (meshShowDistanceAnalysis && analysisEl.innerHTML) {
				analysisEl.classList.remove('d-none');
			} else {
				analysisEl.classList.add('d-none');
			}
		}
		updateMeshDistanceSummaryToggleButton(true);
	});

	toggleBtn.dataset.bound = 'true';
}

function setMeshDistanceAnalysisLoading() {
	var analysisEl = document.getElementById('mesh-distance-analysis');
	if (!analysisEl) return;
	analysisEl.innerHTML = '<div class="alert alert-light text-dark mb-0">Analyzing impacted RF profiles for long-distance links...</div>';
	if (meshShowDistanceAnalysis) {
		analysisEl.classList.remove('d-none');
	} else {
		analysisEl.classList.add('d-none');
	}
}

function getMeshRadioProfileForBand(bandValue) {
	var bandKey = getBandKeyFromString(bandValue);
	if (bandKey === '2') return 'RADIO_2DOT4G';
	if (bandKey === '6') return 'RADIO_6G';
	return 'RADIO_5G';
}

function getMeshRadioBandLabelFromProfile(radioProfile) {
	if (radioProfile === 'RADIO_2DOT4G') return '2.4GHz';
	if (radioProfile === 'RADIO_6G') return '6Ghz';
	return '5Ghz';
}

function getMeshAPNameForSerial(serial) {
	if (!serial) return '-';
	var ap = getAPBySerial(serial);
	if (!ap) return serial;
	return ap.deviceName || ap.serialNumber || serial;
}

function getMeshAPNameListFromSerials(serials) {
	if (!Array.isArray(serials) || serials.length === 0) return [];
	var names = [];
	serials.forEach(function(serial) {
		var name = getMeshAPNameForSerial(serial);
		if (name && names.indexOf(name) === -1) names.push(name);
	});
	return names;
}

function getMeshProfileAnnotation(profileObj) {
	var annotation = profileObj && profileObj['@'] ? profileObj['@'] : {};
	var scopeDeviceFunctionRaw = annotation['aruba-annotation:scope_device_function'];
	var parsedScopeDeviceFunction = null;

	if (scopeDeviceFunctionRaw) {
		if (Array.isArray(scopeDeviceFunctionRaw)) {
			parsedScopeDeviceFunction = scopeDeviceFunctionRaw[0] || null;
		} else if (typeof scopeDeviceFunctionRaw === 'string') {
			try {
				parsedScopeDeviceFunction = JSON.parse(String(scopeDeviceFunctionRaw).replace(/'/g, '"'));
				if (Array.isArray(parsedScopeDeviceFunction)) {
					parsedScopeDeviceFunction = parsedScopeDeviceFunction[0] || null;
				}
			} catch (_ignore) {
				parsedScopeDeviceFunction = null;
			}
		} else if (typeof scopeDeviceFunctionRaw === 'object') {
			parsedScopeDeviceFunction = scopeDeviceFunctionRaw;
		}
	}

	return {
		isEditable: annotation['aruba-annotation:is_editable'] === true,
		isDefault: annotation['aruba-annotation:is_default'] === true,
		objectType: String(annotation['aruba-annotation:object_type'] || '').toUpperCase(),
		inherited: annotation['aruba-annotation:inherited'] === true,
		profileScopeId: parsedScopeDeviceFunction && parsedScopeDeviceFunction.scope_id ? String(parsedScopeDeviceFunction.scope_id) : null,
		profileDeviceFunction: parsedScopeDeviceFunction && parsedScopeDeviceFunction.device_function ? String(parsedScopeDeviceFunction.device_function) : null,
	};
}

function getMeshScopeIdForSerial(serial) {
	if (!serial) return null;
	var inventoryDevice = findDeviceInInventory(serial);
	if (!inventoryDevice) return null;
	return inventoryDevice.scopeId || null;
}

async function fetchMeshRFProfilesForScope(scopeId, forceRefresh) {
	if (!scopeId) return [];
	var scopeKey = String(scopeId);
	var now = Date.now();
	var cached = meshRFProfilesByScopeCache[scopeKey];

	if (!forceRefresh && cached && cached.expiresAt > now) {
		return cached.items;
	}

	if (meshRFProfilesByScopeRequests[scopeKey]) {
		return meshRFProfilesByScopeRequests[scopeKey];
	}

	meshRFProfilesByScopeRequests[scopeKey] = (async function() {
		while (true) {
			var commandResults = await fetchProxyWithAuth('/tools/getCommandwHeaders', {
				url: localStorage.getItem('base_url') + '/network-config/v1/radios?view-type=LOCAL&scope-id=' + encodeURIComponent(scopeKey) + '&effective=true&detailed=true',
				access_token: localStorage.getItem('access_token'),
			});

			var status = processStatus(commandResults);
			if (status === 429 || status === 503) {
				await new Promise(function(resolve) { setTimeout(resolve, apiWaitDelay); });
				continue;
			}

			if (status !== 200) {
				throw new Error('Failed to retrieve RF profiles for scope ' + scopeKey + ' (HTTP ' + status + ')');
			}

			var payload = JSON.parse(commandResults.responseBody || '{}');
			var items = Array.isArray(payload.profile) ? payload.profile : [];
			meshRFProfilesByScopeCache[scopeKey] = {
				expiresAt: Date.now() + meshRFProfileCacheTTLms,
				items: items,
			};
			return items;
		}
	})();

	try {
		return await meshRFProfilesByScopeRequests[scopeKey];
	} finally {
		delete meshRFProfilesByScopeRequests[scopeKey];
	}
}

async function refreshMeshDistanceAnalysisForAPs(apSerials) {
	var serialList = Array.isArray(apSerials) ? apSerials : [];
	var scopeIds = [];
	var failedScopeIds = [];

	serialList.forEach(function(serial) {
		var scopeId = getMeshScopeIdForSerial(serial);
		if (!scopeId) return;
		var scopeKey = String(scopeId);
		if (scopeIds.indexOf(scopeKey) === -1) scopeIds.push(scopeKey);
	});

	await Promise.all(scopeIds.map(async function(scopeId) {
		try {
			await fetchMeshRFProfilesForScope(scopeId, true);
		} catch (err) {
			console.error('[Mesh RF Refresh] Failed scope refresh', scopeId, err);
			failedScopeIds.push(scopeId);
		}
	}));

	var summary = getMeshLongDistanceSummary();
	refreshMeshLongDistanceRFAnalysis(summary);

	return {
		scopeCount: scopeIds.length,
		failedScopeIds: failedScopeIds,
	};
}

function renderMeshDistanceAnalysis(analysis) {
	var analysisEl = document.getElementById('mesh-distance-analysis');
	if (!analysisEl) return;

	if (!analysis || !analysis.profileSummaries || analysis.profileSummaries.length === 0) {
		meshSharedPatchActionMap = {};
		analysisEl.innerHTML = '<div class="alert alert-light text-dark mb-0">No editable RF profile candidates were identified from long-distance links yet.</div>';
		if (meshShowDistanceAnalysis) {
			analysisEl.classList.remove('d-none');
		} else {
			analysisEl.classList.add('d-none');
		}
		return;
	}

	var blockedAPNames = getMeshAPNameListFromSerials(analysis.blockedAPSerials || []);
	var sharedAPNames = getMeshAPNameListFromSerials(analysis.sharedImpactAPSerials || []);

	var blockedText = blockedAPNames.length > 0
		? 'Blocked APs: ' + blockedAPNames.map(escapeHtml).join(', ')
		: 'Blocked APs: None';
	var sharedText = sharedAPNames.length > 0
		? 'Shared-profile impact APs: ' + sharedAPNames.map(escapeHtml).join(', ')
		: 'Shared-profile impact APs: None';
	var actionMap = {};

	var rowsHtml = analysis.profileSummaries.map(function(item) {
		var stateIcon = item.canModify
			? '<i class="fa-regular fa-circle-check text-success me-1" data-bs-toggle="tooltip" data-bs-placement="top" data-container="body" data-animation="true" title="Ready to apply"></i>'
			: (item.needsIncrease === false
				? '<i class="fa-regular fa-circle-check text-info me-1" data-bs-toggle="tooltip" data-bs-placement="top" data-container="body" data-animation="true" title="Already sufficient (no change needed)"></i>'
				: '<i class="fa-regular fa-circle-xmark text-danger me-1" data-bs-toggle="tooltip" data-bs-placement="top" data-container="body" data-animation="true" title="Blocked"></i>');
		var profileTypeIcon = item.isShared
			? '<i class="fa-regular fa-share-nodes me-1" data-bs-toggle="tooltip" data-bs-placement="top" data-container="body" data-animation="true" title="Library Profile"></i>'
			: '<i class="fa-regular fa-thumbtack-angle me-1" data-bs-toggle="tooltip" data-bs-placement="top" data-container="body" data-animation="true" title="Local Profile"></i>';
		var inheritedIcon = item.inherited
			? '<i class="fa-regular fa-up" data-bs-toggle="tooltip" data-bs-placement="top" data-container="body" data-animation="true" title="Inherited Profile"></i>'
			: '';
		var statusIcons = stateIcon + profileTypeIcon + inheritedIcon;
		var proposedValue = item.proposedMaxDistanceMeters === null ? 'N/A' : (Math.round(item.proposedMaxDistanceMeters) + ' m');
		var apNames = getMeshAPNameListFromSerials(item.apSerials || []);
		var apList = apNames.length > 0 ? apNames.map(escapeHtml).join(', ') : '-';
		var statusDetail = item.blockReason
			? escapeHtml(item.blockReason)
			: (item.inherited
				? 'Inherited profile: update may impact multiple APs at this scope'
				: (item.isShared ? 'Shared profile: change may affect multiple APs' : 'Ready to apply'));
		var radioBandLabel = getMeshRadioBandLabelFromProfile(item.radioProfile);
		var actionKey = item.profileIdentity;
		var actionButtonHtml = '<button type="button" class="btn btn-sm btn-outline-secondary mb-0" disabled>Apply</button>';

		if (item.canModify && item.profileName && item.profileName !== '(unnamed-profile)' && !item.blockReason) {
			actionMap[actionKey] = {
				actionKey: actionKey,
				profileName: item.profileName,
				radioProfile: item.radioProfile,
				objectType: item.objectType,
				profileScopeId: item.profileScopeId,
				profileDeviceFunction: item.profileDeviceFunction,
				maxDistance: item.proposedMaxDistanceMeters,
				impactedAPNames: apNames,
				impactedAPSerials: item.apSerials || [],
			};
			actionButtonHtml = '<button type="button" class="btn btn-sm btn-info mb-0 mesh-apply-shared-profile-btn" data-mesh-action-key="' + escapeHtml(actionKey) + '">Apply</button>';
		}

		return '<tr>' +
			'<td>' + escapeHtml(item.profileName) + '</td>' +
			'<td>' + escapeHtml(radioBandLabel) + '</td>' +
			'<td>' + proposedValue + '</td>' +
			'<td>' + statusIcons + '</td>' +
			'<td>' + statusDetail + '</td>' +
			'<td>' + apList + '</td>' +
			'<td class="text-end">' + actionButtonHtml + '</td>' +
		'</tr>';
	}).join('');

	meshSharedPatchActionMap = actionMap;

	analysisEl.innerHTML = '' +
		'<div class="alert alert-light text-dark mb-2">' +
			'<strong>RF Profile Impact Summary</strong><br>' +
			'Profiles checked: ' + analysis.profileSummaries.length + '<br>' +
			'Profiles ready to modify: ' + analysis.modifiableProfileCount + '<br>' +
			blockedText + '<br>' +
			sharedText +
		'</div>' +
		'<div class="table-responsive">' +
			'<table class="table table-sm align-items-center mb-0">' +
				'<thead><tr><th>Profile</th><th>Radio</th><th>Proposed max-distance</th><th>Status</th><th>Reason</th><th>APs</th><th class="text-end">Action</th></tr></thead>' +
				'<tbody>' + rowsHtml + '</tbody>' +
			'</table>' +
		'</div>';

	analysisEl.querySelectorAll('[data-bs-toggle="tooltip"]').forEach(function(el) {
		new bootstrap.Tooltip(el);
	});
	bindMeshDistanceAnalysisActions();
	if (meshShowDistanceAnalysis) {
		analysisEl.classList.remove('d-none');
	} else {
		analysisEl.classList.add('d-none');
	}
}

async function patchMeshSharedProfile(action) {
	if (!action || !action.profileName || !action.radioProfile || !isFinite(action.maxDistance)) {
		throw new Error('Invalid shared profile action payload');
	}

	var endpoint = '/network-config/v1/radios/' + encodeURIComponent(action.profileName);
	if (String(action.objectType || '').toUpperCase() === 'LOCAL') {
		if (!action.profileScopeId || !action.profileDeviceFunction) {
			throw new Error('LOCAL profile PATCH requires scope-id and device-function metadata');
		}
		endpoint += '?object-type=LOCAL&scope-id=' + encodeURIComponent(action.profileScopeId) + '&device-function=' + encodeURIComponent(action.profileDeviceFunction);
	}
	var payload = {
		radio: [
			{
				'max-distance': Math.ceil(action.maxDistance),
				profile: action.radioProfile,
			}
		]
	};

	while (true) {
		var commandResults = await fetchProxyWithAuth('/tools/patchCommandwHeaders', {
			url: localStorage.getItem('base_url') + endpoint,
			access_token: localStorage.getItem('access_token'),
			data: JSON.stringify(payload),
		});

		var status = processStatus(commandResults);
		if (status === 429 || status === 503) {
			await new Promise(function(resolve) { setTimeout(resolve, apiWaitDelay); });
			continue;
		}

		if (status !== 200 && status !== 202) {
			var errorMessage = 'PATCH failed with HTTP ' + status;
			try {
				var responseBody = JSON.parse(commandResults.responseBody || '{}');
				if (responseBody && responseBody.message) errorMessage = responseBody.message;
			} catch (_ignore) {}
			throw new Error(errorMessage);
		}

		return {
			status: status,
			endpoint: endpoint,
			payload: payload,
		};
	}
}

function bindMeshDistanceAnalysisActions() {
	var buttons = document.querySelectorAll('.mesh-apply-shared-profile-btn');
	buttons.forEach(function(button) {
		if (button.dataset.bound === 'true') return;

		button.addEventListener('click', async function() {
			var actionKey = button.getAttribute('data-mesh-action-key');
			if (!actionKey || !meshSharedPatchActionMap[actionKey]) return;
			if (meshSharedPatchInFlight[actionKey]) return;

			var action = meshSharedPatchActionMap[actionKey];
			var profileType = String(action.objectType || 'SHARED').toUpperCase();
			var isLocalProfile = profileType === 'LOCAL';
			var profileTypeLabel = isLocalProfile ? 'LOCAL' : 'SHARED';
			var actionLabel = profileTypeLabel + ' RF profile update';
			var apImpactSummary = (action.impactedAPNames && action.impactedAPNames.length > 0)
				? action.impactedAPNames.join(', ')
				: 'all APs using this profile';
			var confirmMessage = 'Apply ' + profileTypeLabel + ' RF profile update?\n\n' +
				'Profile Type: ' + profileTypeLabel + '\n' +
				'Profile: ' + action.profileName + '\n' +
				'Radio: ' + action.radioProfile + '\n' +
				'Max distance: ' + Math.ceil(action.maxDistance) + ' m\n\n' +
				'Impact: ' + apImpactSummary;
			if (isLocalProfile && action.profileScopeId && action.profileDeviceFunction) {
				confirmMessage += '\nScope: ' + action.profileScopeId + '\nDevice Function: ' + action.profileDeviceFunction;
			}

			var confirmation = await Swal.fire({
				title: 'Apply ' + profileTypeLabel + ' RF Profile Update?',
				html: confirmMessage.replace(/\n/g, '<br>'),
				icon: 'question',
				showCancelButton: true,
				confirmButtonColor: '#3085d6',
				cancelButtonColor: '#888888',
				confirmButtonText: 'Yes, Apply',
				cancelButtonText: 'Cancel',
			});
			if (confirmation.isDismissed) return;

			meshSharedPatchInFlight[actionKey] = true;
			button.disabled = true;
			var saveNotification = showProgressNotification('ca-mesh', 'Applying ' + actionLabel + '...', 'bottom', 'center', 'info');

			try {
				var patchResult = await patchMeshSharedProfile(action);
				if (saveNotification) {
					saveNotification.update({ message: 'Rechecking affected AP RF profiles...', progress: 80 });
				}
				var refreshResult = await refreshMeshDistanceAnalysisForAPs(action.impactedAPSerials || []);
				console.log('[Mesh RF Patch]', {
					action: action,
					result: patchResult,
					refresh: refreshResult,
				});
				if (saveNotification) {
					saveNotification.update({ type: 'success', message: profileTypeLabel + ' profile updated: ' + action.profileName + '. UI refreshed.', progress: 100 });
					setTimeout(function() { if (saveNotification) saveNotification.close(); }, 1200);
				}
				if (refreshResult.failedScopeIds.length > 0) {
					showNotification('ca-mesh', profileTypeLabel + ' RF profile updated: ' + action.profileName + ' (' + action.radioProfile + '). Recheck failed for ' + refreshResult.failedScopeIds.length + ' scope(s).', 'bottom', 'center', 'warning');
				} else {
					showNotification('ca-mesh', profileTypeLabel + ' RF profile updated: ' + action.profileName + ' (' + action.radioProfile + '). Recheck complete.', 'bottom', 'center', 'success');
				}
			} catch (err) {
				if (saveNotification) {
					saveNotification.update({ type: 'danger', message: 'Failed to update ' + profileTypeLabel + ' profile: ' + action.profileName });
					setTimeout(function() { if (saveNotification) saveNotification.close(); }, 1800);
				}
				showNotification('ca-mesh', 'Unable to update ' + profileTypeLabel + ' profile: ' + err.message, 'bottom', 'center', 'danger');
			} finally {
				delete meshSharedPatchInFlight[actionKey];
				button.disabled = false;
			}
		});

		button.dataset.bound = 'true';
	});
}

function logMeshDryRunPatchPreview(analysis) {
	if (!analysis || !Array.isArray(analysis.profileSummaries)) return;

	var patchPreview = [];
	analysis.profileSummaries.forEach(function(item) {
		if (!item || !item.canModify) return;
		if (!item.profileName || item.profileName === '(unnamed-profile)') return;
		if (String(item.objectType || '').toUpperCase() === 'LOCAL' && (!item.profileScopeId || !item.profileDeviceFunction)) return;

		var endpoint = '/network-config/v1/radios/' + encodeURIComponent(item.profileName);
		if (String(item.objectType || '').toUpperCase() === 'LOCAL') {
			endpoint += '?object-type=LOCAL&scope-id=' + encodeURIComponent(item.profileScopeId) + '&device-function=' + encodeURIComponent(item.profileDeviceFunction);
		}

		patchPreview.push({
			mode: 'SHARED_PROFILE_UPDATE',
			plannedMode: 'LOCAL_COPY_PER_AP',
			profileName: item.profileName,
			radioProfile: item.radioProfile,
			objectType: item.objectType,
			inherited: item.inherited === true,
			profileScopeId: item.profileScopeId,
			profileDeviceFunction: item.profileDeviceFunction,
			proposedMaxDistance: item.proposedMaxDistanceMeters,
			endpoint: endpoint,
			method: 'PATCH',
			impactedAPs: (item.apSerials || []).map(function(serial) { return getMeshAPNameForSerial(serial); }),
			payload: {
				radio: [
					{
						'max-distance': item.proposedMaxDistanceMeters,
						profile: item.radioProfile,
					}
				]
			}
		});
	});

	if (patchPreview.length === 0) {
		console.log('[Mesh RF Dry-Run] No modifiable RF profile payloads generated.');
		return;
	}

	console.groupCollapsed('[Mesh RF Dry-Run] PATCH payload preview (' + patchPreview.length + ' request(s))');
	patchPreview.forEach(function(entry, index) {
		console.log('#' + (index + 1), entry);
	});
	console.groupEnd();
}

async function analyzeMeshLongDistanceRFProfiles(summary, token) {
	var apBandDistance = {};

	(summary.longLinks || []).forEach(function(link) {
		var radioProfile = getMeshRadioProfileForBand(link.band);
		['source', 'target'].forEach(function(side) {
			var endpoint = link[side];
			if (!endpoint || !endpoint.serial) return;
			var key = endpoint.serial + '::' + radioProfile;
			if (!apBandDistance[key]) {
				apBandDistance[key] = {
					serial: endpoint.serial,
					radioProfile: radioProfile,
					maxDistanceMeters: link.distanceMeters,
					linkIds: [link.edgeId],
				};
				return;
			}
			if (link.distanceMeters > apBandDistance[key].maxDistanceMeters) {
				apBandDistance[key].maxDistanceMeters = link.distanceMeters;
			}
			if (apBandDistance[key].linkIds.indexOf(link.edgeId) === -1) {
				apBandDistance[key].linkIds.push(link.edgeId);
			}
		});
	});

	var requirements = Object.keys(apBandDistance).map(function(key) {
		return apBandDistance[key];
	});

	var groupedByScope = {};
	var missingScopeAPSerials = [];

	requirements.forEach(function(req) {
		var scopeId = getMeshScopeIdForSerial(req.serial);
		if (!scopeId) {
			if (missingScopeAPSerials.indexOf(req.serial) === -1) missingScopeAPSerials.push(req.serial);
			return;
		}
		if (!groupedByScope[scopeId]) groupedByScope[scopeId] = [];
		groupedByScope[scopeId].push(req);
	});

	var scopeIds = Object.keys(groupedByScope);
	var scopeResults = await Promise.all(scopeIds.map(function(scopeId) {
		return fetchMeshRFProfilesForScope(scopeId, false).then(function(profiles) {
			return { scopeId: scopeId, profiles: profiles };
		}).catch(function(err) {
			console.error(err);
			return { scopeId: scopeId, profiles: [], error: err };
		});
	}));

	if (token !== meshLongDistanceRFAnalysisToken) return;

	var profileMap = {};
	var blockedAPSerials = missingScopeAPSerials.slice(0);
	var sharedImpactAPSerials = [];

	scopeResults.forEach(function(scopeResult) {
		var scopeId = scopeResult.scopeId;
		var scopeRequirements = groupedByScope[scopeId] || [];
		if (scopeRequirements.length === 0) return;

		if (scopeResult.error || !Array.isArray(scopeResult.profiles) || scopeResult.profiles.length === 0) {
			scopeRequirements.forEach(function(req) {
				if (blockedAPSerials.indexOf(req.serial) === -1) blockedAPSerials.push(req.serial);
			});
			return;
		}

		var profileObj = scopeResult.profiles[0];
		var profileName = profileObj && profileObj.name ? String(profileObj.name) : '(unnamed-profile)';
		var radios = Array.isArray(profileObj.radio) ? profileObj.radio : [];
		var annotation = getMeshProfileAnnotation(profileObj);

		scopeRequirements.forEach(function(req) {
			var matchingRadio = radios.find(function(radio) {
				return radio && radio.profile === req.radioProfile;
			});
			if (!matchingRadio) return;

			var currentMaxDistanceRaw = matchingRadio['max-distance'];
			var currentMaxDistanceMeters = Number(currentMaxDistanceRaw);
			if (!isFinite(currentMaxDistanceMeters)) currentMaxDistanceMeters = 0;
			var requiredMaxDistanceMeters = Math.ceil(req.maxDistanceMeters);

			var profileKey = profileName + '::' + req.radioProfile + '::' + annotation.objectType;
			if (annotation.objectType === 'LOCAL') {
				profileKey += '::' + (annotation.profileScopeId || 'NOSCOPE') + '::' + (annotation.profileDeviceFunction || 'NODEVICEFUNCTION');
			}
			var canPatchLocal = annotation.objectType !== 'LOCAL' || (!!annotation.profileScopeId && !!annotation.profileDeviceFunction);
			var baseEligible = annotation.isEditable && !annotation.isDefault && canPatchLocal;
			if (!profileMap[profileKey]) {
				profileMap[profileKey] = {
					profileIdentity: profileKey,
					scopeIds: [],
					profileName: profileName,
					radioProfile: req.radioProfile,
					objectType: annotation.objectType,
					inherited: annotation.inherited,
					profileScopeId: annotation.profileScopeId,
					profileDeviceFunction: annotation.profileDeviceFunction,
					isEditable: annotation.isEditable,
					isDefault: annotation.isDefault,
					isShared: annotation.objectType === 'SHARED',
					baseEligible: baseEligible,
					canModify: baseEligible,
					currentMaxDistanceMeters: currentMaxDistanceMeters,
					requiredMaxDistanceMeters: requiredMaxDistanceMeters,
					proposedMaxDistanceMeters: Math.max(currentMaxDistanceMeters, requiredMaxDistanceMeters),
					needsIncrease: requiredMaxDistanceMeters > currentMaxDistanceMeters,
					apSerials: [],
					linkIds: [],
					blockReasons: [],
					blockReason: null,
					patchCandidate: {
						name: profileName,
						profile: req.radioProfile,
						maxDistance: Math.max(currentMaxDistanceMeters, requiredMaxDistanceMeters),
					},
				};
			}

			var item = profileMap[profileKey];
			if (item.scopeIds.indexOf(String(scopeId)) === -1) item.scopeIds.push(String(scopeId));
			item.isEditable = item.isEditable && annotation.isEditable;
			item.isDefault = item.isDefault || annotation.isDefault;
			item.inherited = item.inherited || annotation.inherited;
			item.isShared = item.isShared || annotation.objectType === 'SHARED';
			item.baseEligible = item.baseEligible && baseEligible;
			if (currentMaxDistanceMeters > item.currentMaxDistanceMeters) {
				item.currentMaxDistanceMeters = currentMaxDistanceMeters;
			}
			if (requiredMaxDistanceMeters > item.requiredMaxDistanceMeters) {
				item.requiredMaxDistanceMeters = requiredMaxDistanceMeters;
			}
			item.proposedMaxDistanceMeters = Math.max(item.currentMaxDistanceMeters, item.requiredMaxDistanceMeters);
			item.needsIncrease = item.requiredMaxDistanceMeters > item.currentMaxDistanceMeters;
			item.canModify = item.baseEligible && item.needsIncrease;
			if (!annotation.isEditable && item.blockReasons.indexOf('Profile is not editable') === -1) {
				item.blockReasons.push('Profile is not editable');
			}
			if (annotation.isDefault && item.blockReasons.indexOf('Default profile (not modifiable)') === -1) {
				item.blockReasons.push('Default profile (not modifiable)');
			}
			if (!canPatchLocal && item.blockReasons.indexOf('LOCAL profile metadata missing scope/device-function') === -1) {
				item.blockReasons.push('LOCAL profile metadata missing scope/device-function');
			}

			item.patchCandidate.maxDistance = item.proposedMaxDistanceMeters;
			if (item.apSerials.indexOf(req.serial) === -1) item.apSerials.push(req.serial);
			req.linkIds.forEach(function(linkId) {
				if (item.linkIds.indexOf(linkId) === -1) item.linkIds.push(linkId);
			});

			if (!item.canModify && item.needsIncrease !== false && blockedAPSerials.indexOf(req.serial) === -1) {
				blockedAPSerials.push(req.serial);
			}
			if ((item.isShared || item.inherited) && sharedImpactAPSerials.indexOf(req.serial) === -1) {
				sharedImpactAPSerials.push(req.serial);
			}
		});
	});

	var profileSummaries = Object.keys(profileMap).map(function(key) {
		var item = profileMap[key];
		if (item.needsIncrease === false) {
			item.blockReason = 'Already sufficient: current max-distance (' + Math.round(item.currentMaxDistanceMeters) + ' m) covers required distance (' + Math.round(item.requiredMaxDistanceMeters) + ' m)';
		} else if (!item.canModify) {
			item.blockReason = item.blockReasons.length > 0 ? item.blockReasons.join('; ') : 'Profile is not editable';
		}
		return item;
	});

	profileSummaries.sort(function(a, b) {
		if (a.profileName !== b.profileName) return a.profileName.localeCompare(b.profileName);
		if (a.objectType !== b.objectType) return a.objectType.localeCompare(b.objectType);
		return a.radioProfile.localeCompare(b.radioProfile);
	});

	meshLongDistanceRFAnalysis = {
		generatedAt: Date.now(),
		profileSummaries: profileSummaries,
		blockedAPSerials: blockedAPSerials.sort(),
		sharedImpactAPSerials: sharedImpactAPSerials.sort(),
		modifiableProfileCount: profileSummaries.filter(function(item) { return item.canModify; }).length,
	};

	renderMeshDistanceAnalysis(meshLongDistanceRFAnalysis);
	logMeshDryRunPatchPreview(meshLongDistanceRFAnalysis);
}

function refreshMeshLongDistanceRFAnalysis(summary) {
	var token = ++meshLongDistanceRFAnalysisToken;
	meshLongDistanceRFAnalysis = null;
	ensureMeshDistanceSummaryToggleBinding();
	updateMeshDistanceSummaryToggleButton(true);
	setMeshDistanceAnalysisLoading();

	analyzeMeshLongDistanceRFProfiles(summary, token).catch(function(err) {
		if (token !== meshLongDistanceRFAnalysisToken) return;
		console.error(err);
		var analysisEl = document.getElementById('mesh-distance-analysis');
		if (!analysisEl) return;
		analysisEl.innerHTML = '<div class="alert alert-danger mb-0">Unable to analyze RF profile impact for long-distance links.</div>';
		if (meshShowDistanceAnalysis) {
			analysisEl.classList.remove('d-none');
		} else {
			analysisEl.classList.add('d-none');
		}
	});
}

function updateMeshDistanceBanner() {
	var banner = document.getElementById('mesh-distance-banner');
	if (!banner) return;
	var bannerMessage = document.getElementById('mesh-distance-banner-message');
	ensureMeshDistanceSummaryToggleBinding();

	var summary = getMeshLongDistanceSummary();
	if (summary.longLinkCount <= 0) {
		banner.classList.add('d-none');
		meshLongDistanceRFAnalysisToken++;
		meshLongDistanceRFAnalysis = null;
		meshShowDistanceAnalysis = false;
		updateMeshDistanceSummaryToggleButton(false);
		clearMeshDistanceAnalysisUI();
		return;
	}

	var thresholdLabel = formatMeshDistance(meshLongDistanceThresholdMeters);
	var maxDistanceLabel = summary.maxDistanceMeters !== null ? formatMeshDistance(summary.maxDistanceMeters) : 'N/A';
	var bannerText = 'Long distance mesh links are active (>' + thresholdLabel + '). It is advisable to modify the RF profile to account for distance. Detected ' + summary.longLinkCount + ' long link(s), maximum measured distance ' + maxDistanceLabel + '.';
	if (bannerMessage) {
		bannerMessage.textContent = bannerText;
	} else {
		banner.textContent = bannerText;
	}
	banner.classList.remove('d-none');
	updateMeshDistanceSummaryToggleButton(true);
	refreshMeshLongDistanceRFAnalysis(summary);
}

function formatMeshDistance(distanceMeters) {
	if (distanceMeters === null || distanceMeters === undefined || !isFinite(distanceMeters)) {
		return 'N/A';
	}

	if (distanceMeters < 1000) {
		return Math.round(distanceMeters) + ' m';
	}

	return (distanceMeters / 1000).toFixed(2) + ' km';
}

function getEdgeOverlayLines(edge) {
	var overlay = getMeshOverlayValue();
	var lines = [];
	if (overlay === 'NONE') return lines;

	var splitDirectionalValue = function(value) {
		var text = String(value || '').trim();
		if (!text || text === '-') return { a: '-', b: '-' };
		var parts = text.split('/');
		if (parts.length < 2) return { a: text, b: '-' };
		return {
			a: String(parts[0]).trim() || '-',
			b: String(parts[1]).trim() || '-'
		};
	};

	if (overlay === 'CHANNEL') {
		lines.push('Channel: ' + (edge.channel || '-'));
		lines.push('Utilization A/B: ' + (edge.utilA || '-') + '% / ' + (edge.utilB || '-') + '%');
	} else if (overlay === 'DATARATE') {
		var rateA = edge.rateA || edge.rateTxRx || edge.txRate || '-';
		var rateB = edge.rateB || edge.rateTxRx || edge.rxRate || '-';
		lines.push('Data Rate A/B: ' + rateA + ' / ' + rateB);
	} else if (overlay === 'FLAGS') {
		var flagValues = splitDirectionalValue(edge.flags);
		lines.push('Flags A/B: ' + (edge.flagsA || flagValues.a) + ' / ' + (edge.flagsB || flagValues.b));
	} else if (overlay === 'SNR') {
		var snrLineA = (edge.snrA !== null && edge.snrA !== undefined && !isNaN(edge.snrA)) ? edge.snrA : (isNaN(edge.snr) ? '-' : edge.snr);
		var snrLineB = (edge.snrB !== null && edge.snrB !== undefined && !isNaN(edge.snrB)) ? edge.snrB : (isNaN(edge.snr) ? '-' : edge.snr);
		lines.push('SNR A/B: ' + snrLineA + ' / ' + snrLineB);
	} else if (overlay === 'STABILITY') {
		var uptime = edge.relationAge || edge.age || '-';
		var childSide = getMeshChildSideForEdge(edge);
		var childFailures = getDirectionalEdgeValue(edge, 'fail', childSide, 'aFail');
		lines.push('Link Uptime: ' + uptime);
		lines.push('Association Failures: ' + getMeshDisplayValue(childFailures, '0'));
	} else if (overlay === 'DISTANCE') {
		lines.push('Distance: ' + formatMeshDistance(getMeshEdgeDistanceMeters(edge)));
	} else if (overlay === 'PATHLOSS') {
		ensureMeshEdgePathloss(edge);
		var pathlossLineA = edge.pathlossAResolved === true ? (edge.pathlossA === null || isNaN(edge.pathlossA) ? 'N/A' : edge.pathlossA + ' dB') : 'Loading...';
		var pathlossLineB = edge.pathlossBResolved === true ? (edge.pathlossB === null || isNaN(edge.pathlossB) ? 'N/A' : edge.pathlossB + ' dB') : 'Loading...';
		lines.push('Pathloss A/B: ' + pathlossLineA + ' / ' + pathlossLineB);
	}

	return lines;
}

function updateSelectedEdgeDetails() {
	var details = document.getElementById('mesh-edge-details');
	if (!details) return;

	if (!meshSelectedEdgeId) {
		details.innerHTML = 'Click a link to view selected overlay details.';
		return;
	}

	var selected = null;
	for (var i = 0; i < meshGraph.edges.length; i++) {
		if (meshGraph.edges[i].id === meshSelectedEdgeId) {
			selected = meshGraph.edges[i];
			break;
		}
	}

	if (!selected) {
		details.innerHTML = 'Click a link to view selected overlay details.';
		return;
	}

	var sourceNode = meshGraph.nodes[selected.sourceId];
	var targetNode = meshGraph.nodes[selected.targetId];
	var lines = getEdgeOverlayLines(selected);
	if (lines.length === 0) {
		details.innerHTML = 'Overlay is set to None. Select an overlay option, then click a link.';
		return;
	}

	var html = '<strong>' + escapeHtml(sourceNode.name) + ' <i class="fa-solid fa-direction-left-right"></i> ' + escapeHtml(targetNode.name) + '</strong><br>';
	html += lines.map(function(line) { return escapeHtml(line); }).join('<br>');
	details.innerHTML = html;
}

function getMeshEdgeById(edgeId) {
	for (var i = 0; i < meshGraph.edges.length; i++) {
		if (meshGraph.edges[i].id === edgeId) return meshGraph.edges[i];
	}
	return null;
}

function getDirectionalEdgeValue(edge, baseName, side, fallbackKey) {
	if (!edge) return '-';
	var key = baseName + side;
	var value = edge[key];
	if (value !== undefined && value !== null && String(value).trim() !== '') return value;
	if (fallbackKey && edge[fallbackKey] !== undefined && edge[fallbackKey] !== null && String(edge[fallbackKey]).trim() !== '') return edge[fallbackKey];
	return '-';
}

function getMeshLinkContext(edge) {
	if (!edge) return null;

	var parentId = edge.sourceId;
	var childId = edge.targetId;
	if (edge.relation === 'P') {
		parentId = edge.targetId;
		childId = edge.sourceId;
	}

	var ap1Side = edge.sourceId === parentId ? 'A' : 'B';
	var ap2Side = ap1Side === 'A' ? 'B' : 'A';

	var ap1Node = meshGraph.nodes[parentId] || null;
	var ap2Node = meshGraph.nodes[childId] || null;
	if (!ap1Node || !ap2Node) return null;

	var ap1 = ap1Node.serial ? getAPBySerial(ap1Node.serial) : null;
	var ap2 = ap2Node.serial ? getAPBySerial(ap2Node.serial) : null;

	return {
		edge: edge,
		ap1Side: ap1Side,
		ap2Side: ap2Side,
		ap1Node: ap1Node,
		ap2Node: ap2Node,
		ap1: ap1,
		ap2: ap2,
	};
}

function getMeshDisplayValue(value, fallback) {
	if (fallback === undefined) fallback = '-';
	if (value === undefined || value === null) return fallback;
	var text = String(value).trim();
	return text === '' ? fallback : text;
}

function formatMeshMacAddress(value) {
	var text = getMeshDisplayValue(value, '-');
	if (text === '-') return '-';
	return cleanMACAddress(text);
}

function buildMeshFieldRows(rows) {
	return rows.map(function(row) {
		var valueHtml = row.isHtml ? String(row.value || '') : escapeHtml(row.value);
		return '<div class="mesh-field-row"><span class="mesh-field-label">' + escapeHtml(row.label) + ':</span><span>' + valueHtml + '</span></div>';
	}).join('');
}

function getMeshAPDetailsRows(ap, node) {
	var status = ap ? getMeshDisplayValue(ap.status) : getMeshDisplayValue(node ? node.status : '-');
	var isOnline = String(status).toUpperCase() === 'ONLINE';
	var statusIcon = isOnline
		? '<i class="fa-solid fa-circle text-success"></i>'
		: '<i class="fa-solid fa-diamond text-danger"></i>';
	return [
		{ label: 'Health', value: statusIcon, isHtml: true },
		{ label: 'Serial Number', value: getMeshDisplayValue(ap ? ap.serialNumber : (node ? node.serial : '-')) },
		{ label: 'MAC Address', value: formatMeshMacAddress(ap ? ap.macAddress : (node ? node.mac : '-')) },
		{ label: 'IP Address', value: getMeshDisplayValue(ap ? (ap.ipv4 || ap.ipv6 || '-') : '-') },
		{ label: 'Model', value: getMeshDisplayValue(ap ? ap.model : (node ? node.model : '-')) },
		{ label: 'Firmware', value: getMeshDisplayValue(ap ? ap.firmwareVersion : '-') },
	];
}

var meshFlagsTooltipHtml = '<strong>R</strong> = Recovery-mode<br/>' +
	' <strong>S</strong> = Sub-threshold link<br/>' +
	' <strong>D</strong> = Reselection backoff<br/>' +
	' <strong>F</strong> = Auth-failure<br/>' +
	' <strong>H</strong> = High Throughput<br/>' +
	' <strong>V</strong> = Very High Throughput<br/>' +
	' <strong>E</strong> = High efficient<br/>' +
	' <strong>L</strong> = Legacy allowed<br/>' +
	' <strong>K</strong> = Connected<br/>' +
	' <strong>U</strong> = Upgrading<br/>' +
	' <strong>G</strong> = Descendant-upgrading<br/>' +
	' <strong>Z</strong> = Config pending<br/>' +
	' <strong>Y</strong> = Assoc-resp/Auth pending<br/>' +
	' <strong>a</strong> = SAE Accepted<br/>' +
	' <strong>b</strong> = SAE Denylisted-neighbour<br/>' +
	' <strong>e</strong> = SAE Enabled<br/>' +
	' <strong>u</strong> = portal-unreachable<br/>' +
	' <strong>o</strong> = opensystem<br/>' +
	' <strong>p</strong> = Pseudo-mlo<br/>' +
	' <strong>r</strong> = Real-mlo<br/>' +
	' <strong>m</strong> = Mobility Enabled';

function getMeshFlagsValueHtml(edge, side) {
	var flags = getMeshDisplayValue(getDirectionalEdgeValue(edge, 'flags', side, 'flags'));
	return '<span data-bs-toggle="tooltip" data-bs-html="true" data-bs-placement="top" title="' + meshFlagsTooltipHtml + '">' + escapeHtml(flags) + '</span>';
}

function getMeshLinkDetailsRows(edge, side) {
	return [
		{ label: 'Radio MAC', value: formatMeshMacAddress(getDirectionalEdgeValue(edge, 'radioMac', side, null)) },
		{ label: 'Band', value: getMeshDisplayValue(edge.band) },
		{ label: 'SNR', value: getMeshDisplayValue(edge.snr)+'dB' },
		{ label: 'Flags', value: getMeshFlagsValueHtml(edge, side), isHtml: true },
		{ label: 'A-Requests', value: getMeshDisplayValue(getDirectionalEdgeValue(edge, 'req', side, null)) },
		{ label: 'A-Responses', value: getMeshDisplayValue(getDirectionalEdgeValue(edge, 'resp', side, null)) },
		{ label: 'A-Fail', value: getMeshDisplayValue(getDirectionalEdgeValue(edge, 'fail', side, 'aFail')) },
		{ label: 'HT-Details', value: getMeshDisplayValue(getDirectionalEdgeValue(edge, 'ht', side, 'htDetails')) },
	];
}

function setMeshChartStatus(metricKey, message, isError) {
	var statusEl = document.getElementById('mesh-chart-' + metricKey + '-status');
	if (!statusEl) return;
	statusEl.textContent = message || '';
	statusEl.style.color = isError ? '#ea0606' : '#67748e';
}

function getMeshAPDashboardURL(ap) {
	if (!ap || !ap.siteId || !ap.serialNumber) return '';
	var apiURL = localStorage.getItem('base_url');
	if (!apiURL || !centralURLs[apiURL]) return '';
	return centralURLs[apiURL] + '/gravity/monitoring/ap/dashboard?contextType=ap&selectedView=dashboard&siteId=' + ap.siteId + '&selectedPlanet=sun&deviceId=' + ap.serialNumber;
}

function getMeshAPHeadingHTML(node, ap) {
	var displayName = node && node.name ? node.name : (ap && (ap.deviceName || ap.serialNumber) ? (ap.deviceName || ap.serialNumber) : '-');
	var centralURL = getMeshAPDashboardURL(ap);
	if (!centralURL) return escapeHtml(displayName);
	return '<a href="' + centralURL + '" target="_blank" rel="noopener noreferrer"><strong>' + escapeHtml(displayName) + '</strong></a>';
}

function renderMeshLinkModalDetails(context) {
	var modalTitle = document.getElementById('meshLinkModalTitle');
	if (modalTitle) {
		modalTitle.innerHTML = 'Mesh Link: ' + escapeHtml(context.ap1Node.name) + ' <i class="fa-solid fa-direction-left-right"></i> ' + escapeHtml(context.ap2Node.name);
	}

	var ap1Heading = document.getElementById('mesh-ap1-heading');
	if (ap1Heading) ap1Heading.innerHTML = getMeshAPHeadingHTML(context.ap1Node, context.ap1);

	var ap2Heading = document.getElementById('mesh-ap2-heading');
	if (ap2Heading) ap2Heading.innerHTML = getMeshAPHeadingHTML(context.ap2Node, context.ap2);

	var ap1Details = document.getElementById('mesh-ap1-details');
	if (ap1Details) ap1Details.innerHTML = buildMeshFieldRows(getMeshAPDetailsRows(context.ap1, context.ap1Node));

	var ap2Details = document.getElementById('mesh-ap2-details');
	if (ap2Details) ap2Details.innerHTML = buildMeshFieldRows(getMeshAPDetailsRows(context.ap2, context.ap2Node));

	var ap1LinkDetails = document.getElementById('mesh-ap1-link-details');
	if (ap1LinkDetails) ap1LinkDetails.innerHTML = buildMeshFieldRows(getMeshLinkDetailsRows(context.edge, context.ap1Side));

	var ap2LinkDetails = document.getElementById('mesh-ap2-link-details');
	if (ap2LinkDetails) ap2LinkDetails.innerHTML = buildMeshFieldRows(getMeshLinkDetailsRows(context.edge, context.ap2Side));

	var modalEl = document.getElementById('meshLinkModal');
	if (modalEl) initializeTooltips(modalEl);
}

function extractRadioNumber(value, fallback) {
	if (fallback === undefined) fallback = null;
	if (value === undefined || value === null || value === '') {
		return fallback;
	}

	if (typeof value === 'number') return String(value);

	var text = String(value);
	var slashMatch = text.match(/\/radios\/(\d+)/i);
	if (slashMatch) return slashMatch[1];

	var numberMatch = text.match(/\d+/);
	if (numberMatch) return numberMatch[0];

	return fallback;
}

function getMeshChildRadioNumber(context) {
	var edgeRadioNumber = extractRadioNumber(getDirectionalEdgeValue(context.edge, 'radioNumber', context.ap2Side, null), null);
	if (edgeRadioNumber !== null) return edgeRadioNumber;

	if (!context.ap2Node || !context.ap2Node.serial) return null;
	var childRadio = getRadioForSerialBandChannel(context.ap2Node.serial, context.edge.band, context.edge.channel);
	if (!childRadio) return null;

	return extractRadioNumber(
		childRadio.radioNumber || childRadio.radio || childRadio.radioId || childRadio.radio_id || childRadio.id,
		null
	);
}

function getMeshTrendWindowStartISO() {
	return DateTime.now().minus({ hours: 3 }).toUTC().toISO();
}

function getMeshTrendCacheKey(serial, radioNumber, metricKey, startISO) {
	return [serial, radioNumber, metricKey, startISO].join('|');
}

function buildMeshTrendURL(serial, radioNumber, trendPath, startISO, withFilter) {
	var base = localStorage.getItem('base_url') + '/network-monitoring/v1/aps/' + encodeURIComponent(serial) + '/radios/' + encodeURIComponent(radioNumber) + '/' + trendPath;
	if (!withFilter) return base;
	return base + '?filter=timestamp%20gt%20' + encodeURIComponent(startISO);
}

function fetchMeshTrendMetric(serial, radioNumber, metricKey, trendPath, startISO) {
	if (!serial || !radioNumber) return Promise.resolve(null);

	var cacheKey = getMeshTrendCacheKey(serial, radioNumber, metricKey, startISO);
	var cached = meshTrendCache[cacheKey];
	if (cached && cached.expiresAt > Date.now()) {
		return Promise.resolve(cached.payload);
	}

	var fetchTrend = function(targetURL, hasFallbackTried) {
		return fetchProxyWithAuth('/tools/getCommandwHeaders', {
			url: targetURL,
			access_token: localStorage.getItem('access_token'),
		}).then(function(commandResults) {
			var result = processStatus(commandResults);
			if (result === 200) {
				var payload = JSON.parse(commandResults.responseBody || '{}');
				meshTrendCache[cacheKey] = {
					expiresAt: Date.now() + meshTrendCacheTTLms,
					payload: payload,
				};
				return payload;
			}

			if ((result === 400) && !hasFallbackTried) {
				return fetchTrend(buildMeshTrendURL(serial, radioNumber, trendPath, startISO, false), true);
			}

			return null;
		}).catch(function() {
			return null;
		});
	};

	return fetchTrend(buildMeshTrendURL(serial, radioNumber, trendPath, startISO, true), false);
}

function mapTrendGraphSeries(payload) {
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

function formatMeshBpsTick(value) {
	var absValue = Math.abs(value);
	if (absValue >= 1000000) return (absValue / 1000000).toFixed(1) + ' M';
	if (absValue >= 1000) return Math.round(absValue / 1000) + ' k';
	return String(absValue);
}

function getMeshQualityColor(value) {
	var numeric = parseFloat(value);
	if (isNaN(numeric)) return meshChartColors.secondary;
	if (numeric > 70) return meshChartColors.success;
	if (numeric >= 41) return meshChartColors.warning;
	return meshChartColors.danger;
}

function renderMeshThroughputChart(payload) {
	var chartData = mapTrendGraphSeries(payload);
	if (chartData.samples.length === 0) {
		setMeshChartStatus('throughput', 'No throughput data available.', true);
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

	if (meshLinkCharts.throughput) meshLinkCharts.throughput.destroy();
	var ctx = document.getElementById('mesh-link-throughput-chart').getContext('2d');
	meshLinkCharts.throughput = new Chart(ctx, {
		type: 'line',
		data: {
			labels: chartData.labels,
			datasets: [
				{
					label: 'Transmitted',
					data: txSeries,
					borderColor: meshChartColors.info,
					backgroundColor: meshHexToRgba(meshChartColors.info, 0.20),
					borderWidth: 2,
					fill: true,
					tension: 0.3,
					pointRadius: 0,
					pointHoverRadius: 3,
				},
				{
					label: 'Received',
					data: rxSeries,
					borderColor: meshChartColors.success,
					backgroundColor: meshHexToRgba(meshChartColors.success, 0.20),
					borderWidth: 2,
					fill: true,
					tension: 0.3,
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
					position: getMeshLegendOptions().position,
					labels: getMeshLegendOptions().labels,
				},
			},
			scales: {
				x: {
					grid: {
						display: false,
					},
				},
				y: {
					suggestedMin: -1 * maxAbs,
					suggestedMax: maxAbs,
					ticks: {
						callback: function(value) {
							return formatMeshBpsTick(value);
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

	setMeshChartStatus('throughput', '');
}

function renderMeshFramesChart(payload) {
	var chartData = mapTrendGraphSeries(payload);
	if (chartData.samples.length === 0) {
		setMeshChartStatus('frames', 'No frames trend data available.', true);
		return;
	}

	var dropIndex = chartData.keys.indexOf('drop_percentage');
	var retryIndex = chartData.keys.indexOf('retries_percentage');
	if (dropIndex === -1) dropIndex = 2;
	if (retryIndex === -1) retryIndex = 3;

	var dropSeries = chartData.samples.map(function(sample) {
		var value = sample.data && sample.data[dropIndex] ? sample.data[dropIndex] : 0;
		return parseFloat(value) || 0;
	});
	var retrySeries = chartData.samples.map(function(sample) {
		var value = sample.data && sample.data[retryIndex] ? sample.data[retryIndex] : 0;
		return parseFloat(value) || 0;
	});

	if (meshLinkCharts.frames) meshLinkCharts.frames.destroy();
	var ctx = document.getElementById('mesh-link-frames-chart').getContext('2d');
	meshLinkCharts.frames = new Chart(ctx, {
		type: 'line',
		data: {
			labels: chartData.labels,
			datasets: [
				{
					label: 'Drop %',
					data: dropSeries,
					borderColor: meshChartColors.danger,
					backgroundColor: meshHexToRgba(meshChartColors.danger, 0.14),
					borderWidth: 2,
					fill: true,
					tension: 0.3,
					pointRadius: 0,
				},
				{
					label: 'Retry %',
					data: retrySeries,
					borderColor: meshChartColors.info,
					backgroundColor: meshHexToRgba(meshChartColors.info, 0.14),
					borderWidth: 2,
					fill: true,
					tension: 0.3,
					pointRadius: 0,
				},
			],
		},
		options: {
			responsive: true,
			maintainAspectRatio: false,
			plugins: {
				legend: {
					position: getMeshLegendOptions().position,
					labels: getMeshLegendOptions().labels,
				},
			},
			scales: {
				y: {
					min: 0,
					max: 100,
					title: {
						display: true,
						text: '%',
					},
				},
			},
		},
	});

	setMeshChartStatus('frames', '');
}

function renderMeshUtilizationChart(payload) {
	var chartData = mapTrendGraphSeries(payload);
	if (chartData.samples.length === 0) {
		setMeshChartStatus('utilization', 'No channel utilization data available.', true);
		return;
	}

	var txSeries = chartData.samples.map(function(sample) { return parseFloat(sample.data && sample.data[0]) || 0; });
	var rxSeries = chartData.samples.map(function(sample) { return parseFloat(sample.data && sample.data[1]) || 0; });
	var interferenceSeries = chartData.samples.map(function(sample) { return parseFloat(sample.data && sample.data[2]) || 0; });

	if (meshLinkCharts.utilization) meshLinkCharts.utilization.destroy();
	var ctx = document.getElementById('mesh-link-utilization-chart').getContext('2d');
	meshLinkCharts.utilization = new Chart(ctx, {
		type: 'line',
		data: {
			labels: chartData.labels,
			datasets: [
				{
					label: meshChannelUtilizationLegendLabels[0],
					data: txSeries,
					stack: 'utilization',
					borderColor: meshChartColors.info,
					backgroundColor: meshHexToRgba(meshChartColors.info, 0.20),
					borderWidth: 2,
					fill: true,
					tension: 0.25,
					pointRadius: 0,
				},
				{
					label: meshChannelUtilizationLegendLabels[1],
					data: rxSeries,
					stack: 'utilization',
					borderColor: meshChartColors.success,
					backgroundColor: meshHexToRgba(meshChartColors.success, 0.20),
					borderWidth: 2,
					fill: true,
					tension: 0.25,
					pointRadius: 0,
				},
				{
					label: meshChannelUtilizationLegendLabels[2],
					data: interferenceSeries,
					stack: 'utilization',
					borderColor: meshChartColors.secondary,
					backgroundColor: meshHexToRgba(meshChartColors.secondary, 0.20),
					borderWidth: 2,
					fill: true,
					tension: 0.25,
					pointRadius: 0,
				},
			],
		},
		options: {
			responsive: true,
			maintainAspectRatio: false,
			plugins: {
				legend: {
					position: getMeshLegendOptions().position,
					labels: getMeshLegendOptions().labels,
				},
			},
			scales: {
				y: {
					stacked: true,
					min: 0,
					max: 100,
					title: {
						display: true,
						text: '%',
					},
				},
			},
		},
	});

	setMeshChartStatus('utilization', '');
}

function renderMeshNoiseChart(payload) {
	var chartData = mapTrendGraphSeries(payload);
	if (chartData.samples.length === 0) {
		setMeshChartStatus('noise', 'No noise floor data available.', true);
		return;
	}

	var noiseSeries = chartData.samples.map(function(sample) {
		var value = sample.data && sample.data[0] ? sample.data[0] : 0;
		return parseFloat(value) || 0;
	});

	if (meshLinkCharts.noise) meshLinkCharts.noise.destroy();
	var ctx = document.getElementById('mesh-link-noise-chart').getContext('2d');
	meshLinkCharts.noise = new Chart(ctx, {
		type: 'line',
		data: {
			labels: chartData.labels,
			datasets: [
				{
					label: 'Noise Floor',
					data: noiseSeries,
					borderColor: meshChartColors.body,
					borderWidth: 2,
					fill: false,
					tension: 0.3,
					pointRadius: 0,
				},
			],
		},
		options: {
			responsive: true,
			maintainAspectRatio: false,
			plugins: {
				legend: {
					position: getMeshLegendOptions().position,
					labels: getMeshLegendOptions().labels,
				},
			},
			scales: {
				y: {
					title: {
						display: true,
						text: 'dBm',
					},
				},
			},
		},
	});

	setMeshChartStatus('noise', '');
}

function renderMeshQualityChart(payload) {
	var chartData = mapTrendGraphSeries(payload);
	if (chartData.samples.length === 0) {
		setMeshChartStatus('quality', 'No channel quality data available.', true);
		return;
	}

	var qualitySeries = chartData.samples.map(function(sample) {
		var value = sample.data && sample.data[0] ? sample.data[0] : 0;
		return parseFloat(value) || 0;
	});

	if (meshLinkCharts.quality) meshLinkCharts.quality.destroy();
	var ctx = document.getElementById('mesh-link-quality-chart').getContext('2d');
	meshLinkCharts.quality = new Chart(ctx, {
		type: 'line',
		data: {
			labels: chartData.labels,
			datasets: [
				{
					label: 'Channel Quality',
					data: qualitySeries,
					borderColor: meshChartColors.info,
					fill: false,
					tension: 0.25,
					borderWidth: 2,
					pointRadius: 2,
					pointHoverRadius: 3,
					pointBackgroundColor: function(context) {
						var parsed = context.parsed || {};
						return getMeshQualityColor(parsed.y);
					},
					pointBorderColor: function(context) {
						var parsed = context.parsed || {};
						return getMeshQualityColor(parsed.y);
					},
					segment: {
						borderColor: function(context) {
							var p0 = context.p0 && context.p0.parsed ? context.p0.parsed.y : null;
							var p1 = context.p1 && context.p1.parsed ? context.p1.parsed.y : null;
							if (p0 === null && p1 === null) return meshChartColors.secondary;
							if (p0 === null) return getMeshQualityColor(p1);
							if (p1 === null) return getMeshQualityColor(p0);
							return getMeshQualityColor((p0 + p1) / 2);
						},
					},
				},
			],
		},
		options: {
			responsive: true,
			maintainAspectRatio: false,
			plugins: {
				legend: {
					position: getMeshLegendOptions().position,
					labels: getMeshLegendOptions().labels,
				},
			},
			scales: {
				y: {
					min: 0,
					max: 100,
					title: {
						display: true,
						text: '%',
					},
				},
			},
		},
	});

	setMeshChartStatus('quality', '');
}

function loadMeshLinkCharts(context) {
	destroyMeshLinkCharts();

	var childSerial = context.ap2Node && context.ap2Node.serial ? context.ap2Node.serial : null;
	var childRadioNumber = getMeshChildRadioNumber(context);

	if (!childSerial || !childRadioNumber) {
		setMeshChartStatus('throughput', 'RF trend APIs unavailable: unable to resolve child AP radio.', true);
		setMeshChartStatus('frames', 'RF trend APIs unavailable: unable to resolve child AP radio.', true);
		setMeshChartStatus('utilization', 'RF trend APIs unavailable: unable to resolve child AP radio.', true);
		setMeshChartStatus('noise', 'RF trend APIs unavailable: unable to resolve child AP radio.', true);
		setMeshChartStatus('quality', 'RF trend APIs unavailable: unable to resolve child AP radio.', true);
		return;
	}

	var startISO = getMeshTrendWindowStartISO();

	setMeshChartStatus('throughput', 'Loading...');
	setMeshChartStatus('frames', 'Loading...');
	setMeshChartStatus('utilization', 'Loading...');
	setMeshChartStatus('noise', 'Loading...');
	setMeshChartStatus('quality', 'Loading...');

	fetchMeshTrendMetric(childSerial, childRadioNumber, 'throughput', 'throughput-trends', startISO).then(function(payload) {
		if (!payload) {
			setMeshChartStatus('throughput', 'Throughput data unavailable for this link.', true);
			return;
		}
		renderMeshThroughputChart(payload);
	});

	fetchMeshTrendMetric(childSerial, childRadioNumber, 'frames', 'frames-trends', startISO).then(function(payload) {
		if (!payload) {
			setMeshChartStatus('frames', 'Frames data unavailable for this link.', true);
			return;
		}
		renderMeshFramesChart(payload);
	});

	fetchMeshTrendMetric(childSerial, childRadioNumber, 'utilization', 'channel-utilization-trends', startISO).then(function(payload) {
		if (!payload) {
			setMeshChartStatus('utilization', 'Channel utilization data unavailable for this link.', true);
			return;
		}
		renderMeshUtilizationChart(payload);
	});

	fetchMeshTrendMetric(childSerial, childRadioNumber, 'noise', 'noise-floor-trends', startISO).then(function(payload) {
		if (!payload) {
			setMeshChartStatus('noise', 'Noise floor data unavailable for this link.', true);
			return;
		}
		renderMeshNoiseChart(payload);
	});

	fetchMeshTrendMetric(childSerial, childRadioNumber, 'quality', 'channel-quality-trends', startISO).then(function(payload) {
		if (!payload) {
			setMeshChartStatus('quality', 'Channel quality data unavailable for this link.', true);
			return;
		}
		renderMeshQualityChart(payload);
	});
}

function refreshMeshLinkModalGraphs() {
	if (!ensureMeshLinkModal()) return;
	if (!meshSelectedEdgeId) {
		showNotification('ca-mesh', 'Select a mesh link first, then open details.', 'bottom', 'center', 'warning');
		return;
	}

	var edge = getMeshEdgeById(meshSelectedEdgeId);
	if (!edge) {
		showNotification('ca-mesh', 'Unable to refresh mesh link details.', 'bottom', 'center', 'warning');
		return;
	}

	var context = getMeshLinkContext(edge);
	if (!context) {
		showNotification('ca-mesh', 'Unable to resolve mesh link endpoint details.', 'bottom', 'center', 'warning');
		return;
	}

	// Force fresh trend API reads for an explicit user refresh action.
	meshTrendCache = {};
	renderMeshLinkModalDetails(context);
	loadMeshLinkCharts(context);
}

function openMeshLinkModal(edgeId) {
	if (!ensureMeshLinkModal()) return;

	var edge = getMeshEdgeById(edgeId);
	if (!edge) {
		showNotification('ca-mesh', 'Unable to open mesh link details.', 'bottom', 'center', 'warning');
		return;
	}

	var context = getMeshLinkContext(edge);
	if (!context) {
		showNotification('ca-mesh', 'Unable to resolve mesh link endpoint details.', 'bottom', 'center', 'warning');
		return;
	}

	renderMeshLinkModalDetails(context);
	meshLinkModalInstance.show();
	loadMeshLinkCharts(context);
}

function createSvgElement(tagName, attributes) {
	var element = document.createElementNS('http://www.w3.org/2000/svg', tagName);
	Object.keys(attributes || {}).forEach(function(key) {
		element.setAttribute(key, attributes[key]);
		if (tagName === 'image' && key === 'href') {
			element.setAttributeNS('http://www.w3.org/1999/xlink', 'xlink:href', attributes[key]);
		}
	});
	return element;
}

function layoutMeshNodes() {
	var nodes = Object.values(meshGraph.nodes);
	if (nodes.length === 0) return;

	var rootId = meshSelectedPortalSerial;
	var adjacency = {};
	var incoming = {};

	nodes.forEach(function(node) {
		adjacency[node.id] = [];
		incoming[node.id] = 0;
	});

	meshGraph.edges.forEach(function(edge) {
		if (edge.relation === 'C' || edge.relation === 'P' || edge.relation === 'N') {
			adjacency[edge.sourceId].push(edge.targetId);
			incoming[edge.targetId] = (incoming[edge.targetId] || 0) + 1;
		}
	});

	var queue = [rootId];
	var levels = {};
	levels[rootId] = 0;

	while (queue.length > 0) {
		var currentId = queue.shift();
		var nextList = adjacency[currentId] || [];
		for (var i = 0; i < nextList.length; i++) {
			var nextId = nextList[i];
			var nextLevel = (levels[currentId] || 0) + 1;
			if (levels[nextId] === undefined || nextLevel < levels[nextId]) {
				levels[nextId] = nextLevel;
				queue.push(nextId);
			}
		}
	}

	var maxKnownLevel = 0;
	Object.keys(levels).forEach(function(id) {
		if (levels[id] > maxKnownLevel) maxKnownLevel = levels[id];
	});

	nodes.forEach(function(node) {
		if (levels[node.id] === undefined) {
			levels[node.id] = maxKnownLevel + 1;
		}
		node.level = levels[node.id];
	});

	var grouped = {};
	nodes.forEach(function(node) {
		if (!grouped[node.level]) grouped[node.level] = [];
		grouped[node.level].push(node);
	});

	Object.keys(grouped).forEach(function(level) {
		grouped[level].sort(function(a, b) {
			return String(a.name).localeCompare(String(b.name));
		});
	});

	var svg = document.getElementById('mesh-topology-svg');
	var viewBox = (svg.getAttribute('viewBox') || '').trim().split(/\s+/);
	var width = 1200;
	var height = 430;
	if (viewBox.length === 4) {
		var parsedWidth = parseFloat(viewBox[2]);
		var parsedHeight = parseFloat(viewBox[3]);
		if (!isNaN(parsedWidth) && parsedWidth > 0) width = parsedWidth;
		if (!isNaN(parsedHeight) && parsedHeight > 0) height = parsedHeight;
	}
	var levelsList = Object.keys(grouped).map(function(level) { return parseInt(level, 10); });
	levelsList.sort(function(a, b) { return a - b; });

	var hopCount = Math.max(0, levelsList.length - 1);
	var horizontalPadding;
	if (hopCount <= 1) {
		horizontalPadding = Math.max(160, Math.min(220, width * 0.18));
	} else {
		horizontalPadding = Math.max(90, Math.min(140, width * 0.12));
	}

	var leftPadding = horizontalPadding;
	var rightPadding = horizontalPadding;
	var topPadding = 80;
	var bottomPadding = 70;

	var usableWidth = Math.max(200, width - leftPadding - rightPadding);
	var usableHeight = Math.max(200, height - topPadding - bottomPadding);
	var colStep = levelsList.length > 1 ? usableWidth / (levelsList.length - 1) : 0;

	var levelIndexMap = {};
	for (var li = 0; li < levelsList.length; li++) {
		levelIndexMap[levelsList[li]] = li;
	}

	levelsList.forEach(function(level) {
		var list = grouped[level];
		var rowStep = usableHeight / (list.length + 1);
		var levelIndex = levelIndexMap[level];
		for (var i = 0; i < list.length; i++) {
			list[i].x = leftPadding + (colStep * levelIndex);
			list[i].y = topPadding + (rowStep * (i + 1));
		}
	});
}

function updateMeshSharedLegend() {
	var legendEl = document.getElementById('mesh-shared-legend');
	if (!legendEl) return;

	var overlay = getMeshOverlayValue();
	var items = [];

	if (overlay === 'SNR') {
		items = [
			{ label: '< 15 (Poor)', color: meshChartColors.danger },
			{ label: '15-25 (Fair)', color: meshChartColors.warning },
			{ label: '> 25 (Good)', color: meshChartColors.success }
		];
	} else if (overlay === 'PATHLOSS') {
		items = [
			{ label: '< 70 dB', color: meshChartColors.success },
			{ label: '70-89 dB', color: meshChartColors.warning },
			{ label: '90-109 dB', color: meshChartColors.danger },
			{ label: '110+ dB', color: meshChartColors.body || meshChartColors.secondary }
		];
	} else {
		items = [
			{ label: '2.4GHz', color: meshBandColors['2'] },
			{ label: '5GHz', color: meshBandColors['5'] },
			{ label: '6GHz', color: meshBandColors['6'] }
		];
	}

	legendEl.innerHTML = items.map(function(item) {
		return '<span class="mesh-shared-legend-item"><i class="fa-solid fa-circle mesh-shared-legend-icon" style="color:' + escapeHtml(item.color || '#6b7280') + ';"></i><span>' + escapeHtml(item.label) + '</span></span>';
	}).join('');
}

function drawSelectedEdgeLabel(svg, edge) {
	var lines = getEdgeOverlayLines(edge);
	if (lines.length === 0) return;

	var sourceNode = meshGraph.nodes[edge.sourceId];
	var targetNode = meshGraph.nodes[edge.targetId];
	if (!sourceNode || !targetNode) return;

	var midX = (sourceNode.x + targetNode.x) / 2;
	var midY = (sourceNode.y + targetNode.y) / 2;

	var labelWidth = 228;
	var labelGroup = createSvgElement('g', { transform: 'translate(' + Math.round(midX - (labelWidth / 2)) + ',' + Math.round(midY - 30) + ')' });
	var totalHeight = 22 + (lines.length * 18);

	labelGroup.appendChild(createSvgElement('rect', {
		x: '0',
		y: '0',
		class: 'mesh-overlay-label-bg',
		width: String(labelWidth),
		height: String(totalHeight),
		rx: '6',
		ry: '6',
		fill: '#f8fafc',
		stroke: '#d1d5db',
		'stroke-width': '1'
	}));

	for (var i = 0; i < lines.length; i++) {
		var text = createSvgElement('text', {
			x: String(labelWidth / 2),
			y: String(20 + (i * 17)),
			class: 'mesh-overlay-label-text',
			fill: '#1f2937',
			'text-anchor': 'middle',
			'font-size': '13',
			'font-family': 'Open Sans, sans-serif'
		});
		text.textContent = lines[i];
		labelGroup.appendChild(text);
	}

	svg.appendChild(labelGroup);
}

function getMeshGraphSiteIds() {
	var siteIds = [];
	Object.keys(meshGraph.nodes).forEach(function(nodeId) {
		var node = meshGraph.nodes[nodeId];
		if (!node || !node.serial) return;
		var ap = getAPBySerial(node.serial);
		if (!ap || !ap.siteId) return;
		var siteId = String(ap.siteId);
		if (siteIds.indexOf(siteId) === -1) {
			siteIds.push(siteId);
		}
	});
	return siteIds;
}

function getMeshAllAPSiteIds() {
	var siteIds = [];
	(meshAPs || []).forEach(function(ap) {
		if (!ap || !ap.siteId) return;
		var siteId = String(ap.siteId);
		if (siteIds.indexOf(siteId) === -1) {
			siteIds.push(siteId);
		}
	});
	return siteIds;
}

function getTopologySerialLookup() {
	var lookup = {};
	Object.keys(meshGraph.nodes).forEach(function(nodeId) {
		var node = meshGraph.nodes[nodeId];
		if (node && node.serial) lookup[node.serial] = true;
	});
	return lookup;
}

function mergeMeshGeoIndex(bySerial) {
	Object.keys(bySerial || {}).forEach(function(serial) {
		meshGeoBySerial[serial] = bySerial[serial];
	});
}

function parseMeshLocationPayload(payload) {
	var bySerial = {};
	if (!payload || !Array.isArray(payload.items)) return bySerial;

	payload.items.forEach(function(item) {
		if (!item || !item.serialNumber || !item.consolidatedLocation || !item.consolidatedLocation.center) return;
		var latitude = parseFloat(item.consolidatedLocation.center.latitude);
		var longitude = parseFloat(item.consolidatedLocation.center.longitude);
		if (!isFinite(latitude) || !isFinite(longitude)) return;

		bySerial[item.serialNumber] = {
			latitude: latitude,
			longitude: longitude,
		};
	});

	return bySerial;
}

async function fetchMeshLocationsForSite(siteId, forceRefresh) {
	if (!siteId) return {};
	var siteKey = String(siteId);
	var now = Date.now();
	var cached = meshLocationCacheBySite[siteKey];

	if (!forceRefresh && cached && cached.expiresAt > now) {
		return cached.bySerial;
	}

	if (meshLocationRequestsBySite[siteKey]) {
		return meshLocationRequestsBySite[siteKey];
	}

	meshLocationRequestsBySite[siteKey] = (async function() {
		var bySerial = {};
		var nextURL = localStorage.getItem('base_url') + '/network-services/v1/sites/' + encodeURIComponent(siteKey) + '/device-locations';

		while (nextURL) {
			var commandResults = await fetchProxyWithAuth('/tools/getCommandwHeaders', {
				url: nextURL,
				access_token: localStorage.getItem('access_token'),
			});

			var status = processStatus(commandResults);
			if (status === 429 || status === 503) {
				await new Promise(function(resolve) { setTimeout(resolve, apiWaitDelay); });
				continue;
			}

			if (status !== 200) {
				throw new Error('Failed to retrieve locations for site ' + siteKey + ' (HTTP ' + status + ')');
			}

			var payload = JSON.parse(commandResults.responseBody || '{}');
			mergeMeshGeoIndex(parseMeshLocationPayload(payload));
			Object.assign(bySerial, parseMeshLocationPayload(payload));

			if (!payload.next) {
				nextURL = null;
			} else if (/^https?:\/\//i.test(payload.next)) {
				nextURL = payload.next;
			} else if (String(payload.next).indexOf('/') === 0) {
				nextURL = localStorage.getItem('base_url') + payload.next;
			} else {
				nextURL = localStorage.getItem('base_url') + '/network-services/v1/sites/' + encodeURIComponent(siteKey) + '/device-locations?next=' + encodeURIComponent(String(payload.next));
			}
		}

		meshLocationCacheBySite[siteKey] = {
			expiresAt: Date.now() + meshLocationCacheTTLms,
			bySerial: bySerial,
		};

		return bySerial;
	})();

	try {
		return await meshLocationRequestsBySite[siteKey];
	} finally {
		delete meshLocationRequestsBySite[siteKey];
	}
}

function clearMeshMapLayers() {
	if (!meshMapInitialized) return;
	if (meshMapLayerMarkers) meshMapLayerMarkers.clearLayers();
	if (meshMapLayerEdges) meshMapLayerEdges.clearLayers();
	if (meshMapLayerDistance) meshMapLayerDistance.clearLayers();
}

async function loadMeshLocationsForCurrentTopology(forceRefresh) {
	if (!meshSelectedPortalSerial) return;
	var mapReady = meshViewMode === 'MAP' ? ensureMeshMap() : meshMapInitialized;

	var siteIds = getMeshAllAPSiteIds();
	if (siteIds.length === 0) {
		siteIds = getMeshGraphSiteIds();
	}
	if (siteIds.length === 0) {
		updateMeshDistanceBanner();
		if (mapReady && meshViewMode === 'MAP') {
			renderMeshMap();
			setMeshMapStatus('No AP location data is available for this topology. Graph view still shows full mesh relationships.', false, false);
		}
		return;
	}

	meshMapLoadingLocations = true;
	if (mapReady && meshViewMode === 'MAP') {
		setMeshMapStatus('Loading AP locations for the selected topology...', false, true);
	}

	var fetchPromises = siteIds.map(function(siteId) {
		return fetchMeshLocationsForSite(siteId, !!forceRefresh).then(function(bySerial) {
			mergeMeshGeoIndex(bySerial);
			if (mapReady && meshViewMode === 'MAP') {
				renderMeshMap();
			}
			return true;
		}).catch(function(err) {
			console.error(err);
			return false;
		});
	});

	var results = await Promise.all(fetchPromises);
	var successCount = results.filter(function(result) { return result; }).length;
	meshMapLoadingLocations = false;
	updateMeshDistanceBanner();

	if (mapReady && meshViewMode === 'MAP') {
		renderMeshMap();
		if (successCount === 0) {
			setMeshMapStatus('Unable to retrieve AP location data for this topology. Graph view still shows full mesh relationships.', true, false);
		} else {
			setMeshMapStatus('Showing geo map for selected topology cluster.', false, false);
		}
	}
}

function renderMeshMap() {
	if (meshViewMode !== 'MAP') return;
	if (!ensureMeshMap()) return;
	updateMeshSharedLegend();

	clearMeshMapLayers();

	var topologySerialLookup = getTopologySerialLookup();
	var mapPoints = [];
	var markerCount = 0;
	var topologyMarkerCount = 0;

	(meshAPs || []).forEach(function(ap) {
		if (!ap || !ap.serialNumber) return;
		var geo = meshGeoBySerial[ap.serialNumber];
		if (!geo || !isFinite(geo.latitude) || !isFinite(geo.longitude)) return;

		var isTopologyAP = !!topologySerialLookup[ap.serialNumber];
		var marker = null;

		if (isTopologyAP) {
			marker = L.marker([geo.latitude, geo.longitude], {
				icon: getMeshTopologyAPIcon(ap.status),
				opacity: 1,
			});
		} else {
			marker = L.circleMarker([geo.latitude, geo.longitude], {
				radius: 5,
				color: '#6b7280',
				weight: 1,
				fillColor: '#ffffff',
				fillOpacity: 0.85,
			});
		}

		marker.bindTooltip(escapeHtml(ap.deviceName || ap.serialNumber), { direction: 'top' });
		marker.addTo(meshMapLayerMarkers);
		markerCount++;

		if (isTopologyAP) {
			topologyMarkerCount++;
			mapPoints.push([geo.latitude, geo.longitude]);
		}
	});

	for (var i = 0; i < meshGraph.edges.length; i++) {
		var edge = meshGraph.edges[i];
		var sourceGeo = getMeshCoordinatesForNode(edge.sourceId);
		var targetGeo = getMeshCoordinatesForNode(edge.targetId);
		if (!sourceGeo || !targetGeo) continue;
		var edgePoints = [
			[sourceGeo.latitude, sourceGeo.longitude],
			[targetGeo.latitude, targetGeo.longitude]
		];

		var path = L.polyline(edgePoints, {
			color: getEdgeStrokeColor(edge),
			weight: edge.id === meshSelectedEdgeId ? meshSelectedEdgeStrokeWidth : meshDefaultEdgeStrokeWidth,
			opacity: 0.85,
			dashArray: edge.relation === 'N' ? '10 7' : null,
			interactive: false,
		});

		var hitPath = L.polyline(edgePoints, {
			color: '#000000',
			weight: 20,
			opacity: 0.01,
			dashArray: null,
			interactive: true,
			bubblingMouseEvents: false,
		});

		var handleEdgeClick = (function(edgeId) {
			return function() {
				meshSuppressNextMapClick = true;
				queueMeshEdgeSelection(edgeId);
			};
		})(edge.id);

		var handleEdgeDblClick = (function(edgeId) {
			return function(event) {
				meshSuppressNextMapClick = true;
				clearQueuedMeshEdgeSelection();
				if (event && event.originalEvent) {
					L.DomEvent.preventDefault(event.originalEvent);
					L.DomEvent.stopPropagation(event.originalEvent);
				}
				selectMeshEdgeNow(edgeId);
				openMeshLinkModal(edgeId);
			};
		})(edge.id);

		path.on('click', handleEdgeClick);
		path.on('dblclick', handleEdgeDblClick);
		hitPath.on('click', handleEdgeClick);
		hitPath.on('dblclick', handleEdgeDblClick);

		path.addTo(meshMapLayerEdges);
		hitPath.addTo(meshMapLayerEdges);
	}

	if (meshMapLayerMarkers) {
		meshMapLayerMarkers.eachLayer(function(layer) {
			if (layer && typeof layer.bringToFront === 'function') {
				layer.bringToFront();
			}
		});
	}

	if (meshSelectedEdgeId) {
		var selectedEdge = getMeshEdgeById(meshSelectedEdgeId);
		if (selectedEdge) {
			var selectedSourceGeo = getMeshCoordinatesForNode(selectedEdge.sourceId);
			var selectedTargetGeo = getMeshCoordinatesForNode(selectedEdge.targetId);
			if (selectedSourceGeo && selectedTargetGeo) {
				var selectedLines = getEdgeOverlayLines(selectedEdge);
				if (selectedLines.length > 0) {
					var labelHtml = selectedLines.map(function(line) {
						return '<div class="mesh-map-overlay-line">' + escapeHtml(line) + '</div>';
					}).join('');
					var selectedMidLatitude = (selectedSourceGeo.latitude + selectedTargetGeo.latitude) / 2;
					var selectedMidLongitude = (selectedSourceGeo.longitude + selectedTargetGeo.longitude) / 2;
					var selectedOverlayLabel = L.marker([selectedMidLatitude, selectedMidLongitude], {
						interactive: false,
						icon: L.divIcon({
							className: 'mesh-map-overlay-anchor',
							html: '<div class="mesh-map-overlay-label-box">' + labelHtml + '</div>',
							iconSize: null,
						})
					});
					selectedOverlayLabel.addTo(meshMapLayerDistance);
				}
			}
		}
	}

	if (!meshMapViewportLocked && mapPoints.length > 0) {
		if (mapPoints.length === 1) {
			meshMap.setView(mapPoints[0], 18);
		} else {
			meshMap.fitBounds(L.latLngBounds(mapPoints), { padding: [25, 25], maxZoom: 19 });
		}
		meshMapViewportLocked = true;
	}

	if (markerCount === 0) {
		if (meshMapLoadingLocations) return;
		setMeshMapStatus('No AP location data is available for this topology. Graph view still shows full mesh relationships.', false, false);
	} else if (!meshMapLoadingLocations) {
		if (topologyMarkerCount === 0) {
			setMeshMapStatus('Showing all AP locations. No APs in the selected topology have valid coordinates.', false, false);
		} else {
			setMeshMapStatus('Showing all AP locations. Mesh links and focused zoom reflect the selected topology cluster.', false, false);
		}
	}
}

function renderMeshTopology() {
	var svg = document.getElementById('mesh-topology-svg');
	if (!svg) return;

	svg.innerHTML = '';

	var nodeIds = Object.keys(meshGraph.nodes);
	if (nodeIds.length === 0) {
		updateMeshSharedLegend();
		return;
	}

	layoutMeshNodes();

	for (var e = 0; e < meshGraph.edges.length; e++) {
		var edge = meshGraph.edges[e];
		var sourceNode = meshGraph.nodes[edge.sourceId];
		var targetNode = meshGraph.nodes[edge.targetId];
		if (!sourceNode || !targetNode) continue;

		var cpOffset = Math.max(32, Math.min(72, Math.abs(targetNode.x - sourceNode.x) * 0.22));
		var pathData = 'M ' + sourceNode.x + ' ' + sourceNode.y +
			' C ' + (sourceNode.x + cpOffset) + ' ' + sourceNode.y +
			' ' + (targetNode.x - cpOffset) + ' ' + targetNode.y +
			' ' + targetNode.x + ' ' + targetNode.y;

		var strokeWidth = edge.id === meshSelectedEdgeId ? meshSelectedEdgeStrokeWidth : meshDefaultEdgeStrokeWidth;
		var path = createSvgElement('path', {
			d: pathData,
			fill: 'none',
			stroke: getEdgeStrokeColor(edge),
			'stroke-width': String(strokeWidth),
			'cursor': 'pointer',
			'stroke-linecap': 'round'
		});

		if (edge.relation === 'N') {
			path.setAttribute('stroke-dasharray', '10 7');
		}

		path.addEventListener('click', (function(edgeId) {
			return function(event) {
				if (event) event.stopPropagation();
				queueMeshEdgeSelection(edgeId);
			};
		})(edge.id));

		path.addEventListener('dblclick', (function(edgeId) {
			return function(event) {
				if (event) {
					event.preventDefault();
					event.stopPropagation();
				}
				clearQueuedMeshEdgeSelection();
				selectMeshEdgeNow(edgeId);
				openMeshLinkModal(edgeId);
			};
		})(edge.id));

		svg.appendChild(path);
	}

	for (var n = 0; n < nodeIds.length; n++) {
		var node = meshGraph.nodes[nodeIds[n]];
		var nodeGroup = createSvgElement('g', {
			transform: 'translate(' + (node.x - 30) + ',' + (node.y - 30) + ')'
		});

		nodeGroup.appendChild(createSvgElement('rect', {
			x: '0',
			y: '0',
			width: '60',
			height: '60',
			rx: '8',
			ry: '8',
			fill: '#ffffff',
			stroke: '#d1d5db',
			'stroke-width': '1'
		}));

		nodeGroup.appendChild(createSvgElement('image', {
			href: '../assets/img/ap-icon.svg',
			x: '0',
			y: '0',
			width: '60',
			height: '60'
		}));

		var nameText = createSvgElement('text', {
			x: '30',
			y: '74',
			class: 'mesh-topology-label',
			fill: '#111827',
			'font-size': '14',
			'font-family': 'Open Sans, sans-serif',
			'text-anchor': 'middle'
		});
		nameText.textContent = node.name;
		nodeGroup.appendChild(nameText);

		svg.appendChild(nodeGroup);
	}

	for (var s = 0; s < meshGraph.edges.length; s++) {
		if (meshGraph.edges[s].id === meshSelectedEdgeId) {
			drawSelectedEdgeLabel(svg, meshGraph.edges[s]);
			break;
		}
	}

	updateMeshSharedLegend();

	svg.onclick = function(event) {
		if (event && event.target && String(event.target.tagName || '').toLowerCase() === 'path') {
			return;
		}

		clearQueuedMeshEdgeSelection();
		if (meshSelectedEdgeId) {
			meshSelectedEdgeId = null;
			updateSelectedEdgeDetails();
			renderMeshViews();
		}
	};
}

function parseUtilizationValue(value) {
	if (value === undefined || value === null || value === '') return '-';
	var parsed = parseInt(value, 10);
	return isNaN(parsed) ? '-' : parsed;
}

function getRadioIdentifierForEdge(radio, fallback) {
	if (fallback === undefined) fallback = '-';
	if (!radio) return fallback;

	var radioId = radio.radioNumber || radio.radio || radio.radioId || radio.radio_id || radio.id || fallback;
	var parsed = extractRadioNumber(radioId, null);
	return parsed === null ? fallback : parsed;
}

function getRadioMacForEdge(radio, fallback) {
	if (fallback === undefined) fallback = '-';
	if (!radio) return fallback;
	var mac = radio.macAddress || radio.macaddr || fallback;
	return getMeshDisplayValue(mac, fallback);
}

function buildMeshEdgeMetrics(currentSerial, neighbourSerial, row) {
	var sourceRadio = getRadioForSerialBandChannel(currentSerial, row.band, row.channel);
	var neighbourRadio = meshRadiosByMac[normalizeMacAddress(row.neighbourMac)] || getRadioForSerialBandChannel(neighbourSerial, row.band, row.channel);

	return {
		endpointUtil: parseUtilizationValue(sourceRadio ? sourceRadio.channelUtilization : '-'),
		neighbourUtil: parseUtilizationValue(neighbourRadio ? neighbourRadio.channelUtilization : '-'),
		endpointRadioNumber: getRadioIdentifierForEdge(sourceRadio, row.radio || '-'),
		neighbourRadioNumber: getRadioIdentifierForEdge(neighbourRadio, '-'),
		endpointRadioMac: getRadioMacForEdge(sourceRadio, row.portalMac || '-'),
		neighbourRadioMac: getRadioMacForEdge(neighbourRadio, row.neighbourMac || '-'),
	};
}

async function fetchMeshCommand(serial) {
	var commandBody = {
		url: localStorage.getItem('base_url') + '/network-troubleshooting/v1/aps/' + serial + '/showCommands',
		access_token: localStorage.getItem('access_token'),
		data: JSON.stringify({ commands: ['show ap mesh neighbours'] })
	};

	while (true) {
		var kickoffResults = await fetchProxyWithAuth('/tools/postCommandwHeaders', commandBody);
		var kickoffStatus = processStatus(kickoffResults);

		if (kickoffStatus === 429 || kickoffStatus === 503) {
			await new Promise(function(resolve) { setTimeout(resolve, apiWaitDelay); });
			continue;
		}

		if (kickoffStatus !== 200 && kickoffStatus !== 202) {
			throw new Error('Failed to start troubleshooting command for ' + serial);
		}

		var kickoffBody = kickoffResults.responseBody ? JSON.parse(kickoffResults.responseBody) : {};
		var location = kickoffBody.location;
		if (!location && kickoffResults.headers) {
			var parsedHeaders = JSON.parse(kickoffResults.headers);
			location = parsedHeaders.location;
		}

		if (!location) {
			throw new Error('No async location returned for ' + serial);
		}

		var startTime = Date.now();
		while ((Date.now() - startTime) < 60000) {
			await new Promise(function(resolve) { setTimeout(resolve, 3000); });

			var pollResults = await fetchProxyWithAuth('/tools/getCommandwHeaders', {
				url: localStorage.getItem('base_url') + location,
				access_token: localStorage.getItem('access_token')
			});
			var pollStatus = processStatus(pollResults);

			if (pollStatus === 429 || pollStatus === 503) {
				continue;
			}

			if (pollStatus !== 200) {
				throw new Error('Failed to poll troubleshooting command for ' + serial);
			}

			var pollBody = pollResults.responseBody ? JSON.parse(pollResults.responseBody) : {};
			var state = String(pollBody.status || '').toUpperCase();

			if (state === 'COMPLETED') {
				return pollBody;
			}
			if (state === 'FAILED' || state === 'TIMEDOUT') {
				return pollBody;
			}
		}

		return {
			status: 'TIMEDOUT',
			failReason: 'Command timed out after 60 seconds'
		};
	}
}

async function buildMeshTopology(portalSerial, portalName) {
	if (!portalSerial) {
		showNotification('ca-mesh', 'Select a mesh portal first', 'bottom', 'center', 'warning');
		return;
	}

	meshSelectedPortalSerial = portalSerial;
	meshSelectedPortalName = portalName || portalSerial;
	meshSelectedEdgeId = null;
	meshGeoBySerial = {};
	meshMapViewportLocked = false;
	updateMeshDistanceBanner();
	updateSelectedEdgeDetails();

	var titleEl = document.getElementById('mesh-topology-title');
	if (titleEl) {
		titleEl.textContent = 'Mesh Topology: ' + meshSelectedPortalName;
	}

	meshGraph = { nodes: {}, edges: [] };

	if (meshNotification) meshNotification.close();
	meshNotification = showProgressNotification('ca-mesh', 'Building mesh topology...', 'bottom', 'center', 'info');

	try {
		var queue = [portalSerial];
		var visited = {};
		var interrogated = 0;

		while (queue.length > 0) {
			var currentSerial = queue.shift();
			if (visited[currentSerial]) continue;
			visited[currentSerial] = true;
			interrogated++;

			var nodeInfo = buildNodeFromAP(currentSerial);
			ensureGraphNode(currentSerial, nodeInfo);

			var result = await fetchMeshCommand(currentSerial);
			var state = String(result.status || '').toUpperCase();
			if (state !== 'COMPLETED') {
				showNotification('ca-mesh', 'Partial topology: ' + (result.failReason || ('Command ' + state + ' for ' + currentSerial)), 'bottom', 'center', 'warning');
				continue;
			}

			var commandOutput = '';
			if (result.output && result.output.results && result.output.results.length > 0) {
				commandOutput = result.output.results[0].output || '';
			}

			var rows = parseMeshNeighboursOutput(currentSerial, commandOutput);
			for (var i = 0; i < rows.length; i++) {
				var row = rows[i];
				var neighbourSerial = getSerialForRadioMac(row.neighbourMac);
				if (!neighbourSerial && row.apName) {
					var neighbourAPByName = getAPByName(row.apName);
					if (neighbourAPByName) neighbourSerial = neighbourAPByName.serialNumber;
				}

				if (!neighbourSerial && row.relation === 'N') {
					continue;
				}

				var neighbourId = neighbourSerial || ('mac:' + normalizeMacAddress(row.neighbourMac));
				var neighbourAP = neighbourSerial ? getAPBySerial(neighbourSerial) : null;
				var neighbourSite = neighbourAP ? getSiteForId(neighbourAP.siteId) : null;

				ensureGraphNode(neighbourId, {
					serial: neighbourSerial,
					name: row.apName || neighbourSerial || row.neighbourMac,
					mac: row.neighbourMac,
					status: neighbourAP ? neighbourAP.status : 'UNKNOWN',
					model: neighbourAP ? neighbourAP.model : '-',
					site: neighbourSite ? neighbourSite.siteName : '-',
					isUnresolved: !neighbourSerial
				});

				var sourceId = currentSerial;
				var targetId = neighbourId;
				if (row.relation === 'P') {
					sourceId = neighbourId;
					targetId = currentSerial;
				}

				var endpointSide = currentSerial === sourceId ? 'A' : 'B';

				var metrics = buildMeshEdgeMetrics(currentSerial, neighbourSerial, row);
				var utilA = endpointSide === 'A' ? metrics.endpointUtil : metrics.neighbourUtil;
				var utilB = endpointSide === 'A' ? metrics.neighbourUtil : metrics.endpointUtil;
				var radioNumberA = endpointSide === 'A' ? metrics.endpointRadioNumber : metrics.neighbourRadioNumber;
				var radioNumberB = endpointSide === 'A' ? metrics.neighbourRadioNumber : metrics.endpointRadioNumber;
				var radioMacA = endpointSide === 'A' ? metrics.endpointRadioMac : metrics.neighbourRadioMac;
				var radioMacB = endpointSide === 'A' ? metrics.neighbourRadioMac : metrics.endpointRadioMac;

				upsertGraphEdge({
					id: sourceId + '->' + targetId + ':' + row.relation,
					pairKey: getPairKey(sourceId, targetId),
					sourceId: sourceId,
					targetId: targetId,
					relation: row.relation,
					band: row.band,
					channel: row.channel,
					flags: row.flags,
					htDetails: row.htDetails,
					snr: row.snr,
					rateTxRx: row.rateTxRx,
					txRate: row.txRate,
					rxRate: row.rxRate,
					aFail: row.aFail,
					relationAge: row.relationAge,
					age: row.age,
					utilA: utilA,
					utilB: utilB,
					endpointSide: endpointSide,
					endpointFlags: row.flags || '-',
					endpointHTDetails: row.htDetails || '-',
					endpointRate: row.rateTxRx || '-',
					endpointReq: row.aReq || '-',
					endpointResp: row.aResp || '-',
					endpointFail: row.aFail || '-',
					endpointRadioNumber: endpointSide === 'A' ? radioNumberA : radioNumberB,
					endpointRadioMac: endpointSide === 'A' ? radioMacA : radioMacB,
					endpointUtil: endpointSide === 'A' ? utilA : utilB,
					endpointSnr: row.snr,
					flagsA: endpointSide === 'A' ? (row.flags || '-') : null,
					flagsB: endpointSide === 'B' ? (row.flags || '-') : null,
					htA: endpointSide === 'A' ? (row.htDetails || '-') : null,
					htB: endpointSide === 'B' ? (row.htDetails || '-') : null,
					rateA: endpointSide === 'A' ? (row.rateTxRx || '-') : null,
					rateB: endpointSide === 'B' ? (row.rateTxRx || '-') : null,
					reqA: endpointSide === 'A' ? (row.aReq || '-') : null,
					reqB: endpointSide === 'B' ? (row.aReq || '-') : null,
					respA: endpointSide === 'A' ? (row.aResp || '-') : null,
					respB: endpointSide === 'B' ? (row.aResp || '-') : null,
					failA: endpointSide === 'A' ? (row.aFail || '-') : null,
					failB: endpointSide === 'B' ? (row.aFail || '-') : null,
					radioNumberA: radioNumberA,
					radioNumberB: radioNumberB,
					radioMacA: radioMacA,
					radioMacB: radioMacB,
					snrA: endpointSide === 'A' ? row.snr : null,
					snrB: endpointSide === 'B' ? row.snr : null
				});

				if (row.relation === 'C' && neighbourSerial && !visited[neighbourSerial]) {
					queue.push(neighbourSerial);
				}
			}

			if (meshNotification) {
				meshNotification.update({ message: 'Interrogated ' + interrogated + ' APs...' });
			}
		}

		renderMeshViews();
		await loadMeshLocationsForCurrentTopology(false);
		if (meshNotification) {
			meshNotification.update({ type: 'success', message: 'Mesh topology completed', progress: 100 });
			setTimeout(function() {
				if (meshNotification) meshNotification.close();
			}, 1000);
		}
	} catch (err) {
		if (meshNotification) {
			meshNotification.update({ type: 'danger', message: 'Failed to build mesh topology' });
			setTimeout(function() {
				if (meshNotification) meshNotification.close();
			}, 1500);
		}
		showNotification('ca-mesh', 'Mesh topology failed: ' + err.message, 'bottom', 'center', 'danger');
	}
}
