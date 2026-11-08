/*
Central Automation v2.x
Last Updated 2.0.0
Aaron Scott (WiFi Downunder) 2025-2026
*/

var profileNotification;
var saveNotification;
var profiles = [];
var profilesL3 = [];
var profilesL3ById = {};
var editingProfile = '';
var editingConfig = {};
var editingScope = '';
var editingPersona = '';
var editingType = 'SHARED';
var jsonEditorState = {
	primary: null,
	secondary: null
};

var vlanList = [];
var vlanFailedVLANs = [];
var vlanListCounter = 0;

var l3VlanFailedVLANs = [];
var l3VlanListCounter = 0;

var templateL2Config = {};
var templateL3Config = {};

var assignmentTotal = 0;
var assignmentCounter = 0;
var assignmentErrors = 0;

var vlanNotification;
var assignNotification;

const profileName = 'VLAN'
const profileUniqueLeaf = 'vlan'
const profileType = 'layer2-vlan';
const profileEndpoint = '/network-config/v1/layer2-vlan';
const profileEndpointL3 = '/network-config/v1/vlan-interfaces';
const uiURL = '/gravity/monitoring/config/profiles/vlan';
const singleInstance = false;

var selectedHierarchyLevel = 'library';
var selectedScopeId = '';

var vlanPromise;
var vlanResolve;
var vlanReject;

var deviceFunctionSelector;
var proxyModeSelector;
var portChannelSelector;

var vlanUpdateTotal;
var vlanUpdateCounter;
var vlanUpdateError;

// override to control available device functions for the profile
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
		deviceFunctionChoices.push({ value: 'MOBILITY_GW', label: 'Mobility GW' });
		//deviceFunctionChoices.push({ value: 'BRANCH_GW', label: 'Branch GW' });
		//deviceFunctionChoices.push({ value: 'VPNC', label: 'VPN Concentrator' });
		deviceFunctionChoices.push({ value: 'ACCESS_SWITCH', label: 'Access Switch' });
		deviceFunctionChoices.push({ value: 'AGG_SWITCH', label: 'Aggregation Switch' });
		deviceFunctionChoices.push({ value: 'CORE_SWITCH', label: 'Core Switch' });
		deviceFunctionChoices.push({ value: 'AOSS_ACCESS_SWITCH', label: 'AOS-S Acess Switch' });
		deviceFunctionChoices.push({ value: 'AOSS_AGG_SWITCH', label: 'AOS-S Aggregation Switch' });
		deviceFunctionChoices.push({ value: 'AOSS_CORE_SWITCH', label: 'AOS-S Core Switch' });
		deviceFunctionSelector.clearChoices();
		deviceFunctionSelector.setChoices(deviceFunctionChoices);
	}
	
	let proxyElement = document.getElementById('igmp-proxy-mode');
	if (proxyElement) {
		proxyModeSelector = new Choices(proxyElement, {
			searchEnabled: false,
			shouldSort: false,
			itemSelectText: "Press to select",
			removeItemButton:false
		});
		let choices = [];
		choices.push({ value: 'DISABLED', label: 'Disabled' });		
		choices.push({ value: 'igmp-proxy-eth', label: 'Ethernet Interface' });
		choices.push({ value: 'igmp-proxy-pchannel', label: 'Port Channel' });
		choices.push({ value: 'igmp-proxy-vxlan', label: 'VXLAN Interface' });
		proxyModeSelector.clearChoices();
		proxyModeSelector.setChoices(choices);
		proxyModeSelector.setChoiceByValue('DISABLED');
		
		proxyElement.addEventListener('change', function() {
			changeIGMP();
		});
	}
	
	let proxyPCElement = document.getElementById('igmp-proxy-pchannel');
	if (proxyPCElement) {
		portChannelSelector = new Choices(proxyPCElement, {
			searchEnabled: false,
			shouldSort: false,
			itemSelectText: "Press to select",
			removeItemButton:false
		});
		let choices = [];
		choices.push({ value: '0', label: '0' });		
		choices.push({ value: '1', label: '1' });
		choices.push({ value: '2', label: '2' });
		choices.push({ value: '3', label: '3' });
		choices.push({ value: '4', label: '4' });		
		choices.push({ value: '5', label: '5' });
		choices.push({ value: '6', label: '6' });
		choices.push({ value: '7', label: '7' });
		portChannelSelector.clearChoices();
		portChannelSelector.setChoices(choices);
		portChannelSelector.setChoiceByValue('0');
	}
}

function hierarchyChange(scopeID, hierarchyLevel) {
	// Override at each page
	refreshProfilesForHierarchy();
}

function changeIGMP() {
	
	if (proxyModeSelector.getValue(true) === 'DISABLED') {
		document.getElementById("igmp-interface").hidden = true;
		document.getElementById("igmp-port-channel").hidden = true;
		document.getElementById("igmp-vxlan-interface").hidden = true;
	} if (proxyModeSelector.getValue(true) === 'igmp-proxy-eth') {
		document.getElementById("igmp-interface").hidden = false;
		document.getElementById("igmp-port-channel").hidden = true;
		document.getElementById("igmp-vxlan-interface").hidden = true;
	} if (proxyModeSelector.getValue(true) === 'igmp-proxy-pchannel') {
		document.getElementById("igmp-interface").hidden = true;
		document.getElementById("igmp-port-channel").hidden = false;
		document.getElementById("igmp-vxlan-interface").hidden = true;
	} if (proxyModeSelector.getValue(true) === 'igmp-proxy-vxlan') {
		document.getElementById("igmp-interface").hidden = true;
		document.getElementById("igmp-port-channel").hidden = true;
		document.getElementById("igmp-vxlan-interface").hidden = false;
	}
}

function updateInformation() {
	getHierarchyData().then(function() {
		getDeviceInventoryData(1,false).then(function() {
			refreshProfilesForHierarchy();
		});
	})
}

function refreshProfilesForHierarchy() {
	// Split selector value into scopeid and hierarchy level 
	let hierarchyChoices = getHierarchySelector();
	let matches =  hierarchyChoices.getValue(true).match(/^(.*?)::(.*)/);
	selectedHierarchyLevel = matches[1];
	selectedScopeId = matches[2];
	authenticateWithCentral().then(function() {
		profiles = [];
		profilesL3 = [];
		profilesL3ById = {};
		getProfiles(0, selectedScopeId);
	});
}

