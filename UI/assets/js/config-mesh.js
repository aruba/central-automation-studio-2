/*
Central Automation v2.x
Last Updated 2.0.0
Aaron Scott (WiFi Downunder) 2025-2026
*/

var profileNotification;
var saveNotification;
var profiles = [];
var editingProfile = '';
var editingConfig = {};
var editingScope = '';
var editingPersona = '';
var editingType = 'SHARED';

var roleSelector;
var bandSelector;
var fiveSelector;
var uplinkSelector;
var algoSelector;
var aTxSelector;
var metricAlgoSelector;
var reselectionSelector;

var profileSelector;
const profileName = 'Mesh'
const profileUniqueLeaf = 'name'
const profileType = 'mesh';
const singleInstance = true;

var profileEndpoint = '/network-config/v1/mesh';
var uiURL = '/gravity/monitoring/config/profiles/mesh';
var selectedHierarchyLevel = 'library';
var selectedScopeId = '';

function populateChoices() {
	
	let dfElement = document.getElementById('devicefunctionselector');
	if (dfElement) {
		deviceFunctionSelector = new Choices(dfElement, {
			searchEnabled: false,
			shouldSort: false,
			itemSelectText: "Press to select",
			removeItemButton:true
		});
		let deviceFunctionChoices = [];
		deviceFunctionChoices.push({ value: 'CAMPUS_AP', label: 'Campus AP' });
		//deviceFunctionChoices.push({ value: 'MICROBRANCH_AP', label: 'Microbranch AP' });
		deviceFunctionSelector.clearChoices();
		deviceFunctionSelector.setChoices(deviceFunctionChoices);
		deviceFunctionSelector.setChoiceByValue(['CAMPUS_AP']);
	}
	
	let roleElement = document.getElementById('role');
	if (roleElement) {
			roleSelector = new Choices(roleElement, {
			searchEnabled: false,
			shouldSort: false,
			itemSelectText: ""
		});
		let roleChoices = [];
		roleChoices.push({ value: 'AUTO', label: 'Auto' });
		roleChoices.push({ value: 'PORTAL', label: 'Portal' });
		roleChoices.push({ value: 'POINT', label: 'Point' });
		roleSelector.clearChoices();
		roleSelector.setChoices(roleChoices);
		roleSelector.setChoiceByValue('AUTO');

	}

	let bandElement = document.getElementById('band');
	if (bandElement) {
			bandSelector = new Choices(bandElement, {
			searchEnabled: false,
			shouldSort: false,
			itemSelectText: ""
		});
		let bandChoices = [];
		bandChoices.push({ value: 'BAND_TYPE_24GHZ', label: '2.4GHz' });
		bandChoices.push({ value: 'BAND_TYPE_5GHZ', label: '5GHz' });
		bandChoices.push({ value: 'BAND_TYPE_6GHZ', label: '6GHz' });
		bandChoices.push({ value: 'BAND_TYPE_ALL', label: 'All' });
		bandSelector.clearChoices();
		bandSelector.setChoices(bandChoices);
		bandSelector.setChoiceByValue('BAND_TYPE_5GHZ');
		
		bandElement.addEventListener('change', function() {
			changeBand(this.value);
		});
	}
	
	let fiveElement = document.getElementById('split5g-band-range');
	if (fiveElement) {
			fiveSelector = new Choices(fiveElement, {
			searchEnabled: false,
			shouldSort: false,
			itemSelectText: ""
		});
		let fiveChoices = [];
		fiveChoices.push({ value: 'FULL', label: 'Full' });
		fiveChoices.push({ value: 'LOWER', label: 'Lower' });
		fiveChoices.push({ value: 'UPPER', label: 'Upper' });
		fiveChoices.push({ value: 'FIRST', label: 'First' });
		fiveSelector.clearChoices();
		fiveSelector.setChoices(fiveChoices);
		fiveSelector.setChoiceByValue('FULL');
		
		fiveElement.addEventListener('change', function() {
			changeDual5(this.value);
		});
	}
	
	let uplinkElement = document.getElementById('prefer-uplink-radio');
	if (uplinkElement) {
			uplinkSelector = new Choices(uplinkElement, {
			searchEnabled: false,
			shouldSort: false,
			itemSelectText: ""
		});
		let uplinkChoices = [];
		uplinkChoices.push({ value: 'NONE', label: 'None' });
		uplinkChoices.push({ value: 'UPLINK_5G_LOWER', label: '5GHz Lower band' });
		uplinkChoices.push({ value: 'UPLINK_5G_UPPER', label: '5GHz Upper band' });
		uplinkSelector.clearChoices();
		uplinkSelector.setChoices(uplinkChoices);
		uplinkSelector.setChoiceByValue('NONE');
	}
	
	let algoElement = document.getElementById('topology-algorithm');
	if (algoElement) {
			algoSelector = new Choices(algoElement, {
			searchEnabled: false,
			shouldSort: false,
			itemSelectText: ""
		});
		let algoChoices = [];
		algoChoices.push({ value: 'LOCAL', label: 'Local' });
		algoChoices.push({ value: 'CENTRAL', label: 'Central' });
		algoSelector.clearChoices();
		algoSelector.setChoices(algoChoices);
		algoSelector.setChoiceByValue('LOCAL');
	}
	
	let metricAlgoElement = document.getElementById('metric-algorithm');
	if (metricAlgoElement) {
			metricAlgoSelector = new Choices(metricAlgoElement, {
			searchEnabled: false,
			shouldSort: false,
			itemSelectText: ""
		});
		let algoChoices = [];
		algoChoices.push({ value: 'BEST_LINK_RSSI', label: 'Best Link' });
		algoChoices.push({ value: 'DISTRIBUTED_TREE_RSSI', label: 'Distributed Tree' });
		metricAlgoSelector.clearChoices();
		metricAlgoSelector.setChoices(algoChoices);
		metricAlgoSelector.setChoiceByValue('DISTRIBUTED_TREE_RSSI');
	}
	
	let reselectionElement = document.getElementById('reselection-mode');
	if (reselectionElement) {
			reselectionSelector = new Choices(reselectionElement, {
			searchEnabled: false,
			shouldSort: false,
			itemSelectText: ""
		});
		let selectionChoices = [];
		selectionChoices.push({ value: 'NEVER', label: 'Never' });
		selectionChoices.push({ value: 'SUBTHRESHOLD', label: 'Subthreshold' });
		selectionChoices.push({ value: 'STARTUP_SUBTHRESHOLD', label: 'Startup Subthreshold' });
		selectionChoices.push({ value: 'ANYTIME', label: 'Anytime' });
		reselectionSelector.clearChoices();
		reselectionSelector.setChoices(selectionChoices);
		reselectionSelector.setChoiceByValue('STARTUP_SUBTHRESHOLD');
	}
	
	var datarates5 = [];
	datarates5.push({ value: 'RATE_TYPE_6_MBPS', label: '6' });
	datarates5.push({ value: 'RATE_TYPE_9_MBPS', label: '9' });
	datarates5.push({ value: 'RATE_TYPE_12_MPBS', label: '12' });
	datarates5.push({ value: 'RATE_TYPE_18_MPBS', label: '18' });
	datarates5.push({ value: 'RATE_TYPE_24_MPBS', label: '24' });
	datarates5.push({ value: 'RATE_TYPE_36_MPBS', label: '36' });
	datarates5.push({ value: 'RATE_TYPE_48_MPBS', label: '48' });
	datarates5.push({ value: 'RATE_TYPE_54_MPBS', label: '54' });
	var transmit5Element = document.getElementById('a-tx-rates');
	if (transmit5Element) {
			aTxSelector = new Choices(transmit5Element, {
			searchEnabled: false,
			shouldSort: false,
			shouldSortItems: true,
			itemSelectText: "",
			removeItemButton:true
		});
		aTxSelector.clearChoices();
		aTxSelector.setChoices(datarates5);
	}
}

