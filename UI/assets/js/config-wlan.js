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

var bandSelector;
var dual5Selector;
var dual6Selector;
var subModeSelector;
var authFailureSelector;
var gwSpoofingSelector;
var macAuthDelimiterSelector;
var authDelimiterSelector;
var gBasicSelector;
var gTxSelector;
var aBasicSelector;
var aTxSelector;

var profileSelector;
const profileName = 'WLAN'
const profileUniqueLeaf = 'ssid'
const profileType = 'wlan-ssids';
const singleInstance = false;

var deletePromise;
var deleteResolve;
var deleteReject;

var profileEndpoint = '/network-config/v1/wlan-ssids';
var profileEndpointOverlay = '/network-config/v1/overlay-wlan';
var uiURL = '/gravity/monitoring/config/profiles/wlans';
var selectedHierarchyLevel = 'library';
var selectedScopeId = '';

function populateChoices() {
	var bandElement = document.getElementById('bandselector');
	if (bandElement) {
			bandSelector = new Choices(bandElement, {
			searchEnabled: false,
			shouldSort: false,
			itemSelectText: ""
		});
		var bandChoices = [];
		bandChoices.push({ value: 'BAND_NONE', label: 'None' });
		bandChoices.push({ value: '24GHZ', label: '2.4GHz' });
		bandChoices.push({ value: '5GHZ', label: '5GHz' });
		bandChoices.push({ value: '6GHZ', label: '6GHz' });
		bandChoices.push({ value: '24GHZ_5GHZ', label: '2.4GHz and 5GHz' });
		bandChoices.push({ value: '24GHZ_6GHZ', label: '2.4GHz and 6GHz' });
		bandChoices.push({ value: '5GHZ_6GHZ', label: '5GHz and 6GHz' });
		bandChoices.push({ value: 'BAND_ALL', label: 'All' });
		bandSelector.clearChoices();
		bandSelector.setChoices(bandChoices);
		bandSelector.setChoiceByValue('BAND_ALL');
		
		bandElement.addEventListener('change', function() {
			bandChange(this.value);
		});
	}
	
	var dual5Element = document.getElementById('dual5selector');
	if (dual5Element) {
			dual5Selector = new Choices(dual5Element, {
			searchEnabled: false,
			shouldSort: false,
			itemSelectText: ""
		});
		var dual5Choices = [];
		dual5Choices.push({ value: 'ALL_5G', label: 'All' });
		dual5Choices.push({ value: 'FIRST_5G', label: 'First 5GHz radio' });
		dual5Choices.push({ value: 'SECOND_5G', label: 'Second 5GHz radio' });
		dual5Selector.clearChoices();
		dual5Selector.setChoices(dual5Choices);
		dual5Selector.setChoiceByValue('ALL_5G');
	}
	
	var dual6Element = document.getElementById('dual6selector');
	if (dual6Element) {
			dual6Selector = new Choices(dual6Element, {
			searchEnabled: false,
			shouldSort: false,
			itemSelectText: ""
		});
		var dual6Choices = [];
		dual6Choices.push({ value: 'ALL_6GHZ', label: 'All' });
		dual6Choices.push({ value: 'FIRST_6GHZ', label: 'First 6GHz radio' });
		dual6Choices.push({ value: 'SECOND_6GHZ', label: 'Second 6GHz radio' });
		dual6Selector.clearChoices();
		dual6Selector.setChoices(dual6Choices);
		dual6Selector.setChoiceByValue('ALL_6G');
	}
	
	var subModeElement = document.getElementById('sae-sub-mode');
	if (subModeElement) {
			subModeSelector = new Choices(subModeElement, {
			searchEnabled: false,
			shouldSort: false,
			itemSelectText: ""
		});
		var choices = [];
		choices.push({ value: 'LEGACY_MODE', label: 'Legacy' });
		choices.push({ value: 'GCM256_ONLY_MODE', label: 'GCM-256 Only' });
		choices.push({ value: 'MIX_MODE', label: 'Mix' });
		subModeSelector.clearChoices();
		subModeSelector.setChoices(choices);
		subModeSelector.setChoiceByValue('MIX_MODE');
	}
	
	var elevenRElement = document.getElementById('dot11r');
	if (elevenRElement) {
		elevenRElement.addEventListener('change', function() {
			change11r(this.checked);
		});
	}
	
	var authFailureElement = document.getElementById('auth-failure-code');
	if (authFailureElement) {
			authFailureSelector = new Choices(authFailureElement, {
			searchEnabled: false,
			shouldSort: false,
			itemSelectText: ""
		});
		var authFailureChoices = [];
		authFailureChoices.push({ value: 'DYNAMIC', label: 'Dynamic' });
		authFailureChoices.push({ value: 'WLAN_STATUS_R0KH_UNREACHABLE', label: 'R0KH unreachable' });
		authFailureChoices.push({ value: 'WLAN_STATUS_FAILED_INVALID_PMKID', label: 'Invalid PMKID' });
		authFailureSelector.clearChoices();
		authFailureSelector.setChoices(authFailureChoices);
		authFailureSelector.setChoiceByValue('DYNAMIC');
	}
	
	var gwSpoofingElement = document.getElementById('gw-spoofing-protection-customize');
	if (gwSpoofingElement) {
			gwSpoofingSelector = new Choices(gwSpoofingElement, {
			searchEnabled: false,
			shouldSort: false,
			itemSelectText: ""
		});
		var spoofingChoices = [];
		spoofingChoices.push({ value: 'ON', label: 'Enabled' });
		spoofingChoices.push({ value: 'V4_ONLY', label: 'IPv4 Only' });
		spoofingChoices.push({ value: 'V6_ONLY', label: 'IPv6 Only' });
		spoofingChoices.push({ value: 'OFF', label: 'Disabled' });
		gwSpoofingSelector.clearChoices();
		gwSpoofingSelector.setChoices(spoofingChoices);
		gwSpoofingSelector.setChoiceByValue('ENABLED');
	}
	
	var delimiterChoices = [];
	delimiterChoices.push({ value: 'NONE', label: 'None' });
	delimiterChoices.push({ value: 'COLON', label: 'Colon' });
	delimiterChoices.push({ value: 'DASH', label: 'Dash' });
	delimiterChoices.push({ value: 'PERCENT', label: 'Percent' });
	delimiterChoices.push({ value: 'COMMA', label: 'Comma' });
	delimiterChoices.push({ value: 'SLASH', label: 'Slash' });
	
	var macAuthDelimiterElement = document.getElementById('mac-authentication-delimiter');
	if (macAuthDelimiterElement) {
			macAuthDelimiterSelector = new Choices(macAuthDelimiterElement, {
			searchEnabled: false,
			shouldSort: false,
			itemSelectText: ""
		});
		macAuthDelimiterSelector.clearChoices();
		macAuthDelimiterSelector.setChoices(delimiterChoices);
		macAuthDelimiterSelector.setChoiceByValue('NONE');
	}
	
	var authDelimiterElement = document.getElementById('auth-mac-address-delimiter');
	if (authDelimiterElement) {
			authDelimiterSelector = new Choices(authDelimiterElement, {
			searchEnabled: false,
			shouldSort: false,
			itemSelectText: ""
		});
		authDelimiterSelector.clearChoices();
		authDelimiterSelector.setChoices(delimiterChoices);
		authDelimiterSelector.setChoiceByValue('NONE');
	}
	
	var datarates2 = [];
	datarates2.push({ value: 'RATE_1MB', label: '1' });
	datarates2.push({ value: 'RATE_2MB', label: '2' });
	datarates2.push({ value: 'RATE_5DOT5MB', label: '5.5' });
	datarates2.push({ value: 'RATE_6MB', label: '6' });
	datarates2.push({ value: 'RATE_9MB', label: '9' });
	datarates2.push({ value: 'RATE_11MB', label: '11' });
	datarates2.push({ value: 'RATE_12MB', label: '12' });
	datarates2.push({ value: 'RATE_18MB', label: '18' });
	datarates2.push({ value: 'RATE_24MB', label: '24' });
	datarates2.push({ value: 'RATE_36MB', label: '36' });
	datarates2.push({ value: 'RATE_48MB', label: '48' });
	datarates2.push({ value: 'RATE_54MB', label: '54' });
	var basic2Element = document.getElementById('g-basic-rates');
	if (basic2Element) {
			gBasicSelector = new Choices(basic2Element, {
			searchEnabled: false,
			shouldSort: false,
			shouldSortItems: true,
			itemSelectText: "",
			removeItemButton:true
		});
		gBasicSelector.clearChoices();
		gBasicSelector.setChoices(datarates2);
	}
	var transmit2Element = document.getElementById('g-transmit-rates');
	if (transmit2Element) {
			gTxSelector = new Choices(transmit2Element, {
			searchEnabled: false,
			shouldSort: false,
			shouldSortItems: true,
			itemSelectText: "",
			removeItemButton:true
		});
		gTxSelector.clearChoices();
		gTxSelector.setChoices(datarates2);
	}
	
	var datarates5 = [];
	datarates5.push({ value: 'RATE_6MB', label: '6' });
	datarates5.push({ value: 'RATE_9MB', label: '9' });
	datarates5.push({ value: 'RATE_12MB', label: '12' });
	datarates5.push({ value: 'RATE_18MB', label: '18' });
	datarates5.push({ value: 'RATE_24MB', label: '24' });
	datarates5.push({ value: 'RATE_36MB', label: '36' });
	datarates5.push({ value: 'RATE_48MB', label: '48' });
	datarates5.push({ value: 'RATE_54MB', label: '54' });
	var basic5Element = document.getElementById('a-basic-rates');
	if (basic5Element) {
			aBasicSelector = new Choices(basic5Element, {
			searchEnabled: false,
			shouldSort: false,
			shouldSortItems: true,
			itemSelectText: "",
			removeItemButton:true
		});
		aBasicSelector.clearChoices();
		aBasicSelector.setChoices(datarates5);
	}
	var transmit5Element = document.getElementById('a-transmit-rates');
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
	
	var tspecElement = document.getElementById('tspec');
	if (tspecElement) {
		tspecElement.addEventListener('change', function() {
			changeTSPEC(this.checked);
		});
	}
	
	var wifi4Element = document.getElementById('high-throughput');
	if (wifi4Element) {
		wifi4Element.addEventListener('change', function() {
			changeWifi4(this.checked);
		});
	}
	
	var wifi5Element = document.getElementById('very-high-throughput');
	if (wifi5Element) {
		wifi5Element.addEventListener('change', function() {
			changeWifi5(this.checked);
		});
	}
	
	var wifi6Element = document.getElementById('high-efficiency');
	if (wifi6Element) {
		wifi6Element.addEventListener('change', function() {
			changeWifi6(this.checked);
		});
	}
	
	var wifi7Element = document.getElementById('extremely-high-throughput');
	if (wifi7Element) {
		wifi7Element.addEventListener('change', function() {
			changeWifi7(this.checked);
		});
	}
	
	var macAuthElement = document.getElementById('mac-authentication');
	if (macAuthElement) {
		macAuthElement.addEventListener('change', function() {
			changeMacAuth(this.checked);
		});
	}
	
	var authSurvElement = document.getElementById('auth-survivability');
	if (authSurvElement) {
		authSurvElement.addEventListener('change', function() {
			changeAuthSurvPriority(this.checked);
		});
	}	
	
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
			selectChoices.push({ value: p.ssid, label: p.ssid });
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
	profileNotification = showNotification('ca-wifi', 'Obtaining profiles...', 'bottom', 'center', 'info');
	
	var command = profileEndpoint + '?detailed=true';
	if (scope !== 'Library') command = profileEndpoint + '?effective=true&detailed=true&encrypted_secrets=false&view_type=LOCAL&scope_id='+scope;

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
		var result = processStatus(commandResults);
		// will return the status code to trigger next step
		if (result == 429 || result == 409) {
			setTimeout(getProfiles, apiWaitDelay, offset);
		} else if (result !== 200) {
			if (profileNotification) {
				profileNotification.update({ type: 'danger', message: 'Failed to retrieve WLAN Profiles' });
				setTimeout(profileNotification.close, 2000);
			}
		} else {
			var response = JSON.parse(commandResults.responseBody);
			if (response['wlan-ssid']) profiles = profiles.concat(response['wlan-ssid']);
			//console.log('downloading profiles...'+profiles.length);
			offset = response.offset;
			if (offset) {
				var getProgress = ((profiles.length) / response.total) * 100;
				profileNotification.update({ progress: getProgress });
				getProfiles(offset,scope);
			} else {
				if (profileNotification) {
					profileNotification.update({ progress: 100, type: 'success', message: 'Retrieved WLAN Profiles' });
					setTimeout(profileNotification.close, 1000);
				}
				//console.log('downloaded profiles...'+profiles.length);
				loadProfilesTable();
				populateProfileChoice();
			}
		}
	});
}

