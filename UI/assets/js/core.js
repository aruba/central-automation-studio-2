/*
Central Automation v2.x
Last Updated 2.0.0
Aaron Scott (WiFi Downunder) 2025-2026
*/

var DateTime = luxon.DateTime;

var apiErrorCount = 0;
var clusterSelector;
var siteSelector;
var buildingSelector;
var floorSelector;
var timeSelector;
var hierarchySelector;
var templateHierarchySelector;
var nonLibraryHierarchySelector;
var assignHierarchySelector;
var wlanSelector;
var wlanSimpleSelector;

function escapeHtml(value) {
	return String(value ?? '')
		.replace(/&/g, '&amp;')
		.replace(/</g, '&lt;')
		.replace(/>/g, '&gt;')
		.replace(/"/g, '&quot;')
		.replace(/'/g, '&#39;');
}

function initializeTooltips(rootElement) {
	(rootElement || document).querySelectorAll('[data-bs-toggle="tooltip"]').forEach(function(el) {
		bootstrap.Tooltip.getOrCreateInstance(el);
	});
}

// Disposes existing tooltip instances (and hides any currently-visible popups) before their
// trigger elements are removed/replaced, so stale tooltips don't get orphaned in the DOM.
function disposeTooltips(rootElement) {
	(rootElement || document).querySelectorAll('[data-bs-toggle="tooltip"]').forEach(function(el) {
		let instance = bootstrap.Tooltip.getInstance(el);
		if (instance) instance.dispose();
	});
}

/*  -------------------------------------------------------------------------------------------------------------------------------------------------------------------------
	UI Initialization
------------------------------------------------------------------------------------------------------------------------------------------------------------------------- */

function initializeChoices() {
	let cElement = document.getElementById('clusterselector');
	if (cElement) {
		clusterSelector = new Choices(cElement, {
			searchEnabled: false,
			shouldSort: false
		});
	}
	
	let sElement = document.getElementById('siteselector');
	if (sElement) {
		siteSelector = new Choices(sElement, {
			searchEnabled: false,
			shouldSort: true
		});
	}
	
	let asElement = document.getElementById('allsiteselector');
	if (asElement) {
		siteSelector = new Choices(asElement, {
			searchEnabled: false,
			shouldSort: true
		});
	}
	
	let bElement = document.getElementById('buildingselector');
	if (bElement) {
		buildingSelector = new Choices(bElement, {
			searchEnabled: false,
			shouldSort: false
		});
	}
	
	let fElement = document.getElementById('floorselector');
	if (fElement) {
		floorSelector = new Choices(fElement, {
			searchEnabled: false,
			shouldSort: false
		});
	}
	
	let tElement = document.getElementById('timeselector');
	if (tElement) {
		timeSelector = new Choices(tElement, {
			searchEnabled: false,
			shouldSort: false,
			itemSelectText: "Press to select"
		});
		let timeChoices = [];
		timeChoices.push({ value: 180, label: '3 Hours' });
		timeChoices.push({ value: 1440, label: '1 Day' });
		timeChoices.push({ value: 4320, label: '3 Days' });
		timeChoices.push({ value: 10080, label: '7 Days' });
		timeSelector.clearChoices();
		timeSelector.setChoices(timeChoices);
		
		timeSelector.setChoiceByValue(1440);
		
	}
	
	let kElement = document.getElementById('keymgmtselector');
	if (kElement) {
			keySelector = new Choices(kElement, {
			searchEnabled: false,
			shouldSort: false,
			itemSelectText: "Press to select"
		});
		let keyChoices = [];
		Object.keys(keyManagement).forEach(function(key) {
			keyChoices.push({ value: key, label: keyManagement[key] });
		});
		keySelector.clearChoices();
		keySelector.setChoices(keyChoices);		
	}
	
	let hElement = document.getElementById('hierarchyselector');
	if (hElement) {
			hierarchySelector = new Choices(hElement, {
			searchEnabled: true,
			shouldSort: false,
			itemSelectText: "Press to select"
		});
		let hierarchyChoices = [];
		hierarchyChoices.push({ value: 'library::Library', label: 'Library' });
		hierarchySelector.clearChoices();
		hierarchySelector.setChoices(hierarchyChoices);		
		hierarchySelector.setChoiceByValue(['library::Library']);
		
		hElement.addEventListener('change', function(event) {
			let matches =  this.value.match(/^(.*?)::(.*)/);
			// Split into scopeid and hierarchy level 
			hierarchyChange(matches[1],matches[2]);
		});
	}
	
	let nlElement = document.getElementById('nonlibraryhierarchyselector');
	if (nlElement) {
			nonLibraryHierarchySelector = new Choices(nlElement, {
			searchEnabled: true,
			shouldSort: false,
			itemSelectText: "Press to select"
		});
		let hierarchyChoices = [];
		nonLibraryHierarchySelector.clearChoices();
		nonLibraryHierarchySelector.setChoices(hierarchyChoices);
	}
	
	let thElement = document.getElementById('templatehierarchyselector');
	if (thElement) {
			templateHierarchySelector = new Choices(thElement, {
			searchEnabled: true,
			shouldSort: false,
			itemSelectText: "Press to select"
		});
		let hierarchyChoices = [];
		templateHierarchySelector.clearChoices();
		templateHierarchySelector.setChoices(hierarchyChoices);		
		
		thElement.addEventListener('change', function(event) {
			let matches =  this.value.match(/^(.*?)::(.*)/);
			// Split into scopeid and hierarchy level 
			hierarchyChange(matches[1],matches[2]);
		});
	}
	
	let ahElement = document.getElementById('assignhierarchyselector');
	if (ahElement) {
			assignHierarchySelector = new Choices(ahElement, {
			searchEnabled: true,
			shouldSort: false,
			itemSelectText: "Press to select",
			removeItemButton:true
		});
		let hierarchyChoices = [];
		hierarchyChoices.push({ value: 'library::Library', label: 'Library' });
		assignHierarchySelector.clearChoices();
		assignHierarchySelector.setChoices(hierarchyChoices);		
		assignHierarchySelector.setChoiceByValue(['library::Library']);
	}
	
	let wlanElement = document.getElementById('wlanselector');
	if (wlanElement) {
			wlanSelector = new Choices(wlanElement, {
			searchEnabled: false,
			shouldSort: false,
			itemSelectText: "Press to select"
		});
		let wlanChoices = [];
		wlanChoices.push({ value: '_all', label: 'All Clients' });
		wlanChoices.push({ value: '_wlan', label: 'All WLANs' });
		wlanChoices.push({ value: '_wired', label: 'Wired Only' });
		wlanSelector.clearChoices();
		wlanSelector.setChoices(wlanChoices);		
		wlanSelector.setChoiceByValue(['_all']);
		
		wlanElement.addEventListener('change', function(event) {
			wlanChange(this.value);
		});
	}
	
	let wlanSimpleElement = document.getElementById('wlansimpleselector');
	if (wlanSimpleElement) {
			wlanSimpleSelector = new Choices(wlanSimpleElement, {
			searchEnabled: false,
			shouldSort: false,
			itemSelectText: "Press to select"
		});
		let wlanChoices = [];
		wlanSimpleSelector.clearChoices();
		wlanSimpleSelector.setChoices(wlanChoices);
		
		wlanSimpleElement.addEventListener('change', function(event) {
			wlanChange(this.value);
		});
	}
}

function getClusterSelector() {
	return clusterSelector;
}

function getSiteSelector() {
	return siteSelector;
}

function getBuildingSelector() {
	return buildingSelector;
}

function getFloorSelector() {
	return floorSelector;
}

function getTimeSelector() {
	return timeSelector;
}

function getHierarchySelector() {
	return hierarchySelector;
}

function getNonLibraryHierarchySelector() {
	return nonLibraryHierarchySelector;
}

function getTemplateHierarchySelector() {
	return templateHierarchySelector;
}

function getAssignHierarchySelector() {
	return assignHierarchySelector;
}

function getWLANSelector() {
	return wlanSelector;
}

function getWLANSimpleSelector() {
	return wlanSimpleSelector;
}

function hierarchyChange(scopeID,hierarchyLevel) {
	// Override at each page
}

function wlanChange() {
	// Override at each page
}


/*  -------------------------------------------------------------------------------------------------------------------------------------------------------------------------
	Clusters
------------------------------------------------------------------------------------------------------------------------------------------------------------------------- */

function getCentralURLs() {
	return centralURLs;
}

/*  -------------------------------------------------------------------------------------------------------------------------------------------------------------------------
	Cluster Utility functions
	------------------------------------------------------------------------------------------------------------------------------------------------------------------------- */

function getAPIGateway(clusterName) {
	let apiURL = centralClusters[clusterName].url;
	return apiURL;
}

function getClusterName(url) {
	let clusterName = clusterNames[url];
	return clusterName;
}

function getClusterRegion(url) {
	let region = clusterRegions[url];
	return region;
}

function populateCentralClusters() {
	if (document.getElementById('clusterselector')) {
		
		let addedPrivate = false;
		let clusterChoices = [];
		clusterChoices.push({ value: '', label: 'Public Clusters', disabled: true });
		for (let k in centralClusters) {
			let currentCluster = centralClusters[k];
			if ((currentCluster.type === 'Private') && !addedPrivate) {
				clusterChoices.push({ value: '', label: '─────────', disabled: true });
				clusterChoices.push({ value: '', label: 'Private Clusters', disabled: true });
				addedPrivate = true;
			}
			
			if (isPublicInstall() && currentCluster.url === 'COP') {
				// Skip adding the COP value on the public release
			} else {
				clusterChoices.push({ value: currentCluster.url, label: k });
			}
		}
		clusterSelector.clearChoices();
		clusterSelector.setChoices(clusterChoices);
	};
}

function isCOPSelected() {
	//console.log(document.getElementById("clusterselector").value)
	if (document.getElementById('clusterselector').value === getAPIGateway('Central On-Prem')) {
		document.getElementById('cop_address_row').hidden = false;
	} else {
		document.getElementById('cop_address_row').hidden = true;
	}
}


/*  -------------------------------------------------------------------
		Load and Save from Local Storage & IndexedDB functions
-------------------------------------------------------------------  */
var indexedDB;
var dbRequest;
var db;


function openIndexedDB() {
	indexedDB = window.indexedDB || window.mozIndexedDB || window.webkitIndexedDB || window.msIndexedDB || window.shimIndexedDB;

	if (!indexedDB) {
		console.log('IndexedDB could not be found in this browser.');
	}

	dbRequest = indexedDB.open('CAS-DB', 1);

	dbRequest.onerror = function(event) {
		console.error('An error occurred with IndexedDB');
		console.error(event);
		console.error('Database error: ${event.target.errorCode}');
	};

	dbRequest.onupgradeneeded = function() {
		db = dbRequest.result;
		if (!db.objectStoreNames.contains('general')) {
			// if there's no "general" store
			db.createObjectStore('general', { keyPath: 'key' });
		}
	};

	dbRequest.onsuccess = function() {
		console.log('IndexedDB opened successfully');
		db = dbRequest.result;
		loadLogFromDB();
	};
}

function loadDataFromDB(indexKey) {
	const transaction = db.transaction('general', 'readonly');
	const store = transaction.objectStore('general');
	const dataQuery = store.get(indexKey);
	dataQuery.onsuccess = function() {
		if (dataQuery.result) {
			loadSavedData(indexKey, dataQuery.result.data);
		} else {
			loadSavedData(indexKey, null);
		}
	}	
}

function saveDataToDB(indexKey, data) {
	const transaction = db.transaction('general', 'readwrite');
	const store = transaction.objectStore('general');
	store.put({ key: indexKey, data: data });
	
	// Update the last collected monitoring data
	if (indexKey.includes('monitoring')) localStorage.setItem('monitoring_update', +new Date());
	if (indexKey.includes('inventory')) localStorage.setItem('inventory_update', +new Date());
	if (indexKey.includes('config')) localStorage.setItem('config_update', +new Date());
	if (indexKey.includes('hierarchy')) localStorage.setItem('hierarchy_update', +new Date());
}

function deleteDataFomDB(indexKey) {
	const transaction = db.transaction('general', 'readwrite');
	const store = transaction.objectStore('general');
	const request = store.delete(indexKey);

	request.onsuccess = () => {
		console.log('Data deleted');
	};

	request.onerror = err => {
		console.error('Failed to delete data: ${err}');
	};
}

function loadLogFromDB() {
	const transaction = db.transaction('general', 'readonly');
	const store = transaction.objectStore('general');
	const logQuery = store.get('output_log');
	logQuery.onsuccess = function() {
		if (logQuery.result) {
			if (document.getElementById('errorBody')) document.getElementById('errorBody').innerHTML = logQuery.result.data
		}
	}
}

function saveLogToDB(data) {
	const transaction = db.transaction('general', 'readwrite');
	const store = transaction.objectStore('general');
	store.put({ key: 'output_log', data: data });
}



/*  -------------------------------------------------------------------------------------------------------------------------------------------------------------------------
	Notifications
	------------------------------------------------------------------------------------------------------------------------------------------------------------------------- */
function notifyWithOptions(icon, message, from, align, color, notifyOptions) {
	var iconString = 'central-icon ' + icon;
	return $.notify(
		{
			icon: iconString,
			message: message,
		},
		{
			type: color,
			placement: {
				from: from,
				align: align,
			},
			allow_dismiss: false,
			...(notifyOptions || {})
		}
	);
}

function showNotification(icon, message, from, align, color) {
	return notifyWithOptions(icon, message, from, align, color, { delay: 5000 });
}

function showLongNotification(icon, message, from, align, color) {
	return notifyWithOptions(icon, message, from, align, color, { delay: 30000 });
}

function showProgressNotification(icon, message, from, align, color) {
	return notifyWithOptions(icon, message, from, align, color, { showProgressbar: true, delay: 0 });
}

function showPermanentNotification(icon, message, from, align, color, url) {
	return notifyWithOptions(icon, message, from, align, color, { allow_dismiss: true, delay: 0 });
}

/*  -------------------------------------------------------------------------------------------------------------------------------------------------------------------------
	Logging functions
------------------------------------------------------------------------------------------------------------------------------------------------------------------------- */
var logLimit = 1000;

function appendLogBreaks(errorBody, count) {
	for (var index = 0; index < count; index++) {
		errorBody.appendChild(document.createElement('br'));
	}
}

function persistLog() {
	trimLog();
	saveLogToDB(document.getElementById('errorBody').innerHTML);
}

function appendLogSpan(errorBody, message, styles) {
	var span = document.createElement('span');
	if (styles) {
		if (styles.color) span.style.color = styles.color;
		if (styles.fontStyle) span.style.fontStyle = styles.fontStyle;
		if (styles.fontWeight) span.style.fontWeight = styles.fontWeight;
		if (styles.id) span.setAttribute('id', styles.id);
	}
	span.appendChild(document.createTextNode(message));
	errorBody.appendChild(span);
}

function appendLogText(errorBody, message) {
	errorBody.appendChild(document.createTextNode(message));
}

function logError(message) {
	var errorBody = document.getElementById('errorBody');
	
	/*var timestamp = document.createTextNode(moment().format("Do MMMM YYYY, h:mm:ss a"));
	var timeSpan = document.createElement('span');
	timeSpan.style.color = '#CCCCCC';
	timeSpan.setAttribute("id", "timestamp");
	timeSpan.appendChild(timestamp);
	errorBody.appendChild(timeSpan);
	var br = document.createElement('br');
	errorBody.appendChild(br);*/
	
	appendLogSpan(errorBody, '- ' + message, { color: '#FB404B' });
	appendLogBreaks(errorBody, 1);
	console.log(message);
	apiErrorCount++;
	persistLog();
}

function logErrorURL(message) {
	var errorBody = document.getElementById('errorBody');
	appendLogSpan(errorBody, 'API: ' + message, { color: '#aaa', fontStyle: 'italic' });
	appendLogBreaks(errorBody, 2);
	console.log(message);
	apiErrorCount++;
	persistLog();
}

function logInformation(message) {
	var errorBody = document.getElementById('errorBody');
	appendLogText(errorBody, '• ' + message);
	appendLogBreaks(errorBody, 1);
	console.log(message);
	persistLog();
}

function logInformationHeading(message) {
	var errorBody = document.getElementById('errorBody');
	appendLogSpan(errorBody, message, { fontWeight: 'bold' });
	appendLogBreaks(errorBody, 1);
	console.log(message);
	persistLog();
}

function logNote(message) {
	var errorBody = document.getElementById('errorBody');
	appendLogBreaks(errorBody, 1);
	
	appendLogSpan(errorBody, moment().format('Do MMMM YYYY, h:mm:ss a'), { color: '#CCCCCC', id: 'timestamp' });
	
	appendLogBreaks(errorBody, 1);
	appendLogText(errorBody, '• ' + message);
	appendLogBreaks(errorBody, 2);
	console.log(message);
	persistLog();
}

function logEnd(message) {
	var errorBody = document.getElementById('errorBody');
	
	appendLogSpan(errorBody, message, { color: '#CCCCCC' });
	appendLogBreaks(errorBody, 2);
	console.log(message);
	persistLog();
}

function logStart(message) {
	var errorBody = document.getElementById('errorBody');
	appendLogBreaks(errorBody, 1);
	
	appendLogSpan(errorBody, moment().format('Do MMMM YYYY, h:mm:ss a'), { color: '#CCCCCC', id: 'timestamp' });
	
	appendLogBreaks(errorBody, 1);
	appendLogSpan(errorBody, message, { color: '#23CCEF', fontWeight: 'bold' });
	appendLogBreaks(errorBody, 1);
	console.log(message);
	persistLog();
}

function trimLog() {
	// trim the log to the logLimit based on the timestamp id (to cleanly remove an entire block from the log)
	var logElement = document.getElementById("errorBody");
	var logElementChildren = [...logElement.childNodes];
	if (logElementChildren.length > logLimit) {
		var logBlockIndex = -1;
		for(i = 0; i < logElementChildren.length; i++){
			logChild = logElementChildren[i];
			if(logChild.id == 'timestamp') {
				logBlockIndex = i;
			}
			if (logElement.children.length - logBlockIndex <= logLimit) {
				break;
			}
		}
		logElementChildren.slice(0,logBlockIndex).forEach(logElement.removeChild.bind(logElement));
	}
}

function clearErrorLog() {
	var errorBody = document.getElementById('errorBody');
	while (errorBody.hasChildNodes()) {
		errorBody.removeChild(errorBody.firstChild);
	}
	saveLogToDB('');
}

function scrollLogToBottom() {
	var bottomElement = document.getElementById('logBottom');
	bottomElement.scrollIntoView({ behavior: 'smooth', block: 'end' });
}

function showLog() {
	var fixedPlugin = document.querySelector('.fixed-plugin');
	if (!fixedPlugin.classList.contains('show')) {
		fixedPlugin.classList.add('show');
	}
	scrollLogToBottom();
}

/*  -------------------------------------------------------------------------------------------------------------------------------------------------------------------------
	String Utility functions
	------------------------------------------------------------------------------------------------------------------------------------------------------------------------- */

function titleCase(str) {
	if (str == null) return '';
	return String(str)
		.toLowerCase()
		.split(' ')
		.map(function(word) {
			return word.replace(word[0], word[0].toUpperCase());
		})
		.join(' ');
}

function noUnderscore(str) {
	return str.replace(/_/g, ' ');
}

function cleanMACAddress(mac) {
	// convert to UPPER CASE, and use colon as separator
	var currentMac = mac.trim();
	currentMac = currentMac.toUpperCase();
	currentMac = currentMac.replace(/[^a-z0-9]/gi, '');
	currentMac = currentMac.replace(/..\B/g, '$&:');
	return currentMac;
}

function syntaxHighlight(json) {
	json = json.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
	return json.replace(/("(\\u[a-zA-Z0-9]{4}|\\[^u]|[^\\"])*"(\s*:)?|\b(true|false|null)\b|-?\d+(?:\.\d*)?(?:[eE][+\-]?\d+)?)/g, function (match) {
		var cls = 'number';
		if (/^"/.test(match)) {
			if (/:$/.test(match)) {
				cls = 'key';
			} else {
				cls = 'string';
			}
		} else if (/true|false/.test(match)) {
			cls = 'boolean';
		} else if (/null/.test(match)) {
			cls = 'null';
		}
		return '<span class="' + cls + '">' + match + '</span>';
	});
}