function changeBand(band) {
	let five = false;
	if (band.includes('5GHZ') || band === "BAND_ALL") five = true;
	let dual5 = document.getElementById("dual5");
	if (five) dual5.style.display = "block";
	else dual5.style.display = "none";
	
	changeDual5(fiveSelector.getValue(true))
}

function changeDual5(band) {
	let five = false;
	if (band.includes('FULL')) five = true;
	
	let primaryBand = true;
	if (document.getElementById("dual5").style.display === "none") primaryBand = false;

	let preferred5 = document.getElementById("preferred5");
	if (five && primaryBand) preferred5.style.display = "block";
	else preferred5.style.display = "none";
}

function populateProfileChoice() {
	let pElement = document.getElementById('profileselector');
	if (pElement) {
		if (!profileSelector) {
			profileSelector = new Choices(pElement, {
				searchEnabled: false,
				shouldSort: true,
				itemSelectText: "Press to select",
				removeItemButton:true
			});
		}
		let selectChoices = [];
		profiles.forEach(function(p) {
			selectChoices.push({ value: p.name, label: p.name });
		});
		profileSelector.clearChoices();
		profileSelector.setChoices(selectChoices);	
	}
}

function hierarchyChange(scopeID, hierarchyLevel) {
	// Override at each page
	refreshProfilesForHierarchy();
}