function loadProfilesTable() {
	var table = $('#profiles-table').DataTable();
	disposeTooltips(document.getElementById('profiles-table'));
	$('#profiles-table').DataTable().clear();
	
	profiles.forEach(function(profile) {
		let profileName = profile['ssid'].replace(/^ /, "&nbsp");
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
			if (profile['enable']) {
				status = '<i class="fa-solid fa-circle text-success"></i>';
				actionBtns += '<a class="btn btn-link btn-warning mt-2" data-bs-toggle="tooltip" data-bs-placement="top" data-container="body" data-animation="true" title="Disable WLAN" onclick="enableWLAN(\'' + profileName + '\',false)"><i class="fa-solid fa-wifi-slash" style="color: #67748e; font-size:18px;"></i></a>';
			} else {
				status = '<i class="fa-solid fa-diamond text-danger"></i>';
				actionBtns += '<a class="btn btn-link btn-warning mt-2" data-bs-toggle="tooltip" data-bs-placement="top" data-container="body" data-animation="true" title="Enable WLAN" onclick="enableWLAN(\'' + profileName + '\',true)"><i class="fa-solid fa-wifi" style="color: #67748e; font-size:18px;"></i></a>';
			}
		}
		if (profile['type'] && profile['type'] === "RECOVERY") actionBtns = '';
		
		// Make Name as a link to Central
		let name = encodeURI(profile['ssid']);
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
		let type = 'Access'
		if (profile['type']) type = wlanType[profile['type']];
		
		let essid = 'Alias';
		if (profile['essid']['name']) {
			essid = profile['essid']['name'];
			essid = essid.replace(/^ /, "&nbsp");
		} else if (profile['essid']['alias']) essid = 'Alias: '+ profile['essid']['alias'];
		
		if (scopeDescriptions.length == 1 && scopeDescriptions[0] === '-') {
			actionBtns += '<a class="btn btn-link btn-warning mt-2" data-bs-toggle="tooltip" data-bs-placement="top" data-container="body" data-animation="true" title="Delete WLAN" onclick="deleteProfile(\'' + profileName + '\')"><i class="fa-solid fa-trash-can" style="color: #67748e; font-size:18px;"></i></a> ';
		}
		
		
		// Add row to table
		table.row.add([icon, '<a href="' + centralURL + '" target="_blank"><strong>' + profileName + '</strong></a><br \>'+description, type, essid, status, keyManagement[profile['opmode']], rfBand[profile['rf-band']], scopeDescriptions.join('<br>'), actionBtns]);
	});
	$('#profiles-table').DataTable().rows().draw();
	initializeTooltips(document.getElementById('profiles-table'));
}