function isValidJSON(jsonString) {
  try {
	JSON.parse(jsonString);
	return true;
  } catch (e) {
	console.error("Invalid JSON:", e.message);
	return false;
  }
}

function parseScopeDeviceFunction(scopeString) {
	// Central sometimes returns this field as valid (double-quoted) JSON, and sometimes as a
	// Python repr() of a list of dicts: values are single-quoted, but a value switches to
	// double quotes if it contains an apostrophe (e.g. 'scope_name': "Dick's Cafe"). Match
	// whichever quote style wraps each value instead of assuming one throughout.
	if (typeof scopeString !== 'string') return [];
	try {
		return JSON.parse(scopeString);
	} catch (e) {
		let objectRegex = /\{[^{}]*\}/g;
		let pairRegex = /'([A-Za-z_][\w-]*)':\s*(?:'((?:\\.|[^'\\])*)'|"((?:\\.|[^"\\])*)")/g;
		let objects = scopeString.match(objectRegex) || [];
		return objects.map(function(objectString) {
			let obj = {};
			let match;
			pairRegex.lastIndex = 0;
			while ((match = pairRegex.exec(objectString)) !== null) {
				let key = match[1];
				let value = (match[2] !== undefined ? match[2] : match[3]).replace(/\\(.)/g, '$1');
				obj[key] = (key === 'scope_id' && /^\d+$/.test(value)) ? Number(value) : value;
			}
			return obj;
		});
	}
}

function isDateInPast(dateString) {
	let dateToCheck = new Date(dateString); // Example past date and time
	let now = new Date();
	
	if (dateToCheck < now) {
	  return true;
	} else {
		return false;
	}
}

function safeParseCommandResponseBody(commandResults, contextLabel) {
	if (!commandResults || typeof commandResults.responseBody === 'undefined' || commandResults.responseBody === null) {
		console.error('Missing response body while parsing ' + contextLabel);
		return null;
	}

	if (typeof commandResults.responseBody !== 'string') {
		return commandResults.responseBody;
	}

	try {
		return JSON.parse(commandResults.responseBody);
	} catch (err) {
		console.error('Failed to parse JSON response for ' + contextLabel + ':', err, commandResults.responseBody);
		return null;
	}
}


/*  -------------------------------------------------------------------------------------------------------------------------------------------------------------------------
	API Response Processing
------------------------------------------------------------------------------------------------------------------------------------------------------------------------- */
function processStatus(commandResults) {
	// Process response based on the status returned.
	// If auth error - trigger reauth by returning 401
	// If error - log it (maybe show notification) and return the status code
	// If good - return the status code
	
	var requestedURL = commandResults['requestedUrl'];
	if (!requestedURL) requestedURL = commandResults['requestedURL'];
	
	var message;
	
	var statusCode = commandResults.status;
	if (!statusCode && commandResults.httpStatusCode) statusCode = commandResults.httpStatusCode;
	statusCode = String(statusCode || '200');
	if (statusCode === '200') {
		return 200;
	} else if (statusCode === '201') {
		return 201;
	} else if (statusCode === '202') {
		return 202;
	} else if (statusCode === '400') {
		if (commandResults['responseBody']) {
			message = safeParseCommandResponseBody(commandResults, 'HTTP 400 response');
			if (message && message['message']) logError('Bad Request (400): ' + message['message']);	
		}
		//if (requestedURL) logErrorURL(requestedURL);	
		return 400;
	} else if (statusCode === '401') {
		logError('Unauthorized access, authentication required (401)');	
		if (requestedURL) logErrorURL(requestedURL);
		return 401;
	}else if (statusCode === '403') {
		logError('Forbidden, do not have read access for ALL groups (403)');
		if (requestedURL) logErrorURL(requestedURL);	
		return 403;
	}  else if (statusCode === '404') {
		logError('Resource not found');
		if (requestedURL) logErrorURL(requestedURL);	
		return 404;
	} else if (statusCode === '409') {
		return 409;
	} else if (statusCode === '413') {
		logError('Request-size limit exceeded (413)');	
		if (requestedURL) logErrorURL(requestedURL);
		return 413;
	} else if (statusCode === '417') {
		logError('Request-size limit exceeded (417)');	
		if (requestedURL) logErrorURL(requestedURL);
		return 417;
	} else if (statusCode === '429') {
		/*if (!apiMessage) {
			apiMessage = true;
			showNotification('ca-api', 'API rate limit exceeded', 'top', 'center', 'warning');
		}*/
		logError('API rate limit exceeded (429) - Retrying...');
		if (requestedURL) logErrorURL(requestedURL);	
		return 429;
	} else if (statusCode === '500') {
		logError('Internal Server Error (500): ' + commandResults.description);
		if (requestedURL) logErrorURL(requestedURL);	
		return 500;
	} else if (statusCode === '503') {
		console.log(commandResults)
		logError('Server Error (503): ' + commandResults.message);	
		if (requestedURL) logErrorURL(requestedURL);	
		return 503;
	} else {
		return 200;
	}
}

var proxyAuthRecoveryState = {
	windowStartMs: 0,
	attempts: 0,
	windowMs: 60000,
	maxAttempts: 3,
};

function getCommandStatusCode(commandResults) {
	var statusCode = commandResults.status;
	if (!statusCode && commandResults.httpStatusCode) statusCode = commandResults.httpStatusCode.toString();
	return parseInt(statusCode || '200', 10);
}

function isProxyAuthRecoveryAllowed() {
	var now = Date.now();
	if ((proxyAuthRecoveryState.windowStartMs === 0) || (now - proxyAuthRecoveryState.windowStartMs > proxyAuthRecoveryState.windowMs)) {
		proxyAuthRecoveryState.windowStartMs = now;
		proxyAuthRecoveryState.attempts = 0;
	}
	return proxyAuthRecoveryState.attempts < proxyAuthRecoveryState.maxAttempts;
}

function buildProxyPayload(payload) {
	var requestPayload = Object.assign({}, payload || {});
	var latestAccessToken = localStorage.getItem('access_token');
	if (latestAccessToken) {
		requestPayload.access_token = latestAccessToken;
	}
	return requestPayload;
}

function fetchProxyWithAuth(commandPath, payload, hasRetried) {
	if (hasRetried === undefined) hasRetried = false;

	return authenticateWithCentral()
		.then(function() {
			var requestPayload = buildProxyPayload(payload);
			return fetch(getAPIURL() + commandPath, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(requestPayload),
			}).then(function(resp) {
				return resp.text().then(function(responseText) {
					if (!responseText) {
						return { status: resp.status };
					}

					try {
						return JSON.parse(responseText);
					} catch (parseError) {
						return {
							status: resp.status,
							responseBody: responseText,
						};
					}
				});
			});
		})
		.then(function(commandResults) {
			if (getCommandStatusCode(commandResults) !== 401) return commandResults;
			if (hasRetried) return commandResults;

			if (isAuthInProgress()) {
				return authenticateWithCentral()
					.then(function() {
						return fetchProxyWithAuth(commandPath, payload, true);
					})
					.catch(function() {
						return commandResults;
					});
			}

			if (!isProxyAuthRecoveryAllowed()) {
				logError('Authentication retry limit reached while processing API requests. Please retry shortly.');
				return commandResults;
			}

			proxyAuthRecoveryState.attempts++;
			return authenticateWithCentral(true)
				.then(function() {
					return fetchProxyWithAuth(commandPath, payload, true);
				})
				.catch(function() {
					return commandResults;
				});
		});
}

/*  -------------------------------------------------------------------------------------------------------------------------------------------------------------------------
 Global Navigation functions
------------------------------------------------------------------------------------------------------------------------------------------------------------------------- */
function goToDashboard(event) {
	if  (localStorage.getItem('from_hydra') && window.location.href.includes('single.html')) {
		location.href = '/dashboards/multiple.html';
	} else location.href = '/dashboards/single.html';
}


/*  -------------------------------------------------------------------------------------------------------------------------------------------------------------------------
 GLP data functions
------------------------------------------------------------------------------------------------------------------------------------------------------------------------- */
var subscriptions;
var subscriptionNotification;
var subscriptionPromise; var subscriptionResolve;
var apSubscriptions = {active:0, expiring:0, expired:0};
var swSubscriptions = {active:0, expiring:0, expired:0};
var gwSubscriptions = {active:0, expiring:0, expired:0};
var uxiSubscriptions = {active:0, expiring:0, expired:0};
var serviceSubscriptions = {active:0, expiring:0, expired:0};
var subscriptionCharts = {ap:null, sw:null, gw:null, uxi:null, service:null};
var totalExpiring = 0;
var expiringMessage = '';

function getSubscriptions() {
	return subscriptions;
}

function updateSubscriptions(offset) {
	if (offset == 0) {
		subscriptions = [];
		if (subscriptionNotification) subscriptionNotification.close();
		subscriptionNotification = showProgressNotification('ca-license-key', 'Obtaining subscriptions...', 'bottom', 'center', 'info');
		
		subscriptionPromise = new Promise(function(resolve) { subscriptionResolve = resolve; });
		
		apSubscriptions = {active:0, expiring:0, expired:0};
		swSubscriptions = {active:0, expiring:0, expired:0};
		gwSubscriptions = {active:0, expiring:0, expired:0};
		uxiSubscriptions = {active:0, expiring:0, expired:0};
		serviceSubscriptions = {active:0, expiring:0, expired:0};
		totalExpiring = 0;
		
		$('#subscription-table').DataTable().clear();
	}
	
	let endpointURL = glpGlobalURL;
	if (localStorage.getItem('base_url').includes('arubadev.cloud.hpe.com')) endpointURL = glpDevGlobalURL;
	
	var settings = {
		url: getAPIURL() + '/tools/getCommandwHeaders',
		method: 'POST',
		timeout: 0,
		headers: {
			'Content-Type': 'application/json',
		},
		data: JSON.stringify({
			url: endpointURL + '/subscriptions/v1/subscriptions?sort=tierDescription&limit='+glpSubscriptionLimit+'&offset='+offset,
			access_token: localStorage.getItem('access_token'),
		}),
	};
	
	fetch(settings.url, {method: settings.method, headers: settings.headers, body: settings.data}).then(r => r.json()).then(function(commandResults) {
		//console.log(commandResults)
		if (commandResults.hasOwnProperty('headers')) {
			//updateAPILimits(JSON.parse(commandResults.headers));
		}
		
		// Process The status code of the result
		var result = processStatus(commandResults);
		// will return the status code to trigger next step
		if (result == 429) {
			// Over API threshold limit. Wait apiWaitDelay value and try again.
			setTimeout(updateSubscriptions, apiWaitDelay, offset);
		} else if (result !== 200) {
			if (subscriptionNotification) {
				subscriptionNotification.update({ type: 'danger', message: 'Failed to download Subscriptions' });
				setTimeout(subscriptionNotification.close, 2000);
			}
					subscriptionResolve();
		} else {
			var response = JSON.parse(commandResults.responseBody);
			//console.log(response)
			subscriptions = subscriptions.concat(response.items);
			
response.items.forEach(function(item) {
			loadSubscriptionUI(item);
			});
			
			offset += glpSubscriptionLimit;
			if (offset < response.total) {
				var subProgress = (offset / response.total) * 100;
				subscriptionNotification.update({ progress: subProgress });
				updateSubscriptions(offset);
			} else {
				// Obtained the entire subscription list...
				updateSubscriptionUI();
				if (subscriptionNotification) {
					subscriptionNotification.update({ progress: 100, message: 'Subscriptions obtained', type: 'success' });
					setTimeout(subscriptionNotification.close, 1000);
				}
				saveDataToDB('glp_subscriptions', JSON.stringify(subscriptions));
				subscriptionResolve();
			}
		}
	});
	return subscriptionPromise;
}

function loadSubscriptionUI(subscription) {	
	
	var status = '<i class="fa-solid fa-diamond text-danger"></i>';
	var today = moment();
	var endDate = moment(subscription['endTime']);
	var licenseState = 'active';
	if (today.isBefore(endDate) && endDate.diff(today, 'days') <= 90) {
		status = '<span data-bs-toggle="tooltip" data-bs-placement="top" title="Expiring Within 90 days"><i class="fa-solid fa-square text-warning"></i></span>';
		totalExpiring++;
		if (totalExpiring > 1) expiringMessage = 'Multiple subscription keys are expiring soon...';
		else expiringMessage = 'Subscription Key <strong>' + subscription['key'] + '</strong> expiring soon...';
		licenseState = 'expiring';
	} else if (endDate.isBefore(today)) {
		status = '<span data-bs-toggle="tooltip" data-bs-placement="top" title="Expired"><i class="fa-solid fa-diamond text-danger"></i></span>';
		licenseState = 'expired';
	} else {
		status = '<span data-bs-toggle="tooltip" data-bs-placement="top" title="Active"><i class="fa-solid fa-circle text-success"></i></span>';
		licenseState = 'active';
	}
	// Add row to table
	var table = $('#subscription-table').DataTable();
	table.row.add([subscription['key'], subscription['isEval'] ? 'Evaluation':'Paid', status, subscription['tier'], subscription['quantity'], subscription['availableQuantity'], '<span style="display:none;">' + subscription['startTime'] + '</span>' + moment(subscription['startTime']).format('L'), '<span style="display:none;">' + subscription['endTime'] + '</span>' + moment(subscription['endTime']).format('L')]);

	initializeTooltips(table.table().body());
	var apQty = parseInt(subscription['quantity']);
	if (subscription['tier'].includes('AP')) {
		if (licenseState === 'active') apSubscriptions['active'] = apSubscriptions['active'] + apQty;
		if (licenseState === 'expiring') apSubscriptions['expiring'] = apSubscriptions['expiring'] + apQty;
		if (licenseState === 'expired') apSubscriptions['expired'] = apSubscriptions['expired'] + apQty;
 	} else if (subscription['tier'].includes('SWITCH')) {
		if (licenseState === 'active') swSubscriptions['active'] = swSubscriptions['active'] + apQty;
		if (licenseState === 'expiring') swSubscriptions['expiring'] = swSubscriptions['expiring'] + apQty;
		if (licenseState === 'expired') swSubscriptions['expired'] = swSubscriptions['expired'] + apQty;
	} else if ((subscription['tier'].includes('ANALYTICS')) || (subscription['tier'].includes('PROFILING'))) {
		if (licenseState === 'active') serviceSubscriptions['active'] = serviceSubscriptions['active'] + apQty;
		if (licenseState === 'expiring') serviceSubscriptions['expiring'] = serviceSubscriptions['expiring'] + apQty;
		if (licenseState === 'expired') serviceSubscriptions['expired'] = serviceSubscriptions['expired'] + apQty;
	} else if ((subscription['tier'].includes('SENSOR')) || (subscription['tier'].includes('AGENT'))) {
		if (licenseState === 'active') uxiSubscriptions['active'] = uxiSubscriptions['active'] + apQty;
		if (licenseState === 'expiring') uxiSubscriptions['expiring'] = uxiSubscriptions['expiring'] + apQty;
		if (licenseState === 'expired') uxiSubscriptions['expired'] = uxiSubscriptions['expired'] + apQty;
	} else {
		if (licenseState === 'active') gwSubscriptions['active'] = gwSubscriptions['active'] + apQty;
		if (licenseState === 'expiring') gwSubscriptions['expiring'] = gwSubscriptions['expiring'] + apQty;
		if (licenseState === 'expired') gwSubscriptions['expired'] = gwSubscriptions['expired'] + apQty;
	}
	 
}