function updateInformation() {
	getHierarchyData().then(function() {
		refreshProfilesForHierarchy();
	});
}

function refreshProfilesForHierarchy() {
	// Split selector value into scopeid and hierarchy level 
	var hierarchyChoices = getHierarchySelector();
	var matches =  hierarchyChoices.getValue(true).match(/^(.*?)::(.*)/);
	selectedHierarchyLevel = matches[1];
	selectedScopeId = matches[2];
	authenticateWithCentral().then(function() {
		profiles = [];
		getProfiles(0, selectedScopeId);
	});
}

function getProfiles(offset, scope) {
	
	if (profileNotification) profileNotification.close();
	profileNotification = showNotification('ca-ap-icon3', 'Obtaining profiles...', 'bottom', 'center', 'info');
	
	let command = profileEndpoint + '?detailed=true';
	if (scope !== 'Library') command = profileEndpoint + '?effective=true&detailed=true&view_type=LOCAL&scope_id='+scope;

	fetchProxyWithAuth('/tools/getCommandwHeaders', {
		url: localStorage.getItem('base_url') + command,
		access_token: localStorage.getItem('access_token'),
	})
	.then(function(commandResults) {
		if (commandResults.hasOwnProperty('headers')) {
			//updateAPILimits(JSON.parse(commandResults.headers));
		}
		//console.log(commandResults)
		// Process The status code of the result
		let result = processStatus(commandResults);
		// will return the status code to trigger next step
		if (result == 429 || result == 409) {
			setTimeout(getProfiles, apiWaitDelay, offset);
		} else if (result !== 200) {
			if (profileNotification) {
				profileNotification.update({ type: 'danger', message: 'Failed to retrieve Mesh Profiles' });
				setTimeout(profileNotification.close, 2000);
			}
		} else {
			let response = JSON.parse(commandResults.responseBody);
			if (response['profile']) profiles = profiles.concat(response['profile']);
			offset = response.offset;
			if (offset) {
				let getProgress = ((profiles.length) / response.total) * 100;
				profileNotification.update({ progress: getProgress });
				getProfiles(offset,scope);
			} else {
				if (profileNotification) {
					profileNotification.update({ progress: 100, type: 'success', message: 'Retrieved Mesh Profiles' });
					setTimeout(profileNotification.close, 1000);
				}
				loadProfilesTable();
				populateProfileChoice();
			}
		}
	});
}

