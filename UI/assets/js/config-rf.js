/*
Central Automation v2.x
Last Updated 2.0.0
Aaron Scott (WiFi Downunder) 2025-2026
*/

var profileNotification;
var saveNotification;
var profiles = [];
var editingProfile= '';
var editingConfig = {};
var editingScope = '';
var editingPersona = '';
var editingType = 'SHARED';

var operationModeSelector;
var dynamicAntSelector;
var antDirectionSelector;
var operationModeSelector;
var widsOverrideSelector;
var sixBasicSelector;
var sixTxSelector;
var sixBeaconSelector;
var fiveFBMSelector;
var sixFBMSelector;

var profileSelector;
const profileName = 'RF'
const profileUniqueLeaf = 'name'
const profileType = 'radios';
const singleInstance = true;


var deletePromise;
var deleteResolve;
var deleteReject;

var profileEndpoint = '/network-config/v1/radios';
var uiURL = '/gravity/monitoring/config/profiles/radios';
var selectedHierarchyLevel = 'library';
var selectedScopeId = '';

function populateChoices() {
	
	var dynamicAntElement = document.getElementById('dynamic-ant');
	if (dynamicAntElement) {
			dynamicAntSelector = new Choices(dynamicAntElement, {
			searchEnabled: false,
			shouldSort: false,
			itemSelectText: ""
		});
		var dynamicAntChoices = [];
		dynamicAntChoices.push({ value: 'WIDE', label: 'Wide' });
		dynamicAntChoices.push({ value: 'NARROW', label: 'Narrow' });
		dynamicAntSelector.clearChoices();
		dynamicAntSelector.setChoices(dynamicAntChoices);
		dynamicAntSelector.setChoiceByValue('WIDE');
	}
	
	var antDirectionElement = document.getElementById('ant-direction-mode');
	if (antDirectionElement) {
			antDirectionSelector = new Choices(antDirectionElement, {
			searchEnabled: false,
			shouldSort: false,
			itemSelectText: ""
		});
		var antDirectionChoices = [];
		antDirectionChoices.push({ value: 'ANT_OMNI', label: 'Omni-Directional' });
		antDirectionChoices.push({ value: 'ANT_DIRECTIONAL', label: 'Directional' });
		antDirectionSelector.clearChoices();
		antDirectionSelector.setChoices(antDirectionChoices);
		antDirectionSelector.setChoiceByValue('ANT_OMNI');
	}
	
	var operationModeElement = document.getElementById('six_afc-mode');
	if (operationModeElement) {
			operationModeSelector = new Choices(operationModeElement, {
			searchEnabled: false,
			shouldSort: false,
			itemSelectText: ""
		});
		var opmodeChoices = [];
		opmodeChoices.push({ value: 'HYBRID', label: 'Hybrid' });
		opmodeChoices.push({ value: 'LPI', label: 'Low Power Indoor' });
		opmodeChoices.push({ value: 'SP', label: 'Standard Power' });
		operationModeSelector.clearChoices();
		operationModeSelector.setChoices(opmodeChoices);
		operationModeSelector.setChoiceByValue('LPI');
	}
	
	var widsOverrideElement = document.getElementById('six_arm-wids-override');
	if (widsOverrideElement) {
			widsOverrideSelector = new Choices(widsOverrideElement, {
			searchEnabled: false,
			shouldSort: false,
			itemSelectText: ""
		});
		var overrideChoices = [];
		overrideChoices.push({ value: 'DYNAMIC', label: 'Dynamic' });
		overrideChoices.push({ value: 'OFF', label: 'Off' });
		overrideChoices.push({ value: 'ON', label: 'On' });
		widsOverrideSelector.clearChoices();
		widsOverrideSelector.setChoices(overrideChoices);
		widsOverrideSelector.setChoiceByValue('DYNAMIC');
	}
	
	var fbm5Element = document.getElementById('five_frame-bursting-mode');
	if (fbm5Element) {
			fiveFBMSelector = new Choices(fbm5Element, {
			searchEnabled: false,
			shouldSort: false,
			itemSelectText: ""
		});
		var overrideChoices = [];
		overrideChoices.push({ value: 'DYNAMIC', label: 'Dynamic' });
		overrideChoices.push({ value: 'OFF', label: 'Off' });
		overrideChoices.push({ value: 'ON', label: 'On' });
		fiveFBMSelector.clearChoices();
		fiveFBMSelector.setChoices(overrideChoices);
		fiveFBMSelector.setChoiceByValue('DYNAMIC');
	}
	
	var fbm6Element = document.getElementById('six_frame-bursting-mode');
	if (fbm6Element) {
			sixFBMSelector = new Choices(fbm6Element, {
			searchEnabled: false,
			shouldSort: false,
			itemSelectText: ""
		});
		var overrideChoices = [];
		overrideChoices.push({ value: 'DYNAMIC', label: 'Dynamic' });
		overrideChoices.push({ value: 'OFF', label: 'Off' });
		overrideChoices.push({ value: 'ON', label: 'On' });
		sixFBMSelector.clearChoices();
		sixFBMSelector.setChoices(overrideChoices);
		sixFBMSelector.setChoiceByValue('DYNAMIC');
	}
	
	var datarates6 = [];
	datarates6.push({ value: 'RATE_6MB', label: '6' });
	datarates6.push({ value: 'RATE_9MB', label: '9' });
	datarates6.push({ value: 'RATE_12MB', label: '12' });
	datarates6.push({ value: 'RATE_18MB', label: '18' });
	datarates6.push({ value: 'RATE_24MB', label: '24' });
	datarates6.push({ value: 'RATE_36MB', label: '36' });
	datarates6.push({ value: 'RATE_48MB', label: '48' });
	datarates6.push({ value: 'RATE_54MB', label: '54' });
	var basic6Element = document.getElementById('six_basic-rates');
	if (basic6Element) {
			sixBasicSelector = new Choices(basic6Element, {
			searchEnabled: false,
			shouldSort: false,
			shouldSortItems: true,
			itemSelectText: "",
			removeItemButton:true
		});
		sixBasicSelector.clearChoices();
		sixBasicSelector.setChoices(datarates6);
	}
	var transmit6Element = document.getElementById('six_transmit-rates');
	if (transmit6Element) {
			sixTxSelector = new Choices(transmit6Element, {
			searchEnabled: false,
			shouldSort: false,
			shouldSortItems: true,
			itemSelectText: "",
			removeItemButton:true
		});
		sixTxSelector.clearChoices();
		sixTxSelector.setChoices(datarates6);
	}
	
	var beacon6Element = document.getElementById('six_beacon-rate');
	if (beacon6Element) {
			sixBeaconSelector = new Choices(beacon6Element, {
			searchEnabled: false,
			shouldSort: false,
			shouldSortItems: true,
			itemSelectText: "",
			removeItemButton:true
		});
		sixBeaconSelector.clearChoices();
		sixBeaconSelector.setChoices(datarates6);
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
	})
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
	profileNotification = showNotification('ca-antenna', 'Obtaining profiles...', 'bottom', 'center', 'info');
	
	var command = profileEndpoint + '?detailed=true';
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
		var result = processStatus(commandResults);
		// will return the status code to trigger next step
		if (result == 429 || result == 409) {
			setTimeout(getProfiles, apiWaitDelay, offset);
		} else if (result !== 200) {
			if (profileNotification) {
				profileNotification.update({ type: 'danger', message: 'Failed to retrieve RF profiles' });
				setTimeout(profileNotification.close, 2000);
			}
		} else {
			var response = JSON.parse(commandResults.responseBody);
			if (response['profile']) profiles = profiles.concat(response['profile']);
			offset = response.offset;
			if (offset) {
				var getProgress = ((profiles.length) / response.total) * 100;
				profileNotification.update({ progress: getProgress });
				getProfiles(offset,scope);
			} else {
				if (profileNotification) {
					profileNotification.update({ progress: 100, type: 'success', message: 'Retrieved RF Profiles' });
					setTimeout(profileNotification.close, 1000);
				}
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
			actionBtns += '<a class="btn btn-link btn-warning mt-2" data-bs-toggle="tooltip" data-bs-placement="top" data-container="body" data-animation="true" title="Edit Profile" onclick="loadEditUI(\'' + profileName + '\')"><i class="fa-solid fa-pencil" style="color: #67748e; font-size:18px;"></i></a> ';
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
		
		let icon = '<i class="fa-regular fa-thumbtack-angle"></i> ';
		if (profile['@'] && profile['@']['aruba-annotation:object_type']) {
			if (profile['@']['aruba-annotation:object_type'] === "SHARED") icon = '<i class="fa-regular fa-share-nodes"></i> ';
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
		
		// Profile specific info
		let twoGHz = [];
		let fiveGHz = [];
		let sixGHz = []
		profile['radio'].forEach(function(radio) {
			if (radio['profile'].includes('RADIO_2DOT4G')) {
				if (radio['enable']) {
					if (radio['mode'] === 'ACCESS') {
						twoGHz.push('<strong>Mode: </strong>' + titleCase(radio['mode']));
						twoGHz.push('<strong>Tx Power (dBm): </strong>' + radio['arm-control']['min-tx-power'] + ' - ' + radio['arm-control']['max-tx-power']);
						let bandwidth = '<strong>Channel Bandwidth: </strong>' + radio['arm-control']['min-channel-bandwidth'] + ' - ' + radio['arm-control']['max-channel-bandwidth'];
						if (radio['arm-control']['min-channel-bandwidth'] === radio['arm-control']['max-channel-bandwidth']) bandwidth = '<strong>Channel Bandwidth: </strong>' + radio['arm-control']['min-channel-bandwidth'];
						twoGHz.push(bandwidth.replaceAll('BW_', '').replaceAll('MHZ', 'MHz'));
						twoGHz.push('<strong>Channels: </strong>'+ radio['arm-control']['channels-for-2dot4GHz'].join(', ').replaceAll('CHAN_', ''))
					} else {
						twoGHz.push('<strong>Mode: </strong>' + titleCase(radio['mode']));
					}
				} else {
					twoGHz.push('<strong>Mode: </strong>' + 'Disabled');
				}
				
			} else if (radio['profile'].includes('RADIO_5G')) {
				if (radio['enable']) {
					if (radio['mode'] === 'ACCESS') {
						fiveGHz.push('<strong>Mode: </strong>' + titleCase(radio['mode']));
						fiveGHz.push('<strong>Tx Power (dBm): </strong>' + radio['arm-control']['min-tx-power'] + ' - ' + radio['arm-control']['max-tx-power']);
						let bandwidth = '<strong>Channel Bandwidth: </strong>' + radio['arm-control']['min-channel-bandwidth'] + ' - ' + radio['arm-control']['max-channel-bandwidth'];
						if (radio['arm-control']['min-channel-bandwidth'] === radio['arm-control']['max-channel-bandwidth']) bandwidth = '<strong>Channel Bandwidth: </strong>' + radio['arm-control']['min-channel-bandwidth'];
						fiveGHz.push(bandwidth.replaceAll('BW_', '').replaceAll('MHZ', 'MHz'));
						fiveGHz.push('<strong>Channels: </strong>'+ radio['arm-control']['channels-for-5GHz'].join(', ').replaceAll('CHAN_', ''));
					} else {
						fiveGHz.push('<strong>Mode: </strong>' + titleCase(radio['mode']));
					}
				} else {
					fiveGHz.push('<strong>Mode: </strong>' + 'Disabled');
				}
			} else if (radio['profile'].includes('RADIO_6G')) {
				if (radio['enable']) {
					if (radio['mode'] === 'ACCESS') {
						sixGHz.push('<strong>Mode: </strong>' + titleCase(radio['mode']));
						sixGHz.push('<strong>Tx Power (dBm): </strong>' + radio['arm-control']['min-tx-power'] + ' - ' + radio['arm-control']['max-tx-power']);
						let bandwidth = '<strong>Channel Bandwidth: </strong>' + radio['arm-control']['min-channel-bandwidth'] + ' - ' + radio['arm-control']['max-channel-bandwidth'];
						if (radio['arm-control']['min-channel-bandwidth'] === radio['arm-control']['max-channel-bandwidth']) bandwidth = '<strong>Channel Bandwidth: </strong>' + radio['arm-control']['min-channel-bandwidth'];
						sixGHz.push(bandwidth.replaceAll('BW_', '').replaceAll('MHZ', 'MHz'));
						sixGHz.push('<strong>Channels: </strong>'+ radio['arm-control']['channels-for-6GHz'].join(', ').replaceAll('CHAN_', '').replaceAll('_6GHZ', ''));
						
					} else {
						sixGHz.push('<strong>Mode: </strong>' + titleCase(radio['mode']));
					}
				} else {
					sixGHz.push('<strong>Mode: </strong>' + 'Disabled');
				}
			}
		});
		
		
		let externalAntennas = [];
		if (profile['enable-external-antennas']) {
			if (profile['antenna-type'] === 'CUSTOM') {
				profile['device'].forEach(function(d) {
					if (d['radio-type'].includes('2DOT4G')) externalAntennas.push('<strong>2.4GHz: </strong>' + d['effective-gain'] + 'dBi');
					else if (d['radio-type'].includes('RADIO_5G')) externalAntennas.push('<strong>5GHz: </strong>' + d['effective-gain'] + 'dBi');
					else if (d['radio-type'].includes('RADIO_6G')) externalAntennas.push('<strong>6GHz: </strong>' + d['effective-gain'] + 'dBi');
				});
			} else {
				externalAntennas.push(profile['antenna-type']);
			}
		} else {
			externalAntennas.push('Disabled');
		}
		
		if (scopeDescriptions.length == 1 && scopeDescriptions[0] === '-') {
			actionBtns += '<a class="btn btn-link btn-warning mt-2" data-bs-toggle="tooltip" data-bs-placement="top" data-container="body" data-animation="true" title="Delete WLAN" onclick="deleteProfile(\'' + profileName + '\')"><i class="fa-solid fa-trash-can" style="color: #67748e; font-size:18px;"></i></a> ';
		}
		
		// Add row to table
		table.row.add([icon, '<a href="' + centralURL + '" target="_blank"><strong>' + profileName + '</strong></a><br />'+description, twoGHz.join('<br>'), fiveGHz.join('<br>'), sixGHz.join('<br>'), externalAntennas.join('<br>'), scopeDescriptions.join('<br>'), actionBtns]);
	});
	$('#profiles-table').DataTable().rows().draw();
	initializeTooltips(document.getElementById('profiles-table'));
}