function updateSubscriptionUI() {
	// Force reload of table data
	$('#subscription-table')
		.DataTable()
		.rows()
		.draw();

	//if (document.getElementById('subscription_count')) document.getElementById('subscription_count').innerHTML = '' + subscriptions.length + '';
	if (document.getElementById('subscription_count')) {
		const countUp = new CountUp('subscription_count', subscriptions.length);
		if (!countUp.error) {
		  countUp.start();
		} else {
		  console.error(countUp.error);
		}
	}
	document.getElementById('subscription_icon')?.classList.remove('bg-gradient-warning');
	document.getElementById('subscription_icon')?.classList.remove('bg-gradient-danger');
	document.getElementById('subscription_icon')?.classList.add('bg-gradient-info');
	
	if (document.getElementById('ap-chart')) {
		var ctx = document.getElementById("ap-chart").getContext("2d");
		loadSubscriptionChart('ap', ctx, apSubscriptions);
	}
	if (document.getElementById('ap_license_count')) {
		const countUp = new CountUp('ap_license_count', (apSubscriptions['active'] + apSubscriptions['expiring'] + apSubscriptions['expired']));
		if (!countUp.error) {
		  countUp.start();
		} else {
		  console.error(countUp.error);
		}
	}
	
	if (document.getElementById('sw-chart')) {
		var ctx = document.getElementById("sw-chart").getContext("2d");
		loadSubscriptionChart('sw', ctx, swSubscriptions);
	}
	if (document.getElementById('sw_license_count')) {
		const countUp = new CountUp('sw_license_count', (swSubscriptions['active'] + swSubscriptions['expiring'] + swSubscriptions['expired']));
		if (!countUp.error) {
		  countUp.start();
		} else {
		  console.error(countUp.error);
		}
	}
	
	if (document.getElementById('gw-chart')) {
		var ctx = document.getElementById("gw-chart").getContext("2d");
		loadSubscriptionChart('gw', ctx, gwSubscriptions);
	}
	if (document.getElementById('gw_license_count')) {
		const countUp = new CountUp('gw_license_count', (gwSubscriptions['active'] + gwSubscriptions['expiring'] + gwSubscriptions['expired']));
		if (!countUp.error) {
		  countUp.start();
		} else {
		  console.error(countUp.error);
		}
	}
	
	if (document.getElementById('uxi-chart')) {
		var ctx = document.getElementById("uxi-chart").getContext("2d");
		loadSubscriptionChart('uxi', ctx, uxiSubscriptions);
	}
	if (document.getElementById('uxi_license_count')) {
		const countUp = new CountUp('uxi_license_count', (uxiSubscriptions['active'] + uxiSubscriptions['expiring'] + uxiSubscriptions['expired']));
		if (!countUp.error) {
		  countUp.start();
		} else {
		  console.error(countUp.error);
		}
	}
	
	if (document.getElementById('service-chart')) {
		var ctx = document.getElementById("service-chart").getContext("2d");
		loadSubscriptionChart('service', ctx, serviceSubscriptions);
	}
	if (document.getElementById('service_license_count')) {
		const countUp = new CountUp('service_license_count', (serviceSubscriptions['active'] + serviceSubscriptions['expiring'] + serviceSubscriptions['expired']));
		if (!countUp.error) {
		  countUp.start();
		} else {
		  console.error(countUp.error);
		}
	}
	if (totalExpiring > 0)	showNotification('ca-license-key', expiringMessage, 'bottom', 'center', 'warning');
	
	// call to current showing page
	loadCurrentPageSubscription();
}

function loadSubscriptionChart(type, ctx, subData) {
	// Build labels and series
	var subLabels = ['Active', 'Expiring', 'Expired'];
	var subSeries = [subData['active'], subData['expiring'], subData['expired']];
	var subColor = [colorArray[4], colorArray[2], colorArray[1]];
	
	var chartRef = subscriptionCharts[type];
	if (chartRef) {
		chartRef.destroy();
	}
	
	chartRef = new Chart(ctx, {
	  type: "doughnut",
	  data: {
		labels: subLabels,
		datasets: [{
		  label: "",
		  weight: 9,
		  cutout: 20,
		  tension: 0.9,
		  pointRadius: 2,
		  borderWidth: 2,
		  backgroundColor: subColor,
		  data: subSeries,
		  fill: false
		}],
	  },
	  options: {
		responsive: false,
		maintainAspectRatio: false,
		plugins: {
		  legend: {
			display: false,
		  }
		},
		interaction: {
		  intersect: false,
		  mode: 'index',
		},
		scales: {
		  y: {
			grid: {
			  drawBorder: false,
			  display: false,
			  drawOnChartArea: false,
			  drawTicks: false,
			},
			ticks: {
			  display: false
			}
		  },
		  x: {
			grid: {
			  drawBorder: false,
			  display: false,
			  drawOnChartArea: false,
			  drawTicks: false,
			},
			ticks: {
			  display: false,
			}
		  },
		}
	  },
	});
	subscriptionCharts[type] = chartRef;
}

function findSubscription(subID) {
	return subscriptions.find(function(sub) {
		return sub['id'].toLowerCase() === subID.toLowerCase();
	}) || null;
}

function findSubscriptionWithKey(subKey) {
	return subscriptions.find(function(sub) {
		return sub['key'].toLowerCase() === subKey.toLowerCase();
	}) || null;
}

var applications;
var applicationNotification;
var applicationPromise; var applicationResolve;

function getApplications() {
	return applications;
}

function updateApplications(offset) {
	if (offset == 0) {
		applications = [];
		if (applicationNotification) applicationNotification.close();
		applicationNotification = showProgressNotification('ca-window-paragraph', 'Obtaining GreenLake Applications...', 'bottom', 'center', 'info');
		
		applicationPromise = new Promise(function(resolve) { applicationResolve = resolve; });
	}
	var settings = {
		url: getAPIURL() + '/tools/getCommandwHeaders',
		method: 'POST',
		timeout: 0,
		headers: {
			'Content-Type': 'application/json',
		},
		data: JSON.stringify({
			url: glpGlobalURL + '/service-catalog/v1/per-region-service-managers?limit='+glpServiceManagerLimit+'&offset='+offset,
			access_token: localStorage.getItem('access_token'),
		}),
	};
	
	fetch(settings.url, {method: settings.method, headers: settings.headers, body: settings.data}).then(r => r.json()).then(function(commandResults) {
		//console.log(commandResults)
		if (commandResults.hasOwnProperty('headers')) {
			//updateAPILimits(JSON.parse(commandResults.headers));
		}
		
		// Process The status code of the result
		var result = processStatus(commandResults);
		// will return the status code to trigger next step
		if (result == 429) {
			// Over API threshold limit. Wait apiWaitDelay value and try again.
			setTimeout(updateApplications, apiWaitDelay, offset);
		} else if (result !== 200) {
			if (applicationNotification) {
				applicationNotification.update({ type: 'danger', message: 'Failed to download GreenLake Applications' });
				setTimeout(applicationNotification.close, 2000);
			}
					applicationResolve();
		} else {
			//console.log(commandResults)
			var response = JSON.parse(commandResults.responseBody);
			applications = applications.concat(response.items);
			offset += glpServiceManagerLimit;
			if (offset < response.total) {
				var subProgress = (offset / response.total) * 100;
				applicationNotification.update({ progress: subProgress });
				getApplications(offset);
			} else {
				// Obtained the entire subscription list...
				//console.log(applications)
				if (applicationNotification) {
					applicationNotification.update({ progress: 100, message: 'GreenLake Applications obtained', type: 'success' });
					setTimeout(applicationNotification.close, 1000);
				}
				saveDataToDB('glp_applications', JSON.stringify(applications));
				applicationResolve();
			}
		}
	});
	return applicationPromise;
}

function findApplication(appID) {
	var foundApp = null;
	applications.forEach(function(region) {
		region.serviceManagers.some(function(sm) {
			if (sm['id'].toLowerCase() === appID.toLowerCase()) {
				foundApp = sm;
				return true;
			}
		});
	});
	return foundApp;
}


/*  -------------------------------------------------------------------------------------------------------------------------------------------------------------------------
 Monitoring data functions
------------------------------------------------------------------------------------------------------------------------------------------------------------------------- */
var loadWirelessClients;
var loadWiredClients;
var loadAPs;
var loadSwitches;
var loadGateways;

var devices = [];
var clients = [];
var wirelessClients = [];
var wiredClients = [];
var downClientCount = 0;
var aps = [];
var apInventory = [];
var apInventoryCount = 0;
var bssids = {};
var bssidCount = 0;
var radios = [];
var switches = [];
var switchInventory = [];
var switchInventoryCount = 0;
var gateways = [];
var gatewayInventory = [];
var gatewayInventoryCount = 0;
var deviceType = '';
var sites = [];
var configSites = [];
var downAPCount = 0;
var downSwitchCount = 0;
var downGatewayCount = 0;
var siteIssues = 0;

var fco_data

var monitoringNotification;
var deviceNotification;
var clientWirelessNotification;
var clientWiredNotification;
var apNotification;
var switchNotification;
var gatewayNotification;
var siteNotification;
var healthNotification;
var radioNotification;

var devicePromise; var deviceResolve;
var clientWirelessPromise; var clientWirelessResolve;
var clientWiredPromise; var clientWiredResolve;
var apPromise; var apResolve;
var switchPromise; var switchResolve;
var gatewayPromise; var gatewayResolve;
var sitePromise; var siteResolve;
var siteConfigPromise; var siteConfigResolve;
var healthPromise; var healthResolve;
var radioPromise; var radioResolve;
var bssidPromise; var bssidResolve;

var wlanNotification;
var wlanDetails = {};

var bssidNotification;

function checkEnabledData() {
	// Are we including Wireless Clients in the monitoring data calls?
    loadWirelessClients = localStorage.getItem('load_clients_wireless');
	if (loadWirelessClients === null || loadWirelessClients === '') {
		loadWirelessClients = true;
	} else {
		loadWirelessClients = JSON.parse(loadWirelessClients);
	}
	console.log('Wireless Client Monitoring: ' + loadWirelessClients);
	
	// Are we including Wired Clients in the monitoring data calls?
	loadWiredClients = localStorage.getItem('load_clients_wired');
	if (loadWiredClients === null || loadWiredClients === '') {
		loadWiredClients = true;
	} else {
		loadWiredClients = JSON.parse(loadWiredClients);
	}
	console.log('Wired Client Monitoring: ' + loadWiredClients);
	
	loadAPs = localStorage.getItem('load_aps');
	if (loadAPs === null || loadAPs === "") {
		loadAPs = true;
	} else {
		loadAPs = JSON.parse(loadAPs)
	}
	console.log('AP Monitoring: ' + loadAPs);
	
	loadSwitches = localStorage.getItem('load_switches');
	if (loadSwitches === null || loadSwitches === "") {
		loadSwitches = true;
	} else {
		loadSwitches = JSON.parse(loadSwitches)
	}
	console.log('Switch Monitoring: ' + loadSwitches);
	
	loadGateways = localStorage.getItem('load_gateways');
	if (loadGateways === null || loadGateways === "") {
		loadGateways = true;
	} else {
		loadGateways = JSON.parse(loadGateways)
	}
	console.log('Gateway Monitoring: ' + loadGateways);
}

function resetTileUI(loadWirelessClients, loadWiredClients, loadAPs, loadSwitches, loadGateways) {
	
	if (!loadWirelessClients && !loadWiredClients) {
		// Mark the Client tile in Grey
		if (document.getElementById('client_count')) document.getElementById('client_count').innerHTML = '-';
		document.getElementById('client_icon')?.classList.remove('bg-gradient-warning');
		document.getElementById('client_icon')?.classList.remove('bg-gradient-danger');
		document.getElementById('client_icon')?.classList.remove('bg-gradient-success');
		document.getElementById('client_icon')?.classList.add('bg-gradient-secondary');
	} else {
		if (document.getElementById('client_count')) document.getElementById('client_count').innerHTML = '-';
		document.getElementById('client_icon')?.classList.add('bg-gradient-warning');
		document.getElementById('client_icon')?.classList.remove('bg-gradient-danger');
		document.getElementById('client_icon')?.classList.remove('bg-gradient-success');
		document.getElementById('client_icon')?.classList.remove('bg-gradient-secondary');
	}
	
	if (!loadAPs) {
		// Mark the Devices tiles in Grey
		if (document.getElementById('ap_count')) document.getElementById('ap_count').innerHTML = '-';
		document.getElementById('ap_icon')?.classList.remove('bg-gradient-warning');
		document.getElementById('ap_icon')?.classList.remove('bg-gradient-danger');
		document.getElementById('ap_icon')?.classList.remove('bg-gradient-success');
		document.getElementById('ap_icon')?.classList.add('bg-gradient-secondary');
	} else {
		if (document.getElementById('ap_count')) document.getElementById('ap_count').innerHTML = '-';
		document.getElementById('ap_icon')?.classList.add('bg-gradient-warning');
		document.getElementById('ap_icon')?.classList.remove('bg-gradient-danger');
		document.getElementById('ap_icon')?.classList.remove('bg-gradient-success');
		document.getElementById('ap_icon')?.classList.remove('bg-gradient-secondary');
	}
	
	if (!loadSwitches) {
		// Mark the Devices tiles in Grey				
		if (document.getElementById('switch_count')) document.getElementById('switch_count').innerHTML = '-';
		document.getElementById('switch_icon')?.classList.remove('bg-gradient-warning');
		document.getElementById('switch_icon')?.classList.remove('bg-gradient-danger');
		document.getElementById('switch_icon')?.classList.remove('bg-gradient-success');
		document.getElementById('switch_icon')?.classList.add('bg-gradient-secondary');
	} else {
		if (document.getElementById('switch_count')) document.getElementById('switch_count').innerHTML = '-';
		document.getElementById('switch_icon')?.classList.add('bg-gradient-warning');
		document.getElementById('switch_icon')?.classList.remove('bg-gradient-danger');
		document.getElementById('switch_icon')?.classList.remove('bg-gradient-success');
		document.getElementById('switch_icon')?.classList.remove('bg-gradient-secondary');
	}
	
	if (!loadGateways) {
		// Mark the Devices tiles in Grey				
		if (document.getElementById('gateway_count')) document.getElementById('gateway_count').innerHTML = '-';
		document.getElementById('gateway_icon')?.classList.remove('bg-gradient-warning');
		document.getElementById('gateway_icon')?.classList.remove('bg-gradient-danger');
		document.getElementById('gateway_icon')?.classList.remove('bg-gradient-success');
		document.getElementById('gateway_icon')?.classList.add('bg-gradient-secondary');
	} else {				
		if (document.getElementById('gateway_count')) document.getElementById('gateway_count').innerHTML = '-';
		document.getElementById('gateway_icon')?.classList.add('bg-gradient-warning');
		document.getElementById('gateway_icon')?.classList.remove('bg-gradient-danger');
		document.getElementById('gateway_icon')?.classList.remove('bg-gradient-success');
		document.getElementById('gateway_icon')?.classList.remove('bg-gradient-secondary');
	}
}
function loadMonitoringData(refreshrate) {
	// Check if we need to get the latest data - or can we just load it from localStorage
	apiMessage = false;

	if (!localStorage.getItem('monitoring_update')) {
		getMonitoringData();
	} else {
		var lastRefresh = new Date(parseInt(localStorage.getItem('monitoring_update')));
		var now = new Date();
		var diffTime = Math.abs(now - lastRefresh);
		var diffMinutes = Math.ceil(diffTime / (1000 * 60));
		if (diffMinutes > refreshrate) {
			//console.log("Reading new monitoring data from Central");
			getMonitoringData();
		} else {
			console.log('Loading monitoring data from IndexedDB');
			
			checkEnabledData();
			resetTileUI(loadWirelessClients, loadWiredClients, loadAPs, loadSwitches, loadGateways);
			
			clients = [];
			downAPCount = 0;
			downSwitchCount = 0;
			downGatewayCount = 0;
			siteIssues = 4;
			var clientLoadCount = 0;

			const transaction = db.transaction('general', 'readonly');
			const store = transaction.objectStore('general');

			const allQuery = store.getAll();
			allQuery.onsuccess = function() {
				if (allQuery.result) {
					// Load Site Data first - to be able to cross-reference the siteId/ScopeId
					allQuery.result.forEach(function(entry) {
						if (entry.key === 'monitoring_sites') {
							sites = JSON.parse(entry.data);
							sites.forEach(function(site) { loadSiteUI(site); });
							updateSiteUI();
						}
					});
					
					// Load other data
					allQuery.result.forEach(function(entry) {
						if (entry.key === 'monitoring_devices') {
							if (loadAPs) {
								devices = JSON.parse(entry.data);
							}
						} else if (entry.key === 'monitoring_aps') {
							if (loadAPs) {
								aps = JSON.parse(entry.data);
								aps.forEach(function(ap) { loadAPUI(ap); });
								updateAPUI();
							}
						} else if (entry.key === 'monitoring_switches') {
							if (loadSwitches) {
								switches = JSON.parse(entry.data);
								switches.forEach(function(sw) { loadSwitchUI(sw); });
								updateSwitchUI();
							}
						} else if (entry.key === 'monitoring_gateways') {
							if (loadGateways) {
								gateways = JSON.parse(entry.data);
								gateways.forEach(function(gw) { loadGatewayUI(gw); });
								updateGatewayUI();
							}
						} else if (entry.key === 'monitoring_wirelessClients') {
							if (loadWirelessClients) {
								clientLoadCount++;
								wirelessClients = JSON.parse(entry.data);
								clients = clients.concat(wirelessClients);
								if (!loadWiredClients || clientLoadCount > 1) {
									clients.forEach(function(client) { loadClientUI(client); });
									updateClientUI();
								}
							}
						} else if (entry.key === 'monitoring_wiredClients') {
							if (loadWiredClients) {
								clientLoadCount++;
								wiredClients = JSON.parse(entry.data);
								clients = clients.concat(wiredClients);
								if (!loadWirelessClients || clientLoadCount > 1) {
									clients.forEach(function(client) { loadClientUI(client); });
									updateClientUI();
								}
							}
						} else if (entry.key === 'glp_subscriptions') {
							subscriptions = JSON.parse(entry.data);
							subscriptions.forEach(function(sub) { loadSubscriptionUI(sub); });
							updateSubscriptionUI();
						} else if (entry.key === 'inventory_ap') {
							apInventory = JSON.parse(entry.data);
						} else if (entry.key === 'inventory_switch') {
							switchInventory = JSON.parse(entry.data);
						} else if (entry.key === 'inventory_gateway') {
							gatewayInventory = JSON.parse(entry.data);
						} else if (entry.key === 'config_devices') {
							configDevices = JSON.parse(entry.data);
						} else if (entry.key === 'config_health') {
							configHealth = JSON.parse(entry.data);
						} else if (entry.key === 'config_sites') {
							configSites = JSON.parse(entry.data);
							updateSiteUI();
						}
					});
				}
			};
		}
	}
}