function loadProfilesTable() {
	let table = $('#profiles-table').DataTable();
	disposeTooltips(document.getElementById('profiles-table'));
	$('#profiles-table').DataTable().clear();
	
	profiles.forEach(function(profile) {
		let profileName = profile['name'].replace(/^ /, "&nbsp");
		let description = '';
		if (profile['description']) description = profile['description'];
		let editable = true;
		if (profile['@'] && profile['@']['aruba-annotation:is_editable']) {
			editable = profile['@']['aruba-annotation:is_editable'];
		}
		
		// Action Buttons
		let status = '<i class="fa-solid fa-diamond text-danger"></i>';
		let actionBtns = '';
		if (editable) {
			actionBtns += '<a class="btn btn-link btn-warning mt-2" data-bs-toggle="tooltip" data-bs-placement="top" data-container="body" data-animation="true" title="Edit UI" onclick="loadEditUI(\'' + profileName + '\')"><i class="fa-solid fa-pencil" style="color: #67748e; font-size:18px;"></i></a> ';
			actionBtns += '<a class="btn btn-link btn-warning mt-2" data-bs-toggle="tooltip" data-bs-placement="top" data-container="body" data-animation="true" title="Edit JSON" onclick="loadJSONUI(\'' + profileName + '\')"><i class="fa-solid fa-rectangle-code" style="color: #67748e; font-size:18px;"></i></a> ';
		}
		
		// Make Name as a link to Central
		let name = encodeURI(profile['name']);
		let apiURL = localStorage.getItem('base_url');
		let centralBaseURL = centralURLs[apiURL];
		let centralURL = centralBaseURL + uiURL;
		if (selectedHierarchyLevel == 'library') centralURL += '?contextType=global&selectedView=configuration&configMenu=library&configView=profile&configTab=profiles';
		else if (selectedHierarchyLevel == 'global') centralURL += '?contextType=global&selectedView=configuration&configMenu=global&configView=profile&configTab=profiles';
		else if (selectedHierarchyLevel == 'site-collection') centralURL += '?contextType=site-collection&selectedView=configuration&configMenu=selected-site-collection&configTab=profiles&configView=profile&siteCollectionId='+selectedScopeId;
		else if (selectedHierarchyLevel == 'site') centralURL += '?contextType=site&selectedView=configuration&siteId='+selectedScopeId+'&configMenu=selected-site&configTab=profiles&configView=profile';
		else if (selectedHierarchyLevel == 'device-group') centralURL += '?contextType=device-group&selectedView=configuration&deviceGroupId='+selectedScopeId+'&configMenu=selected-device-group&configTab=profiles&configView=profile';
		
		let scopeInfo = [];
		if (profile['@'] && profile['@']['aruba-annotation:scope_device_function']) {
			scopeInfo = parseScopeDeviceFunction(profile['@']['aruba-annotation:scope_device_function']);
		}
		
		let scopeDescriptions = [];
		scopeInfo.forEach(function(si) {
			let currentDevice = findDeviceInMonitoring(si['scope_name']);
			if (currentDevice) scopeDescriptions.push(currentDevice['deviceName'] + ' <i>(' +deviceFunctionDisplay[si['device_function']] + ')</i>');
			else if (si['scope_type'] === 'GLOBAL') scopeDescriptions.push('Global' + ' <i>(' +deviceFunctionDisplay[si['device_function']] + ')</i>');
			else scopeDescriptions.push(si['scope_name'] + ' <i>(' +deviceFunctionDisplay[si['device_function']] + ')</i>');
		})
		if (scopeDescriptions.length == 0) scopeDescriptions.push('-')
		
		let icon = '<i class="fa-regular fa-thumbtack-angle" data-bs-toggle="tooltip" data-bs-placement="top" data-container="body" data-animation="true" title="Local Profile"></i> ';
		if (profile['@'] && profile['@']['aruba-annotation:object_type']) {
			if (profile['@']['aruba-annotation:object_type'] === "SHARED") icon = '<i class="fa-regular fa-share-nodes" data-bs-toggle="tooltip" data-bs-placement="top" data-container="body" data-animation="true" title="Library Profile"></i> ';
		}
		
		if (profile['@'] && profile['@']['aruba-annotation:inherited']) {
			icon += '<i class="fa-regular fa-up" data-bs-toggle="tooltip" data-bs-placement="top" data-container="body" data-animation="true" title="Inherited from '+scopeDisplay[profile['@']['aruba-annotation:overridden_scope']]+'"></i>';
		} else {
			if (profile['@'] && profile['@']['aruba-annotation:overridden_scope'] && profile['@']['aruba-annotation:overridden_scope'] !== '') {
				icon += '<i class="fa-solid fa-circle-dot" data-bs-toggle="tooltip" data-bs-placement="top" data-container="body" data-animation="true" title="Overriding: '+scopeDisplay[profile['@']['aruba-annotation:overridden_scope']]+'"></i>';
			}
			if (profile['@'] && profile['@']['aruba-annotation:overriding_scopes_count'] && profile['@']['aruba-annotation:overriding_scopes_count'] > 0) {
				if (profile['@']['aruba-annotation:overriding_scopes_count'] < 10) icon += '<i class="fa-regular fa-circle-'+profile['@']['aruba-annotation:overriding_scopes_count']+'" data-bs-toggle="tooltip" data-bs-placement="top" data-container="body" data-animation="true" title="Overriding Profiles: '+profile['@']['aruba-annotation:overriding_scopes_count']+'"></i>';
				else icon += '<i class="fa-solid fa-circle-dot" data-bs-toggle="tooltip" data-bs-placement="top" data-container="body" data-animation="true" title="Overriding Profiles: '+profile['@']['aruba-annotation:overriding_scopes_count']+'"></i>';
			}
		}
		
		let clusters = [];
		let clusterArray = [];
		if (Array.isArray(profile['cluster'])) clusterArray = profile['cluster'];
		else if (profile['cluster']) clusterArray = [profile['cluster']];
		clusterArray.forEach(function(c) {
			if (c && c['mesh-cluster']) clusters.push(c['mesh-cluster']);
			else if (c && c['mc-name']) clusters.push(c['mc-name']);
		});
		if (clusters.length === 0) clusters.push('-');

		// Add row to table
		table.row.add([icon, '<a href="' + centralURL + '" target="_blank"><strong>' + profileName + '</strong></a><br />'+description, titleCase(profile['role']), meshBand[profile['band']], clusters.join('<br>'), scopeDescriptions.join('<br>'), actionBtns]);
	});
	$('#profiles-table').DataTable().rows().draw();
	initializeTooltips(document.getElementById('profiles-table'));
}