/*  -------------------------------------------------------------------------------------------------------------------------------------------------------------------------
	Deleting Profiles
------------------------------------------------------------------------------------------------------------------------------------------------------------------------- */

function deleteProfile(profileName) {
	profiles.forEach(function(p) {
		let profile = { ...p };
		var cleanProfile = profile['name'].replace(/^ /, "&nbsp");
		if (cleanProfile === profileName) {
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
					deleteProfileConfirmed(profileName);
				}
			});
		}
	});
	
}

function deleteProfileConfirmed(profileName) {
	authenticateWithCentral().then(function() {
		logStart('Deleting RF profile: '+ profileName);
		deleteRF(profileName);
	});
}

function deleteRF(profileName) {
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
			setTimeout(deleteRF, apiWaitDelay, profileName);
		} else if (result !== 200) {
			logError('Unable to delete '+ profileName);
			showNotification('ca-bin', 'Unable to delete profile', 'bottom', 'center', 'danger');
			if (deleteReject) deleteReject();
		} else {
			logInformation(profileName + ' was deleted');
			showNotification('ca-bin', profileName+' was successfully deleted', 'bottom', 'center', 'success');
			deleteResolve();
		}
		updateInformation();
		logEnd('Profile deletion complete');
	}).catch(function(err) {
		logError('Failed to delete '+profileName);
		if (deleteReject) deleteReject();
	});
	return deletePromise;
}