function getMonitoringData(event) {
	if (monitoringNotification) monitoringNotification.close();
	monitoringNotification = showNotification('ca-dashboard', 'Updating Monitoring Data...', 'bottom', 'center', 'primary');
	
	checkEnabledData();
	resetTileUI(loadWirelessClients, loadWiredClients, loadAPs, loadSwitches, loadGateways);
	
	authenticateWithCentral().then(function() {
		clients = [];
		wiredClients = [];
		wirelessClients = [];
		downAPCount = 0;
		downSwitchCount = 0;
		downGatewayCount = 0;
		
		// Check subscriptions
		updateSubscriptions(0).then(function() {
		});
		
		if (siteNotification) siteNotification.close();
		siteNotification = showProgressNotification('ca-world-pin', 'Obtaining Sites...', 'bottom', 'center', 'info');
		getSiteData(0).then(function() {
			updateMonitoringData();
		});
	});
}

function updateMonitoringData() {
	if (deviceNotification) deviceNotification.close();
	deviceNotification = showProgressNotification('ca-ap-icon3', 'Obtaining device monitoring data...', 'bottom', 'center', 'info');
	Promise.all([getDeviceData(1), getAPDeviceData(1), getSwitchDeviceData(1), getGatewayDeviceData(1), getConfigHealthData(0)]).then(function() {
		refreshClientData();
	})
	
	localStorage.setItem('monitoring_update', +new Date());
}


/*  -------------------------------------------------------------------------------------------------------------------------------------------------------------------------
 Monitoring data override functions
------------------------------------------------------------------------------------------------------------------------------------------------------------------------- */
function loadCurrentPageCleanup() {
	// override on visible page - used as a notification
	// Called when new data is being pulled from Central
}

function loadCurrentPageClient() {
	// override on visible page - used as a notification
}

function loadCurrentPageAP() {
	// override on visible page - used as a notification
}

function loadCurrentPageSwitch() {
	// override on visible page - used as a notification
}

function loadCurrentPageGateway() {
	// override on visible page - used as a notification
}

function loadCurrentPageSite() {
	// override on visible page - used as a notification
}

function loadCurrentPageSubscription() {
	// override on visible page - used as a notification
}

function loadSavedData(indexKey, data) {
	// override on visible page - used as a notification
}


/*  -------------------------------------------------------------------------------------------------------------------------------------------------------------------------
 Site  data functions
------------------------------------------------------------------------------------------------------------------------------------------------------------------------- */
function getSiteData(offset) {
	if (offset == 0) {
		sitePromise = new Promise(function(resolve) { siteResolve = resolve; });
		sites = [];
		$('#site-table').DataTable().clear();
	}
	
	var settings = {
		url: getAPIURL() + '/tools/getCommandwHeaders',
		method: 'POST',
		timeout: 0,
		headers: {
			'Content-Type': 'application/json',
		},
		data: JSON.stringify({
			url: localStorage.getItem('base_url') + '/network-monitoring/v1/sites-health?limit='+apiSiteLimit+'&offset='+offset,
			access_token: localStorage.getItem('access_token'),
		}),
	};
	
	fetch(settings.url, {method: settings.method, headers: settings.headers, body: settings.data}).then(r => r.json()).then(function(commandResults) {
		if (commandResults.hasOwnProperty('headers')) {
			//updateAPILimits(JSON.parse(commandResults.headers));
		}
		
		// Process The status code of the result
		var result = processStatus(commandResults);
		// will return the status code to trigger next step
		if (result == 429) {
			// Over API threshold limit. Wait apiWaitDelay value and try again.
			setTimeout(getSiteData, apiWaitDelay, offset);
		} else if (result !== 200) {
			if (siteNotification) {
				siteNotification.update({ type: 'danger', message: 'Failed to download site data' });
				setTimeout(siteNotification.close, 2000);
			}
					siteResolve();
		} else {
			var response = JSON.parse(commandResults.responseBody);
			response.items.forEach(function(item) {
				sites.push(item);
				loadSiteUI(item);
			});
	
			offset = response.next;
			if (offset) {
				//if (document.getElementById('site_count')) document.getElementById('site_count').innerHTML = sites.length;
				if (document.getElementById('site_count')) {
					const countUp = new CountUp('site_count', sites.length);
					if (!countUp.error) {
					  countUp.start();
					} else {
					  console.error(countUp.error);
					}
				}
				var deviceProgress = (sites.length / response.total) * 100;
				siteNotification.update({ progress: deviceProgress });
				getSiteData(offset);
			} else {
				if (siteNotification) siteNotification.update({ progress: 100 });
				updateSiteUI();
				saveDataToDB('monitoring_sites', JSON.stringify(sites));
				if (siteNotification) siteNotification.close();
	
				siteResolve();
				getSiteConfigData(1);
			}
		}
	});
	return sitePromise;
}

function getSiteConfigData(offset) {
	if (offset == 1) {
		siteConfigPromise = new Promise(function(resolve) { siteConfigResolve = resolve; });
		configSites = [];
		siteNotification = showProgressNotification('ca-world-pin', 'Obtaining Site details...', 'bottom', 'center', 'info');
		console.log('Refreshing Config Site Data...')
	}
	
	var settings = {
		url: getAPIURL() + '/tools/getCommandwHeaders',
		method: 'POST',
		timeout: 0,
		headers: {
			'Content-Type': 'application/json',
		},
		data: JSON.stringify({
			url: localStorage.getItem('base_url') + '/network-config/v1/sites',
			access_token: localStorage.getItem('access_token'),
		}),
	};
	
	fetch(settings.url, {method: settings.method, headers: settings.headers, body: settings.data}).then(r => r.json()).then(function(commandResults) {
		if (commandResults.hasOwnProperty('headers')) {
			//updateAPILimits(JSON.parse(commandResults.headers));
		}
		
		// Process The status code of the result
		var result = processStatus(commandResults);
		// will return the status code to trigger next step
		if (result == 429) {
			// Over API threshold limit. Wait apiWaitDelay value and try again.
			setTimeout(getSiteConfigData, apiWaitDelay, offset);
		} else if (result !== 200) {
			if (siteNotification) {
				siteNotification.update({ type: 'danger', message: 'Failed to download site config data' });
				setTimeout(siteNotification.close, 2000);
			}
					siteConfigResolve();
		} else {
			var response = JSON.parse(commandResults.responseBody);
			response.items.forEach(function(item) {
				configSites.push(item);
			});
	
			offset = response.next;
			if (offset) {
				//if (document.getElementById('site_count')) document.getElementById('site_count').innerHTML = sites.length;
				var deviceProgress = (configSites.length / response.total) * 100;
				siteNotification.update({ progress: deviceProgress });
				getSiteConfigData(offset);
			} else {
				if (siteNotification) siteNotification.update({ progress: 100 });
				saveDataToDB('config_sites', JSON.stringify(configSites));
				loadCurrentPageSite();
				if (siteNotification) siteNotification.close();
				siteConfigResolve();
			}
		}
	});
	return siteConfigPromise;
}

function loadSiteUI(site) {
	//console.log(site);
	// Make AP Name as a link to Central
	let name = encodeURI(site['scopeName']);
	let apiURL = localStorage.getItem('base_url');
	let centralBaseURL = centralURLs[apiURL];
	let centralURL = centralBaseURL + '/gravity/monitoring/site/dashboard?contextType=site&selectedView=dashboard&siteId=' + site['id'] + '&selectedPlanet=sun';
	
	// Add row to table
	let table = $('#site-table').DataTable();
	let clientString = '';
site['clients']['health']['groups'].forEach(function(group){
		if (group.name === 'Good') clientString += '<i class="fa-solid fa-circle fa-fw text-success"></i><span class="text-success me-2"><strong> ' + group.value + ' </strong></span>';
		else if (group.name === 'Fair') clientString += '<i class="fa-solid fa-triangle fa-fw text-warning"></i><span class="text-warning me-2"><strong> ' + group.value + ' </strong></span>';
		else if (group.name === 'Poor') clientString += '<i class="fa-solid fa-diamond fa-fw text-danger"></i><span class="text-danger me-2"><strong> ' + group.value + ' </strong></span>';
				
	})
	
	let deviceString = '';
	site['devices']['health']['groups'].forEach(function(group){
		if (group.name === 'Good') deviceString += '<i class="fa-solid fa-circle fa-fw text-success"></i><span class="text-success me-2"><strong> ' + group.value + ' </strong></span>';
		else if (group.name === 'Fair') deviceString += '<i class="fa-solid fa-triangle fa-fw text-warning"></i><span class="text-warning me-2"><strong> ' + group.value + ' </strong></span>';
		else if (group.name === 'Poor') deviceString += '<i class="fa-solid fa-diamond fa-fw text-danger"></i><span class="text-danger me-2"><strong> ' + group.value + ' </strong></span>';
	})
	
	let alertString = '';
	site['alerts']['groups'].forEach(function(group){
		if (group.name === 'Critical') alertString += '<i class="fa-solid fa-bell fa-fw text-danger"></i><span class="text-danger me-2"><strong> ' + group.count + ' </strong></span>';
		else if (group.name === 'Major') alertString += '<i class="fa-solid fa-bell fa-fw text-warning"></i><span class="text-warning me-2"><strong> ' + group.count + ' </strong></span>';
		else if (group.name === 'Minor') alertString += '<i class="fa-solid fa-bell fa-fw text-purple"></i><span class="text-purple me-2"><strong> ' + group.count + ' </strong></span>';
		else if (group.name === 'Info') alertString += '<i class="fa-solid fa-bell fa-fw text-info"></i><span class="text-info me-2"><strong> ' + group.count + ' </strong></span>';
	})
	
	let mapsString = 'https://www.google.com/maps/search/?api=1&query='+site['location']['latitude']+','+site['location']['longitude'];
	let configString = 'https://internal-ui.central.arubanetworks.com/gravity/monitoring/config/profiles?contextType=site&selectedView=configuration&siteId='+site['id']+'&selectedPlanet=sun&configMenu=selected-site&configView=profile&configTab=profiles'
	
	table.row.add(['<a href="' + centralURL + '" target="_blank" rel="noopener noreferrer"><strong>' + escapeHtml(site['siteName']) + '</strong></a>', clientString, deviceString, alertString, '<span data-bs-toggle="tooltip" data-bs-placement="top" title="Open location in Google Maps"><a href="' + mapsString + '" target="_blank" rel="noopener noreferrer"><strong><i class="fa-solid fa-globe-pointer fa-fw text-dark"></i></strong></a></span>&nbsp;<span data-bs-toggle="tooltip" data-bs-placement="top" title="Open config in Central"><a href="' + configString + '" target="_blank" rel="noopener noreferrer"><strong><i class="fa-solid fa-gear fa-fw text-dark"></i></strong></a></span>']);

	initializeTooltips(table.table().body());
}

function updateSiteUI() {
	// Force reload of table data
	$('#site-table')
		.DataTable()
		.rows()
		.draw();

	//if (document.getElementById('site_count')) document.getElementById('site_count').innerHTML = '' + sites.length + '';
	if (document.getElementById('site_count')) {
		const countUp = new CountUp('site_count', sites.length);
		if (!countUp.error) {
		  countUp.start();
		} else {
		  console.error(countUp.error);
		}
	}
	document.getElementById('site_icon')?.classList.remove('bg-gradient-warning');
	document.getElementById('site_icon')?.classList.remove('bg-gradient-danger');
	document.getElementById('site_icon')?.classList.add('bg-gradient-info');
	
	if (document.getElementById('siteselector')) {	
		
		var siteChoices = [];
		sites.forEach(function(site) {
			siteChoices.push({ value: site['id'], label: site['siteName'] });
		});
		siteSelector.clearChoices();
		siteSelector.setChoices(siteChoices);
	}
	
	if (document.getElementById('allsiteselector')) {	
		// Includes "All Sites" as an option
		var siteChoices = [];
		siteChoices.push({ label: 'General', choices: [{value: '_all',label: 'All Sites',selected: true,disabled: false}] });
		var siteList = [];
		sites.forEach(function(site) {
			siteList.push({ value: site['id'], label: site['siteName'] });
		});
		siteChoices.push({ label: 'Sites', choices: siteList });
		siteSelector.clearChoices();
		siteSelector.setChoices(siteChoices);
		siteSelector.setChoiceByValue(['_all']);
	}
	
	// call to current showing page
	loadCurrentPageSite();
}

function getConfigSites() {
	return configSites;
}

function getSites() {
	return sites;
}

function getSiteForId(siteId) {
	return sites.find(function(site) { return site.id === siteId; }) || null;
}

function getSiteForName(siteName) {
	return sites.find(function(site) { return site.siteName === siteName; }) || null;
}

/*  -------------------------------------------------------------------------------------------------------------------------------------------------------------------------
 Monitoring data functions
------------------------------------------------------------------------------------------------------------------------------------------------------------------------- */
function getWirelessClientData(offset) {

	var settings = {
		url: getAPIURL() + '/tools/getCommandwHeaders',
		method: 'POST',
		timeout: 0,
		headers: {
			'Content-Type': 'application/json',
		},
		data: JSON.stringify({
			url: localStorage.getItem('base_url') + '/network-monitoring/v1/clients?filter=status%20in%20%28%27Connected%27%2C%20%27Failed%27%29%20and%20clientConnectionType%20eq%20%27Wireless%27&limit='+apiDeviceLimit+'&next=' + offset,
			access_token: localStorage.getItem('access_token'),
		}),
	};
	
	fetch(settings.url, {method: settings.method, headers: settings.headers, body: settings.data}).then(r => r.json()).then(function(commandResults) {
		if (commandResults.hasOwnProperty('headers')) {
			//updateAPILimits(JSON.parse(commandResults.headers));
		}
		
		// Process The status code of the result
		var result = processStatus(commandResults);
		// will return the status code to trigger next step
		if (result == 429) {
			// Over API threshold limit. Wait apiWaitDelay value and try again.
			setTimeout(getWirelessClientData, apiWaitDelay, offset);
		} else if (result !== 200) {
			if (clientWirelessNotification) {
				clientWirelessNotification.update({ type: 'danger', message: 'Failed to download wireless client monitoring data' });
				setTimeout(clientWirelessNotification.close, 2000);
			}
					if (clientWirelessResolve) clientWirelessResolve();
		} else {
			var options = {
				startVal: clients.length,
			};
			
			var response = JSON.parse(commandResults.responseBody);
			response.items.forEach(function(item) {
					clients.push(item);
					wirelessClients.push(item);
					loadClientUI(item);
			});
			offset = response.next;
			if (offset) {
				if (document.getElementById('client_count')) {
					const countUp = new CountUp('client_count', clients.length, options);
					if (!countUp.error) {
					  countUp.start();
					} else {
					  console.error(countUp.error);
					}
				}
				var clientProgress = ((wirelessClients.length) / response.total) * 100;
				clientWirelessNotification.update({ progress: clientProgress });
				getWirelessClientData(offset);
			} else {
				if (clientWirelessNotification) clientWirelessNotification.update({ progress: 100 });
				updateClientUI();
				saveDataToDB('monitoring_clients', JSON.stringify(clients));
				saveDataToDB('monitoring_wirelessClients', JSON.stringify(wirelessClients));
				if (clientWirelessNotification) setTimeout(clientWirelessNotification.close, 1000);
				
				clientWirelessResolve();
				
				// call to current showing page
				loadCurrentPageClient();
			}
		}
	});
	return clientWirelessPromise;
}

function getWiredClientData(offset) {
		
	var settings = {
		url: getAPIURL() + '/tools/getCommandwHeaders',
		method: 'POST',
		timeout: 0,
		headers: {
			'Content-Type': 'application/json',
		},
		data: JSON.stringify({
			url: localStorage.getItem('base_url') + '/network-monitoring/v1/clients?filter=status%20in%20%28%27Connected%27%2C%20%27Failed%27%29%20and%20clientConnectionType%20eq%20Wired&limit='+apiDeviceLimit+'&next=' + offset,
			access_token: localStorage.getItem('access_token'),
		}),
	};
	
	fetch(settings.url, {method: settings.method, headers: settings.headers, body: settings.data}).then(r => r.json()).then(function(commandResults) {
		if (commandResults.hasOwnProperty('headers')) {
			//updateAPILimits(JSON.parse(commandResults.headers));
		}
		// Process The status code of the result
		var result = processStatus(commandResults);
		// will return the status code to trigger next step
		if (result == 429) {
			// Over API threshold limit. Wait apiWaitDelay value and try again.
			setTimeout(getWiredClientData, apiWaitDelay, offset);
		} else if (result !== 200) {
			if (clientWiredNotification) {
				clientWiredNotification.update({ type: 'danger', message: 'Failed to download wired client monitoring data' });
				setTimeout(clientWiredNotification.close, 2000);
			}
					if (clientWiredResolve) clientWiredResolve();
		} else {
			var options = {
			  startVal: clients.length,
			};
			
			var response = JSON.parse(commandResults.responseBody);
			response.items.forEach(function(item) {
					clients.push(item);
					wiredClients.push(item);
					loadClientUI(item);
			});
			offset = response.next;
			if (offset) {
				if (document.getElementById('client_count')) {
					const countUp = new CountUp('client_count', clients.length, options);
					if (!countUp.error) {
					  countUp.start();
					} else {
					  console.error(countUp.error);
					}
				}
				var clientProgress = ((wiredClients.length) / response.total) * 100;
				clientWiredNotification.update({ progress: clientProgress });
				getWiredClientData(offset);
			} else {
				if (clientWiredNotification) clientWiredNotification.update({ progress: 100 });
				updateClientUI();
				saveDataToDB('monitoring_clients', JSON.stringify(clients));
				saveDataToDB('monitoring_wiredClients', JSON.stringify(wiredClients));
				if (clientWiredNotification) setTimeout(clientWiredNotification.close, 1000);
				
				clientWiredResolve();
				
				// call to current showing page
				loadCurrentPageClient();
			}
		}
	});
	return clientWiredPromise;
}

function getClients() {
	return clients;
}

function getWirelessClients() {
	return wirelessClients;
}

function getWiredClients() {
	return wiredClients;
}