function loadJSONUI(profileName) {
	let config = '';
	profiles.forEach(function(p) {
		let profile = { ...p };
		let cleanProfile = profile['name'].replace(/^ /, "&nbsp");
		if (cleanProfile === profileName) {
			
			if (profile['@']['aruba-annotation:object_type'] === 'LOCAL') {
				let scopeInfo = [{scope_name:'', device_function:''}];
				if (profile['@'] && profile['@']['aruba-annotation:scope_device_function']) {
					scopeInfo = parseScopeDeviceFunction(profile['@']['aruba-annotation:scope_device_function']);
				}		
				editingType = 'LOCAL'		
				editingScope = scopeInfo[0]['scope_id'];
				editingPersona = scopeInfo[0]['device_function']
			} else {
				editingType = 'SHARED';
			}
			
			delete profile['@']; 
			config = JSON.stringify(profile, null, 2);
			document.getElementById('profileConfig').value = config;
			document.getElementById('json-title').innerHTML = 'Mesh Configuration: <strong>'+ cleanProfile + '</strong>'
			editingProfile = profileName;
			new bootstrap.Modal(document.getElementById('JSONModal')).show();
		}
	});
}

function closeJSON() {
	(bootstrap.Modal.getInstance(document.getElementById('JSONModal')) || new bootstrap.Modal(document.getElementById('JSONModal'))).hide();
}

function updateJSON() {
	if (!isValidJSON(document.getElementById('profileConfig').value)) showNotification('ca-window-code', 'Input is not valid JSON', 'bottom', 'center', 'warning')
	else {
		logStart('Updating Mesh Profile: '+editingProfile);
		authenticateWithCentral().then(function() {
			if (saveNotification) saveNotification.close();
			saveNotification = showNotification('ca-ap-icon3', 'Saving Profile: "'+editingProfile+'"...' , 'bottom', 'center', 'info');

			let config = document.getElementById('profileConfig').value;

			let command = profileEndpoint + '/' + editingProfile;
			if (editingType === 'LOCAL') command = profileEndpoint + '/' + editingProfile + '?object_type=LOCAL&scope_id='+editingScope+'&persona='+editingPersona;

			fetchProxyWithAuth('/tools/putCommandwHeaders', {
				url: localStorage.getItem('base_url') + command,
				access_token: localStorage.getItem('access_token'),
				data: config,
			})
			.then(function(commandResults) {
				let result = processStatus(commandResults);
				if (result == 429 || result == 409) {
					if (saveNotification) {
						saveNotification.update({ type: 'danger', message: 'Unable to save profile: "'+editingProfile+'". API Rate Limit hit. Please try again.' });
						setTimeout(saveNotification.close, 2000);
					}
				} else if (result == 400) {
					logError('Unable to update Mesh profile: '+editingProfile);
					if (saveNotification) {
						message = JSON.parse(commandResults['responseBody']);
						saveNotification.update({ type: 'warning', message: 'Unable to save profile: "'+ editingProfile+'"<br> '+ message['message'] });
						setTimeout(profileNotification.close, 10000);
					}
				} else if (result !== 200) {
					logError('Unable to update Mesh profile: '+editingProfile);
				} else {
					logInformation('Mesh profile: ' + editingProfile + ' was updated successfully');
					if (saveNotification) {
						saveNotification.update({ type: 'success', message: 'Mesh profile was updated' });
						setTimeout(profileNotification.close, 1000);
					}
					(bootstrap.Modal.getInstance(document.getElementById('JSONModal')) || new bootstrap.Modal(document.getElementById('JSONModal'))).hide();
					refreshProfilesForHierarchy();
				}
			});
		});
	}
}

