/*
Central Automation v2.x
Last Updated 2.0.0
Aaron Scott (WiFi Downunder) 2025-2026
*/

/*  -------------------------------------------------------------------------------------------------------------------------------------------------------------------------
	Generic profile assignment functions
------------------------------------------------------------------------------------------------------------------------------------------------------------------------- */


var assignmentTotal = 0;
var assignmentCounter = 0;
var assignmentErrors = 0;
var unassignProfiles;

var assignNotification;
var deviceFunctionSelector;

var assignmentPromise;
var assignmentResolve;
var currentAssignments = [];

var isAssigning = true;
var singleInstanceFlow = false;

var storageProfileList;
var storageProfileType;
var storageProfileName;
var storageProfileUniqueLeaf;


/*  -------------------------------------------------------------------------------------------------------------------------------------------------------------------------
	Device Function selector - override based on functions used by profile!
------------------------------------------------------------------------------------------------------------------------------------------------------------------------- */
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
		deviceFunctionChoices.push({ value: 'MICROBRANCH_AP', label: 'Microbranch AP' });
		deviceFunctionChoices.push({ value: 'MOBILITY_GW', label: 'Mobility GW' });
		deviceFunctionChoices.push({ value: 'BRANCH_GW', label: 'Branch GW' });
		deviceFunctionChoices.push({ value: 'VPNC', label: 'VPN Concentrator' });
		deviceFunctionChoices.push({ value: 'ACCESS_SWITCH', label: 'Access Switch' });
		deviceFunctionChoices.push({ value: 'AGG_SWITCH', label: 'Aggregation Switch' });
		deviceFunctionChoices.push({ value: 'CORE_SWITCH', label: 'Core Switch' });
		deviceFunctionChoices.push({ value: 'AOSS_ACCESS_SWITCH', label: 'AOS-S Acess Switch' });
		deviceFunctionChoices.push({ value: 'AOSS_AGG_SWITCH', label: 'AOS-S Aggregation Switch' });
		deviceFunctionChoices.push({ value: 'AOSS_CORE_SWITCH', label: 'AOS-S Core Switch' });
		deviceFunctionSelector.clearChoices();
		deviceFunctionSelector.setChoices(deviceFunctionChoices);
	}
}


/*  -------------------------------------------------------------------------------------------------------------------------------------------------------------------------
	profile assignment setup functions
------------------------------------------------------------------------------------------------------------------------------------------------------------------------- */
// Check if scopes and device function are selected
function assignProfile() {
	if (getAssignHierarchySelector().getValue(true).length == 0) {
		showNotification('ca-n-check', 'Please choose one or more scopes to assign profiles', 'bottom', 'center', 'warning');
		return;
	}
	
	if (deviceFunctionSelector && deviceFunctionSelector.getValue(true).length == 0) {
		showNotification('ca-n-check', 'Please choose one or more device functions to assign profiles', 'bottom', 'center', 'warning');
		return;
	}
	
	Swal.fire({
		title: 'Assigning Profiles',
		html: 'Profiles will be assigned to the selected scopes, for the selected device functions. <br \>Are you sure you want to proceed?',
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
			getProfileList(true);
		}
	});
}

function unassignProfile() {
	if (getAssignHierarchySelector().getValue(true).length == 0) {
		showNotification('ca-survey', 'Please choose one or more scopes from which to unassign profiles', 'bottom', 'center', 'warning');
		return;
	}
	
	if (deviceFunctionSelector && deviceFunctionSelector.getValue(true).length == 0) {
		showNotification('ca-survey', 'Please choose one or more device functions from which to un assign profiles', 'bottom', 'center', 'warning');
		return;
	}
	
	Swal.fire({
		title: 'Unassigning Profiles',
		html: 'Profiles will be unassigned from the selected selected scopes, for the selected device functions. <br \>Are you sure you want to proceed?',
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
			getProfileList(false);
		}
	});
}

// Should be overridden in profile code - to provide correct info
function getProfileList(isAssigning) {
	let profileList = [];
	let profileType = 'replace';
	let profileName = 'profile';
	let profileUniqueLeaf = 'name';
	let singleInstanceProfile = true;
	if (isAssigning) assignConfirmed(profileList, profileType, profileName, profileUniqueLeaf, singleInstanceProfile);
	else unassignConfirmed(profileList, profileType, profileName, profileUniqueLeaf);
}


/*  -------------------------------------------------------------------------------------------------------------------------------------------------------------------------
	profile assignment functions
------------------------------------------------------------------------------------------------------------------------------------------------------------------------- */