function refreshClientData() {
	// Grab client data after grabbing devices (so we can match device Serials to device Names)
	clients = [];
	$('#client-table').DataTable().clear();
	
	if (loadWirelessClients) {
		wirelessClients = [];
		if (clientWirelessNotification) clientWirelessNotification.close();
		logNote('Refreshing Wireless Client Data...');
		clientWirelessNotification = showProgressNotification('ca-ap-icon3', 'Obtaining wireless client monitoring data...', 'bottom', 'center', 'info');
		clientWirelessPromise = new Promise(function(resolve) { clientWirelessResolve = resolve; });
	}
	
	if (loadWiredClients) {
		wiredClients = [];
		if (clientWiredNotification) clientWiredNotification.close();
		logNote('Refreshing Wired Client Data...')
		clientWiredNotification = showProgressNotification('ca-ap-icon3', 'Obtaining wired client monitoring data...', 'bottom', 'center', 'info');
		clientWiredPromise = new Promise(function(resolve) { clientWiredResolve = resolve; });
	}
	localStorage.setItem('monitoring_client_update', +new Date());
	if (loadWirelessClients) getWirelessClientData(1);
	if (loadWiredClients) getWiredClientData(1);
}

function loadClientUI(client) {
	//var memoryUsage = (((ap['mem_total'] - ap['mem_free']) / ap['mem_total']) * 100).toFixed(0).toString();
	//console.log(client)
	let type = '<i class="fa-solid fa-wifi text-dark"></i>';
	let connection = client['wirelessChannel']
	if (client['clientConnectionType'] === 'Wired') {
		type = '<i class="fa-solid fa-ethernet text-dark"></i>';
		connection = client['port']
	}
	
	let status = '<i class="fa-solid fa-link-slash text-danger"></i>';
	if (client['status'] == 'Connected') {
		status = '<i class="fa-solid fa-link text-success"></i>';
	}
	
	/*if (client['health'] == 'Good') {
		status += ' <i class="fa-solid fa-circle text-success"></i>';
	} else if (client['health'] == 'Poor') {
		status += ' <i class="fa-solid fa-diamond text-danger"></i>';
	} else if (client['health'] == 'Fair') {
		status += ' <i class="fa-solid fa-triangle text-warning"></i>';
	} else if  (client['health'] == 'Unknown') {
		status += ' <i class="fa-solid fa-circle-question text-dark"></i>';
	}*/
	
	var ip_address = client['ipv4'];
	if (!ip_address) ip_address = client['ipv6'];
	if (!ip_address) ip_address = '';

	// Build Uptime String
	var uptimeString = '-';
	if (client['uptimeInMillis'] > 0) {
		var uptime = moment.duration(client['uptimeInMillis']);
		uptimeString = uptime.humanize();
	} else if (client['lastSeenAt']){
		//var uptime = moment.duration(ap['lastSeenAt'] * 1000);
		//uptimeString = uptime.humanize();
	}
	
	var clientIcon = '<span title="wired"></span><i class="fa-solid fa-ethernet"></i>'
	if (client.type === "Wireless") clientIcon = '<span title="wireless"></span><i class="fa-solid fa-wifi"></i>'
	
	// Make Name as a link to Central
	var name = encodeURI(client['name']);
	var apiURL = localStorage.getItem('base_url');
	var centralBaseURL = centralURLs[apiURL];
	var centralURL = centralBaseURL + '/gravity/monitoring/clients/dashboard?contextType=clients&selectedView=dashboard&siteId=' + client['siteId'] + '&selectedPlanet=sun&clientId=' + client['macAddress'] + '&networkType='+ client['type'];
	
	// Get Site	var deviceSite = getSiteForId(device['siteId'])
	var deviceSite = getSiteForId(client['siteId'])
	var deviceSiteURL = '';
	if (deviceSite) {
		deviceSiteURL = centralBaseURL + '/gravity/monitoring/site/dashboard?contextType=site&selectedView=dashboard&siteId=' + client['siteId'] + '&selectedPlanet=sun&';
	}
	
	// Get Connected Device info
	var connectedDevice = findDeviceInMonitoring(client['connectedDeviceSerial']);
	var connectedDeviceURL = '';
	if (connectedDevice) {
		connectedDeviceURL = centralBaseURL + '/gravity/monitoring/ap/dashboard?contextType=ap&selectedView=dashboard&siteId=' + client['siteId'] + '&selectedPlanet=sun&deviceId=' + connectedDevice['serialNumber'];
	}
	
	let clientOS = client['clientOperatingSystem'];
	if (clientOS === '-') clientOS = client['clientVendor'] + ' ' + client['clientFunction'];
	  
	// Add row to table
	var table = $('#client-table').DataTable();
	table.row.add(['<a href="' + centralURL + '" target="_blank" rel="noopener noreferrer"><strong>' + escapeHtml(client['clientName']) + '</strong></a>', '<span data-bs-toggle="tooltip" data-bs-placement="top" title="' + escapeHtml(client['clientConnectionType']) + '"></span>' + type, '<span data-bs-toggle="tooltip" data-bs-placement="top" title="' + escapeHtml(client['status']) + '"></span>' + status, escapeHtml(client['macAddress']), escapeHtml(ip_address), escapeHtml(client['vlanId']), connectedDevice ? '<a href="' + connectedDeviceURL + '" target="_blank" rel="noopener noreferrer"><strong>' + escapeHtml(client['connectedTo']) + '</strong></a>' : '', escapeHtml(connection), escapeHtml(clientOS), deviceSite ? '<a href="' + deviceSiteURL + '" target="_blank" rel="noopener noreferrer"><strong>' + escapeHtml(deviceSite['siteName']) + '</strong></a>' : '']);

	initializeTooltips(table.table().body());
}

function updateClientUI() {
	// Force reload of table data
	$('#client-table')
		.DataTable()
		.rows()
		.draw();
	//console.log(clients.length)
	if (document.getElementById('client_count')) {
		const countUp = new CountUp('client_count', clients.length);
		if (!countUp.error) {
		  countUp.start();
		} else {
		  console.error(countUp.error);
		}
	}
	document.getElementById('client_icon')?.classList.remove('bg-gradient-warning');
	if (!loadAPs) {
		document.getElementById('client_icon')?.classList.add('bg-gradient-secondary');
		document.getElementById('client_icon')?.classList.remove('bg-gradient-danger');
		document.getElementById('client_icon')?.classList.remove('bg-gradient-success');
	} else {
		/*if (downClientCount > 0) {
			document.getElementById('client_icon')?.classList.add('bg-gradient-danger');
			document.getElementById('client_icon')?.classList.remove('bg-gradient-success');
			document.getElementById('client_icon')?.classList.remove('bg-gradient-secondary');
		} else {*/
			document.getElementById('client_icon')?.classList.remove('bg-gradient-danger');
			document.getElementById('client_icon')?.classList.add('bg-gradient-success');
			document.getElementById('client_icon')?.classList.remove('bg-gradient-secondary');
		//}
	}
	// call to current showing page
	loadCurrentPageClient();
}


function getDeviceData(offset) {
	if (offset == 1) {
		devicePromise = new Promise(function(resolve) { deviceResolve = resolve; });
	}
	
	var deviceTypeList = [];
	if (loadAPs) deviceTypeList.push('ACCESS_POINT');
	if (loadSwitches) deviceTypeList.push('SWITCH');
	if (loadGateways) deviceTypeList.push('GATEWAY');
	if (deviceTypeList.length > 0) {
		var urlPath = encodeURI('deviceType in (' + deviceTypeList.join(',') + ')');
		
		var settings = {
			url: getAPIURL() + '/tools/getCommandwHeaders',
			method: 'POST',
			timeout: 0,
			headers: {
				'Content-Type': 'application/json',
			},
			data: JSON.stringify({
				url: localStorage.getItem('base_url') + '/network-monitoring/v1/devices?filter=' + urlPath + '&limit='+apiDeviceLimit+'&next=' + offset,
				access_token: localStorage.getItem('access_token'),
			}),
		};
		
		fetch(settings.url, {method: settings.method, headers: settings.headers, body: settings.data}).then(r => r.json()).then(function(commandResults) {
			if (commandResults.hasOwnProperty('headers')) {
				//updateAPILimits(JSON.parse(commandResults.headers));
			}
			
			// Process The status code of the result
			var result = processStatus(commandResults);
			// will return the status code to trigger next step
			if (result == 429) {
				// Over API threshold limit. Wait apiWaitDelay value and try again.
				setTimeout(getDeviceData, apiWaitDelay, offset);
			} else if (result !== 200) {
				if (deviceNotification) {
					deviceNotification.update({ type: 'danger', message: 'Failed to download device data' });
					setTimeout(deviceNotification.close, 2000);
				}
						if (deviceResolve) deviceResolve();
			} else {
				var response = JSON.parse(commandResults.responseBody);
				
				devices = devices.concat(response.items);
				
				offset = response.next;
				if (offset) {
					var deviceProgress = ((aps.length + switches.length + gateways.length) / response.total) * 100;
					deviceNotification.update({ progress: deviceProgress });
					getDeviceData(offset);
				} else {
					if (deviceNotification) deviceNotification.update({ progress: 100 });
					saveDataToDB('monitoring_devices', JSON.stringify(devices));
					if (deviceNotification) deviceNotification.close();
					deviceResolve();
				}
			}
		});
	}
	return devicePromise;
}

function getDevices() {
	return devices;
}

function findDeviceInUDL(serial) {
	return devices.find(function(dev) {
		return dev.serialNumber.toUpperCase() === serial.toUpperCase();
	}) || null;
}


function getAPDeviceData(offset, needClients=false) {
	if (offset == 1) {
		if (apNotification) apNotification.close();
		logNote('Refreshing AP Data...')
		apNotification = showProgressNotification('ca-ap-icon3', 'Obtaining AP monitoring data...', 'bottom', 'center', 'info');
		apPromise = new Promise(function(resolve) { apResolve = resolve; });
		downAPCount = 0;
		aps = [];
		$('#ap-table').DataTable().clear();
	}
		
	var settings = {
		url: getAPIURL() + '/tools/getCommandwHeaders',
		method: 'POST',
		timeout: 0,
		headers: {
			'Content-Type': 'application/json',
		},
		data: JSON.stringify({
			url: localStorage.getItem('base_url') + '/network-monitoring/v1/aps?limit='+apiDeviceLimit+'&next=' + offset,
			access_token: localStorage.getItem('access_token'),
		}),
	};
	
	fetch(settings.url, {method: settings.method, headers: settings.headers, body: settings.data}).then(r => r.json()).then(function(commandResults) {
		if (commandResults.hasOwnProperty('headers')) {
			//updateAPILimits(JSON.parse(commandResults.headers));
		}
		
		// Process The status code of the result
		var result = processStatus(commandResults);
		// will return the status code to trigger next step
		if (result == 429) {
			// Over API threshold limit. Wait apiWaitDelay value and try again.
			setTimeout(getAPDeviceData, apiWaitDelay, offset);
		} else if (result !== 200) {
			if (apNotification) {
				apNotification.update({ type: 'danger', message: 'Failed to download device monitoring data' });
				setTimeout(apNotification.close, 2000);
			}
					if (apResolve) apResolve();
		} else {
			var options = {
			  startVal: aps.length,
			};
			
			var response = JSON.parse(commandResults.responseBody);
			
			response.items.forEach(function(item) {
				aps.push(item);
				loadAPUI(item);
			});
			
			offset = response.next;
			if (offset) {
				//if (document.getElementById('ap_count')) document.getElementById('ap_count').innerHTML = aps.length;
				if (document.getElementById('ap_count')) {
					const countUp = new CountUp('ap_count', aps.length, options);
					if (!countUp.error) {
					  countUp.start();
					} else {
					  console.error(countUp.error);
					}
				}
				var deviceProgress = ((aps.length) / response.total) * 100;
				apNotification.update({ progress: deviceProgress });
				getAPDeviceData(offset);
			} else {
				if (apNotification) apNotification.update({ progress: 100 });
				updateAPUI();
				saveDataToDB('monitoring_aps', JSON.stringify(aps));
				if (apNotification) setTimeout(apNotification.close, 1000);
	
				apResolve();
			}
		}
	});
	return apPromise;
}

function getAPs() {
	return aps;
}

function loadAPUI(device) {
	//var memoryUsage = (((ap['mem_total'] - ap['mem_free']) / ap['mem_total']) * 100).toFixed(0).toString();
	
	var status = '<i class="fa-solid fa-diamond text-danger"></i>';
	var deviceUp = true;
	if (device['status'].toUpperCase() == 'ONLINE') {
		status = '<i class="fa-solid fa-circle text-success"></i>';
	} else {
		downAPCount++;
		deviceUp = false;
	}
	var ip_address = device['ipv4'];
	if (!ip_address) ip_address = device['ipv6'];
	if (!ip_address) ip_address = '';

	// Build Uptime String
	var uptimeString = '-';
	if (device['uptimeInMillis'] > 0) {
		var uptime = moment.duration(device['uptimeInMillis']);
		uptimeString = uptime.humanize();
	} else if (device['lastSeenAt']){
		//var uptime = moment.duration(ap['lastSeenAt'] * 1000);
		//uptimeString = uptime.humanize();
	}
	
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
	var table = $('#ap-table').DataTable();
	table.row.add([device['Conductor'] ? '<a href="' + centralURL + '" target="_blank" rel="noopener noreferrer"><strong>' + escapeHtml(device['deviceName']) + ' (VC)</strong></a>' : '<a href="' + centralURL + '" target="_blank" rel="noopener noreferrer"><strong>' + escapeHtml(device['deviceName']) + '</strong></a>', '<span data-bs-toggle="tooltip" data-bs-placement="top" title="' + escapeHtml(device['status']) + '"></span>' + status, escapeHtml(ip_address), escapeHtml(device['model']), escapeHtml(device['serialNumber']), escapeHtml(device['macAddress']), device['clientCount'] ? escapeHtml(device['clientCount']) : '-', escapeHtml(device['firmwareVersion']), deviceSite ? '<a href="' + deviceSiteURL + '" target="_blank" rel="noopener noreferrer"><strong>' + escapeHtml(deviceSite['siteName']) + '</strong></a>' : ''/*, '<span title="' + device['uptimeInMillis'] + '"></span>' + uptimeString*/]);

	initializeTooltips(table.table().body());
}

function updateAPUI() {
	// Force reload of table data
	$('#ap-table')
		.DataTable()
		.rows()
		.draw();

	//if (document.getElementById('ap_count')) document.getElementById('ap_count').innerHTML = '' + aps.length + '';
	if (document.getElementById('ap_count')) {
		const countUp = new CountUp('ap_count', aps.length);
		if (!countUp.error) {
		  countUp.start();
		} else {
		  console.error(countUp.error);
		}
	}
	document.getElementById('ap_icon')?.classList.remove('bg-gradient-warning');
	if (!loadAPs) {
		document.getElementById('ap_icon')?.classList.add('bg-gradient-secondary');
		document.getElementById('ap_icon')?.classList.remove('bg-gradient-danger');
		document.getElementById('ap_icon')?.classList.remove('bg-gradient-success');
	} else {
		if (downAPCount > 0) {
			document.getElementById('ap_icon')?.classList.add('bg-gradient-danger');
			document.getElementById('ap_icon')?.classList.remove('bg-gradient-success');
			document.getElementById('ap_icon')?.classList.remove('bg-gradient-secondary');
		} else {
			document.getElementById('ap_icon')?.classList.remove('bg-gradient-danger');
			document.getElementById('ap_icon')?.classList.add('bg-gradient-success');
			document.getElementById('ap_icon')?.classList.remove('bg-gradient-secondary');
		}
	}
	// call to current showing page
	loadCurrentPageAP();
}

function getSwitchDeviceData(offset) {
	if (offset == 1) {
		if (switchNotification) switchNotification.close();
		logNote('Refreshing Switch Data...')
		switchNotification = showProgressNotification('ca-switch-stack3', 'Obtaining Switch monitoring data...', 'bottom', 'center', 'info');
		switchPromise = new Promise(function(resolve) { switchResolve = resolve; });
		downSwitchCount = 0;
		switches = [];
		$('#switch-table').DataTable().clear();
	}
		
	var settings = {
		url: getAPIURL() + '/tools/getCommandwHeaders',
		method: 'POST',
		timeout: 0,
		headers: {
			'Content-Type': 'application/json',
		},
		data: JSON.stringify({
			url: localStorage.getItem('base_url') + '/network-monitoring/v1/switches?limit='+apiDeviceLimit+'&next=' + offset,
			access_token: localStorage.getItem('access_token'),
		}),
	};
	
	fetch(settings.url, {method: settings.method, headers: settings.headers, body: settings.data}).then(r => r.json()).then(function(commandResults) {
		if (commandResults.hasOwnProperty('headers')) {
			//updateAPILimits(JSON.parse(commandResults.headers));
		}
		
		// Process The status code of the result
		var result = processStatus(commandResults);
		// will return the status code to trigger next step
		if (result == 429) {
			// Over API threshold limit. Wait apiWaitDelay value and try again.
			setTimeout(getSwitchDeviceData, apiWaitDelay, offset);
		} else if (result !== 200) {
			if (switchNotification) {
				switchNotification.update({ type: 'danger', message: 'Failed to download device monitoring data' });
				setTimeout(switchNotification.close, 2000);
			}
					if (switchResolve) switchResolve();
		} else {
			
			const options = {
			  startVal: switches.length,
			};
			
			var response = JSON.parse(commandResults.responseBody);
			response.items.forEach(function(item) {
				switches.push(item);
				loadSwitchUI(item);
			});
			
			offset = response.next;
			if (offset) {
				//if (document.getElementById('switch_count')) document.getElementById('switch_count').innerHTML = switches.length;
				if (document.getElementById('switch_count')) {
					const countUp = new CountUp('switch_count', switches.length, options);
					if (!countUp.error) {
					  countUp.start();
					} else {
					  console.error(countUp.error);
					}
				}
				var deviceProgress = ((switches.length) / response.total) * 100;
				switchNotification.update({ progress: deviceProgress });
				getSwitchDeviceData(offset);
			} else {
				if (switchNotification) switchNotification.update({ progress: 100 });
				updateSwitchUI();
				saveDataToDB('monitoring_switches', JSON.stringify(switches));
				if (switchNotification) setTimeout(switchNotification.close, 1000);
	
				switchResolve();
			}
		}
	});
	return switchPromise;
}

function getSwitches() {
	return switches;
}

