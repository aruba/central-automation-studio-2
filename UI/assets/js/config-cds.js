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

var option82Selector;

var profileSelector;
const profileName = 'Context Delivery Service'
const profileUniqueLeaf = 'name'
const profileType = 'cds';
const singleInstance = true;

var deletePromise;
var deleteResolve;
var deleteReject;

var profileEndpoint = '/network-config/v1/cds';
var uiURL = '/gravity/monitoring/config/profiles/cds';
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
}

function populateProfileChoice() {
	let pElement = document.getElementById('profileselector');
	if (pElement) {
		if (!profileSelector) {
			profileSelector = new Choices(pElement, {
				searchEnabled: false,
				shouldSort: true,
				itemSelectText: "Press to select",
				removeItemButton:false
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
	profileNotification = showNotification('ca-content-delivery', 'Obtaining profiles...', 'bottom', 'center', 'info');
	
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
				profileNotification.update({ type: 'danger', message: 'Failed to retrieve CDS Profiles' });
				setTimeout(profileNotification.close, 2000);
			}
		} else {
			let response = JSON.parse(commandResults.responseBody);
			console.log(response)
			if (response['profile']) profiles = profiles.concat(response['profile']);
			offset = response.offset;
			if (offset) {
				let getProgress = ((profiles.length) / response.total) * 100;
				profileNotification.update({ progress: getProgress });
				getProfiles(offset,scope);
			} else {
				if (profileNotification) {
					profileNotification.update({ progress: 100, type: 'success', message: 'Retrieved CDS Profiles' });
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
		
		if (scopeDescriptions.length == 1 && scopeDescriptions[0] === '-') {
			actionBtns += '<a class="btn btn-link btn-warning mt-2" data-bs-toggle="tooltip" data-bs-placement="top" data-container="body" data-animation="true" title="Delete WLAN" onclick="deleteProfile(\'' + profileName + '\')"><i class="fa-solid fa-trash-can" style="color: #67748e; font-size:18px;"></i></a> ';
		}

		// Add row to table
		table.row.add([icon, '<a href="' + centralURL + '" target="_blank"><strong>' + profileName + '</strong></a><br />'+description, scopeDescriptions.join('<br>'), actionBtns]);
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
		logStart('Deleting CDS profile: '+ profileName);
		deleteCDSProfile(profileName);
	});
}

function deleteCDSProfile(profileName) {
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
			setTimeout(deleteSystem, apiWaitDelay, profileName);
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
			document.getElementById('json-title').innerHTML = 'CDS Configuration: <strong>'+ cleanProfile + '</strong>'
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
		logStart('Updating CDS Profile: '+editingProfile);
		authenticateWithCentral().then(function() {
			if (saveNotification) saveNotification.close();
			saveNotification = showNotification('ca-content-delivery', 'Saving Profile: "'+editingProfile+'"...' , 'bottom', 'center', 'info');

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
					logError('Unable to update CDS profile: '+editingProfile);
					if (saveNotification) {
						message = JSON.parse(commandResults['responseBody']);
						saveNotification.update({ type: 'warning', message: 'Unable to save profile: "'+ editingProfile+'"<br> '+ message['message'] });
						setTimeout(profileNotification.close, 10000);
					}
				} else if (result !== 200) {
					logError('Unable to update CDS profile: '+editingProfile);
				} else {
					logInformation('AP System profile: ' + editingProfile + ' was updated successfully');
					if (saveNotification) {
						saveNotification.update({ type: 'success', message: 'CDS profile was updated' });
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
	document.getElementById("profileName").disabled = true;
	document.getElementById("create-title").innerHTML = 'Save Profile';
	document.getElementById('createBtn').hidden = true;
	document.getElementById('updateBtn').hidden = false;
	
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
			
			// General Config
			if (profile.hasOwnProperty('auth-surv')) document.getElementById('auth-surv').checked = profile['auth-surv'];
			else document.getElementById('auth-surv').checked = true;
			if (profile.hasOwnProperty('denylist-client')) document.getElementById('denylist-client').checked = profile['denylist-client'];
			else document.getElementById('denylist-client').checked = true;
			
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

	//General Config
	editingConfig['auth-surv'] = document.getElementById('auth-surv').checked;
	editingConfig['denylist-client'] = document.getElementById('denylist-client').checked;

	
	// Save back to Central
	logStart('Updating CDS Profile: '+editingProfile);
	authenticateWithCentral().then(function() {
		if (saveNotification) saveNotification.close();
		saveNotification = showNotification('ca-content-delivery', 'Saving Profile: "'+editingProfile+'"...' , 'bottom', 'center', 'info');

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
					saveNotification.update({ type: 'danger', message: 'Unable to save CDS: "'+editingProfile+'". API Rate Limit hit. Please try again.' });
					setTimeout(saveNotification.close, 2000);
				}
			} else if (result == 400) {
				logError('Unable to update CDS profile: '+editingProfile);
				if (saveNotification) {
					message = JSON.parse(commandResults['responseBody']);
					saveNotification.update({ type: 'warning', message: 'Unable to save CDS: "'+ editingProfile+'"<br> '+ message['message'] });
					setTimeout(saveNotification.close, 10000);
				}
			} else if (result !== 200) {
				if (saveNotification) {
					message = JSON.parse(commandResults['responseBody']);
					saveNotification.update({ type: 'warning', message: 'Unable to save CDS: "'+ editingProfile+'"<br> '+ message['message'] });
					setTimeout(saveNotification.close, 10000);
				}
				logError('Unable to update CDS profile: '+editingProfile);
			} else {
				logInformation('CDS profile: ' + editingProfile + ' was updated successfully');
				if (saveNotification) {
					saveNotification.update({ type: 'success', message: 'CDS profile was updated' });
					setTimeout(saveNotification.close, 1000);
				}
				(bootstrap.Modal.getInstance(document.getElementById('UIModal')) || new bootstrap.Modal(document.getElementById('UIModal'))).hide();
				refreshProfilesForHierarchy();
			}
		});
	});
}

function createProfile() {
	document.getElementById("profileName").disabled = false;
	document.getElementById("profileName").value = '';
	document.getElementById("description").value = '';
	document.getElementById("auth-surv").checked = true;
	document.getElementById("denylist-client").checked = true;
	document.getElementById("create-title").innerHTML = 'Create Profile';
	document.getElementById('createBtn').hidden = false;
	document.getElementById('updateBtn').hidden = true;
	new bootstrap.Modal(document.getElementById('UIModal')).show();
}

function createUIProfile() {
	if (document.getElementById('profileName').value === '') {
		showNotification('ca-content-delivery', 'Please enter profile name', 'bottom', 'center', 'warning');
		return;
	}
	if (saveNotification) saveNotification.close();
	saveNotification = showNotification('ca-content-delivery', 'Creating CDS Profile: "'+document.getElementById('profileName').value+'"...' , 'bottom', 'center', 'info');
	authenticateWithCentral().then(function() {
		logStart('Creating CDS Profile in Central');
		// Determine actual list of VLAN IDs for creation.
		editingConfig = {};
		editingConfig['name'] = document.getElementById('profileName').value;
		if (document.getElementById('description').value !== '') editingConfig['description'] = document.getElementById('description').value;
		else delete editingConfig['description'];
		
		//General Config
		editingConfig['auth-surv'] = document.getElementById('auth-surv').checked;
		editingConfig['denylist-client'] = document.getElementById('denylist-client').checked;
		
		let newProfile = { 'profile': [editingConfig]}
		
		fetchProxyWithAuth('/tools/postCommandwHeaders', {
			url: localStorage.getItem('base_url') + profileEndpoint,
			access_token: localStorage.getItem('access_token'),
			data: JSON.stringify(newProfile),
		})
		.then(function(commandResults) {
			let result = processStatus(commandResults);
			if (result == 429 || result == 409) {
				if (saveNotification) {
					saveNotification.update({ type: 'danger', message: 'Unable to create CDS: "'+editingProfile+'". API Rate Limit hit. Please try again.' });
					setTimeout(saveNotification.close, 2000);
				}
			} else if (result == 400) {
				logError('Unable to update CDS profile: '+editingProfile);
				if (saveNotification) {
					message = JSON.parse(commandResults['responseBody']);
					saveNotification.update({ type: 'warning', message: 'Unable to create CDS: "'+ editingProfile+'"<br> '+ message['message'] });
					setTimeout(saveNotification.close, 10000);
				}
			} else if (result !== 200) {
				if (saveNotification) {
					message = JSON.parse(commandResults['responseBody']);
					saveNotification.update({ type: 'warning', message: 'Unable to create CDS: "'+ editingProfile+'"<br> '+ message['message'] });
					setTimeout(saveNotification.close, 10000);
				}
				logError('Unable to create CDS profile: '+editingProfile);
			} else {
				logInformation('CDS profile: ' + editingProfile + ' was created successfully');
				if (saveNotification) {
					saveNotification.update({ type: 'success', message: 'CDS profile was created' });
					setTimeout(saveNotification.close, 1000);
				}
				(bootstrap.Modal.getInstance(document.getElementById('UIModal')) || new bootstrap.Modal(document.getElementById('UIModal'))).hide();
				refreshProfilesForHierarchy();
			}
		});
	});
}


/*  -------------------------------------------------------------------------------------------------------------------------------------------------------------------------
	Assigning profile
------------------------------------------------------------------------------------------------------------------------------------------------------------------------- */
// Open assign panel
function openAssign() {
	profileSelector.removeActiveItems();
	assignHierarchySelector.removeActiveItems();
	buildAssignHierarchySelector(true);
	//deviceFunctionSelector.removeActiveItems();
	new bootstrap.Modal(document.getElementById('assignModal')).show();
}

function closeAssign() {
	(bootstrap.Modal.getInstance(document.getElementById('assignModal')) || new bootstrap.Modal(document.getElementById('assignModal'))).hide();
}

// Verify the input (profile list,etc) is valid
function verifyAssign() {
	if (!profileSelector.getValue(true)) {
		showNotification('ca-folder-settings', 'Please choose an CDS Profile to assign', 'bottom', 'center', 'warning');
		return;
	}
	
	if (getAssignHierarchySelector().getValue(true).length == 0) {
		showNotification('ca-folder-settings', 'Please choose one or more scopes to assign profiles', 'bottom', 'center', 'warning');
		return;
	}
	
	assignProfile();
}

// Verify the input (profile selection, etc) is valid
function verifyUnassign() {
	if (!profileSelector.getValue(true)) {
		showNotification('ca-folder-settings', 'Please choose an CDS Profile to assign', 'bottom', 'center', 'warning');
		return;
	}
	
	if (getAssignHierarchySelector().getValue(true).length == 0) {
		showNotification('ca-folder-settings', 'Please choose one or more scopes to unassign profiles', 'bottom', 'center', 'warning');
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
