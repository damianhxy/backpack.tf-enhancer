// ==UserScript==
// @copyright           2014, Damian Ho
// @description         Relists trades on Backpack.tf Classifieds
// @grant               GM_xmlhttpRequest
// @include             http*://backpack.tf/*
// @name                Backpack.tf Classifieds AutoRelist
// @namespace           localhost
// @run-at              document-end
// @version             1.3.8.5
// ==/UserScript==

(function () {
    /*********** SETTINGS ***********/
    var randomTime = 1,              //(boolean) random reload time?
        randomRelist = 1,            //(boolean) random item relisted?
        defaultTime = 5,             //(minutes) default reload time
        randomMin = 1,               //(minutes) minimum random reload time
        randomMax = 10,              //(minutes) maximum random reload time
        updateFreq = 3,              //(days) currency price refresh frequency
        notes = "Pure/25% item overpay, exact ↯ offers are automatically accepted.";
    /******** END OF SETTINGS *******/

    var listPage = window.location.href.contains("/add");
    if (!listPage) {
        if (window.location.href.contains("profiles")) {
            if (JSON.parse(sessionStorage.getItem("persistent"))) {
                var listings = document.getElementsByClassName("dropdown-menu")[1].children[9].firstElementChild;
                if (listings.href.slice(-17) === window.location.href.slice(-17))
                    listings.click();
            }
            else
                setTimeout(function() {
                    document.querySelectorAll("[href='#page0']")[0].innerHTML += " (" + (document.getElementById("newlist").children.length - 1) + ")";
                }, 1000)
        }
        else {
            var classifieds = document.getElementsByClassName("listing-remove")[0] && window.location.href.contains("?steamid="),
                firstPage = document.getElementsByClassName("fa-angle-left")[0].parentNode.parentNode.className === "disabled",
                lastPage = document.getElementsByClassName("fa-angle-right")[0].parentNode.parentNode.className === "disabled";
        }
    }

    function addButton(prop, val, def) {
        var button = document.createElement("input");
        sessionStorage.setItem(prop, sessionStorage.getItem(prop) || def);
        button.setAttribute("style", "color: white; float: right; padding: 5px; margin-right: 5px; border-radius: 5px; border-color: black;" + "background-color: " + (JSON.parse(sessionStorage.getItem(prop)) ? "#628C2A;" : "#F15853;"));
        button.setAttribute("value", val);
        button.setAttribute("type", "button");
        button.setAttribute("onclick", "sessionStorage.setItem('" + prop + "', !JSON.parse(sessionStorage.getItem('" + prop + "')));");
        document.getElementById("#navbar").appendChild(button);
    }

    function range(lo, hi) {
        return Math.floor(Math.random() * (hi - lo + 1)) + lo;
    }

    function round(num) {
        var val;
        if (num <= 5 / 90)
            val = Math.round(num * 90) / 90;
        else
            val = Math.floor(num) + (Math.round(num % 1 * 9)) / 9;
        if (val.toFixed(2) % 1 >= 5 / 90)
            val -= 0.005;
        return +val.toFixed(2);
    }

    function update() {
        console.log("Updating...")
        if (!localStorage.getItem("apikey"))
            localStorage.setItem("apikey", prompt("API Key not set, please enter below:"));
        if (localStorage.getItem("apikey").length !== 24) {
            alert("Invalid API Key");
            localStorage.removeItem("apikey");
            update();
        }
        GM_xmlhttpRequest({
            method: "GET",
            url: "http://backpack.tf/api/IGetPrices/v4/?key=" + localStorage.apikey + "&compress=1",
            onreadystatechange: function(e) {
                console.log("Requesting XML...");
            },
            onload: function(e) {
                var data = JSON.parse(e.response);
                if (!data)
                    alert("Nothing received...");
                else if (data.response.message)
                    alert(data.response.message);
                var key = data.response.items["Mann Co. Supply Crate Key"]["prices"][6]["Tradable"]["Craftable"][0],
                    bud = data.response.items["Earbuds"]["prices"][6]["Tradable"]["Craftable"][0],
                    k = key.value_high ? ((key.value + key.value_high) / 2) : key.value,
                    b = bud.value_high ? ((bud.value + bud.value_high) / 2) : bud.value;
                    localStorage.setItem("keyP", k);
                    localStorage.setItem("budP", b);
                    alert("Updated, Key: " + k + ", Bud: " + b);
                    localStorage.setItem("lastupdt", new Date());
            }
        })
        console.log("Finished Updating...");
    }

    function showStatus() {
        if (reloadTime) {
            var min = Math.floor(reloadTime / 60),
                sec = reloadTime % 60;
            data.innerHTML = "Reloading classifieds in " + min + ":" + ("0" + sec).slice(-2);
            window.document.title = "Classifieds: " + min + ":" + ("0" + sec).slice(-2);
            reloadTime--;
        }
        else
            document.getElementsByClassName("fa-angle-double-left")[0].parentNode.click();
    }

    if (!localStorage.getItem("keyP") || !localStorage.getItem("budP") || !localStorage.getItem("lastupdt") || (new Date() - localStorage.getItem("lastupdt") >= 86400 * updateFreq))
        update();

    if (classifieds || listPage) {
        var keyP = localStorage.getItem("keyP"),
            budP = localStorage.getItem("budP");
        sessionStorage.curPage = sessionStorage.curPage || 1;
        addButton("paused", "Paused", false);
        addButton("persistent", "Persistent", false);
        if (JSON.parse(sessionStorage.getItem("paused"))) {
            window.document.title = "Classifieds: Paused";
            return;
        }
        if (classifieds) {
            if (firstPage && sessionStorage.getItem("curPage") > 2)
                window.location.href = window.location.href + "&page=" + sessionStorage.getItem("curPage");
            else {
                var button = document.getElementsByClassName("listing-relist");
                if (button.length) {
                    if (window.location.href.contains("&page=") && !firstPage)
                        sessionStorage.setItem("curPage", window.location.href.slice(-1));
                    button[randomRelist ? range(0, button.length - 1) : 0].click();
                }
                else {
                    if (lastPage) {
                        sessionStorage.removeItem("curPage");
                        var data = document.createElement("small"),
                            reloadTime = randomTime ? range(randomMin * 60, randomMax * 60) : defaultTime * 60;
                        data.setAttribute("style", "color: orange; float: right;");
                        document.getElementsByClassName("panel-heading")[0].appendChild(data);
                        setInterval(showStatus, 1000);
                    }
                    document.getElementsByClassName("fa-angle-right")[0].parentNode.click();
                }
            }
        }
        else if (listPage) {
            switch (document.getElementById("item-overview-name").firstElementChild.innerHTML) {
                case "Relisting this item":
                    document.getElementById("button_save").click();
                    break;
                case "Creating a new listing for this item":
                    var itm = document.getElementsByClassName("item")[0],
                        price = +itm.getAttribute("data-price");
                    if (!price || itm.getAttribute("title").contains("Killstreak")) {
                        document.getElementById("metal").previousElementSibling.innerHTML += " (Unpriced)";
                        if (itm.hasAttribute("data-market-p"))
                            price = +itm.getAttribute("data-market-p") / 249 * keyP;
                    }
                    else if (itm.getAttribute("data-p-bptf").contains("–"))
                        document.getElementById("metal").previousElementSibling.innerHTML += " (Ranged)";
                    if (price >= keyP * budP && !itm.getAttribute("data-name").contains("Earbuds")) {
                        document.getElementById("earbuds").value = Math.floor(price / (keyP * budP));
                        price %= keyP * budP;
                    }
                    if (price >= keyP && !itm.getAttribute("data-name").contains("Key")) {
                        document.getElementById("keys").value = Math.floor(price / keyP);
                        console.log(price + "%" + keyP + "=" + price%keyP);
                        price %= keyP;
                    }
                    price = round(price);
                    if (price)
                        document.getElementById("metal").value = price;
                    document.getElementById("details").value = notes;
                    break;
            }
        }
    }
    console.info("Script Loaded.");
}).call(this);