function loadEditUI(profileName) {
	let config = '';
	profiles.forEach(function(p) {
		if (p['name'] === profileName) {
			let profile = { ...p };
			let profileName = profile['name'].replace(/^ /, "&nbsp");
				
			if (profile['@']['aruba-annotation:object_type'] === 'LOCAL') {
				let scopeInfo = [{scope_name:'', device_function:''}];
				if (profile['@'] && profile['@']['aruba-annotation:scope_device_function']) {
					scopeInfo = parseScopeDeviceFunction(profile['@']['aruba-annotation:scope_device_function']);
				}		
				editingType = 'LOCAL'		
				editingScope = scopeInfo[0]['scope_id'];
				editingPersona = scopeInfo[0]['device_function']
			} else {
				editingType = 'SHARED';
			}
			
			delete profile['@']; 
			editingConfig = profile;
			// Load all the settings into the UI
			// load the Current Settings section
			document.getElementById('profileName').value = profileName;
			if (profile['description']) document.getElementById('description').value = profile['description'];
			else document.getElementById('description').value = '';
			
			// Read Only Config
			const olList = document.getElementById("clusterList");
			document.getElementById('clusterList').innerHTML = '';
			let clusterArray = [];
			if (Array.isArray(profile['cluster'])) clusterArray = profile['cluster'];
			else if (profile['cluster']) clusterArray = [profile['cluster']];
			if (clusterArray.length === 0) document.getElementById('clusters').innerHTML = '-';
			else {
				clusterArray.forEach(function(c) {
					if (c && c['mesh-cluster']) olList.insertAdjacentHTML("beforeend", "<li>"+c['mesh-cluster']+"</li>");
					else if (c && c['mc-name']) olList.insertAdjacentHTML("beforeend", "<li>"+c['mc-name']+"</li>");
				});
			}
			
			console.log(profile)
			// General Config
			roleSelector.setChoiceByValue(profile['role']);
			algoSelector.setChoiceByValue(profile['topology-algorithm']);
		
			bandSelector.setChoiceByValue(profile['band']);
			changeBand(profile['band']);
			
			let split5 = 'FULL';
			if (profile['split5g-band-range']) split5 = profile['split5g-band-range']
			fiveSelector.setChoiceByValue(split5);
			changeDual5(split5);
			
			let uplink = 'NONE';
			if (profile['prefer-uplink-radio']) uplink = profile['prefer-uplink-radio']
			uplinkSelector.setChoiceByValue(uplink);
			
			//if (profile.hasOwnProperty('recovery')) document.getElementById('recovery').checked = profile['recovery'];
			//else document.getElementById('recovery').checked = false;
			
			if (profile.hasOwnProperty('max-children')) document.getElementById('max-children').value = profile['max-children'];
			else document.getElementById('max-children').value = 8;
			if (profile.hasOwnProperty('hop-count')) document.getElementById('hop-count').value = profile['hop-count'];
			else document.getElementById('hop-count').value = 2;
			if (profile.hasOwnProperty('heartbeat-threshold')) document.getElementById('heartbeat-threshold').value = profile['heartbeat-threshold'];
			else document.getElementById('heartbeat-threshold').value = 10;
			if (profile.hasOwnProperty('link-threshold')) document.getElementById('link-threshold').value = profile['link-threshold'];
			else document.getElementById('link-threshold').value = 12;
			if (profile.hasOwnProperty('max-retries')) document.getElementById('max-retries').value = profile['max-retries'];
			else document.getElementById('max-retries').value = 4
			if (profile.hasOwnProperty('mobility-beacon-miss')) document.getElementById('mobility-beacon-miss').value = profile['mobility-beacon-miss'];
			else document.getElementById('mobility-beacon-miss').value = 16;
			if (profile.hasOwnProperty('private-vlan')) document.getElementById('private-vlan').value = profile['private-vlan'];
			else document.getElementById('private-vlan').value = 0;
			if (profile.hasOwnProperty('optimize-scan-interval')) document.getElementById('optimize-scan-interval').value = profile['optimize-scan-interval'];
			else document.getElementById('optimize-scan-interval').value = 24;
			if (profile.hasOwnProperty('eht-enable')) document.getElementById('eht-enable').checked = profile['eht-enable'];
			else document.getElementById('eht-enable').checked = true;
			
			aTxSelector.removeActiveItems();
			let ratesArray = ['RATE_TYPE_6_MBPS','RATE_TYPE_9_MBPS','RATE_TYPE_12_MPBS','RATE_TYPE_18_MPBS','RATE_TYPE_24_MPBS','RATE_TYPE_36_MPBS','RATE_TYPE_48_MPBS','RATE_TYPE_54_MPBS'];
			if (profile['a-tx-rates']) ratesArray = profile['a-tx-rates'];
			aTxSelector.setChoiceByValue(ratesArray);
			
			
			let metric = 'DISTRIBUTED_TREE_RSSI';
			if (profile['metric-algorithm']) metric = profile['metric-algorithm']
			metricAlgoSelector.setChoiceByValue(metric);
			
			let reselection = 'STARTUP_SUBTHRESHOLD';
			if (profile['reselection-mode']) reselection = profile['reselection-mode']
			reselectionSelector.setChoiceByValue(reselection);
			
			
			editingProfile = profileName;
			new bootstrap.Modal(document.getElementById('UIModal')).show();
		}
	})
	
}