function assignConfirmed(profileList, profileType, profileName, profileUniqueLeaf, isSingleInstance) {
	authenticateWithCentral().then(function() {
		assignmentErrors = 0;
		// Get selected scopes
		let selectedScopes = [];
		getAssignHierarchySelector().getValue(true).forEach(function(v) {
			selectedScopes.push(v.split('::')[1]);
		});
		// Get selected device functions
		let selectedFunctions = [];
		deviceFunctionSelector.getValue(true).forEach(function(v) {
			selectedFunctions.push(v.toString());
		});
	
		singleInstanceFlow = isSingleInstance;
		if (singleInstanceFlow) {
			// store inputs for post unassign flow
			storageProfileList = profileList;
			storageProfileType = profileType;
			storageProfileName = profileName;
			storageProfileUniqueLeaf = profileUniqueLeaf;
			
			// get scopeMappings and check which ones match the required combinations
			unassignProfiles = [];
			getScopeMappings().then(function() {
				currentAssignments.forEach(function(currentAssignment) {
					profileList.forEach(function(currentProfile) {
						if (selectedScopes.includes(currentAssignment['scope-id']) && selectedFunctions.includes(currentAssignment['device-function']) && currentAssignment['profile-type'] === profileType) {
							unassignProfiles.push(currentAssignment);
						}
					});
				});
				unassignCurrentProfiles();
			});
		} else {
			logStart('Assign profiles to selected scopes');
			// check which VLANs need to be assigned, and build mappings ready to post
			let profilesToAssign = [];
			// for each scope selected
			selectedScopes.forEach(function(currentScope) {
				// for each device function selected
				selectedFunctions.forEach(function(currentFunction) {
					// for each of the matching VLAN profiles (VLANs that exist from the input list)
					for (let i=0;i<profileList.length;i++) {
						let currentProfile = profileList[i];
						// check is mapped at all
						if (currentProfile['@']['aruba-annotation:scope_device_function']) {
							let exists = false;
							// check if scope and device function mapping is already there.
							let scopeMappings = parseScopeDeviceFunction(currentProfile['@']['aruba-annotation:scope_device_function']);
							scopeMappings.forEach(function(sm) {
								if (sm['scope_id'].toString() === currentScope && sm['device_function'] === currentFunction) exists = true;
							});
							// if current mappings doesn't include this scope and device function - add to list of mappings
							if (!exists) {
								profilesToAssign.push({ 'scope-id': currentScope, 'profile-type': profileType, 'profile-instance': currentProfile[profileUniqueLeaf].toString(), 'device-function': currentFunction});
								logInformation('Assigning '+profileName+' "'+currentProfile[profileUniqueLeaf]+ '" to '+findScopeNameForId(currentScope) + ' for '+ deviceFunctionDisplay[currentFunction]);
							} else {
								logInformation(profileName+' "'+currentProfile[profileUniqueLeaf]+ '" was already assign to '+findScopeNameForId(currentScope) + ' for '+ deviceFunctionDisplay[currentFunction]);
							}
						} else {
							// not mapped at all - just add to list of mappings
							profilesToAssign.push({ 'scope-id': currentScope, 'profile-type': profileType, 'profile-instance': currentProfile[profileUniqueLeaf].toString(), 'device-function': currentFunction});
							logInformation('Assigning '+profileName+' "'+currentProfile[profileUniqueLeaf]+ '" to '+findScopeNameForId(currentScope) + ' for '+ deviceFunctionDisplay[currentFunction]);
						}
					}
				});
			});
			
			// store the total, for progress monitoring
			assignmentTotal = profilesToAssign.length;
			
			if (profilesToAssign.length > 0) {
				if (assignNotification) assignNotification.close();
				assignNotification  = showProgressNotification('ca-check-list', 'Assigning '+ profilesToAssign.length+ ' profiles', 'bottom', 'center', 'info')
				
				let timeoutCounter = 0;
				while (profilesToAssign.length > 0) {
					var assignmentBlock = [];
					assignmentBlock = profilesToAssign.splice(0, apiAssignmentLimit);
					
					// Update assignments
					setTimeout(assignProfilesBlock, apiProfileDelay * timeoutCounter, assignmentBlock);
					timeoutCounter++;
				}
			} else {
				logInformation('No profiles were required to be assigned to the selected scopes');
				if (assignNotification) {
					assignNotification.update({ progress: 100, type: 'success', message: 'The profile were assigned to the selected scopes' });
					assignNotification.close();
				}
				// Successfully delete mapping
				hideModalThenSwal('assignModal', {
					title: 'Profiles Assigned',
					html: 'The profiles were assigned to the selected scopes',
					icon: 'success',
					showCancelButton: true,
					confirmButtonColor: '#3085d6',
					cancelButtonColor: '#888888',
					confirmButtonText: 'OK',
					cancelButtonText: 'Show Log',
				}).then(result => {
					if (result.isDismissed) setTimeout(showLog,500);
				});
				logEnd('The profiles were assigned to the selected scopes');
				refreshProfilesForHierarchy();
			}
		}
	});
}