function loadSwitchUI(device) {
		//var memoryUsage = (((ap['mem_total'] - ap['mem_free']) / ap['mem_total']) * 100).toFixed(0).toString();
	
	var status = '<i class="fa-solid fa-diamond text-danger"></i>';
	var deviceUp = true;
	if (device['status'].toUpperCase() == 'ONLINE') {
		status = '<i class="fa-solid fa-circle text-success"></i>';
	} else {
		downSwitchCount++;
		deviceUp = false;
	}
	var ip_address = device['ipv4'];
	if (!ip_address) ip_address = device['ipv6'];
	if (!ip_address) ip_address = '';

	// Build Uptime String
	var uptimeString = '-';
	if (device['uptimeInMillis'] > 0) {
		var uptime = moment.duration(device['uptimeInMillis']);
		uptimeString = uptime.humanize();
	} else if (device['lastSeenAt']){
		//var uptime = moment.duration(ap['lastSeenAt'] * 1000);
		//uptimeString = uptime.humanize();
	}

	// Make Name as a link to Central
	var name = encodeURI(device['deviceName']);
	var apiURL = localStorage.getItem('base_url');
	var centralBaseURL = centralURLs[apiURL];
	var centralURL = centralBaseURL + '/gravity/monitoring/switch/dashboard?contextType=switch&selectedView=dashboard&siteId=' + device['siteId'] + '&selectedPlanet=sun&deviceId=' + device['serialNumber'];
	
	// Get Site
	var deviceSite = getSiteForId(device['siteId'])
	var deviceSiteURL = '';
	if (deviceSite) {
		deviceSiteURL = centralBaseURL + '/gravity/monitoring/site/dashboard?contextType=site&selectedView=dashboard&siteId=' + device['siteId'] + '&selectedPlanet=sun&timelineFrame=Hour';
	}
	
	// Add row to table
	var table = $('#switch-table').DataTable();
	table.row.add([device['Conductor'] ? '<a href="' + centralURL + '" target="_blank" rel="noopener noreferrer"><strong>' + escapeHtml(device['deviceName']) + ' (VC)</strong></a>' : '<a href="' + centralURL + '" target="_blank" rel="noopener noreferrer"><strong>' + escapeHtml(device['deviceName']) + '</strong></a>', '<span data-bs-toggle="tooltip" data-bs-placement="top" title="' + escapeHtml(device['status']) + '"></span>' + status, escapeHtml(ip_address), escapeHtml(device['model']), escapeHtml(device['serialNumber']), escapeHtml(device['macAddress']), escapeHtml(device['firmwareVersion']), deviceSite ? '<a href="' + deviceSiteURL + '" target="_blank" rel="noopener noreferrer"><strong>' + escapeHtml(deviceSite['siteName']) + '</strong></a>' : '', '<span title="' + escapeHtml(device['uptimeInMillis']) + '"></span>' + uptimeString]);

	initializeTooltips(table.table().body());
}

function updateSwitchUI() {
	// Force reload of table data
	$('#switch-table')
		.DataTable()
		.rows()
		.draw();

	//if (document.getElementById('switch_count')) document.getElementById('switch_count').innerHTML = '' + switches.length + '';
	if (document.getElementById('switch_count')) {
		const countUp = new CountUp('switch_count', switches.length);
		if (!countUp.error) {
		  countUp.start();
		} else {
		  console.error(countUp.error);
		}
	}
	document.getElementById('switch_icon')?.classList.remove('bg-gradient-warning');
	if (!loadSwitches) {
		document.getElementById('switch_icon')?.classList.add('bg-gradient-secondary');
		document.getElementById('switch_icon')?.classList.remove('bg-gradient-danger');
		document.getElementById('switch_icon')?.classList.remove('bg-gradient-success');
	} else {
		if (downSwitchCount > 0) {
			document.getElementById('switch_icon')?.classList.add('bg-gradient-danger');
			document.getElementById('switch_icon')?.classList.remove('bg-gradient-success');
			document.getElementById('switch_icon')?.classList.remove('bg-gradient-secondary');
		} else {
			document.getElementById('switch_icon')?.classList.remove('bg-gradient-danger');
			document.getElementById('switch_icon')?.classList.add('bg-gradient-success');
			document.getElementById('switch_icon')?.classList.remove('bg-gradient-secondary');
		}
	}
	// call to current showing page
	loadCurrentPageSwitch();
}

function getGatewayDeviceData(offset) {
	if (offset == 1) {
		if (gatewayNotification) gatewayNotification.close();
		logNote('Refreshing Gateway Data...')
		gatewayNotification = showProgressNotification('ca-gateway3', 'Obtaining Gateway monitoring data...', 'bottom', 'center', 'info');
		gatewayPromise = new Promise(function(resolve) { gatewayResolve = resolve; });
		downGatewayCount = 0;
		gateways = [];
		$('#gateway-table').DataTable().clear();
	}
		
	var settings = {
		url: getAPIURL() + '/tools/getCommandwHeaders',
		method: 'POST',
		timeout: 0,
		headers: {
			'Content-Type': 'application/json',
		},
		data: JSON.stringify({
			url: localStorage.getItem('base_url') + '/network-monitoring/v1/gateways?limit='+apiDeviceLimit+'&next=' + offset,
			access_token: localStorage.getItem('access_token'),
		}),
	};
	
	fetch(settings.url, {method: settings.method, headers: settings.headers, body: settings.data}).then(r => r.json()).then(function(commandResults) {
		if (commandResults.hasOwnProperty('headers')) {
			//updateAPILimits(JSON.parse(commandResults.headers));
		}
		
		// Process The status code of the result
		var result = processStatus(commandResults);
		// will return the status code to trigger next step
		if (result == 429) {
			// Over API threshold limit. Wait apiWaitDelay value and try again.
			setTimeout(getGatewayDeviceData, apiWaitDelay, offset);
		} else if (result !== 200) {
			if (gatewayNotification) {
				gatewayNotification.update({ type: 'danger', message: 'Failed to download device monitoring data' });
				setTimeout(gatewayNotification.close, 2000);
			}
					if (gatewayResolve) gatewayResolve();
		} else {
			
			const options = {
			  startVal: gateways.length,
			};
			
			var response = JSON.parse(commandResults.responseBody);
			response.items.forEach(function(item) {
				gateways.push(item);
				loadGatewayUI(item);
			});
			
			offset = response.next;
			if (offset) {
				//if (document.getElementById('gateway_count')) document.getElementById('gateway_count').innerHTML = gateways.length;
				if (document.getElementById('gateway_count')) {
					const countUp = new CountUp('gateway_count', gateways.length, options);
					if (!countUp.error) {
					  countUp.start();
					} else {
					  console.error(countUp.error);
					}
				}
				var deviceProgress = ((switches.length) / response.total) * 100;
				gatewayNotification.update({ progress: deviceProgress });
				getGatewayDeviceData(offset);
			} else {
				if (gatewayNotification) gatewayNotification.update({ progress: 100 });
				updateGatewayUI();
				saveDataToDB('monitoring_gateways', JSON.stringify(gateways));
				if (gatewayNotification) setTimeout(gatewayNotification.close, 1000);
	
				gatewayResolve();
			}
		}
	});
	return gatewayPromise;
}

function getGateways() {
	return gateways;
}

function loadGatewayUI(device) {
	//var memoryUsage = (((ap['mem_total'] - ap['mem_free']) / ap['mem_total']) * 100).toFixed(0).toString();

	var status = '<i class="fa-solid fa-diamond text-danger"></i>';
	var deviceUp = true;
	if (device['status'].toUpperCase() == 'ONLINE') {
		status = '<i class="fa-solid fa-circle text-success"></i>';
	} else {
		downGatewayCount++;
		deviceUp = false;
	}
	//var ip_address = device['ipv4'];
	ip_address = device['ipAddress'];
	if (!ip_address) ip_address = device['ipv6'];
	if (!ip_address) ip_address = '';

	// Build Uptime String
	var uptimeString = '-';
	if (device['uptimeInMillis'] > 0) {
		var uptime = moment.duration(device['uptimeInMillis']);
		uptimeString = uptime.humanize();
	} else if (device['lastSeenAt']){
		//var uptime = moment.duration(ap['lastSeenAt'] * 1000);
		//uptimeString = uptime.humanize();
	}

	// Make as a link to Central
	var name = encodeURI(device['deviceName']);
	var apiURL = localStorage.getItem('base_url');
	var centralBaseURL = centralURLs[apiURL];
	var centralURL = centralBaseURL + '/gravity/monitoring/gateway/dashboard?contextType=gateway&selectedView=dashboard&siteId=' + device['siteId'] + '&selectedPlanet=sun&deviceId=' + device['serialNumber'];
	
	// Get Site
	var deviceSite = getSiteForId(device['siteId'])
	var deviceSiteURL = '';
	if (deviceSite) {
		deviceSiteURL = centralBaseURL + '/gravity/monitoring/site/dashboard?contextType=site&selectedView=dashboard&siteId=' + device['siteId'] + '&selectedPlanet=sun&timelineFrame=Hour';
	}
	
	let clusterURL = centralBaseURL + '/gravity/monitoring/gateway-cluster/dashboard?contextType=gateway-cluster&selectedView=dashboard&siteId=' + device['siteId'] + '&selectedPlanet=sun&deviceId=' + device['serialNumber']+'&gatewayClusterName='+device['clusterName'];
	
	// Add row to table
	var table = $('#gateway-table').DataTable();
	table.row.add([device['Conductor'] ? '<a href="' + centralURL + '" target="_blank" rel="noopener noreferrer"><strong>' + escapeHtml(device['deviceName']) + ' (VC)</strong></a>' : '<a href="' + centralURL + '" target="_blank" rel="noopener noreferrer"><strong>' + escapeHtml(device['deviceName']) + '</strong></a>', '<span data-bs-toggle="tooltip" data-bs-placement="top" title="' + escapeHtml(device['status']) + '"></span>' + status, escapeHtml(ip_address), escapeHtml(device['model']), escapeHtml(device['serialNumber']), escapeHtml(device['macAddress']), escapeHtml(device['firmwareVersion']), device['clusterName'] ? '<a href="' + clusterURL + '" target="_blank" rel="noopener noreferrer"><strong>' + escapeHtml(device['clusterName']) + '</strong></a>' : '', deviceSite ? '<a href="' + deviceSiteURL + '" target="_blank" rel="noopener noreferrer"><strong>' + escapeHtml(deviceSite['siteName']) + '</strong></a>' : '', '<span title="' + escapeHtml(device['uptimeInMillis']) + '"></span>' + uptimeString]);

	initializeTooltips(table.table().body());
}

function updateGatewayUI() {
	// Force reload of table data
	$('#gateway-table')
		.DataTable()
		.rows()
		.draw();

	//if (document.getElementById('gateway_count')) document.getElementById('gateway_count').innerHTML = '' + gateways.length + '';
	if (document.getElementById('gateway_count')) {
		const countUp = new CountUp('gateway_count', gateways.length);
		if (!countUp.error) {
		  countUp.start();
		} else {
		  console.error(countUp.error);
		}
	}
	document.getElementById('gateway_icon')?.classList.remove('bg-gradient-warning');
	if (!loadGateways) {
		document.getElementById('gateway_icon')?.classList.add('bg-gradient-secondary');
		document.getElementById('gateway_icon')?.classList.remove('bg-gradient-danger');
		document.getElementById('gateway_icon')?.classList.remove('bg-gradient-success');
	} else {
		if (downGatewayCount > 0) {
			document.getElementById('gateway_icon')?.classList.add('bg-gradient-danger');
			document.getElementById('gateway_icon')?.classList.remove('bg-gradient-success');
			document.getElementById('gateway_icon')?.classList.remove('bg-gradient-secondary');
		} else {
			document.getElementById('gateway_icon')?.classList.remove('bg-gradient-danger');
			document.getElementById('gateway_icon')?.classList.add('bg-gradient-success');
			document.getElementById('gateway_icon')?.classList.remove('bg-gradient-secondary');
		}
	}
	// call to current showing page
	loadCurrentPageGateway();
}

function getWLANs(offset) {
	if (offset == 1) {
		wlanDetails = {};
		if (wlanNotification) wlanNotification.close();
		wlanNotification = showProgressNotification('ca-wifi', 'Obtaining WLANs...', 'bottom', 'center', 'info');
	}
	
	var settings = {
		url: getAPIURL() + '/tools/getCommandwHeaders',
		method: 'POST',
		timeout: 0,
		headers: {
			'Content-Type': 'application/json',
		},
		data: JSON.stringify({
			url: localStorage.getItem('base_url') + '/network-monitoring/v1/wlans?limit='+apiRadioListLimit+'&next='+offset,
			access_token: localStorage.getItem('access_token'),
		}),
	};
	
	fetch(settings.url, {method: settings.method, headers: settings.headers, body: settings.data}).then(r => r.json()).then(function(commandResults) {
		if (commandResults.hasOwnProperty('headers')) {
			//updateAPILimits(JSON.parse(commandResults.headers));
		}
		//console.log(commandResults)
		// Process The status code of the result
		let result = processStatus(commandResults);
		// will return the status code to trigger next step
		if (result == 429) {
			// Over API threshold limit. Wait apiWaitDelay value and try again.
			setTimeout(getWLANs, apiWaitDelay, offset);
		} else if (result !== 200) {
			if (wlanNotification) {
				wlanNotification.update({ type: 'danger', message: 'Failed to download WLAN details' });
				setTimeout(wlanNotification.close, 2000);
			}
		} else {
			let response = JSON.parse(commandResults.responseBody);
			
			response.items.forEach(function(item){
				wlanDetails[item.wlanName] = item;
			})
		
			offset += response.count;
			if (offset < response.total) {
				let wlanProgress = (offset / response.total) * 100;
				wlanNotification.update({ progress: wlanProgress });
				getWLANs(offset)
			}  else {
				if (wlanNotification) wlanNotification.update({ progress: 100 });
				//console.log(wlanDetails)
				saveDataToDB('monitoring_wlan_details', JSON.stringify(wlanDetails));
				localStorage.setItem('monitoring_wlan_update', +new Date());
				if (wlanNotification) wlanNotification.close();
				updateWLANSelectorChoices();
			}
		}
		
	});
}

function updateWLANSelectorChoices() {
	if (wlanSelector) { 
		// Update the WLAN dropdown
		var wlanChoices = [];
		wlanChoices.push({ label: 'General', choices: [{value: '_all',label: 'All Clients',selected: true,disabled: false},
												{value: '_wlan',label: 'All WLANs',selected: true,disabled: false},
												{value: '_wired',label: 'Wired Only',selected: true,disabled: false}] 
		});
		var wlanList = [];
		Object.values(wlanDetails).forEach(function(wlan) {
			wlanList.push({ value:wlan.wlanName, label: wlan.wlanName });
		});
		wlanChoices.push({ label: 'WLANs', choices: wlanList });
		wlanSelector.clearChoices();
		wlanSelector.setChoices(wlanChoices);
		wlanSelector.setChoiceByValue(['_all']);
	}
	
	if (wlanSimpleSelector) { 
		// Update the WLAN Simple dropdown
		var wlanChoices = [];
		Object.values(wlanDetails).forEach(function(wlan) {
			wlanChoices.push({ value:wlan.wlanName, label: wlan.wlanName });
		});
		wlanSimpleSelector.clearChoices();
		wlanSimpleSelector.setChoices(wlanChoices);
		wlanSimpleSelector.setChoiceByValue(['_all']);
		wlanSimpleSelector.setChoiceByValue(wlanChoices[0].value);
	}
}

function getBSSIDs(offset) {
	if (offset == 1) {
		bssidPromise = new Promise(function(resolve) { bssidResolve = resolve; });
		bssids = {};
		bssidCount = 0;
		if (bssidNotification) bssidNotification.close();
		bssidNotification = showProgressNotification('ca-antenna', 'Obtaining BSSIDs...', 'bottom', 'center', 'info');
	}
	
	var settings = {
		url: getAPIURL() + '/tools/getCommandwHeaders',
		method: 'POST',
		timeout: 0,
		headers: {
			'Content-Type': 'application/json',
		},
		data: JSON.stringify({
			url: localStorage.getItem('base_url') + '/network-monitoring/v1/bssids?limit='+apiRadioListLimit+'&next='+offset,
			access_token: localStorage.getItem('access_token'),
		}),
	};
	
	fetch(settings.url, {method: settings.method, headers: settings.headers, body: settings.data}).then(r => r.json()).then(function(commandResults) {
		if (commandResults.hasOwnProperty('headers')) {
			//updateAPILimits(JSON.parse(commandResults.headers));
		}
		
		// Process The status code of the result
		var result = processStatus(commandResults);
		// will return the status code to trigger next step
		if (result == 429) {
			// Over API threshold limit. Wait apiWaitDelay value and try again.
			setTimeout(getBSSIDs, apiWaitDelay, offset);
		} else if (result !== 200) {
			if (bssidNotification) {
				bssidNotification.update({ type: 'danger', message: 'Failed to download bssid details' });
				setTimeout(bssidNotification.close, 2000);
				if (bssidResolve) bssidResolve();
			}
		} else {
			var response = JSON.parse(commandResults.responseBody);
			//console.log(response)
			response.items.forEach(function(item) {
				if (!bssids[item['radioMacAddress']]) bssids[item['radioMacAddress']] = [];
				let apBSSIDs = bssids[item['radioMacAddress']];
				apBSSIDs.push(item);
				bssids[item['radioMacAddress']] = apBSSIDs;
			})
			
			bssidCount += response.count;
			if (bssidCount < response.total) {
				var radioProgress = (bssidCount / response.total) * 100;
				bssidNotification.update({ progress: radioProgress });
				getBSSIDs(response.next)
			}  else {
				if (bssidNotification) bssidNotification.update({ progress: 100 });
				saveDataToDB('monitoring_bssid_details', JSON.stringify(bssids));
				localStorage.setItem('monitoring_bssid_update', +new Date());
				if (bssidNotification) bssidNotification.close();
				if (bssidResolve) bssidResolve();
			}
		}
		
	});
	return bssidPromise;
}

function getBSSIDList() {
	return bssids;
}