function closeEditUI() {
	(bootstrap.Modal.getInstance(document.getElementById('UIModal')) || new bootstrap.Modal(document.getElementById('UIModal'))).hide();
}

function updateUIProfile() {
	// Update config based on UI knobs
	if (document.getElementById('description').value !== '') editingConfig['description'] = document.getElementById('description').value;
	else delete editingConfig['description'];
	
	if (validateUIForm()) {
		showNotification('ca-ap-icon3', 'The profile contains invalid values. Please correct the values.' , 'bottom', 'center', 'warning');
		return;
	}
	//General Config
	editingConfig['role'] = roleSelector.getValue(true);
	editingConfig['topology-algorithm'] = algoSelector.getValue(true);
	editingConfig['metric-algorithm'] = metricAlgoSelector.getValue(true);
	
	// Radio Config
	editingConfig['band'] = bandSelector.getValue(true);
	if (!bandSelector.getValue(true).includes('5GHz')) {
		editingConfig['split5g-band-range'] = fiveSelector.getValue(true);
		if (editingConfig['split5g-band-range'] === 'FULL') {
			editingConfig['prefer-uplink-radio'] = uplinkSelector.getValue(true);
		} else {
			delete editingConfig['prefer-uplink-radio'];
		}
	} else {
		delete editingConfig['split5g-band-range'];
		delete editingConfig['prefer-uplink-radio'];
	}
	editingConfig['a-tx-rates'] = aTxSelector.getValue(true);
	editingConfig['eht-enable'] = document.getElementById('eht-enable').checked;
	
	// Topology
	editingConfig['hop-count'] = parseInt(document.getElementById('hop-count').value);
	editingConfig['max-children'] = parseInt(document.getElementById('max-children').value);
	editingConfig['heartbeat-threshold'] = parseInt(document.getElementById('heartbeat-threshold').value);
	editingConfig['link-threshold'] = parseInt(document.getElementById('link-threshold').value);
	editingConfig['max-retries'] = parseInt(document.getElementById('max-retries').value);
	editingConfig['mobility-beacon-miss'] = parseInt(document.getElementById('mobility-beacon-miss').value);
	
	// Advanced
	editingConfig['optimize-scan-interval'] = parseInt(document.getElementById('optimize-scan-interval').value);
	editingConfig['reselection-mode'] = reselectionSelector.getValue(true);
	editingConfig['private-vlan'] = parseInt(document.getElementById('private-vlan').value);
	
	
	
	// Save back to Central
	logStart('Updating Mesh Profile: '+editingProfile);
	authenticateWithCentral().then(function() {
		if (saveNotification) saveNotification.close();
		saveNotification = showNotification('ca-wifi', 'Saving Profile: "'+editingProfile+'"...' , 'bottom', 'center', 'info');

		let command = profileEndpoint + '/' + editingProfile;
		if (editingType === 'LOCAL') command = profileEndpoint + '/' + editingProfile + '?object_type=LOCAL&scope_id='+editingScope+'&persona='+editingPersona;

		fetchProxyWithAuth('/tools/putCommandwHeaders', {
			url: localStorage.getItem('base_url') + command,
			access_token: localStorage.getItem('access_token'),
			data: JSON.stringify(editingConfig),
		})
		.then(function(commandResults) {
			let result = processStatus(commandResults);
			if (result == 429 || result == 409) {
				if (saveNotification) {
					saveNotification.update({ type: 'danger', message: 'Unable to save Mesh: "'+editingProfile+'". API Rate Limit hit. Please try again.' });
					setTimeout(saveNotification.close, 2000);
				}
			} else if (result == 400) {
				logError('Unable to update Mesh profile: '+editingProfile);
				if (saveNotification) {
					message = JSON.parse(commandResults['responseBody']);
					saveNotification.update({ type: 'warning', message: 'Unable to save Mesh: "'+ editingProfile+'"<br> '+ message['message'] });
					setTimeout(saveNotification.close, 10000);
				}
			} else if (result !== 200) {
				if (saveNotification) {
					message = JSON.parse(commandResults['responseBody']);
					saveNotification.update({ type: 'warning', message: 'Unable to save Mesh: "'+ editingProfile+'"<br> '+ message['message'] });
					setTimeout(saveNotification.close, 10000);
				}
				logError('Unable to update Mesh profile: '+editingProfile);
			} else {
				logInformation('Mesh profile: ' + editingProfile + ' was updated successfully');
				if (saveNotification) {
					saveNotification.update({ type: 'success', message: 'Mesh profile was updated' });
					setTimeout(saveNotification.close, 1000);
				}
				(bootstrap.Modal.getInstance(document.getElementById('UIModal')) || new bootstrap.Modal(document.getElementById('UIModal'))).hide();
				refreshProfilesForHierarchy();
			}
		});
	});
}

