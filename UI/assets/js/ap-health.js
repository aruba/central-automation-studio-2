function hexToBinary(hex) {
	const cleanHex = hex.replace(/^0x/i, "").replace(/[\s_]/g, "");
	if (!/^[0-9a-fA-F]+$/.test(cleanHex)) {
		throw new Error("Invalid hexadecimal string");
	}

  return cleanHex
	.split("")
	.map((ch) => parseInt(ch, 16).toString(2).padStart(4, "0"))
	.join("");
}

function toLittleEndianBitString(bigEndianBits) {
	return bigEndianBits.split("").reverse().join("");
}

function decodeStatusHex(hex, { flipBits = true } = {}) {
	if (hex.startsWith('080')) hex = hex.substring(3);
	//console.log(hex)
	let binary = hexToBinary(hex);
	//const binary = toLittleEndianBitString(bigEndianBinary); // little-endian bit string
	//console.log(binary);
	const MIN_BITS = 21; // up to Central layer (bit 20)
	if (binary.length < MIN_BITS) {
		binary = binary.padStart(21, "0");
		//throw new Error(`Hex value must contain at least ${MIN_BITS} bits`);
	}
	//console.log(binary);

	// bit 0 is on the right
	const bits = (start, endInclusive) => binary.slice(binary.length - endInclusive -1, binary.length - start);
	
	const ipVersionMap = {
		"0": "IPv4",
		"1": "IPv6",
	};
	
	const uplinkMap = {
		"0": "Uplink exists",
		"1": "No uplink",
	};
	
	const uplinkTypeMap = {
		"000": "Ethernet",
		"001": "Modem",
		"010": "Mesh",
		"011": "Wi-Fi Uplink",
	};
	
	const networkMap = {
		"0000": "Successful",
		"0001": "Missing IP Information (Static)",
		"0010": "No IP Address (PPPoE Failure)",
		"0011": "No IP Address (DHCP Failure)",
		"0100": "Missing GW IP address",
		"0101": "Failed ARP for Default Gateway",
		"0110": "NTP Date & Time Sync Failure",
		"0111": "HCM status down",
		"1111": "Failure at previous layer",
	};
	
	const proxyMap = {
		"00": "Successful",
		"01": "Authentication Failure",
		"10": "Proxy Server Connection Error",
		"11": "Failure at previous layer",
	};
	
	const activateMap = {
		"0000": "Successful",
		"0001": "Unable to Resolve A/AAAA",
		"0010": "IP Connection Failure",
		"0011": "HTTPS Failure (TLS)",
		"0100": "Mandatory Upgrade Failure",
		"0101": "Slow Mandatory Upgrade",
		"0110": "No Provisioning Rule",
		"0111": "Invalid Activate response",
		"1111": "Failure at previous layer",
	};
	
	const centralMap = {
		"000": "Successful",
		"001": "Unable to Resolve A/AAAA",
		"010": "IP Connection Failure",
		"011": "HTTPS Failure (TLS)",
		"100": "Websocket Failure (WSS)",
		"101": "No AP license",
		"110": "Other Failure",
		"111": "Failure at previous layer",
	};
	
	const decodeReserved = (value, map, reservedValues = []) => {
		if (map[value] !== undefined) return map[value];
		if (reservedValues.includes(value)) return "Reserved for future use";
		return "Unknown";
	};
	
	
	const versionBits = bits(0, 2);
	const ipBits = bits(3, 3);
	const uplinkBits = bits(4, 4);
	const uplinkTypeBits = bits(5, 7);
	const networkBits = bits(8, 11);
	const proxyBits = bits(12, 13);
	const activateBits = bits(14, 17);
	const centralBits = bits(18, 20);
	
	
	/*console.log(versionBits);
	console.log(ipBits);
	console.log(uplinkBits);
	console.log(uplinkTypeBits);
	console.log(networkBits);
	console.log(proxyBits);
	console.log(activateBits);
	console.log(centralBits);*/
	
	return [
		{
			icon: "fa-circle-info",
			name: "IE Version",
			binary: versionBits,
			decimal: parseInt(versionBits, 2),
			description: `Version ${parseInt(versionBits, 2) + 1}`,
		},
		{
			icon: "fa-code-branch",
			name: "IP Version",
			binary: ipBits,
			decimal: parseInt(ipBits, 2),
			description: ipVersionMap[ipBits] ?? "Unknown",
		},
		{
			icon: "fa-circle",
			name: "Uplink",
			binary: uplinkBits,
			decimal: parseInt(uplinkBits, 2),
			description: uplinkMap[uplinkBits] ?? "Unknown",
		},
		{
			icon: "fa-ethernet",
			name: "Uplink Type",
			binary: uplinkTypeBits,
			decimal: parseInt(uplinkTypeBits, 2),
			description: decodeReserved(
			uplinkTypeBits,
			uplinkTypeMap,
			["100", "101", "110", "111"]
			),
		},
		{
			icon: "fa-network-wired",
			name: "Network",
			binary: networkBits,
			decimal: parseInt(networkBits, 2),
			description: decodeReserved(
			networkBits,
			networkMap,
			["1000", "1001", "1010", "1011", "1100", "1101", "1110"]
			),
		},
		{
			icon: "fa-circle-user-circle-check",
			name: "Proxy",
			binary: proxyBits,
			decimal: parseInt(proxyBits, 2),
			description: proxyMap[proxyBits] ?? "Unknown",
		},
		{
			icon: "fa-earth-oceania",
			name: "Activate",
			binary: activateBits,
			decimal: parseInt(activateBits, 2),
			description: decodeReserved(
			activateBits,
			activateMap,
			["1000", "1001", "1010", "1011", "1100", "1101", "1110"]
			),
		},
		{
			icon: "fa-cloud",
			name: "Central",
			binary: centralBits,
			decimal: parseInt(centralBits, 2),
			description: centralMap[centralBits] ?? "Unknown",
		},
	];
}

const ipMap = [ "fa-circle-4", "fa-circle-6"];
const networkMap = [ "fa-ethernet", "fa-signal", "fa-ethernet", "fa-circle-nodes", "fa-wifi"];

function convertIE() {
	let hexString = document.getElementById('healthString').value;
	if (hexString === '') showNotification('ca-ap-health', 'Please enter a AP Health IE Hexadecimal string', 'bottom', 'center', 'warning');
	else {
		let output = decodeStatusHex(hexString);
		
		// UI Pieces
		var table = $('#health-table').DataTable();
		$('#health-table').DataTable().clear();
		//console.log(output);
		for (let i=0;i<output.length;i++) {
			let colour = "danger";
			if (output[i]['decimal'] === 0) colour = "success";
			else if (output[i]['decimal'] === 1) colour = "danger";
			else if (!output[i]['binary'].includes('0')) colour = "neutral";
			
			let icon = output[i]['icon'];
			if (output[i]['name'] === 'IE Version') {
				colour = "dark";
			}else if (output[i]['name'] === 'IP Version') {
				icon = ipMap[output[i]['decimal']];
				colour = "dark";
			} else if (output[i]['name'] === 'Uplink Type') {
				icon = networkMap[output[i]['decimal']];
			} 
			
			table.row.add(['<i class="fa-solid '+icon+' text-'+colour+'"></i>', output[i]['name'], output[i]['binary'] + ' ('+output[i]['decimal']+')', output[i]['description']]);
		}
		$('#health-table').DataTable().rows().draw();
	}
}