function getRadios(next) {
	if (next == 1) {
		radioPromise = new Promise(function(resolve) { radioResolve = resolve; });
		radios = [];
		if (radioNotification) radioNotification.close();
		radioNotification = showProgressNotification('ca-router', 'Obtaining Wi-Fi Radio Details...', 'bottom', 'center', 'info');
	}
	
	var settings = {
		url: getAPIURL() + '/tools/getCommandwHeaders',
		method: 'POST',
		timeout: 0,
		headers: {
			'Content-Type': 'application/json',
		},
		data: JSON.stringify({
			url: localStorage.getItem('base_url') + '/network-monitoring/v1/radios?limit='+apiRadioListLimit+'&next='+next,
			access_token: localStorage.getItem('access_token'),
		}),
	};
	
	fetch(settings.url, {method: settings.method, headers: settings.headers, body: settings.data}).then(r => r.json()).then(function(commandResults) {
		if (commandResults.hasOwnProperty('headers')) {
			//updateAPILimits(JSON.parse(commandResults.headers));
		}
		//console.log(commandResults)
		// Process The status code of the result
		var result = processStatus(commandResults);
		// will return the status code to trigger next step
		if (result == 429) {
			// Over API threshold limit. Wait apiWaitDelay value and try again.
			setTimeout(getRadios, apiWaitDelay, offset);
		} else if (result !== 200) {
			if (radioNotification) {
				radioNotification.update({ type: 'danger', message: 'Failed to download radio details' });
				setTimeout(radioNotification.close, 2000);
			}
			if (radioResolve) radioResolve();
		} else {
			var response = JSON.parse(commandResults.responseBody);
			radios = radios.concat(response.items);
			
			if (response.next) {
				var radioProgress = (radios.length / response.total) * 100;
				radioNotification.update({ progress: radioProgress });
				getRadios(response.next)
			}  else {
				if (radioNotification) radioNotification.update({ progress: 100 });
				saveDataToDB('monitoring_radios', JSON.stringify(radios));
				localStorage.setItem('monitoring_radios_update', +new Date());
				if (radioNotification) radioNotification.close();
				if (radioResolve) radioResolve();
			}
		}
	});
	return radioPromise;
}

function getRadioList() {
	return radios;
}

/*  -------------------------------------------------------------------------------------------------------------------------------------------------------------------------
	Generic Device Download Action
------------------------------------------------------------------------------------------------------------------------------------------------------------------------- */

function downloadDeviceCSV(downloadType) {

	var table = $('#ap-table').DataTable();	
	var filename = 'ap';
	if (downloadType == DeviceType.AP) {
		table = $('#ap-table').DataTable();
		filename = 'ap';
	} else if (downloadType == DeviceType.SW) {
		table = $('#switch-table').DataTable();
		filename = 'switch';
	} else if (downloadType == DeviceType.GW) {
		table = $('#gateway-table').DataTable();
		filename = 'gateway';
	}
	
	getDeviceInventoryData(1,false).then(function() {
		csvData = buildDeviceCSVData(downloadType);
		var csv = Papa.unparse(csvData);
		var csvBlob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
		var csvURL = window.URL.createObjectURL(csvBlob);
		var csvLink = document.createElement('a');
		csvLink.href = csvURL;
		
		var filter = table.search();
		if (filter !== '') csvLink.setAttribute('download', filename + '-' + filter.replace(/ /g, '_') + '.csv');
		else csvLink.setAttribute('download', filename+'.csv');
		csvLink.click();
		window.URL.revokeObjectURL(csvLink);
	});
}

function buildDeviceCSVData(downloadType) {
	
	var table = $('#ap-table').DataTable();	
	var filename = 'ap';
	var deviceDisplay = [];
	if (downloadType == DeviceType.AP) {
		table = $('#ap-table').DataTable();
		filename = 'ap';
		deviceDisplay = getAPs();
	} else if (downloadType == DeviceType.SW) {
		table = $('#switch-table').DataTable();
		filename = 'switch';
		deviceDisplay = getSwitches();
	} else if (downloadType == DeviceType.GW) {
		table = $('#gateway-table').DataTable();
		filename = 'gateway';
		deviceDisplay = getGateways();
	} else if (downloadType == DeviceType.GW) {
		table = $('#selected-device-table').DataTable();
		filename = 'selected-devices';
		deviceDisplay = getGateways();
	}
	
	//CSV header
	var nameKey = 'DEVICE NAME';
	var serialKey = 'SERIAL';
	var macKey = 'MAC';
	var modelKey = 'MODEL';
	var deviceFunctionKey = 'DEVICE FUNCTION';
	var siteKey = 'SITE';
	var licenseKey = 'LICENSE';
	var licenseTierKey = 'LICENSE TIER';
/*	var zoneKey = 'ZONE';
	var swarmKey = 'SWARM MODE';
	var rfKey = 'RF PROFILE';
	var installationKey = 'INSTALLATION TYPE';
	var radio0Key = 'RADIO 0 MODE';
	var radio1Key = 'RADIO 1 MODE';
	var radio2Key = 'RADIO 2 MODE';
	var dualKey = 'DUAL 5GHZ MODE';
	var splitKey = 'SPLIT 5GHZ MODE';
	var flexKey = 'FLEX RADIO MODE';
	var ipKey = 'IP ADDRESS';
	var smKey = 'SUBNET MASK';
	var dgwKey = 'DEFAULT GATEWAY';
	var dnsKey = 'DNS SERVER';
	var domainKey = 'DOMAIN NAME';
	var timezoneKey = 'TIMEZONE';
	var altitudeKey = 'ALTITUDE';*/

	var csvDataBuild = [];

	var filteredRows = table.rows({ filter: 'applied' });
	
	// For each row in the filtered set
	filteredRows[0].forEach(function(rowIdx) {
		var device = deviceDisplay[rowIdx];
		// Find monitoring data if there is any
		var inventoryInfo = findDeviceInInventory(device.serialNumber);
		var siteToUse = device['siteName'] ? device['siteName'] : '-';
		var subscriptionKey = inventoryInfo ? inventoryInfo['subscriptionKey'] : '-';
		var licenseTier = inventoryInfo ? inventoryInfo['tier'] : '-';

		csvDataBuild.push({ [nameKey]: device['deviceName'] ? device['deviceName'] : device['macAddress'], [serialKey]: device['serialNumber'], [macKey]: device['macAddress'], [modelKey]: device['model'], [siteKey]: siteToUse, [deviceFunctionKey]: device['deviceFunction'], [licenseKey]: subscriptionKey, [licenseTierKey]: licenseTier });
	});

	return csvDataBuild;
}


function downloadSubscriptionCSV() {
	
	const date = new Date(); // e.g., Sun Mar 24 2026 18:23:00 GMT+1000 (AEDT)
	const year = date.getFullYear();
	const month = String(date.getMonth() + 1).padStart(2, '0');
	const day = String(date.getDate()).padStart(2, '0');
	const formattedDateLocal = `${year}${month}${day}`;

	var table = $('#subscription-table').DataTable();	
	
	csvData = buildSubscriptionCSVData();
	var csv = Papa.unparse(csvData);
	var csvBlob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
	var csvURL = window.URL.createObjectURL(csvBlob);
	var csvLink = document.createElement('a');
	csvLink.href = csvURL;
	
	var filter = table.search();
	if (filter !== '') csvLink.setAttribute('download', 'subscriptions-'+formattedDateLocal+ '-' + filter.replace(/ /g, '_') + '.csv');
	else csvLink.setAttribute('download', 'subscriptions-'+formattedDateLocal+'.csv');
	csvLink.click();
	window.URL.revokeObjectURL(csvLink);
}

function buildSubscriptionCSVData(downloadType) {
	
	var table = $('#subscription-table').DataTable();	
	var dataDisplay = getSubscriptions();
	
	//CSV header
	var subKey = 'SUBSCRIPTION KEY';
	var subTypeKey = 'SUBSCRIPTION TYPE';
	var statusKey = 'STATUS';
	var licenseTypeKey = 'LICENSE TYPE';
	var qtyKey = 'QUANTITY';
	var availableKey = 'AVAILABLE';
	var startKey = 'START DATE';
	var endKey = 'END DATE';

	var csvDataBuild = [];

	var filteredRows = table.rows({ filter: 'applied' });
	
	// For each row in the filtered set
	filteredRows[0].forEach(function(rowIdx) {
		var subscription = dataDisplay[rowIdx];
		
		var today = moment();
		var endDate = moment(subscription['endTime']);
		var licenseState = 'Active';
		if (today.isBefore(endDate) && endDate.diff(today, 'days') <= 90) {
			licenseState = 'Expiring';
		} else if (endDate.isBefore(today)) {
			licenseState = 'Expired';
		} else {
			licenseState = 'Active';
		}
		csvDataBuild.push({ [subKey]: subscription['key'], [subTypeKey]: subscription['isEval'] ? 'Evaluation':'Paid', [statusKey]: licenseState, [licenseTypeKey]: subscription['tier'], [qtyKey]: subscription['quantity'], [availableKey]: subscription['availableQuantity'], [startKey]: moment(subscription['startTime']).format('L'), [endKey]: moment(subscription['endTime']).format('L') });
	});

	return csvDataBuild;
}

function downloadSiteCSV() {
	csvData = buildSiteCSVData();
	var csv = Papa.unparse(csvData);
	var csvBlob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
	var csvURL = window.URL.createObjectURL(csvBlob);
	var csvLink = document.createElement('a');
	csvLink.href = csvURL;
	
	csvLink.setAttribute('download', 'Sites.csv');
	csvLink.click();
	window.URL.revokeObjectURL(csvLink);
}

function buildSiteCSVData() {
		
	//CSV header
	var nameKey = 'SITE NAME';
	var addressKey = 'ADDRESS';
	var cityKey = 'CITY';
	var stateKey = 'STATE';
	var countryKey = 'COUNTRY';
	var zipKey = 'ZIP CODE';
	var timezoneKey = 'TIMEZONE';
	var latKey = 'LATITUDE';
	var longKey = 'LONGITUDE';
	var deviceCountKey = 'DEVICES';

	var csvDataBuild = [];
	
	configSites.forEach(function(site) {
		csvDataBuild.push({ [nameKey]: site['scopeName'], [addressKey]: site['address'], [cityKey]: site['city'], [stateKey]: site['state'], [countryKey]: site['country'], [zipKey]: site['zipcode'], [timezoneKey]: site['timezone']['timezoneId'], [latKey]: site['latitude'], [longKey]: site['longitude'], [deviceCountKey]: site['deviceCount'] });
	});

	return csvDataBuild;
}

/*  -------------------------------------------------------------------------------------------------------------------------------------------------------------------------
 Search functions
------------------------------------------------------------------------------------------------------------------------------------------------------------------------- */

function findDeviceInMonitoring(currentSerial) {
	/*  
		Search through all monitoring data 
		return the device if found, along with storing the device type
	*/
	if (!currentSerial) return false;
	
	// Check APs
	deviceType = '';
	var foundDevice = null;
	foundDevice = aps.find(function(dev) { return dev['serialNumber'].toLowerCase() === currentSerial.toLowerCase(); }) || null;

	// Check Switches
	if (!foundDevice) {
		foundDevice = switches.find(function(dev) { return dev['serialNumber'].toLowerCase() === currentSerial.toLowerCase(); }) || null;
	}

	// Check Gateways
	if (!foundDevice) {
		foundDevice = gateways.find(function(dev) { return dev['serialNumber'].toLowerCase() === currentSerial.toLowerCase(); }) || null;
	}

	return foundDevice;
}


/*  -------------------------------------------------------------------------------------------------------------------------------------------------------------------------
 Config data functions
------------------------------------------------------------------------------------------------------------------------------------------------------------------------- */

var configDevices = [];
var configHealth = [];

function getDeviceInventoryData(offset, forceRefresh) {
	if (offset == 1) {
		devicePromise = new Promise(function(resolve) { deviceResolve = resolve; });
		
		var refreshrate = localStorage.getItem('refresh_rate');
		if (refreshrate === null || refreshrate === "") {
		  refreshrate = "30";
		}
		var updateConfigData = false;
		if (!localStorage.getItem('config_update')) updateConfigData = true;
		else {
			var lastRefresh = new Date(parseInt(localStorage.getItem('config_update')));
			var now = new Date();
			var diffTime = Math.abs(now - lastRefresh);
			var diffMinutes = Math.ceil(diffTime / (1000 * 60));
		}
		if (updateConfigData || diffMinutes > refreshrate || forceRefresh) {
			if (deviceNotification) deviceNotification.close();
			logInformation('Refreshing Device Data...')
			deviceNotification = showProgressNotification('ca-gateway3', 'Obtaining Device data...', 'bottom', 'center', 'info');
			configDevices = [];
		} else {
				if (deviceResolve) deviceResolve();
				return devicePromise;
		}
	
	}
		
	var settings = {
		url: getAPIURL() + '/tools/getCommandwHeaders',
		method: 'POST',
		timeout: 0,
		headers: {
			'Content-Type': 'application/json',
		},
		data: JSON.stringify({
			url: localStorage.getItem('base_url') + '/network-monitoring/v1/device-inventory?limit='+apiConfigDevicesLimit+'&next='+offset,
			access_token: localStorage.getItem('access_token'),
		}),
	};
	
	fetch(settings.url, {method: settings.method, headers: settings.headers, body: settings.data}).then(r => r.json()).then(function(commandResults) {
		if (commandResults.hasOwnProperty('headers')) {
			//updateAPILimits(JSON.parse(commandResults.headers));
		}
		
		// Process The status code of the result
		var result = processStatus(commandResults);
		// will return the status code to trigger next step
		if (result == 429) {
			// Over API threshold limit. Wait apiWaitDelay value and try again.
			setTimeout(getDeviceInventoryData, apiWaitDelay, offset, forceRefresh);
		} else if (result !== 200) {
			if (deviceNotification) {
				deviceNotification.update({ type: 'danger', message: 'Failed to download device data' });
				setTimeout(deviceNotification.close, 2000);
			}
					if (deviceResolve) deviceResolve();
		} else {
			
			var response = JSON.parse(commandResults.responseBody);
			configDevices = configDevices.concat(response.items)
			
			offset = response.next;
			if (offset) {
				var deviceProgress = ((configDevices.length) / response.total) * 100;
				deviceNotification.update({ progress: deviceProgress });
				getDeviceInventoryData(offset, forceRefresh);
			} else {
				if (deviceNotification) deviceNotification.update({ progress: 100 });
				
				saveDataToDB('config_devices', JSON.stringify(configDevices));
				if (deviceNotification) setTimeout(deviceNotification.close, 1000);
	
				deviceResolve();
			}
		}
	});
	return devicePromise;
}

function getDeviceInventory() {
	return configDevices;
}

function findDeviceInInventory(serial) {
	return configDevices.find(function(dev) {
		return dev.serialNumber.toUpperCase() === serial.toUpperCase();
	}) || null;
}

function getConfigHealthData(offset) {
	if (offset == 0) {
		healthPromise = new Promise(function(resolve) { healthResolve = resolve; });
		if (healthNotification) healthNotification.close();
		logInformation('Refreshing Config Health Data...')
		healthNotification = showProgressNotification('ca-stethoscope', 'Obtaining Config Health data...', 'bottom', 'center', 'info');
		configHealth = [];
	}
		
	var settings = {
		url: getAPIURL() + '/tools/getCommandwHeaders',
		method: 'POST',
		timeout: 0,
		headers: {
			'Content-Type': 'application/json',
		},
		data: JSON.stringify({
			url: localStorage.getItem('base_url') + '/network-config/v1alpha1/config-health/devices?limit='+apiConfigDevicesLimit+'&offset='+offset,
			access_token: localStorage.getItem('access_token'),
		}),
	};
	
	fetch(settings.url, {method: settings.method, headers: settings.headers, body: settings.data}).then(r => r.json()).then(function(commandResults) {
		if (commandResults.hasOwnProperty('headers')) {
			//updateAPILimits(JSON.parse(commandResults.headers));
		}
		
		// Process The status code of the result
		var result = processStatus(commandResults);
		// will return the status code to trigger next step
		if (result == 429) {
			// Over API threshold limit. Wait apiWaitDelay value and try again.
			setTimeout(getConfigHealthData, apiWaitDelay, offset);
		} else if (result !== 200) {
			if (healthNotification) {
				healthNotification.update({ type: 'danger', message: 'Failed to download config health data' });
				setTimeout(healthNotification.close, 2000);
			}
					if (healthResolve) healthResolve();
		} else {
			
			var response = JSON.parse(commandResults.responseBody);
			configHealth = configHealth.concat(response.devices)
			
			offset += response.count;
			if (offset < response.total) {
				var deviceProgress = ((configDevices.length) / response.total) * 100;
				healthNotification.update({ progress: deviceProgress });
				getConfigHealthData(offset);
			} else {
				if (healthNotification) healthNotification.update({ progress: 100 });
				//console.log(configHealth)
				saveDataToDB('config_health', JSON.stringify(configHealth));
				if (healthNotification) setTimeout(healthNotification.close, 1000);
	
				healthResolve();
			}
		}
	});
	return healthPromise;
}

function getConfigHealth() {
	return configHealth;
}

function findDeviceInConfigHealth(serial) {
	return configHealth.find(function(dev) {
		return dev.serial.toUpperCase() === serial.toUpperCase();
	}) || null;
}

/*  -------------------------------------------------------------------------------------------------------------------------------------------------------------------------
 Hierarchy functions
------------------------------------------------------------------------------------------------------------------------------------------------------------------------- */
var hierarchySites = [];
var hierarchySC = [];
var hierarchyDG = [];
var hierarchyGlobal = '';

var hierarchyNotification;
var hierarchySitePromise; var hierarchySiteResolve;
var hierarchySCPromise; var hierarchySCResolve;
var hierarchyDGPromise; var hierarchyDGResolve;

function loadHierarchyData(refreshrate) {
	if (!localStorage.getItem('hierarchy_update')) {
		getHierarchyData();
	} else {
		var lastRefresh = new Date(parseInt(localStorage.getItem('hierarchy_update')));
		var now = new Date();
		var diffTime = Math.abs(now - lastRefresh);
		var diffMinutes = Math.ceil(diffTime / (1000 * 60));
		if (diffMinutes > refreshrate) {
			//console.log("Reading new monitoring data from Central");
			getHierarchyData();
		} else {
			console.log('Loading hierarchy data from IndexedDB');
			
			const transaction = db.transaction('general', 'readonly');
			const store = transaction.objectStore('general');
			
			const allQuery = store.getAll();
			allQuery.onsuccess = function() {
				if (allQuery.result) {
					allQuery.result.forEach(function(entry) {
						if (entry.key === 'hierarchy_sites') {
							hierarchySites = JSON.parse(entry.data);
						} else if (entry.key === 'hierarchy_sc') {
							hierarchySC = JSON.parse(entry.data);
						} else if (entry.key === 'hierarchy_dg') {
							hierarchyDG = JSON.parse(entry.data);
						} else if (entry.key === 'hierarchy_global') {
							hierarchyGlobal = JSON.parse(entry.data);
						}
					});
					buildHierarchySelector();
					buildNonLibraryHierarchySelector();
					buildTemplateHierarchySelector();
					buildAssignHierarchySelector();
				}
			};
		}
	}
}

