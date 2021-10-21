"use strict";

var bgc = chrome.extension.getBackgroundPage()


function getItemsData(items){
	var country = [];
	var domains = [];
	var data = {};

	for(var i=0; i < items.length; i++){
		country = items[i].getElementsByClassName("country_regex")[0];
		domains = items[i].getElementsByClassName("domains")[0];
		country = country.value;
		domains = domains.value;
		
		if(country && domains){
			domains = domains.split(',');
			// bgc.console.log(domains)
			var temp_domains = [];
			var dom_regex = "";
			for(let i in domains){
				dom_regex = domains[i].replace("www.", "");
				temp_domains.push(dom_regex.trim());
			}
			data[country] = temp_domains;
		}
	}

	return data
}


function saveOptions(){
	// get data from both black list and white list html inputs and
	// set them in storage seperatly

	var black_list_items = document.getElementById("bl");
	black_list_items = black_list_items.getElementsByClassName("entry");
	var black_list_data = getItemsData(black_list_items);
	
	var white_list_items = document.getElementById("wl");
	white_list_items = white_list_items.getElementsByClassName("entry");
	var white_list_data = getItemsData(white_list_items);

	// bgc.console.log(JSON.stringify(black_list_data));
	// bgc.console.log(JSON.stringify(white_list_data));

	storeDomainCountry(black_list_data, true, true);
	storeDomainCountry(white_list_data, true, false);

	setMessage("Data Saved!");
	
}

document.getElementById("save").addEventListener("click", function(){
	saveOptions();
}, false);

var entry_html = "";
entry_html += '<span class="entry">';
entry_html += '<p><strong>Country Name</strong><br><input class="country_regex" value=""/>';
entry_html += '<br><strong>Domains</strong> seperate with comma<br>';
entry_html += '<textarea class="domains" style="width:90%"></textarea><br></p>';
entry_html += '</span>';


document.getElementById("add-bl").addEventListener("click", function(){
	var html = document.getElementById("bl").innerHTML;
	html += entry_html;
	document.getElementById("bl").innerHTML = html;
});

document.getElementById("add-wl").addEventListener("click", function(){
	var html = document.getElementById("wl").innerHTML;
	html += entry_html;
	document.getElementById("wl").innerHTML = html;
});

function setMessage(string){
	document.getElementById("item5").innerHTML = "<h2>"+string+"</h2>";
}

function setUpOptions(){
	var keys = ["bl_country_domain", "wl_country_domain"];
	var ids = ["bl", "wl"];

	for(let i in keys){
		chrome.storage.local.get(keys[i], function(domain_array) {
			domain_array = domain_array[keys[i]];
			// bgc.console.log("results: "+ domain_array);
			domain_array = JSON.parse(domain_array);

			var countries = Object.keys(domain_array);
			
			var html = document.getElementById(ids[i]).innerHTML;
			for(let c in countries){
				html += '<div class="entry">'
				html += '<p><strong>Country Name</strong> - '
				html += '<a href="#" country="'+ids[i]+'-'+countries[c]+'" class="delete">REMOVE RULE</a>'
				html += '<br><input class="country_regex" value="'+countries[c]+'"/disabled>'
				html += '<br><strong>Blocked Domains</strong> seperate with comma<br>'
				html += '<textarea class="domains" style="width:90%">'+domain_array[countries[c]]+'</textarea><br></p>';
				html += '</div>'
			}
			document.getElementById(ids[i]).innerHTML = html;

			//set event delete listeners
			var deleteClasses = document.getElementsByClassName("delete");
			var deleteFunction = function() {
				var country = this.getAttribute("country");
				deleteDomainCountry(country);
				this.parentNode.innerHTML = "";
			};
			for (var j = 0; j < deleteClasses.length; j++) {
				deleteClasses[j].addEventListener('click', deleteFunction, false);
			}
		});
	}
}

window.onload = function(){
	setUpOptions();
};