function assignProfilesBlock(assignmentList) {
	//console.log(assignmentList)
	
	fetchProxyWithAuth('/tools/postCommand', {
		url: localStorage.getItem('base_url') + '/network-config/v1/config-assignments',
		access_token: localStorage.getItem('access_token'),
		data: JSON.stringify({ 'config-assignment': assignmentList }),
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
			setTimeout(assignProfilesBlock, apiWaitDelay, assignmentList);
		} else if (result == 400) {
			assignmentErrors++;
			assignmentCounter += assignmentList.length;
			if (commandResults.message) logError(commandResults.message);
			checkProfileAssignmentComplete();
		} else if (result !== 200) {
			assignmentErrors++;
			assignmentCounter += assignmentList.length;
			checkProfileAssignmentComplete();
		} else {
			assignmentCounter += assignmentList.length;
			checkProfileAssignmentComplete();
		}
	});
}

function checkProfileAssignmentComplete() {
	let progress = (assignmentCounter / assignmentTotal) * 100
	if (assignNotification) assignNotification.update({ progress: progress });
	
	if (assignmentCounter >= assignmentTotal) {
		if (assignmentErrors > 0) {
			if (assignNotification) {
				assignNotification.update({ progress: 100, type: 'danger', message: 'Failed to assign profiles to selected scopes' });
				setTimeout(assignNotification.close, 1000);
			}
			logError('Failed to assign the profiles set to selected scopes');
			
			hideModalThenSwal('assignModal', {
				title: 'Profile Assignment Failure',
				html: 'The profiles failed to be completely assigned to the selected scopes',
				icon: 'error',
				showCancelButton: true,
				confirmButtonColor: '#3085d6',
				cancelButtonColor: '#888888',
				confirmButtonText: 'OK',
				cancelButtonText: 'Show Log',
			}).then(result => {
				if (result.isDismissed) setTimeout(showLog,500);
			});
			refreshProfilesForHierarchy();
		} else {
			
			logInformation(assignmentTotal+' profiles were assigned to the selected scopes')
			if (assignNotification) {
				assignNotification.update({ progress: 100, type: 'success', message: 'The profiles were assigned to the selected scopes' });
				assignNotification.close();
			}
			
			// Successfully mapping
			hideModalThenSwal('assignModal', {
				title: 'Profiles Assigned',
				html: 'The profiles were assigned to the selected scopes',
				icon: 'success',
				showCancelButton: true,
				confirmButtonColor: '#3085d6',
				cancelButtonColor: '#888888',
				confirmButtonText: 'OK',
				cancelButtonText: 'Show Log',
			}).then(result => {
				if (result.isDismissed) setTimeout(showLog,500);
			});
			logEnd('Profiles were assigned to the selected scopes');
			refreshProfilesForHierarchy();
		}
	}
}

/*  -------------------------------------------------------------------------------------------------------------------------------------------------------------------------
	profile unassignment functions
------------------------------------------------------------------------------------------------------------------------------------------------------------------------- */
function unassignConfirmed(profileList, profileType, profileName, profileUniqueLeaf) {
	logStart('Unassign profiles from selected scopes');
	
	// Get selected scopes
	let selectedScopes = [];
	getAssignHierarchySelector().getValue(true).forEach(function(v) {
		selectedScopes.push(v.split('::')[1]);
	});
	// Get selected device functions
	let selectedFunctions = [];
	deviceFunctionSelector.getValue(true).forEach(function(v) {
		selectedFunctions.push(v.toString());
	});

	// get scopeMappings and check which ones match the required combinations
	unassignProfiles = [];
	authenticateWithCentral().then(function() {
		return getScopeMappings();
	}).then(function() {
		currentAssignments.forEach(function(currentAssignment) {
			profileList.forEach(function(currentProfile) {
				if (selectedScopes.includes(currentAssignment['scope-id']) && selectedFunctions.includes(currentAssignment['device-function']) && currentAssignment['profile-type'] === profileType && currentAssignment['profile-instance'] === currentProfile[profileUniqueLeaf].toString()) {
					unassignProfiles.push(currentAssignment);
				}
			});
		});
		unassignCurrentProfiles();
	});
}

function getScopeMappings() {
	assignmentPromise = new Promise(function(resolve) { assignmentResolve = resolve; });
	if (assignNotification) assignNotification.close();
	assignNotification  = showProgressNotification('ca-check-list', 'Obtaining existing scope mappings...', 'bottom', 'center', 'info');
	logInformationHeading('Obtaining existing scope mappings...');

	currentAssignments = [];
	// Get the existing profiles mapped to the select scopes.
	fetchProxyWithAuth('/tools/getCommandwHeaders', {
		url: localStorage.getItem('base_url') + '/network-config/v1/config-assignments',
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
			setTimeout(getScopeMappings, apiWaitDelay);
		} else if (result !== 200) {
			logError('Failed to retrieve existing Scope Mappings');
		} else {
			let response = JSON.parse(commandResults.responseBody);
			//console.log(response)
			currentAssignments = response['config-assignment'];
			assignmentResolve();
		}
	});
	return assignmentPromise;
}