function getHierarchyData() {
	var updateHierarchyData = false;
	return authenticateWithCentral().then(function() {
		if (hierarchyNotification) hierarchyNotification.close();
		logInformation('Refreshing Hierarchy Data...')
		hierarchyNotification = showProgressNotification('ca-hierarchy-55', 'Obtaining Hierarchy data...', 'bottom', 'center', 'info');
		
		hierarchySC = [];
		hierarchyGlobal = '';
		return Promise.all([getHierarchySiteData(0), getHierarchySCData(0), getHierarchyDGData(0)]).then(function() {
			getHierarchyGlobalData();
			if (hierarchyNotification) setTimeout(hierarchyNotification.close, 1000);
		});
	});	
}

function getHierarchySiteData(offset) {
	if (offset == 0) {
		hierarchySitePromise = new Promise(function(resolve) { hierarchySiteResolve = resolve; });	
		hierarchySites = [];
	}
		
	var settings = {
		url: getAPIURL() + '/tools/getCommandwHeaders',
		method: 'POST',
		timeout: 0,
		headers: {
			'Content-Type': 'application/json',
		},
		data: JSON.stringify({
			url: localStorage.getItem('base_url') + '/network-config/v1/sites?limit='+apiConfigDevicesLimit+'&offset='+offset,
			access_token: localStorage.getItem('access_token'),
		}),
	};
	
	fetch(settings.url, {method: settings.method, headers: settings.headers, body: settings.data}).then(r => r.json()).then(function(commandResults) {
		if (commandResults.hasOwnProperty('headers')) {
			//updateAPILimits(JSON.parse(commandResults.headers));
		}
		
		// Process The status code of the result
		var result = processStatus(commandResults);
		// will return the status code to trigger next step
		if (result == 429) {
			// Over API threshold limit. Wait apiWaitDelay value and try again.
			setTimeout(getHierarchySiteData, apiWaitDelay, offset);
		} else if (result !== 200) {
			if (hierarchyNotification) {
				hierarchyNotification.update({ type: 'danger', message: 'Failed to download site hierarchy' });
				setTimeout(hierarchyNotification.close, 2000);
			}
					if (hierarchySiteResolve) hierarchySiteResolve();
		} else {
			
			var response = JSON.parse(commandResults.responseBody);
			hierarchySites = hierarchySites.concat(response.items);
			
			offset = response.offset;
			if (offset) {
				var siteProgress = ((hierarchySites.length) / response.total) * 100;
				hierarchyNotification.update({ progress: siteProgress });
				getHierarchySiteData(offset);
			} else {
				if (hierarchyNotification) hierarchyNotification.update({ progress: 100 });
				hierarchySites.sort((a, b) => {
					const siteA = a.scopeName.toUpperCase(); // ignore upper and lowercase
					const siteB = b.scopeName.toUpperCase(); // ignore upper and lowercase
					// Sort on Site Name
					if (siteA < siteB) {
						return -1;
					}
					if (siteA > siteB) {
						return 1;
					}
					return 0;
				});
				saveDataToDB('hierarchy_sites', JSON.stringify(hierarchySites));
				if (hierarchyNotification) setTimeout(hierarchyNotification.close, 1000);
				
				hierarchySiteResolve();
			}
		}
	});
	return hierarchySitePromise;
}

function getHierarchySCData(offset) {
	if (offset == 0) {
		hierarchySCPromise = new Promise(function(resolve) { hierarchySCResolve = resolve; });	
		hierarchySC = [];
	}
		
	var settings = {
		url: getAPIURL() + '/tools/getCommandwHeaders',
		method: 'POST',
		timeout: 0,
		headers: {
			'Content-Type': 'application/json',
		},
		data: JSON.stringify({
			url: localStorage.getItem('base_url') + '/network-config/v1/site-collections?limit='+apiConfigDevicesLimit+'&offset='+offset,
			access_token: localStorage.getItem('access_token'),
		}),
	};
	
	fetch(settings.url, {method: settings.method, headers: settings.headers, body: settings.data}).then(r => r.json()).then(function(commandResults) {
		if (commandResults.hasOwnProperty('headers')) {
			//updateAPILimits(JSON.parse(commandResults.headers));
		}
		
		// Process The status code of the result
		var result = processStatus(commandResults);
		// will return the status code to trigger next step
		if (result == 429) {
			// Over API threshold limit. Wait apiWaitDelay value and try again.
			setTimeout(getHierarchySCData, apiWaitDelay, offset);
		} else if (result !== 200) {
			if (hierarchyNotification) {
				hierarchyNotification.update({ type: 'danger', message: 'Failed to download site-collection hierarchy' });
				setTimeout(hierarchyNotification.close, 2000);
			}
					if (hierarchySCResolve) hierarchySCResolve();
		} else {
			
			var response = JSON.parse(commandResults.responseBody);
			hierarchySC = hierarchySC.concat(response.items)
			
			offset = response.offset;
			if (offset) {
				var siteProgress = ((hierarchySC.length) / response.total) * 100;
				hierarchyNotification.update({ progress: siteProgress });
				getHierarchySCData(offset);
			} else {
				if (hierarchyNotification) hierarchyNotification.update({ progress: 100 });
				hierarchySC.sort((a, b) => {
					const siteA = a.scopeName.toUpperCase(); // ignore upper and lowercase
					const siteB = b.scopeName.toUpperCase(); // ignore upper and lowercase
					// Sort on Site Name
					if (siteA < siteB) {
						return -1;
					}
					if (siteA > siteB) {
						return 1;
					}
					return 0;
				});
				saveDataToDB('hierarchy_sc', JSON.stringify(hierarchySC));
				if (hierarchyNotification) setTimeout(hierarchyNotification.close, 1000);
	
				hierarchySCResolve();
			}
		}
	});
	return hierarchySCPromise;
}

function getHierarchyDGData(offset) {
	if (offset == 0) {
		hierarchyDGPromise = new Promise(function(resolve) { hierarchyDGResolve = resolve; });	
		hierarchyDG = [];
	}
		
	var settings = {
		url: getAPIURL() + '/tools/getCommandwHeaders',
		method: 'POST',
		timeout: 0,
		headers: {
			'Content-Type': 'application/json',
		},
		data: JSON.stringify({
			url: localStorage.getItem('base_url') + '/network-config/v1/device-groups?limit='+apiConfigDevicesLimit+'&offset='+offset,
			access_token: localStorage.getItem('access_token'),
		}),
	};
	
	fetch(settings.url, {method: settings.method, headers: settings.headers, body: settings.data}).then(r => r.json()).then(function(commandResults) {
		if (commandResults.hasOwnProperty('headers')) {
			//updateAPILimits(JSON.parse(commandResults.headers));
		}
		
		// Process The status code of the result
		var result = processStatus(commandResults);
		// will return the status code to trigger next step
		if (result == 429) {
			// Over API threshold limit. Wait apiWaitDelay value and try again.
			setTimeout(getHierarchyDGData, apiWaitDelay, offset);
		} else if (result !== 200) {
			if (hierarchyNotification) {
				hierarchyNotification.update({ type: 'danger', message: 'Failed to download device-groups hierarchy' });
				setTimeout(hierarchyNotification.close, 2000);
			}
					if (hierarchyDGResolve) hierarchyDGResolve();
		} else {
			
			var response = JSON.parse(commandResults.responseBody);
			hierarchyDG = hierarchyDG.concat(response.items)
			
			offset = response.offset;
			if (offset) {
				var siteProgress = ((hierarchyDG.length) / response.total) * 100;
				hierarchyNotification.update({ progress: siteProgress });
				getHierarchyDGData(offset);
			} else {
				if (hierarchyNotification) hierarchyNotification.update({ progress: 100 });
				
				saveDataToDB('hierarchy_dg', JSON.stringify(hierarchyDG));
				if (hierarchyNotification) setTimeout(hierarchyNotification.close, 1000);
	
				hierarchyDGResolve();
			}
		}
	});
	return hierarchyDGPromise;
}

function getHierarchyGlobalData() {
	var settings = {
		url: getAPIURL() + '/tools/getCommandwHeaders',
		method: 'POST',
		timeout: 0,
		headers: {
			'Content-Type': 'application/json',
		},
		data: JSON.stringify({
			url: localStorage.getItem('base_url') + '/network-config/v1/global',
			access_token: localStorage.getItem('access_token'),
		}),
	};
	
	fetch(settings.url, {method: settings.method, headers: settings.headers, body: settings.data}).then(r => r.json()).then(function(commandResults) {
		if (commandResults.hasOwnProperty('headers')) {
			//updateAPILimits(JSON.parse(commandResults.headers));
		}
		
		// Process The status code of the result
		var result = processStatus(commandResults);
		// will return the status code to trigger next step
		if (result == 429) {
			// Over API threshold limit. Wait apiWaitDelay value and try again.
			setTimeout(getHierarchyGlobalData, apiWaitDelay);
		} else if (result !== 200) {
			if (hierarchyNotification) {
				hierarchyNotification.update({ type: 'danger', message: 'Failed to download Global Scope ID' });
				setTimeout(hierarchyNotification.close, 2000);
			}
		} else {
			
			var response = JSON.parse(commandResults.responseBody);
			//console.log(response)
			saveDataToDB('hierarchy_global', response.scopeId);
			hierarchyGlobal = response.scopeId;
			buildHierarchySelector();
			buildNonLibraryHierarchySelector();
			buildTemplateHierarchySelector();
			buildAssignHierarchySelector();
		}
	});
}

function findScopeNameForId(scopeId) {
	var found = false;
	// Check Sites
	deviceType = '';
	var foundScope = null;
	
	if (scopeId === hierarchyGlobal) return 'Global';
	
	foundScope = hierarchySites.find(function(s) { return s['scopeId'].toLowerCase() === scopeId.toLowerCase(); }) || null;
	if (foundScope) return foundScope['scopeName'];

	foundScope = hierarchySC.find(function(s) { return s['scopeId'].toLowerCase() === scopeId.toLowerCase(); }) || null;
	if (foundScope) return foundScope['scopeName'];

	foundScope = hierarchyDG.find(function(s) { return s['scopeId'].toLowerCase() === scopeId.toLowerCase(); }) || null;
	if (foundScope) return foundScope['scopeName'];

	return foundScope;
}

function findScopeTypeForId(scopeId) {
	var found = false;
	// Check Sites
	deviceType = '';
	var foundScope = null;
	
	if (scopeId === hierarchyGlobal) return 'global';
	
	foundScope = hierarchySites.find(function(s) { return s['scopeId'].toLowerCase() === scopeId.toLowerCase(); }) || null;
	if (foundScope) return 'site';

	foundScope = hierarchySC.find(function(s) { return s['scopeId'].toLowerCase() === scopeId.toLowerCase(); }) || null;
	if (foundScope) return 'site-collection';

	foundScope = hierarchyDG.find(function(s) { return s['scopeId'].toLowerCase() === scopeId.toLowerCase(); }) || null;
	if (foundScope) return 'device-group';

	return foundScope;
}

function buildHierarchySelector() {
	if (hierarchySelector) {
		let hierarchyChoices = [];
		hierarchyChoices.push({ label: ' ', choices: [{
			value: 'library::'+'Library',
			label: 'Library',
			selected: true,
			disabled: false
		}] 
		});
		hierarchyChoices.push({ label: ' ', choices: [{
			value: 'global::'+hierarchyGlobal,
			label: 'Global',
			selected: false,
			disabled: false,
		}] 
		});
		let scList = [];
		hierarchySC.forEach(function(sc) { scList.push({ value:'site-collection::'+sc.scopeId, label: sc.scopeName }); });
		hierarchyChoices.push({ label: 'Sites Collections', choices: scList });
		
		let sList = [];
		hierarchySites.forEach(function(site) { sList.push({ value: 'site::'+site.scopeId, label: site.scopeName }); });
		hierarchyChoices.push({ label: 'Sites', choices: sList });
		
		let dgList = [];
		hierarchyDG.forEach(function(dg) { dgList.push({ value: 'device-group::'+dg.scopeId, label: dg.scopeName }); });
		hierarchyChoices.push({ label: 'Device Groups', choices: dgList });
		
		let dList = [];
		configDevices.forEach(function(d) { if (d.siteId && d.deviceFunction && d.deviceFunction !== '-') {dList.push({ value: 'device::'+d.scopeId, label: d.deviceName }); } });
		hierarchyChoices.push({ label: 'Devices', choices: dList });
		
		hierarchySelector.clearChoices();
		hierarchySelector.setChoices(hierarchyChoices);		
	}
}

function buildTemplateHierarchySelector() {
	if (templateHierarchySelector) {
		let hierarchyChoices = [];
		hierarchyChoices.push({ label: ' ', choices: [{
			value: 'global::'+hierarchyGlobal,
			label: 'Global',
			selected: false,
			disabled: false,
		}] 
		});
		let scList = [];
		hierarchySC.forEach(function(sc) { scList.push({ value:'site-collection::'+sc.scopeId, label: sc.scopeName }); });
		hierarchyChoices.push({ label: 'Sites Collections', choices: scList });
		
		let sList = [];
		hierarchySites.forEach(function(site) { sList.push({ value: 'site::'+site.scopeId, label: site.scopeName }); });
		hierarchyChoices.push({ label: 'Sites', choices: sList });
		
		let dgList = [];
		hierarchyDG.forEach(function(dg) { dgList.push({ value: 'device-group::'+dg.scopeId, label: dg.scopeName }); });
		hierarchyChoices.push({ label: 'Device Groups', choices: dgList });
		
		/*let dList = [];
		configDevices.forEach(function(d) { if (d.siteId && d.deviceFunction && d.deviceFunction !== '-') {dList.push({ value: 'device::'+d.scopeId, label: d.deviceName }); } });
		hierarchyChoices.push({ label: 'Devices', choices: dList });*/
		templateHierarchySelector.clearChoices();
		templateHierarchySelector.setChoices(hierarchyChoices);
		templateHierarchySelector.setChoiceByValue(hierarchyChoices[0]['choices'][0]['value']);
		hierarchyChange(0,0)
	}
}

function buildNonLibraryHierarchySelector() {
	if (nonLibraryHierarchySelector) {
		let hierarchyChoices = [];
		hierarchyChoices.push({ label: ' ', choices: [{
			value: 'global::'+hierarchyGlobal,
			label: 'Global',
			selected: false,
			disabled: false,
		}] 
		});
		let scList = [];
		hierarchySC.forEach(function(sc) { scList.push({ value:'site-collection::'+sc.scopeId, label: sc.scopeName }); });
		hierarchyChoices.push({ label: 'Sites Collections', choices: scList });
		
		let sList = [];
		hierarchySites.forEach(function(site) { sList.push({ value: 'site::'+site.scopeId, label: site.scopeName }); });
		hierarchyChoices.push({ label: 'Sites', choices: sList });
		
		let dgList = [];
		hierarchyDG.forEach(function(dg) { dgList.push({ value: 'device-group::'+dg.scopeId, label: dg.scopeName }); });
		hierarchyChoices.push({ label: 'Device Groups', choices: dgList });
		
		/*let dList = [];
		configDevices.forEach(function(d) { if (d.siteId && d.deviceFunction && d.deviceFunction !== '-') {dList.push({ value: 'device::'+d.scopeId, label: d.deviceName }); } });
		hierarchyChoices.push({ label: 'Devices', choices: dList });*/
		nonLibraryHierarchySelector.clearChoices();
		nonLibraryHierarchySelector.setChoices(hierarchyChoices);
		nonLibraryHierarchySelector.setChoiceByValue(hierarchyChoices[0]['choices'][0]['value']);
	}
}

function buildAssignHierarchySelector(siteOnly=false) {
	if (assignHierarchySelector) {
		let hierarchyChoices = [];
		if (siteOnly) {
			var sList = [];
			hierarchySites.forEach(function(site) { sList.push({ value: 'site::'+site.scopeId, label: site.scopeName }); });
			hierarchyChoices.push({ label: 'Sites', choices: sList });
		} else {
			hierarchyChoices.push({ label: ' ', choices: [{
				value: 'global::'+hierarchyGlobal,
				label: 'Global',
				selected: false,
				disabled: false,
			}] 
			});
			let scList = [];
			hierarchySC.forEach(function(sc) { scList.push({ value:'site-collection::'+sc.scopeId, label: sc.scopeName }); });
			hierarchyChoices.push({ label: 'Sites Collections', choices: scList });
			
			var sList = [];
			hierarchySites.forEach(function(site) { sList.push({ value: 'site::'+site.scopeId, label: site.scopeName }); });
			hierarchyChoices.push({ label: 'Sites', choices: sList });
			
			let dgList = [];
			hierarchyDG.forEach(function(dg) { dgList.push({ value: 'device-group::'+dg.scopeId, label: dg.scopeName }); });
			hierarchyChoices.push({ label: 'Device Groups', choices: dgList });
			
			let dList = [];
			configDevices.forEach(function(d) { if (d.siteId && d.deviceFunction && d.deviceFunction !== '-') {dList.push({ value: 'device::'+d.scopeId, label: d.deviceName }); } });
			hierarchyChoices.push({ label: 'Devices', choices: dList });
		}
		
		
		assignHierarchySelector.clearChoices();
		assignHierarchySelector.removeActiveItems();
		assignHierarchySelector.setChoices(hierarchyChoices);	
	}	
}

// Hide a Bootstrap modal, wait for it to fully close, then show a Swal dialog.
// This prevents Bootstrap backdrop conflicts from Swal opening over an open modal.
function hideModalThenSwal(modalId, swalOptions) {
	return new Promise(function(resolve) {
		var el = document.getElementById(modalId);
		if (!el) { Swal.fire(swalOptions).then(resolve); return; }
		var instance = bootstrap.Modal.getInstance(el) || new bootstrap.Modal(el);
		el.addEventListener('hidden.bs.modal', function() {
			Swal.fire(swalOptions).then(resolve);
		}, { once: true });
		instance.hide();
	});
}