function validateUIField(field) {
	if (field.type === 'number') {
		if (!field.value) field.value = field.placeholder;
		
		let result = false;
		// Check for valid value
		if ((parseInt(field.value) >= parseInt(field.min)) && (parseInt(field.value) <= parseInt(field.max))) result = true;

		if (result) field.classList.remove("is-invalid");
		else if ((!result) && (field.value === '') && (field.placeholder === '' || field.placeholder === 'AP Model Default')) field.classList.remove("is-invalid"); // Special case - remove warning
		else if (!field.classList.contains("is-invalid")) field.classList.add("is-invalid");
	}
}

function validateUIForm() {
	// querySelectorAll returns a NodeList of all matching elements.
	// We use a CSS selector string (e.g., '.my-class') to find elements with the class.
	const elements = document.querySelectorAll('.' + "is-invalid");
	// If the length is greater than 0, at least one element with the class exists.
	return elements.length > 0;
}

function validateVlanInput(input) {
  const MIN = 1;
  const MAX = 4094;

  if (typeof input !== 'string' || input.trim() === '') return false;

  const trimmed = input.trim();

  // Match a single number
  if (/^\d+$/.test(trimmed)) {
	const num = Number(trimmed);
	return num >= MIN && num <= MAX;
  }

  // Match a range (e.g. 10-100)
  if (/^\d+-\d+$/.test(trimmed)) {
	const [start, end] = trimmed.split('-').map(Number);
	return start >= MIN && end <= MAX && start < end;
  }

  return false;
}

/*  -------------------------------------------------------------------------------------------------------------------------------------------------------------------------
	Assigning profile
------------------------------------------------------------------------------------------------------------------------------------------------------------------------- */
// Open assign panel
function openAssign() {
	profileSelector.removeActiveItems();
	assignHierarchySelector.removeActiveItems();
	//deviceFunctionSelector.removeActiveItems();
	new bootstrap.Modal(document.getElementById('assignModal')).show();
}

function closeAssign() {
	(bootstrap.Modal.getInstance(document.getElementById('assignModal')) || new bootstrap.Modal(document.getElementById('assignModal'))).hide();
}

// Verify the input (profile list,etc) is valid
function verifyAssign() {
	if (!profileSelector.getValue(true)) {
		showNotification('ca-folder-settings', 'Please choose an Mesh Profile to assign', 'bottom', 'center', 'warning');
		return;
	}
	
	if (getAssignHierarchySelector().getValue(true).length == 0) {
		showNotification('ca-folder-settings', 'Please choose one or more scopes to assign profiles', 'bottom', 'center', 'warning');
		return;
	}
	
	if (deviceFunctionSelector.getValue(true).length == 0) {
		showNotification('ca-folder-settings', 'Please choose one or more device functions to assign profiles', 'bottom', 'center', 'warning');
		return;
	}
	
	assignProfile();
}

// Verify the input (profile selection, etc) is valid
function verifyUnassign() {
	if (!profileSelector.getValue(true)) {
		showNotification('ca-folder-settings', 'Please choose an Mesh to assign', 'bottom', 'center', 'warning');
		return;
	}
	
	if (getAssignHierarchySelector().getValue(true).length == 0) {
		showNotification('ca-folder-settings', 'Please choose one or more scopes to unassign profiles', 'bottom', 'center', 'warning');
		return;
	}
	
	if (deviceFunctionSelector.getValue(true).length == 0) {
		showNotification('ca-folder-settings', 'Please choose one or more device functions to unassign profiles', 'bottom', 'center', 'warning');
		return;
	}
	
	unassignProfile();
}

// build list of profiles and call generic function
function getProfileList(isAssigning) {
	// build list of profiles that need to be assigned...
	let profileSelected = profileSelector.getValue(true);

	let profileList = [];
	profiles.forEach(function(profile) {
		if (profile.name === profileSelected.toString()) {
			profileList.push(profile);
		}
	});
	
	// call generic assign workflow
	if (isAssigning) assignConfirmed(profileList, profileType, profileName, profileUniqueLeaf,singleInstance);
	else unassignConfirmed(profileList, profileType, profileName, profileUniqueLeaf);
}
