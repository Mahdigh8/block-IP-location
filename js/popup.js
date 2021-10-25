"use strict";

var bgc = chrome.extension.getBackgroundPage()


function updateBackground(){
	chrome.runtime.sendMessage({type: "update"}, function(response) {
	  return true;
	});
};

function storeDomainCountry(input_data, manual, blackList) {
	/// input_data contains domains and countries its structure is sth like below
	/// {"Country_1": ["Domain_1", "Domain_2"], "Country_2": ["Domain_3"]}
	
	var key = "";
	if(blackList){
		key = "bl_country_domain";
	}else{
		key = "wl_country_domain";
	}

	// bgc.console.log("input data => " + JSON.stringify(input_data));
	chrome.storage.local.get(key, function(result){
		result = result[key];

		var jsonfile = {};
		/// For the first time calling this function it should go through if condition
		/// Because there is nothing in storage yet
		if(result === "" || manual === true){
		  var testPrefs = JSON.stringify(input_data);
		  jsonfile[key] = testPrefs;

		/// if storage was not empty we check if country is already in storage 
		/// or not and then we add it to the storage
		}else{
			result = JSON.parse(result);

			var country = Object.keys(input_data)[0];

			if(country in result){
				/// check if domain is already in the storage or not
				if( !(result[country].includes(input_data[country][0])) ){
					result[country].push(input_data[country][0]);
				}
			}else{
				result[country] = input_data[country];
			}
			
			var testPrefs = JSON.stringify(result);
			jsonfile[key] = testPrefs;
		}

		chrome.storage.local.set(jsonfile, function(){
	  	bgc.console.log(`${key} has changed`);
			updateBackground();
		}); 

	});
};

function deleteDomainCountry(country_name){

	var key = "";
	var flag = country_name.includes("bl-list-");

	if(flag){
		key = "bl_country_domain";
		country_name = country_name.replace("bl-list-", "");
	}else{
		key = "wl_country_domain";
		country_name = country_name.replace("wl-list-", "");
	}

	chrome.storage.local.get(key, function(result){

		result = result[key];
		result = JSON.parse(result);

		var jsonfile = {};

		delete result[country_name];

		jsonfile[key] = JSON.stringify(result);

		chrome.storage.local.set(jsonfile, function(){
			updateBackground();
  		bgc.console.log(country_name + ' has deleted!');
		});
	});
}

function storeURL(black_list){
	chrome.tabs.query({active: true, currentWindow: true}, function(tabs){
		let url = tabs[0].url;
		// bgc.console.log(url);
		let domain = (new URL(url));
		domain = domain.hostname;
		domain = domain.replace("www.", "");

		bgc.console.log("Domain: " + domain);

		var request = new XMLHttpRequest();
		request.open('GET', 'http://ip-api.com/json/', false);
		request.send(null);

		if (request.status === 200) {
			var data = request.response;
			var obj = JSON.parse(data);

			var country = obj["country"];
			if(black_list){
				storeDomainCountry({[country]: [domain]}, false, true);
			}else{
				//whitelist
				storeDomainCountry({[country]: [domain]}, false, false);
			}
			
			/// Refresh page after adding domain and IP-Location to whitelist or blacklist
			// chrome.runtime.sendMessage({type: "refresh"}, function(response) {
			//   return true;
			// });

		}else{
			alert("Error with Geo-Location API !!!");
		}
	});
}


// function getDataStorage(){
// 	var stored_domains = null;

// 	var keys = ["bl_country_domain", "wl_country_domain"];

// 	for(let i in keys){	
// 		chrome.storage.local.get(keys[i], function(data) {
// 			stored_domains = data[keys[i]];
// 			bgc.console.log(`${keys[i]} Stored: ` + stored_domains);
// 		});
// 	}
// }


function setUpPopup(){
	var xmlhttp = new XMLHttpRequest();
	xmlhttp.onreadystatechange = function()
	{
		if (xmlhttp.readyState==4 && xmlhttp.status==200)
		{
			var data = xmlhttp.response;
			var obj = JSON.parse(data);
			// bgc.console.log(obj)
			
			var ip_locationSpan = document.getElementById("iplocation");
			ip_locationSpan.innerHTML = obj['country'] +" - "+ obj['query'];
		}
	}
	xmlhttp.open("GET", 'http://ip-api.com/json/', false);
	xmlhttp.send();
};


document.getElementById("bl_domain").addEventListener("click", function(){
	storeURL(true);
}, false);

document.getElementById("wl_domain").addEventListener("click", function(){
	storeURL(false);
}, false);

// document.getElementById("get").addEventListener("click", function(){
// 	getDataStorage();
// }, false);

document.getElementById("options").addEventListener("click", function(){
	if (chrome.runtime.openOptionsPage) {
    chrome.runtime.openOptionsPage();
  } else {
    window.open(chrome.runtime.getURL('../html/options.html'));
  }
}, false);

window.onload = function(){
	setUpPopup();
};