function unassignCurrentProfiles() {
	if (unassignProfiles.length > 0) {
		if (assignNotification) assignNotification.close();
		assignNotification = showProgressNotification('ca-survey', 'Unassigning '+ unassignProfiles.length + ' profiles', 'bottom', 'center', 'info');
		logInformationHeading('Unassigning existing scope mappings for the selected profiles/scopes/device functions...');
		
		unassignCounter = 0;
		unassignErrors = 0;
		// Sequentially unassign - to prevent resource conflict errors
		unassignExistingProfile(unassignProfiles[unassignCounter]);
	} else {
		if (singleInstanceFlow) {
			// run the assign workflow now that everything is unassigned
			logInformation('There are no existing profiles that need to unassigned to the selected scopes');
			assignConfirmed(storageProfileList, storageProfileType, storageProfileName, storageProfileUniqueLeaf, false);
		} else {
			// No existing profiles to unassign - jump to assigning the profiles
			logInformation('There are no existing profiles that need to unassigned to the selected scopes');
			logEnd('No assignment changes were required')
			if (assignNotification) {
				assignNotification.update({ progress: 100, type: 'success', message: 'No assignment changes were required' });
				setTimeout(assignNotification.close, 1000);
			}
		}
	}
}

function unassignExistingProfile(configProfile) {
	fetchProxyWithAuth('/tools/deleteCommand', {
		url: localStorage.getItem('base_url') + '/network-config/v1/config-assignments/'+configProfile['scope-id']+'/'+configProfile['device-function']+'/'+configProfile['profile-type']+'/'+configProfile['profile-instance'],
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
			setTimeout(unassignExistingProfile, apiWaitDelay, configProfile);
		} else if (result !== 200) {
			logError('Failed to delete existing Scope Mapping for '+configProfile['profile-instance']+' from '+configProfile['scope-name']);
			unassignErrors++;
			checkUnassignComplete();
		} else {
			logInformation('Unassigned '+ configProfile['profile-instance'] + ' ('+configProfile['profile-type']+') from '+configProfile['scope-name'] + ' for ' + deviceFunctionDisplay[configProfile['device-function']]);
			// Successfully delete mapping
			checkUnassignComplete();
		}
	}).catch(function(err) {
		console.log('Unassign error for ' + configProfile['profile-instance'] + ' ('+configProfile['profile-type']+') for '+configProfile['scope-name']+' - trying again');
		let randDelay = Math.floor(Math.random() * 10) + 1;
		setTimeout(unassignExistingProfile, apiWaitDelay * randDelay, configProfile);
	});
}

function checkUnassignComplete() {
	unassignCounter++;
	let progress = (unassignCounter / unassignProfiles.length) * 100
	if (assignNotification) assignNotification.update({ progress: progress });
	if (unassignCounter >= unassignProfiles.length) {
		if (assignNotification) setTimeout(assignNotification.close, 1000);
		if (unassignErrors != 0) {
			hideModalThenSwal('assignModal', {
				title: 'Error Unassigning Existing Profile',
				html: unassignErrors + ' profiles were not able to unassigned.',
				icon: 'error',
				showCancelButton: true,
				confirmButtonColor: '#3085d6',
				cancelButtonColor: '#888888',
				confirmButtonText: 'OK',
				cancelButtonText: 'Show Log',
			}).then(result => {
				if (result.isDismissed) setTimeout(showLog,500);
			});
			refreshProfilesForHierarchy();
		} else {
			logEnd('Existing scope mappings for the selected scopes have been unassigned');
			if (singleInstanceFlow) {
				// run the assign workflow no that everything is unassigned
				assignConfirmed(storageProfileList, storageProfileType, storageProfileName, storageProfileUniqueLeaf, false);
			} else {
				hideModalThenSwal('assignModal', {
					title: 'Unassigning Profiles Successful',
					html: unassignProfiles.length + ' profiles were unassigned from the selected scopes and device functions',
					icon: 'success',
					showCancelButton: true,
					confirmButtonColor: '#3085d6',
					cancelButtonColor: '#888888',
					confirmButtonText: 'OK',
					cancelButtonText: 'Show Log',
				}).then(result => {
					if (result.isDismissed) setTimeout(showLog,500);
				});
				refreshProfilesForHierarchy();
			}
		}
	} else {
		unassignExistingProfile(unassignProfiles[unassignCounter]);
	}

}