function buildProfilesL3Dictionary() {
	profilesL3ById = {};
	profilesL3.forEach(function(profile) {
		if (!profile || profile.id === undefined || profile.id === null) return;
		let profileId = parseInt(profile.id, 10);
		if (Number.isNaN(profileId)) return;
		profilesL3ById[profileId] = profile;
	});
}

function getProfileJsonEditorState(profile, profileName, endpointBase) {
	if (!profile) return null;

	let profileCopy = { ...profile };
	let editorState = {
		profileName: profileName,
		endpointBase: endpointBase,
		config: '',
		type: 'SHARED',
		scope: '',
		persona: ''
	};

	if (profileCopy['@'] && profileCopy['@']['aruba-annotation:object_type'] === 'LOCAL') {
		let scopeInfo = [{ scope_name: '', device_function: '' }];
		if (profileCopy['@'] && profileCopy['@']['aruba-annotation:scope_device_function']) {
			scopeInfo = parseScopeDeviceFunction(profileCopy['@']['aruba-annotation:scope_device_function']);
		}
		editorState.type = 'LOCAL';
		editorState.scope = scopeInfo[0]['scope_id'];
		editorState.persona = scopeInfo[0]['device_function'];
	} else {
		editorState.type = 'SHARED';
	}

	delete profileCopy['@'];
	editorState.config = JSON.stringify(profileCopy, null, 2);
	return editorState;
}

function buildProfileSaveCommand(editorState) {
	if (!editorState) return '';
	let command = editorState.endpointBase + '/' + editorState.profileName;
	if (editorState.type === 'LOCAL') command = editorState.endpointBase + '/' + editorState.profileName + '?object_type=LOCAL&scope_id=' + editorState.scope + '&persona=' + editorState.persona;
	return command;
}


/*  -------------------------------------------------------------------------------------------------------------------------------------------------------------------------
	Loading Profiles
------------------------------------------------------------------------------------------------------------------------------------------------------------------------- */

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
			// Over API threshold limit or backend busy. Wait apiWaitDelay value and try again.
			setTimeout(getProfiles, apiWaitDelay, offset, scope);
		} else if (result !== 200) {
			if (profileNotification) {
				profileNotification.update({ type: 'danger', message: 'Failed to retrieve L2 VLAN Profiles' });
				setTimeout(profileNotification.close, 2000);
			}
		} else {
			let response = JSON.parse(commandResults.responseBody);
			if (response['l2-vlan']) profiles = profiles.concat(response['l2-vlan']);
			offset = response.offset;
			if (offset) {
				let getProgress = ((profiles.length) / response.total) * 100;
				profileNotification.update({ progress: getProgress });
				getProfiles(offset,scope);
			} else {
				if (profileNotification) {
					profileNotification.update({ progress: 100, type: 'success', message: 'Retrieved L2 VLAN Profiles' });
					setTimeout(profileNotification.close, 1000);
				}
				getAdditionalProfiles(0,scope);
			}
		}
	});
}

function getAdditionalProfiles(offset, scope) {
	
	if (profileNotification) profileNotification.close();
	profileNotification = showNotification('ca-ap-icon3', 'Obtaining additional profiles...', 'bottom', 'center', 'info');
	
	let command = profileEndpointL3 + '?detailed=true';
	if (scope !== 'Library') command = profileEndpointL3 + '?effective=true&detailed=true&view_type=LOCAL&scope_id='+scope;
	
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
			// Over API threshold limit or backend busy. Wait apiWaitDelay value and try again.
			setTimeout(getAdditionalProfiles, apiWaitDelay, offset, scope);
		} else if (result !== 200) {
			if (profileNotification) {
				profileNotification.update({ type: 'danger', message: 'Failed to retrieve L3 VLAN Profiles' });
				setTimeout(profileNotification.close, 2000);
			}
		} else {
			let response = JSON.parse(commandResults.responseBody);
			
			if (response['interface']) profilesL3 = profilesL3.concat(response['interface']);
			offset = response.offset;
			if (offset) {
				let getProgress = ((profilesL3.length) / response.total) * 100;
				profileNotification.update({ progress: getProgress });
				getAdditionalProfiles(offset,scope);
			} else {
				buildProfilesL3Dictionary();
				
				if (profileNotification) {
					profileNotification.update({ progress: 100, type: 'success', message: 'Retrieved L3 VLAN Profiles' });
					setTimeout(profileNotification.close, 1000);
				}
				loadProfilesTable();
			}
		}
	});
}