/*  -------------------------------------------------------------------------------------------------------------------------------------------------------------------------
	Loading Profiles UI
------------------------------------------------------------------------------------------------------------------------------------------------------------------------- */

function loadJSONUI(profileName) {
	var config = '';
	profiles.forEach(function(p) {
		var profile = { ...p };
		var cleanProfile = profile['name'].replace(/^ /, "&nbsp");
		if (cleanProfile === profileName) {
			
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
			document.getElementById('json-title').innerHTML = 'Radio Configuration: <strong>'+ cleanProfile + '</strong>'
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
		logStart('Updating RF Profile: '+editingProfile);
		authenticateWithCentral().then(function() {
			if (saveNotification) saveNotification.close();
			saveNotification = showNotification('ca-antenna', 'Saving: "'+editingProfile+'"...' , 'bottom', 'center', 'info');

			var config = document.getElementById('profileConfig').value;

			var command = profileEndpoint + '/' + editingProfile;
			if (editingType === 'LOCAL') command = profileEndpoint+ '/'+editingProfile + '?object_type=LOCAL&scope_id='+editingScope+'&persona='+editingPersona;

			fetchProxyWithAuth('/tools/patchCommandwHeaders', {
				url: localStorage.getItem('base_url') + command,
				access_token: localStorage.getItem('access_token'),
				data: config,
			})
			.then(function(commandResults) {
				var result = processStatus(commandResults);
				if (result == 429 || result == 409) {
					if (saveNotification) {
						saveNotification.update({ type: 'danger', message: 'Unable to save: "'+editingProfile+'". API Rate Limit hit. Please try again.' });
						setTimeout(saveNotification.close, 2000);
					}
				} else if (result == 400) {
					logError('Unable to update RF profile: '+editingProfile);
					if (saveNotification) {
						message = JSON.parse(commandResults['responseBody']);
						saveNotification.update({ type: 'warning', message: 'Unable to save: "'+ editingProfile+'"<br> '+ message['message'] });
						setTimeout(profileNotification.close, 10000);
					}
				} else if (result !== 200) {
					logError('Unable to update RF profile: '+editingProfile);
				} else {
					logInformation('RF profile: ' + editingProfile + ' was updated successfully');
					if (saveNotification) {
						saveNotification.update({ type: 'success', message: 'Profile was updated' });
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
	var config = '';
	profiles.forEach(function(p) {
		if (p['name'] === profileName) {
			var profile = { ...p };
			//console.log(profile)
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
			
			// Load all the settings into the UI
			// load the Current Settings section
			document.getElementById('profileName').value = profile['name'];
			if (profile['description']) document.getElementById('description').value = profile['description'];
			else document.getElementById('description').value = '';
			document.getElementById('installation-type').innerHTML = '<strong>Installation Type: </strong>' + titleCase(profile['installation-type']);
			
			var extAnts = '<i class="fa-solid fa-octagon-xmark"></i>';
			if (profile['enable-external-antennas']) {
				extAnts = '<i class="fa-solid fa-circle-check"></i> ';
				if (profile['antenna-type'] === 'CUSTOM') extAnts += titleCase(profile['antenna-type']);
				else extAnts += profile['antenna-type'];
			}
			document.getElementById('external-antennas').innerHTML = '<strong>External Antennas: </strong>'+extAnts;
			
			profile['radio'].forEach(function(radio) {
				if (radio['profile'].includes('RADIO_2DOT4G')) {
					var state = '<i class="fa-solid fa-octagon-xmark"></i>';
					if (radio['enable']) state = '<i class="fa-solid fa-circle-check"></i>';
					document.getElementById('two-state').innerHTML = '<strong>2.4GHz State: </strong>' + state;
					document.getElementById('two-mode').innerHTML = '<strong>2.4GHz Mode: </strong>' + titleCase(radio['mode']);
				} else if (radio['profile'].includes('RADIO_5G')) {
					var state = '<i class="fa-solid fa-octagon-xmark"></i>';
					if (radio['enable']) state = '<i class="fa-solid fa-circle-check"></i>';
					document.getElementById('five-state').innerHTML = '<strong>5GHz State: </strong>' + state;
					document.getElementById('five-mode').innerHTML = '<strong>5GHz Mode: </strong>' + titleCase(radio['mode']);
				} else if (radio['profile'].includes('RADIO_6G')) {
					var state = '<i class="fa-solid fa-octagon-xmark"></i>';
					if (radio['enable']) state = '<i class="fa-solid fa-circle-check"></i>';
					document.getElementById('six-state').innerHTML = '<strong>6GHz State: </strong>' + state;
					document.getElementById('six-mode').innerHTML = '<strong>6GHz Mode: </strong>' + titleCase(radio['mode']);
				}
			});
			
			// Antenna Column
			
			if (profile['sam-detection']) document.getElementById('sam-detection').checked = profile['sam-detection'];
			else document.getElementById('sam-detection').checked = true;
			dynamicAntSelector.removeActiveItems();
			if (profile['dynamic-ant']) dynamicAntSelector.setChoiceByValue(profile['dynamic-ant']);
			else dynamicAntSelector.setChoiceByValue('WIDE');
			antDirectionSelector.removeActiveItems();
			if (profile['ant-direction-mode']) antDirectionSelector.setChoiceByValue(profile['ant-direction-mode']);
			else antDirectionSelector.setChoiceByValue('ANT_OMNI');
			
			// Radio Columns
			profile['radio'].forEach(function(radio) {
				if (radio['profile'].includes('RADIO_2DOT4G')) {
					// 2.4GHz Column
					// General
					if (radio.hasOwnProperty('intolerance-40MHz')) document.getElementById('two_intolerance-40MHz').checked = radio['intolerance-40MHz'];
					else document.getElementById('two_intolerance-40MHz').checked = false;
					if (radio.hasOwnProperty('honor-40MHz-intolerance')) document.getElementById('two_honor-40MHz-intolerance').checked = radio['honor-40MHz-intolerance'];
					else document.getElementById('two_honor-40MHz-intolerance').checked = true;
					if (radio.hasOwnProperty('dot11b-protection')) document.getElementById('two_dot11b-protection').checked = radio['dot11b-protection'];
					else document.getElementById('two_dot11b-protection').checked = true;
					if (radio.hasOwnProperty('ieee802dot11h')) document.getElementById('two_ieee802dot11h').checked = radio['ieee802dot11h'];
					else document.getElementById('two_ieee802dot11h').checked = false;
					if (radio.hasOwnProperty('dpp-configurator-connectivity')) document.getElementById('two_dpp-configurator-connectivity').checked = radio['dpp-configurator-connectivity'];
					else document.getElementById('two_dpp-configurator-connectivity').checked = false;
					if (radio.hasOwnProperty('iot-coexistence')) document.getElementById('two_iot-coexistence').checked = radio['iot-coexistence'];
					else document.getElementById('two_iot-coexistence').checked = false;
					if (radio.hasOwnProperty('legacy-only')) document.getElementById('two_legacy-only').checked = radio['legacy-only'];
					else document.getElementById('two_legacy-only').checked = false;
					if (radio.hasOwnProperty('csd-override')) document.getElementById('two_csd-override').checked = radio['csd-override'];
					else document.getElementById('two_csd-override').checked = false;
					if (radio.hasOwnProperty('channel-switch-announcement-count')) document.getElementById('two_channel-switch-announcement-count').value = radio['channel-switch-announcement-count'];
					else document.getElementById('two_channel-switch-announcement-count').value = 0;
					
					// ARM Control & Scanning
					if (radio['arm-control']) {
						let subProfile = radio['arm-control'];
						if (subProfile.hasOwnProperty('scanning')) document.getElementById('two_scanning').checked = subProfile['scanning'];
						else document.getElementById('two_scanning').checked = true;
						if (subProfile.hasOwnProperty('channel-quality-aware-arm')) document.getElementById('two_channel-quality-aware-arm').checked = subProfile['channel-quality-aware-arm'];
						else document.getElementById('two_channel-quality-aware-arm').checked = true;
						if (subProfile.hasOwnProperty('channel-quality-threshold')) document.getElementById('two_channel-quality-threshold').value = subProfile['channel-quality-threshold'];
						else document.getElementById('two_channel-quality-threshold').value = 70;
						if (subProfile.hasOwnProperty('channel-quality-wait-time')) document.getElementById('two_channel-quality-wait-time').value = subProfile['channel-quality-wait-time'];
						else document.getElementById('two_channel-quality-wait-time').value = 120;
						if (subProfile.hasOwnProperty('high-noise-backoff-time')) document.getElementById('two_high-noise-backoff-time').value = subProfile['high-noise-backoff-time'];
						else document.getElementById('two_high-noise-backoff-time').value = 720;
						if (subProfile.hasOwnProperty('aggressive-scan')) document.getElementById('two_aggressive-scan').checked = subProfile['aggressive-scan'];
						else document.getElementById('two_aggressive-scan').checked = true;
						if (subProfile.hasOwnProperty('ps-aware-scan')) document.getElementById('two_ps-aware-scan').checked = subProfile['ps-aware-scan'];
						else document.getElementById('two_ps-aware-scan').checked = false;
						if (subProfile.hasOwnProperty('rogue-aware-scan')) document.getElementById('two_rogue-aware-scan').checked = subProfile['rogue-aware-scan'];
						else document.getElementById('two_rogue-aware-scan').checked = false;
						if (subProfile.hasOwnProperty('video-aware-scan')) document.getElementById('two_video-aware-scan').checked = subProfile['video-aware-scan'];
						else document.getElementById('two_video-aware-scan').checked = true;
						if (subProfile.hasOwnProperty('voip-aware-scan')) document.getElementById('two_voip-aware-scan').checked = subProfile['voip-aware-scan'];
						else document.getElementById('two_voip-aware-scan').checked = true;
						if (subProfile.hasOwnProperty('scan-interval')) document.getElementById('two_scan-interval').value = subProfile['scan-interval'];
						else document.getElementById('two_scan-interval').value = 720;
					} else {
						document.getElementById('two_channel-quality-aware-arm').checked = true;
						document.getElementById('two_channel-quality-threshold').value = 70;
						document.getElementById('two_channel-quality-wait-time').value = 120;
						document.getElementById('two_high-noise-backoff-time').value = 720;
						document.getElementById('two_aggressive-scan').checked = true;
						document.getElementById('two_ps-aware-scan').checked = false;
						document.getElementById('two_video-aware-scan').checked = true;
						document.getElementById('two_voip-aware-scan').checked = true;
						document.getElementById('two_scan-interval').value = 720;
					}
					
					// Mesh
					if (radio.hasOwnProperty('max-distance')) document.getElementById('two_max-distance').value = radio['max-distance'];
					else document.getElementById('two_max-distance').value = 0;
					
					// Wi-Fi 6
					if (radio['high-efficiency']) {
						let subProfile = radio['high-efficiency']
						if (subProfile.hasOwnProperty('bss-color')) document.getElementById('two_bss-color').value = subProfile['bss-color'];
						else document.getElementById('two_bss-color').value = 0;
						if (subProfile.hasOwnProperty('bss-color-switch-count')) document.getElementById('two_bss-color-switch-count').value = subProfile['bss-color-switch-count'];
						else document.getElementById('two_bss-color-switch-count').value = 10;
					} else {
						document.getElementById('two_bss-color').value = 0;
						document.getElementById('two_bss-color-switch-count').value = 10;
					}
					
					// Wi-Fi 7
					if (radio['extremely-high-throughput']) {
						let subProfile = radio['extremely-high-throughput']
						if (subProfile.hasOwnProperty('mu-mimo')) document.getElementById('two_eht-mu-mimo').checked = subProfile['mu-mimo'];
						else document.getElementById('two_eht-mu-mimo').checked = true;
						if (subProfile.hasOwnProperty('ul-mu-mimo')) document.getElementById('two_eht-ul-mu-mimo').checked = subProfile['ul-mu-mimo'];
						else document.getElementById('two_eht-ul-mu-mimo').checked = false;
						if (subProfile.hasOwnProperty('mu-ofdma')) document.getElementById('two_eht-mu-ofdma').checked = subProfile['mu-ofdma'];
						else document.getElementById('two_eht-mu-ofdma').checked = true;
						if (subProfile.hasOwnProperty('txbf')) document.getElementById('two_eht-txbf').checked = subProfile['txbf'];
						else document.getElementById('two_eht-txbf').checked = true;
					} else {
						document.getElementById('two_eht-mu-mimo').checked = true;
						document.getElementById('two_eht-ul-mu-mimo').checked = false;
						document.getElementById('two_eht-mu-ofdma').checked = true;
						document.getElementById('two_eht-txbf').checked = true;
					}
					
				} else if (radio['profile'].includes('RADIO_5G')) {
					
					// 5GHz Column
					// General
					if (radio.hasOwnProperty('ieee802dot11h')) document.getElementById('five_ieee802dot11h').checked = radio['ieee802dot11h'];
					else document.getElementById('five_ieee802dot11h').checked = false;
					if (radio.hasOwnProperty('dpp-configurator-connectivity')) document.getElementById('five_dpp-configurator-connectivity').checked = radio['dpp-configurator-connectivity'];
					else document.getElementById('five_dpp-configurator-connectivity').checked = false;
					if (radio.hasOwnProperty('ftm-scan-enable')) document.getElementById('five_ftm-scan-enable').checked = radio['ftm-scan-enable'];
					else document.getElementById('five_ftm-scan-enable').checked = false;
					if (radio.hasOwnProperty('legacy-only')) document.getElementById('five_legacy-only').checked = radio['legacy-only'];
					else document.getElementById('five_legacy-only').checked = false;
					if (radio.hasOwnProperty('csd-override')) document.getElementById('five_csd-override').checked = radio['csd-override'];
					else document.getElementById('five_csd-override').checked = false;
					if (radio.hasOwnProperty('frame-bursting-mode')) fiveFBMSelector.setChoiceByValue(radio['frame-bursting-mode']);
					else fiveFBMSelector.setChoiceByValue('DYNAMIC');
					if (radio.hasOwnProperty('channel-switch-announcement-count')) document.getElementById('five_channel-switch-announcement-count').value = radio['channel-switch-announcement-count'];
					else document.getElementById('five_channel-switch-announcement-count').value = 0;
					
					// ARM Control & Scanning
					if (radio['arm-control']) {
						let subProfile = radio['arm-control'];
						if (subProfile.hasOwnProperty('scanning')) document.getElementById('five_scanning').checked = subProfile['scanning'];
						else document.getElementById('five_scanning').checked = true;
						if (subProfile.hasOwnProperty('channel-quality-aware-arm')) document.getElementById('five_channel-quality-aware-arm').checked = subProfile['channel-quality-aware-arm'];
						else document.getElementById('five_channel-quality-aware-arm').checked = true;
						if (subProfile.hasOwnProperty('channel-quality-threshold')) document.getElementById('five_channel-quality-threshold').value = subProfile['channel-quality-threshold'];
						else document.getElementById('five_channel-quality-threshold').value = 70;
						if (subProfile.hasOwnProperty('channel-quality-wait-time')) document.getElementById('five_channel-quality-wait-time').value = subProfile['channel-quality-wait-time'];
						else document.getElementById('five_channel-quality-wait-time').value = 120;
						if (subProfile.hasOwnProperty('high-noise-backoff-time')) document.getElementById('five_high-noise-backoff-time').value = subProfile['high-noise-backoff-time'];
						else document.getElementById('five_high-noise-backoff-time').value = 720;
						if (subProfile.hasOwnProperty('aggressive-scan')) document.getElementById('five_aggressive-scan').checked = subProfile['aggressive-scan'];
						else document.getElementById('five_aggressive-scan').checked = true;
						if (subProfile.hasOwnProperty('ps-aware-scan')) document.getElementById('five_ps-aware-scan').checked = subProfile['ps-aware-scan'];
						else document.getElementById('five_ps-aware-scan').checked = false;
						if (subProfile.hasOwnProperty('rogue-aware-scan')) document.getElementById('five_rogue-aware-scan').checked = subProfile['rogue-aware-scan'];
						else document.getElementById('five_rogue-aware-scan').checked = false;
						if (subProfile.hasOwnProperty('video-aware-scan')) document.getElementById('five_video-aware-scan').checked = subProfile['video-aware-scan'];
						else document.getElementById('five_video-aware-scan').checked = true;
						if (subProfile.hasOwnProperty('voip-aware-scan')) document.getElementById('five_voip-aware-scan').checked = subProfile['voip-aware-scan'];
						else document.getElementById('five_voip-aware-scan').checked = true;
						if (subProfile.hasOwnProperty('radar-backoff-time')) document.getElementById('five_radar-backoff-time').value = subProfile['radar-backoff-time'];
						else document.getElementById('five_radar-backoff-time').value = 720;
						if (subProfile.hasOwnProperty('scan-interval')) document.getElementById('five_scan-interval').value = subProfile['scan-interval'];
						else document.getElementById('five_scan-interval').value = 720;
					} else {
						document.getElementById('five_channel-quality-aware-arm').checked = true;
						document.getElementById('five_channel-quality-threshold').value = 70;
						document.getElementById('five_channel-quality-wait-time').value = 120;
						document.getElementById('five_high-noise-backoff-time').value = 720;
						document.getElementById('five_aggressive-scan').checked = true;
						document.getElementById('five_ps-aware-scan').checked = false;
						document.getElementById('five_video-aware-scan').checked = true;
						document.getElementById('five_voip-aware-scan').checked = true;
						document.getElementById('five_radar-backoff-time').value = 720;
						document.getElementById('five_scan-interval').value = 10;
					}
					
					// Mesh
					if (radio.hasOwnProperty('max-distance')) document.getElementById('five_max-distance').value = radio['max-distance'];
					else document.getElementById('five_max-distance').value = 0;
					
					// Wi-Fi 5
					if (radio['very-high-throughput']) {
						let subProfile = radio['very-high-throughput']
						if (subProfile.hasOwnProperty('enable')) document.getElementById('five_vht').checked = subProfile['enable'];
						else document.getElementById('five_vht').checked = true;
						if (subProfile.hasOwnProperty('vht-bw-signaling')) document.getElementById('five_vht-bw-signaling').checked = subProfile['vht-bw-signaling'];
						else document.getElementById('five_vht-bw-signaling').checked = true;
						if (subProfile.hasOwnProperty('vht-txbf-sounding-interval')) document.getElementById('five_vht-txbf-sounding-interval').value = subProfile['vht-txbf-sounding-interval'];
						else document.getElementById('five_vht-txbf-sounding-interval').value = 0;
					} else {
						document.getElementById('five_vht').checked = true;
						document.getElementById('five_vht-bw-signaling').checked = true;
						document.getElementById('five_vht-txbf-sounding-interval').value = 0;
					}
					
					// Wi-Fi 6
					if (radio['high-efficiency']) {
						let subProfile = radio['high-efficiency']
						if (subProfile.hasOwnProperty('bss-color')) document.getElementById('five_bss-color').value = subProfile['bss-color'];
						else document.getElementById('five_bss-color').value = 0;
						if (subProfile.hasOwnProperty('bss-color-switch-count')) document.getElementById('five_bss-color-switch-count').value = subProfile['bss-color-switch-count'];
						else document.getElementById('five_bss-color-switch-count').value = 10;
					} else {
						document.getElementById('five_bss-color').value = 0;
						document.getElementById('five_bss-color-switch-count').value = 10;
					}
					
					// Wi-Fi 7
					if (radio['extremely-high-throughput']) {
						let subProfile = radio['extremely-high-throughput']
						if (subProfile.hasOwnProperty('mu-mimo')) document.getElementById('five_eht-mu-mimo').checked = subProfile['mu-mimo'];
						else document.getElementById('five_eht-mu-mimo').checked = true;
						if (subProfile.hasOwnProperty('ul-mu-mimo')) document.getElementById('five_eht-ul-mu-mimo').checked = subProfile['ul-mu-mimo'];
						else document.getElementById('five_eht-ul-mu-mimo').checked = false;
						if (subProfile.hasOwnProperty('mu-ofdma')) document.getElementById('five_eht-mu-ofdma').checked = subProfile['mu-ofdma'];
						else document.getElementById('five_eht-mu-ofdma').checked = true;
						if (subProfile.hasOwnProperty('txbf')) document.getElementById('five_eht-txbf').checked = subProfile['txbf'];
						else document.getElementById('five_eht-txbf').checked = true;
					} else {
						document.getElementById('five_eht-mu-mimo').checked = true;
						document.getElementById('five_eht-ul-mu-mimo').checked = false;
						document.getElementById('five_eht-mu-ofdma').checked = true;
						document.getElementById('five_eht-txbf').checked = true;
					}
					
				} else if (radio['profile'].includes('RADIO_6G')) {
					// 6GHz Column
					// General
					if (radio.hasOwnProperty('dot11k')) document.getElementById('six_dot11k').checked = radio['dot11k'];
					else document.getElementById('six_dot11k').checked = false;
					if (radio.hasOwnProperty('ieee802dot11h')) document.getElementById('six_ieee802dot11h').checked = radio['ieee802dot11h'];
					else document.getElementById('six_ieee802dot11h').checked = false;
					if (radio.hasOwnProperty('advertise-ap-name')) document.getElementById('six_advertise-ap-name').checked = radio['advertise-ap-name'];
					else document.getElementById('six_advertise-ap-name').checked = false;
					if (radio.hasOwnProperty('cdc')) document.getElementById('six_cdc').checked = radio['cdc'];
					else document.getElementById('six_cdc').checked = false;
					if (radio.hasOwnProperty('mbo')) document.getElementById('six_mbo').checked = radio['mbo'];
					else document.getElementById('six_mbo').checked = false;
					if (radio.hasOwnProperty('dpp-configurator-connectivity')) document.getElementById('six_dpp-configurator-connectivity').checked = radio['dpp-configurator-connectivity'];
					else document.getElementById('six_dpp-configurator-connectivity').checked = false;
					if (radio.hasOwnProperty('ftm-scan-enable')) document.getElementById('six_ftm-scan-enable').checked = radio['ftm-scan-enable'];
					else document.getElementById('six_ftm-scan-enable').checked = false;
					if (radio.hasOwnProperty('psc-channel-assignment-only')) document.getElementById('six_psc-channel-assignment-only').checked = radio['psc-channel-assignment-only'];
					else document.getElementById('six_psc-channel-assignment-only').checked = false;
					if (radio.hasOwnProperty('arm-wids-override')) widsOverrideSelector.setChoiceByValue(radio['arm-wids-override']);
					else widsOverrideSelector.setChoiceByValue('DYNAMIC');
					if (radio.hasOwnProperty('afc-mode')) operationModeSelector.setChoiceByValue(radio['afc-mode']);
					else operationModeSelector.setChoiceByValue('LPI');
					if (radio.hasOwnProperty('frame-bursting-mode')) sixFBMSelector.setChoiceByValue(radio['frame-bursting-mode']);
					else sixFBMSelector.setChoiceByValue('DYNAMIC');
					if (radio.hasOwnProperty('channel-switch-announcement-count')) document.getElementById('six_channel-switch-announcement-count').value = radio['channel-switch-announcement-count'];
					else document.getElementById('six_channel-switch-announcement-count').value = 0;
					
					// ARM Control & Scanning
					if (radio['arm-control']) {
						let subProfile = radio['arm-control'];
						if (subProfile.hasOwnProperty('scanning')) document.getElementById('six_scanning').checked = subProfile['scanning'];
						else document.getElementById('six_scanning').checked = true;
						if (subProfile.hasOwnProperty('channel-quality-aware-arm')) document.getElementById('six_channel-quality-aware-arm').checked = subProfile['channel-quality-aware-arm'];
						else document.getElementById('six_channel-quality-aware-arm').checked = true;
						if (subProfile.hasOwnProperty('channel-quality-threshold')) document.getElementById('six_channel-quality-threshold').value = subProfile['channel-quality-threshold'];
						else document.getElementById('six_channel-quality-threshold').value = 70;
						if (subProfile.hasOwnProperty('channel-quality-wait-time')) document.getElementById('six_channel-quality-wait-time').value = subProfile['channel-quality-wait-time'];
						else document.getElementById('six_channel-quality-wait-time').value = 120;
						if (subProfile.hasOwnProperty('high-noise-backoff-time')) document.getElementById('six_high-noise-backoff-time').value = subProfile['high-noise-backoff-time'];
						else document.getElementById('six_high-noise-backoff-time').value = 720;
						if (subProfile.hasOwnProperty('aggressive-scan')) document.getElementById('six_aggressive-scan').checked = subProfile['aggressive-scan'];
						else document.getElementById('six_aggressive-scan').checked = true;
						if (subProfile.hasOwnProperty('ps-aware-scan')) document.getElementById('six_ps-aware-scan').checked = subProfile['ps-aware-scan'];
						else document.getElementById('six_ps-aware-scan').checked = false;
						if (subProfile.hasOwnProperty('rogue-aware-scan')) document.getElementById('six_rogue-aware-scan').checked = subProfile['rogue-aware-scan'];
						else document.getElementById('six_rogue-aware-scan').checked = false;
						if (subProfile.hasOwnProperty('video-aware-scan')) document.getElementById('six_video-aware-scan').checked = subProfile['video-aware-scan'];
						else document.getElementById('six_video-aware-scan').checked = true;
						if (subProfile.hasOwnProperty('voip-aware-scan')) document.getElementById('six_voip-aware-scan').checked = subProfile['voip-aware-scan'];
						else document.getElementById('six_voip-aware-scan').checked = true;
						if (subProfile.hasOwnProperty('scan-interval')) document.getElementById('six_scan-interval').value = subProfile['scan-interval'];
						else document.getElementById('six_scan-interval').value = 720;
					} else {
						document.getElementById('six_channel-quality-aware-arm').checked = true;
						document.getElementById('six_channel-quality-threshold').value = 70;
						document.getElementById('six_channel-quality-wait-time').value = 120;
						document.getElementById('six_high-noise-backoff-time').value = 720;
						document.getElementById('six_aggressive-scan').checked = true;
						document.getElementById('six_ps-aware-scan').checked = false;
						document.getElementById('six_video-aware-scan').checked = true;
						document.getElementById('six_voip-aware-scan').checked = true;
						document.getElementById('six_scan-interval').value = 10;
					}
					
					// Mesh
					if (radio.hasOwnProperty('max-distance')) document.getElementById('six_max-distance').value = radio['max-distance'];
					else document.getElementById('six_max-distance').value = 0;
					
					// Data Rates
					sixBasicSelector.removeActiveItems();
					sixBasicSelector.setChoiceByValue(radio['basic-rates']);
					sixTxSelector.removeActiveItems();
					sixTxSelector.setChoiceByValue(radio['tx-rates']);
					sixBeaconSelector.removeActiveItems();
					sixBeaconSelector.setChoiceByValue(radio['beacon-rate']);
					
					// Wi-Fi 6
					if (radio['high-efficiency']) {
						let subProfile = radio['high-efficiency']
						if (subProfile.hasOwnProperty('bss-color')) document.getElementById('six_bss-color').value = subProfile['bss-color'];
						else document.getElementById('six_bss-color').value = 0;
						if (subProfile.hasOwnProperty('bss-color-switch-count')) document.getElementById('six_bss-color-switch-count').value = subProfile['bss-color-switch-count'];
						else document.getElementById('six_bss-color-switch-count').value = 10;
						if (subProfile.hasOwnProperty('mu-mimo')) document.getElementById('six_he-mu-mimo').checked = subProfile['mu-mimo'];
						else document.getElementById('six_he-mu-mimo').checked = true;
						if (subProfile.hasOwnProperty('ul-mu-mimo')) document.getElementById('six_he-ul-mu-mimo').checked = subProfile['ul-mu-mimo'];
						else document.getElementById('six_he-ul-mu-mimo').checked = false;
						if (subProfile.hasOwnProperty('mu-ofdma')) document.getElementById('six_he-mu-ofdma').checked = subProfile['mu-ofdma'];
						else document.getElementById('six_he-mu-ofdma').checked = true;
						if (subProfile.hasOwnProperty('txbf')) document.getElementById('six_he-txbf').checked = subProfile['txbf'];
						else document.getElementById('six_he-txbf').checked = true;
						if (subProfile.hasOwnProperty('individual-twt')) document.getElementById('six_he-individual-twt').checked = subProfile['individual-twt'];
						else document.getElementById('six_he-individual-twt').checked = true;
					} else {
						document.getElementById('six_bss-color').value = 0;
						document.getElementById('six_bss-color-switch-count').value = 10;
						document.getElementById('six_he-mu-mimo').checked = true;
						document.getElementById('six_he-ul-mu-mimo').checked = false;
						document.getElementById('six_he-mu-ofdma').checked = true;
						document.getElementById('six_he-txbf').checked = true;
						document.getElementById('six_he-individual-twt').checked = true;
					}
					
					// Wi-Fi 7
					if (radio['extremely-high-throughput']) {
						let subProfile = radio['extremely-high-throughput']
						if (subProfile.hasOwnProperty('mu-mimo')) document.getElementById('six_eht-mu-mimo').checked = subProfile['mu-mimo'];
						else document.getElementById('six_eht-mu-mimo').checked = true;
						if (subProfile.hasOwnProperty('ul-mu-mimo')) document.getElementById('six_eht-ul-mu-mimo').checked = subProfile['ul-mu-mimo'];
						else document.getElementById('six_eht-ul-mu-mimo').checked = false;
						if (subProfile.hasOwnProperty('mu-ofdma')) document.getElementById('six_eht-mu-ofdma').checked = subProfile['mu-ofdma'];
						else document.getElementById('six_eht-mu-ofdma').checked = true;
						if (subProfile.hasOwnProperty('txbf')) document.getElementById('six_eht-txbf').checked = subProfile['txbf'];
						else document.getElementById('six_eht-txbf').checked = true;
					} else {
						document.getElementById('six_eht-mu-mimo').checked = true;
						document.getElementById('six_eht-ul-mu-mimo').checked = false;
						document.getElementById('six_eht-mu-ofdma').checked = true;
						document.getElementById('six_eht-txbf').checked = true;
					}
				}
			});
			
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
		showNotification('ca-antenna', 'The profile contains invalid values. Please correct the values.' , 'bottom', 'center', 'warning');
		return;
	}
	
	// Antennas
	editingConfig['sam-detection'] = document.getElementById('sam-detection').checked;
	editingConfig['dynamic-ant'] = dynamicAntSelector.getValue(true);
	editingConfig['ant-direction-mode'] = antDirectionSelector.getValue(true);
	
	// Radios
	editingConfig['radio'].forEach(function(radio) {
		if (radio['profile'].includes('RADIO_2DOT4G')) {
			let twoConfig = radio;
			twoConfig['intolerance-40MHz'] = document.getElementById('two_intolerance-40MHz').checked;
			twoConfig['honor-40MHz-intolerance'] = document.getElementById('two_honor-40MHz-intolerance').checked;
			twoConfig['dot11b-protection'] = document.getElementById('two_dot11b-protection').checked;
			twoConfig['ieee802dot11h'] = document.getElementById('two_ieee802dot11h').checked;
			twoConfig['dpp-configurator-connectivity'] = document.getElementById('two_dpp-configurator-connectivity').checked;
			twoConfig['iot-coexistence'] = document.getElementById('two_iot-coexistence').checked;
			twoConfig['legacy-only'] = document.getElementById('two_legacy-only').checked;
			twoConfig['csd-override'] = document.getElementById('two_csd-override').checked;
			twoConfig['channel-switch-announcement-count'] = parseInt(document.getElementById('two_channel-switch-announcement-count').value);
			if (!document.getElementById('two_ieee802dot11h').checked) delete twoConfig['channel-switch-announcement-count'];
			
			if (!twoConfig['arm-control']) twoConfig['arm-control'] = {};
			twoConfig['arm-control']['channel-quality-aware-arm'] = document.getElementById('two_channel-quality-aware-arm').checked;
			twoConfig['arm-control']['channel-quality-threshold'] = parseInt(document.getElementById('two_channel-quality-threshold').value);
			twoConfig['arm-control']['channel-quality-wait-time'] = parseInt(document.getElementById('two_channel-quality-wait-time').value);
			twoConfig['arm-control']['high-noise-backoff-time'] = parseInt(document.getElementById('two_high-noise-backoff-time').value);
			twoConfig['arm-control']['aggressive-scan'] = document.getElementById('two_aggressive-scan').checked;
			twoConfig['arm-control']['ps-aware-scan'] = document.getElementById('two_ps-aware-scan').checked;
			//twoConfig['arm-control']['rogue-aware-scan'] = document.getElementById('two_rogue-aware-scan').checked;
			twoConfig['arm-control']['video-aware-scan'] = document.getElementById('two_video-aware-scan').checked;
			twoConfig['arm-control']['voip-aware-scan'] = document.getElementById('two_voip-aware-scan').checked;
			twoConfig['arm-control']['scan-interval'] = parseInt(document.getElementById('two_scan-interval').value);
			
			if (!twoConfig['high-efficiency']) twoConfig['high-efficiency'] = {};
			twoConfig['high-efficiency']['bss-color'] = parseInt(document.getElementById('two_bss-color').value);
			if (parseInt(document.getElementById('two_bss-color').value) == 0) delete twoConfig['high-efficiency']['bss-color'];
			twoConfig['high-efficiency']['bss-color-switch-count'] = parseInt(document.getElementById('two_bss-color-switch-count').value);
			if (parseInt(document.getElementById('two_bss-color-switch-count').value) == 10) delete twoConfig['high-efficiency']['bss-color-switch-count'];
			
			if (!twoConfig['extremely-high-throughput']) twoConfig['extremely-high-throughput'] = {};
			twoConfig['extremely-high-throughput']['mu-mimo'] = document.getElementById('two_eht-mu-mimo').checked;
			twoConfig['extremely-high-throughput']['ul-mu-mimo'] = document.getElementById('two_eht-ul-mu-mimo').checked;
			twoConfig['extremely-high-throughput']['mu-ofdma'] = document.getElementById('two_eht-mu-ofdma').checked;
			twoConfig['extremely-high-throughput']['txbf'] = document.getElementById('two_eht-txbf').checked;
			
			// Mesh
			twoConfig['max-distance'] = parseInt(document.getElementById('two_max-distance').value);
			if (twoConfig['max-distance'] == 0) delete twoConfig['max-distance'];
			
		} else if (radio['profile'].includes('RADIO_5G')) {
			let fiveConfig = radio;
			fiveConfig['ieee802dot11h'] = document.getElementById('five_ieee802dot11h').checked;
			fiveConfig['dpp-configurator-connectivity'] = document.getElementById('five_dpp-configurator-connectivity').checked;
			fiveConfig['ftm-scan-enable'] = document.getElementById('five_ftm-scan-enable').checked;
			fiveConfig['legacy-only'] = document.getElementById('five_legacy-only').checked;
			fiveConfig['csd-override'] = document.getElementById('five_csd-override').checked;
			fiveConfig['frame-bursting-mode'] = fiveFBMSelector.getValue(true);
			fiveConfig['channel-switch-announcement-count'] = parseInt(document.getElementById('five_channel-switch-announcement-count').value);
			if (!document.getElementById('five_ieee802dot11h').checked) delete fiveConfig['channel-switch-announcement-count'];
			
			if (!fiveConfig['arm-control']) fiveConfig['arm-control'] = {};
			fiveConfig['arm-control']['channel-quality-aware-arm'] = document.getElementById('five_channel-quality-aware-arm').checked;
			fiveConfig['arm-control']['channel-quality-threshold'] = parseInt(document.getElementById('five_channel-quality-threshold').value);
			fiveConfig['arm-control']['channel-quality-wait-time'] = parseInt(document.getElementById('five_channel-quality-wait-time').value);
			fiveConfig['arm-control']['high-noise-backoff-time'] = parseInt(document.getElementById('five_high-noise-backoff-time').value);
			fiveConfig['arm-control']['aggressive-scan'] = document.getElementById('five_aggressive-scan').checked;
			fiveConfig['arm-control']['ps-aware-scan'] = document.getElementById('five_ps-aware-scan').checked;
			//fiveConfig['arm-control']['rogue-aware-scan'] = document.getElementById('five_rogue-aware-scan').checked;
			fiveConfig['arm-control']['video-aware-scan'] = document.getElementById('five_video-aware-scan').checked;
			fiveConfig['arm-control']['voip-aware-scan'] = document.getElementById('five_voip-aware-scan').checked;
			fiveConfig['arm-control']['radar-backoff-time'] = parseInt(document.getElementById('five_radar-backoff-time').value);
			fiveConfig['arm-control']['scan-interval'] = parseInt(document.getElementById('five_scan-interval').value);
			
			if (!fiveConfig['very-high-throughput']) fiveConfig['very-high-throughput'] = {};
			fiveConfig['very-high-throughput']['enable'] = document.getElementById('five_vht').checked;
			fiveConfig['very-high-throughput']['vht-bw-signaling'] = document.getElementById('five_vht-bw-signaling').checked;
			fiveConfig['very-high-throughput']['vht-txbf-sounding-interval'] = parseInt(document.getElementById('five_vht-txbf-sounding-interval').value);
			
			if (!fiveConfig['high-efficiency']) fiveConfig['high-efficiency'] = {};
			fiveConfig['high-efficiency']['bss-color'] = parseInt(document.getElementById('five_bss-color').value);
			if (parseInt(document.getElementById('five_bss-color').value) == 0) delete fiveConfig['high-efficiency']['bss-color'];
			fiveConfig['high-efficiency']['bss-color-switch-count'] = parseInt(document.getElementById('five_bss-color-switch-count').value);
			if (parseInt(document.getElementById('five_bss-color-switch-count').value) == 10) delete fiveConfig['high-efficiency']['bss-color-switch-count'];
			
			if (!fiveConfig['extremely-high-throughput']) fiveConfig['extremely-high-throughput'] = {};
			fiveConfig['extremely-high-throughput']['mu-mimo'] = document.getElementById('five_eht-mu-mimo').checked;
			fiveConfig['extremely-high-throughput']['ul-mu-mimo'] = document.getElementById('five_eht-ul-mu-mimo').checked;
			fiveConfig['extremely-high-throughput']['mu-ofdma'] = document.getElementById('five_eht-mu-ofdma').checked;
			fiveConfig['extremely-high-throughput']['txbf'] = document.getElementById('five_eht-txbf').checked;
			
			// Mesh
			fiveConfig['max-distance'] = parseInt(document.getElementById('five_max-distance').value);
			if (fiveConfig['max-distance'] == 0) delete fiveConfig['max-distance'];
			
		} else if (radio['profile'].includes('RADIO_6G')) {
			let sixConfig = radio;
			sixConfig['dot11k'] = document.getElementById('six_dot11k').checked;
			sixConfig['ieee802dot11h'] = document.getElementById('six_ieee802dot11h').checked;
			sixConfig['advertise-ap-name'] = document.getElementById('six_advertise-ap-name').checked;
			sixConfig['cdc'] = document.getElementById('six_cdc').checked;
			sixConfig['mbo'] = document.getElementById('six_mbo').checked;
			sixConfig['dpp-configurator-connectivity'] = document.getElementById('six_dpp-configurator-connectivity').checked;
			sixConfig['ftm-scan-enable'] = document.getElementById('six_ftm-scan-enable').checked;
			sixConfig['psc-channel-assignment-only'] = document.getElementById('six_psc-channel-assignment-only').checked;
			sixConfig['arm-wids-override'] = widsOverrideSelector.getValue(true);
			sixConfig['afc-mode'] = operationModeSelector.getValue(true);
			sixConfig['frame-bursting-mode'] = sixFBMSelector.getValue(true);
			sixConfig['channel-switch-announcement-count'] = parseInt(document.getElementById('six_channel-switch-announcement-count').value);
			if (!document.getElementById('six_ieee802dot11h').checked) delete sixConfig['channel-switch-announcement-count'];
			
			sixConfig['basic-rates'] = sixBasicSelector.getValue(true);
			sixConfig['tx-rates'] = sixTxSelector.getValue(true);
			if (sixBeaconSelector.getValue(true)) sixConfig['beacon-rate'] = sixBeaconSelector.getValue(true);
			else delete sixConfig['beacon-rate'];
			
			if (!sixConfig['arm-control']) sixConfig['arm-control'] = {};
			sixConfig['arm-control']['channel-quality-aware-arm'] = document.getElementById('six_channel-quality-aware-arm').checked;
			sixConfig['arm-control']['channel-quality-threshold'] = parseInt(document.getElementById('six_channel-quality-threshold').value);
			sixConfig['arm-control']['channel-quality-wait-time'] = parseInt(document.getElementById('six_channel-quality-wait-time').value);
			sixConfig['arm-control']['high-noise-backoff-time'] = parseInt(document.getElementById('six_high-noise-backoff-time').value);
			sixConfig['arm-control']['aggressive-scan'] = document.getElementById('six_aggressive-scan').checked;
			sixConfig['arm-control']['ps-aware-scan'] = document.getElementById('six_ps-aware-scan').checked;
			//sixConfig['arm-control']['rogue-aware-scan'] = document.getElementById('six_rogue-aware-scan').checked;
			sixConfig['arm-control']['video-aware-scan'] = document.getElementById('six_video-aware-scan').checked;
			sixConfig['arm-control']['voip-aware-scan'] = document.getElementById('six_voip-aware-scan').checked;
			sixConfig['arm-control']['scan-interval'] = parseInt(document.getElementById('six_scan-interval').value);
			
			if (!sixConfig['high-efficiency']) sixConfig['high-efficiency'] = {};
			sixConfig['high-efficiency']['bss-color'] = parseInt(document.getElementById('six_bss-color').value);
			if (parseInt(document.getElementById('six_bss-color').value) == 0) delete sixConfig['high-efficiency']['bss-color'];
			sixConfig['high-efficiency']['bss-color-switch-count'] = parseInt(document.getElementById('six_bss-color-switch-count').value);
			if (parseInt(document.getElementById('six_bss-color-switch-count').value) == 10) delete sixConfig['high-efficiency']['bss-color-switch-count'];
			sixConfig['high-efficiency']['mu-mimo'] = document.getElementById('six_he-mu-mimo').checked;
			sixConfig['high-efficiency']['ul-mu-mimo'] = document.getElementById('six_he-ul-mu-mimo').checked;
			sixConfig['high-efficiency']['mu-ofdma'] = document.getElementById('six_he-mu-ofdma').checked;
			sixConfig['high-efficiency']['txbf'] = document.getElementById('six_he-txbf').checked;
			sixConfig['high-efficiency']['individual-twt'] = document.getElementById('six_he-individual-twt').checked;
			
			if (!sixConfig['extremely-high-throughput']) sixConfig['extremely-high-throughput'] = {};
			sixConfig['extremely-high-throughput']['mu-mimo'] = document.getElementById('six_eht-mu-mimo').checked;
			sixConfig['extremely-high-throughput']['ul-mu-mimo'] = document.getElementById('six_eht-ul-mu-mimo').checked;
			sixConfig['extremely-high-throughput']['mu-ofdma'] = document.getElementById('six_eht-mu-ofdma').checked;
			sixConfig['extremely-high-throughput']['txbf'] = document.getElementById('six_eht-txbf').checked;
			
			// Mesh
			sixConfig['max-distance'] = parseInt(document.getElementById('six_max-distance').value);
			if (sixConfig['max-distance'] == 0) delete sixConfig['max-distance'];
		}		
	});
	
	console.log(editingConfig)
	// Save back to Central
	logStart('Updating RF Profile: '+editingProfile);
	authenticateWithCentral().then(function() {
		if (saveNotification) saveNotification.close();
		saveNotification = showNotification('ca-antenna', 'Saving: "'+editingProfile+'"...' , 'bottom', 'center', 'info');

		var command = profileEndpoint+'/'+editingProfile;
		if (editingType === 'LOCAL') command = profileEndpoint+'/'+editingProfile + '?object_type=LOCAL&scope_id='+editingScope+'&persona='+editingPersona;

		fetchProxyWithAuth('/tools/putCommandwHeaders', {
			url: localStorage.getItem('base_url') + command,
			access_token: localStorage.getItem('access_token'),
			data: JSON.stringify(editingConfig),
		})
		.then(function(commandResults) {
			var result = processStatus(commandResults);
			if (result == 429 || result == 409) {
				if (saveNotification) {
					saveNotification.update({ type: 'danger', message: 'Unable to save: "'+editingProfile+'". API Rate Limit hit. Please try again.' });
					setTimeout(saveNotification.close, 2000);
				}
			} else if (result == 400) {
				logError('Unable to update RF profile: '+editingProfile);
				if (saveNotification) {
					message = JSON.parse(commandResults['responseBody']);
					saveNotification.update({ type: 'warning', message: 'Unable to save: "'+ editingProfile+'"<br> '+ message['message'] });
					setTimeout(saveNotification.close, 2000);
				}
			} else if (result !== 200) {
				if (saveNotification) {
					message = JSON.parse(commandResults['responseBody']);
					saveNotification.update({ type: 'warning', message: 'Unable to save: "'+ editingProfile+'"<br> '+ message['message'] });
					setTimeout(saveNotification.close, 2000);
				}
				logError('Unable to update RF profile: '+editingProfile);
			} else {
				logInformation('RF profile: ' + editingProfile + ' was updated successfully');
				if (saveNotification) {
					saveNotification.update({ type: 'success', message: 'Profile was updated' });
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
	if (!profileSelector.getValue(true)) {
		showNotification('ca-folder-settings', 'Please choose an RF Profile to assign', 'bottom', 'center', 'warning');
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
		showNotification('ca-folder-settings', 'Please choose an RF Profile to assign', 'bottom', 'center', 'warning');
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