function loadJSONUI(profileName) {
	var config = '';
	profiles.forEach(function(p) {
		var profile = { ...p };
		var cleanSSID = profile['ssid'].replace(/^ /, "&nbsp");
		if (cleanSSID === profileName) {
			
			if (profile['@']['aruba-annotation:object_type'] === 'LOCAL') {
				var scopeInfo = [{scope_name:'', device_function:''}];
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
			document.getElementById('json-title').innerHTML = 'WLAN Configuration: <strong>'+ cleanSSID + '</strong>'
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
		logStart('Updating WLAN Profile: '+editingProfile);
		authenticateWithCentral().then(function() {
			if (saveNotification) saveNotification.close();
			saveNotification = showNotification('ca-wifi', 'Saving Profile: "'+editingProfile+'"...' , 'bottom', 'center', 'info');

			var config = document.getElementById('profileConfig').value;

			var command = profileEndpoint + '/' + editingProfile;
			if (editingType === 'LOCAL') command = profileEndpoint + '/' + editingProfile + '?object_type=LOCAL&scope_id='+editingScope+'&persona='+editingPersona;

			fetchProxyWithAuth('/tools/putCommandwHeaders', {
				url: localStorage.getItem('base_url') + command,
				access_token: localStorage.getItem('access_token'),
				data: config,
			})
			.then(function(commandResults) {
				var result = processStatus(commandResults);
				if (result == 429 || result == 409) {
					if (saveNotification) {
						saveNotification.update({ type: 'danger', message: 'Unable to save profile: "'+editingProfile+'". API Rate Limit hit. Please try again.' });
						setTimeout(saveNotification.close, 2000);
					}
				} else if (result == 400) {
					logError('Unable to update WLAN profile: '+editingProfile);
					if (saveNotification) {
						message = JSON.parse(commandResults['responseBody']);
						saveNotification.update({ type: 'warning', message: 'Unable to save profile: "'+ editingProfile+'"<br> '+ message['message'] });
						setTimeout(profileNotification.close, 10000);
					}
				} else if (result !== 200) {
					logError('Unable to update WLAN profile: '+editingProfile);
				} else {
					logInformation('WLAN profile: ' + editingProfile + ' was updated successfully');
					if (saveNotification) {
						saveNotification.update({ type: 'success', message: 'WLAN profile was updated' });
						setTimeout(profileNotification.close, 1000);
					}
					(bootstrap.Modal.getInstance(document.getElementById('JSONModal')) || new bootstrap.Modal(document.getElementById('JSONModal'))).hide();
					refreshProfilesForHierarchy();
				}
			});
		});
	}
}

function enableWLAN(profileName, enableState) {
	var config = '';
	profiles.forEach(function(p) {
		var profile = { ...p };
		var cleanSSID = profile['ssid'].replace(/^ /, "&nbsp");
		if (cleanSSID === profileName) {
			if (profile['@']['aruba-annotation:object_type'] === 'LOCAL') {
				var scopeInfo = [{scope_name:'', device_function:''}];
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
			var currentConfig = profile;
			currentConfig.enable = enableState
			config = JSON.stringify(currentConfig, null, 2);
		}
	});

	
	authenticateWithCentral().then(function() {
		if (saveNotification) saveNotification.close();
		if (enableState) saveNotification = showNotification('ca-wifi', 'Enabling WLAN: "'+profileName+'"...' , 'bottom', 'center', 'info');
		else saveNotification = showNotification('ca-wifi', 'Disabling WLAN: "'+profileName+'"...' , 'bottom', 'center', 'info');

		var command = profileEndpoint + '/' + profileName;
		if (editingType === 'LOCAL') command = profileEndpoint + '/' + profileName + '?object_type=LOCAL&scope_id='+editingScope+'&persona='+editingPersona;

		fetchProxyWithAuth('/tools/patchCommandwHeaders', {
			url: localStorage.getItem('base_url') + command,
			access_token: localStorage.getItem('access_token'),
			data: config,
		})
		.then(function(commandResults) {
			var result = processStatus(commandResults);
			if (result == 429 || result == 409) {
				if (saveNotification) {
					saveNotification.update({ type: 'danger', message: 'Unable to save WLAN: "'+editingProfile+'". API Rate Limit hit. Please try again.' });
					setTimeout(saveNotification.close, 2000);
				}
			} else if (result !== 200) {
				if (saveNotification) {
					saveNotification.update({ type: 'danger', message: 'Failed to update WLAN profile' });
					setTimeout(profileNotification.close, 2000);
				}
				logError('Unable to update WLAN profile: '+profileName);
			} else {
				if (saveNotification) {
					saveNotification.update({ type: 'success', message: 'WLAN profile was updated' });
					setTimeout(profileNotification.close, 2000);
				}
				logInformation('WLAN profile: ' + profileName + ' was updated successfully');
				(bootstrap.Modal.getInstance(document.getElementById('JSONModal')) || new bootstrap.Modal(document.getElementById('JSONModal'))).hide();
				refreshProfilesForHierarchy();
			}
		});
	});
}

/*  -------------------------------------------------------------------------------------------------------------------------------------------------------------------------
	Deleting Profiles
------------------------------------------------------------------------------------------------------------------------------------------------------------------------- */

function deleteProfile(profileName) {
	profiles.forEach(function(p) {
		let profile = { ...p };
		var cleanProfile = profile['ssid'].replace(/^ /, "&nbsp");
		if (cleanProfile === profileName) {
			if (profile['forward-mode'] === 'FORWARD_MODE_L2' || profile['forward-mode'] === 'FORWARD_MODE_L3' || profile['forward-mode'] === 'FORWARD_MODE_MIXED') {
				Swal.fire({
					title: 'Delete Profile',
					html: 'Are you sure you want to delete '+profileName+'?',
					footer: 'There is no undo for this operation',
					icon: 'warning',
					showCancelButton: true,
					confirmButtonColor: '#3085d6',
					cancelButtonColor: '#888888',
					confirmButtonText: 'Yes',
					cancelButtonText: 'No',
				}).then(result => {
					if (result.isDismissed) {
						return false;
					} else {
						deleteProfileConfirmed(profileName, true);
					}
				});
			} else {
				Swal.fire({
					title: 'Delete Profile',
					html: 'Are you sure you want to delete "'+profileName+'"?',
					footer: 'There is no undo for this operation',
					icon: 'warning',
					showCancelButton: true,
					confirmButtonColor: '#3085d6',
					cancelButtonColor: '#888888',
					confirmButtonText: 'Yes',
					cancelButtonText: 'No',
				}).then(result => {
					if (result.isDismissed) {
						return false;
					} else {
						deleteProfileConfirmed(profileName, false);
					}
				});
			}
		}
	});
	
}

function deleteProfileConfirmed(profileName, isOverlay) {
	authenticateWithCentral().then(function() {
		logStart('Deleting WLAN profile: '+ profileName);
		if (isOverlay) {
			deleteOverlay(profileName).then(function() {
				deleteWLAN(profileName);
			});
		} else {
			deleteWLAN(profileName);
		}
	});
}

function deleteOverlay(profileName) {
	deletePromise = new Promise(function(resolve, reject) { deleteResolve = resolve; deleteReject = reject; });
	fetchProxyWithAuth('/tools/deleteCommand', {
		url: localStorage.getItem('base_url') + profileEndpointOverlay + '/' + profileName,
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
			// Over API threshold limit or backend busy. Wait apiWaitDelay value and try again.
			setTimeout(deleteOverlay, apiWaitDelay, profileName);
		} else if (result !== 200) {
			if (commandResults.message && commandResults.message.includes('Delete for unexpected req_xpath')) {
				logInformation('Overlay WLAN mapping '+ profileName + ' was not found');
				showNotification('ca-bin', 'Overlay WLAN mapping '+profileName+' was not found', 'bottom', 'center', 'success');
				wlanResolve();
			} else {
				logError('Unable to delete Overlay WLAN mapping '+ profileName);
				showNotification('ca-bin', 'Unable to delete Overlay WLAN mapping profile', 'bottom', 'center', 'danger');
				if (deleteReject) deleteReject();
			}
		} else {
			logInformation('Overlay WLAN mapping '+ profileName + ' was deleted');
			showNotification('ca-bin', 'Overlay WLAN mapping '+profileName+' was successfully deleted', 'bottom', 'center', 'success');
			deleteResolve();
		}
	}).catch(function(err) {
		logError('Failed to delete Overlay WLAN '+profileName);
		if (deleteReject) deleteReject();
	});
	return deletePromise;
}

function deleteWLAN(profileName) {
	deletePromise = new Promise(function(resolve, reject) { deleteResolve = resolve; deleteReject = reject; });
	fetchProxyWithAuth('/tools/deleteCommand', {
		url: localStorage.getItem('base_url') + profileEndpoint + '/' + profileName,
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
			// Over API threshold limit or backend busy. Wait apiWaitDelay value and try again.
			setTimeout(deleteWLAN, apiWaitDelay, profileName);
		} else if (result !== 200) {
			logError('Unable to delete WLAN '+ profileName);
			showNotification('ca-bin', 'Unable to delete WLAN profile', 'bottom', 'center', 'danger');
			if (deleteReject) deleteReject();
		} else {
			logInformation('WLAN '+ profileName + ' was deleted');
			showNotification('ca-bin', 'WLAN '+profileName+' was successfully deleted', 'bottom', 'center', 'success');
			deleteResolve();
		}
		updateInformation();
		logEnd('WLAN Deletion complete');
	}).catch(function(err) {
		logError('Failed to delete WLAN '+profileName);
		if (deleteReject) deleteReject();
	});
	return wlanPromise;
}

function loadEditUI(profileName) {
	var config = '';
	profiles.forEach(function(p) {
		var profile = { ...p };
		var cleanSSID = profile['ssid'].replace(/^ /, "&nbsp");
		if (cleanSSID === profileName) {
			
			if (profile['@']['aruba-annotation:object_type'] === 'LOCAL') {
				var scopeInfo = [{scope_name:'', device_function:''}];
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
			//console.log(profile)
			// Load all the settings into the UI
			// load the Current Settings section
			document.getElementById('profileName').value = cleanSSID;
			if (profile['description']) document.getElementById('description').value = profile['description'];
			else document.getElementById('description').value = '';
			document.getElementById('forwarding-mode').innerHTML = '<strong>Forwarding Mode: </strong>'+forwardingMode[profile['forward-mode']];
			if (profile['vlan-selector'] === "NAMED_VLAN") document.getElementById('default-vlan').innerHTML = '<strong>Default VLAN: </strong>'+profile['vlan-name'];
			else if (profile['vlan-selector'] === "VLAN_RANGES") document.getElementById('default-vlan').innerHTML = '<strong>Default VLAN: </strong>'+profile['vlan-id-range'].join(', ');
			var keymgmt = '<strong>Opmode: </strong>'+keyManagement[profile['opmode']];
			if (profile['wpa3-transition-mode-enable']) keymgmt += ' w/ Transition Mode';
			document.getElementById('opmode').innerHTML = keymgmt
			if (profile['default-role']) document.getElementById('default-role').innerHTML = '<strong>Default Role: </strong>'+profile['default-role'];
			else document.getElementById('default-role').innerHTML = '<strong>Default Role: </strong>'+cleanSSID;
			
			var essid = 'Alias';
			if (profile['essid']['name']) {
				essid = profile['essid']['name'];
				essid = essid.replace(/^ /, "&nbsp");
			} else if (profile['essid']['alias']) essid = 'Alias: '+ profile['essid']['alias'];
			document.getElementById('essid').innerHTML = '<strong>ESSID: </strong>'+essid;
			document.getElementById('max-clients').innerHTML = '<strong>Max Clients Per AP: </strong>'+profile['max-clients-threshold'];
			var dot11k = '<i class="fa-solid fa-octagon-xmark"></i>';
			if (profile['dot11k']) dot11k = '<i class="fa-solid fa-circle-check"></i>';
			document.getElementById('dot11k').innerHTML = '<strong>802.11k: </strong>'+dot11k;
			var isolation = '<i class="fa-solid fa-octagon-xmark"></i>';
			if (profile['client-isolation']) isolation = '<i class="fa-solid fa-circle-check"></i>';
			document.getElementById('client-isolation').innerHTML = '<strong>Client Isolation: </strong>'+isolation;
			
			document.getElementById('broadcast-filter-ipv4').innerHTML = '<strong>Broadcast Filter (IPv4): </strong>'+broadcastFilter['4'][profile['broadcast-filter-ipv4']];
			var broadcastv6 = '<i class="fa-solid fa-octagon-xmark"></i>';
			if (profile['broadcast-filter-ipv6'] === 'UCAST_FILTER_RA') broadcastv6 = '<i class="fa-solid fa-circle-check"></i>';
			document.getElementById('broadcast-filter-ipv6').innerHTML = '<strong>Broadcast Filter (IPv6): </strong>'+broadcastv6;
			var apname = '<i class="fa-solid fa-octagon-xmark"></i>';
			if (profile['advertise-apname']) apname = '<i class="fa-solid fa-circle-check"></i>';
			document.getElementById('advertise-apname').innerHTML = '<strong>Advertise AP Name: </strong>'+apname;
			var dhcp = '<i class="fa-solid fa-octagon-xmark"></i>';
			if (profile['enforce-dhcp']) dhcp = '<i class="fa-solid fa-circle-check"></i>';
			document.getElementById('enforce-dhcp').innerHTML = '<strong>Enforce DHCP: </strong>'+dhcp;
			
			
			document.getElementById('enabledCheckbox').checked = profile['enable'];
			document.getElementById('disable-on-6ghz-mesh').checked = profile['disable-on-6ghz-mesh'];
			document.getElementById('dtim-period').value = profile['dtim-period'];
	
			bandSelector.setChoiceByValue(profile['rf-band']);
			bandChange(profile['rf-band'])
			if (profile.hasOwnProperty('allowed-5ghz-radio')) dual5Selector.setChoiceByValue(profile['allowed-5ghz-radio']);
			else dual5Selector.setChoiceByValue('ALL_5G');
			if (profile.hasOwnProperty('allowed-6ghz-radio')) dual6Selector.setChoiceByValue(profile['allowed-6ghz-radio']);
			else dual6Selector.setChoiceByValue('ALL_6GHZ');
			
			gBasicSelector.removeActiveItems();
			gBasicSelector.setChoiceByValue(profile['g-legacy-rates']['basic-rates']);
			gTxSelector.removeActiveItems();
			gTxSelector.setChoiceByValue(profile['g-legacy-rates']['tx-rates']);
			aBasicSelector.removeActiveItems();
			aBasicSelector.setChoiceByValue(profile['a-legacy-rates']['basic-rates']);
			aTxSelector.removeActiveItems();
			aTxSelector.setChoiceByValue(profile['a-legacy-rates']['tx-rates']);
			
			if (profile.hasOwnProperty('cdc')) document.getElementById('cdc').checked = profile['cdc'];
			else document.getElementById('cdc').checked = false;
			if (profile.hasOwnProperty('mbo')) document.getElementById('mbo').checked = profile['mbo'];
			else document.getElementById('mbo').checked = false;
			
			if (profile.hasOwnProperty('inactivity-timeout')) document.getElementById('inactivity-timeout').value = profile['inactivity-timeout'];
			else document.getElementById('inactivity-timeout').value = 1000;
			if (profile.hasOwnProperty('explicit-ageout-client')) document.getElementById('explicit-ageout-client').checked = profile['explicit-ageout-client'];
			else document.getElementById('explicit-ageout-client').checked = false;
			if (profile.hasOwnProperty('pmk-cache-delete-on-leave')) document.getElementById('pmk-cache-delete-on-leave').checked = profile['pmk-cache-delete-on-leave'];
			else document.getElementById('pmk-cache-delete-on-leave').checked = false;
			
			if (profile.hasOwnProperty('qbss-load')) document.getElementById('qbss-load').checked = profile['qbss-load'];
			else document.getElementById('qbss-load').checked = false;
			if (profile.hasOwnProperty('rrm-quiet-ie')) document.getElementById('rrm-quiet-ie').checked = profile['rrm-quiet-ie'];
			else document.getElementById('rrm-quiet-ie').checked = false;
			
			if (profile.hasOwnProperty('wmm-cfg') && profile['wmm-cfg'].hasOwnProperty('uapsd')) document.getElementById('uapsd').checked = profile['wmm-cfg']['uapsd'];
			else document.getElementById('uapsd').checked = false;
			if (profile.hasOwnProperty('wmm-cfg') && profile['wmm-cfg'].hasOwnProperty('tspec')) document.getElementById('tspec').checked = profile['wmm-cfg']['tspec'];
			else document.getElementById('tspec').checked = false;
			changeTSPEC(document.getElementById('tspec').checked);
			if (profile.hasOwnProperty('tspec-bandwidth')) document.getElementById('tspec-bandwidth').value = profile['tspec-bandwidth'];
			else document.getElementById('tspec-bandwidth').value = 2000;
			
			document.getElementById('high-throughput').checked = profile['high-throughput']['enable'];
			changeWifi4(profile['high-throughput']['enable']);
			if (profile['high-throughput'].hasOwnProperty('ba-amsdu')) document.getElementById('ba-amsdu').checked = profile['high-throughput']['ba-amsdu'];
			else document.getElementById('ba-amsdu').checked = true;
			if (profile['high-throughput'].hasOwnProperty('rx-ampdu-agg')) document.getElementById('rx-ampdu-agg').checked = profile['high-throughput']['rx-ampdu-agg'];
			else document.getElementById('rx-ampdu-agg').checked = true;
			if (profile['high-throughput'].hasOwnProperty('mpdu-agg')) document.getElementById('mpdu-agg').checked = profile['high-throughput']['mpdu-agg'];
			else document.getElementById('mpdu-agg').checked = true;
			if (profile['high-throughput'].hasOwnProperty('ldpc')) document.getElementById('ldpc').checked = profile['high-throughput']['ldpc'];
			else document.getElementById('ldpc').checked = true;
			
			document.getElementById('very-high-throughput').checked = profile['high-throughput']['very-high-throughput'];
			changeWifi5(profile['high-throughput']['very-high-throughput']);
			if (profile['high-throughput'].hasOwnProperty('vht-mu-txbf')) document.getElementById('vht-mu-txbf').checked = profile['high-throughput']['vht-mu-txbf'];
			else document.getElementById('vht-mu-txbf').checked = true;
			if (profile['high-throughput'].hasOwnProperty('vht-txbf-explicit')) document.getElementById('vht-txbf-explicit').checked = profile['high-throughput']['vht-txbf-explicit'];
			else document.getElementById('vht-txbf-explicit').checked = true;
			
			document.getElementById('high-efficiency').checked = profile['high-efficiency']['enable'];
			changeWifi6(profile['high-efficiency']['enable']);
			if (profile['high-efficiency'].hasOwnProperty('txbf')) document.getElementById('he-txbf').checked = profile['high-efficiency']['txbf'];
			else document.getElementById('he-txbf').checked = true;
			if (profile['high-efficiency'].hasOwnProperty('mu-mimo')) document.getElementById('he-mu-mimo').checked = profile['high-efficiency']['mu-mimo'];
			else document.getElementById('he-mu-mimo').checked = true;
			if (profile['high-efficiency'].hasOwnProperty('ul-mu-mimo')) document.getElementById('he-ul-mu-mimo').checked = profile['high-efficiency']['ul-mu-mimo'];
			else document.getElementById('he-ul-mu-mimo').checked = false;
			if (profile['high-efficiency'].hasOwnProperty('mu-ofdma')) document.getElementById('he-mu-ofdma').checked = profile['high-efficiency']['mu-ofdma'];
			else document.getElementById('he-mu-ofdma').checked = true;
			if (profile['high-efficiency'].hasOwnProperty('individual-twt')) document.getElementById('individual-twt').checked = profile['high-efficiency']['individual-twt'];
			else document.getElementById('individual-twt').checked = true;
			
			document.getElementById('extremely-high-throughput').checked = profile['extremely-high-throughput']['enable'];
			changeWifi7(profile['extremely-high-throughput']['enable']);
			if (profile['extremely-high-throughput'].hasOwnProperty('beacon-protection')) document.getElementById('beacon-protection').checked = profile['extremely-high-throughput']['beacon-protection'];
			else document.getElementById('beacon-protection').checked = false;
			if (profile['extremely-high-throughput'].hasOwnProperty('mlo')) document.getElementById('mlo').checked = profile['extremely-high-throughput']['mlo'];
			else document.getElementById('mlo').checked = false;
			if (profile['extremely-high-throughput'].hasOwnProperty('sae-sub-mode')) subModeSelector.setChoiceByValue(profile['extremely-high-throughput']['sae-sub-mode']);
			else subModeSelector.setChoiceByValue('MIX_MODE');
			
			if (profile.hasOwnProperty('client-isolation')) document.getElementById('client-isolation').checked = profile['client-isolation'];
			else document.getElementById('client-isolation').checked = false;
			if (profile.hasOwnProperty('mfp-required')) document.getElementById('mfp-required').checked = profile['mfp-required'];
			else document.getElementById('mfp-required').checked = false;
			if (profile.hasOwnProperty('mfp-capable')) document.getElementById('mfp-capable').checked = profile['mfp-capable'];
			else document.getElementById('mfp-capable').checked = false;
			if (profile.hasOwnProperty('mfp-association-comeback-time')) document.getElementById('mfp-association-comeback-time').value = profile['mfp-association-comeback-time'];
			else document.getElementById('mfp-association-comeback-time').value = 5;
			if (profile.hasOwnProperty('denylist-sco-attack')) document.getElementById('denylist-sco-attack').checked = profile['denylist-sco-attack'];
			else document.getElementById('denylist-sco-attack').checked = false;
			if (profile.hasOwnProperty('gw-spoofing-protection-customize')) gwSpoofingSelector.setChoiceByValue(profile['gw-spoofing-protection-customize']);
			else gwSpoofingSelector.setChoiceByValue('ON');
			if (profile['opmode'].includes('WPA3') || profile['opmode'].includes('ENHANCED_OPEN')) {
				if (profile.hasOwnProperty('wpa3-transition-mode-enable')) document.getElementById('wpa3-transition-mode-enable').checked = profile['wpa3-transition-mode-enable'];
				else document.getElementById('wpa3-transition-mode-enable').checked = true;
				changeWPA3Transition(true);
			} else {
				changeWPA3Transition(false);
			}
			
			if (profile.hasOwnProperty('dot11r')) document.getElementById('dot11r').checked = profile['dot11r'];
			else document.getElementById('dot11r').checked = false;
			change11r(document.getElementById('dot11r').checked);
			if (profile.hasOwnProperty('mobility-domain-id')) document.getElementById('mobility-domain-id').value = profile['mobility-domain-id'];
			else document.getElementById('mobility-domain-id').value = 1;
			if (profile.hasOwnProperty('auth-failure-code')) authFailureSelector.setChoiceByValue(profile['auth-failure-code']);
			else authFailureSelector.setChoiceByValue('DYNAMIC');
			if (profile.hasOwnProperty('dot11r-key-duration')) document.getElementById('dot11r-key-duration').value = profile['dot11r-key-duration'];
			else document.getElementById('dot11r-key-duration').value = 3600;
			if (profile.hasOwnProperty('dot11r-ondemand-keyfetch')) document.getElementById('dot11r-ondemand-keyfetch').checked = profile['dot11r-ondemand-keyfetch'];
			else document.getElementById('dot11r-ondemand-keyfetch').checked = true;
			
			if (profile['forward-mode'] === 'FORWARD_MODE_BRIDGE') {
				changeAuthSurv(true);
				if (profile.hasOwnProperty('auth-survivability')) document.getElementById('auth-survivability').checked = profile['auth-survivability'];
				else document.getElementById('auth-survivability').checked = false;
				changeAuthSurvPriority(document.getElementById('auth-survivability').checked);
				if (profile.hasOwnProperty('priority-use-local-cache')) document.getElementById('priority-use-local-cache').checked = profile['priority-use-local-cache'];
				else document.getElementById('priority-use-local-cache').checked = false;
			} else {
				changeAuthSurv(false);
			}
			
			/*if (profile['mac-authentication']) document.getElementById('mac-authentication').checked = profile['mac-authentication'];
			else document.getElementById('mac-authentication').checked = false;
			changeMacAuth(document.getElementById('mac-authentication').checked);*/
			if (profile.hasOwnProperty('mac-authentication-delimiter')) macAuthDelimiterSelector.setChoiceByValue(profile['mac-authentication-delimiter']);
			else macAuthDelimiterSelector.setChoiceByValue('NONE');
			if (profile.hasOwnProperty('mac-authentication-upper-case')) document.getElementById('mac-authentication-upper-case').checked = profile['mac-authentication-upper-case'];
			else document.getElementById('mac-authentication-upper-case').checked = false;
			
			/*if (profile['auth-server-group'] || profile['primary-auth-server']) changeAuth(true);
			else changeAuth(false);*/
			if (profile.hasOwnProperty('called-station-id') && profile['called-station-id'].hasOwnProperty('mac-address-delimiter')) authDelimiterSelector.setChoiceByValue(profile['called-station-id']['mac-address-delimiter']);
			else authDelimiterSelector.setChoiceByValue('NONE');
			if (profile.hasOwnProperty('called-station-id') && profile['called-station-id'].hasOwnProperty('upper-case')) document.getElementById('auth-pkt-upper-case').checked = profile['called-station-id']['upper-case'];
			else document.getElementById('auth-pkt-upper-case').checked = false;
			
			editingProfile = profileName;
			new bootstrap.Modal(document.getElementById('UIModal')).show();
		}
	});
	
}

function closeEditUI() {
	(bootstrap.Modal.getInstance(document.getElementById('UIModal')) || new bootstrap.Modal(document.getElementById('UIModal'))).hide();
}

function updateUIProfile() {
	// Update config based on UI knobs
	if (document.getElementById('description').value !== '') editingConfig['description'] = document.getElementById('description').value;
	else delete editingConfig['description']
	
	if (validateUIForm()) {
		showNotification('ca-wifi', 'The profile contains invalid values. Please correct the values.' , 'bottom', 'center', 'warning');
		return;
	}
	editingConfig['enable'] = document.getElementById('enabledCheckbox').checked;
	editingConfig['disable-on-6ghz-mesh'] = document.getElementById('disable-on-6ghz-mesh').checked;
	editingConfig['dtim-period'] = parseInt(document.getElementById('dtim-period').value);
	editingConfig['rf-band'] = bandSelector.getValue(true);
	var rfBand = bandSelector.getValue(true);
	if (rfBand.includes('5GHZ') || rfBand.includes('ALL')) editingConfig['allowed-5ghz-radio'] = dual5Selector.getValue(true);
	if (rfBand.includes('6GHZ') || rfBand.includes('ALL')) editingConfig['allowed-6ghz-radio'] = dual6Selector.getValue(true);
	editingConfig['g-legacy-rates']['basic-rates'] = gBasicSelector.getValue(true);
	editingConfig['g-legacy-rates']['tx-rates'] = gTxSelector.getValue(true);
	editingConfig['a-legacy-rates']['basic-rates'] = aBasicSelector.getValue(true);
	editingConfig['a-legacy-rates']['tx-rates'] = aTxSelector.getValue(true);
	
	editingConfig['cdc'] = document.getElementById('cdc').checked;
	editingConfig['mbo'] = document.getElementById('mbo').checked;
	
	editingConfig['inactivity-timeout'] = parseInt(document.getElementById('inactivity-timeout').value);
	editingConfig['explicit-ageout-client'] = document.getElementById('explicit-ageout-client').checked;
	editingConfig['pmk-cache-delete-on-leave'] = document.getElementById('pmk-cache-delete-on-leave').checked;
	
	editingConfig['qbss-load'] = document.getElementById('qbss-load').checked;
	editingConfig['rrm-quiet-ie'] = document.getElementById('rrm-quiet-ie').checked;
	
	if (!editingConfig['wmm-cfg']) editingConfig['wmm-cfg'] = {};
	editingConfig['wmm-cfg']['uapsd'] = document.getElementById('uapsd').checked;
	editingConfig['wmm-cfg']['tspec'] = document.getElementById('tspec').checked;
	if (document.getElementById('tspec').checked) editingConfig['wmm-cfg']['tspec-bandwidth'] = parseInt(document.getElementById('tspec-bandwidth').value);
	
	editingConfig['high-throughput']['enable'] = document.getElementById('high-throughput').checked;
	if (document.getElementById('high-throughput').checked) {
		editingConfig['high-throughput']['ba-amsdu'] = document.getElementById('ba-amsdu').checked;
		editingConfig['high-throughput']['rx-ampdu-agg'] = document.getElementById('rx-ampdu-agg').checked;
		editingConfig['high-throughput']['mpdu-agg'] = document.getElementById('mpdu-agg').checked;
		editingConfig['high-throughput']['ldpc'] = document.getElementById('ldpc').checked;
	}
	
	editingConfig['high-throughput']['very-high-throughput'] = document.getElementById('very-high-throughput').checked;
	if (document.getElementById('very-high-throughput').checked) {
		editingConfig['high-throughput']['vht-mu-txbf'] = document.getElementById('vht-mu-txbf').checked;
		editingConfig['high-throughput']['vht-txbf-explicit'] = document.getElementById('vht-txbf-explicit').checked;
	}
	
	editingConfig['high-efficiency']['enable'] = document.getElementById('high-efficiency').checked;
	if (document.getElementById('high-efficiency').checked) {
		editingConfig['high-efficiency']['txbf'] = document.getElementById('he-txbf').checked;
		editingConfig['high-efficiency']['mu-mimo'] = document.getElementById('he-mu-mimo').checked;
		editingConfig['high-efficiency']['ul-mu-mimo'] = document.getElementById('he-ul-mu-mimo').checked;
		editingConfig['high-efficiency']['mu-ofdma'] = document.getElementById('he-mu-ofdma').checked;
		editingConfig['high-efficiency']['individual-twt'] = document.getElementById('individual-twt').checked;
	}
	
	editingConfig['extremely-high-throughput']['enable'] = document.getElementById('extremely-high-throughput').checked;
	if (document.getElementById('extremely-high-throughput').checked) {
		editingConfig['extremely-high-throughput']['beacon-protection'] = document.getElementById('beacon-protection').checked;
		editingConfig['extremely-high-throughput']['mlo'] = document.getElementById('mlo').checked;
		editingConfig['extremely-high-throughput']['sae-sub-mode'] = subModeSelector.getValue(true);
	}
	
	editingConfig['client-isolation'] = document.getElementById('client-isolation').checked;
	editingConfig['mfp-required'] = document.getElementById('mfp-required').checked;
	editingConfig['mfp-capable'] = document.getElementById('mfp-capable').checked;
	editingConfig['mfp-association-comeback-time'] = parseInt(document.getElementById('mfp-association-comeback-time').value);
	editingConfig['denylist-sco-attack'] = document.getElementById('denylist-sco-attack').checked;
	editingConfig['gw-spoofing-protection-customize'] = gwSpoofingSelector.getValue(true);
	if (editingConfig['gw-spoofing-protection-customize'] === 'ON') delete editingConfig['gw-spoofing-protection-customize'];
	if (editingConfig['opmode'].includes('WPA3') || editingConfig['opmode'].includes('ENHANCED_OPEN')) {
		editingConfig['wpa3-transition-mode-enable'] = document.getElementById('wpa3-transition-mode-enable').checked;
	}
	
	editingConfig['dot11r'] = document.getElementById('dot11r').checked;
	if (document.getElementById('dot11r').checked) {
		editingConfig['mobility-domain-id'] = parseInt(document.getElementById('mobility-domain-id').value);
		editingConfig['auth-failure-code'] = authFailureSelector.getValue(true);
		editingConfig['dot11r-key-duration'] = parseInt(document.getElementById('dot11r-key-duration').value);
		editingConfig['dot11r-ondemand-keyfetch'] = document.getElementById('dot11r-ondemand-keyfetch').checked;
	} else {
		// Reset values back to defaults
		delete editingConfig['auth-failure-code'];
		delete editingConfig['dot11r-ondemand-keyfetch'];
	}
	
	if (editingConfig['auth-survivability']) editingConfig['auth-survivability'] = document.getElementById('auth-survivability').checked;
	if (document.getElementById('auth-survivability').checked) {
		editingConfig['priority-use-local-cache'] = document.getElementById('priority-use-local-cache').checked;
	} else {
		if (editingConfig['priority-use-local-cache']) delete editingConfig['priority-use-local-cache'];
	}
	
	editingConfig['mac-authentication-delimiter'] = macAuthDelimiterSelector.getValue(true);
	if (editingConfig['mac-authentication-delimiter'] === 'NONE') delete editingConfig['mac-authentication-delimiter'];
	editingConfig['mac-authentication-upper-case'] = document.getElementById('mac-authentication-upper-case').checked;
	if (!editingConfig['called-station-id']) editingConfig['called-station-id'] = {};
	editingConfig['called-station-id']['mac-address-delimiter'] = authDelimiterSelector.getValue(true);
	if (editingConfig['called-station-id']['mac-address-delimiter'] === 'NONE') delete editingConfig['called-station-id']['mac-address-delimiter'];
	editingConfig['called-station-id']['upper-case'] = document.getElementById('auth-pkt-upper-case').checked;
	
	// Save back to Central
	logStart('Updating WLAN Profile: '+editingProfile);
	authenticateWithCentral().then(function() {
		if (saveNotification) saveNotification.close();
		saveNotification = showNotification('ca-wifi', 'Saving Profile: "'+editingProfile+'"...' , 'bottom', 'center', 'info');

		var command = profileEndpoint + '/' + editingProfile;
		if (editingType === 'LOCAL') command = profileEndpoint + '/' + editingProfile + '?object_type=LOCAL&scope_id='+editingScope+'&persona='+editingPersona;

		fetchProxyWithAuth('/tools/putCommandwHeaders', {
			url: localStorage.getItem('base_url') + command,
			access_token: localStorage.getItem('access_token'),
			data: JSON.stringify(editingConfig),
		})
		.then(function(commandResults) {
			var result = processStatus(commandResults);
			if (result == 429 || result == 409) {
				if (saveNotification) {
					saveNotification.update({ type: 'danger', message: 'Unable to save WLAN: "'+editingProfile+'". API Rate Limit hit. Please try again.' });
					setTimeout(saveNotification.close, 2000);
				}
			} else if (result == 400) {
				logError('Unable to update WLAN profile: '+editingProfile);
				if (saveNotification) {
					message = JSON.parse(commandResults['responseBody']);
					saveNotification.update({ type: 'warning', message: 'Unable to save WLAN: "'+ editingProfile+'"<br> '+ message['message'] });
					setTimeout(saveNotification.close, 10000);
				}
			} else if (result !== 200) {
				if (saveNotification) {
					message = JSON.parse(commandResults['responseBody']);
					saveNotification.update({ type: 'warning', message: 'Unable to save WLAN: "'+ editingProfile+'"<br> '+ message['message'] });
					setTimeout(saveNotification.close, 10000);
				}
				logError('Unable to update WLAN profile: '+editingProfile);
			} else {
				logInformation('WLAN profile: ' + editingProfile + ' was updated successfully');
				if (saveNotification) {
					saveNotification.update({ type: 'success', message: 'WLAN profile was updated' });
					setTimeout(saveNotification.close, 1000);
				}
				(bootstrap.Modal.getInstance(document.getElementById('UIModal')) || new bootstrap.Modal(document.getElementById('UIModal'))).hide();
				refreshProfilesForHierarchy();
			}
		});
	});
}

function bandChange(band) {
	let five = false;
	let six = false;
	if (band.includes('5GHZ') || band === "BAND_ALL") five = true;
	let dual5 = document.getElementById("dual5");
	if (five) dual5.style.display = "block";
	else dual5.style.display = "none";
	
	if (band.includes('6GHZ') || band === "BAND_ALL") six = true;
	let dual6 = document.getElementById("dual6");
	if (six) dual6.style.display = "block";
	else dual6.style.display = "none";
}

function changeTSPEC(state) {
	var tspec = document.getElementById("tspecKnobs");
	if (state) tspec.style.display = "block";
	else tspec.style.display = "none";
}

function change11r(state) {
	let dot11r = document.getElementById("dot11rKnobs");
	if (state) dot11r.style.display = "block";
	else dot11r.style.display = "none";
}

function changeWifi4(state) {
	let wifi4 = document.getElementById("wifi4Knobs");
	if (state) wifi4.style.display = "block";
	else wifi4.style.display = "none";
}

function changeWifi5(state) {
	let wifi5 = document.getElementById("wifi5Knobs");
	if (state) wifi5.style.display = "block";
	else wifi5.style.display = "none";
}

function changeWifi6(state) {
	let wifi6 = document.getElementById("wifi6Knobs");
	if (state) wifi6.style.display = "block";
	else wifi6.style.display = "none";
}

function changeWifi7(state) {
	let wifi7 = document.getElementById("wifi7Knobs");
	if (state) wifi7.style.display = "block";
	else wifi7.style.display = "none";
}

function changeMacAuth(state) {
	let macAuth = document.getElementById("macAuthKnobs");
	if (state) macAuth.style.display = "block";
	else macAuth.style.display = "none";
}

function changeAuth(state) {
	let auth = document.getElementById("authKnobs");
	if (state) auth.style.display = "block";
	else auth.style.display = "none";
}

function changeAuthSurv(state) {
	let authsurv = document.getElementById("authSurvKnobs");
	if (state) authsurv.style.display = "block";
	else authsurv.style.display = "none";
}

function changeAuthSurvPriority(state) {
	let authsurv = document.getElementById("authSurvPriorityKnobs");
	if (state) authsurv.style.display = "block";
	else authsurv.style.display = "none";
}

function changeWPA3Transition(state) {
	let wpa3transition = document.getElementById("wpa3TransitionKnobs");
	if (state) wpa3transition.style.display = "block";
	else wpa3transition.style.display = "none";
}

function validateUIField(field) {
	if (field.type === 'number') {
		if (!field.value) field.value = field.placeholder;
		
		if ((parseInt(field.value) >= parseInt(field.min)) && (parseInt(field.value) <= parseInt(field.max))) field.classList.remove("is-invalid");
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
	if (profileSelector.getValue(true).length == 0) {
		showNotification('ca-folder-settings', 'Please choose one or more WLANS to assign profiles', 'bottom', 'center', 'warning');
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

// Verify the input (profile list,etc) is valid
function verifyUnassign() {
	if (profileSelector.getValue(true).length == 0) {
		showNotification('ca-folder-settings', 'Please choose one or more WLANS to unassign profiles', 'bottom', 'center', 'warning');
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
		profileSelected.forEach(function(wlan) {
			if (profile.ssid === wlan.toString()) {
				profileList.push(profile);
			}
		});
	});
	
	// call generic assign workflow
	if (isAssigning) assignConfirmed(profileList, profileType, profileName, profileUniqueLeaf,singleInstance);
	else unassignConfirmed(profileList, profileType, profileName, profileUniqueLeaf);
}