function loadProfilesTable() {
	let table = $('#profiles-table').DataTable();
	disposeTooltips(document.getElementById('profiles-table'));
	$('#profiles-table').DataTable().clear();
	
	profiles.forEach(function(profile) {
		let profileName = profile['vlan'].toString();
		let description = '';
		if (profile['description']) description = profile['description'];
		let editable = true;
		if (profile['@'] && profile['@']['aruba-annotation:is_editable']) {
			editable = profile['@']['aruba-annotation:is_editable'];
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
		
		let isL3 = '<i class="fa-solid fa-octagon-xmark"></i>';
		if (profile['is-l3-vlan']) isL3 = '<i class="fa-solid fa-circle-check"></i>';
		
		let isVoice = '<i class="fa-solid fa-octagon-xmark"></i>';
		if (profile['voice-enable'] && profile['voice-enable'] == true) isVoice = '<i class="fa-solid fa-circle-check"></i>';
		
		// Action Buttons
		let status = '<i class="fa-solid fa-diamond text-danger"></i>';
		let actionBtns = '';
		if (editable) {
			actionBtns += '<a class="btn btn-link btn-warning mt-2" data-bs-toggle="tooltip" data-bs-placement="top" data-container="body" data-animation="true" title="Edit UI" onclick="loadEditUI(\'' + profileName + '\')"><i class="fa-solid fa-pencil" style="color: #67748e; font-size:18px;"></i></a> ';
			actionBtns += '<a class="btn btn-link btn-warning mt-2" data-bs-toggle="tooltip" data-bs-placement="top" data-container="body" data-animation="true" title="Edit JSON" onclick="loadJSONUI(\'' + profileName + '\')"><i class="fa-solid fa-rectangle-code" style="color: #67748e; font-size:18px;"></i></a> ';
		}
		
		if (scopeDescriptions.length == 1 && scopeDescriptions[0] === '-') {
			actionBtns += '<a class="btn btn-link btn-warning mt-2" data-bs-toggle="tooltip" data-bs-placement="top" data-container="body" data-animation="true" title="Delete VLAN" onclick="deleteProfile(\'' + profileName + '\')"><i class="fa-solid fa-trash-can" style="color: #67748e; font-size:18px;"></i></a> ';
		}

		// Add row to table
		table.row.add([icon, '<span style="display:none">'+padNumberForSort(profileName)+'</span><a href="' + centralURL + '" target="_blank"><strong>' + profileName + '</strong></a><br />'+description, isVoice, isL3, scopeDescriptions.join('<br>'), actionBtns]);
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
		let cleanProfile = profile['vlan'].toString();
		if (cleanProfile === profileName) {
			if (profile['is-l3-vlan']) {
				Swal.fire({
					title: 'Delete VLAN',
					html: 'Are you sure you want to delete VLAN '+profileName+'?<br />This will also delete the Interface VLAN '+profileName,
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
					title: 'Delete VLAN',
					html: 'Are you sure you want to delete VLAN '+profileName,
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

function deleteProfileConfirmed(profileName, isL3) {
	authenticateWithCentral().then(function() {
		logStart('Deleting VLAN '+ profileName);
		if (isL3) {
			deleteL3VLAN(profileName).then(function() {
				deleteL2VLAN(profileName);
			});
		} else {
			deleteL2VLAN(profileName);
		}
	});
}

function deleteL3VLAN(profileName) {
	vlanPromise = new Promise(function(resolve, reject) { vlanResolve = resolve; vlanReject = reject; });
	fetchProxyWithAuth('/tools/deleteCommand', {
		url: localStorage.getItem('base_url') + profileEndpointL3 + '/' + profileName,
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
			setTimeout(deleteL3VLAN, apiWaitDelay, profileName);
		} else if (result !== 200) {
			logError('Unable to delete VLAN Interface '+ profileName);
			showNotification('ca-bin', 'Unable to delete VLAN Interface profile', 'bottom', 'center', 'danger');
			if (vlanReject) vlanReject();
		} else {
			logInformation('VLAN Interface '+ profileName + ' was deleted');
			showNotification('ca-bin', 'VLAN Interface '+profileName+' was successfully deleted', 'bottom', 'center', 'success');
			vlanResolve();
		}
	}).catch(function(err) {
		logError('Failed to delete VLAN Interface '+profileName);
		if (vlanReject) vlanReject();
	});
	return vlanPromise;
}

function deleteL2VLAN(profileName) {
	fetchProxyWithAuth('/tools/deleteCommand', {
		url: localStorage.getItem('base_url') + profileEndpoint + '/' + profileName,
		access_token: localStorage.getItem('access_token'),
	})
	.then(function(commandResults) {
		if (commandResults.hasOwnProperty('headers')) {
			//updateAPILimits(JSON.parse(commandResults.headers));
		}
		// Process The status code of the result
		let result = processStatus(commandResults);
		// will return the status code to trigger next step
		if (result == 429 || result == 409) {
			// Over API threshold limit or backend busy. Wait apiWaitDelay value and try again.
			setTimeout(deleteL2VLAN, apiWaitDelay, profileName);
		} else if (result !== 200) {
			logError('Unable to delete VLAN '+ profileName);
			showNotification('ca-bin', 'Unable to delete VLAN profile', 'bottom', 'center', 'danger');
		} else {
			logInformation('VLAN '+ profileName + ' was deleted');
			showNotification('ca-bin', 'VLAN '+profileName+' was successfully deleted', 'bottom', 'center', 'success');
		}
		updateInformation();
		logEnd('VLAN Deletion complete');
	}).catch(function(err) {
		logError('Failed to delete VLAN '+profileName);
	});
}


/*  -------------------------------------------------------------------------------------------------------------------------------------------------------------------------
	JSON UI
------------------------------------------------------------------------------------------------------------------------------------------------------------------------- */

function loadJSONUI(profileName) {
	let profile = null;
	profiles.forEach(function(p) {
		let currentProfile = { ...p };
		if (currentProfile['vlan'].toString() === profileName) profile = currentProfile;
	});
	if (!profile) return;

	let cleanProfile = profile['vlan'].toString();
	let isSplitView = profile['is-l3-vlan'] === true;
	let primaryConfig = { ...profile };
	let secondaryConfig = null;
	let primarySave = document.getElementById('json-save-primary');
	let secondarySave = document.getElementById('json-save-secondary');
	let primaryCancel = document.getElementById('json-cancel-primary');
	let secondaryCancel = document.getElementById('json-cancel-secondary');
	let primaryActions = document.getElementById('json-primary-actions');
	let secondaryActions = document.getElementById('json-secondary-actions');
	let primaryColumn = document.getElementById('json-primary-column');
	let secondaryColumn = document.getElementById('json-secondary-column');
	let secondaryPane = document.getElementById('json-secondary-pane');
	let modalBody = document.getElementById('json-editor-body');

	jsonEditorState.primary = {
		profileName: profileName,
		endpointBase: profileEndpoint,
		type: 'SHARED',
		scope: '',
		persona: ''
	};
	if (primaryConfig['@'] && primaryConfig['@']['aruba-annotation:object_type'] === 'LOCAL') {
		let scopeInfo = [{ scope_name: '', device_function: '' }];
		if (primaryConfig['@']['aruba-annotation:scope_device_function']) {
			scopeInfo = parseScopeDeviceFunction(primaryConfig['@']['aruba-annotation:scope_device_function']);
		}
		jsonEditorState.primary.type = 'LOCAL';
		jsonEditorState.primary.scope = scopeInfo[0]['scope_id'];
		jsonEditorState.primary.persona = scopeInfo[0]['device_function'];
	}
	delete primaryConfig['@'];
	document.getElementById('profileConfig').value = JSON.stringify(primaryConfig, null, 2);
	if (isSplitView) {
		let profileId = parseInt(profileName, 10);
		secondaryConfig = profilesL3ById[profileId] || profilesL3ById[cleanProfile] || null;
		if (secondaryConfig) {
			let secondaryConfigCopy = { ...secondaryConfig };
			jsonEditorState.secondary = {
				profileName: profileName,
				endpointBase: profileEndpointL3,
				type: 'SHARED',
				scope: '',
				persona: ''
			};
			if (secondaryConfigCopy['@'] && secondaryConfigCopy['@']['aruba-annotation:object_type'] === 'LOCAL') {
				let scopeInfo = [{ scope_name: '', device_function: '' }];
				if (secondaryConfigCopy['@']['aruba-annotation:scope_device_function']) {
					scopeInfo = parseScopeDeviceFunction(secondaryConfigCopy['@']['aruba-annotation:scope_device_function']);
				}
				jsonEditorState.secondary.type = 'LOCAL';
				jsonEditorState.secondary.scope = scopeInfo[0]['scope_id'];
				jsonEditorState.secondary.persona = scopeInfo[0]['device_function'];
			}
			delete secondaryConfigCopy['@'];
			document.getElementById('profileConfigL3').value = JSON.stringify(secondaryConfigCopy, null, 2);
		}
	}

	if (modalBody) modalBody.classList.toggle('json-editor-split', isSplitView);
	if (primaryColumn) {
		primaryColumn.classList.toggle('col-xl-6', isSplitView);
		primaryColumn.classList.toggle('col-12', !isSplitView);
	}
	if (secondaryColumn) {
		secondaryColumn.classList.toggle('d-none', !isSplitView);
		secondaryColumn.classList.toggle('col-xl-6', isSplitView);
	}
	if (secondaryPane) secondaryPane.classList.toggle('d-none', !isSplitView);
	if (primarySave) {
		primarySave.dataset.jsonEditor = 'primary';
		primarySave.textContent = isSplitView ? 'Save Layer 2 VLAN' : 'Save';
	}
	if (secondarySave) {
		secondarySave.dataset.jsonEditor = 'secondary';
		secondarySave.textContent = 'Save Interface VLAN';
	}
	if (primaryCancel) primaryCancel.textContent = 'Cancel';
	if (secondaryCancel) secondaryCancel.textContent = 'Cancel';
	if (primaryActions) primaryActions.classList.toggle('d-none', false);
	if (secondaryActions) secondaryActions.classList.toggle('d-none', !isSplitView);
	if (!isSplitView) document.getElementById('profileConfigL3').value = '';
	document.getElementById('json-title').innerHTML = 'VLAN ' + cleanProfile + ' Configuration';
	new bootstrap.Modal(document.getElementById('JSONModal')).show();
}

function closeJSON() {
	jsonEditorState.primary = null;
	jsonEditorState.secondary = null;
	(bootstrap.Modal.getInstance(document.getElementById('JSONModal')) || new bootstrap.Modal(document.getElementById('JSONModal'))).hide();
}

function updateJSON(saveButton) {
	let editorKey = 'primary';
	if (saveButton && saveButton.dataset && saveButton.dataset.jsonEditor) editorKey = saveButton.dataset.jsonEditor;
	let editorState = jsonEditorState[editorKey];
	if (!editorState) return;

	let textareaId = editorKey === 'secondary' ? 'profileConfigL3' : 'profileConfig';
	let config = document.getElementById(textareaId).value;
	if (!isValidJSON(config)) showNotification('ca-window-code', 'Input is not valid JSON', 'bottom', 'center', 'warning')
	else {
		logStart('Updating VLAN Profile: '+editorState.profileName);
		authenticateWithCentral().then(function() {
			if (saveNotification) saveNotification.close();
			saveNotification = showNotification('ca-ap-icon3', 'Saving Profile: "'+editorState.profileName+'"...' , 'bottom', 'center', 'info');

			let command = buildProfileSaveCommand(editorState);

			fetchProxyWithAuth('/tools/putCommandwHeaders', {
				url: localStorage.getItem('base_url') + command,
				access_token: localStorage.getItem('access_token'),
				data: config,
			})
			.then(function(commandResults) {
				let result = processStatus(commandResults);
				// will return the status code to trigger next step
				if (result == 429 || result == 409) {
					// Over API threshold limit. Wait 'apiWaitDelay' value and try again.
					if (saveNotification) {
						saveNotification.update({ type: 'danger', message: 'Unable to save profile: "'+editorState.profileName+'". API Rate Limit hit. Please try again.' });
						setTimeout(saveNotification.close, 2000);
					}
				} else if (result == 400) {
					logError('Unable to update AP System profile: '+editorState.profileName);
					if (saveNotification) {
						message = JSON.parse(commandResults['responseBody']);
						saveNotification.update({ type: 'warning', message: 'Unable to save profile: "'+ editorState.profileName+'"<br> '+ message['message'] });
						setTimeout(profileNotification.close, 10000);
					}
				} else if (result !== 200) {
					logError('Unable to update VLAN profile: '+editorState.profileName);
				} else {
					logInformation('VLAN profile: ' + editorState.profileName + ' was updated successfully');
					if (saveNotification) {
						saveNotification.update({ type: 'success', message: 'VLAN profile was updated' });
						setTimeout(profileNotification.close, 1000);
					}
					(bootstrap.Modal.getInstance(document.getElementById('JSONModal')) || new bootstrap.Modal(document.getElementById('JSONModal'))).hide();
					updateInformation();
				}
			});
		});
	}
}


/*  -------------------------------------------------------------------------------------------------------------------------------------------------------------------------
	Create new profile
------------------------------------------------------------------------------------------------------------------------------------------------------------------------- */
function createVLAN() {
	resetTemplateToDefault();
	document.getElementById("vlanList").value = '';
	document.getElementById("vlanList").readOnly = false;
	document.getElementById("is-l3-vlan").disabled = false;
	document.getElementById("create-title").innerHTML = 'Create VLAN';
	document.getElementById('createBtn').hidden = false;
	document.getElementById('updateBtn').hidden = true;
	new bootstrap.Modal(document.getElementById('createModal')).show();
}

function closeCreate() {
	(bootstrap.Modal.getInstance(document.getElementById('createModal')) || new bootstrap.Modal(document.getElementById('createModal'))).hide();
}

function resetTemplateToDefault() {
	document.getElementById("enable").checked = true;
	document.getElementById("dhcpv4-snooping").checked = false;
	document.getElementById("dhcpv6-snooping").checked = false;
	document.getElementById("voice-enable").checked = false;
	document.getElementById("client-ip-tracker-enable").checked = false;
	
	changeL3State(false);
	document.getElementById("is-l3-vlan").checked = false;
	document.getElementById("l3-enable").checked = true;
	document.getElementById("bcmc-optimization").checked = false;
	document.getElementById("deny-inter-user-bridging").checked = false;
	document.getElementById("oper-state-up").checked = false;
	document.getElementById("forwarding").checked = true;
	document.getElementById("suppress-arp").checked = false;
}

function changeL3State(state) {
	let layer3knobs = document.getElementsByClassName("l3Features");
	for (const el of layer3knobs) {
		if (state) el.style.display = "block";
		else el.style.display = "none";
	}
}

function createProfile() {
	authenticateWithCentral().then(function() {
		logStart('Creating VLANs in Central');
		// Determine actual list of VLAN IDs for creation.
		let vlanString = document.getElementById("vlanList").value;
		if (!validateNumberList(vlanString)) {
			document.getElementById("vlanList").classList.add("is-invalid");
			return;
		} else {
			document.getElementById("vlanList").classList.remove("is-invalid");
		}
		
		// Convert the input string into array of individual VLAN IDs
		let originalList = parseNumberList(vlanString)
		
		// Check if VLAN is already created.
		let skippingVlans = [];
		profiles.forEach(function(p) {
			if (originalList.includes(p[profileUniqueLeaf])) {
				logInformation('VLAN '+p[profileUniqueLeaf]+' already exists, no need to create. Skipping');
				skippingVlans.push(p[profileUniqueLeaf]);
			}
		});
	
		// Remove the skipping VLANs from the original list
		const toRemoveSet = new Set(skippingVlans);
		vlanList = originalList.filter(item => !toRemoveSet.has(item));
	
		Swal.fire({
			title: 'Create VLANs',
			html: vlanList.length+' VLANs are about to be created.<br />'+skippingVlans.length+' VLANs already exist.<br /><br />Are you ready to create VLANs?',
			icon: 'question',
			showCancelButton: true,
			confirmButtonColor: '#3085d6',
			cancelButtonColor: '#888888',
			confirmButtonText: 'Yes',
			cancelButtonText: 'No',
		}).then(result => {
			if (result.isDismissed) {
				return false;
			} else {
				createVLANsFromList();
			}
		});
	});
}

function createVLANsFromList() {
	vlanNotification = showProgressNotification('ca-vlan-config', 'Creating VLANs', 'bottom', 'center', 'info')
	vlanFailedVLANs = [];
	vlanListCounter = 0;
	let timeoutCounter = 0;
	
	// build config using template
	templateL2Config = {
		"enable": document.getElementById("enable").checked
	};
	if (document.getElementById("dhcpv4-snooping").checked) {
		templateL2Config['dhcpv4-snooping'] = {};
		templateL2Config['dhcpv4-snooping']['enable'] = true;
	}
	if (document.getElementById("dhcpv6-snooping").checked) {
		templateL2Config['dhcpv6-snooping'] = {};
		templateL2Config['dhcpv6-snooping']['enable'] = true;
	}
	if (document.getElementById("voice-enable").checked) templateL2Config['voice-enable'] = true;
	if (document.getElementById("client-ip-tracker-enable").checked) templateL2Config['client-ip-tracker-enable'] = true;
	
	templateL3Config = null;
	if (document.getElementById("is-l3-vlan").checked) {
		// need to create L3 VLAN
		templateL3Config = {};
		templateL3Config["enable"] = document.getElementById("l3-enable").checked;
		templateL3Config["bcmc-optimization"] = document.getElementById("bcmc-optimization").checked;
		templateL3Config["oper-state-up"] = document.getElementById("oper-state-up").checked;
		templateL3Config["deny-inter-user-bridging"] = document.getElementById("deny-inter-user-bridging").checked;
		let ipConfig = {
			"forwarding": document.getElementById("forwarding").checked,
			"suppress-arp": document.getElementById("suppress-arp").checked,
			"nat-inside": document.getElementById("nat-inside").checked,
			"nat-outside": document.getElementById("nat-outside").checked
		}
		//if (document.getElementById("ipv4-address").value !== '') ipConfig['address'] = document.getElementById("ipv4-address").value;
		templateL3Config['ipv4'] = ipConfig;
		
		if (proxyModeSelector.getValue(true) !== 'DISABLED') {
			let igmpConfig = {};
			if (proxyModeSelector.getValue(true) === 'igmp-proxy-eth') igmpConfig['igmp-proxy-eth'] = document.getElementById("igmp-proxy-eth").value;
			else if (proxyModeSelector.getValue(true) === 'igmp-proxy-pchannel') igmpConfig['igmp-proxy-pchannel'] = portChannelSelector.getValue(true);
			else igmpConfig['igmp-proxy-vxlan'] = document.getElementById("igmp-proxy-vxlan").value;
			templateL3Config['igmp'] = igmpConfig;
		}
	}

	vlanList.forEach(function(vlan) {
		setTimeout(addL2VLAN, apiWaitDelay * timeoutCounter, parseInt(vlan));
		timeoutCounter++;
	});
}

function addL2VLAN(vlanID) {	
	fetchProxyWithAuth('/tools/postCommandwHeaders', {
		url: localStorage.getItem('base_url') + profileEndpoint + '/' + vlanID,
		access_token: localStorage.getItem('access_token'),
		data: JSON.stringify(templateL2Config),
	})
	.then(function(commandResults) {
		if (commandResults.hasOwnProperty('headers')) {
			//updateAPILimits(JSON.parse(commandResults.headers));
		}
		// Process The status code of the result
		let result = processStatus(commandResults);
		// will return the status code to trigger next step
		if (result == 429 || result == 409) {
			// Over API threshold limit or backend busy. Wait apiWaitDelay value and try again.
			setTimeout(addL2VLAN, apiWaitDelay, vlanID);
		} else if (result !== 200) {
			vlanFailedVLANs.push(vlanID);
		}
		checkVLANComplete();
	});
}

function checkVLANComplete() {
	vlanListCounter++;
	let progress = (vlanListCounter / vlanList.length) * 100
	if (vlanNotification) vlanNotification.update({ progress: progress });
	if (vlanListCounter >= vlanList.length) {
		if (vlanNotification) setTimeout(vlanNotification.close, 1000);
		
		if (vlanFailedVLANs.length !== 0) {
			logError('The following VLANs failed to be created: '+vlanFailedVLANs.join(','))
			logEnd('VLAN creation completed');
			updateInformation();
			hideModalThenSwal('createModal', {
				title: 'Unable to create all VLANs',
				html: 'Some VLANs failed to be created in Central',
				icon: 'warning',
				showCancelButton: true,
				confirmButtonColor: '#3085d6',
				cancelButtonColor: '#888888',
				confirmButtonText: 'OK',
				cancelButtonText: 'Show Log',
			}).then(result => {
				if (result.isDismissed) setTimeout(showLog,500);
			});
		} else {
			if (templateL3Config !== null) {
				createL3VLANS();
			} else {
				logInformation('The following VLANs were created: '+vlanList.join(','))
				logEnd(vlanList.length + ' VLANs were created');
				updateInformation();
				hideModalThenSwal('createModal', {
					title: 'VLANs created',
					html: 'All VLANs were created in Central',
					icon: 'success',
					showCancelButton: true,
					confirmButtonColor: '#3085d6',
					cancelButtonColor: '#888888',
					confirmButtonText: 'OK',
					cancelButtonText: 'Show Log',
				}).then(result => {
					if (result.isDismissed) setTimeout(showLog,500);
				});
			}
		}
		
	}
}

function createL3VLANS() {
	if (vlanNotification) vlanNotification.close();
	vlanNotification = showProgressNotification('ca-vlan-config', 'Creating L3 VLANs', 'bottom', 'center', 'info');
	
	l3VlanListCounter = 0;
	l3VlanFailedVLANs = [];
	let timeoutCounter = 0;
	vlanList.forEach(function(vlan) {
		setTimeout(addL3VLAN, apiWaitDelay * timeoutCounter, parseInt(vlan));
		timeoutCounter++;
	});
}

function addL3VLAN(vlanID) {	
	fetchProxyWithAuth('/tools/postCommandwHeaders', {
		url: localStorage.getItem('base_url') + profileEndpointL3 + '/' + vlanID,
		access_token: localStorage.getItem('access_token'),
		data: JSON.stringify(templateL3Config),
	})
	.then(function(commandResults) {
		if (commandResults.hasOwnProperty('headers')) {
			//updateAPILimits(JSON.parse(commandResults.headers));
		}
		// Process The status code of the result
		let result = processStatus(commandResults);
		// will return the status code to trigger next step
		if (result == 429 || result == 409) {
			// Over API threshold limit or backend busy. Wait apiWaitDelay value and try again.
			setTimeout(addL3VLAN, apiWaitDelay, vlanID);
		} else if (result !== 200) {
			l3VlanFailedVLANs.push(vlanID);
		}
		checkL3VLANComplete();
	});
}

function checkL3VLANComplete() {
	l3VlanListCounter++;
	let progress = (l3VlanListCounter / vlanList.length) * 100
	if (vlanNotification) vlanNotification.update({ progress: progress });
	if (l3VlanListCounter >= vlanList.length) {
		if (vlanNotification) setTimeout(vlanNotification.close, 1000);
		
		if (l3VlanFailedVLANs.length !== 0) {
			logError('The following VLANs failed to be created: '+vlanFailedVLANs.join(','))
			logEnd('VLAN creation completed');
			hideModalThenSwal('createModal', {
				title: 'Unable to create all L3 VLANs',
				html: 'Some VLANs failed to be created in Central',
				icon: 'warning',
				showCancelButton: true,
				confirmButtonColor: '#3085d6',
				cancelButtonColor: '#888888',
				confirmButtonText: 'OK',
				cancelButtonText: 'Show Log',
			}).then(result => {
				if (result.isDismissed) setTimeout(showLog,500);
			});
		} else {
			logInformation('The following VLANs were created: '+vlanList.join(','))
			logEnd(vlanList.length + ' VLANs were created');
			hideModalThenSwal('createModal', {
				title: 'VLANs created',
				html: 'All VLANs were created in Central',
				icon: 'success',
				showCancelButton: true,
				confirmButtonColor: '#3085d6',
				cancelButtonColor: '#888888',
				confirmButtonText: 'OK',
				cancelButtonText: 'Show Log',
			}).then(result => {
				if (result.isDismissed) setTimeout(showLog,500);
			});
		}
		updateInformation();
	}
}

function loadEditUI(profileName) {
	
	resetTemplateToDefault();
	
	let profile = null;
	profiles.forEach(function(p) {
		let currentProfile = { ...p };
		if (currentProfile['vlan'].toString() === profileName) profile = currentProfile;
	});
	if (!profile) return;
	editingProfile = profileName;
	
	let cleanProfile = profile['vlan'].toString();
	let profileId = parseInt(profileName, 10);
	let l3Config = profilesL3ById[profileId] || profilesL3ById[cleanProfile] || null;
	
	//console.log(profile)
	//console.log(l3Config)
	
	document.getElementById("vlanList").readOnly = true;
	document.getElementById("is-l3-vlan").disabled = true;
	document.getElementById("vlanList").value = profile.vlan;
	document.getElementById("create-title").innerHTML = 'Edit VLAN';
	
	// L2
	if (profile.enable) document.getElementById("enable").checked = profile.enable;
	else document.getElementById("enable").checked = true;
	if (profile['dhcpv4-snooping'] && profile['dhcpv4-snooping']['enable']) document.getElementById("dhcpv4-snooping").checked = profile['dhcpv4-snooping']['enable'];
	else document.getElementById("dhcpv4-snooping").checked = false;
	if (profile['dhcpv6-snooping'] && profile['dhcpv6-snooping']['enable']) document.getElementById("dhcpv6-snooping").checked = profile['dhcpv6-snooping']['enable'];
	else document.getElementById("dhcpv6-snooping").checked = false;
	if (profile['voice-enable']) document.getElementById("voice-enable").checked = profile['voice-enable'];
	else document.getElementById("voice-enable").checked = false;
	if (profile['client-ip-tracker-enable']) document.getElementById("client-ip-tracker-enable").checked = profile['client-ip-tracker-enable'];
	else document.getElementById("client-ip-tracker-enable").checked = false;
	
	// L3
	if (profile['is-l3-vlan']) document.getElementById("is-l3-vlan").checked = profile['is-l3-vlan'];
	else document.getElementById("is-l3-vlan").checked = false;
	changeL3State(document.getElementById("is-l3-vlan").checked);
	if (document.getElementById("is-l3-vlan").checked) {
		if (l3Config['enable']) document.getElementById("l3-enable").checked = l3Config['enable'];
		else document.getElementById("l3-enable").checked = true;
		if (l3Config['bcmc-optimization']) document.getElementById("bcmc-optimization").checked = l3Config['bcmc-optimization'];
		else document.getElementById("bcmc-optimization").checked = false;
		if (l3Config['deny-inter-user-bridging']) document.getElementById("deny-inter-user-bridging").checked = l3Config['deny-inter-user-bridging'];
		else document.getElementById("deny-inter-user-bridging").checked = false;
		if (l3Config['oper-state-up']) document.getElementById("oper-state-up").checked = l3Config['oper-state-up'];
		else document.getElementById("oper-state-up").checked = false;
		if (l3Config['ipv4']['forwarding']) document.getElementById("forwarding").checked = l3Config['ipv4']['forwarding'];
		else document.getElementById("forwarding").checked = true;
		if (l3Config['ipv4']['suppress-arp']) document.getElementById("suppress-arp").checked = l3Config['ipv4']['suppress-arp'];
		else document.getElementById("suppress-arp").checked = false;
		// IGMP
		if (l3Config['igmp']) {
			if (l3Config['igmp']['igmp-proxy-eth']) {
				console.log(l3Config['igmp']['igmp-proxy-eth'])
				document.getElementById("igmp-proxy-eth").value = l3Config['igmp']['igmp-proxy-eth'];
				proxyModeSelector.setChoiceByValue('igmp-proxy-eth');
			} else document.getElementById("igmp-proxy-eth").value = '';
			if (l3Config['igmp']['igmp-proxy-pchannel']) {
				proxyModeSelector.setChoiceByValue('igmp-proxy-pchannel');
				portChannelSelector.setChoiceByValue(l3Config['igmp']['igmp-proxy-pchannel']);
			}
			if (l3Config['igmp']['igmp-proxy-vxlan']) {
				document.getElementById("igmp-proxy-vxlan").value = l3Config['igmp']['igmp-proxy-vxlan'];
				proxyModeSelector.setChoiceByValue('igmp-proxy-vxlan');
			} else document.getElementById("igmp-proxy-vxlan").value = '';
		} else {
			proxyModeSelector.setChoiceByValue('DISABLED');
		}
		changeIGMP();
	}
	document.getElementById('createBtn').hidden = true;
	document.getElementById('updateBtn').hidden = false;
	new bootstrap.Modal(document.getElementById('createModal')).show();
}

function updateUIProfile() {
	
	// some basic validation.
	const regex = /^\d\/\d\/\d$/;
	if (proxyModeSelector.getValue(true) !== 'DISABLED') {
		if (proxyModeSelector.getValue(true) === 'igmp-proxy-eth' && (!regex.test(document.getElementById("igmp-proxy-eth").value))) {
			showNotification('ca-vlan-config', 'Please enter a valid Ethernet Interface', 'bottom', 'center', 'warning');
			return;
		} else if (proxyModeSelector.getValue(true) === 'igmp-proxy-vxlan' && document.getElementById("igmp-proxy-vxlan").value === '') { 
			showNotification('ca-vlan-config', 'Please enter a valid VXLAN Interface', 'bottom', 'center', 'warning');
			return;
		}
	}
	
	let l2Config = null;
	profiles.forEach(function(p) {
		let currentProfile = { ...p };
		if (currentProfile['vlan'].toString() === editingProfile) l2Config = currentProfile;
	});
	if (!l2Config) return;
	
	vlanFailedVLANs = [];
	vlanListCounter = 0;
	l3VlanFailedVLANs = [];
	l3VlanListCounter = 0;
	
	let cleanProfile = l2Config['vlan'].toString();
	let profileId = parseInt(editingProfile, 10);
	let l3Config = profilesL3ById[profileId] || profilesL3ById[cleanProfile] || null;
	
	logStart('Updating VLAN '+ cleanProfile)
	if (vlanNotification) vlanNotification.close();
	vlanNotification = showProgressNotification('ca-vlan-config', 'Updating VLAN '+ cleanProfile + '...', 'bottom', 'center', 'info');
	
	// create deep copies
	l2Config = JSON.parse(JSON.stringify(l2Config));
	if (l3Config) l3Config = JSON.parse(JSON.stringify(l3Config));
	//console.log(l2Config)
	//console.log(l3Config)
	
	delete l2Config['@'];
	delete l2Config['is-l3-vlan'];
	delete l3Config['@'];
	// Update saved profiles with new config
	l2Config['enable'] = document.getElementById("enable").checked;
	if (!l2Config['dhcpv4-snooping']) l2Config['dhcpv4-snooping'] = {};
	l2Config['dhcpv4-snooping']['enable'] = document.getElementById("dhcpv4-snooping").checked;
	
	if (!l2Config['dhcpv6-snooping']) l2Config['dhcpv6-snooping'] = {};
	l2Config['dhcpv6-snooping']['enable'] = document.getElementById("dhcpv4-snooping").checked;
	l2Config['voice-enable'] = document.getElementById("voice-enable").checked;
	l2Config['client-ip-tracker-enable'] = document.getElementById("client-ip-tracker-enable").checked
	
	if (document.getElementById("is-l3-vlan").checked) {
		l3Config["enable"] = document.getElementById("l3-enable").checked;
		l3Config["bcmc-optimization"] = document.getElementById("bcmc-optimization").checked;
		l3Config["oper-state-up"] = document.getElementById("oper-state-up").checked;
		l3Config["deny-inter-user-bridging"] = document.getElementById("deny-inter-user-bridging").checked;
		
		if (!l3Config['ipv4']) l3Config['ipv4'] = {};
		l3Config['ipv4']["forwarding"] = document.getElementById("forwarding").checked;
		l3Config['ipv4']["suppress-arp"] = document.getElementById("suppress-arp").checked;
		l3Config['ipv4']["nat-inside"] = document.getElementById("nat-inside").checked;
		l3Config['ipv4']["nat-outside"] = document.getElementById("nat-outside").checked;
		
		//if (document.getElementById("ipv4-address").value !== '') l3Config['ipv4']['address'] = document.getElementById("ipv4-address").value;
		
		if (proxyModeSelector.getValue(true) !== 'DISABLED') {
			let igmpConfig = {};
			if (proxyModeSelector.getValue(true) === 'igmp-proxy-eth') igmpConfig['igmp-proxy-eth'] = document.getElementById("igmp-proxy-eth").value;
			else if (proxyModeSelector.getValue(true) === 'igmp-proxy-pchannel') igmpConfig['igmp-proxy-pchannel'] = portChannelSelector.getValue(true);
			else igmpConfig['igmp-proxy-vxlan'] = document.getElementById("igmp-proxy-vxlan").value;
			l3Config['igmp'] = igmpConfig;
		} else if (l3Config['igmp']) delete l3Config['igmp'];
	}
	//console.log(l2Config)
	//console.log(l3Config)
	
	//save back to Central
	vlanUpdateCounter = 0;
	vlanUpdateError = 0
	if (l3Config) vlanUpdateTotal = 2;
	else vlanUpdateTotal = 1;
	
	updateL2VLAN(l2Config);
	if (l3Config) updateL3VLAN(l3Config);
}

function updateL2VLAN(profile) {
	fetchProxyWithAuth('/tools/putCommandwHeaders', {
		url: localStorage.getItem('base_url') + profileEndpoint + '/' + profile.vlan,
		access_token: localStorage.getItem('access_token'),
		data: JSON.stringify(profile),
	})
	.then(function(commandResults) {
		if (commandResults.hasOwnProperty('headers')) {
			//updateAPILimits(JSON.parse(commandResults.headers));
		}
		// Process The status code of the result
		let result = processStatus(commandResults);
		// will return the status code to trigger next step
		if (result == 429 || result == 409) {
			// Over API threshold limit or backend busy. Wait apiWaitDelay value and try again.
			setTimeout(updateL2VLAN, apiWaitDelay, profile);
		} else if (result !== 200) {
			console.log(commandResults)
			logError('Unable to save L2 VLAN')
			vlanUpdateError++
			checkVLANUpdated();
		} else {
			checkVLANUpdated();
		}
	});
}


function updateL3VLAN(profile) {
	
	fetchProxyWithAuth('/tools/putCommandwHeaders', {
		url: localStorage.getItem('base_url') + profileEndpointL3 + '/' + profile.id,
		access_token: localStorage.getItem('access_token'),
		data: JSON.stringify(profile),
	})
	.then(function(commandResults) {
		if (commandResults.hasOwnProperty('headers')) {
			//updateAPILimits(JSON.parse(commandResults.headers));
		}
		// Process The status code of the result
		let result = processStatus(commandResults);
		// will return the status code to trigger next step
		if (result == 429 || result == 409) {
			// Over API threshold limit or backend busy. Wait apiWaitDelay value and try again.
			setTimeout(updateL3VLAN, apiWaitDelay, profile);
		} else if (result !== 200) {
			console.log(commandResults)
			logError('Unable to save L3 VLAN')
			vlanUpdateError++;
			checkVLANUpdated();
		} else {
			checkVLANUpdated();
		}
	});
}

function checkVLANUpdated() {
	vlanUpdateCounter++;
	let progress = (vlanUpdateCounter / vlanUpdateTotal) * 100
	if (vlanNotification) vlanNotification.update({ progress: progress });
	if (vlanUpdateCounter >= vlanUpdateTotal) {
		if (vlanNotification) setTimeout(vlanNotification.close, 1000);
		if (vlanUpdateError > 0) {
			hideModalThenSwal('createModal', {
				title: 'Unable to update VLAN',
				icon: 'warning',
				showCancelButton: true,
				confirmButtonColor: '#3085d6',
				cancelButtonColor: '#888888',
				confirmButtonText: 'OK',
				cancelButtonText: 'Show Log',
			}).then(result => {
				if (result.isDismissed) setTimeout(showLog,500);
			});
		} else {
			logInformation('The VLAN was updated successfully')
			hideModalThenSwal('createModal', {
				title: 'VLANs Updated',
				icon: 'success',
				showCancelButton: true,
				confirmButtonColor: '#3085d6',
				cancelButtonColor: '#888888',
				confirmButtonText: 'OK',
				cancelButtonText: 'Show Log',
			}).then(result => {
				if (result.isDismissed) setTimeout(showLog,500);
			});
		}
		
		logEnd('Completed updating VLAN')
		updateInformation();
	}
}

/*  -------------------------------------------------------------------------------------------------------------------------------------------------------------------------
	Assigning profile
------------------------------------------------------------------------------------------------------------------------------------------------------------------------- */
// Open assign panel
function openAssign() {
	document.getElementById("assignList").value = '';
	assignHierarchySelector.removeActiveItems();
	deviceFunctionSelector.removeActiveItems();
	new bootstrap.Modal(document.getElementById('assignModal')).show();
}

function closeAssign() {
	(bootstrap.Modal.getInstance(document.getElementById('assignModal')) || new bootstrap.Modal(document.getElementById('assignModal'))).hide();
}

// Verify the input (profile list,etc) is valid
function verifyAssign() {
	let vlanString = document.getElementById("assignList").value;
	if (!validateNumberList(vlanString)) {
		document.getElementById("assignList").classList.add("is-invalid");
		showNotification('ca-n-check', 'Invalid VLAN list', 'bottom', 'center', 'warning');
		return;
	} else {
		document.getElementById("assignList").classList.remove("is-invalid");
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
	let vlanString = document.getElementById("assignList").value;
	if (!validateNumberList(vlanString)) {
		document.getElementById("assignList").classList.add("is-invalid");
		showNotification('ca-n-check', 'Invalid VLAN list', 'bottom', 'center', 'warning');
		return;
	} else {
		document.getElementById("assignList").classList.remove("is-invalid");
	}
	
	unassignProfile();
}

// build list of profiles and call generic function
function getProfileList(isAssigning) {
	// build list of profiles that need to be assigned...
	let vlanString = document.getElementById("assignList").value;
	
	// Convert the input string into array of individual VLAN IDs
	let originalList = parseNumberList(vlanString)
	// Check if VLAN is already created (VLANs that exist from the input list)
	let profileList = [];
	profiles.forEach(function(profile) {
		if (originalList.includes(profile[profileUniqueLeaf])) {
			profileList.push(profile);
		}
	});
	
	// call generic assign workflow
	if (isAssigning) assignConfirmed(profileList, profileType, profileName, profileUniqueLeaf,singleInstance);
	else unassignConfirmed(profileList, profileType, profileName, profileUniqueLeaf);
}


/*  -------------------------------------------------------------------------------------------------------------------------------------------------------------------------
	Utility functions
------------------------------------------------------------------------------------------------------------------------------------------------------------------------- */

// Convert VLAN input string into array of individual IDs
function parseNumberList(input) {
  const result = [];

  for (const part of input.split(',')) {
	const trimmed = part.trim();
	if (trimmed.includes('-')) {
	  const [start, end] = trimmed.split('-').map(Number);
	  for (let i = start; i <= end; i++) result.push(i);
	} else {
	  result.push(Number(trimmed));
	}
  }

  return result;
}

// Verify the input is the correct format
function validateNumberList(input) {
  if (typeof input !== 'string' || input.trim() === '') return false;

  const parts = input.split(',');

  return parts.every(part => {
	const trimmed = part.trim();

	// Match a single number
	if (/^\d+$/.test(trimmed)) return true;

	// Match a range (e.g. 10-15)
	if (/^\d+-\d+$/.test(trimmed)) {
	  const [start, end] = trimmed.split('-').map(Number);
	  return start < end;
	}

	return false;
  });
}

function padNumberForSort(n) {
  return String(n).padStart(4, '0');
}
